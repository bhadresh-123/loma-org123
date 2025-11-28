#!/usr/bin/env tsx
/**
 * Migrate Files to Cloudflare R2
 * 
 * Purpose: Move existing files from local uploads/ directory to R2 cloud storage
 * HIPAA Compliance: Section 1.4.7 - Contingency Plan (persistent storage)
 * 
 * Usage:
 *   npm run migrate:files-to-r2
 *   or
 *   tsx scripts/migration/migrate-files-to-r2.ts
 * 
 * Options:
 *   --dry-run: Show what would be migrated without actually moving files
 *   --delete: Delete local files after successful upload (default: keep as backup)
 */

import * as fs from 'fs';
import * as path from 'path';
import { getCloudStorage } from '../../server/services/CloudStorageService';
import { storeFile } from '../../server/utils/file-storage';

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

async function migrateFilesToR2(options: { dryRun?: boolean; deleteAfter?: boolean } = {}): Promise<MigrationStats> {
  const { dryRun = false, deleteAfter = false } = options;

  console.log('🚀 Starting file migration to Cloudflare R2');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no actual changes)' : 'LIVE MIGRATION'}`);
  console.log(`Delete after upload: ${deleteAfter ? 'YES' : 'NO'}\n`);

  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

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

  console.log('✅ Cloudflare R2 is configured and available\n');

  // Directories to migrate
  const uploadDirs = [
    'uploads',
    'uploads/persistent',
    'uploads/cv-temp',
  ];

  for (const dir of uploadDirs) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`⏭️  Skipping ${dir} (doesn't exist)`);
      continue;
    }

    console.log(`\n📁 Processing directory: ${dir}`);
    console.log('─'.repeat(60));

    const files = fs.readdirSync(dirPath);
    
    if (files.length === 0) {
      console.log('  (empty directory)');
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }

      // Skip .gitkeep files
      if (file === '.gitkeep') {
        stats.skipped++;
        continue;
      }

      stats.total++;
      
      try {
        // Check if file already exists in R2
        const storageKey = `migrated/${dir}/${file}`;
        const exists = await cloudStorage.exists(storageKey, 'files');

        if (exists.exists) {
          console.log(`  ⏭️  ${file} (already in R2, size: ${exists.size} bytes)`);
          stats.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`  🔍 ${file} (would upload, ${fs.statSync(filePath).size} bytes)`);
          stats.migrated++;
          continue;
        }

        // Upload file to R2 (with encryption)
        console.log(`  📤 ${file} (uploading...)`);
        const result = await storeFile(filePath, storageKey, {
          encrypt: true,
          mimeType: getMimeType(file),
        });

        if (result.success) {
          console.log(`  ✅ ${file} (uploaded to ${result.metadata?.location})`);
          stats.migrated++;

          // Delete local file if requested
          if (deleteAfter) {
            fs.unlinkSync(filePath);
            console.log(`  🗑️  ${file} (deleted from local storage)`);
          }
        } else {
          console.log(`  ❌ ${file} (failed: ${result.error})`);
          stats.failed++;
          stats.errors.push({ file, error: result.error || 'Unknown error' });
        }
      } catch (error: any) {
        console.log(`  ❌ ${file} (error: ${error.message})`);
        stats.failed++;
        stats.errors.push({ file, error: error.message });
      }
    }
  }

  return stats;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.encrypted': 'application/octet-stream',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function printStats(stats: MigrationStats, dryRun: boolean) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total files found:      ${stats.total}`);
  console.log(`Successfully migrated:  ${stats.migrated} ${dryRun ? '(would migrate)' : ''}`);
  console.log(`Skipped (already in R2): ${stats.skipped}`);
  console.log(`Failed:                 ${stats.failed}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of stats.errors) {
      console.log(`  - ${error.file}: ${error.error}`);
    }
  }

  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n💡 This was a dry run. No files were actually migrated.');
    console.log('   Run without --dry-run to perform the migration.');
  } else if (stats.migrated > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('   Files are now stored in Cloudflare R2 with encryption.');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const deleteAfter = args.includes('--delete');

  try {
    const stats = await migrateFilesToR2({ dryRun, deleteAfter });
    printStats(stats, dryRun);

    if (stats.failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();

