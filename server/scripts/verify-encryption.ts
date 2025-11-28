#!/usr/bin/env tsx
/**
 * PHI Encryption Verification Script
 * 
 * Verifies that encryption/decryption is working correctly after key rotation.
 * Tests a sample of records from each encrypted table to ensure data integrity.
 * 
 * USAGE:
 *   tsx server/scripts/verify-encryption.ts
 * 
 * SECURITY:
 * - Uses PHI_ENCRYPTION_KEY from environment
 * - Does not display decrypted values
 * - Only checks encryption/decryption functionality
 */

import { db } from '@db';
import { encryptPHI, decryptPHI } from '../utils/phi-encryption';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface VerificationResult {
  tableName: string;
  totalRecords: number;
  sampleSize: number;
  successfulDecryptions: number;
  failedDecryptions: number;
  errors: string[];
}

async function verifyPatients(): Promise<VerificationResult> {
  log('\n🔍 Verifying patients encryption...', 'blue');
  
  const { patients } = await import('@db/schema-hipaa-refactored');
  const { isNotNull } = await import('drizzle-orm');
  
  const records = await db
    .select()
    .from(patients)
    .where(isNotNull(patients.id))
    .limit(10);
  
  const result: VerificationResult = {
    tableName: 'patients',
    totalRecords: records.length,
    sampleSize: records.length,
    successfulDecryptions: 0,
    failedDecryptions: 0,
    errors: []
  };
  
  const encryptedFields = [
    'patientContactEmailEncrypted',
    'patientContactPhoneEncrypted',
    'patientDobEncrypted',
    'patientGenderEncrypted',
    'patientSsnEncrypted'
  ];
  
  for (const record of records) {
    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const decrypted = decryptPHI(encryptedValue);
          if (decrypted) {
            result.successfulDecryptions++;
          } else {
            result.failedDecryptions++;
            result.errors.push(`${field} in record ${record.id}: decryption returned null`);
          }
        } catch (error) {
          result.failedDecryptions++;
          result.errors.push(`${field} in record ${record.id}: ${error.message}`);
        }
      }
    }
  }
  
  if (result.failedDecryptions === 0) {
    log(`   ✅ All ${result.successfulDecryptions} fields decrypted successfully`, 'green');
  } else {
    log(`   ❌ ${result.failedDecryptions} decryption failures`, 'red');
  }
  
  return result;
}

async function verifyTherapistPHI(): Promise<VerificationResult> {
  log('\n🔍 Verifying therapist_phi encryption...', 'blue');
  
  const { therapistPHI } = await import('@db/schema-hipaa-refactored');
  const { isNotNull } = await import('drizzle-orm');
  
  const records = await db
    .select()
    .from(therapistPHI)
    .where(isNotNull(therapistPHI.id))
    .limit(10);
  
  const result: VerificationResult = {
    tableName: 'therapist_phi',
    totalRecords: records.length,
    sampleSize: records.length,
    successfulDecryptions: 0,
    failedDecryptions: 0,
    errors: []
  };
  
  const encryptedFields = [
    'therapistSsnEncrypted',
    'therapistDobEncrypted',
    'therapistPersonalEmailEncrypted',
    'therapistPersonalPhoneEncrypted'
  ];
  
  for (const record of records) {
    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const decrypted = decryptPHI(encryptedValue);
          if (decrypted) {
            result.successfulDecryptions++;
          } else {
            result.failedDecryptions++;
            result.errors.push(`${field} in record ${record.id}: decryption returned null`);
          }
        } catch (error) {
          result.failedDecryptions++;
          result.errors.push(`${field} in record ${record.id}: ${error.message}`);
        }
      }
    }
  }
  
  if (result.failedDecryptions === 0) {
    log(`   ✅ All ${result.successfulDecryptions} fields decrypted successfully`, 'green');
  } else {
    log(`   ❌ ${result.failedDecryptions} decryption failures`, 'red');
  }
  
  return result;
}

async function verifyClientsPHI(): Promise<VerificationResult> {
  log('\n🔍 Verifying clients_hipaa encryption...', 'blue');
  
  const { clientsHIPAA } = await import('@db/schema-hipaa-refactored');
  const { isNotNull } = await import('drizzle-orm');
  
  const records = await db
    .select()
    .from(clientsHIPAA)
    .where(isNotNull(clientsHIPAA.id))
    .limit(10);
  
  const result: VerificationResult = {
    tableName: 'clients_hipaa',
    totalRecords: records.length,
    sampleSize: records.length,
    successfulDecryptions: 0,
    failedDecryptions: 0,
    errors: []
  };
  
  const encryptedFields = [
    'emailEncrypted',
    'phoneEncrypted',
    'dateOfBirthEncrypted',
    'notesEncrypted'
  ];
  
  for (const record of records) {
    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const decrypted = decryptPHI(encryptedValue);
          if (decrypted) {
            result.successfulDecryptions++;
          } else {
            result.failedDecryptions++;
            result.errors.push(`${field} in record ${record.id}: decryption returned null`);
          }
        } catch (error) {
          result.failedDecryptions++;
          result.errors.push(`${field} in record ${record.id}: ${error.message}`);
        }
      }
    }
  }
  
  if (result.failedDecryptions === 0) {
    log(`   ✅ All ${result.successfulDecryptions} fields decrypted successfully`, 'green');
  } else {
    log(`   ❌ ${result.failedDecryptions} decryption failures`, 'red');
  }
  
  return result;
}

