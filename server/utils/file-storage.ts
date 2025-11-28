import * as fs from 'fs';
import * as path from 'path';
import { getCloudStorage } from '../services/CloudStorageService';
import { encryptFile, decryptFile } from './file-encryption';
import { validateAndNormalizePath } from './path-security';

/**
 * File Storage Abstraction Layer
 * 
 * Purpose: Unified interface for file storage with automatic fallback
 * - Primary: Cloudflare R2 (persistent, HIPAA-compliant)
 * - Fallback: Local filesystem (ephemeral, development only)
 * 
 * HIPAA Compliance: Section 1.4.7 - Contingency Plan
 * 
 * Features:
 * - Automatic encryption before storage
 * - Graceful degradation if R2 unavailable
 * - Consistent API regardless of storage backend
 * - Path traversal protection
 */

export type StorageLocation = 'cloud' | 'local';

export interface FileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  encrypted: boolean;
  location: StorageLocation;
  key: string;
  uploadedAt: Date;
}

export interface StorageResult {
  success: boolean;
  metadata?: FileMetadata;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  data?: Buffer;
  metadata?: FileMetadata;
  error?: string;
}

/**
 * Store a file with automatic encryption and cloud/local fallback
 * @param filePath - Path to the local file to store
 * @param targetKey - Target key/path in storage (e.g., 'patients/123/consent.pdf')
 * @param options - Storage options
 */
