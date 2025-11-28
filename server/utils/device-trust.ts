import * as crypto from 'crypto';
import { db } from '../../db';
import { getActiveSchema } from '@db';

// Dynamic schema handled by getActiveSchema()

import { eq, and, gte } from 'drizzle-orm';
import { auditLogger, AuditAction, ResourceType } from './audit-system';

export interface DeviceInfo {
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}

export interface DeviceRegistrationResult {
  isNew: boolean;
  deviceId: string;
  trustLevel: number;
  verificationToken?: string;
  verificationMethod?: string;
  expiresIn?: number;
}

export interface DeviceVerificationResult {
  success: boolean;
  reason?: string;
  deviceId?: string;
  trustLevel?: number;
}

export interface TrustAssessment {
  trustLevel: number;
  isTrusted: boolean;
  requiresVerification: boolean;
  riskFactors: string[];
  recommendations: string[];
}

export interface SecurityContext {
  location?: {
    country: string;
    region: string;
    city: string;
    lat: number;
    lng: number;
  };
  timestamp: Date;
  ipAddress: string;
}

export class DeviceTrustManager {
  static async registerDevice(
    userId: number, 
    deviceInfo: DeviceInfo, 
    verificationMethod: 'EMAIL' | 'SMS' | 'MANUAL' = 'EMAIL'
  ): Promise<DeviceRegistrationResult> {
    const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
    
    // Check if device already registered
    const existingDevice = await db.query.trustedDevices.findFirst({
      where: and(
        eq(trustedDevices.user_id, userId),
        eq(trustedDevices.fingerprint, deviceFingerprint),
        eq(trustedDevices.is_active, true)
      )
    });

    if (existingDevice) {
      // Update last seen
      await db.update(trustedDevices)
        .set({ last_seen_at: new Date() })
        .where(eq(trustedDevices.id, existingDevice.id));

      return {
        isNew: false,
        deviceId: existingDevice.id,
        trustLevel: existingDevice.trust_level
      };
    }

    // Create new device verification
    const verificationToken = crypto.randomUUID();
    const deviceId = crypto.randomUUID();

    await db.insert(deviceVerifications).values({
      device_id: deviceId,
      user_id: userId,
      fingerprint: deviceFingerprint,
      verification_token: verificationToken,
      method: verificationMethod,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      is_verified: false
    });

    // Send verification challenge
    if (verificationMethod === 'EMAIL') {
      await this.sendDeviceVerificationEmail(userId, verificationToken, deviceInfo);
    } else if (verificationMethod === 'SMS') {
      await this.sendDeviceVerificationSMS(userId, verificationToken);
    }

    // Log device registration attempt
    await auditLogger.logEvent({
      userId,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SYSTEM,
      success: true,
      additionalData: {
        deviceFingerprint,
        verificationMethod,
        deviceRegistration: true
      }
    });

    return {
      isNew: true,
      deviceId,
      verificationToken,
      verificationMethod,
      expiresIn: 24 * 60 * 60 // seconds
    };
  }

  static async verifyDevice(verificationToken: string): Promise<DeviceVerificationResult> {
    const verification = await db.query.deviceVerifications.findFirst({
      where: and(
        eq(deviceVerifications.verification_token, verificationToken),
        gte(deviceVerifications.expires_at, new Date()),
        eq(deviceVerifications.is_verified, false)
      )
    });

    if (!verification) {
      return {
        success: false,
        reason: 'INVALID_OR_EXPIRED_TOKEN'
      };
    }

    // Mark verification as complete
    await db.update(deviceVerifications)
      .set({ is_verified: true })
      .where(eq(deviceVerifications.id, verification.id));

    // Create trusted device record
    const trustLevel = this.calculateInitialTrustLevel(verification.method);
    
    const [trustedDevice] = await db.insert(trustedDevices).values({
      id: verification.device_id,
      user_id: verification.user_id,
      fingerprint: verification.fingerprint,
      name: this.generateDeviceName(verification.fingerprint),
      trust_level: trustLevel,
      first_seen_at: new Date(),
      last_seen_at: new Date(),
      is_active: true,
      verification_method: verification.method
    }).returning();

    // Log device trust establishment
    await auditLogger.logEvent({
      userId: verification.user_id,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SYSTEM,
      success: true,
      additionalData: {
        deviceId: verification.device_id,
        trustLevel,
        verificationMethod: verification.method,
        deviceFingerprint: verification.fingerprint,
        deviceTrusted: true
      }
    });

    return {
      success: true,
      deviceId: verification.device_id,
      trustLevel
    };
  }

