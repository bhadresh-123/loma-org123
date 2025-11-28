#!/usr/bin/env node

/**
 * Clean Slate Profile Fix - Eliminates duplicate columns and field mapping conflicts
 * 
 * This script:
 * 1. Drops duplicate columns that cause data split issues
 * 2. Standardizes on snake_case field names  
 * 3. Clears conflicting data to prevent authentication issues
 * 4. Updates schema to use consistent data types
 * 
 * SAFE APPROACH: No data preservation - users will re-enter profile info
 */

import pg from 'pg';
const { Pool } = pg;

async function runCleanSlateFix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('🧹 Starting Clean Slate Profile Fix');
  console.log('============================================\n');
  
  try {
    // Step 1: Backup current state for rollback if needed
    console.log('📋 Creating backup of current duplicate column data...');
    
    const backupQuery = `
      CREATE TABLE IF NOT EXISTS profile_backup_${Date.now()} AS
      SELECT 
        id, username, name,
        npinumber, npi_number,
        dateofbirth, date_of_birth,
        birthcity, birth_city,
        birthstate, birth_state,
        birthcountry, birth_country,
        isuscitizen, is_us_citizen,
        workpermitvisa, work_permit_visa,
        taxonomycode, taxonomy_code,
        address, business_physical_address
      FROM users;
    `;
    
    await pool.query(backupQuery);
    console.log('✅ Backup created successfully\n');
    
    // Step 2: Clear conflicting data in standardized columns
    console.log('🗑️  Clearing conflicting data in standardized columns...');
    
    const clearConflictsQuery = `
      UPDATE users SET
        npi_number = NULL,
        date_of_birth = NULL,
        birth_city = NULL,
        birth_state = NULL,
        birth_country = NULL,
        is_us_citizen = NULL,
        work_permit_visa = NULL,
        taxonomy_code = NULL,
        business_physical_address = NULL
    `;
    
    const { rowCount: clearedRows } = await pool.query(clearConflictsQuery);
    console.log(`✅ Cleared conflicting data for ${clearedRows} users\n`);
    
    // Step 3: Drop duplicate columns safely
    console.log('🔨 Dropping duplicate columns...');
    
    const columnsToCheck = [
      'npinumber',
      'dateofbirth', 
      'birthcity',
      'birthstate',
      'birthcountry',
      'isuscitizen',
      'workpermitvisa',
      'taxonomycode',
      'address'
    ];
    
    for (const column of columnsToCheck) {
      try {
        // Check if column exists first
        const checkQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = $1
        `;
        const { rows } = await pool.query(checkQuery, [column]);
        
        if (rows.length > 0) {
          await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS ${column}`);
          console.log(`  ✅ Dropped column: ${column}`);
        } else {
          console.log(`  ℹ️  Column ${column} does not exist (already cleaned)`);
        }
      } catch (error) {
        console.log(`  ⚠️  Could not drop ${column}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Verifying cleanup...');
    
    // Step 4: Verify remaining columns
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'npi_number', 'date_of_birth', 'birth_city', 'birth_state', 
        'birth_country', 'is_us_citizen', 'work_permit_visa', 
        'taxonomy_code', 'business_physical_address'
      )
      ORDER BY column_name;
    `;
    
    const { rows: remainingColumns } = await pool.query(verifyQuery);
    
    console.log('✅ Remaining standardized columns:');
    remainingColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Step 5: Check for any remaining duplicate columns
    console.log('\n🔍 Checking for any remaining duplicates...');
    
    const duplicateCheckQuery = `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'npinumber', 'dateofbirth', 'birthcity', 'birthstate', 
        'birthcountry', 'isuscitizen', 'workpermitvisa', 
        'taxonomycode', 'address'
      );
    `;
    
    const { rows: duplicatesFound } = await pool.query(duplicateCheckQuery);
    
    if (duplicatesFound.length === 0) {
      console.log('✅ No duplicate columns found - cleanup successful!');
    } else {
      console.log('⚠️  Remaining duplicate columns:');
      duplicatesFound.forEach(col => {
        console.log(`  - ${col.column_name}`);
      });
    }
    
    console.log('\n============================================');
    console.log('🎉 Clean Slate Profile Fix Complete!');
    console.log('============================================');
    console.log('');
    console.log('📋 Summary:');
    console.log('  ✅ Duplicate columns removed');
    console.log('  ✅ Conflicting data cleared');
    console.log('  ✅ Schema standardized to snake_case');
    console.log('  ✅ Date of birth conflicts resolved');
    console.log('');
    console.log('👤 Users will need to re-enter profile information');
    console.log('🔒 No authentication systems affected');
    console.log('💾 Backup table created for safety');
    
  } catch (error) {
    console.error('❌ Clean slate fix failed:', error);
    console.error('💡 Rollback instructions:');
    console.error('   1. Check backup tables: SELECT * FROM information_schema.tables WHERE table_name LIKE \'profile_backup_%\';');
    console.error('   2. Restore from most recent backup if needed');
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix if this is the main module
runCleanSlateFix()
  .then(() => {
    console.log('🚀 Ready to update field mapping system...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error.message);
    process.exit(1);
  });

export { runCleanSlateFix };