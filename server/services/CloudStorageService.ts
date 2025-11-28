import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as crypto from 'crypto';

/**
 * CloudStorageService - Cloudflare R2 Integration
 * 
 * Purpose: Provides persistent file storage for encrypted PHI documents and database backups
 * HIPAA Compliance: Section 1.4.7 - Contingency Plan (Backups for stateful resources)
 * 
 * Features:
 * - S3-compatible API with Cloudflare R2
 * - Encryption at rest (R2 provides AES-256)
 * - Encryption in transit (TLS 1.3)
 * - Graceful degradation if R2 unavailable
 * - Support for both files and backups
 */

interface CloudStorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketFiles: string;
  bucketBackups: string;
}

interface UploadOptions {
  bucket?: 'files' | 'backups';
  contentType?: string;
  metadata?: Record<string, string>;
}

interface DownloadOptions {
  bucket?: 'files' | 'backups';
}

export class CloudStorageService {
  private client: S3Client | null = null;
  private config: CloudStorageConfig | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize R2 client with environment variables
   */
  private initialize(): void {
    try {
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
      const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const bucketFiles = process.env.CLOUDFLARE_R2_BUCKET_FILES || 'loma-phi-files';
      const bucketBackups = process.env.CLOUDFLARE_R2_BUCKET_BACKUPS || 'loma-db-backups';

      // R2 is optional - graceful degradation if not configured
      if (!accountId || !accessKeyId || !secretAccessKey) {
        console.log('[CloudStorage] R2 not configured - using local storage fallback');
        this.isAvailable = false;
        return;
      }

      this.config = {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketFiles,
        bucketBackups,
      };

      // R2 endpoint format: https://<account_id>.r2.cloudflarestorage.com
      const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

      this.client = new S3Client({
        region: 'auto', // R2 uses 'auto' region
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.isAvailable = true;
      console.log('[CloudStorage] R2 initialized successfully');
      console.log(`[CloudStorage] Files bucket: ${bucketFiles}`);
      console.log(`[CloudStorage] Backups bucket: ${bucketBackups}`);
    } catch (error) {
      console.error('[CloudStorage] Failed to initialize R2:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Check if cloud storage is available
   */
  public available(): boolean {
    return this.isAvailable && this.client !== null && this.config !== null;
  }

  /**
   * Upload a file to R2
   * @param key - Object key (file path in bucket)
   * @param data - File data (Buffer or Readable stream)
   * @param options - Upload options
   */
  async upload(
    key: string,
    data: Buffer | Readable,
    options: UploadOptions = {}
  ): Promise<{ success: boolean; key: string; url?: string; error?: string }> {
    if (!this.available()) {
      return {
        success: false,
        key,
        error: 'Cloud storage not available',
      };
    }

    try {
      const bucket = options.bucket === 'backups' 
        ? this.config!.bucketBackups 
        : this.config!.bucketFiles;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata || {},
      });

      await this.client!.send(command);

      console.log(`[CloudStorage] Uploaded: ${key} to ${bucket}`);

      return {
        success: true,
        key,
        url: `https://${this.config!.accountId}.r2.cloudflarestorage.com/${bucket}/${key}`,
      };
    } catch (error: any) {
      console.error('[CloudStorage] Upload failed:', error);
      return {
        success: false,
        key,
        error: error.message || 'Upload failed',
      };
    }
  }

  /**
   * Download a file from R2
   * @param key - Object key (file path in bucket)
   * @param options - Download options
   */
  async download(
    key: string,
    options: DownloadOptions = {}
  ): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    if (!this.available()) {
      return {
        success: false,
        error: 'Cloud storage not available',
      };
    }

    try {
      const bucket = options.bucket === 'backups'
        ? this.config!.bucketBackups
        : this.config!.bucketFiles;

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.client!.send(command);

      if (!response.Body) {
        return {
          success: false,
          error: 'No data in response',
        };
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);

      console.log(`[CloudStorage] Downloaded: ${key} (${data.length} bytes)`);

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('[CloudStorage] Download failed:', error);
      return {
        success: false,
        error: error.message || 'Download failed',
      };
    }
  }

  /**
   * Delete a file from R2
   * @param key - Object key (file path in bucket)
   * @param bucket - Target bucket
   */
  async delete(
    key: string,
    bucket: 'files' | 'backups' = 'files'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.available()) {
      return {
        success: false,
        error: 'Cloud storage not available',
      };
    }

    try {
      const bucketName = bucket === 'backups'
        ? this.config!.bucketBackups
        : this.config!.bucketFiles;

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await this.client!.send(command);

      console.log(`[CloudStorage] Deleted: ${key} from ${bucketName}`);

      return { success: true };
    } catch (error: any) {
      console.error('[CloudStorage] Delete failed:', error);
      return {
        success: false,
        error: error.message || 'Delete failed',
      };
    }
  }

  /**
   * Check if a file exists in R2
   * @param key - Object key (file path in bucket)
   * @param bucket - Target bucket
   */
  async exists(
    key: string,
    bucket: 'files' | 'backups' = 'files'
  ): Promise<{ exists: boolean; size?: number; error?: string }> {
    if (!this.available()) {
      return {
        exists: false,
        error: 'Cloud storage not available',
      };
    }

    try {
      const bucketName = bucket === 'backups'
        ? this.config!.bucketBackups
        : this.config!.bucketFiles;

      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.client!.send(command);

      return {
        exists: true,
        size: response.ContentLength,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }

      console.error('[CloudStorage] Exists check failed:', error);
      return {
        exists: false,
        error: error.message || 'Check failed',
      };
    }
  }

  /**
   * List files in a bucket with optional prefix
   * @param prefix - Optional prefix to filter files
   * @param bucket - Target bucket
   */
  async list(
    prefix?: string,
    bucket: 'files' | 'backups' = 'files'
  ): Promise<{ success: boolean; files?: Array<{ key: string; size: number; lastModified: Date }>; error?: string }> {
    if (!this.available()) {
      return {
        success: false,
        error: 'Cloud storage not available',
      };
    }

    try {
      const bucketName = bucket === 'backups'
        ? this.config!.bucketBackups
        : this.config!.bucketFiles;

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await this.client!.send(command);

      const files = (response.Contents || []).map(item => ({
        key: item.Key!,
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));

      return {
        success: true,
        files,
      };
    } catch (error: any) {
      console.error('[CloudStorage] List failed:', error);
      return {
        success: false,
        error: error.message || 'List failed',
      };
    }
  }

  /**
   * Generate a presigned URL for temporary access to a file
   * @param key - Object key (file path in bucket)
   * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @param bucket - Target bucket
   */
  async getPresignedUrl(
    key: string,
    expiresIn: number = 3600,
    bucket: 'files' | 'backups' = 'files'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.available()) {
      return {
        success: false,
        error: 'Cloud storage not available',
      };
    }

    try {
      const bucketName = bucket === 'backups'
        ? this.config!.bucketBackups
        : this.config!.bucketFiles;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client!, command, { expiresIn });

      return {
        success: true,
        url,
      };
    } catch (error: any) {
      console.error('[CloudStorage] Presigned URL generation failed:', error);
      return {
        success: false,
        error: error.message || 'URL generation failed',
      };
    }
  }

