#!/usr/bin/env tsx

/**
 * Rollback Script for Migration 0009
 * 
 * This script reverses the migration by:
 * - Renaming clinical_sessions back to sessions_hipaa
 * - Renaming the sequence back
 * 
 * ⚠️  USE WITH CAUTION - Only run if migration 0009 caused issues
 * 
 * Usage:
 *   DATABASE_URL="your-connection-string" tsx db/scripts/rollback-migration-0009.ts
 */

import { neon } from '@neondatabase/serverless';

async function rollbackMigration() {
  console.log('🔄 Starting Rollback for Migration 0009');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('Usage: DATABASE_URL="your-connection-string" tsx db/scripts/rollback-migration-0009.ts');
    process.exit(1);
  }

  console.log('✅ Database URL found');

  // Connect to database
  let sql;
  try {
    sql = neon(databaseUrl);
    console.log('✅ Database connection established');
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }

  // Check current state
  console.log('\n🔍 Checking current database state...');
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('sessions_hipaa', 'clinical_sessions')
      ORDER BY table_name;
    `;
    
    const hasClinical = tables.some((t: any) => t.table_name === 'clinical_sessions');
    const hasSessions = tables.some((t: any) => t.table_name === 'sessions_hipaa');

    console.log(`   clinical_sessions exists: ${hasClinical ? '✅ YES' : '❌ NO'}`);
    console.log(`   sessions_hipaa exists: ${hasSessions ? '✅ YES' : '❌ NO'}`);

    if (!hasClinical) {
      console.error('❌ ERROR: clinical_sessions table does not exist - nothing to rollback');
      process.exit(1);
    }

    if (hasSessions) {
      console.error('❌ ERROR: sessions_hipaa already exists - cannot rollback');
      console.error('Manual intervention required.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Pre-rollback check failed:', error.message);
    process.exit(1);
  }

  // Execute rollback
  console.log('\n🔄 Executing rollback...');
  
  try {
    // Rename table back
    await sql`ALTER TABLE clinical_sessions RENAME TO sessions_hipaa;`;
    console.log('✅ Renamed clinical_sessions → sessions_hipaa');

    // Rename sequence back
    await sql`ALTER SEQUENCE IF EXISTS clinical_sessions_id_seq RENAME TO sessions_hipaa_id_seq;`;
    console.log('✅ Renamed sequence');

    // Update default to reference old sequence name
    await sql`
      ALTER TABLE sessions_hipaa 
      ALTER COLUMN id SET DEFAULT nextval('sessions_hipaa_id_seq'::regclass);
    `;
    console.log('✅ Updated id column default');

  } catch (error: any) {
    console.error('❌ Rollback failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  // Verify rollback
  console.log('\n🔍 Verifying rollback...');
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'sessions_hipaa';
    `;

    if (tables.length === 0) {
      console.error('❌ VERIFICATION FAILED: sessions_hipaa not found after rollback!');
      process.exit(1);
    }

    console.log('✅ sessions_hipaa table exists');
    console.log('✅ Rollback completed successfully');

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 ROLLBACK COMPLETED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Note: You need to update your code to use sessions_hipaa instead of clinical_sessions');
}

// Run the rollback
rollbackMigration().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});

