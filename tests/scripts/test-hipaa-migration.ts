#!/usr/bin/env node

/**
 * Comprehensive HIPAA Migration Test Suite
 * 
 * This script validates the complete HIPAA schema migration process:
 * 1. Tests data migration integrity
 * 2. Tests encryption/decryption functionality
 * 3. Tests application layer compatibility
 * 4. Tests performance benchmarks
 * 5. Generates compliance reports
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { db, getSchemaInfo } from '../index';
import { sql } from 'drizzle-orm';
import { PHIEncryptionService, TherapistService, ClientService, SessionService } from '../../server/services/HIPAAService';
import { ProfileService } from '../../server/services/ProfileService';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passed: number;
  failed: number;
  skipped: number;
}

class MigrationTestSuite {
  private results: TestSuite[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive HIPAA Migration Test Suite...');
    console.log('');

    // Test 1: Schema Migration Tests
    await this.runSchemaMigrationTests();

    // Test 2: Encryption Tests
    await this.runEncryptionTests();

    // Test 3: Application Layer Tests
    await this.runApplicationLayerTests();

    // Test 4: Performance Tests
    await this.runPerformanceTests();

    // Test 5: Compliance Tests
    await this.runComplianceTests();

    // Generate final report
    this.generateReport();
  }

  private async runSchemaMigrationTests(): Promise<void> {
    console.log('📋 Running Schema Migration Tests...');
    const suite = this.createTestSuite('Schema Migration Tests');
    this.startTime = Date.now();

    // Test 1: Table Creation
    await this.runTest('Table Creation', async () => {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users_auth', 'therapist_profiles', 'therapist_phi', 'clients_hipaa', 'sessions_hipaa', 'treatment_plans_hipaa', 'audit_logs_hipaa')
        ORDER BY table_name
      `);

      const expectedTables = ['audit_logs_hipaa', 'clients_hipaa', 'sessions_hipaa', 'therapist_phi', 'therapist_profiles', 'treatment_plans_hipaa', 'users_auth'];
      const actualTables = tables.map((row: any) => row.table_name).sort();

      if (JSON.stringify(actualTables) === JSON.stringify(expectedTables)) {
        return { status: 'PASS', message: 'All HIPAA tables created successfully', details: { tables: actualTables } };
      } else {
        return { status: 'FAIL', message: 'Missing or extra tables', details: { expected: expectedTables, actual: actualTables } };
      }
    }, suite);

    // Test 2: Data Migration Integrity
    await this.runTest('Data Migration Integrity', async () => {
      const counts = await db.execute(sql`
        SELECT 'users_auth' as table_name, COUNT(*) as count FROM users_auth
        UNION ALL
        SELECT 'therapist_profiles' as table_name, COUNT(*) as count FROM therapist_profiles
        UNION ALL
        SELECT 'therapist_phi' as table_name, COUNT(*) as count FROM therapist_phi
        UNION ALL
        SELECT 'clients_hipaa' as table_name, COUNT(*) as count FROM clients_hipaa
        UNION ALL
        SELECT 'sessions_hipaa' as table_name, COUNT(*) as count FROM sessions_hipaa
        UNION ALL
        SELECT 'treatment_plans_hipaa' as table_name, COUNT(*) as count FROM treatment_plans_hipaa
      `);

      const hasData = counts.every((row: any) => row.count > 0);
      if (hasData) {
        return { status: 'PASS', message: 'All tables have migrated data', details: { counts } };
      } else {
        return { status: 'FAIL', message: 'Some tables are empty', details: { counts } };
      }
    }, suite);

    // Test 3: Foreign Key Relationships
    await this.runTest('Foreign Key Relationships', async () => {
      const fkChecks = await db.execute(sql`
        SELECT 
          COUNT(*) as total_clients,
          COUNT(CASE WHEN c.therapist_id = ua.id THEN 1 END) as valid_therapist_refs
        FROM clients_hipaa c
        LEFT JOIN users_auth ua ON c.therapist_id = ua.id
      `);

      const validRefs = fkChecks[0]?.valid_therapist_refs || 0;
      const totalClients = fkChecks[0]?.total_clients || 0;

      if (validRefs === totalClients && totalClients > 0) {
        return { status: 'PASS', message: 'All foreign key relationships valid', details: { validRefs, totalClients } };
      } else {
        return { status: 'FAIL', message: 'Invalid foreign key relationships', details: { validRefs, totalClients } };
      }
    }, suite);

    this.finishTestSuite(suite);
  }

  private async runEncryptionTests(): Promise<void> {
    console.log('🔐 Running Encryption Tests...');
    const suite = this.createTestSuite('Encryption Tests');
    this.startTime = Date.now();

    // Test 1: PHI Encryption Service
    await this.runTest('PHI Encryption Service', async () => {
      const testData = 'Test SSN: 123-45-6789';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      const decrypted = PHIEncryptionService.decryptPHI(encrypted);

      if (encrypted && encrypted.startsWith('v2:') && decrypted === testData) {
        return { status: 'PASS', message: 'PHI encryption/decryption working', details: { encrypted: encrypted.substring(0, 20) + '...' } };
      } else {
        return { status: 'FAIL', message: 'PHI encryption/decryption failed', details: { encrypted, decrypted } };
      }
    }, suite);

    // Test 2: Search Hash Generation
    await this.runTest('Search Hash Generation', async () => {
      const testEmail = 'test@example.com';
      const hash1 = PHIEncryptionService.createSearchHash(testEmail);
      const hash2 = PHIEncryptionService.createSearchHash(testEmail.toUpperCase());
      const hash3 = PHIEncryptionService.createSearchHash(' test@example.com ');

      if (hash1 && hash1 === hash2 && hash1 === hash3) {
        return { status: 'PASS', message: 'Search hash generation working', details: { hash: hash1.substring(0, 20) + '...' } };
      } else {
        return { status: 'FAIL', message: 'Search hash generation failed', details: { hash1, hash2, hash3 } };
      }
    }, suite);

    // Test 3: Database Encryption Status
    await this.runTest('Database Encryption Status', async () => {
      const encryptionChecks = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN ssn_encrypted LIKE 'v2:%' THEN 1 END) as encrypted_ssn,
          COUNT(CASE WHEN ssn_encrypted IS NOT NULL THEN 1 END) as total_ssn
        FROM therapist_phi
        UNION ALL
        SELECT 
          COUNT(CASE WHEN email_encrypted LIKE 'v2:%' THEN 1 END) as encrypted_email,
          COUNT(CASE WHEN email_encrypted IS NOT NULL THEN 1 END) as total_email
        FROM clients_hipaa
      `);

      const allEncrypted = encryptionChecks.every((row: any) => 
        (row.encrypted_ssn || row.encrypted_email) === (row.total_ssn || row.total_email)
      );

      if (allEncrypted) {
        return { status: 'PASS', message: 'All PHI data properly encrypted', details: { encryptionChecks } };
      } else {
        return { status: 'FAIL', message: 'Some PHI data not encrypted', details: { encryptionChecks } };
      }
    }, suite);

    this.finishTestSuite(suite);
  }

  private async runApplicationLayerTests(): Promise<void> {
    console.log('🔧 Running Application Layer Tests...');
    const suite = this.createTestSuite('Application Layer Tests');
    this.startTime = Date.now();

    // Test 1: Therapist Service
    await this.runTest('Therapist Service', async () => {
      try {
        const therapists = await db.execute(sql`SELECT id FROM users_auth LIMIT 1`);
        if (therapists.length === 0) {
          return { status: 'SKIP', message: 'No therapists found for testing' };
        }

        const therapistId = therapists[0].id;
        const profile = await TherapistService.getProfile(therapistId);

        if (profile && profile.auth && profile.auth.id === therapistId) {
          return { status: 'PASS', message: 'Therapist service working', details: { therapistId } };
        } else {
          return { status: 'FAIL', message: 'Therapist service failed', details: { profile } };
        }
      } catch (error) {
        return { status: 'FAIL', message: 'Therapist service error', details: { error: error.message } };
      }
    }, suite);

    // Test 2: Client Service
    await this.runTest('Client Service', async () => {
      try {
        const therapists = await db.execute(sql`SELECT id FROM users_auth LIMIT 1`);
        if (therapists.length === 0) {
          return { status: 'SKIP', message: 'No therapists found for testing' };
        }

        const therapistId = therapists[0].id;
        const clients = await ClientService.getClients(therapistId);

        if (Array.isArray(clients)) {
          return { status: 'PASS', message: 'Client service working', details: { clientCount: clients.length } };
        } else {
          return { status: 'FAIL', message: 'Client service failed', details: { clients } };
        }
      } catch (error) {
        return { status: 'FAIL', message: 'Client service error', details: { error: error.message } };
      }
    }, suite);

    // Test 3: Profile Service
    await this.runTest('Profile Service', async () => {
      try {
        const therapists = await db.execute(sql`SELECT id FROM users_auth LIMIT 1`);
        if (therapists.length === 0) {
          return { status: 'SKIP', message: 'No therapists found for testing' };
        }

        const therapistId = therapists[0].id;
        const profile = await ProfileService.getProfile(therapistId);

        if (profile) {
          return { status: 'PASS', message: 'Profile service working', details: { therapistId } };
        } else {
          return { status: 'FAIL', message: 'Profile service failed', details: { profile } };
        }
      } catch (error) {
        return { status: 'FAIL', message: 'Profile service error', details: { error: error.message } };
      }
    }, suite);

    this.finishTestSuite(suite);
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...');
    const suite = this.createTestSuite('Performance Tests');
    this.startTime = Date.now();

    // Test 1: Query Performance
    await this.runTest('Query Performance', async () => {
      const startTime = Date.now();
      
      // Test complex query performance
      await db.execute(sql`
        SELECT 
          ua.id, ua.username, tp.name, tp.title,
          COUNT(c.id) as client_count,
          COUNT(s.id) as session_count
        FROM users_auth ua
        LEFT JOIN therapist_profiles tp ON ua.id = tp.user_id
        LEFT JOIN clients_hipaa c ON ua.id = c.therapist_id
        LEFT JOIN sessions_hipaa s ON ua.id = s.therapist_id
        GROUP BY ua.id, ua.username, tp.name, tp.title
        LIMIT 10
      `);
      
      const duration = Date.now() - startTime;
      
      if (duration < 1000) {
        return { status: 'PASS', message: 'Query performance acceptable', details: { duration: `${duration}ms` } };
      } else {
        return { status: 'FAIL', message: 'Query performance too slow', details: { duration: `${duration}ms` } };
      }
    }, suite);

    // Test 2: Encryption Performance
    await this.runTest('Encryption Performance', async () => {
      const testData = 'This is a test of encryption performance with a longer string to simulate real PHI data.';
      const iterations = 100;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const encrypted = PHIEncryptionService.encryptPHI(testData);
        const decrypted = PHIEncryptionService.decryptPHI(encrypted);
        if (decrypted !== testData) {
          return { status: 'FAIL', message: 'Encryption consistency failed', details: { iteration: i } };
        }
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;
      
      if (avgTime < 10) {
        return { status: 'PASS', message: 'Encryption performance acceptable', details: { avgTime: `${avgTime.toFixed(2)}ms per operation` } };
      } else {
        return { status: 'FAIL', message: 'Encryption performance too slow', details: { avgTime: `${avgTime.toFixed(2)}ms per operation` } };
      }
    }, suite);

    this.finishTestSuite(suite);
  }

  private async runComplianceTests(): Promise<void> {
    console.log('📋 Running Compliance Tests...');
    const suite = this.createTestSuite('Compliance Tests');
    this.startTime = Date.now();

    // Test 1: HIPAA Schema Compliance
    await this.runTest('HIPAA Schema Compliance', async () => {
      const schemaInfo = getSchemaInfo();
      
      if (schemaInfo.isHIPAASchema && schemaInfo.features.encryption && schemaInfo.features.auditLogging) {
        return { status: 'PASS', message: 'HIPAA schema compliance verified', details: schemaInfo };
      } else {
        return { status: 'FAIL', message: 'HIPAA schema compliance failed', details: schemaInfo };
      }
    }, suite);

    // Test 2: Audit Logging
    await this.runTest('Audit Logging', async () => {
      const auditLogs = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM audit_logs_hipaa 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      const recentLogs = auditLogs[0]?.count || 0;
      
      if (recentLogs > 0) {
        return { status: 'PASS', message: 'Audit logging active', details: { recentLogs } };
      } else {
        return { status: 'FAIL', message: 'No recent audit logs found', details: { recentLogs } };
      }
    }, suite);

    // Test 3: Data Retention
    await this.runTest('Data Retention', async () => {
      const retentionChecks = await db.execute(sql`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN data_retention_date > NOW() THEN 1 END) as compliant_logs
        FROM audit_logs_hipaa
      `);

      const totalLogs = retentionChecks[0]?.total_logs || 0;
      const compliantLogs = retentionChecks[0]?.compliant_logs || 0;
      
      if (totalLogs === 0 || compliantLogs === totalLogs) {
        return { status: 'PASS', message: 'Data retention compliance verified', details: { totalLogs, compliantLogs } };
      } else {
        return { status: 'FAIL', message: 'Data retention compliance failed', details: { totalLogs, compliantLogs } };
      }
    }, suite);

    this.finishTestSuite(suite);
  }

  private createTestSuite(name: string): TestSuite {
    return {
      name,
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  private async runTest(testName: string, testFn: () => Promise<any>, suite: TestSuite): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        testName,
        status: result.status,
        message: result.message,
        duration,
        details: result.details
      };
      
      suite.tests.push(testResult);
      
      if (result.status === 'PASS') {
        suite.passed++;
        console.log(`  ✅ ${testName}: ${result.message}`);
      } else if (result.status === 'FAIL') {
        suite.failed++;
        console.log(`  ❌ ${testName}: ${result.message}`);
      } else {
        suite.skipped++;
        console.log(`  ⏭️  ${testName}: ${result.message}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        testName,
        status: 'FAIL',
        message: `Test error: ${error.message}`,
        duration,
        details: { error: error.message }
      };
      
      suite.tests.push(testResult);
      suite.failed++;
      console.log(`  ❌ ${testName}: Test error: ${error.message}`);
    }
  }

  private finishTestSuite(suite: TestSuite): void {
    suite.totalDuration = Date.now() - this.startTime;
    this.results.push(suite);
    
    console.log(`  📊 ${suite.name}: ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped (${suite.totalDuration}ms)`);
    console.log('');
  }

  private generateReport(): void {
    console.log('📊 Generating Test Report...');
    console.log('');

    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0);
    const totalSkipped = this.results.reduce((sum, suite) => sum + suite.skipped, 0);
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.totalDuration, 0);

    console.log('🎯 Test Summary:');
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Skipped: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log('');

    // Detailed results
    this.results.forEach(suite => {
      console.log(`📋 ${suite.name}:`);
      suite.tests.forEach(test => {
        const status = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`  ${status} ${test.testName}: ${test.message} (${test.duration}ms)`);
        if (test.details && test.status === 'FAIL') {
          console.log(`    Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      });
      console.log('');
    });

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        duration: totalDuration,
        successRate: (totalPassed / totalTests) * 100
      },
      suites: this.results
    };

    const reportPath = join(__dirname, 'migration-test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);

    // Final status
    if (totalFailed === 0) {
      console.log('🎉 All tests passed! Migration is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before production deployment.');
    }
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new MigrationTestSuite();
  testSuite.runAllTests().catch(console.error);
}

export { MigrationTestSuite };

