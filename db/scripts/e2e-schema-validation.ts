#!/usr/bin/env node

/**
 * Comprehensive E2E Schema Validation Tests
 * 
 * Tests all critical workflows to ensure schema alignment is working
 * and no 500 errors occur due to missing tables or columns.
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

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  error?: string;
  duration: number;
}

class SchemaE2ETester {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive E2E Schema Validation Tests...\n');
    
    const tests = [
      { name: 'Database Connection', fn: this.testDatabaseConnection },
      { name: 'Schema Tables Exist', fn: this.testSchemaTablesExist },
      { name: 'User Registration Flow', fn: this.testUserRegistrationFlow },
      { name: 'Organization Creation', fn: this.testOrganizationCreation },
      { name: 'Patient Creation', fn: this.testPatientCreation },
      { name: 'Task Creation', fn: this.testTaskCreation },
      { name: 'Clinical Session Creation', fn: this.testClinicalSessionCreation },
      { name: 'Treatment Plan Creation', fn: this.testTreatmentPlanCreation },
      { name: 'Calendar Block Creation', fn: this.testCalendarBlockCreation },
      { name: 'Work Schedule Creation', fn: this.testWorkScheduleCreation },
      { name: 'Therapist Profile Creation', fn: this.testTherapistProfileCreation },
      { name: 'Therapist PHI Creation', fn: this.testTherapistPHICreation },
      { name: 'Audit Logging', fn: this.testAuditLogging },
    ];
    
    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }
    
    this.generateReport();
  }
  
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`🔍 Running: ${name}`);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ test: name, status: 'PASS', duration });
      console.log(`  ✅ PASS (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({ 
        test: name, 
        status: 'FAIL', 
        error: error.message, 
        duration 
      });
      console.log(`  ❌ FAIL (${duration}ms): ${error.message}\n`);
    }
  }
  
  private async testDatabaseConnection(): Promise<void> {
    await db.execute(sql`SELECT 1 as test`);
  }
  
  private async testSchemaTablesExist(): Promise<void> {
    const requiredTables = [
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
    
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = result.rows.map((row: any) => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }
  }
  
  private async testUserRegistrationFlow(): Promise<void> {
    // Test creating a user (simulate registration)
    const testUser = {
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'hashed_password',
      account_status: 'active'
    };
    
    const result = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES (${testUser.username}, ${testUser.email}, ${testUser.password}, ${testUser.account_status}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test user');
    }
    
    const userId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
  }
  
  private async testOrganizationCreation(): Promise<void> {
    const testOrg = {
      name: `Test Org ${Date.now()}`,
      type: 'solo',
      is_active: true
    };
    
    const result = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES (${testOrg.name}, ${testOrg.type}, ${testOrg.is_active}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test organization');
    }
    
    const orgId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testPatientCreation(): Promise<void> {
    // First create a test organization
    const orgResult = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES ('Test Org for Patient', 'solo', true, NOW(), NOW())
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;
    
    // Create a test user
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_therapist', 'therapist@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test patient creation with all required fields
    const testPatient = {
      organization_id: orgId,
      primary_therapist_id: userId,
      name: `Test Patient ${Date.now()}`,
      status: 'active',
      type: 'individual'
    };
    
    const result = await db.execute(sql`
      INSERT INTO patients (organization_id, primary_therapist_id, name, status, type, created_at, updated_at)
      VALUES (${testPatient.organization_id}, ${testPatient.primary_therapist_id}, ${testPatient.name}, ${testPatient.status}, ${testPatient.type}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test patient');
    }
    
    const patientId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM patients WHERE id = ${patientId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testTaskCreation(): Promise<void> {
    // Create test data
    const orgResult = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES ('Test Org for Task', 'solo', true, NOW(), NOW())
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;
    
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_user_task', 'user@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test task creation
    const testTask = {
      organization_id: orgId,
      created_by_user_id: userId,
      assigned_to_user_id: userId,
      title: `Test Task ${Date.now()}`,
      description: 'Test task description',
      status: 'pending',
      priority: 'medium'
    };
    
    const result = await db.execute(sql`
      INSERT INTO tasks (organization_id, created_by_user_id, assigned_to_user_id, title, description, status, priority, created_at, updated_at)
      VALUES (${testTask.organization_id}, ${testTask.created_by_user_id}, ${testTask.assigned_to_user_id}, ${testTask.title}, ${testTask.description}, ${testTask.status}, ${testTask.priority}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test task');
    }
    
    const taskId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM tasks WHERE id = ${taskId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testClinicalSessionCreation(): Promise<void> {
    // Create test data
    const orgResult = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES ('Test Org for Session', 'solo', true, NOW(), NOW())
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;
    
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_therapist_session', 'therapist@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    const patientResult = await db.execute(sql`
      INSERT INTO patients (organization_id, primary_therapist_id, name, status, type, created_at, updated_at)
      VALUES (${orgId}, ${userId}, 'Test Patient for Session', 'active', 'individual', NOW(), NOW())
      RETURNING id
    `);
    const patientId = patientResult.rows[0].id;
    
    // Test clinical session creation
    const testSession = {
      organization_id: orgId,
      patient_id: patientId,
      therapist_id: userId,
      date: new Date(),
      duration: 50,
      type: 'individual',
      status: 'scheduled'
    };
    
    const result = await db.execute(sql`
      INSERT INTO clinical_sessions (organization_id, patient_id, therapist_id, date, duration, type, status, created_at, updated_at)
      VALUES (${testSession.organization_id}, ${testSession.patient_id}, ${testSession.therapist_id}, ${testSession.date}, ${testSession.duration}, ${testSession.type}, ${testSession.status}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test clinical session');
    }
    
    const sessionId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM clinical_sessions WHERE id = ${sessionId}`);
    await db.execute(sql`DELETE FROM patients WHERE id = ${patientId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testTreatmentPlanCreation(): Promise<void> {
    // Create test data
    const orgResult = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES ('Test Org for Treatment Plan', 'solo', true, NOW(), NOW())
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;
    
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_therapist_tp', 'therapist@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    const patientResult = await db.execute(sql`
      INSERT INTO patients (organization_id, primary_therapist_id, name, status, type, created_at, updated_at)
      VALUES (${orgId}, ${userId}, 'Test Patient for Treatment Plan', 'active', 'individual', NOW(), NOW())
      RETURNING id
    `);
    const patientId = patientResult.rows[0].id;
    
    // Test treatment plan creation
    const testPlan = {
      organization_id: orgId,
      patient_id: patientId,
      therapist_id: userId,
      version: 1,
      status: 'active'
    };
    
    const result = await db.execute(sql`
      INSERT INTO patient_treatment_plans (organization_id, patient_id, therapist_id, version, status, created_at, updated_at)
      VALUES (${testPlan.organization_id}, ${testPlan.patient_id}, ${testPlan.therapist_id}, ${testPlan.version}, ${testPlan.status}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test treatment plan');
    }
    
    const planId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM patient_treatment_plans WHERE id = ${planId}`);
    await db.execute(sql`DELETE FROM patients WHERE id = ${patientId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testCalendarBlockCreation(): Promise<void> {
    // Create test data
    const orgResult = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES ('Test Org for Calendar', 'solo', true, NOW(), NOW())
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;
    
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_user_calendar_${Date.now()}', 'calendar@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test calendar block creation
    const testBlock = {
      user_id: userId,
      organization_id: orgId,
      start_date: new Date(),
      end_date: new Date(Date.now() + 3600000), // 1 hour later
      block_type: 'personal', // Valid values: 'vacation', 'sick', 'admin', 'personal', 'other'
      reason: 'Test block'
    };
    
    const result = await db.execute(sql`
      INSERT INTO calendar_blocks (user_id, organization_id, start_date, end_date, block_type, reason, created_at, updated_at)
      VALUES (${testBlock.user_id}, ${testBlock.organization_id}, ${testBlock.start_date}, ${testBlock.end_date}, ${testBlock.block_type}, ${testBlock.reason}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test calendar block');
    }
    
    const blockId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM calendar_blocks WHERE id = ${blockId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testWorkScheduleCreation(): Promise<void> {
    // Create test data
    const orgResult = await db.execute(sql`
      INSERT INTO organizations (name, type, is_active, created_at, updated_at)
      VALUES ('Test Org for Work Schedule', 'solo', true, NOW(), NOW())
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;
    
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_user_schedule', 'user@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test work schedule creation
    const testSchedule = {
      user_id: userId,
      organization_id: orgId,
      day_of_week: 1, // Monday
      start_time: '09:00',
      end_time: '17:00',
      is_active: true
    };
    
    const result = await db.execute(sql`
      INSERT INTO work_schedules (user_id, organization_id, day_of_week, start_time, end_time, is_active, created_at, updated_at)
      VALUES (${testSchedule.user_id}, ${testSchedule.organization_id}, ${testSchedule.day_of_week}, ${testSchedule.start_time}, ${testSchedule.end_time}, ${testSchedule.is_active}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test work schedule');
    }
    
    const scheduleId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM work_schedules WHERE id = ${scheduleId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  
  private async testTherapistProfileCreation(): Promise<void> {
    // Create test user
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_therapist_profile', 'therapist@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test therapist profile creation
    const testProfile = {
      user_id: userId,
      name: 'Test Therapist',
      professional_title: 'Licensed Clinical Social Worker',
      license_number: 'LCSW12345',
      license_state: 'CA'
    };
    
    const result = await db.execute(sql`
      INSERT INTO therapist_profiles (user_id, name, professional_title, license_number, license_state, created_at, updated_at)
      VALUES (${testProfile.user_id}, ${testProfile.name}, ${testProfile.professional_title}, ${testProfile.license_number}, ${testProfile.license_state}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test therapist profile');
    }
    
    const profileId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM therapist_profiles WHERE id = ${profileId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
  }
  
  private async testTherapistPHICreation(): Promise<void> {
    // Create test user
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_therapist_phi', 'therapist@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test therapist PHI creation
    const testPHI = {
      user_id: userId,
      therapist_ssn_encrypted: 'encrypted_ssn',
      therapist_dob_encrypted: 'encrypted_dob'
    };
    
    const result = await db.execute(sql`
      INSERT INTO therapist_phi (user_id, therapist_ssn_encrypted, therapist_dob_encrypted, created_at, updated_at)
      VALUES (${testPHI.user_id}, ${testPHI.therapist_ssn_encrypted}, ${testPHI.therapist_dob_encrypted}, NOW(), NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test therapist PHI');
    }
    
    const phiId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM therapist_phi WHERE id = ${phiId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
  }
  
  private async testAuditLogging(): Promise<void> {
    // Create a test user first
    const userResult = await db.execute(sql`
      INSERT INTO users_auth (username, email, password, account_status, created_at, updated_at)
      VALUES ('test_user_audit_${Date.now()}', 'audit@test.com', 'hashed', 'active', NOW(), NOW())
      RETURNING id
    `);
    const userId = userResult.rows[0].id;
    
    // Test audit log creation
    const testLog = {
      user_id: userId,
      action: 'TEST_ACTION',
      resource_type: 'TEST_RESOURCE',
      resource_id: 1,
      request_method: 'POST',
      request_path: '/test',
      response_status: 200
    };
    
    const result = await db.execute(sql`
      INSERT INTO audit_logs_hipaa (user_id, action, resource_type, resource_id, request_method, request_path, response_status, created_at)
      VALUES (${testLog.user_id}, ${testLog.action}, ${testLog.resource_type}, ${testLog.resource_id}, ${testLog.request_method}, ${testLog.request_path}, ${testLog.response_status}, NOW())
      RETURNING id
    `);
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create test audit log');
    }
    
    const logId = result.rows[0].id;
    
    // Clean up
    await db.execute(sql`DELETE FROM audit_logs_hipaa WHERE id = ${logId}`);
    await db.execute(sql`DELETE FROM users_auth WHERE id = ${userId}`);
  }
  
  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 E2E SCHEMA VALIDATION TEST REPORT');
    console.log('='.repeat(80));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      console.log('-'.repeat(50));
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  ${result.test}: ${result.error}`);
        });
    }
    
    if (passed > 0) {
      console.log(`\n✅ PASSED TESTS:`);
      console.log('-'.repeat(50));
      this.results
        .filter(r => r.status === 'PASS')
        .forEach(result => {
          console.log(`  ${result.test} (${result.duration}ms)`);
        });
    }
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    console.log(`\n⏱️  Average test duration: ${Math.round(avgDuration)}ms`);
    
    console.log('\n' + '='.repeat(80));
    console.log(failed === 0 ? '🎉 All tests passed! Schema is fully aligned.' : '⚠️  Some tests failed. Check schema alignment.');
    console.log('='.repeat(80));
  }
}

// Main execution
async function main() {
  try {
    const tester = new SchemaE2ETester();
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ E2E testing failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
main().catch(console.error);
