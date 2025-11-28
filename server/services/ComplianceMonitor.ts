/**
 * Compliance Monitor Service
 * 
 * Monitors key rotation schedules and sends alerts for HIPAA 1.4.4 compliance
 * Run this as a daily cron job or scheduled task
 */

import { db } from '../../db';
import { keyRotationHistory } from '@db/schema';
import { desc, eq } from 'drizzle-orm';

interface RotationPolicy {
  keyType: string;
  maxAgeDays: number;
  warningDays: number[];
  criticalDays: number;
}

export class ComplianceMonitor {
  private static readonly ROTATION_POLICIES: RotationPolicy[] = [
    {
      keyType: 'PHI_ENCRYPTION_KEY',
      maxAgeDays: 365, // Annual rotation (HIPAA requirement)
      warningDays: [30, 14, 7], // Warn at 30, 14, and 7 days before expiration
      criticalDays: 3, // Critical alert 3 days before
    },
    {
      keyType: 'SESSION_SECRET',
      maxAgeDays: 90, // Quarterly rotation (security best practice)
      warningDays: [14, 7], // Warn at 14 and 7 days before expiration
      criticalDays: 3,
    },
  ];

  /**
   * Check all keys and send alerts if rotation is needed
   */
  static async checkKeyRotations(): Promise<void> {
    console.log('[ComplianceMonitor] Starting key rotation check...');
    
    for (const policy of this.ROTATION_POLICIES) {
      try {
        await this.checkKeyRotation(policy);
      } catch (error) {
        console.error(`[ComplianceMonitor] Error checking ${policy.keyType}:`, error);
      }
    }
    
    console.log('[ComplianceMonitor] Key rotation check complete.');
  }

  /**
   * Check a specific key rotation policy
   */
  private static async checkKeyRotation(policy: RotationPolicy): Promise<void> {
    // Get last rotation for this key type
    const lastRotation = await db
      .select()
      .from(keyRotationHistory)
      .where(eq(keyRotationHistory.keyType, policy.keyType))
      .orderBy(desc(keyRotationHistory.rotatedAt))
      .limit(1);

    const now = new Date();
    let keyAge: number;
    let lastRotationDate: Date;

    if (lastRotation.length === 0) {
      // No rotation history - assume key is as old as the application
      console.warn(`[ComplianceMonitor] No rotation history for ${policy.keyType} - assuming first rotation needed`);
      keyAge = policy.maxAgeDays + 1; // Trigger immediate alert
      lastRotationDate = new Date(0); // Unix epoch
    } else {
      lastRotationDate = lastRotation[0].rotatedAt;
      const ageMs = now.getTime() - lastRotationDate.getTime();
      keyAge = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    }

    const daysUntilRotation = policy.maxAgeDays - keyAge;

    console.log(`[ComplianceMonitor] ${policy.keyType}: ${keyAge} days old, ${daysUntilRotation} days until rotation`);

    // Check for overdue rotation
    if (keyAge > policy.maxAgeDays) {
      await this.sendCriticalAlert(policy.keyType, keyAge, lastRotationDate);
      return;
    }

    // Check for critical warning (within critical days)
    if (daysUntilRotation <= policy.criticalDays) {
      await this.sendCriticalWarning(policy.keyType, daysUntilRotation, lastRotationDate);
      return;
    }

    // Check for standard warnings
    for (const warningDay of policy.warningDays) {
      if (daysUntilRotation === warningDay) {
        await this.sendWarningAlert(policy.keyType, daysUntilRotation, lastRotationDate);
        return;
      }
    }

    // All good
    console.log(`[ComplianceMonitor] ${policy.keyType}: No action needed (${daysUntilRotation} days remaining)`);
  }

  /**
   * Send critical alert for overdue rotation
   */
  private static async sendCriticalAlert(keyType: string, keyAge: number, lastRotationDate: Date): Promise<void> {
    console.error(
      `🚨 [ComplianceMonitor] CRITICAL: ${keyType} rotation OVERDUE by ${keyAge - this.getPolicyForKey(keyType).maxAgeDays} days!`
    );
    console.error(`   Last rotation: ${lastRotationDate.toISOString()}`);
    console.error(`   Rotate immediately: tsx server/scripts/rotate-encryption-key.ts`);

    // TODO: Send email/Slack notification to security team
    // TODO: Create notification in database for admins
    await this.createSystemNotification({
      title: `CRITICAL: ${keyType} Rotation Overdue`,
      message: `The ${keyType} has not been rotated in ${keyAge} days and is overdue. Immediate rotation required for HIPAA compliance.`,
      severity: 'critical',
      keyType,
    });
  }

