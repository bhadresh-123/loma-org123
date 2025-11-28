import * as crypto from 'crypto';
import { db, getActiveSchema } from '../../db';

import { eq, and, gte, lte, desc, ne } from 'drizzle-orm';
import { auditLogger, AuditAction, ResourceType } from './audit-system';

export interface SessionPolicy {
  maxIdleTime: number; // minutes
  maxSessionTime: number; // minutes  
  maxConcurrentSessions: number;
  requireMFA: boolean;
  requireSecureConnection: boolean;
  enableLocationTracking: boolean;
}

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}

export interface SessionCreationResult {
  sessionId: string;
  expiresAt: Date;
  requiresMFA: boolean;
  securityLevel: number;
  concurrentSessions: number;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: Record<string, unknown>;
  reason?: string;
  timeToExpiry?: number;
  requiresReauth?: boolean;
}

export class SessionManager {
  private static readonly DEFAULT_POLICY: SessionPolicy = {
    maxIdleTime: 30,
    maxSessionTime: 240, // 4 hours - HIPAA best practice
    maxConcurrentSessions: 3,
    requireMFA: false,
    requireSecureConnection: true,
    enableLocationTracking: true
  };

  static async createSession(
    userId: number,
    deviceInfo: DeviceInfo,
    mfaVerified: boolean = false,
    loginMethod: string = 'password'
  ): Promise<SessionCreationResult> {
    const policy = await this.getUserSessionPolicy(userId);
    
    // Check concurrent session limit
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= policy.maxConcurrentSessions) {
      await this.terminateOldestSession(userId);
    }

    // Generate device fingerprint
    const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
    
    // Calculate security level
    const securityLevel = this.calculateSessionSecurityLevel(
      deviceInfo, 
      mfaVerified, 
      loginMethod
    );

