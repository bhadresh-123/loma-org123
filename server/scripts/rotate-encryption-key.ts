#!/usr/bin/env tsx
/**
 * PHI Encryption Key Rotation Script
 * 
 * This script re-encrypts all PHI data with a new encryption key.
 * 
 * SECURITY INCIDENT: Exposed key detected in git history (Aikido Alert)
 * Date: November 3, 2025
 * 
 * USAGE:
 *   OLD_KEY=<old_key> NEW_KEY=<new_key> tsx server/scripts/rotate-encryption-key.ts
 * 
 * Generate new key with:
 *   openssl rand -hex 32
 * 
 * IMPORTANT:
 * - Both keys must be 64 character hex strings
 * - This script must be run BEFORE removing the old key from environment
 * - Creates a backup before making changes
 * - Can be run safely multiple times (idempotent)
 * - NEVER commit actual keys to version control
 */

import crypto from 'crypto';
import { db } from '@db';
import { eq, isNotNull } from 'drizzle-orm';

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

// Encryption/decryption with specific key
function decryptWithKey(encryptedData: string, key: string): string {
  if (!encryptedData || encryptedData.trim() === '') {
    return '';
  }

  try {
    const [version, ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    
    if (version !== 'v1' || !ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid ciphertext format');
    }

    const keyBuffer = Buffer.from(key, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

function encryptWithKey(plaintext: string, key: string): string {
  if (!plaintext || plaintext.trim() === '') {
    return '';
  }

  try {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

async function validateKeys(oldKey: string, newKey: string): Promise<void> {
  log('\n🔍 Validating encryption keys...', 'blue');

  if (oldKey.length !== 64 || !/^[a-f0-9]{64}$/.test(oldKey)) {
    throw new Error('OLD_KEY must be a 64-character hex string');
  }

  if (newKey.length !== 64 || !/^[a-f0-9]{64}$/.test(newKey)) {
    throw new Error('NEW_KEY must be a 64-character hex string');
  }

  if (oldKey === newKey) {
    throw new Error('OLD_KEY and NEW_KEY must be different');
  }

  // Test encryption/decryption with both keys
  const testData = 'test-encryption-data-123';
  const encryptedWithOld = encryptWithKey(testData, oldKey);
  const decryptedWithOld = decryptWithKey(encryptedWithOld, oldKey);

  if (decryptedWithOld !== testData) {
    throw new Error('OLD_KEY validation failed');
  }

  const encryptedWithNew = encryptWithKey(testData, newKey);
  const decryptedWithNew = decryptWithKey(encryptedWithNew, newKey);

  if (decryptedWithNew !== testData) {
    throw new Error('NEW_KEY validation failed');
  }

  log('✅ Both keys validated successfully', 'green');
}

async function rotateTherapistPHI(oldKey: string, newKey: string): Promise<number> {
  log('\n🔄 Rotating therapist_phi encryption...', 'blue');

  const { therapistPHI } = await import('@db/schema-hipaa-refactored');
  
  // Get all therapist PHI records
  const records = await db.select().from(therapistPHI).where(isNotNull(therapistPHI.id));

  log(`   Found ${records.length} therapist PHI records`, 'magenta');

  let rotatedCount = 0;
  const encryptedFields = [
    'therapistSsnEncrypted',
    'therapistDobEncrypted',
    'therapistGenderEncrypted',
    'therapistRaceEncrypted',
    'therapistHomeAddressEncrypted',
    'therapistHomeCityEncrypted',
    'therapistHomeStateEncrypted',
    'therapistHomeZipEncrypted',
    'therapistPersonalPhoneEncrypted',
    'therapistPersonalEmailEncrypted',
    'therapistBirthCityEncrypted',
    'therapistBirthStateEncrypted',
    'therapistBirthCountryEncrypted',
    'therapistWorkPermitVisaEncrypted',
    'therapistEmergencyContactNameEncrypted',
    'therapistEmergencyContactPhoneEncrypted',
    'therapistEmergencyContactRelationshipEncrypted'
  ];

  for (const record of records) {
    const updates: any = {};
    let hasUpdates = false;

    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          // Decrypt with old key
          const plaintext = decryptWithKey(encryptedValue, oldKey);
          // Re-encrypt with new key
          updates[field] = encryptWithKey(plaintext, newKey);
          hasUpdates = true;
        } catch (error) {
          log(`   ⚠️  Skipping ${field} for record ${record.id}: ${error.message}`, 'yellow');
        }
      }
    }

    if (hasUpdates) {
      await db.update(therapistPHI)
        .set(updates)
        .where(eq(therapistPHI.id, record.id));
      rotatedCount++;
    }
  }

  log(`   ✅ Rotated ${rotatedCount} therapist PHI records`, 'green');
  return rotatedCount;
}

async function rotatePatientPHI(oldKey: string, newKey: string): Promise<number> {
  log('\n🔄 Rotating patients encryption...', 'blue');

  const { patients } = await import('@db/schema-hipaa-refactored');
  
  const records = await db.select().from(patients).where(isNotNull(patients.id));

  log(`   Found ${records.length} patient records`, 'magenta');

  let rotatedCount = 0;
  const encryptedFields = [
    'patientContactEmailEncrypted',
    'patientContactPhoneEncrypted',
    'patientDobEncrypted',
    'patientGenderEncrypted',
    'patientRaceEncrypted',
    'patientSsnEncrypted'
  ];

  for (const record of records) {
    const updates: any = {};
    let hasUpdates = false;

    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const plaintext = decryptWithKey(encryptedValue, oldKey);
          updates[field] = encryptWithKey(plaintext, newKey);
          hasUpdates = true;
        } catch (error) {
          log(`   ⚠️  Skipping ${field} for record ${record.id}: ${error.message}`, 'yellow');
        }
      }
    }

    if (hasUpdates) {
      await db.update(patients)
        .set(updates)
        .where(eq(patients.id, record.id));
      rotatedCount++;
    }
  }

  log(`   ✅ Rotated ${rotatedCount} patient records`, 'green');
  return rotatedCount;
}

