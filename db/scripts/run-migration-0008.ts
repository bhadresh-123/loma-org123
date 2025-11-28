#!/usr/bin/env tsx

/**
 * Run Migration 0008: Remove patient_age and Add patient_name_search_hash
 * 
 * This migration:
 * 1. Removes the patient_age column (age is now computed from DOB)
 * 2. Adds the patient_name_search_hash column for secure name searching
 * 
 * This script is idempotent - safe to run multiple times.
 * Uses IF NOT EXISTS / IF EXISTS clauses to prevent errors.
 * 
 * Usage:
 *   tsx db/scripts/run-migration-0008.ts
 * 
 * Or from npm:
 *   npm run migrate:0008 (if added to package.json)
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      ) as column_exists
    `);
    return result.rows[0]?.column_exists || false;
  } catch (error) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

async function runMigration0008() {
  console.log('🚀 Running Migration 0008: Remove patient_age, Add patient_name_search_hash\n');
  console.log('='.repeat(60));
  
  const startTime = Date.now();

  try {
    // Check current state
    const hasPatientAge = await checkColumnExists('patients', 'patient_age');
    const hasNameSearchHash = await checkColumnExists('patients', 'patient_name_search_hash');

    console.log(`\n📊 Current database state:`);
    console.log(`   patients.patient_age: ${hasPatientAge ? '✅ exists' : '❌ missing'}`);
    console.log(`   patients.patient_name_search_hash: ${hasNameSearchHash ? '✅ exists' : '❌ missing'}\n`);

    // Read migration file
    const migrationPath = join(__dirname, '../migrations-hipaa/0008_remove_patient_age.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log(`   ✅ Migration file loaded\n`);

    // Execute migration statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`⚙️  Executing ${statements.length} SQL statement(s)...\n`);

    let statementsExecuted = 0;
    let columnsRemoved = 0;
    let columnsAdded = 0;

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
          statementsExecuted++;

          if (statement.includes('DROP COLUMN')) {
            columnsRemoved++;
            console.log(`   ✅ Executed: DROP COLUMN (removed ${columnsRemoved} column${columnsRemoved > 1 ? 's' : ''})`);
          } else if (statement.includes('ADD COLUMN')) {
            columnsAdded++;
            console.log(`   ✅ Executed: ADD COLUMN (added ${columnsAdded} column${columnsAdded > 1 ? 's' : ''})`);
          } else {
            console.log(`   ✅ Executed: ${statement.substring(0, 50)}...`);
          }
        } catch (error: any) {
          // IF NOT EXISTS / IF EXISTS should prevent most errors, but handle gracefully
          if (error.message?.includes('does not exist') || 
              error.message?.includes('already exists') ||
              error.message?.includes('duplicate column')) {
            console.log(`   ⚠️  Skipped (expected): ${error.message.split('\n')[0]}`);
            continue;
          } else {
            throw error;
          }
        }
      }
    }

    console.log(`\n✅ Migration execution completed`);
    console.log(`   Statements executed: ${statementsExecuted}`);

    // Verify final state
    console.log(`\n🔍 Verifying final state...`);
    const finalHasPatientAge = await checkColumnExists('patients', 'patient_age');
    const finalHasNameSearchHash = await checkColumnExists('patients', 'patient_name_search_hash');

    console.log(`   patients.patient_age: ${finalHasPatientAge ? '✅ exists' : '✅ removed (expected)'}`);
    console.log(`   patients.patient_name_search_hash: ${finalHasNameSearchHash ? '✅ exists' : '❌ MISSING - migration may have failed'}`);

    if (!finalHasNameSearchHash) {
      throw new Error('Migration verification failed: patient_name_search_hash column was not created');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration 0008 completed successfully in ${duration}s`);
    console.log('='.repeat(60));
    console.log('\n✅ The patient_name_search_hash column has been added to the patients table.');
    console.log('✅ Patient queries should now work correctly.\n');
    
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration 0008 failed:', error.message);
    console.error('\nError details:', error);
    console.error('\n⚠️  Manual SQL to fix:');
    console.error('   ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_name_search_hash TEXT;');
    process.exit(1);
  }
}

// Run migration
runMigration0008();

