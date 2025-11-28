#!/usr/bin/env node

/**
 * Enhanced HIPAA Migration Runner
 * 
 * This script runs the complete HIPAA schema migration process:
 * 1. Creates backup tables
 * 2. Creates HIPAA-compliant tables
 * 3. Migrates data from old schema
 * 4. Encrypts all PHI data
 * 5. Verifies migration success
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../index';
import { sql } from 'drizzle-orm';
import { PHIEncryptionService } from '../../server/services/HIPAAService';

async function runMigration() {
  console.log('🚀 Starting Enhanced HIPAA Schema Migration...');
  
  try {
    // Step 1: Read and execute the migration SQL
    console.log('📋 Step 1: Executing enhanced schema migration...');
    const migrationSQL = readFileSync(join(__dirname, 'enhanced-hipaa-schema-migration.sql'), 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          // Some statements might fail if tables already exist, which is OK
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Table already exists, skipping: ${statement.substring(0, 50)}...`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Enhanced schema migration complete');
    
    // Step 2: Run data encryption
    console.log('🔐 Step 2: Encrypting PHI data...');
    await encryptTherapistPHI();
    await encryptClientPHI();
    await encryptSessionPHI();
    await encryptTreatmentPlanPHI();
    
    console.log('✅ PHI encryption complete');
    
    // Step 3: Verify migration
    console.log('🔍 Step 3: Verifying migration...');
    await verifyMigration();
    
    console.log('🎉 Enhanced HIPAA migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Set USE_HIPAA_SCHEMA=true environment variable');
    console.log('2. Update application code to use new schema');
    console.log('3. Test all functionality');
    console.log('4. Deploy to production');
    console.log('5. Clean up old tables after verification period');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Rollback instructions:');
    console.error('1. Restore from backup tables');
    console.error('2. Drop new HIPAA tables if needed');
    console.error('3. Check logs for specific errors');
    process.exit(1);
  }
}

/**
 * Encrypt therapist PHI data
 */
