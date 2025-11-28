import crypto from 'crypto';

// Lazy initialization of encryption key
let ENCRYPTION_KEY: string | undefined;
let key: Buffer | undefined;
const ALGORITHM = 'aes-256-gcm';

function initializeEncryption() {
  if (ENCRYPTION_KEY) return; // Already initialized
  
  ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY;
  
  if (!ENCRYPTION_KEY) {
    console.error('FATAL: PHI_ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    console.error('System cannot start without encryption key.');
    process.exit(1);  // Exit in ALL environments
  }

  if (ENCRYPTION_KEY && ENCRYPTION_KEY.length !== 64) { // 32 bytes = 64 hex characters
    console.error('FATAL: PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    console.error('System cannot start with invalid encryption key.');
    process.exit(1);  // Exit in ALL environments
  }

  key = Buffer.from(ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypts PHI data using AES-256-GCM
 * Returns versioned ciphertext: v1:iv:authTag:encrypted
 */
export function encryptPHI(plaintext: string | null): string | null {
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }

  initializeEncryption();
  
  if (!key) {
    const error = new Error('CRITICAL: PHI_ENCRYPTION_KEY is required. Cannot process PHI data without encryption. System startup should have failed.');
    console.error('[PHI Encryption] Critical error:', error.message);
    console.error('[PHI Encryption] Check that PHI_ENCRYPTION_KEY is set in environment variables');
    throw error;
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    console.error('[PHI Encryption] Encryption operation failed:', error);
    console.error('[PHI Encryption] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    throw new Error(`Failed to encrypt PHI data: ${error.message}`);
  }
}

/**
 * Decrypts PHI data using AES-256-GCM
 * Handles versioned ciphertext format
 */
export function decryptPHI(ciphertext: string | null): string | null {
  if (!ciphertext || ciphertext.trim() === '') {
    return null;
  }

  initializeEncryption();
  
  if (!key) {
    const error = new Error('CRITICAL: PHI_ENCRYPTION_KEY is required for decryption.');
    console.error('[PHI Decryption] Critical error:', error.message);
    console.error('[PHI Decryption] Check that PHI_ENCRYPTION_KEY is set in environment variables');
    throw error;
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Invalid ciphertext format - expected v1:iv:authTag:encrypted');
    }

    const [version, ivHex, authTagHex, encrypted] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('[PHI Decryption] Decryption operation failed:', error);
    console.error('[PHI Decryption] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    if (error.message?.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Failed to decrypt PHI data: Wrong encryption key or corrupted data');
    }
    
    throw new Error(`Failed to decrypt PHI data: ${error.message}`);
  }
}

/**
 * Creates a search hash for encrypted fields
 * Allows searching without decrypting the entire database
 */
export function createSearchHash(plaintext: string | null): string | null {
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }

  return crypto.createHash('sha256')
    .update(plaintext.toLowerCase().trim())
    .digest('hex');
}

/**
 * Validates that PHI encryption is working correctly
 */
export function validateEncryption(): boolean {
  try {
    const testData = 'test-phi-data-123';
    const encrypted = encryptPHI(testData);
    const decrypted = decryptPHI(encrypted);
    
    return decrypted === testData;
  } catch (error) {
    console.error('PHI encryption validation failed:', error);
    return false;
  }
}

// Validate encryption on module load
if (!validateEncryption()) {
  console.error('PHI encryption system failed validation - HIPAA compliance at risk');
  process.exit(1);  // Exit in ALL environments
}

console.log('✅ PHI encryption system validated successfully');