  /**
   * Send critical warning for imminent rotation
   */
  private static async sendCriticalWarning(keyType: string, daysRemaining: number, lastRotationDate: Date): Promise<void> {
    console.warn(
      `⚠️  [ComplianceMonitor] CRITICAL WARNING: ${keyType} rotation due in ${daysRemaining} days!`
    );
    console.warn(`   Last rotation: ${lastRotationDate.toISOString()}`);
    console.warn(`   Schedule rotation: tsx server/scripts/rotate-encryption-key.ts`);

    await this.createSystemNotification({
      title: `${keyType} Rotation Due Soon`,
      message: `The ${keyType} must be rotated within ${daysRemaining} days to maintain HIPAA compliance.`,
      severity: 'high',
      keyType,
    });
  }

  /**
   * Send standard warning alert
   */
  private static async sendWarningAlert(keyType: string, daysRemaining: number, lastRotationDate: Date): Promise<void> {
    console.warn(
      `📋 [ComplianceMonitor] REMINDER: ${keyType} rotation due in ${daysRemaining} days`
    );
    console.warn(`   Last rotation: ${lastRotationDate.toISOString()}`);

    await this.createSystemNotification({
      title: `${keyType} Rotation Reminder`,
      message: `The ${keyType} should be rotated within ${daysRemaining} days. Plan rotation maintenance window.`,
      severity: 'medium',
      keyType,
    });
  }

  /**
   * Create system notification for admins
   */
  private static async createSystemNotification(notification: {
    title: string;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    keyType: string;
  }): Promise<void> {
    try {
      const { notifications } = await import('@db/schema');
      
      // Get all business owners (they need to see rotation alerts)
      const { organizationMemberships } = await import('@db/schema');
      const adminUsers = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.role, 'business_owner'))
        .limit(100);

      // Create notification for each admin
      for (const admin of adminUsers) {
        await db.insert(notifications).values({
          userId: admin.userId,
          title: notification.title,
          message: notification.message,
          type: 'security_alert',
          entityType: 'key_rotation',
          entityId: null,
          isRead: false,
          isAutomated: true,
          createdAt: new Date(),
        });
      }

      console.log(`[ComplianceMonitor] Created ${adminUsers.length} notifications for key rotation alert`);
    } catch (error) {
      console.error('[ComplianceMonitor] Failed to create system notification:', error);
    }
  }

  /**
   * Get policy for a specific key type
   */
  private static getPolicyForKey(keyType: string): RotationPolicy {
    const policy = this.ROTATION_POLICIES.find(p => p.keyType === keyType);
    if (!policy) {
      throw new Error(`No rotation policy found for key type: ${keyType}`);
    }
    return policy;
  }

  /**
   * Get rotation status for all keys (for admin dashboard)
   */
  static async getRotationStatus(): Promise<{
    keyType: string;
    lastRotation: Date | null;
    keyAge: number;
    daysUntilRotation: number;
    status: 'ok' | 'warning' | 'critical' | 'overdue';
  }[]> {
    const status = [];

    for (const policy of this.ROTATION_POLICIES) {
      const lastRotation = await db
        .select()
        .from(keyRotationHistory)
        .where(eq(keyRotationHistory.keyType, policy.keyType))
        .orderBy(desc(keyRotationHistory.rotatedAt))
        .limit(1);

      const now = new Date();
      let keyAge: number;
      let lastRotationDate: Date | null;

      if (lastRotation.length === 0) {
        keyAge = policy.maxAgeDays + 1;
        lastRotationDate = null;
      } else {
        lastRotationDate = lastRotation[0].rotatedAt;
        const ageMs = now.getTime() - lastRotationDate.getTime();
        keyAge = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }

      const daysUntilRotation = policy.maxAgeDays - keyAge;

      let rotationStatus: 'ok' | 'warning' | 'critical' | 'overdue';
      if (keyAge > policy.maxAgeDays) {
        rotationStatus = 'overdue';
      } else if (daysUntilRotation <= policy.criticalDays) {
        rotationStatus = 'critical';
      } else if (policy.warningDays.includes(daysUntilRotation)) {
        rotationStatus = 'warning';
      } else {
        rotationStatus = 'ok';
      }

      status.push({
        keyType: policy.keyType,
        lastRotation: lastRotationDate,
        keyAge,
        daysUntilRotation,
        status: rotationStatus,
      });
    }

    return status;
  }
}

// If running as standalone script
if (require.main === module) {
  ComplianceMonitor.checkKeyRotations()
    .then(() => {
      console.log('Compliance monitor check complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Compliance monitor error:', error);
      process.exit(1);
    });
}

