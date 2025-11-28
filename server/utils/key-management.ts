import crypto from 'crypto';

export class KeyManager {
  private static encryptionKey: Buffer | null = null;
  
  /**
   * Initialize encryption key from environment variable only
   * NO FILE-BASED FALLBACK FOR SECURITY
   */
  static initializeKey(): Buffer {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }
    
    const envKey = process.env.PHI_ENCRYPTION_KEY;
    if (!envKey) {
      throw new Error('PHI_ENCRYPTION_KEY environment variable is required');
    }
    
    if (envKey.length !== 64) {
      throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    this.encryptionKey = Buffer.from(envKey, 'hex');
    console.log('✓ PHI encryption key loaded from environment');
    return this.encryptionKey;
  }
  
  /**
   * Get current encryption key
   */
  static getEncryptionKey(): Buffer {
    if (!this.encryptionKey) {
      return this.initializeKey();
    }
    return this.encryptionKey;
  }
  
  /**
   * Validate current key by testing encryption/decryption
   */
  static validateCurrentKey(): boolean {
    try {
      const key = this.getEncryptionKey();
      const testData = 'test-encryption-validation';
      
      // Test encryption
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(testData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      // Test decryption
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted === testData;
    } catch (error) {
      console.error('Key validation failed:', error);
      return false;
    }
  }
  
  /**
   * Generate a new encryption key (for setup purposes only)
   * This should only be used during initial setup, not in production
   */
  static generateNewKey(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Key generation not allowed in production environment');
    }
    
    return crypto.randomBytes(32).toString('hex');
  }
}