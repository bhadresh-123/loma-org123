#!/usr/bin/env tsx
/**
 * Medical Codes Migration Runner
 * 
 * This script:
 * 1. Runs the SQL migration to create medical_codes and assessment_categories tables
 * 2. Executes the seed script to populate default data
 * 3. Verifies tables and data
 * 4. Reports success/failure
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../index';
import { sql } from 'drizzle-orm';
import { medicalCodes, assessmentCategories } from '../schema-hipaa-refactored';

async function runMigration() {
  console.log('🚀 Starting Medical Codes Migration...\n');
  
  try {
    // Step 1: Run SQL migration
    console.log('📋 Step 1: Creating tables...');
    const migrationSQL = readFileSync(
      join(__dirname, '../migrations-hipaa/0004_add_medical_codes_tables.sql'),
      'utf8'
    );
    
    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
          
          // Only log table creation and index creation
          if (statement.includes('CREATE TABLE')) {
            const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1];
            console.log(`   ✅ Created table: ${tableName}`);
          } else if (statement.includes('CREATE INDEX')) {
            const indexName = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/)?.[1];
            console.log(`   ✅ Created index: ${indexName}`);
          }
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message?.includes('already exists')) {
            console.log(`   ⏭️  Skipping existing object`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Tables created successfully\n');
    
    // Step 2: Execute seed data
    console.log('🌱 Step 2: Seeding default data...');
    console.log('   (Running seed script...)\n');
    
    // Import and run seed script dynamically
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('tsx db/scripts/seed-medical-codes.ts');
    
    // Step 3: Verify migration
    console.log('\n🔍 Step 3: Verifying migration...');
    
    // Check medical_codes table
    const cptCodesCount = await db.select().from(medicalCodes);
    console.log(`   ✅ Medical codes table: ${cptCodesCount.length} records`);
    
    // Check assessment_categories table
    const categoriesCount = await db.select().from(assessmentCategories);
    console.log(`   ✅ Assessment categories table: ${categoriesCount.length} records`);
    
    if (cptCodesCount.length === 0 || categoriesCount.length === 0) {
      throw new Error('Tables created but seed data is missing');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`   ✅ ${cptCodesCount.length} CPT codes available`);
    console.log(`   ✅ ${categoriesCount.length} assessment categories available\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nTo rollback, run:');
    console.error('  DROP TABLE IF EXISTS medical_codes CASCADE;');
    console.error('  DROP TABLE IF EXISTS assessment_categories CASCADE;\n');
    process.exit(1);
  }
}

// Run the migration
runMigration();