async function encryptTherapistPHI(): Promise<void> {
  console.log('🔐 Encrypting therapist PHI data...');
  
  try {
    // Get all therapist PHI records that need encryption
    const therapistPHIRecords = await db.execute(sql`
      SELECT * FROM therapist_phi 
      WHERE ssn_encrypted IS NOT NULL 
      AND ssn_encrypted NOT LIKE 'v2:%'
    `);
    
    for (const record of therapistPHIRecords) {
      const encryptedData: any = {};
      
      // Encrypt each field that needs encryption
      if (record.ssn_encrypted && !record.ssn_encrypted.startsWith('v2:')) {
        encryptedData.ssn_encrypted = PHIEncryptionService.encryptPHI(record.ssn_encrypted);
      }
      if (record.date_of_birth_encrypted && !record.date_of_birth_encrypted.startsWith('v2:')) {
        encryptedData.date_of_birth_encrypted = PHIEncryptionService.encryptPHI(record.date_of_birth_encrypted);
      }
      if (record.personal_address_encrypted && !record.personal_address_encrypted.startsWith('v2:')) {
        encryptedData.personal_address_encrypted = PHIEncryptionService.encryptPHI(record.personal_address_encrypted);
      }
      if (record.personal_phone_encrypted && !record.personal_phone_encrypted.startsWith('v2:')) {
        encryptedData.personal_phone_encrypted = PHIEncryptionService.encryptPHI(record.personal_phone_encrypted);
        encryptedData.personal_phone_search_hash = PHIEncryptionService.createSearchHash(record.personal_phone_encrypted);
      }
      if (record.personal_email_encrypted && !record.personal_email_encrypted.startsWith('v2:')) {
        encryptedData.personal_email_encrypted = PHIEncryptionService.encryptPHI(record.personal_email_encrypted);
        encryptedData.personal_email_search_hash = PHIEncryptionService.createSearchHash(record.personal_email_encrypted);
      }
      if (record.birth_city_encrypted && !record.birth_city_encrypted.startsWith('v2:')) {
        encryptedData.birth_city_encrypted = PHIEncryptionService.encryptPHI(record.birth_city_encrypted);
      }
      if (record.birth_state_encrypted && !record.birth_state_encrypted.startsWith('v2:')) {
        encryptedData.birth_state_encrypted = PHIEncryptionService.encryptPHI(record.birth_state_encrypted);
      }
      if (record.birth_country_encrypted && !record.birth_country_encrypted.startsWith('v2:')) {
        encryptedData.birth_country_encrypted = PHIEncryptionService.encryptPHI(record.birth_country_encrypted);
      }
      if (record.work_permit_visa_encrypted && !record.work_permit_visa_encrypted.startsWith('v2:')) {
        encryptedData.work_permit_visa_encrypted = PHIEncryptionService.encryptPHI(record.work_permit_visa_encrypted);
      }
      if (record.emergency_contact_encrypted && !record.emergency_contact_encrypted.startsWith('v2:')) {
        encryptedData.emergency_contact_encrypted = PHIEncryptionService.encryptPHI(record.emergency_contact_encrypted);
      }
      if (record.emergency_phone_encrypted && !record.emergency_phone_encrypted.startsWith('v2:')) {
        encryptedData.emergency_phone_encrypted = PHIEncryptionService.encryptPHI(record.emergency_phone_encrypted);
      }
      
      // Update the record with encrypted data
      if (Object.keys(encryptedData).length > 0) {
        const updateFields = Object.keys(encryptedData).map(key => `${key} = $${Object.keys(encryptedData).indexOf(key) + 1}`).join(', ');
        const values = Object.values(encryptedData);
        
        await db.execute(sql.raw(`
          UPDATE therapist_phi 
          SET ${updateFields}, updated_at = NOW()
          WHERE id = ${record.id}
        `, ...values));
      }
    }
    
    console.log(`✅ Encrypted ${therapistPHIRecords.length} therapist PHI records`);
  } catch (error) {
    console.error('❌ Failed to encrypt therapist PHI:', error);
    throw error;
  }
}

/**
 * Encrypt client PHI data
 */