export async function storeFile(
  filePath: string,
  targetKey: string,
  options: {
    encrypt?: boolean;
    mimeType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<StorageResult> {
  const encrypt = options.encrypt !== false; // Default: true
  const mimeType = options.mimeType || 'application/octet-stream';
  
  try {
    // Validate source file path
    let safeFilePath: string;
    try {
      safeFilePath = validateAndNormalizePath(filePath, 'uploads');
    } catch {
      try {
        safeFilePath = validateAndNormalizePath(filePath, 'temp');
      } catch (error: any) {
        return {
          success: false,
          error: `Invalid file path: ${error.message}`,
        };
      }
    }

    // Check if file exists
    if (!fs.existsSync(safeFilePath)) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    const stats = fs.statSync(safeFilePath);
    let dataToUpload: Buffer;
    let finalKey = targetKey;
    let isEncrypted = false;

    // Encrypt if requested
    if (encrypt) {
      const encryptedPath = `${safeFilePath}.encrypted`;
      
      try {
        await encryptFile(safeFilePath, encryptedPath);
        dataToUpload = fs.readFileSync(encryptedPath);
        finalKey = `${targetKey}.encrypted`;
        isEncrypted = true;
        
        // Clean up encrypted temp file
        fs.unlinkSync(encryptedPath);
      } catch (error: any) {
        console.error('[FileStorage] Encryption failed:', error);
        return {
          success: false,
          error: `Encryption failed: ${error.message}`,
        };
      }
    } else {
      dataToUpload = fs.readFileSync(safeFilePath);
    }

    // Try cloud storage first
    const cloudStorage = getCloudStorage();
    if (cloudStorage.available()) {
      const uploadResult = await cloudStorage.uploadWithRetry(
        finalKey,
        dataToUpload,
        {
          bucket: 'files',
          contentType: mimeType,
          metadata: {
            ...options.metadata,
            originalFilename: path.basename(filePath),
            encrypted: isEncrypted.toString(),
          },
        }
      );

      if (uploadResult.success) {
        console.log(`[FileStorage] Stored in cloud: ${finalKey}`);
        
        // Delete local file after successful upload
        try {
          fs.unlinkSync(safeFilePath);
        } catch (error) {
          console.warn('[FileStorage] Failed to delete local file after upload:', error);
        }

        return {
          success: true,
          metadata: {
            filename: path.basename(filePath),
            size: stats.size,
            mimeType,
            encrypted: isEncrypted,
            location: 'cloud',
            key: finalKey,
            uploadedAt: new Date(),
          },
        };
      }

      console.warn('[FileStorage] Cloud upload failed, falling back to local storage');
    }

    // Fallback to local storage
    const localDir = path.join(process.cwd(), 'uploads', 'persistent');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const localPath = path.join(localDir, path.basename(finalKey));
    fs.writeFileSync(localPath, dataToUpload);

    console.log(`[FileStorage] Stored locally (fallback): ${localPath}`);

    return {
      success: true,
      metadata: {
        filename: path.basename(filePath),
        size: stats.size,
        mimeType,
        encrypted: isEncrypted,
        location: 'local',
        key: finalKey,
        uploadedAt: new Date(),
      },
    };
  } catch (error: any) {
    console.error('[FileStorage] Store failed:', error);
    return {
      success: false,
      error: error.message || 'Store failed',
    };
  }
}

/**
 * Retrieve a file from storage with automatic decryption
 * @param key - Storage key (e.g., 'patients/123/consent.pdf.encrypted')
 * @param options - Retrieval options
 */
export async function retrieveFile(
  key: string,
  options: {
    decrypt?: boolean;
  } = {}
): Promise<DownloadResult> {
  const decrypt = options.decrypt !== false; // Default: true
  const isEncrypted = key.endsWith('.encrypted');

  try {
    let fileData: Buffer | null = null;
    let location: StorageLocation = 'cloud';

    // Try cloud storage first
    const cloudStorage = getCloudStorage();
    if (cloudStorage.available()) {
      const downloadResult = await cloudStorage.download(key, { bucket: 'files' });

      if (downloadResult.success && downloadResult.data) {
        fileData = downloadResult.data;
        location = 'cloud';
        console.log(`[FileStorage] Retrieved from cloud: ${key}`);
      }
    }

    // Fallback to local storage
    if (!fileData) {
      const localDir = path.join(process.cwd(), 'uploads', 'persistent');
      const localPath = path.join(localDir, path.basename(key));

      if (fs.existsSync(localPath)) {
        fileData = fs.readFileSync(localPath);
        location = 'local';
        console.log(`[FileStorage] Retrieved from local (fallback): ${localPath}`);
      } else {
        // Check old uploads directory for legacy files
        const legacyPath = path.join(process.cwd(), 'uploads', path.basename(key));
        if (fs.existsSync(legacyPath)) {
          fileData = fs.readFileSync(legacyPath);
          location = 'local';
          console.log(`[FileStorage] Retrieved from legacy uploads: ${legacyPath}`);
        }
      }
    }

    if (!fileData) {
      return {
        success: false,
        error: 'File not found in any storage location',
      };
    }

    // Decrypt if needed
    if (isEncrypted && decrypt) {
      const tempEncryptedPath = path.join(process.cwd(), 'uploads', 'temp', `${Date.now()}-encrypted`);
      const tempDecryptedPath = path.join(process.cwd(), 'uploads', 'temp', `${Date.now()}-decrypted`);

      try {
        // Ensure temp directory exists
        const tempDir = path.dirname(tempEncryptedPath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write encrypted data to temp file
        fs.writeFileSync(tempEncryptedPath, fileData);

        // Decrypt
        await decryptFile(tempEncryptedPath, tempDecryptedPath);
        fileData = fs.readFileSync(tempDecryptedPath);

        // Clean up temp files
        fs.unlinkSync(tempEncryptedPath);
        fs.unlinkSync(tempDecryptedPath);
      } catch (error: any) {
        console.error('[FileStorage] Decryption failed:', error);
        return {
          success: false,
          error: `Decryption failed: ${error.message}`,
        };
      }
    }

    return {
      success: true,
      data: fileData,
      metadata: {
        filename: path.basename(key).replace('.encrypted', ''),
        size: fileData.length,
        mimeType: 'application/octet-stream',
        encrypted: isEncrypted,
        location,
        key,
        uploadedAt: new Date(),
      },
    };
  } catch (error: any) {
    console.error('[FileStorage] Retrieve failed:', error);
    return {
      success: false,
      error: error.message || 'Retrieve failed',
    };
  }
}

/**
 * Delete a file from storage
 * @param key - Storage key
 */
export async function deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    let deleted = false;

    // Try cloud storage
    const cloudStorage = getCloudStorage();
    if (cloudStorage.available()) {
      const result = await cloudStorage.delete(key, 'files');
      if (result.success) {
        console.log(`[FileStorage] Deleted from cloud: ${key}`);
        deleted = true;
      }
    }

    // Also try local storage
    const localDir = path.join(process.cwd(), 'uploads', 'persistent');
    const localPath = path.join(localDir, path.basename(key));

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`[FileStorage] Deleted from local: ${localPath}`);
      deleted = true;
    }

    // Check legacy location
    const legacyPath = path.join(process.cwd(), 'uploads', path.basename(key));
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
      console.log(`[FileStorage] Deleted from legacy uploads: ${legacyPath}`);
      deleted = true;
    }

    if (!deleted) {
      return {
        success: false,
        error: 'File not found in any storage location',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[FileStorage] Delete failed:', error);
    return {
      success: false,
      error: error.message || 'Delete failed',
    };
  }
}