async function verifyClinicalSessions(): Promise<VerificationResult> {
  log('\n🔍 Verifying clinical_sessions_hipaa encryption...', 'blue');
  
  const { clinicalSessionsHIPAA } = await import('@db/schema-hipaa-refactored');
  const { isNotNull } = await import('drizzle-orm');
  
  const records = await db
    .select()
    .from(clinicalSessionsHIPAA)
    .where(isNotNull(clinicalSessionsHIPAA.id))
    .limit(10);
  
  const result: VerificationResult = {
    tableName: 'clinical_sessions_hipaa',
    totalRecords: records.length,
    sampleSize: records.length,
    successfulDecryptions: 0,
    failedDecryptions: 0,
    errors: []
  };
  
  const encryptedFields = [
    'sessionNotesEncrypted',
    'sessionAssessmentEncrypted',
    'sessionGoalsEncrypted'
  ];
  
  for (const record of records) {
    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const decrypted = decryptPHI(encryptedValue);
          if (decrypted) {
            result.successfulDecryptions++;
          } else {
            result.failedDecryptions++;
            result.errors.push(`${field} in record ${record.id}: decryption returned null`);
          }
        } catch (error) {
          result.failedDecryptions++;
          result.errors.push(`${field} in record ${record.id}: ${error.message}`);
        }
      }
    }
  }
  
  if (result.failedDecryptions === 0) {
    log(`   ✅ All ${result.successfulDecryptions} fields decrypted successfully`, 'green');
  } else {
    log(`   ❌ ${result.failedDecryptions} decryption failures`, 'red');
  }
  
  return result;
}

async function testEncryptionRoundTrip(): Promise<boolean> {
  log('\n🔍 Testing encryption round-trip...', 'blue');
  
  const testData = [
    'test-email@example.com',
    '555-123-4567',
    '1990-01-01',
    'Test clinical notes with special characters: !@#$%^&*()',
    'This is a longer piece of text that simulates clinical session notes. It includes multiple sentences. And some special characters like é, ñ, and ü.'
  ];
  
  let allPassed = true;
  
  for (let i = 0; i < testData.length; i++) {
    const original = testData[i];
    
    try {
      const encrypted = encryptPHI(original);
      if (!encrypted) {
        log(`   ❌ Test ${i + 1}: Encryption returned null`, 'red');
        allPassed = false;
        continue;
      }
      
      const decrypted = decryptPHI(encrypted);
      if (decrypted !== original) {
        log(`   ❌ Test ${i + 1}: Round-trip mismatch`, 'red');
        log(`      Expected: ${original}`, 'red');
        log(`      Got: ${decrypted}`, 'red');
        allPassed = false;
      } else {
        log(`   ✅ Test ${i + 1}: Round-trip successful`, 'green');
      }
    } catch (error) {
      log(`   ❌ Test ${i + 1}: ${error.message}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function main() {
  log('═══════════════════════════════════════════════════════════', 'magenta');
  log('🔐 PHI ENCRYPTION VERIFICATION', 'magenta');
  log('═══════════════════════════════════════════════════════════', 'magenta');
  
  // Check environment
  if (!process.env.PHI_ENCRYPTION_KEY) {
    log('\n❌ ERROR: PHI_ENCRYPTION_KEY not set in environment', 'red');
    process.exit(1);
  }
  
  log(`\n   Encryption key fingerprint: ...${process.env.PHI_ENCRYPTION_KEY.substring(process.env.PHI_ENCRYPTION_KEY.length - 8)}`, 'blue');
  
  try {
    const startTime = Date.now();
    
    // Test encryption round-trip
    const roundTripPassed = await testEncryptionRoundTrip();
    
    // Verify database records
    const patientsResult = await verifyPatients();
    const therapistResult = await verifyTherapistPHI();
    const clientsResult = await verifyClientsPHI();
    const sessionsResult = await verifyClinicalSessions();
    
    const totalSuccesses = 
      patientsResult.successfulDecryptions +
      therapistResult.successfulDecryptions +
      clientsResult.successfulDecryptions +
      sessionsResult.successfulDecryptions;
    
    const totalFailures = 
      patientsResult.failedDecryptions +
      therapistResult.failedDecryptions +
      clientsResult.failedDecryptions +
      sessionsResult.failedDecryptions;
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Summary
    log('\n═══════════════════════════════════════════════════════════', 'magenta');
    if (totalFailures === 0 && roundTripPassed) {
      log('✅ VERIFICATION PASSED', 'green');
    } else {
      log('❌ VERIFICATION FAILED', 'red');
    }
    log('═══════════════════════════════════════════════════════════', 'magenta');
    
    log(`\n   Round-trip test: ${roundTripPassed ? '✅ PASSED' : '❌ FAILED'}`, roundTripPassed ? 'green' : 'red');
    log(`   Successful decryptions: ${totalSuccesses}`, 'green');
    log(`   Failed decryptions: ${totalFailures}`, totalFailures > 0 ? 'red' : 'green');
    log(`   Duration: ${duration}s`, 'blue');
    
    // Show errors if any
    if (totalFailures > 0) {
      log('\n📋 ERRORS:', 'red');
      const allErrors = [
        ...patientsResult.errors,
        ...therapistResult.errors,
        ...clientsResult.errors,
        ...sessionsResult.errors
      ];
      
      allErrors.slice(0, 10).forEach(error => {
        log(`   - ${error}`, 'red');
      });
      
      if (allErrors.length > 10) {
        log(`   ... and ${allErrors.length - 10} more errors`, 'red');
      }
    }
    
    log('');
    process.exit(totalFailures > 0 || !roundTripPassed ? 1 : 0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    log(`\n${error.stack}\n`, 'red');
    process.exit(1);
  }
}

main();

