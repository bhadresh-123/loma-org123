#!/usr/bin/env tsx

/**
 * Migration Runner for 0009_rename_sessions_table.sql
 * 
 * This script executes the critical migration that:
 * - Renames sessions_hipaa to clinical_sessions
 * - Fixes the id column to have proper serial default
 * - Adds missing columns for new schema
 * 
 * Usage:
 *   DATABASE_URL="your-connection-string" tsx db/scripts/run-migration-0009.ts
 */

import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

async function runMigration() {
  console.log('🔧 Starting Migration 0009: Rename sessions_hipaa to clinical_sessions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('Usage: DATABASE_URL="your-connection-string" tsx db/scripts/run-migration-0009.ts');
    process.exit(1);
  }

  console.log('✅ Database URL found');
  console.log(`📍 Connection: ${databaseUrl.split('@')[1]?.split('?')[0] || 'unknown'}`);

  // Read migration file
  const migrationPath = path.resolve(process.cwd(), 'db/migrations-hipaa/0009_rename_sessions_table.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ ERROR: Migration file not found at ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded');
  console.log(`📄 File: ${migrationPath}`);

  // Connect to database
  let sql;
  try {
    sql = neon(databaseUrl);
    console.log('✅ Database connection established');
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }

  // Check current state before migration
  console.log('\n🔍 Checking current database state...');
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%session%'
      ORDER BY table_name;
    `;
    
    console.log('📊 Session-related tables found:');
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));

    const hasSessions = tables.some((t: any) => t.table_name === 'sessions_hipaa');
    const hasClinical = tables.some((t: any) => t.table_name === 'clinical_sessions');

    console.log('\n📋 Pre-migration status:');
    console.log(`   sessions_hipaa exists: ${hasSessions ? '✅ YES' : '❌ NO'}`);
    console.log(`   clinical_sessions exists: ${hasClinical ? '✅ YES' : '❌ NO'}`);

    if (!hasSessions && !hasClinical) {
      console.error('❌ ERROR: Neither sessions_hipaa nor clinical_sessions table exists!');
      console.error('Cannot proceed with migration.');
      process.exit(1);
    }

    if (hasClinical) {
      console.log('\n⚠️  WARNING: clinical_sessions already exists');
      console.log('Migration will check and fix the id column default if needed.');
      
      // Check id column default
      const idColumn = await sql`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'clinical_sessions' 
          AND column_name = 'id';
      `;
      
      if (idColumn.length > 0) {
        console.log(`   Current id default: ${idColumn[0].column_default || 'NULL (PROBLEM!)'}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Pre-migration check failed:', error.message);
    process.exit(1);
  }

  // Execute migration
  console.log('\n🚀 Executing migration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Execute the migration SQL using raw query
    const result = await sql.query(migrationSQL);
    console.log('✅ Migration executed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  // Verify migration success
  console.log('\n🔍 Verifying migration results...');
  try {
    // Check table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'clinical_sessions';
    `;

    if (tables.length === 0) {
      console.error('❌ VERIFICATION FAILED: clinical_sessions table not found after migration!');
      process.exit(1);
    }
    console.log('✅ clinical_sessions table exists');

    // Check id column default
    const idColumn = await sql`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'clinical_sessions' 
        AND column_name = 'id';
    `;

    if (idColumn.length === 0) {
      console.error('❌ VERIFICATION FAILED: id column not found in clinical_sessions!');
      process.exit(1);
    }

    const columnDefault = idColumn[0].column_default;
    console.log(`✅ id column exists with default: ${columnDefault}`);

    if (!columnDefault || !columnDefault.includes('clinical_sessions_id_seq')) {
      console.error('❌ VERIFICATION FAILED: id column does not have proper sequence default!');
      console.error(`   Expected: nextval('clinical_sessions_id_seq'::regclass)`);
      console.error(`   Got: ${columnDefault}`);
      process.exit(1);
    }

    console.log('✅ id column has correct sequence default');

    // Check sequence exists
    const sequences = await sql`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_name = 'clinical_sessions_id_seq';
    `;

    if (sequences.length === 0) {
      console.error('❌ VERIFICATION FAILED: clinical_sessions_id_seq sequence not found!');
      process.exit(1);
    }
    console.log('✅ clinical_sessions_id_seq sequence exists');

    // Check key columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clinical_sessions' 
        AND column_name IN ('organization_id', 'patient_id', 'therapist_id', 'date')
      ORDER BY column_name;
    `;

    console.log(`✅ Found ${columns.length}/4 required columns`);
    columns.forEach((c: any) => console.log(`   - ${c.column_name}`));

    if (columns.length < 4) {
      console.error('❌ VERIFICATION FAILED: Missing required columns!');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }

  // Success summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Summary:');
  console.log('   - clinical_sessions table is ready');
  console.log('   - id column has proper serial default');
  console.log('   - Sequence clinical_sessions_id_seq exists');
  console.log('   - All required columns present');
  console.log('\n🚀 Next steps:');
  console.log('   1. Redeploy your application');
  console.log('   2. Test session creation');
  console.log('   3. Monitor logs for successful inserts');
  console.log('\n💡 The session creation issue should now be resolved!');
}

// Run the migration
runMigration().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});