/**
 * Check if a file exists in storage
 * @param key - Storage key
 */
export async function fileExists(key: string): Promise<{ exists: boolean; location?: StorageLocation }> {
  try {
    // Check cloud storage
    const cloudStorage = getCloudStorage();
    if (cloudStorage.available()) {
      const result = await cloudStorage.exists(key, 'files');
      if (result.exists) {
        return { exists: true, location: 'cloud' };
      }
    }

    // Check local storage
    const localDir = path.join(process.cwd(), 'uploads', 'persistent');
    const localPath = path.join(localDir, path.basename(key));

    if (fs.existsSync(localPath)) {
      return { exists: true, location: 'local' };
    }

    // Check legacy location
    const legacyPath = path.join(process.cwd(), 'uploads', path.basename(key));
    if (fs.existsSync(legacyPath)) {
      return { exists: true, location: 'local' };
    }

    return { exists: false };
  } catch (error) {
    console.error('[FileStorage] Exists check failed:', error);
    return { exists: false };
  }
}

/**
 * List files in storage with optional prefix
 * @param prefix - Optional prefix to filter files
 */
export async function listFiles(prefix?: string): Promise<{
  success: boolean;
  files?: Array<{ key: string; size: number; lastModified: Date; location: StorageLocation }>;
  error?: string;
}> {
  try {
    const allFiles: Array<{ key: string; size: number; lastModified: Date; location: StorageLocation }> = [];

    // List from cloud storage
    const cloudStorage = getCloudStorage();
    if (cloudStorage.available()) {
      const result = await cloudStorage.list(prefix, 'files');
      if (result.success && result.files) {
        allFiles.push(...result.files.map(f => ({ ...f, location: 'cloud' as StorageLocation })));
      }
    }

    // List from local storage
    const localDir = path.join(process.cwd(), 'uploads', 'persistent');
    if (fs.existsSync(localDir)) {
      const files = fs.readdirSync(localDir);
      for (const file of files) {
        if (!prefix || file.startsWith(prefix)) {
          const filePath = path.join(localDir, file);
          const stats = fs.statSync(filePath);
          allFiles.push({
            key: file,
            size: stats.size,
            lastModified: stats.mtime,
            location: 'local',
          });
        }
      }
    }

    return {
      success: true,
      files: allFiles,
    };
  } catch (error: any) {
    console.error('[FileStorage] List failed:', error);
    return {
      success: false,
      error: error.message || 'List failed',
    };
  }
}

/**
 * Get storage health status
 */
export async function getStorageHealth(): Promise<{
  cloudAvailable: boolean;
  cloudHealthy: boolean;
  localAvailable: boolean;
  message: string;
}> {
  const cloudStorage = getCloudStorage();
  const cloudAvailable = cloudStorage.available();

  let cloudHealthy = false;
  if (cloudAvailable) {
    const health = await cloudStorage.healthCheck();
    cloudHealthy = health.healthy;
  }

  const localDir = path.join(process.cwd(), 'uploads', 'persistent');
  const localAvailable = fs.existsSync(localDir);

  let message = '';
  if (cloudHealthy) {
    message = 'Cloud storage operational';
  } else if (cloudAvailable) {
    message = 'Cloud storage configured but unhealthy, using local fallback';
  } else if (localAvailable) {
    message = 'Cloud storage not configured, using local storage only';
  } else {
    message = 'No storage available';
  }

  return {
    cloudAvailable,
    cloudHealthy,
    localAvailable,
    message,
  };
}

