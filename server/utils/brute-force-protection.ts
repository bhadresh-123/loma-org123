import { db, getActiveSchema } from '../../db';
import { eq, and, gte, desc } from 'drizzle-orm';
import { auditLogger, AuditAction, ResourceType } from './audit-system';

export interface AttemptLimits {
  IP: number;
  USER: number;
  GLOBAL: number;
}

export interface LockoutDurations {
  FIRST: number;
  SECOND: number;
  THIRD: number;
  FOURTH: number;
  PERMANENT: number;
}

export interface AttemptResult {
  allowed: boolean;
  reason?: string;
  lockoutExpiresAt?: Date;
  attemptsRemaining: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class BruteForceProtection {
  private static readonly MAX_ATTEMPTS: AttemptLimits = {
    IP: 15,      // per IP address per hour
    USER: 5,     // per user account per hour
    GLOBAL: 200  // global rate limit per minute
  };

  private static readonly LOCKOUT_DURATIONS: LockoutDurations = {
    FIRST: 5,    // 5 minutes
    SECOND: 15,  // 15 minutes
    THIRD: 60,   // 1 hour
    FOURTH: 240, // 4 hours
    PERMANENT: -1 // Requires admin unlock
  };

  static async checkAttempt(
    identifier: string,
    type: 'IP' | 'USER',
    ipAddress: string
  ): Promise<AttemptResult> {
    // Check if currently locked out
    const activeLockout = await this.getActiveLockout(identifier, type);
    if (activeLockout) {
      return {
        allowed: false,
        reason: 'LOCKED_OUT',
        lockoutExpiresAt: activeLockout.expires_at,
        attemptsRemaining: 0,
        riskLevel: 'CRITICAL'
      };
    }

    // Check recent attempts
    const recentAttempts = await this.getRecentAttempts(identifier, type, 60); // last hour
    const maxAttempts = this.MAX_ATTEMPTS[type];
    const attemptsRemaining = Math.max(0, maxAttempts - recentAttempts.length);

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(recentAttempts.length, maxAttempts);

    if (recentAttempts.length >= maxAttempts) {
      // Create lockout
      const lockoutDuration = await this.calculateLockoutDuration(identifier, type);
      await this.createLockout(identifier, type, lockoutDuration, ipAddress);

      return {
        allowed: false,
        reason: 'RATE_LIMITED',
        lockoutExpiresAt: new Date(Date.now() + lockoutDuration * 60 * 1000),
        attemptsRemaining: 0,
        riskLevel: 'CRITICAL'
      };
    }

    return {
      allowed: true,
      attemptsRemaining,
      riskLevel
    };
  }

  static async recordAttempt(
    identifier: string,
    type: 'IP' | 'USER',
    success: boolean,
    ipAddress: string,
    additionalData?: any
  ): Promise<void> {
    // Record the attempt
    await db.insert(loginAttempts).values({
      identifier,
      attempt_type: type,
      success,
      ip_address: ipAddress,
      user_agent: additionalData?.userAgent,
      timestamp: new Date(),
      failure_reason: success ? null : (additionalData?.reason || 'INVALID_CREDENTIALS'),
      additional_data: additionalData ? JSON.stringify(additionalData) : null
    });

    // Clear successful attempts for user (not IP)
    if (success && type === 'USER') {
      await this.clearLockout(identifier, type);
    }

    // Analyze for attack patterns
    if (!success) {
      await this.analyzeAttackPattern(ipAddress, identifier, type);
    }
  }

  static async clearLockout(identifier: string, type: string): Promise<void> {
    await db.update(accountLockouts)
      .set({ is_active: false })
      .where(and(
        eq(accountLockouts.identifier, identifier),
        eq(accountLockouts.lockout_type, type),
        eq(accountLockouts.is_active, true)
      ));
  }

  static async isLockedOut(identifier: string, type: string): Promise<boolean> {
    const lockout = await this.getActiveLockout(identifier, type);
    return !!lockout;
  }

  static async getRemainingLockoutTime(identifier: string, type: string): Promise<number> {
    const lockout = await this.getActiveLockout(identifier, type);
    if (!lockout) return 0;
    
    const remaining = lockout.expires_at.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 1000)); // seconds
  }

  private static async getActiveLockout(identifier: string, type: string) {
    return await db.query.accountLockouts.findFirst({
      where: and(
        eq(accountLockouts.identifier, identifier),
        eq(accountLockouts.lockout_type, type),
        eq(accountLockouts.is_active, true),
        gte(accountLockouts.expires_at, new Date())
      )
    });
  }

  private static async getRecentAttempts(
    identifier: string, 
    type: string, 
    minutesBack: number
  ) {
    const since = new Date(Date.now() - minutesBack * 60 * 1000);
    
    return await db.select()
      .from(loginAttempts)
      .where(and(
        eq(loginAttempts.identifier, identifier),
        eq(loginAttempts.attempt_type, type),
        eq(loginAttempts.success, false),
        gte(loginAttempts.timestamp, since)
      ))
      .orderBy(desc(loginAttempts.timestamp));
  }

  private static async createLockout(
    identifier: string,
    type: string,
    durationMinutes: number,
    ipAddress: string
  ): Promise<void> {
    const expiresAt = durationMinutes === -1 ? 
      new Date('2099-12-31') : // Permanent until admin unlock
      new Date(Date.now() + durationMinutes * 60 * 1000);

    await db.insert(accountLockouts).values({
      identifier,
      lockout_type: type,
      reason: 'BRUTE_FORCE_PROTECTION',
      created_at: new Date(),
      expires_at: expiresAt,
      ip_address: ipAddress,
      is_active: true
    });

    // Log lockout creation
    await auditLogger.logEvent({
      userId: type === 'USER' ? parseInt(identifier) || 0 : 0,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SYSTEM,
      success: true,
      ipAddress,
      additionalData: {
        lockoutType: type,
        identifier,
        durationMinutes,
        reason: 'BRUTE_FORCE_PROTECTION'
      }
    });
  }

  private static async calculateLockoutDuration(
    identifier: string, 
    type: string
  ): Promise<number> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const previousLockouts = await db.select()
      .from(accountLockouts)
      .where(and(
        eq(accountLockouts.identifier, identifier),
        eq(accountLockouts.lockout_type, type),
        gte(accountLockouts.created_at, last24Hours)
      ));

    switch (previousLockouts.length) {
      case 0: return this.LOCKOUT_DURATIONS.FIRST;
      case 1: return this.LOCKOUT_DURATIONS.SECOND;
      case 2: return this.LOCKOUT_DURATIONS.THIRD;
      case 3: return this.LOCKOUT_DURATIONS.FOURTH;
      default: return this.LOCKOUT_DURATIONS.PERMANENT;
    }
  }

  private static calculateRiskLevel(
    attempts: number, 
    maxAttempts: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const ratio = attempts / maxAttempts;
    
    if (ratio < 0.3) return 'LOW';
    if (ratio < 0.6) return 'MEDIUM';
    if (ratio < 0.9) return 'HIGH';
    return 'CRITICAL';
  }

  private static async analyzeAttackPattern(
    ipAddress: string,
    identifier: string,
    type: string
  ): Promise<void> {
    const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);
    
    // Check for distributed brute force (multiple usersTable from same IP)
    const ipAttempts = await db.select()
      .from(loginAttempts)
      .where(and(
        eq(loginAttempts.ip_address, ipAddress),
        gte(loginAttempts.timestamp, last10Minutes),
        eq(loginAttempts.success, false)
      ));

    if (ipAttempts.length >= 25) {
      await this.triggerSecurityAlert('DISTRIBUTED_BRUTE_FORCE', {
        ipAddress,
        attemptCount: ipAttempts.length,
        timeWindow: 10,
        uniqueTargets: new Set(ipAttempts.map(a => a.identifier)).size
      });
    }

    // Check for credential stuffing (same IP, multiple different usersTable)
    const uniqueUsers = new Set(ipAttempts.map(a => a.identifier)).size;
    if (uniqueUsers >= 5 && ipAttempts.length >= 20) {
      await this.triggerSecurityAlert('CREDENTIAL_STUFFING', {
        ipAddress,
        uniqueUsers,
        totalAttempts: ipAttempts.length
      });
    }
  }

  private static async triggerSecurityAlert(type: string, data: any): Promise<void> {
    await auditLogger.logEvent({
      userId: 0,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SYSTEM,
      success: true,
      additionalData: {
        alertType: type,
        securityThreat: true,
        ...data
      }
    });

    console.warn(`🚨 Security Alert: ${type}`, data);
  }
}