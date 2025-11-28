import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { db, getActiveSchema } from '../../db';

import { eq, and, gte } from 'drizzle-orm';
import { auditLogger, AuditAction, ResourceType } from './audit-system';

export interface EmergencyCode {
  code: string;
  expiresAt: Date;
}

export class EmergencyAccessManager {
  static async generateEmergencyCode(userId: number, reason: string): Promise<EmergencyCode> {
    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    await db.insert(emergencyAccess).values({
      user_id: userId,
      code: await bcrypt.hash(code, 10),
      reason,
      expires_at: expiresAt,
      used: false,
      created_at: new Date()
    });

    // Send emergency code via multiple channels
    await this.sendEmergencyCode(userId, code);

    // Log emergency code generation
    await auditLogger.logEvent({
      userId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SYSTEM,
      success: true,
      additionalData: {
        emergencyAccess: true,
        reason,
        expiresAt: expiresAt.toISOString()
      }
    });

    return { code, expiresAt };
  }

  static async validateEmergencyCode(userId: number, code: string): Promise<boolean> {
    const emergency = await db.query.emergencyAccess.findFirst({
      where: and(
        eq(emergencyAccess.user_id, userId),
        eq(emergencyAccess.used, false),
        gte(emergencyAccess.expires_at, new Date())
      )
    });

    if (!emergency) return false;

    const isValid = await bcrypt.compare(code, emergency.code);
    
    if (isValid) {
      // Mark as used
      await db.update(emergencyAccess)
        .set({ used: true, used_at: new Date() })
        .where(eq(emergencyAccess.id, emergency.id));

      // Log emergency access usage
      await auditLogger.logEvent({
        userId,
        action: AuditAction.LOGIN,
        resourceType: ResourceType.SYSTEM,
        success: true,
        additionalData: {
          accessType: 'EMERGENCY',
          reason: emergency.reason,
          emergencyCodeUsed: true
        }
      });
    }

    return isValid;
  }

  private static generateSecureCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private static async sendEmergencyCode(userId: number, code: string): Promise<void> {
    // Emergency code delivery implementation placeholder
    // Future enhancement: integrate with email/SMS service providers
    try {
      console.log(`Emergency code ${code} generated for user ${userId}`);
      // This should send the code through multiple channels for reliability
    } catch (error) {
      console.error('Failed to send emergency code:', error);
      throw new Error('Emergency code delivery failed');
    }
  }
}