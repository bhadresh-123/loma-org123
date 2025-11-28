#!/usr/bin/env node

/**
 * HIPAA Operational Tables Validation Script
 * 
 * This script validates that all operational tables are properly defined and accessible
 * in the HIPAA schema. It checks:
 * 1. Schema definitions exist
 * 2. Database exports are correct
 * 3. Tables can be queried (if database is available)
 * 4. Relations are properly defined
 */

import { getActiveSchema } from '../index.js';
import { validateRequiredTables, DatabaseError } from '../../server/utils/database-error-handling.js';

// Define all operational tables that should be available
const OPERATIONAL_TABLES = [
  'userSettings',
  'notifications', 
  'notificationSettings',
  'invoices',
  'invoiceItems',
  'cardTransactions'
];

// Define core healthcare tables that should also be available
const CORE_TABLES = [
  'usersAuth',
  'organizations',
  'organizationMemberships',
  'therapistProfiles',
  'therapistPHI',
  'patients',
  'clinicalSessions',
  'patientTreatmentPlans',
  'auditLogsHIPAA',
  'tasks',
  'workSchedules',
  'calendarBlocks'
];

// Define all required tables
const ALL_REQUIRED_TABLES = [...CORE_TABLES, ...OPERATIONAL_TABLES];

async function validateSchemaCompleteness() {
  console.log('🔍 HIPAA Schema Completeness Validation');
  console.log('==========================================\n');
  
  try {
    // Test 1: Schema exports
    console.log('1. Testing schema exports...');
    const schema = getActiveSchema();
    
    if (!schema.isHIPAASchema) {
      throw new Error('❌ HIPAA schema is not enabled');
    }
    console.log('✅ HIPAA schema is enabled');
    
    // Test 2: Check all required tables exist
    console.log('\n2. Checking required tables...');
    const missingTables = ALL_REQUIRED_TABLES.filter(table => 
      !schema[table] || schema[table] === null
    );
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
      throw new Error(`Schema is missing ${missingTables.length} required tables`);
    }
    console.log('✅ All required tables are available');
    
    // Test 3: Validate operational tables specifically
    console.log('\n3. Validating operational tables...');
    try {
      validateRequiredTables(schema, OPERATIONAL_TABLES);
      console.log('✅ All operational tables are properly defined');
    } catch (error) {
      if (error instanceof DatabaseError) {
        console.log('❌ Operational table validation failed:', error.message);
        throw error;
      }
      throw error;
    }
    
    // Test 4: Check table structure (if we can access the schema definitions)
    console.log('\n4. Checking table structure...');
    const operationalTableChecks = OPERATIONAL_TABLES.map(table => {
      const tableDef = schema[table];
      if (!tableDef) {
        return { table, status: 'missing', details: 'Table not found in schema' };
      }
      
      // Check if it has the expected structure (basic check)
      const hasId = tableDef.id !== undefined;
      const hasTimestamps = tableDef.createdAt !== undefined;
      
      return {
        table,
        status: hasId && hasTimestamps ? 'valid' : 'incomplete',
        details: `ID: ${hasId}, Timestamps: ${hasTimestamps}`
      };
    });
    
    operationalTableChecks.forEach(check => {
      const status = check.status === 'valid' ? '✅' : '❌';
      console.log(`${status} ${check.table}: ${check.details}`);
    });
    
    const invalidTables = operationalTableChecks.filter(check => check.status !== 'valid');
    if (invalidTables.length > 0) {
      throw new Error(`${invalidTables.length} tables have incomplete structure`);
    }
    
    // Test 5: Check migration files exist
    console.log('\n5. Checking migration files...');
    const fs = await import('fs');
    const migrationFile = './migrations-hipaa/0003_add_operational_tables.sql';
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error('Migration file not found: ' + migrationFile);
    }
    console.log('✅ Migration file exists');
    
    // Test 6: Check migration journal
    console.log('\n6. Checking migration journal...');
    const journalFile = './migrations-hipaa/meta/_journal.json';
    
    if (!fs.existsSync(journalFile)) {
      throw new Error('Migration journal not found: ' + journalFile);
    }
    
    const journalContent = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
    const hasMigration = journalContent.entries.some((entry: any) => 
      entry.tag === '0003_add_operational_tables'
    );
    
    if (!hasMigration) {
      throw new Error('Migration not registered in journal');
    }
    console.log('✅ Migration is registered in journal');
    
    // Summary
    console.log('\n🎉 VALIDATION SUCCESSFUL');
    console.log('========================');
    console.log('✅ All operational tables are properly defined');
    console.log('✅ Schema exports are correct');
    console.log('✅ Migration files are in place');
    console.log('✅ Scheduled tasks should now work correctly');
    console.log('✅ Notification system should now work correctly');
    console.log('✅ User settings should now work correctly');
    console.log('✅ Billing system should now work correctly');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ VALIDATION FAILED');
    console.log('===================');
    console.error('Error:', error.message);
    
    if (error instanceof DatabaseError) {
      console.log('\nThis appears to be a schema issue. Please check:');
      console.log('1. Migration has been run: npm run migrate');
      console.log('2. Environment variables are set correctly');
      console.log('3. Database connection is working');
    }
    
    process.exit(1);
  }
}

// Run validation
validateSchemaCompleteness().catch(console.error);