async function encryptClientPHI(): Promise<void> {
  console.log('🔐 Encrypting client PHI data...');
  
  try {
    // Get all client records that need encryption
    const clientRecords = await db.execute(sql`
      SELECT * FROM clients_hipaa 
      WHERE email_encrypted IS NOT NULL 
      AND email_encrypted NOT LIKE 'v2:%'
    `);
    
    for (const record of clientRecords) {
      const encryptedData: any = {};
      
      // Encrypt each field that needs encryption
      if (record.email_encrypted && !record.email_encrypted.startsWith('v2:')) {
        encryptedData.email_encrypted = PHIEncryptionService.encryptPHI(record.email_encrypted);
        encryptedData.email_search_hash = PHIEncryptionService.createSearchHash(record.email_encrypted);
      }
      if (record.phone_encrypted && !record.phone_encrypted.startsWith('v2:')) {
        encryptedData.phone_encrypted = PHIEncryptionService.encryptPHI(record.phone_encrypted);
        encryptedData.phone_search_hash = PHIEncryptionService.createSearchHash(record.phone_encrypted);
      }
      if (record.address_encrypted && !record.address_encrypted.startsWith('v2:')) {
        encryptedData.address_encrypted = PHIEncryptionService.encryptPHI(record.address_encrypted);
      }
      if (record.city_encrypted && !record.city_encrypted.startsWith('v2:')) {
        encryptedData.city_encrypted = PHIEncryptionService.encryptPHI(record.city_encrypted);
      }
      if (record.state_encrypted && !record.state_encrypted.startsWith('v2:')) {
        encryptedData.state_encrypted = PHIEncryptionService.encryptPHI(record.state_encrypted);
      }
      if (record.zip_code_encrypted && !record.zip_code_encrypted.startsWith('v2:')) {
        encryptedData.zip_code_encrypted = PHIEncryptionService.encryptPHI(record.zip_code_encrypted);
      }
      if (record.date_of_birth_encrypted && !record.date_of_birth_encrypted.startsWith('v2:')) {
        encryptedData.date_of_birth_encrypted = PHIEncryptionService.encryptPHI(record.date_of_birth_encrypted);
      }
      if (record.gender_encrypted && !record.gender_encrypted.startsWith('v2:')) {
        encryptedData.gender_encrypted = PHIEncryptionService.encryptPHI(record.gender_encrypted);
      }
      if (record.race_encrypted && !record.race_encrypted.startsWith('v2:')) {
        encryptedData.race_encrypted = PHIEncryptionService.encryptPHI(record.race_encrypted);
      }
      if (record.ethnicity_encrypted && !record.ethnicity_encrypted.startsWith('v2:')) {
        encryptedData.ethnicity_encrypted = PHIEncryptionService.encryptPHI(record.ethnicity_encrypted);
      }
      if (record.pronouns_encrypted && !record.pronouns_encrypted.startsWith('v2:')) {
        encryptedData.pronouns_encrypted = PHIEncryptionService.encryptPHI(record.pronouns_encrypted);
      }
      if (record.hometown_encrypted && !record.hometown_encrypted.startsWith('v2:')) {
        encryptedData.hometown_encrypted = PHIEncryptionService.encryptPHI(record.hometown_encrypted);
      }
      if (record.notes_encrypted && !record.notes_encrypted.startsWith('v2:')) {
        encryptedData.notes_encrypted = PHIEncryptionService.encryptPHI(record.notes_encrypted);
      }
      if (record.diagnosis_codes_encrypted && !record.diagnosis_codes_encrypted.startsWith('v2:')) {
        encryptedData.diagnosis_codes_encrypted = PHIEncryptionService.encryptPHI(record.diagnosis_codes_encrypted);
      }
      if (record.treatment_history_encrypted && !record.treatment_history_encrypted.startsWith('v2:')) {
        encryptedData.treatment_history_encrypted = PHIEncryptionService.encryptPHI(record.treatment_history_encrypted);
      }
      if (record.primary_diagnosis_code_encrypted && !record.primary_diagnosis_code_encrypted.startsWith('v2:')) {
        encryptedData.primary_diagnosis_code_encrypted = PHIEncryptionService.encryptPHI(record.primary_diagnosis_code_encrypted);
      }
      if (record.secondary_diagnosis_code_encrypted && !record.secondary_diagnosis_code_encrypted.startsWith('v2:')) {
        encryptedData.secondary_diagnosis_code_encrypted = PHIEncryptionService.encryptPHI(record.secondary_diagnosis_code_encrypted);
      }
      if (record.referring_physician_encrypted && !record.referring_physician_encrypted.startsWith('v2:')) {
        encryptedData.referring_physician_encrypted = PHIEncryptionService.encryptPHI(record.referring_physician_encrypted);
      }
      if (record.referring_physician_npi_encrypted && !record.referring_physician_npi_encrypted.startsWith('v2:')) {
        encryptedData.referring_physician_npi_encrypted = PHIEncryptionService.encryptPHI(record.referring_physician_npi_encrypted);
      }
      if (record.insurance_info_encrypted && !record.insurance_info_encrypted.startsWith('v2:')) {
        encryptedData.insurance_info_encrypted = PHIEncryptionService.encryptPHI(record.insurance_info_encrypted);
      }
      if (record.authorization_info_encrypted && !record.authorization_info_encrypted.startsWith('v2:')) {
        encryptedData.authorization_info_encrypted = PHIEncryptionService.encryptPHI(record.authorization_info_encrypted);
      }
      if (record.prior_auth_number_encrypted && !record.prior_auth_number_encrypted.startsWith('v2:')) {
        encryptedData.prior_auth_number_encrypted = PHIEncryptionService.encryptPHI(record.prior_auth_number_encrypted);
      }
      if (record.member_id_encrypted && !record.member_id_encrypted.startsWith('v2:')) {
        encryptedData.member_id_encrypted = PHIEncryptionService.encryptPHI(record.member_id_encrypted);
      }
      if (record.group_number_encrypted && !record.group_number_encrypted.startsWith('v2:')) {
        encryptedData.group_number_encrypted = PHIEncryptionService.encryptPHI(record.group_number_encrypted);
      }
      if (record.primary_insured_name_encrypted && !record.primary_insured_name_encrypted.startsWith('v2:')) {
        encryptedData.primary_insured_name_encrypted = PHIEncryptionService.encryptPHI(record.primary_insured_name_encrypted);
      }
      
      // Update the record with encrypted data
      if (Object.keys(encryptedData).length > 0) {
        const updateFields = Object.keys(encryptedData).map(key => `${key} = $${Object.keys(encryptedData).indexOf(key) + 1}`).join(', ');
        const values = Object.values(encryptedData);
        
        await db.execute(sql.raw(`
          UPDATE clients_hipaa 
          SET ${updateFields}, updated_at = NOW()
          WHERE id = ${record.id}
        `, ...values));
      }
    }
    
    console.log(`✅ Encrypted ${clientRecords.length} client PHI records`);
  } catch (error) {
    console.error('❌ Failed to encrypt client PHI:', error);
    throw error;
  }
}

