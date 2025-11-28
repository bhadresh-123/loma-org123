#!/usr/bin/env tsx

/**
 * Simple test script to verify PHI audit logging is working
 */

import { logPHIAccessToDatabase } from './server/utils/unified-audit-service.js';
import { AuditAction, ResourceType } from './server/utils/audit-system.js';

async function testAuditLogging() {
  console.log('🧪 Testing PHI Audit Logging...\n');
  
  try {
    // Test 1: Log a PHI access event
    console.log('Test 1: Logging PHI access event...');
    await logPHIAccessToDatabase({
      userId: 1,
      action: AuditAction.PHI_ACCESS,
      resourceType: ResourceType.CLIENT,
      resourceId: 123,
      requestMethod: 'GET',
      requestPath: '/api/clients/123',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script',
      success: true,
      details: 'Test PHI access for client #123',
      fieldsAccessed: ['name', 'email', 'phone']
    });
    console.log('✅ PHI access event logged successfully');
    
    // Test 2: Log a PHI creation event
    console.log('\nTest 2: Logging PHI creation event...');
    await logPHIAccessToDatabase({
      userId: 1,
      action: AuditAction.PHI_CREATE,
      resourceType: ResourceType.CLIENT,
      requestMethod: 'POST',
      requestPath: '/api/clients',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script',
      success: true,
      details: 'Test PHI creation for new client',
      fieldsAccessed: ['name', 'email', 'phone', 'notes']
    });
    console.log('✅ PHI creation event logged successfully');
    
    // Test 3: Log a failed access event
    console.log('\nTest 3: Logging failed access event...');
    await logPHIAccessToDatabase({
      userId: 1,
      action: AuditAction.FAILED_ACCESS,
      resourceType: ResourceType.CLIENT,
      resourceId: 999,
      requestMethod: 'GET',
      requestPath: '/api/clients/999',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script',
      success: false,
      details: 'Test failed access to non-existent client #999'
    });
    console.log('✅ Failed access event logged successfully');
    
    console.log('\n🎉 All audit logging tests passed!');
    console.log('\n📊 Check the database for audit logs:');
    console.log('   - Table: auditLogsHIPAA');
    console.log('   - Should have 3 new records');
    console.log('   - Each with different risk scores');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAuditLogging().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