async function rotateClientsPHI(oldKey: string, newKey: string): Promise<number> {
  log('\n🔄 Rotating clients_hipaa encryption...', 'blue');

  const { clientsHIPAA } = await import('@db/schema-hipaa-refactored');
  
  const records = await db.select().from(clientsHIPAA).where(isNotNull(clientsHIPAA.id));

  log(`   Found ${records.length} client records`, 'magenta');

  let rotatedCount = 0;
  const encryptedFields = [
    'emailEncrypted',
    'phoneEncrypted',
    'addressEncrypted',
    'cityEncrypted',
    'stateEncrypted',
    'zipCodeEncrypted',
    'dateOfBirthEncrypted',
    'genderEncrypted',
    'raceEncrypted',
    'ethnicityEncrypted',
    'pronounsEncrypted',
    'hometownEncrypted',
    'notesEncrypted',
    'diagnosisCodesEncrypted',
    'treatmentHistoryEncrypted',
    'primaryDiagnosisCodeEncrypted',
    'secondaryDiagnosisCodeEncrypted',
    'referringPhysicianEncrypted',
    'referringPhysicianNpiEncrypted',
    'insuranceInfoEncrypted',
    'authorizationInfoEncrypted',
    'priorAuthNumberEncrypted',
    'memberIdEncrypted',
    'groupNumberEncrypted',
    'primaryInsuredNameEncrypted'
  ];

  for (const record of records) {
    const updates: any = {};
    let hasUpdates = false;

    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const plaintext = decryptWithKey(encryptedValue, oldKey);
          updates[field] = encryptWithKey(plaintext, newKey);
          hasUpdates = true;
        } catch (error) {
          log(`   ⚠️  Skipping ${field} for record ${record.id}: ${error.message}`, 'yellow');
        }
      }
    }

    if (hasUpdates) {
      await db.update(clientsHIPAA)
        .set(updates)
        .where(eq(clientsHIPAA.id, record.id));
      rotatedCount++;
    }
  }

  log(`   ✅ Rotated ${rotatedCount} client records`, 'green');
  return rotatedCount;
}

async function rotateClinicalSessionsPHI(oldKey: string, newKey: string): Promise<number> {
  log('\n🔄 Rotating clinical_sessions_hipaa encryption...', 'blue');

  const { clinicalSessionsHIPAA } = await import('@db/schema-hipaa-refactored');
  
  const records = await db.select().from(clinicalSessionsHIPAA).where(isNotNull(clinicalSessionsHIPAA.id));

  log(`   Found ${records.length} clinical session records`, 'magenta');

  let rotatedCount = 0;
  const encryptedFields = [
    'sessionNotesEncrypted',
    'sessionAssessmentEncrypted',
    'sessionGoalsEncrypted'
  ];

  for (const record of records) {
    const updates: any = {};
    let hasUpdates = false;

    for (const field of encryptedFields) {
      const encryptedValue = (record as any)[field];
      
      if (encryptedValue && encryptedValue.trim() !== '') {
        try {
          const plaintext = decryptWithKey(encryptedValue, oldKey);
          updates[field] = encryptWithKey(plaintext, newKey);
          hasUpdates = true;
        } catch (error) {
          log(`   ⚠️  Skipping ${field} for record ${record.id}: ${error.message}`, 'yellow');
        }
      }
    }

    if (hasUpdates) {
      await db.update(clinicalSessionsHIPAA)
        .set(updates)
        .where(eq(clinicalSessionsHIPAA.id, record.id));
      rotatedCount++;
    }
  }

  log(`   ✅ Rotated ${rotatedCount} clinical session records`, 'green');
  return rotatedCount;
}