/**
 * Encrypt session PHI data
 */
async function encryptSessionPHI(): Promise<void> {
  console.log('🔐 Encrypting session PHI data...');
  
  try {
    // Get all session records that need encryption
    const sessionRecords = await db.execute(sql`
      SELECT * FROM sessions_hipaa 
      WHERE notes_encrypted IS NOT NULL 
      AND notes_encrypted NOT LIKE 'v2:%'
    `);
    
    for (const record of sessionRecords) {
      const encryptedData: any = {};
      
      // Encrypt each field that needs encryption
      if (record.notes_encrypted && !record.notes_encrypted.startsWith('v2:')) {
        encryptedData.notes_encrypted = PHIEncryptionService.encryptPHI(record.notes_encrypted);
      }
      if (record.assessments_encrypted && !record.assessments_encrypted.startsWith('v2:')) {
        encryptedData.assessments_encrypted = PHIEncryptionService.encryptPHI(record.assessments_encrypted);
      }
      if (record.treatment_goals_encrypted && !record.treatment_goals_encrypted.startsWith('v2:')) {
        encryptedData.treatment_goals_encrypted = PHIEncryptionService.encryptPHI(record.treatment_goals_encrypted);
      }
      if (record.progress_notes_encrypted && !record.progress_notes_encrypted.startsWith('v2:')) {
        encryptedData.progress_notes_encrypted = PHIEncryptionService.encryptPHI(record.progress_notes_encrypted);
      }
      
      // Update the record with encrypted data
      if (Object.keys(encryptedData).length > 0) {
        const updateFields = Object.keys(encryptedData).map(key => `${key} = $${Object.keys(encryptedData).indexOf(key) + 1}`).join(', ');
        const values = Object.values(encryptedData);
        
        await db.execute(sql.raw(`
          UPDATE sessions_hipaa 
          SET ${updateFields}, updated_at = NOW()
          WHERE id = ${record.id}
        `, ...values));
      }
    }
    
    console.log(`✅ Encrypted ${sessionRecords.length} session PHI records`);
  } catch (error) {
    console.error('❌ Failed to encrypt session PHI:', error);
    throw error;
  }
}

/**
 * Encrypt treatment plan PHI data
 */
