/**
 * MFA Service - Multi-Factor Authentication
 * 
 * Provides TOTP (Time-based One-Time Password) authentication
 * for HIPAA 1.4.4 compliance - administrative user MFA requirement
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../../db';
import { mfaSecrets, mfaRecoveryCodes, usersAuth } from '@db/schema';
import { eq, and } from 'drizzle-orm';

// Simple TOTP implementation (no external dependencies)
export class MFAService {
  private static readonly TOTP_WINDOW = 1; // Allow 1 step before/after for clock drift
  private static readonly TOTP_STEP = 30; // 30 seconds per code
  private static readonly TOTP_DIGITS = 6; // 6-digit codes
  private static readonly RECOVERY_CODE_COUNT = 10; // 10 recovery codes

  /**
   * Generate a new TOTP secret for a user
   */
  static generateSecret(): string {
    // Generate a 32-character base32 secret
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  /**
   * Generate a TOTP URI for QR code generation
   */
  static generateTOTPUri(secret: string, userEmail: string, issuer: string = 'Loma Mental Health'): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${this.TOTP_DIGITS}&period=${this.TOTP_STEP}`;
  }

  /**
   * Generate recovery codes for backup access
   */
  static async generateRecoveryCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < this.RECOVERY_CODE_COUNT; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Setup MFA for a user
   */
  static async setupMFA(userId: number, userEmail: string): Promise<{ secret: string; qrCodeUri: string; recoveryCodes: string[] }> {
    // Generate secret
    const secret = this.generateSecret();
    
    // Encrypt secret before storing (using PHI encryption since it's sensitive)
    const encryptedSecret = await this.encryptSecret(secret);
    
    // Generate QR code URI
    const qrCodeUri = this.generateTOTPUri(secret, userEmail);
    
    // Generate recovery codes
    const recoveryCodes = await this.generateRecoveryCodes();
    
    // Store encrypted secret (not yet verified)
    await db.insert(mfaSecrets).values({
      userId,
      secret: encryptedSecret,
      verifiedAt: null,
    }).onConflictDoUpdate({
      target: mfaSecrets.userId,
      set: {
        secret: encryptedSecret,
        verifiedAt: null,
        updatedAt: new Date(),
      },
    });
    
    // Store hashed recovery codes
    await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
    for (const code of recoveryCodes) {
      const codeHash = await bcrypt.hash(code, 10);
      await db.insert(mfaRecoveryCodes).values({
        userId,
        codeHash,
        used: false,
      });
    }
    
    return {
      secret,
      qrCodeUri,
      recoveryCodes,
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  static async verifyAndEnableMFA(userId: number, code: string): Promise<boolean> {
    // Get user's secret
    const [mfaSecret] = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);
    
    if (!mfaSecret) {
      throw new Error('MFA not set up for this user');
    }
    
    // Decrypt secret
    const secret = await this.decryptSecret(mfaSecret.secret);
    
    // Verify code
    const isValid = this.verifyTOTP(secret, code);
    
    if (isValid) {
      // Mark as verified
      await db.update(mfaSecrets)
        .set({ verifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(mfaSecrets.userId, userId));
      
      // Enable MFA on user account
      await db.update(usersAuth)
        .set({ mfaEnabled: true, updatedAt: new Date() })
        .where(eq(usersAuth.id, userId));
    }
    
    return isValid;
  }

  /**
   * Verify TOTP code for authentication
   */
  static async verifyMFACode(userId: number, code: string): Promise<boolean> {
    // Get user's secret
    const [mfaSecret] = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);
    
    if (!mfaSecret || !mfaSecret.verifiedAt) {
      return false;
    }
    
    // Decrypt secret
    const secret = await this.decryptSecret(mfaSecret.secret);
    
    // Verify code
    return this.verifyTOTP(secret, code);
  }

  /**
   * Verify recovery code for authentication
   */
  static async verifyRecoveryCode(userId: number, code: string): Promise<boolean> {
    // Get unused recovery codes
    const codes = await db.select()
      .from(mfaRecoveryCodes)
      .where(and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.used, false)
      ));
    
    // Try to match the code
    for (const recoveryCode of codes) {
      const isMatch = await bcrypt.compare(code, recoveryCode.codeHash);
      if (isMatch) {
        // Mark as used
        await db.update(mfaRecoveryCodes)
          .set({ used: true, usedAt: new Date() })
          .where(eq(mfaRecoveryCodes.id, recoveryCode.id));
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Disable MFA for a user
   */
  static async disableMFA(userId: number): Promise<void> {
    // Delete MFA secret and recovery codes
    await db.delete(mfaSecrets).where(eq(mfaSecrets.userId, userId));
    await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));
    
    // Disable MFA on user account
    await db.update(usersAuth)
      .set({ mfaEnabled: false, mfaEnforcedAt: null, updatedAt: new Date() })
      .where(eq(usersAuth.id, userId));
  }

  /**
   * Check if user has MFA enabled and verified
   */
  static async isMFAEnabled(userId: number): Promise<boolean> {
    const [user] = await db.select().from(usersAuth).where(eq(usersAuth.id, userId)).limit(1);
    return user?.mfaEnabled || false;
  }

  /**
   * Check if user needs to set up MFA (admin/owner with grace period)
   */
  static async needsMFASetup(userId: number): Promise<{ required: boolean; gracePeriodEnds?: Date }> {
    const [user] = await db.select().from(usersAuth).where(eq(usersAuth.id, userId)).limit(1);
    
    if (!user || user.mfaEnabled) {
      return { required: false };
    }
    
    // If MFA was enforced, check grace period (7 days)
    if (user.mfaEnforcedAt) {
      const gracePeriodDays = 7;
      const gracePeriodEnds = new Date(user.mfaEnforcedAt);
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + gracePeriodDays);
      
      const now = new Date();
      if (now > gracePeriodEnds) {
        return { required: true, gracePeriodEnds };
      }
      
      return { required: false, gracePeriodEnds };
    }
    
    return { required: false };
  }

  // ============================================================================
  // TOTP IMPLEMENTATION
  // ============================================================================

  /**
   * Verify TOTP code with time window
   */
  private static verifyTOTP(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / this.TOTP_STEP);
    
    // Check current time and ±1 window for clock drift
    for (let i = -this.TOTP_WINDOW; i <= this.TOTP_WINDOW; i++) {
      const testCounter = counter + i;
      const expectedCode = this.generateTOTP(secret, testCounter);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate TOTP code for a given counter
   */
  private static generateTOTP(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const digest = hmac.digest();
    
    const offset = digest[digest.length - 1] & 0xf;
    const code = (
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)
    ) % Math.pow(10, this.TOTP_DIGITS);
    
    return code.toString().padStart(this.TOTP_DIGITS, '0');
  }

  // ============================================================================
  // BASE32 ENCODING/DECODING
  // ============================================================================

  private static base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    
    return output;
  }

  private static base32Decode(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = Buffer.alloc(Math.ceil(str.length * 5 / 8));
    
    for (let i = 0; i < str.length; i++) {
      const idx = alphabet.indexOf(str[i].toUpperCase());
      if (idx === -1) continue;
      
      value = (value << 5) | idx;
      bits += 5;
      
      if (bits >= 8) {
        output[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }
    
    return output.slice(0, index);
  }

  // ============================================================================
  // ENCRYPTION HELPERS
  // ============================================================================

  private static async encryptSecret(secret: string): Promise<string> {
    // Use the same PHI encryption for MFA secrets
    const { encrypt } = await import('./phi-encryption');
    return encrypt(secret);
  }

  private static async decryptSecret(encryptedSecret: string): Promise<string> {
    // Use the same PHI encryption for MFA secrets
    const { decrypt } = await import('./phi-encryption');
    return decrypt(encryptedSecret);
  }
}