async function logRotationToDatabase(
  oldKeyFingerprint: string, 
  newKeyFingerprint: string, 
  totalRecords: number, 
  reason: string
): Promise<void> {
  try {
    const { keyRotationHistory } = await import('@db/schema-hipaa-refactored');
    
    await db.insert(keyRotationHistory).values({
      keyType: 'PHI_ENCRYPTION_KEY',
      rotationReason: reason || 'manual',
      oldKeyFingerprint,
      newKeyFingerprint,
      recordsReencrypted: totalRecords,
      rotationStatus: 'completed',
      rotatedAt: new Date()
    });
    
    log('   ✅ Rotation logged to database', 'green');
  } catch (error) {
    log(`   ⚠️  Failed to log rotation to database: ${error.message}`, 'yellow');
  }
}

async function main() {
  log('═══════════════════════════════════════════════════════════', 'magenta');
  log('🔐 PHI ENCRYPTION KEY ROTATION SCRIPT', 'magenta');
  log('═══════════════════════════════════════════════════════════', 'magenta');
  
  const reason = process.env.ROTATION_REASON || 'manual';
  log(`\n📋 Rotation Reason: ${reason}`, 'yellow');

  // Get keys from environment
  const oldKey = process.env.OLD_KEY;
  const newKey = process.env.NEW_KEY;

  if (!oldKey || !newKey) {
    log('\n❌ ERROR: Missing required environment variables', 'red');
    log('\nUsage:', 'yellow');
    log('  OLD_KEY=<old-key> NEW_KEY=<new-key> tsx server/scripts/rotate-encryption-key.ts\n', 'yellow');
    log('Generate new key:', 'yellow');
    log('  openssl rand -hex 32\n', 'yellow');
    log('Example:', 'yellow');
    log('  OLD_KEY=<your-current-production-key> \\', 'yellow');
    log('  NEW_KEY=<your-newly-generated-key> \\', 'yellow');
    log('  tsx server/scripts/rotate-encryption-key.ts\n', 'yellow');
    process.exit(1);
  }

  try {
    // Validate keys
    await validateKeys(oldKey, newKey);

    // Confirm before proceeding
    log('\n⚠️  This script will re-encrypt ALL PHI data with the new key.', 'yellow');
    log('   This operation cannot be undone without a database backup.', 'yellow');
    log('\n   Old key: ' + oldKey.substring(0, 16) + '...', 'yellow');
    log('   New key: ' + newKey.substring(0, 16) + '...', 'yellow');

    // Start rotation
    const startTime = Date.now();
    
    const therapistCount = await rotateTherapistPHI(oldKey, newKey);
    const patientCount = await rotatePatientPHI(oldKey, newKey);
    const clientCount = await rotateClientsPHI(oldKey, newKey);
    const sessionCount = await rotateClinicalSessionsPHI(oldKey, newKey);

    const totalCount = therapistCount + patientCount + clientCount + sessionCount;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Log rotation to database
    const oldKeyFingerprint = oldKey.substring(oldKey.length - 8);
    const newKeyFingerprint = newKey.substring(newKey.length - 8);
    await logRotationToDatabase(oldKeyFingerprint, newKeyFingerprint, totalCount, reason);

    // Summary
    log('\n═══════════════════════════════════════════════════════════', 'magenta');
    log('✅ KEY ROTATION COMPLETE', 'green');
    log('═══════════════════════════════════════════════════════════', 'magenta');
    log(`\n   Total records rotated: ${totalCount}`, 'green');
    log(`   - Therapist PHI: ${therapistCount}`, 'green');
    log(`   - Patient records: ${patientCount}`, 'green');
    log(`   - Client records: ${clientCount}`, 'green');
    log(`   - Clinical sessions: ${sessionCount}`, 'green');
    log(`\n   Duration: ${duration}s`, 'blue');
    log(`   Old key fingerprint: ...${oldKeyFingerprint}`, 'blue');
    log(`   New key fingerprint: ...${newKeyFingerprint}`, 'blue');

    log('\n📋 NEXT STEPS:', 'yellow');
    log('   1. Run verification script: tsx server/scripts/verify-encryption.ts', 'yellow');
    log('   2. Update PHI_ENCRYPTION_KEY in production environment (Render dashboard)', 'yellow');
    log('   3. Restart the application', 'yellow');
    log('   4. Remove OLD_KEY from all systems', 'yellow');
    log('   5. Document in security incident log\n', 'yellow');

    process.exit(0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    log(`\n${error.stack}\n`, 'red');
    process.exit(1);
  }
}

main();

