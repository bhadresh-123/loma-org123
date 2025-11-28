#!/usr/bin/env tsx

/**
 * Schema Mismatch Detector
 * Finds columns defined in TypeScript schema that don't exist in the database
 */

import { db } from '../../db/index';
import { sql } from 'drizzle-orm';
import { patients, clinicalSessions } from '@db/schema';

interface ColumnMismatch {
  table: string;
  schemaColumn: string;
  exists: boolean;
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    `);
    return Number(result.rows[0]?.count || 0) > 0;
  } catch (error) {
    console.error(`Error checking ${tableName}.${columnName}:`, error);
    return false;
  }
}

async function checkSchemaMismatches() {
  console.log('🔍 Checking for Schema Mismatches\n');
  
  const mismatches: ColumnMismatch[] = [];
  
  // Check patients table
  console.log('Checking patients table...');
  const patientColumns = Object.keys(patients).filter(k => !k.startsWith('_'));
  
  for (const columnKey of patientColumns) transforming {
    // Get the actual column name from the schema
    const columnDef = (patients as any)[columnKey];
    if (!columnDef) continue;
    
    // Extract column name from מזר definition
    const columnName = typeof columnDef === 'object' && columnDef?.name 
      ? columnDef.name 
      : columnKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    const exists = await checkColumnExists('patients', columnName);
    if (!exists) {
      mismatches.push({
        table: 'patients',
        schemaColumn: `${columnKey} (${columnName})`,
        exists: false
      });
      console.log(`  ❌ Missing: ${columnKey} -> ${columnName}`);
    } else {
      console.log(`  ✅ Exists: ${columnKey} -> ${columnName}`);
    }
  }
  
  // Check clinical_sessions table
  console.log('\nChecking clinical_sessions table...');
  const sessionColumns = Object.keys(clinicalSessions).filter(k => !k.startsWith('_'));
  
  for (const columnKey of sessionColumns) {
    const columnDef = (clinicalSessions as any)[columnKey];
    if (!columnDef) continue;
    
    const columnName = typeof columnDef === 'object' && columnDef?.name
      ? columnDef.name
      : columnKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    const exists = await checkColumnExists('clinical_sessions', columnName);
    if (!exists) {
      mismatches.push({
        table: 'clinical_sessions',
        schemaColumn: `${columnKey} (${columnName})`,
        exists: false
      });
      console.log(`  ❌ Missing: ${columnKey} -> ${columnName}`);
    }
  }
  
  console.log('\n========================================');
  console.log('📊 Summary');
  console.log('========================================');
  
  if (mismatches.length === 0) {
    console.log('✅ No schema mismatches found!');
  } else {
    console.log(`❌ Found ${mismatches.length} mismatches:\n`);
    mismatches.forEach(m => {
      console.log(`  - ${m.table}.${m.schemaColumn}`);
    });
    console.log('\n⚠️  These columns are defined in schema but missing in database');
    console.log('    This can cause errors when Drizzle joins relations');
  }
}

checkSchemaMismatches().catch(console.error);