    // Create session
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + policy.maxSessionTime * 60 * 1000);
    
    const sessionData = {
      id: sessionId,
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      ip_address: deviceInfo.ipAddress,
      user_agent: deviceInfo.userAgent,
      location: policy.enableLocationTracking ? 
        await this.geolocateIP(deviceInfo.ipAddress) : null,
      created_at: now,
      last_activity: now,
      expires_at: expiresAt,
      is_trusted: securityLevel >= 70,
      is_active: true,
      security_level: securityLevel,
      mfa_verified: mfaVerified,
      login_method: loginMethod
    };

    await db.insert(userSessions).values(sessionData);

    // Log session creation
    await auditLogger.logEvent({
      userId,
      sessionId,
      action: AuditAction.LOGIN,
      resourceType: ResourceType.SYSTEM,
      success: true,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      additionalData: {
        deviceFingerprint,
        securityLevel,
        mfaVerified,
        loginMethod,
        concurrentSessions: activeSessions.length + 1
      }
    });

    return {
      sessionId,
      expiresAt,
      requiresMFA: policy.requireMFA && !mfaVerified,
      securityLevel,
      concurrentSessions: activeSessions.length + 1
    };
  }

  static async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.id, sessionId),
        eq(userSessions.is_active, true)
      )
    });

    if (!session) {
      return { 
        isValid: false, 
        reason: 'SESSION_NOT_FOUND' 
      };
    }

    const now = new Date();

    // Check if session has expired
    if (session.expires_at < now) {
      await this.terminateSession(sessionId, 'EXPIRED');
      return { 
        isValid: false, 
        reason: 'SESSION_EXPIRED' 
      };
    }

    // Check idle timeout
    const policy = await this.getUserSessionPolicy(session.user_id);
    const idleTime = now.getTime() - session.last_activity.getTime();
    const maxIdleMs = policy.maxIdleTime * 60 * 1000;
    
    if (idleTime > maxIdleMs) {
      await this.terminateSession(sessionId, 'IDLE_TIMEOUT');
      return { 
        isValid: false, 
        reason: 'IDLE_TIMEOUT' 
      };
    }

    // Update last activity
    await db.update(userSessions)
      .set({ last_activity: now })
      .where(eq(userSessions.id, sessionId));

    // Check if re-authentication is needed
    const requiresReauth = this.shouldRequireReauth(session, policy);

    return {
      isValid: true,
      session,
      timeToExpiry: session.expires_at.getTime() - now.getTime(),
      requiresReauth
    };
  }

  static async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = await db.query.userSessions.findFirst({
      where: eq(userSessions.id, sessionId)
    });

    if (session) {
      await db.update(userSessions)
        .set({ 
          is_active: false,
          last_activity: new Date()
        })
        .where(eq(userSessions.id, sessionId));

      // Log session termination
      await auditLogger.logEvent({
        userId: session.user_id,
        sessionId,
        action: AuditAction.LOGOUT,
        resourceType: ResourceType.SYSTEM,
        success: true,
        additionalData: {
          terminationReason: reason,
          sessionDuration: new Date().getTime() - session.created_at.getTime()
        }
      });
    }
  }

  static async terminateAllUserSessions(userId: number, exceptSessionId?: string): Promise<number> {
    const conditions = [
      eq(userSessions.user_id, userId),
      eq(userSessions.is_active, true)
    ];

    if (exceptSessionId) {
      conditions.push(ne(userSessions.id, exceptSessionId));
    }

    const activeSessions = await db.select()
      .from(userSessions)
      .where(and(...conditions));

    await db.update(userSessions)
      .set({ is_active: false })
      .where(and(...conditions));

    // Log mass session termination
    await auditLogger.logEvent({
      userId,
      action: AuditAction.LOGOUT,
      resourceType: ResourceType.SYSTEM,
      success: true,
      additionalData: {
        terminationReason: 'BULK_TERMINATION',
        sessionsTerminated: activeSessions.length
      }
    });

    return activeSessions.length;
  }

  static async getUserSessions(userId: number): Promise<any[]> {
    return await db.select()
      .from(userSessions)
      .where(and(
        eq(userSessions.user_id, userId),
        eq(userSessions.is_active, true)
      ))
      .orderBy(desc(userSessions.last_activity));
  }

  static async extendSession(sessionId: string, additionalMinutes: number = 60): Promise<boolean> {
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.id, sessionId),
        eq(userSessions.is_active, true)
      )
    });

    if (!session) return false;

    const newExpiresAt = new Date(session.expires_at.getTime() + additionalMinutes * 60 * 1000);
    
    await db.update(userSessions)
      .set({ expires_at: newExpiresAt })
      .where(eq(userSessions.id, sessionId));

    return true;
  }

  private static async getActiveSessions(userId: number) {
    return await db.select()
      .from(userSessions)
      .where(and(
        eq(userSessions.user_id, userId),
        eq(userSessions.is_active, true),
        gte(userSessions.expires_at, new Date())
      ))
      .orderBy(desc(userSessions.last_activity));
  }

  private static async terminateOldestSession(userId: number): Promise<void> {
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length > 0) {
      const oldestSession = activeSessions[activeSessions.length - 1];
      await this.terminateSession(oldestSession.id, 'CONCURRENT_LIMIT');
    }
  }

  private static generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    const fingerprint = crypto.createHash('sha256')
      .update(deviceInfo.userAgent || '')
      .update(deviceInfo.screenResolution || '')
      .update(deviceInfo.timezone || '')
      .update(deviceInfo.language || '')
      .update(deviceInfo.platform || '')
      .digest('hex');
    
    return fingerprint.substring(0, 32);
  }

  private static calculateSessionSecurityLevel(
    deviceInfo: DeviceInfo,
    mfaVerified: boolean,
    loginMethod: string
  ): number {
    let score = 50; // Base score

    // MFA bonus
    if (mfaVerified) score += 25;

    // Secure connection bonus
    if (deviceInfo.userAgent?.includes('https')) score += 10;

    // Login method scoring
    switch (loginMethod) {
      case 'mfa': score += 15; break;
      case 'emergency': score -= 20; break;
      default: break; // password = no change
    }

    // Device info completeness
    if (deviceInfo.screenResolution) score += 5;
    if (deviceInfo.timezone) score += 5;
    if (deviceInfo.language) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private static async getUserSessionPolicy(userId: number): Promise<SessionPolicy> {
    // For now, return default policy
    // In the future, this could be user-specific or role-based
    return this.DEFAULT_POLICY;
  }

  private static async geolocateIP(ipAddress: string): Promise<{
    country: string;
    region: string;
    city: string;
    lat: number;
    lng: number;
  }> {
    // IP geolocation implementation placeholder
    // Future enhancement: integrate with geolocation service (e.g., MaxMind, IPinfo)
    try {
      // For now, return mock location data
      // TODO: Implement actual IP geolocation service integration
      return {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        lat: 37.7749,
        lng: -122.4194
      };
    } catch (error) {
      console.error('Error geolocating IP:', error);
      // Return default location on error
      return {
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        lat: 0,
        lng: 0
      };
    }
  }

  private static shouldRequireReauth(session: Record<string, unknown>, policy: SessionPolicy): boolean {
    // Check if session is old and needs re-authentication
    const sessionAge = new Date().getTime() - (session.created_at as Date).getTime();
    const maxAgeWithoutReauth = 4 * 60 * 60 * 1000; // 4 hours

    return sessionAge > maxAgeWithoutReauth && !(session.mfa_verified as boolean);
  }
}