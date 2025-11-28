import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { validateAndNormalizePath, safePathJoin } from './path-security';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a file using AES-256-GCM encryption
 * @param inputPath Path to the file to encrypt (must be within uploads or temp directory)
 * @param outputPath Path where encrypted file should be saved (must be within encrypted directory)
 */
export async function encryptFile(inputPath: string, outputPath: string): Promise<void> {
  const key = process.env.PHI_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('PHI_ENCRYPTION_KEY required for file encryption');
  }
  
  if (key.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  // Validate and normalize paths to prevent path traversal attacks
  let safeInputPath: string;
  try {
    // Try uploads directory first
    safeInputPath = validateAndNormalizePath(inputPath, 'uploads');
  } catch {
    // Fall back to temp directory
    try {
      safeInputPath = validateAndNormalizePath(inputPath, 'temp');
    } catch (error) {
      throw new Error(`Invalid input path: must be within uploads or temp directory. ${error.message}`);
    }
  }
  
  const safeOutputPath = validateAndNormalizePath(outputPath, 'encrypted');
  
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  const input = fs.createReadStream(safeInputPath);
  const output = fs.createWriteStream(safeOutputPath);
  
  // Write IV first (16 bytes)
  output.write(iv);
  
  return new Promise((resolve, reject) => {
    input.pipe(cipher).pipe(output);
    output.on('finish', () => {
      try {
        const authTag = cipher.getAuthTag();
        fs.appendFileSync(safeOutputPath, authTag);
        fs.unlinkSync(safeInputPath); // Delete unencrypted original
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    output.on('error', reject);
    input.on('error', reject);
  });
}

/**
 * Decrypts a file using AES-256-GCM encryption
 * @param inputPath Path to the encrypted file (must be within encrypted directory)
 * @param outputPath Path where decrypted file should be saved (must be within temp or storage directory)
 */
export async function decryptFile(inputPath: string, outputPath: string): Promise<void> {
  const key = process.env.PHI_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('PHI_ENCRYPTION_KEY required for file decryption');
  }
  
  if (key.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  // Validate and normalize paths to prevent path traversal attacks
  const safeInputPath = validateAndNormalizePath(inputPath, 'encrypted');
  
  let safeOutputPath: string;
  try {
    // Try temp directory first
    safeOutputPath = validateAndNormalizePath(outputPath, 'temp');
  } catch {
    // Fall back to storage directory
    try {
      safeOutputPath = validateAndNormalizePath(outputPath, 'storage');
    } catch (error) {
      throw new Error(`Invalid output path: must be within temp or storage directory. ${error.message}`);
    }
  }
  
  const keyBuffer = Buffer.from(key, 'hex');
  const encryptedData = fs.readFileSync(safeInputPath);
  
  if (encryptedData.length < 32) { // IV (16) + AuthTag (16)
    throw new Error('Invalid encrypted file format');
  }
  
  const iv = encryptedData.slice(0, 16);
  const authTag = encryptedData.slice(-16);
  const ciphertext = encryptedData.slice(16, -16);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  
  fs.writeFileSync(safeOutputPath, decrypted);
}

/**
 * Encrypts file content in memory and returns encrypted buffer
 * @param fileBuffer Buffer containing file content
 * @returns Encrypted buffer with IV + ciphertext + authTag
 */
export function encryptFileBuffer(fileBuffer: Buffer): Buffer {
  const key = process.env.PHI_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('PHI_ENCRYPTION_KEY required for file encryption');
  }
  
  if (key.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Return: IV + encrypted data + auth tag
  return Buffer.concat([iv, encrypted, authTag]);
}

/**
 * Decrypts file content from buffer
 * @param encryptedBuffer Buffer containing IV + ciphertext + authTag
 * @returns Decrypted file buffer
 */
export function decryptFileBuffer(encryptedBuffer: Buffer): Buffer {
  const key = process.env.PHI_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('PHI_ENCRYPTION_KEY required for file decryption');
  }
  
  if (key.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  if (encryptedBuffer.length < 32) { // IV (16) + AuthTag (16)
    throw new Error('Invalid encrypted buffer format');
  }
  
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = encryptedBuffer.slice(0, 16);
  const authTag = encryptedBuffer.slice(-16);
  const ciphertext = encryptedBuffer.slice(16, -16);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
}

/**
 * Validates that file encryption is working correctly
 */
export function validateFileEncryption(): boolean {
  try {
    const testData = Buffer.from('Test file content for encryption validation');
    const encrypted = encryptFileBuffer(testData);
    const decrypted = decryptFileBuffer(encrypted);
    
    return testData.equals(decrypted);
  } catch (error) {
    console.error('File encryption validation failed:', error);
    return false;
  }
}

/**
 * Gets file extension from encrypted filename
 * @param encryptedFilename Encrypted filename
 * @returns Original file extension
 */
export function getOriginalFileExtension(encryptedFilename: string): string {
  // Remove .encrypted suffix and return original extension
  if (encryptedFilename.endsWith('.encrypted')) {
    return path.extname(encryptedFilename.slice(0, -10)); // Remove '.encrypted'
  }
  return path.extname(encryptedFilename);
}

/**
 * Creates encrypted filename from original filename
 * @param originalFilename Original filename
 * @returns Encrypted filename
 */
export function createEncryptedFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const nameWithoutExt = path.basename(originalFilename, ext);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  
  return `${timestamp}-${random}-${nameWithoutExt}.encrypted`;
}
