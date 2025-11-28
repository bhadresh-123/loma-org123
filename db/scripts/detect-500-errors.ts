#!/usr/bin/env node

/**
 * Comprehensive 500 Error Detection Script
 * 
 * Monitors all API endpoints for schema-related 500 errors
 * and provides detailed analysis of potential issues.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';
import * as schema from '../schema-hipaa-refactored';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../env.development' });

// Database connection
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema: schema,
  ws: ws,
});

interface ErrorPattern {
  pattern: RegExp;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'schema' | 'database' | 'code' | 'unknown';
}

class Error500Detector {
  private errorPatterns: ErrorPattern[] = [
    // Schema-related errors
    {
      pattern: /column "([^"]+)" of relation "([^"]+)" does not exist/i,
      description: 'Missing column in database table',
      severity: 'critical',
      category: 'schema'
    },
    {
      pattern: /relation "([^"]+)" does not exist/i,
      description: 'Missing table in database',
      severity: 'critical',
      category: 'schema'
    },
    {
      pattern: /column "([^"]+)" does not exist/i,
      description: 'Column referenced but not found',
      severity: 'critical',
      category: 'schema'
    },
    {
      pattern: /invalid input syntax for type/i,
      description: 'Data type mismatch',
      severity: 'high',
      category: 'schema'
    },
    {
      pattern: /foreign key constraint/i,
      description: 'Foreign key constraint violation',
      severity: 'high',
      category: 'schema'
    },
    {
      pattern: /unique constraint/i,
      description: 'Unique constraint violation',
      severity: 'medium',
      category: 'database'
    },
    {
      pattern: /not null constraint/i,
      description: 'Not null constraint violation',
      severity: 'medium',
      category: 'database'
    },
    {
      pattern: /check constraint/i,
      description: 'Check constraint violation',
      severity: 'medium',
      category: 'database'
    },
    // Code-related errors
    {
      pattern: /getActiveSchema is not defined/i,
      description: 'Missing getActiveSchema import',
      severity: 'critical',
      category: 'code'
    },
    {
      pattern: /db is not defined/i,
      description: 'Missing database import',
      severity: 'critical',
      category: 'code'
    },
    {
      pattern: /Cannot read property.*of undefined/i,
      description: 'Undefined object property access',
      severity: 'high',
      category: 'code'
    }
  ];

  async detectSchemaErrors(): Promise<void> {
    console.log('🔍 Starting comprehensive 500 error detection...\n');
    
    // 1. Check server logs for recent errors
    await this.checkServerLogs();
    
    // 2. Test all API endpoints systematically
    await this.testAllEndpoints();
    
    // 3. Validate database schema integrity
    await this.validateSchemaIntegrity();
    
    // 4. Check for common error patterns in code
    await this.scanCodeForErrorPatterns();
    
    // 5. Test edge cases that commonly cause 500 errors
    await this.testEdgeCases();
    
    console.log('\n✅ Comprehensive error detection complete');
  }

  private async checkServerLogs(): Promise<void> {
    console.log('📋 Checking server logs for recent errors...');
    
    try {
      // Check if server.log exists and analyze recent entries
      const fs = await import('fs');
      const path = await import('path');
      
      const logPath = path.join(process.cwd(), 'server.log');
      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.split('\n').slice(-1000); // Last 1000 lines
        
        let errorCount = 0;
        let schemaErrorCount = 0;
        
        for (const line of lines) {
          if (line.includes('ERROR') || line.includes('500')) {
            errorCount++;
            
            // Check if it's a schema-related error
            for (const pattern of this.errorPatterns) {
              if (pattern.pattern.test(line) && pattern.category === 'schema') {
                schemaErrorCount++;
                console.log(`  🚨 Schema error found: ${pattern.description}`);
                console.log(`     ${line.trim()}`);
                break;
              }
            }
          }
        }
        
        console.log(`  📊 Found ${errorCount} total errors, ${schemaErrorCount} schema-related`);
        
        if (schemaErrorCount === 0) {
          console.log('  ✅ No schema-related errors in recent logs');
        }
      } else {
        console.log('  ⚠️  No server.log file found');
      }
    } catch (error) {
      console.log(`  ❌ Error checking logs: ${error.message}`);
    }
  }

  private async testAllEndpoints(): Promise<void> {
    console.log('\n🌐 Testing all API endpoints for 500 errors...');
    
    const endpoints = [
      // Auth endpoints
      { method: 'POST', path: '/api/auth/login', body: { username: 'test', password: 'test' } },
      { method: 'POST', path: '/api/auth/register', body: { username: 'test', email: 'test@test.com', password: 'test' } },
      
      // User endpoints
      { method: 'GET', path: '/api/user/profile' },
      
      // Organization endpoints
      { method: 'GET', path: '/api/organizations' },
      { method: 'POST', path: '/api/organizations', body: { name: 'Test Org', type: 'solo' } },
      
      // Patient endpoints
      { method: 'GET', path: '/api/patients' },
      { method: 'POST', path: '/api/patients', body: { name: 'Test Patient', organizationId: 1 } },
      
      // Task endpoints
      { method: 'GET', path: '/api/tasks' },
      { method: 'POST', path: '/api/tasks', body: { title: 'Test Task', organizationId: 1 } },
      
      // Clinical session endpoints
      { method: 'GET', path: '/api/clinical-sessions' },
      { method: 'POST', path: '/api/clinical-sessions', body: { patientId: 1, therapistId: 1, date: new Date() } },
      
      // Treatment plan endpoints
      { method: 'GET', path: '/api/patient-treatment-plans' },
      { method: 'POST', path: '/api/patient-treatment-plans', body: { patientId: 1, therapistId: 1 } },
      
      // Calendar endpoints
      { method: 'GET', path: '/api/calendar-blocks' },
      { method: 'POST', path: '/api/calendar-blocks', body: { userId: 1, organizationId: 1, startDate: new Date(), endDate: new Date(), blockType: 'personal' } },
      
      // Work schedule endpoints
      { method: 'GET', path: '/api/work-schedules' },
      { method: 'POST', path: '/api/work-schedules', body: { userId: 1, organizationId: 1, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' } },
      
      // Therapist endpoints
      { method: 'GET', path: '/api/therapists' },
      { method: 'POST', path: '/api/therapists', body: { name: 'Test Therapist', userId: 1 } },
      
      // Health check endpoints
      { method: 'GET', path: '/api/test/health' },
      { method: 'GET', path: '/api/test/schema' }
    ];

    let totalTests = 0;
    let errorCount = 0;
    let schemaErrorCount = 0;

    for (const endpoint of endpoints) {
      totalTests++;
      
      try {
        const response = await this.makeRequest(endpoint.method, endpoint.path, endpoint.body);
        
        if (response.status >= 500) {
          errorCount++;
          console.log(`  🚨 500 error on ${endpoint.method} ${endpoint.path}: ${response.status}`);
          
          // Check if it's schema-related
          const errorText = response.text || '';
          for (const pattern of this.errorPatterns) {
            if (pattern.pattern.test(errorText) && pattern.category === 'schema') {
              schemaErrorCount++;
              console.log(`     Schema error: ${pattern.description}`);
              break;
            }
          }
        } else if (response.status >= 400 && response.status < 500) {
          // Expected client errors (401, 403, 404, etc.)
          console.log(`  ℹ️  ${response.status} on ${endpoint.method} ${endpoint.path} (expected)`);
        } else {
          console.log(`  ✅ ${response.status} on ${endpoint.method} ${endpoint.path}`);
        }
      } catch (error) {
        errorCount++;
        console.log(`  ❌ Request failed on ${endpoint.method} ${endpoint.path}: ${error.message}`);
      }
    }

    console.log(`\n📊 Endpoint test results:`);
    console.log(`  Total tests: ${totalTests}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Schema-related errors: ${schemaErrorCount}`);
    
    if (schemaErrorCount === 0) {
      console.log('  ✅ No schema-related 500 errors detected in API endpoints');
    }
  }

  private async makeRequest(method: string, path: string, body?: any): Promise<{ status: number; text?: string }> {
    const fetch = (await import('node-fetch')).default;
    
    try {
      const response = await fetch(`http://localhost:5000${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        timeout: 5000
      });
      
      const text = await response.text();
      return { status: response.status, text };
    } catch (error) {
      // If server is not running or endpoint doesn't exist
      return { status: 503, text: error.message };
    }
  }

  private async validateSchemaIntegrity(): Promise<void> {
    console.log('\n🔍 Validating database schema integrity...');
    
    const criticalTables = [
      'users_auth',
      'organizations',
      'organization_memberships',
      'therapist_profiles',
      'therapist_phi',
      'patients',
      'clinical_sessions',
      'patient_treatment_plans',
      'tasks',
      'calendar_blocks',
      'work_schedules',
      'audit_logs_hipaa'
    ];

    let issuesFound = 0;

    for (const tableName of criticalTables) {
      try {
        // Check if table exists
        const tableExists = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          )
        `);
        
        if (!tableExists.rows[0].exists) {
          console.log(`  🚨 Table ${tableName} does not exist`);
          issuesFound++;
          continue;
        }

        // Check for common schema issues
        const columns = await db.execute(sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          ORDER BY ordinal_position
        `);

        // Check for missing critical columns
        const criticalColumns = this.getCriticalColumns(tableName);
        for (const criticalCol of criticalColumns) {
          const colExists = columns.rows.some((col: any) => col.column_name === criticalCol);
          if (!colExists) {
            console.log(`  🚨 Missing critical column ${tableName}.${criticalCol}`);
            issuesFound++;
          }
        }

        // Check for data type issues
        for (const col of columns.rows) {
          const colName = col.column_name;
          const dataType = col.data_type;
          
          // Check for common data type mismatches
          if (colName.includes('_encrypted') && dataType !== 'text') {
            console.log(`  ⚠️  ${tableName}.${colName} should be text for encrypted data, got ${dataType}`);
          }
          
          if (colName.includes('_id') && !colName.includes('_encrypted') && dataType !== 'integer') {
            console.log(`  ⚠️  ${tableName}.${colName} should be integer for ID, got ${dataType}`);
          }
        }

        console.log(`  ✅ ${tableName} schema looks good`);
        
      } catch (error) {
        console.log(`  ❌ Error checking ${tableName}: ${error.message}`);
        issuesFound++;
      }
    }

    if (issuesFound === 0) {
      console.log('  ✅ No schema integrity issues found');
    } else {
      console.log(`  🚨 Found ${issuesFound} schema integrity issues`);
    }
  }

  private getCriticalColumns(tableName: string): string[] {
    const criticalColumns: Record<string, string[]> = {
      'users_auth': ['id', 'username', 'email', 'password', 'created_at'],
      'organizations': ['id', 'name', 'type', 'created_at'],
      'organization_memberships': ['id', 'organization_id', 'user_id', 'role'],
      'therapist_profiles': ['id', 'user_id', 'name', 'created_at'],
      'therapist_phi': ['id', 'user_id', 'created_at'],
      'patients': ['id', 'organization_id', 'primary_therapist_id', 'name', 'created_at'],
      'clinical_sessions': ['id', 'organization_id', 'patient_id', 'therapist_id', 'date'],
      'patient_treatment_plans': ['id', 'organization_id', 'patient_id', 'therapist_id'],
      'tasks': ['id', 'organization_id', 'created_by_user_id', 'title'],
      'calendar_blocks': ['id', 'user_id', 'organization_id', 'start_date', 'end_date'],
      'work_schedules': ['id', 'user_id', 'organization_id', 'day_of_week'],
      'audit_logs_hipaa': ['id', 'user_id', 'action', 'resource_type', 'created_at']
    };
    
    return criticalColumns[tableName] || [];
  }

  private async scanCodeForErrorPatterns(): Promise<void> {
    console.log('\n🔍 Scanning code for potential error patterns...');
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const serverDir = path.join(process.cwd(), 'server');
      const files = this.getAllTsFiles(serverDir);
      
      let issuesFound = 0;
      
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for common error patterns
        if (content.includes('db.') && !content.includes('import.*db')) {
          console.log(`  ⚠️  ${file}: Uses db without import`);
          issuesFound++;
        }
        
        if (content.includes('getActiveSchema') && !content.includes('import.*getActiveSchema')) {
          console.log(`  ⚠️  ${file}: Uses getActiveSchema without import`);
          issuesFound++;
        }
        
        if (content.includes('schema.') && !content.includes('getActiveSchema')) {
          console.log(`  ⚠️  ${file}: Uses schema without getActiveSchema`);
          issuesFound++;
        }
        
        // Check for unsafe database operations
        if (content.includes('db.query.') && !content.includes('try') && !content.includes('catch')) {
          console.log(`  ⚠️  ${file}: Database query without error handling`);
          issuesFound++;
        }
      }
      
      if (issuesFound === 0) {
        console.log('  ✅ No code pattern issues found');
      } else {
        console.log(`  🚨 Found ${issuesFound} potential code issues`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error scanning code: ${error.message}`);
    }
  }

  private getAllTsFiles(dir: string): string[] {
    const fs = require('fs');
    const path = require('path');
    
    // Security: Validate and sanitize the directory parameter before use
    // This prevents path traversal attacks via the dir parameter
    if (!dir || typeof dir !== 'string') {
      throw new Error('Invalid directory parameter');
    }
    
    // Prevent path traversal patterns and null bytes in the directory itself
    if (dir.includes('\0') || dir.includes('..')) {
      throw new Error('Invalid directory path: contains forbidden patterns');
    }
    
    // Normalize and validate the directory is within the project
    const normalizedInputDir = path.resolve(dir);
    const projectRoot = process.cwd();
    if (!normalizedInputDir.startsWith(projectRoot)) {
      throw new Error('Directory must be within project root');
    }
    
    let files: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Skip hidden files and validate item name doesn't contain path traversal
      if (item.startsWith('.') || item.includes('..') || item.includes('\0')) {
        continue;
      }
      
      const fullPath = path.join(dir, item);
      
      // Verify the resolved path is still within the original directory (prevent symlink attacks)
      const normalizedFullPath = path.resolve(fullPath);
      const normalizedDir = path.resolve(dir);
      if (!normalizedFullPath.startsWith(normalizedDir + path.sep) && normalizedFullPath !== normalizedDir) {
        console.warn(`⚠️  Skipping suspicious path: ${fullPath}`);
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files = files.concat(this.getAllTsFiles(fullPath));
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async testEdgeCases(): Promise<void> {
    console.log('\n🧪 Testing edge cases that commonly cause 500 errors...');
    
    const edgeCases = [
      {
        name: 'Null organization ID',
        test: async () => {
          try {
            await db.execute(sql`SELECT * FROM patients WHERE organization_id IS NULL LIMIT 1`);
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Invalid foreign key reference',
        test: async () => {
          try {
            await db.execute(sql`SELECT * FROM patients WHERE primary_therapist_id = 999999 LIMIT 1`);
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Encrypted column access',
        test: async () => {
          try {
            await db.execute(sql`SELECT patient_contact_email_encrypted FROM patients LIMIT 1`);
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'JSONB column access',
        test: async () => {
          try {
            await db.execute(sql`SELECT assigned_therapist_ids FROM patients LIMIT 1`);
            return true;
          } catch (error) {
            return false;
          }
        }
      },
      {
        name: 'Timestamp column access',
        test: async () => {
          try {
            await db.execute(sql`SELECT created_at FROM patients LIMIT 1`);
            return true;
          } catch (error) {
            return false;
          }
        }
      }
    ];

    let passedTests = 0;
    
    for (const edgeCase of edgeCases) {
      try {
        const result = await edgeCase.test();
        if (result) {
          console.log(`  ✅ ${edgeCase.name}`);
          passedTests++;
        } else {
          console.log(`  ❌ ${edgeCase.name}`);
        }
      } catch (error) {
        console.log(`  ❌ ${edgeCase.name}: ${error.message}`);
      }
    }

    console.log(`\n📊 Edge case test results: ${passedTests}/${edgeCases.length} passed`);
    
    if (passedTests === edgeCases.length) {
      console.log('  ✅ All edge cases handled properly');
    }
  }
}

// Main execution
async function main() {
  try {
    const detector = new Error500Detector();
    await detector.detectSchemaErrors();
  } catch (error) {
    console.error('❌ Error detection failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
main().catch(console.error);