async function encryptTreatmentPlanPHI(): Promise<void> {
  console.log('🔐 Encrypting treatment plan PHI data...');
  
  try {
    // Get all treatment plan records that need encryption
    const treatmentPlanRecords = await db.execute(sql`
      SELECT * FROM treatment_plans_hipaa 
      WHERE content_encrypted IS NOT NULL 
      AND content_encrypted NOT LIKE 'v2:%'
    `);
    
    for (const record of treatmentPlanRecords) {
      const encryptedData: any = {};
      
      // Encrypt each field that needs encryption
      if (record.content_encrypted && !record.content_encrypted.startsWith('v2:')) {
        encryptedData.content_encrypted = PHIEncryptionService.encryptPHI(record.content_encrypted);
      }
      if (record.goals_encrypted && !record.goals_encrypted.startsWith('v2:')) {
        encryptedData.goals_encrypted = PHIEncryptionService.encryptPHI(record.goals_encrypted);
      }
      if (record.objectives_encrypted && !record.objectives_encrypted.startsWith('v2:')) {
        encryptedData.objectives_encrypted = PHIEncryptionService.encryptPHI(record.objectives_encrypted);
      }
      if (record.interventions_encrypted && !record.interventions_encrypted.startsWith('v2:')) {
        encryptedData.interventions_encrypted = PHIEncryptionService.encryptPHI(record.interventions_encrypted);
      }
      if (record.progress_notes_encrypted && !record.progress_notes_encrypted.startsWith('v2:')) {
        encryptedData.progress_notes_encrypted = PHIEncryptionService.encryptPHI(record.progress_notes_encrypted);
      }
      
      // Update the record with encrypted data
      if (Object.keys(encryptedData).length > 0) {
        const updateFields = Object.keys(encryptedData).map(key => `${key} = $${Object.keys(encryptedData).indexOf(key) + 1}`).join(', ');
        const values = Object.values(encryptedData);
        
        await db.execute(sql.raw(`
          UPDATE treatment_plans_hipaa 
          SET ${updateFields}, updated_at = NOW()
          WHERE id = ${record.id}
        `, ...values));
      }
    }
    
    console.log(`✅ Encrypted ${treatmentPlanRecords.length} treatment plan PHI records`);
  } catch (error) {
    console.error('❌ Failed to encrypt treatment plan PHI:', error);
    throw error;
  }
}

/**
 * Verify migration success
 */
async function verifyMigration(): Promise<void> {
  console.log('🔍 Verifying migration...');
  
  try {
    // Check table counts
    const tableCounts = await db.execute(sql`
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
    
    console.log('📊 Table counts:');
    tableCounts.forEach((row: any) => {
      console.log(`   ${row.table_name}: ${row.count} records`);
    });
    
    // Check encryption status
    const encryptionChecks = await db.execute(sql`
      SELECT 
        'Encryption Status Check' as check_type,
        COUNT(CASE WHEN ssn_encrypted LIKE 'v2:%' THEN 1 END) as encrypted_ssn,
        COUNT(CASE WHEN ssn_encrypted IS NOT NULL THEN 1 END) as total_ssn
      FROM therapist_phi
      UNION ALL
      SELECT 
        'Client Encryption Check' as check_type,
        COUNT(CASE WHEN email_encrypted LIKE 'v2:%' THEN 1 END) as encrypted_email,
        COUNT(CASE WHEN email_encrypted IS NOT NULL THEN 1 END) as total_email
      FROM clients_hipaa
    `);
    
    console.log('🔐 Encryption verification:');
    encryptionChecks.forEach((row: any) => {
      console.log(`   ${row.check_type}: ${row.encrypted_ssn || row.encrypted_email}/${row.total_ssn || row.total_email} encrypted`);
    });
    
    // Check foreign key relationships
    const fkChecks = await db.execute(sql`
      SELECT 
        'Foreign Key Check' as check_type,
        COUNT(*) as total_clients,
        COUNT(CASE WHEN c.therapist_id = ua.id THEN 1 END) as valid_therapist_refs
      FROM clients_hipaa c
      LEFT JOIN users_auth ua ON c.therapist_id = ua.id
    `);
    
    console.log('🔗 Foreign key verification:');
    fkChecks.forEach((row: any) => {
      console.log(`   ${row.check_type}: ${row.valid_therapist_refs}/${row.total_clients} valid references`);
    });
    
    console.log('✅ Migration verification complete');
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

export { runMigration };

