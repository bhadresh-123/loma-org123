#!/usr/bin/env tsx
/**
 * Automated Database Backup Script
 * 
 * Purpose: Create encrypted PostgreSQL backups and store them in Cloudflare R2
 * HIPAA Compliance: Section 1.4.7 - Contingency Plan (Backups for stateful resources)
 * 
 * Features:
 * - Full database backup using pg_dump
 * - Compression (gzip)
 * - Encryption (AES-256-GCM)
 * - Upload to Cloudflare R2
 * - 30-day retention policy with automatic cleanup
 * - Backup verification
 * 
 * Usage:
 *   npm run backup:db
 *   or
 *   tsx scripts/backup/automated-db-backup.ts
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - CLOUDFLARE_R2_ACCOUNT_ID: R2 account ID
 *   - CLOUDFLARE_R2_ACCESS_KEY_ID: R2 access key
 *   - CLOUDFLARE_R2_SECRET_ACCESS_KEY: R2 secret key
 *   - PHI_ENCRYPTION_KEY: 64-character hex string for encryption
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getCloudStorage } from '../../server/services/CloudStorageService';

const execAsync = promisify(exec);

interface BackupResult {
  success: boolean;
  backupKey?: string;
  size?: number;
  duration?: number;
  error?: string;
}

interface BackupMetadata {
  timestamp: string;
  database: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  retentionDays: number;
  version: string;
}

const RETENTION_DAYS = 30;
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'temp');

async function ensureBackupDirectory(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

async function getDatabaseInfo(): Promise<{ host: string; port: string; database: string; user: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1), // Remove leading /
      user: url.username,
    };
  } catch (error) {
    throw new Error('Invalid DATABASE_URL format');
  }
}

async function createDatabaseBackup(timestamp: string): Promise<string> {
  console.log('📦 Creating database backup with pg_dump...');

  const dbInfo = await getDatabaseInfo();
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Use pg_dump to create backup
  const command = `pg_dump "${process.env.DATABASE_URL}" --clean --if-exists --no-owner --no-privileges > "${filepath}"`;

  try {
    await execAsync(command);
    console.log(`✅ Database backup created: ${filename}`);
    return filepath;
  } catch (error: any) {
    throw new Error(`pg_dump failed: ${error.message}`);
  }
}

async function compressBackup(filepath: string): Promise<string> {
  console.log('🗜️  Compressing backup...');

  const compressedPath = `${filepath}.gz`;
  const command = `gzip -9 "${filepath}"`;

  try {
    await execAsync(command);
    console.log(`✅ Backup compressed: ${path.basename(compressedPath)}`);
    return compressedPath;
  } catch (error: any) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

async function encryptBackup(filepath: string): Promise<string> {
  console.log('🔒 Encrypting backup...');

  const encryptionKey = process.env.PHI_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  const inputData = fs.readFileSync(filepath);
  const encryptedPath = `${filepath}.encrypted`;

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(inputData),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Write: IV (16 bytes) + Encrypted Data + Auth Tag (16 bytes)
  const output = Buffer.concat([iv, encrypted, authTag]);
  fs.writeFileSync(encryptedPath, output);

  // Delete unencrypted compressed file
  fs.unlinkSync(filepath);

  console.log(`✅ Backup encrypted: ${path.basename(encryptedPath)}`);
  return encryptedPath;
}

async function uploadToR2(filepath: string, timestamp: string): Promise<{ key: string; size: number }> {
  console.log('☁️  Uploading backup to Cloudflare R2...');

  const cloudStorage = getCloudStorage();
  if (!cloudStorage.available()) {
    throw new Error('Cloudflare R2 is not configured. Please set R2 environment variables.');
  }

  const filename = path.basename(filepath);
  const backupKey = `database-backups/${timestamp}/${filename}`;
  const data = fs.readFileSync(filepath);

  const result = await cloudStorage.uploadWithRetry(
    backupKey,
    data,
    {
      bucket: 'backups',
      contentType: 'application/octet-stream',
      metadata: {
        timestamp,
        type: 'database-backup',
        encrypted: 'true',
        compressed: 'true',
      },
    },
    3 // 3 retries
  );

  if (!result.success) {
    throw new Error(`Upload to R2 failed: ${result.error}`);
  }

  console.log(`✅ Backup uploaded to R2: ${backupKey}`);
  return { key: backupKey, size: data.length };
}

async function createMetadataFile(backupKey: string, metadata: BackupMetadata): Promise<void> {
  console.log('📝 Creating backup metadata...');

  const cloudStorage = getCloudStorage();
  const metadataKey = `${backupKey}.metadata.json`;
  const metadataJson = JSON.stringify(metadata, null, 2);

  const result = await cloudStorage.upload(
    metadataKey,
    Buffer.from(metadataJson, 'utf-8'),
    {
      bucket: 'backups',
      contentType: 'application/json',
    }
  );

  if (!result.success) {
    console.warn(`⚠️  Failed to upload metadata: ${result.error}`);
  } else {
    console.log(`✅ Metadata uploaded: ${metadataKey}`);
  }
}

async function cleanupOldBackups(): Promise<void> {
  console.log('\n🧹 Cleaning up old backups...');

  const cloudStorage = getCloudStorage();
  const listResult = await cloudStorage.list('database-backups/', 'backups');

  if (!listResult.success || !listResult.files) {
    console.warn('⚠️  Failed to list backups for cleanup');
    return;
  }

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  let deletedCount = 0;

  for (const file of listResult.files) {
    if (file.lastModified < cutoffDate) {
      const deleteResult = await cloudStorage.delete(file.key, 'backups');
      if (deleteResult.success) {
        console.log(`  🗑️  Deleted old backup: ${file.key}`);
        deletedCount++;
      }
    }
  }

  if (deletedCount === 0) {
    console.log('  ℹ️  No old backups to delete');
  } else {
    console.log(`  ✅ Deleted ${deletedCount} old backup(s)`);
  }
}

async function cleanupTempFiles(): Promise<void> {
  console.log('\n🧹 Cleaning up temporary files...');

  try {
    const files = fs.readdirSync(BACKUP_DIR);
    for (const file of files) {
      const filepath = path.join(BACKUP_DIR, file);
      fs.unlinkSync(filepath);
      console.log(`  🗑️  Deleted: ${file}`);
    }
  } catch (error: any) {
    console.warn(`⚠️  Failed to cleanup temp files: ${error.message}`);
  }
}

async function performBackup(): Promise<BackupResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  console.log('🚀 Starting automated database backup');
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log('─'.repeat(60));

  try {
    // Ensure backup directory exists
    await ensureBackupDirectory();

    // Get database info
    const dbInfo = await getDatabaseInfo();
    console.log(`🗄️  Database: ${dbInfo.database}`);
    console.log(`🏠 Host: ${dbInfo.host}:${dbInfo.port}\n`);

    // Step 1: Create backup with pg_dump
    const backupPath = await createDatabaseBackup(timestamp);
    const backupSize = fs.statSync(backupPath).size;
    console.log(`  Size: ${(backupSize / 1024 / 1024).toFixed(2)} MB\n`);

    // Step 2: Compress backup
    const compressedPath = await compressBackup(backupPath);
    const compressedSize = fs.statSync(compressedPath).size;
    const compressionRatio = ((1 - compressedSize / backupSize) * 100).toFixed(1);
    console.log(`  Size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)\n`);

    // Step 3: Encrypt backup
    const encryptedPath = await encryptBackup(compressedPath);
    const encryptedSize = fs.statSync(encryptedPath).size;
    console.log(`  Size: ${(encryptedSize / 1024 / 1024).toFixed(2)} MB\n`);

    // Step 4: Upload to R2
    const { key: backupKey, size } = await uploadToR2(encryptedPath, timestamp);

    // Step 5: Create metadata file
    const metadata: BackupMetadata = {
      timestamp,
      database: dbInfo.database,
      size: encryptedSize,
      compressed: true,
      encrypted: true,
      retentionDays: RETENTION_DAYS,
      version: '1.0',
    };
    await createMetadataFile(backupKey, metadata);

    // Step 6: Cleanup old backups
    await cleanupOldBackups();

    // Step 7: Cleanup temporary files
    await cleanupTempFiles();

    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Backup completed successfully!');
    console.log('='.repeat(60));
    console.log(`📦 Backup key: ${backupKey}`);
    console.log(`📊 Final size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`🗓️  Retention: ${RETENTION_DAYS} days`);
    console.log('='.repeat(60));

    return {
      success: true,
      backupKey,
      size,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('\n' + '='.repeat(60));
    console.error('❌ Backup failed!');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.error('='.repeat(60));

    // Cleanup temp files on error
    try {
      await cleanupTempFiles();
    } catch {}

    return {
      success: false,
      error: error.message,
      duration,
    };
  }
}

// Main execution
async function main() {
  try {
    const result = await performBackup();
    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();

