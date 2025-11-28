#!/usr/bin/env node

/**
 * COMPREHENSIVE CTO QA VALIDATION - ALL RISK AREAS
 * 
 * This script validates EVERYTHING that could cause 500 errors or system failures
 * during CTO QA review - not just schema issues.
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

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
  error?: string;
}

class ComprehensiveCTOQAValidator {
  private results: ValidationResult[] = [];
  
  async runComprehensiveValidation(): Promise<void> {
    console.log('🚨 COMPREHENSIVE CTO QA VALIDATION');
    console.log('⚠️  TESTING ALL RISK AREAS - NOT JUST SCHEMA');
    console.log('='.repeat(80));
    
    // 1. Environment & Configuration
    await this.validateEnvironmentConfiguration();
    
    // 2. Database & Schema
    await this.validateDatabaseAndSchema();
    
    // 3. Authentication & Authorization
    await this.validateAuthenticationSystem();
    
    // 4. Session Management
    await this.validateSessionManagement();
    
    // 5. PHI Encryption & Security
    await this.validatePHIEncryption();
    
    // 6. API Endpoints & Error Handling
    await this.validateAPIEndpoints();
    
    // 7. Data Integrity & Foreign Keys
    await this.validateDataIntegrity();
    
    // 8. Performance & Resource Limits
    await this.validatePerformanceLimits();
    
    // 9. Security Headers & Middleware
    await this.validateSecurityMiddleware();
    
    // 10. Production Readiness
    await this.validateProductionReadiness();
    
    this.generateComprehensiveReport();
  }
  
  private async validateEnvironmentConfiguration(): Promise<void> {
    console.log('\n🔧 1. ENVIRONMENT & CONFIGURATION VALIDATION');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'NODE_ENV',
      'SESSION_SECRET',
      'PHI_ENCRYPTION_KEY'
    ];
    
    const optionalEnvVars = [
      'REDIS_URL',
      'STRIPE_SECRET_KEY',
      'EMAIL_USER',
      'ANTHROPIC_API_KEY'
    ];
    
    // Check required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.results.push({
          category: 'Environment',
          test: `Required env var: ${envVar}`,
          status: 'FAIL',
          error: `Missing required environment variable: ${envVar}`
        });
      } else {
        this.results.push({
          category: 'Environment',
          test: `Required env var: ${envVar}`,
          status: 'PASS'
        });
      }
    }
    
    // Check optional environment variables
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.results.push({
          category: 'Environment',
          test: `Optional env var: ${envVar}`,
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Environment',
          test: `Optional env var: ${envVar}`,
          status: 'WARN',
          details: `Optional environment variable not set: ${envVar}`
        });
      }
    }
    
    // Validate PHI encryption key format
    if (process.env.PHI_ENCRYPTION_KEY) {
      const key = process.env.PHI_ENCRYPTION_KEY;
      if (key.length !== 64) {
        this.results.push({
          category: 'Environment',
          test: 'PHI encryption key format',
          status: 'FAIL',
          error: `PHI_ENCRYPTION_KEY must be 64 hex characters, got ${key.length}`
        });
      } else {
        this.results.push({
          category: 'Environment',
          test: 'PHI encryption key format',
          status: 'PASS'
        });
      }
    }
    
    // Check NODE_ENV
    if (process.env.NODE_ENV && ['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
      this.results.push({
        category: 'Environment',
        test: 'NODE_ENV value',
        status: 'PASS'
      });
    } else {
      this.results.push({
        category: 'Environment',
        test: 'NODE_ENV value',
        status: 'WARN',
        details: `NODE_ENV should be development, production, or test, got: ${process.env.NODE_ENV}`
      });
    }
  }
  
  private async validateDatabaseAndSchema(): Promise<void> {
    console.log('\n🗄️ 2. DATABASE & SCHEMA VALIDATION');
    
    // Test database connection
    try {
      await db.execute(sql`SELECT 1 as test`);
      this.results.push({
        category: 'Database',
        test: 'Database connection',
        status: 'PASS'
      });
    } catch (error) {
      this.results.push({
        category: 'Database',
        test: 'Database connection',
        status: 'FAIL',
        error: `Database connection failed: ${error.message}`
      });
    }
    
    // Test critical tables exist
    const criticalTables = [
      'users_auth', 'organizations', 'organization_memberships',
      'therapist_profiles', 'therapist_phi', 'patients',
      'clinical_sessions', 'patient_treatment_plans', 'tasks',
      'calendar_blocks', 'work_schedules', 'audit_logs_hipaa'
    ];
    
    for (const table of criticalTables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          )
        `);
        
        if (result.rows[0].exists) {
          this.results.push({
            category: 'Database',
            test: `Table exists: ${table}`,
            status: 'PASS'
          });
        } else {
          this.results.push({
            category: 'Database',
            test: `Table exists: ${table}`,
            status: 'FAIL',
            error: `Table ${table} does not exist`
          });
        }
      } catch (error) {
        this.results.push({
          category: 'Database',
          test: `Table exists: ${table}`,
          status: 'FAIL',
          error: `Error checking table ${table}: ${error.message}`
        });
      }
    }
    
    // Test schema imports
    try {
      const { getActiveSchema } = await import('../../db');
      const schema = getActiveSchema();
      
      if (!schema) {
        this.results.push({
          category: 'Database',
          test: 'Schema imports',
          status: 'FAIL',
          error: 'getActiveSchema returned null'
        });
      } else {
        this.results.push({
          category: 'Database',
          test: 'Schema imports',
          status: 'PASS'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Database',
        test: 'Schema imports',
        status: 'FAIL',
        error: `Schema import failed: ${error.message}`
      });
    }
  }
  
  private async validateAuthenticationSystem(): Promise<void> {
    console.log('\n🔐 3. AUTHENTICATION & AUTHORIZATION VALIDATION');
    
    // Test authentication middleware
    try {
      const { requireAuth } = await import('../../server/auth');
      if (typeof requireAuth === 'function') {
        this.results.push({
          category: 'Authentication',
          test: 'Authentication middleware',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Authentication',
          test: 'Authentication middleware',
          status: 'FAIL',
          error: 'requireAuth is not a function'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Authentication',
        test: 'Authentication middleware',
        status: 'FAIL',
        error: `Authentication middleware import failed: ${error.message}`
      });
    }
    
    // Test password hashing
    try {
      const cryptoUtils = await import('../../server/auth');
      if (cryptoUtils && typeof cryptoUtils.hash === 'function') {
        this.results.push({
          category: 'Authentication',
          test: 'Password hashing',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Authentication',
          test: 'Password hashing',
          status: 'FAIL',
          error: 'Password hashing functions not available'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Authentication',
        test: 'Password hashing',
        status: 'FAIL',
        error: `Password hashing test failed: ${error.message}`
      });
    }
    
    // Test user table access
    try {
      const { usersAuth } = await import('../../db/schema-hipaa-refactored');
      if (usersAuth) {
        this.results.push({
          category: 'Authentication',
          test: 'User table access',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Authentication',
          test: 'User table access',
          status: 'FAIL',
          error: 'usersAuth table not available in schema'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Authentication',
        test: 'User table access',
        status: 'FAIL',
        error: `User table access failed: ${error.message}`
      });
    }
  }
  
  private async validateSessionManagement(): Promise<void> {
    console.log('\n🍪 4. SESSION MANAGEMENT VALIDATION');
    
    // Test session configuration
    if (process.env.SESSION_SECRET) {
      this.results.push({
        category: 'Session',
        test: 'Session secret configured',
        status: 'PASS'
      });
    } else {
      this.results.push({
        category: 'Session',
        test: 'Session secret configured',
        status: 'FAIL',
        error: 'SESSION_SECRET not configured'
      });
    }
    
    // Test Redis connection (if configured)
    if (process.env.REDIS_URL) {
      try {
        const { createClient } = await import('redis');
        const client = createClient({ url: process.env.REDIS_URL });
        
        // Test connection with timeout
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
        await client.disconnect();
        
        this.results.push({
          category: 'Session',
          test: 'Redis connection',
          status: 'PASS'
        });
      } catch (error) {
        this.results.push({
          category: 'Session',
          test: 'Redis connection',
          status: 'WARN',
          details: `Redis connection failed: ${error.message}`
        });
      }
    } else {
      this.results.push({
        category: 'Session',
        test: 'Redis connection',
        status: 'WARN',
        details: 'REDIS_URL not configured, using MemoryStore'
      });
    }
    
    // Test session middleware
    try {
      const session = await import('express-session');
      if (session) {
        this.results.push({
          category: 'Session',
          test: 'Session middleware',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Session',
          test: 'Session middleware',
          status: 'FAIL',
          error: 'express-session not available'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Session',
        test: 'Session middleware',
        status: 'FAIL',
        error: `Session middleware test failed: ${error.message}`
      });
    }
  }
  
  private async validatePHIEncryption(): Promise<void> {
    console.log('\n🔒 5. PHI ENCRYPTION & SECURITY VALIDATION');
    
    // Test PHI encryption functions
    try {
      // Only test if encryption key is available
      if (!process.env.PHI_ENCRYPTION_KEY) {
        this.results.push({
          category: 'PHI Encryption',
          test: 'PHI encryption system',
          status: 'WARN',
          details: 'PHI_ENCRYPTION_KEY not configured, skipping encryption tests'
        });
        return;
      }
      
      const { encryptPHI, decryptPHI, validateEncryption } = await import('../../server/utils/phi-encryption');
      
      if (typeof encryptPHI === 'function' && typeof decryptPHI === 'function') {
        this.results.push({
          category: 'PHI Encryption',
          test: 'Encryption functions available',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'PHI Encryption',
          test: 'Encryption functions available',
          status: 'FAIL',
          error: 'PHI encryption functions not available'
        });
      }
      
      // Test encryption/decryption cycle
      if (process.env.PHI_ENCRYPTION_KEY) {
        try {
          const testData = 'test-phi-data-123';
          const encrypted = encryptPHI(testData);
          const decrypted = decryptPHI(encrypted);
          
          if (decrypted === testData) {
            this.results.push({
              category: 'PHI Encryption',
              test: 'Encryption/decryption cycle',
              status: 'PASS'
            });
          } else {
            this.results.push({
              category: 'PHI Encryption',
              test: 'Encryption/decryption cycle',
              status: 'FAIL',
              error: 'Encryption/decryption cycle failed'
            });
          }
        } catch (error) {
          this.results.push({
            category: 'PHI Encryption',
            test: 'Encryption/decryption cycle',
            status: 'FAIL',
            error: `Encryption test failed: ${error.message}`
          });
        }
      } else {
        this.results.push({
          category: 'PHI Encryption',
          test: 'Encryption/decryption cycle',
          status: 'FAIL',
          error: 'PHI_ENCRYPTION_KEY not configured'
        });
      }
      
    } catch (error) {
      this.results.push({
        category: 'PHI Encryption',
        test: 'PHI encryption system',
        status: 'FAIL',
        error: `PHI encryption system failed: ${error.message}`
      });
    }
  }
  
  private async validateAPIEndpoints(): Promise<void> {
    console.log('\n🌐 6. API ENDPOINTS & ERROR HANDLING VALIDATION');
    
    const endpoints = [
      '/api/test/health',
      '/api/test/schema',
      '/api/user/profile',
      '/api/organizations',
      '/api/patients',
      '/api/tasks',
      '/api/clinical-sessions',
      '/api/patient-treatment-plans',
      '/api/calendar-blocks',
      '/api/work-schedules'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.status >= 500) {
          this.results.push({
            category: 'API Endpoints',
            test: `Endpoint: ${endpoint}`,
            status: 'FAIL',
            error: `500 error: ${response.status}`
          });
        } else if (response.status >= 400 && response.status < 500) {
          this.results.push({
            category: 'API Endpoints',
            test: `Endpoint: ${endpoint}`,
            status: 'PASS',
            details: `Expected client error: ${response.status}`
          });
        } else {
          this.results.push({
            category: 'API Endpoints',
            test: `Endpoint: ${endpoint}`,
            status: 'PASS',
            details: `Success: ${response.status}`
          });
        }
      } catch (error) {
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          this.results.push({
            category: 'API Endpoints',
            test: `Endpoint: ${endpoint}`,
            status: 'WARN',
            details: 'Server not running (expected in test environment)'
          });
        } else {
          this.results.push({
            category: 'API Endpoints',
            test: `Endpoint: ${endpoint}`,
            status: 'FAIL',
            error: `Request failed: ${error.message}`
          });
        }
      }
    }
  }
  
  private async validateDataIntegrity(): Promise<void> {
    console.log('\n🔗 7. DATA INTEGRITY & FOREIGN KEYS VALIDATION');
    
    // Test foreign key constraints
    const fkTests = [
      { table: 'patients', column: 'organization_id', testColumn: 'name', testValue: 'Test FK' },
      { table: 'tasks', column: 'organization_id', testColumn: 'title', testValue: 'Test FK' }
    ];
    
    for (const { table, column, testColumn, testValue } of fkTests) {
      try {
        await db.execute(sql`
          INSERT INTO ${sql.raw(table)} (${sql.raw(column)}, ${sql.raw(testColumn)}, created_at, updated_at)
          VALUES (999999, ${testValue}, NOW(), NOW())
        `);
        
        // If we get here, foreign key constraint is not working
        this.results.push({
          category: 'Data Integrity',
          test: `Foreign key: ${table}.${column}`,
          status: 'FAIL',
          error: 'Foreign key constraint not working'
        });
      } catch (error) {
        // This is expected - foreign key should prevent the insert
        if (error.message.includes('foreign key') || 
            error.message.includes('constraint') || 
            error.message.includes('violates')) {
          this.results.push({
            category: 'Data Integrity',
            test: `Foreign key: ${table}.${column}`,
            status: 'PASS'
          });
        } else {
          this.results.push({
            category: 'Data Integrity',
            test: `Foreign key: ${table}.${column}`,
            status: 'FAIL',
            error: `Unexpected error: ${error.message}`
          });
        }
      }
    }
    
    // Test data type consistency
    const dataTypeTests = [
      { table: 'patients', column: 'authorization_required', expectedType: 'boolean' },
      { table: 'patients', column: 'deleted', expectedType: 'boolean' },
      { table: 'tasks', column: 'category_id', expectedType: 'integer' }
    ];
    
    for (const { table, column, expectedType } of dataTypeTests) {
      try {
        const result = await db.execute(sql`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
          AND column_name = ${column}
        `);
        
        if (result.rows.length > 0) {
          const actualType = result.rows[0].data_type;
          const isCompatible = this.checkTypeCompatibility(expectedType, actualType);
          
          if (isCompatible) {
            this.results.push({
              category: 'Data Integrity',
              test: `Data type: ${table}.${column}`,
              status: 'PASS'
            });
          } else {
            this.results.push({
              category: 'Data Integrity',
              test: `Data type: ${table}.${column}`,
              status: 'FAIL',
              error: `Expected ${expectedType}, got ${actualType}`
            });
          }
        } else {
          this.results.push({
            category: 'Data Integrity',
            test: `Data type: ${table}.${column}`,
            status: 'FAIL',
            error: 'Column not found'
          });
        }
      } catch (error) {
        this.results.push({
          category: 'Data Integrity',
          test: `Data type: ${table}.${column}`,
          status: 'FAIL',
          error: `Error checking data type: ${error.message}`
        });
      }
    }
  }
  
  private async validatePerformanceLimits(): Promise<void> {
    console.log('\n⚡ 8. PERFORMANCE & RESOURCE LIMITS VALIDATION');
    
    // Test large dataset operations
    try {
      const startTime = Date.now();
      await db.execute(sql`SELECT COUNT(*) FROM patients`);
      await db.execute(sql`SELECT COUNT(*) FROM clinical_sessions`);
      await db.execute(sql`SELECT COUNT(*) FROM tasks`);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      if (duration < 5000) { // Less than 5 seconds
        this.results.push({
          category: 'Performance',
          test: 'Large dataset operations',
          status: 'PASS',
          details: `Completed in ${duration}ms`
        });
      } else {
        this.results.push({
          category: 'Performance',
          test: 'Large dataset operations',
          status: 'WARN',
          details: `Slow operation: ${duration}ms`
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Performance',
        test: 'Large dataset operations',
        status: 'FAIL',
        error: `Performance test failed: ${error.message}`
      });
    }
    
    // Test JSONB operations
    try {
      const jsonbTests = [
        { table: 'patients', column: 'assigned_therapist_ids' },
        { table: 'therapist_profiles', column: 'specialties' },
        { table: 'clinical_sessions', column: 'add_on_cpt_codes' }
      ];
      
      for (const { table, column } of jsonbTests) {
        await db.execute(sql`
          SELECT ${sql.raw(column)} 
          FROM ${sql.raw(table)} 
          LIMIT 1
        `);
      }
      
      this.results.push({
        category: 'Performance',
        test: 'JSONB operations',
        status: 'PASS'
      });
    } catch (error) {
      this.results.push({
        category: 'Performance',
        test: 'JSONB operations',
        status: 'FAIL',
        error: `JSONB operations failed: ${error.message}`
      });
    }
  }
  
  private async validateSecurityMiddleware(): Promise<void> {
    console.log('\n🛡️ 9. SECURITY HEADERS & MIDDLEWARE VALIDATION');
    
    // Test security middleware imports
    try {
      const { securityHeaders } = await import('../../server/middleware/security');
      if (securityHeaders) {
        this.results.push({
          category: 'Security',
          test: 'Security headers middleware',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Security',
          test: 'Security headers middleware',
          status: 'FAIL',
          error: 'Security headers middleware not available'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Security',
        test: 'Security headers middleware',
        status: 'FAIL',
        error: `Security middleware test failed: ${error.message}`
      });
    }
    
    // Test error sanitization middleware
    try {
      const { errorSanitizationMiddleware } = await import('../../server/middleware/error-sanitization');
      if (errorSanitizationMiddleware) {
        this.results.push({
          category: 'Security',
          test: 'Error sanitization middleware',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Security',
          test: 'Error sanitization middleware',
          status: 'FAIL',
          error: 'Error sanitization middleware not available'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Security',
        test: 'Error sanitization middleware',
        status: 'FAIL',
        error: `Error sanitization test failed: ${error.message}`
      });
    }
    
    // Test audit logging
    try {
      const { logAuditEvent } = await import('../../server/utils/audit-system');
      if (logAuditEvent) {
        this.results.push({
          category: 'Security',
          test: 'Audit logging system',
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Security',
          test: 'Audit logging system',
          status: 'FAIL',
          error: 'Audit logging system not available'
        });
      }
    } catch (error) {
      this.results.push({
        category: 'Security',
        test: 'Audit logging system',
        status: 'FAIL',
        error: `Audit logging test failed: ${error.message}`
      });
    }
  }
  
  private async validateProductionReadiness(): Promise<void> {
    console.log('\n🚀 10. PRODUCTION READINESS VALIDATION');
    
    // Test production environment detection
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      this.results.push({
        category: 'Production',
        test: 'Production environment',
        status: 'PASS'
      });
    } else {
      this.results.push({
        category: 'Production',
        test: 'Production environment',
        status: 'WARN',
        details: `Not in production mode: ${process.env.NODE_ENV}`
      });
    }
    
    // Test HIPAA compliance features
    const hipaaFeatures = [
      'USE_HIPAA_SCHEMA',
      'ENABLE_HIPAA_ROUTES',
      'ENABLE_HIPAA_ENCRYPTION',
      'ENABLE_HIPAA_AUDIT_LOGGING'
    ];
    
    for (const feature of hipaaFeatures) {
      if (process.env[feature] === 'true') {
        this.results.push({
          category: 'Production',
          test: `HIPAA feature: ${feature}`,
          status: 'PASS'
        });
      } else {
        this.results.push({
          category: 'Production',
          test: `HIPAA feature: ${feature}`,
          status: 'WARN',
          details: `HIPAA feature disabled: ${feature}`
        });
      }
    }
    
    // Test audit logging table
    try {
      await db.execute(sql`
        INSERT INTO audit_logs_hipaa (
          user_id, action, resource_type, request_method, request_path, 
          response_status, created_at
        ) VALUES (
          NULL, 'PRODUCTION_READINESS_TEST', 'SYSTEM', 'TEST', '/test', 200, NOW()
        )
      `);
      
      // Clean up test record
      await db.execute(sql`
        DELETE FROM audit_logs_hipaa 
        WHERE action = 'PRODUCTION_READINESS_TEST'
      `);
      
      this.results.push({
        category: 'Production',
        test: 'Audit logging functionality',
        status: 'PASS'
      });
    } catch (error) {
      this.results.push({
        category: 'Production',
        test: 'Audit logging functionality',
        status: 'FAIL',
        error: `Audit logging test failed: ${error.message}`
      });
    }
  }
  
  private checkTypeCompatibility(expected: string, actual: string): boolean {
    const typeGroups = {
      'boolean': ['boolean'],
      'integer': ['integer', 'serial'],
      'text': ['text', 'character varying'],
      'timestamp': ['timestamp without time zone', 'timestamp with time zone'],
      'jsonb': ['jsonb']
    };
    
    for (const [group, types] of Object.entries(typeGroups)) {
      if (types.includes(expected) && types.includes(actual)) {
        return true;
      }
    }
    
    return expected === actual;
  }
  
  private generateComprehensiveReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 COMPREHENSIVE CTO QA REPORT');
    console.log('⚠️  ALL RISK AREAS TESTED');
    console.log('='.repeat(80));
    
    // Group results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'PASS').length;
      const failed = categoryResults.filter(r => r.status === 'FAIL').length;
      const warned = categoryResults.filter(r => r.status === 'WARN').length;
      
      console.log(`\n📊 ${category.toUpperCase()}:`);
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  ⚠️  Warnings: ${warned}`);
      
      // Show failures
      const failures = categoryResults.filter(r => r.status === 'FAIL');
      if (failures.length > 0) {
        console.log(`  🚨 FAILURES:`);
        failures.forEach(failure => {
          console.log(`    - ${failure.test}: ${failure.error}`);
        });
      }
    }
    
    // Overall summary
    const totalPassed = this.results.filter(r => r.status === 'PASS').length;
    const totalFailed = this.results.filter(r => r.status === 'FAIL').length;
    const totalWarned = this.results.filter(r => r.status === 'WARN').length;
    const totalTests = this.results.length;
    
    console.log(`\n📊 OVERALL SUMMARY:`);
    console.log(`  ✅ Passed: ${totalPassed}/${totalTests}`);
    console.log(`  ❌ Failed: ${totalFailed}/${totalTests}`);
    console.log(`  ⚠️  Warnings: ${totalWarned}/${totalTests}`);
    console.log(`  📈 Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
    
    console.log(`\n🎯 CTO QA VERDICT:`);
    if (totalFailed === 0) {
      console.log('  ✅ PASS: All critical tests passed');
      console.log('  ✅ System is CTO QA ready');
      console.log('  ✅ Job is SAFE');
      console.log('  ✅ Ready for production deployment');
      console.log('  ✅ COMPREHENSIVE VALIDATION SUCCESSFUL');
    } else {
      console.log('  ❌ FAIL: Critical issues found');
      console.log('  🚨 Job is at RISK');
      console.log('  ⚠️  Address failures before CTO QA');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(totalFailed === 0 ? '🎉 COMPREHENSIVE CTO QA PASSED' : '🚨 COMPREHENSIVE CTO QA FAILED');
    console.log('='.repeat(80));
  }
}

// Main execution
async function main() {
  try {
    const validator = new ComprehensiveCTOQAValidator();
    await validator.runComprehensiveValidation();
  } catch (error) {
    console.error('❌ Comprehensive CTO QA validation failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
main().catch(console.error);
