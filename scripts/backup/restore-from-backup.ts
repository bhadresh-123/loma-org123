#!/usr/bin/env tsx
/**
 * Database Restore from Backup Script
 * 
 * Purpose: Restore PostgreSQL database from encrypted R2 backup
 * HIPAA Compliance: Section 1.4.7 - Contingency Plan (Disaster Recovery)
 * 
 * Features:
 * - Download backup from Cloudflare R2
 * - Decrypt backup (AES-256-GCM)
 * - Decompress backup (gzip)
 * - Restore to PostgreSQL using psql
 * - Verification of restored data
 * 
 * Usage:
 *   npm run restore:db
 *   or
 *   tsx scripts/backup/restore-from-backup.ts [backup-key]
 *   tsx scripts/backup/restore-from-backup.ts --latest  # Restore most recent backup
 *   tsx scripts/backup/restore-from-backup.ts --list    # List available backups
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string (target database)
 *   - CLOUDFLARE_R2_ACCOUNT_ID: R2 account ID
 *   - CLOUDFLARE_R2_ACCESS_KEY_ID: R2 access key
 *   - CLOUDFLARE_R2_SECRET_ACCESS_KEY: R2 secret key
 *   - PHI_ENCRYPTION_KEY: 64-character hex string for decryption
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getCloudStorage } from '../../server/services/CloudStorageService';

const execAsync = promisify(exec);

const RESTORE_DIR = path.join(process.cwd(), 'backups', 'restore');

interface RestoreResult {
  success: boolean;
  backupKey?: string;
  duration?: number;
  error?: string;
}

async function ensureRestoreDirectory(): Promise<void> {
  if (!fs.existsSync(RESTORE_DIR)) {
    fs.mkdirSync(RESTORE_DIR, { recursive: true });
    console.log(`📁 Created restore directory: ${RESTORE_DIR}`);
  }
}

async function listAvailableBackups(): Promise<void> {
  console.log('📋 Available backups in Cloudflare R2:\n');

  const cloudStorage = getCloudStorage();
  if (!cloudStorage.available()) {
    console.error('❌ Cloudflare R2 is not configured');
    return;
  }

  const listResult = await cloudStorage.list('database-backups/', 'backups');

  if (!listResult.success || !listResult.files) {
    console.error('❌ Failed to list backups');
    return;
  }

  // Filter only .encrypted files (not metadata)
  const backups = listResult.files
    .filter(f => f.key.endsWith('.encrypted'))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('─'.repeat(80));
  console.log('Backup Key'.padEnd(50), 'Date'.padEnd(20), 'Size');
  console.log('─'.repeat(80));

  for (const backup of backups) {
    const key = backup.key;
    const date = backup.lastModified.toLocaleString();
    const size = `${(backup.size / 1024 / 1024).toFixed(2)} MB`;
    console.log(key.padEnd(50), date.padEnd(20), size);
  }

  console.log('─'.repeat(80));
  console.log(`\nTotal: ${backups.length} backup(s)`);
  console.log(`\nTo restore a backup, run:`);
  console.log(`  npm run restore:db -- "${backups[0].key}"`);
  console.log(`\nTo restore the latest backup, run:`);
  console.log(`  npm run restore:db -- --latest`);
}

async function getLatestBackup(): Promise<string | null> {
  const cloudStorage = getCloudStorage();
  const listResult = await cloudStorage.list('database-backups/', 'backups');

  if (!listResult.success || !listResult.files) {
    return null;
  }

  const backups = listResult.files
    .filter(f => f.key.endsWith('.encrypted'))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  return backups.length > 0 ? backups[0].key : null;
}

async function downloadBackup(backupKey: string): Promise<string> {
  console.log(`📥 Downloading backup from R2: ${backupKey}`);

  const cloudStorage = getCloudStorage();
  const downloadResult = await cloudStorage.download(backupKey, { bucket: 'backups' });

  if (!downloadResult.success || !downloadResult.data) {
    throw new Error(`Download failed: ${downloadResult.error}`);
  }

  const filename = path.basename(backupKey);
  const filepath = path.join(RESTORE_DIR, filename);
  fs.writeFileSync(filepath, downloadResult.data);

  console.log(`✅ Downloaded: ${filename} (${(downloadResult.data.length / 1024 / 1024).toFixed(2)} MB)\n`);
  return filepath;
}

async function decryptBackup(encryptedPath: string): Promise<string> {
  console.log('🔓 Decrypting backup...');

  const encryptionKey = process.env.PHI_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  if (encryptedPath.includes('..')) {
    throw new Error('Invalid file path');
  }
  const encryptedData = fs.readFileSync(encryptedPath);

  // Extract: IV (16 bytes) + Encrypted Data + Auth Tag (16 bytes)
  const iv = encryptedData.subarray(0, 16);
  const authTag = encryptedData.subarray(encryptedData.length - 16);
  const encrypted = encryptedData.subarray(16, encryptedData.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const decryptedPath = encryptedPath.replace('.encrypted', '');
    fs.writeFileSync(decryptedPath, decrypted);

    console.log(`✅ Decrypted: ${path.basename(decryptedPath)}\n`);
    return decryptedPath;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}. Check PHI_ENCRYPTION_KEY.`);
  }
}

async function decompressBackup(compressedPath: string): Promise<string> {
  console.log('📦 Decompressing backup...');

  const command = `gunzip "${compressedPath}"`;

  try {
    await execAsync(command);
    const decompressedPath = compressedPath.replace('.gz', '');
    console.log(`✅ Decompressed: ${path.basename(decompressedPath)}\n`);
    return decompressedPath;
  } catch (error: any) {
    throw new Error(`Decompression failed: ${error.message}`);
  }
}

async function restoreDatabase(backupPath: string, targetDb?: string): Promise<void> {
  console.log('🗄️  Restoring database...');
  
  const databaseUrl = targetDb || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('⚠️  WARNING: This will overwrite the target database!');
  console.log(`Target: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}\n`);

  // Restore using psql
  const command = `psql "${databaseUrl}" < "${backupPath}"`;

  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.log('stderr:', stderr);
    }
    
    console.log('✅ Database restored successfully\n');
  } catch (error: any) {
    throw new Error(`Database restore failed: ${error.message}`);
  }
}

async function verifyRestore(): Promise<void> {
  console.log('✅ Verifying restored database...');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Check if key tables exist
  const checkTablesCommand = `psql "${databaseUrl}" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" -t`;

  try {
    const { stdout } = await execAsync(checkTablesCommand);
    const tables = stdout.trim().split('\n').map(t => t.trim()).filter(t => t);

    if (tables.length === 0) {
      throw new Error('No tables found in restored database');
    }

    console.log(`  Found ${tables.length} table(s)`);
    console.log(`  Sample tables: ${tables.slice(0, 5).join(', ')}...\n`);
  } catch (error: any) {
    throw new Error(`Verification failed: ${error.message}`);
  }
}

async function cleanupRestoreFiles(): Promise<void> {
  console.log('🧹 Cleaning up temporary files...');

  try {
    const files = fs.readdirSync(RESTORE_DIR);
    for (const file of files) {
      const filepath = path.join(RESTORE_DIR, file);
      fs.unlinkSync(filepath);
      console.log(`  🗑️  Deleted: ${file}`);
    }
  } catch (error: any) {
    console.warn(`⚠️  Failed to cleanup files: ${error.message}`);
  }
}

async function performRestore(backupKey: string, targetDb?: string): Promise<RestoreResult> {
  const startTime = Date.now();

  console.log('🚀 Starting database restore from backup');
  console.log(`📦 Backup: ${backupKey}`);
  console.log('─'.repeat(60));

  try {
    // Ensure restore directory exists
    await ensureRestoreDirectory();

    // Step 1: Download backup from R2
    const encryptedPath = await downloadBackup(backupKey);

    // Step 2: Decrypt backup
    const compressedPath = await decryptBackup(encryptedPath);

    // Step 3: Decompress backup
    const backupPath = await decompressBackup(compressedPath);

    // Step 4: Restore database
    await restoreDatabase(backupPath, targetDb);

    // Step 5: Verify restore
    await verifyRestore();

    // Step 6: Cleanup temporary files
    await cleanupRestoreFiles();

    const duration = Date.now() - startTime;

    console.log('='.repeat(60));
    console.log('✅ Restore completed successfully!');
    console.log('='.repeat(60));
    console.log(`📦 Backup: ${backupKey}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log('='.repeat(60));

    return {
      success: true,
      backupKey,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error('\n' + '='.repeat(60));
    console.error('❌ Restore failed!');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.error('='.repeat(60));

    // Cleanup temp files on error
    try {
      await cleanupRestoreFiles();
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
  const args = process.argv.slice(2);

  // List backups
  if (args.includes('--list') || args.length === 0) {
    await listAvailableBackups();
    return;
  }

  // Get backup key
  let backupKey: string | null = null;

  if (args[0] === '--latest') {
    backupKey = await getLatestBackup();
    if (!backupKey) {
      console.error('❌ No backups found');
      process.exit(1);
    }
    console.log(`📦 Latest backup: ${backupKey}\n`);
  } else {
    backupKey = args[0];
  }

  // Check if R2 is configured
  const cloudStorage = getCloudStorage();
  if (!cloudStorage.available()) {
    console.error('❌ Cloudflare R2 is not configured');
    console.error('Please set the following environment variables:');
    console.error('  - CLOUDFLARE_R2_ACCOUNT_ID');
    console.error('  - CLOUDFLARE_R2_ACCESS_KEY_ID');
    console.error('  - CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  // Optional: target database URL
  const targetDb = args.find(arg => arg.startsWith('--target='))?.split('=')[1];

  // Perform restore
  const result = await performRestore(backupKey, targetDb);
  process.exit(result.success ? 0 : 1);
}

main();

