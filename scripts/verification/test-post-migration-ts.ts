#!/usr/bin/env tsx

/**
 * Post-Migration Verification Script (TypeScript)
 * Tests that all migrations were applied correctly and endpoints are working
 * 
 * Usage:
 *   BASE_URL=https://loma-hipaa-dev.onrender.com tsx scripts/verification/test-post-migration-ts.ts
 *   or
 *   DATABASE_URL=postgresql://... BASE_URL=https://loma-hipaa-dev.onrender.com tsx scripts/verification/test-post-migration-ts.ts
 */

import { db } from '../../db/index';
import { sql } from 'drizzle-orm';

const BASE_URL = process.env.BASE_URL || 'https://loma-hipaa-dev.onrender.com';
const API_URL = `${BASE_URL}/api`;
const DATABASE_URL = process.env.DATABASE_URL;

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  warning?: boolean;
}

const results: TestResult[] = [];

function testPass(name: string, message?: string) {
  results.push({ name, passed: true, message });
  console.log(`✅ PASS: ${name}${message ? ` - ${message}` : ''}`);
}

function testFail(name: string, message?: string) {
  results.push({ name, passed: false, message });
  console.log(`❌ FAIL: ${name}${message ? ` - ${message}` : ''}`);
}

function testWarn(name: string, message?: string) {
  results.push({ name, passed: true, message, warning: true });
  console.log(`⚠️  WARN: ${name}${message ? ` - ${message}` : ''}`);
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
    console.error(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    `);
    return Number(result.rows[0]?.count || 0) > 0;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n1️⃣  Testing Health Endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      testPass('Health endpoint returns ok');
      
      if (data.database?.connected) {
        testPass('Database connection is healthy');
      } else {
        testFail('Database connection issue detected');
      }
      
      if (data.schemaValid) {
        testPass('Database schema is valid');
      } else {
        testFail('Database schema validation failed', JSON.stringify(data.database?.errors));
      }
    } else {
      testFail('Health endpoint failed', JSON.stringify(data));
    }
  } catch (error: any) {
    testFail('Health endpoint request failed', error.message);
  }
}

async function testDatabaseSchema() {
  console.log('\n2️⃣  Testing Database Schema...');
  
  if (!DATABASE_URL) {
    console.log('Skipping database schema checks (DATABASE_URL not set)');
    return;
  }
  
  try {
    // Check critical column
    const hasPatientNameHash = await checkColumnExists('patients', 'patient_name_search_hash');
    if (hasPatientNameHash) {
      testPass('patient_name_search_hash column exists');
    } else {
      testFail('patient_name_search_hash column is missing');
    }
    
    // Check critical tables
    const hasTasksTable = await checkTableExists('tasks');
    if (hasTasksTable) {
      testPass('tasks table exists');
    } else {
      testFail('tasks table is missing');
    }
    
    const hasMedicalCodes = await checkTableExists('medical_codes');
    if (hasMedicalCodes) {
      testPass('medical_codes table exists');
    } else {
      testWarn('medical_codes table is missing (may not be critical)');
    }
    
    const hasDocuments = await checkTableExists('documents');
    if (hasDocuments) {
      testPass('documents table exists');
    } else {
      testWarn('documents table is missing (may not be critical)');
    }
    
    const hasCVParser = await checkTableExists('cv_parser_education');
    if (hasCVParser) {
      testPass('cv_parser_education table exists');
    } else {
      testWarn('cv_parser_education table is missing (may not be critical)');
    }
  } catch (error: any) {
    testFail('Database schema check failed', error.message);
  }
}

async function testAPIEndpoints() {
  console.log('\n3️⃣  Testing API Endpoints...');
  
  const endpoints = [
    { path: '/api/patients', name: 'Patients endpoint' },
    { path: '/api/clinical-sessions', name: 'Clinical sessions endpoint' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`);
      const status = response.status;
      const body = await response.text();
      
      if (status === 401 || status === 403) {
        testPass(`${endpoint.name} returns auth error (${status}), not 500`);
      } else if (status === 500) {
        testFail(`${endpoint.name} still returning 500 error`, body.substring(0, 200));
      } else if (status === 200) {
        testPass(`${endpoint.name} returns 200 (unauthenticated access - check auth requirements)`);
      } else {
        testWarn(`${endpoint.name} returned unexpected status: ${status}`);
      }
    } catch (error: any) {
      testFail(`${endpoint.name} request failed`, error.message);
    }
  }
}

async function testFrontend() {
  console.log('\n4️⃣  Testing Frontend...');
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (response.status === 200 || response.status === 304) {
      testPass(`Frontend loads successfully (HTTP ${response.status})`);
    } else {
      testWarn(`Frontend returned HTTP ${response.status}`);
    }
  } catch (error: any) {
    testFail('Frontend request failed', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Post-Migration Verification Tests');
  console.log('==================================');
  console.log(`Base URL: ${BASE_URL}`);
  
  await testHealthEndpoint();
  await testDatabaseSchema();
  await testAPIEndpoints();
  await testFrontend();
  
  // Summary
  console.log('\n==================================');
  console.log('📊 Test Summary');
  console.log('==================================');
  
  const passed = results.filter(r => r.passed && !r.warning).length;
  const warnings = results.filter(r => r.warning).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  if (warnings > 0) {
    console.log(`⚠️  Warnings: ${warnings}`);
  }
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}${r.message ? `: ${r.message}` : ''}`);
    });
    process.exit(1);
  } else {
    console.log(`❌ Failed: ${failed}`);
    console.log('\n🎉 All critical tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});