  static async assessDeviceTrust(
    userId: number, 
    deviceFingerprint: string, 
    currentContext: SecurityContext
  ): Promise<TrustAssessment> {
    const device = await db.query.trustedDevices.findFirst({
      where: and(
        eq(trustedDevices.user_id, userId),
        eq(trustedDevices.fingerprint, deviceFingerprint),
        eq(trustedDevices.is_active, true)
      )
    });

    if (!device) {
      return {
        trustLevel: 0,
        isTrusted: false,
        requiresVerification: true,
        riskFactors: ['UNKNOWN_DEVICE'],
        recommendations: ['Register this device for faster future logins']
      };
    }

    let adjustedTrustLevel = device.trust_level;
    const riskFactors = [];

    // Time-based trust decay
    const daysSinceLastSeen = Math.floor(
      (Date.now() - device.last_seen_at.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    if (daysSinceLastSeen > 30) {
      adjustedTrustLevel -= 20;
      riskFactors.push('LONG_ABSENCE');
    } else if (daysSinceLastSeen > 7) {
      adjustedTrustLevel -= 10;
      riskFactors.push('MODERATE_ABSENCE');
    }

    // Location-based assessment
    if (currentContext.location && device.last_known_location) {
      const distance = this.calculateDistance(
        currentContext.location, 
        device.last_known_location
      );
      
      if (distance > 1000) { // > 1000km
        adjustedTrustLevel -= 15;
        riskFactors.push('LOCATION_CHANGE');
      } else if (distance > 100) { // > 100km
        adjustedTrustLevel -= 5;
        riskFactors.push('MINOR_LOCATION_CHANGE');
      }
    }

    // Behavioral pattern analysis
    const behaviorScore = await this.analyzeBehaviorPattern(userId, deviceFingerprint);
    adjustedTrustLevel += behaviorScore;

    // Update device last seen and location
    await db.update(trustedDevices)
      .set({ 
        last_seen_at: new Date(),
        last_known_location: currentContext.location,
        trust_level: Math.max(0, Math.min(100, adjustedTrustLevel))
      })
      .where(eq(trustedDevices.id, device.id));

    const finalTrustLevel = Math.max(0, Math.min(100, adjustedTrustLevel));

    return {
      trustLevel: finalTrustLevel,
      isTrusted: finalTrustLevel >= 60,
      requiresVerification: finalTrustLevel < 40,
      riskFactors,
      recommendations: this.generateTrustRecommendations(finalTrustLevel, riskFactors)
    };
  }

  static async getUserTrustedDevices(userId: number): Promise<any[]> {
    return await db.select()
      .from(trustedDevices)
      .where(and(
        eq(trustedDevices.user_id, userId),
        eq(trustedDevices.is_active, true)
      ));
  }

  static async revokeTrustedDevice(userId: number, deviceId: string): Promise<boolean> {
    const result = await db.update(trustedDevices)
      .set({ is_active: false })
      .where(and(
        eq(trustedDevices.id, deviceId),
        eq(trustedDevices.user_id, userId)
      ));

    if (result.rowCount > 0) {
      // Log device revocation
      await auditLogger.logEvent({
        userId,
        action: AuditAction.DELETE,
        resourceType: ResourceType.SYSTEM,
        success: true,
        additionalData: {
          deviceId,
          deviceRevoked: true
        }
      });
    }

    return result.rowCount > 0;
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

  private static calculateInitialTrustLevel(method: string): number {
    switch (method) {
      case 'EMAIL': return 70;
      case 'SMS': return 75;
      case 'MANUAL': return 90; // Admin verified
      default: return 50;
    }
  }

  private static generateDeviceName(fingerprint: string): string {
    // Generate a human-readable device name from fingerprint
    const adjectives = ['Primary', 'Secondary', 'Mobile', 'Desktop', 'Work', 'Home'];
    const devices = ['Computer', 'Device', 'Browser', 'Workstation'];
    
    const adjIndex = parseInt(fingerprint.substring(0, 2), 16) % adjectives.length;
    const deviceIndex = parseInt(fingerprint.substring(2, 4), 16) % devices.length;
    
    return `${adjectives[adjIndex]} ${devices[deviceIndex]}`;
  }

  private static calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lng - loc1.lng);
    const lat1 = this.toRad(loc1.lat);
    const lat2 = this.toRad(loc2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  private static toRad(value: number): number {
    return value * Math.PI / 180;
  }

  private static async analyzeBehaviorPattern(
    userId: number, 
    deviceFingerprint: string
  ): Promise<number> {
    // Basic behavioral analysis - consistent usage patterns increase trust
    // Future enhancement: implement ML-based behavior analysis
    try {
      // Check device usage consistency
      const recentLogins = await this.getRecentDeviceLogins(userId, deviceFingerprint);
      const consistencyScore = Math.min(recentLogins.length * 2, 10);
      
      return consistencyScore;
    } catch (error) {
      console.error('Error in behavioral analysis:', error);
      return 5; // Default moderate trust
    }
  }

  private static generateTrustRecommendations(trustLevel: number, riskFactors: string[]): string[] {
    const recommendations = [];

    if (trustLevel < 40) {
      recommendations.push('Consider re-verifying this device');
    }

    if (riskFactors.includes('LOCATION_CHANGE')) {
      recommendations.push('Location change detected - verify this is expected');
    }

    if (riskFactors.includes('LONG_ABSENCE')) {
      recommendations.push('Device not used recently - additional verification required');
    }

    if (recommendations.length === 0) {
      recommendations.push('Device is trusted for normal operations');
    }

    return recommendations;
  }

  private static async sendDeviceVerificationEmail(
    userId: number, 
    verificationToken: string, 
    deviceInfo: DeviceInfo
  ): Promise<void> {
    // Email verification implementation placeholder
    // Future enhancement: integrate with email service provider
    try {
      console.log(`Device verification email would be sent for user ${userId} with token ${verificationToken}`);
      console.log(`Device info: ${JSON.stringify(deviceInfo)}`);
      // TODO: Implement actual email sending logic
    } catch (error) {
      console.error('Failed to send device verification email:', error);
    }
  }

  private static async sendDeviceVerificationSMS(
    userId: number, 
    verificationToken: string
  ): Promise<void> {
    // SMS verification implementation placeholder
    // Future enhancement: integrate with SMS service provider
    try {
      console.log(`Device verification SMS would be sent for user ${userId} with token ${verificationToken}`);
      // TODO: Implement actual SMS sending logic
    } catch (error) {
      console.error('Failed to send device verification SMS:', error);
    }
  }
}