  /**
   * Upload a file with automatic retry on failure
   * @param key - Object key
   * @param data - File data
   * @param options - Upload options
   * @param maxRetries - Maximum number of retries (default: 3)
   */
  async uploadWithRetry(
    key: string,
    data: Buffer | Readable,
    options: UploadOptions = {},
    maxRetries: number = 3
  ): Promise<{ success: boolean; key: string; url?: string; error?: string }> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.upload(key, data, options);

      if (result.success) {
        if (attempt > 1) {
          console.log(`[CloudStorage] Upload succeeded on attempt ${attempt}`);
        }
        return result;
      }

      lastError = result.error || 'Unknown error';
      console.warn(`[CloudStorage] Upload attempt ${attempt}/${maxRetries} failed: ${lastError}`);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      key,
      error: `Upload failed after ${maxRetries} attempts: ${lastError}`,
    };
  }

  /**
   * Health check for cloud storage
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!this.available()) {
      return {
        healthy: false,
        message: 'Cloud storage not configured',
      };
    }

    try {
      // Try to list objects in files bucket (minimal operation)
      const result = await this.list('', 'files');

      if (result.success) {
        return {
          healthy: true,
          message: 'Cloud storage operational',
        };
      }

      return {
        healthy: false,
        message: result.error || 'Health check failed',
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'Health check failed',
      };
    }
  }
}

// Singleton instance
let cloudStorageInstance: CloudStorageService | null = null;

export function getCloudStorage(): CloudStorageService {
  if (!cloudStorageInstance) {
    cloudStorageInstance = new CloudStorageService();
  }
  return cloudStorageInstance;
}

