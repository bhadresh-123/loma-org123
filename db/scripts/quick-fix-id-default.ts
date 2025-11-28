#!/usr/bin/env tsx

/**
 * Quick Fix: Set id column default for clinical_sessions
 * 
 * This is a simplified script that fixes ONLY the id column issue.
 * The problem: id column has NULL default instead of nextval(sequence)
 */

import { neon } from '@neondatabase/serverless';

async function quickFix() {
  console.log('🔧 Quick Fix: Setting id column default for clinical_sessions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  console.log('✅ Connected to database');

  // Step 1: Check if sequence exists
  console.log('\n🔍 Checking for sequence...');
  const sequences = await sql`
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_name = 'clinical_sessions_id_seq';
  `;

  if (sequences.length === 0) {
    console.log('⚠️  Sequence does not exist, creating it...');
    
    // Create the sequence
    await sql`CREATE SEQUENCE IF NOT EXISTS clinical_sessions_id_seq;`;
    console.log('✅ Created sequence: clinical_sessions_id_seq');
    
    // Set sequence to start after max existing id
    const maxId = await sql`SELECT COALESCE(MAX(id), 0) as max_id FROM clinical_sessions;`;
    const nextVal = (maxId[0]?.max_id || 0) + 1;
    
    await sql`SELECT setval('clinical_sessions_id_seq', ${nextVal});`;
    console.log(`✅ Set sequence to start at ${nextVal}`);
  } else {
    console.log('✅ Sequence already exists');
  }

  // Step 2: Set the default on id column
  console.log('\n🔧 Setting default for id column...');
  await sql`
    ALTER TABLE clinical_sessions 
    ALTER COLUMN id SET DEFAULT nextval('clinical_sessions_id_seq'::regclass);
  `;
  console.log('✅ Set id column default to use sequence');

  // Step 3: Verify
  console.log('\n🔍 Verifying fix...');
  const check = await sql`
    SELECT column_default 
    FROM information_schema.columns 
    WHERE table_name = 'clinical_sessions' 
      AND column_name = 'id';
  `;

  const defaultValue = check[0]?.column_default;
  console.log(`   Current id default: ${defaultValue}`);

  if (defaultValue && defaultValue.includes('clinical_sessions_id_seq')) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS! The id column is now properly configured!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Session creation should now work!');
    console.log('   Try scheduling a client session in your app.');
  } else {
    console.log('\n❌ Verification failed - default not set correctly');
    process.exit(1);
  }
}

quickFix().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

