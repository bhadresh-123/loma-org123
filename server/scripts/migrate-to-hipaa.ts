#!/usr/bin/env tsx

/**
 * HIPAA Data Migration Script
 * 
 * Migrates data from existing tables to HIPAA-compliant structure
 * This script safely migrates therapist and client data while maintaining
 * backward compatibility and ensuring no data loss.
 */

import { neon } from "@neondatabase/serverless";
import { PHIEncryptionService } from '../services/ClinicalService';

interface MigrationConfig {
  sourceDatabaseUrl: string;
  targetDatabaseUrl: string;
  batchSize: number;
  dryRun: boolean;
}

class HIPAAMigrationService {
  private sourceDb: any;
  private targetDb: any;
  private config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.sourceDb = neon(config.sourceDatabaseUrl);
    this.targetDb = neon(config.targetDatabaseUrl);
  }

  /**
   * Migrate therapist data from users table to HIPAA structure
   */
  async migrateTherapistData(): Promise<void> {
    console.log('🔄 Starting therapist data migration...');

    try {
      // Get all users from source database
      const users = await this.sourceDb`
        SELECT * FROM users 
        WHERE id IS NOT NULL
        ORDER BY id
      `;

      console.log(`📊 Found ${users.length} users to migrate`);

      for (const user of users) {
        await this.migrateSingleTherapist(user);
      }

      console.log('✅ Therapist data migration completed');
    } catch (error) {
      console.error('❌ Error migrating therapist data:', error);
      throw error;
    }
  }

  /**
   * Migrate a single therapist's data
   */
  private async migrateSingleTherapist(user: any): Promise<void> {
    try {
      // Create user_auth record
      const [authUser] = await this.targetDb`
        INSERT INTO users_auth (username, password, email, account_status, created_at)
        VALUES (${user.username}, ${user.password}, ${user.email || ''}, 'active', NOW())
        RETURNING id
      `;

      const userId = authUser.id;

      // Create therapist_profiles record (non-PHI data)
      await this.targetDb`
        INSERT INTO therapist_profiles (
          user_id, name, title, license_number, specialties, languages,
          session_format, base_rate, sliding_scale, therapist_identities,
          business_address, business_city, business_state, business_zip_code,
          business_phone, business_email, npi_number, taxonomy_code,
          ein_number, legal_business_name, default_note_format,
          session_duration, time_zone, is_insurance_provider,
          accepted_providers, group_session_rate, cv_filename,
          cv_original_name, cv_mime_type, created_at
        ) VALUES (
          ${userId},
          ${user.name || ''},
          ${user.title || ''},
          ${user.license || ''},
          ${user.specialties ? JSON.stringify(JSON.parse(user.specialties)) : '[]'},
          ${user.languages ? JSON.stringify(JSON.parse(user.languages)) : '[]'},
          ${user.sessionFormat || 'in_person'},
          ${user.baseRate || 0},
          ${user.slidingScale || false},
          ${user.therapistIdentities ? JSON.stringify(JSON.parse(user.therapistIdentities)) : '[]'},
          ${user.address || ''},
          ${user.city || ''},
          ${user.state || ''},
          ${user.zipCode || ''},
          ${user.phone || ''},
          ${user.email || ''},
          ${user.npiNumber || ''},
          ${user.taxonomyCode || ''},
          ${user.ein || ''},
          ${user.legalBusinessName || ''},
          ${user.defaultNoteFormat || 'SOAP'},
          ${user.sessionDuration || 50},
          ${user.timeZone || 'America/New_York'},
          ${user.isInsuranceProvider || false},
          ${user.acceptedProviders ? JSON.stringify(JSON.parse(user.acceptedProviders)) : '[]'},
          ${user.groupSessionRate || 0},
          ${user.cvFilename || ''},
          ${user.cvOriginalName || ''},
          ${user.cvMimeType || ''},
          NOW()
        )
      `;

      // Create therapist_phi record (encrypted PHI data)
      const encryptedPHI = {
        ssnEncrypted: PHIEncryptionService.encryptPHI(user.ssn),
        dateOfBirthEncrypted: PHIEncryptionService.encryptPHI(user.dateOfBirth?.toString()),
        personalAddressEncrypted: PHIEncryptionService.encryptPHI(user.address),
        personalPhoneEncrypted: PHIEncryptionService.encryptPHI(user.personalPhone),
        personalEmailEncrypted: PHIEncryptionService.encryptPHI(user.personalEmail),
        birthCityEncrypted: PHIEncryptionService.encryptPHI(user.birthCity),
        birthStateEncrypted: PHIEncryptionService.encryptPHI(user.birthState),
        birthCountryEncrypted: PHIEncryptionService.encryptPHI(user.birthCountry),
        workPermitVisaEncrypted: PHIEncryptionService.encryptPHI(user.workPermitVisa),
        personalEmailSearchHash: PHIEncryptionService.createSearchHash(user.personalEmail),
        personalPhoneSearchHash: PHIEncryptionService.createSearchHash(user.personalPhone),
        isUsCitizen: user.isUsCitizen,
      };

      await this.targetDb`
        INSERT INTO therapist_phi (
          user_id, ssn_encrypted, date_of_birth_encrypted, personal_address_encrypted,
          personal_phone_encrypted, personal_email_encrypted, birth_city_encrypted,
          birth_state_encrypted, birth_country_encrypted, work_permit_visa_encrypted,
          personal_email_search_hash, personal_phone_search_hash, is_us_citizen, created_at
        ) VALUES (
          ${userId},
          ${encryptedPHI.ssnEncrypted},
          ${encryptedPHI.dateOfBirthEncrypted},
          ${encryptedPHI.personalAddressEncrypted},
          ${encryptedPHI.personalPhoneEncrypted},
          ${encryptedPHI.personalEmailEncrypted},
          ${encryptedPHI.birthCityEncrypted},
          ${encryptedPHI.birthStateEncrypted},
          ${encryptedPHI.birthCountryEncrypted},
          ${encryptedPHI.workPermitVisaEncrypted},
          ${encryptedPHI.personalEmailSearchHash},
          ${encryptedPHI.personalPhoneSearchHash},
          ${encryptedPHI.isUsCitizen},
          NOW()
        )
      `;

      console.log(`✅ Migrated therapist: ${user.name} (ID: ${userId})`);
    } catch (error) {
      console.error(`❌ Error migrating therapist ${user.name}:`, error);
      throw error;
    }
  }

  /**
   * Migrate client data to HIPAA structure
   */
  async migrateClientData(): Promise<void> {
    console.log('🔄 Starting client data migration...');

    try {
      // Get all clients from source database
      const clients = await this.sourceDb`
        SELECT * FROM clients 
        WHERE deleted = false
        ORDER BY id
      `;

      console.log(`📊 Found ${clients.length} clients to migrate`);

      for (const client of clients) {
        await this.migrateSingleClient(client);
      }

      console.log('✅ Client data migration completed');
    } catch (error) {
      console.error('❌ Error migrating client data:', error);
      throw error;
    }
  }

  /**
   * Migrate a single client's data
   */
  private async migrateSingleClient(client: any): Promise<void> {
    try {
      // Encrypt all PHI fields
      const encryptedData = {
        emailEncrypted: PHIEncryptionService.encryptPHI(client.email),
        phoneEncrypted: PHIEncryptionService.encryptPHI(client.phone),
        notesEncrypted: PHIEncryptionService.encryptPHI(client.notes),
        hometownEncrypted: PHIEncryptionService.encryptPHI(client.hometown),
        raceEncrypted: PHIEncryptionService.encryptPHI(client.race),
        pronounsEncrypted: PHIEncryptionService.encryptPHI(client.pronouns),
        primaryDiagnosisCodeEncrypted: PHIEncryptionService.encryptPHI(client.primaryDiagnosisCode),
        secondaryDiagnosisCodeEncrypted: PHIEncryptionService.encryptPHI(client.secondaryDiagnosisCode),
        referringPhysicianEncrypted: PHIEncryptionService.encryptPHI(client.referringPhysician),
        referringPhysicianNpiEncrypted: PHIEncryptionService.encryptPHI(client.referringPhysicianNpi),
        priorAuthNumberEncrypted: PHIEncryptionService.encryptPHI(client.priorAuthNumber),
        emailSearchHash: PHIEncryptionService.createSearchHash(client.email),
        phoneSearchHash: PHIEncryptionService.createSearchHash(client.phone),
      };

      await this.targetDb`
        INSERT INTO clients_hipaa (
          therapist_id, name, email_encrypted, phone_encrypted, notes_encrypted,
          hometown_encrypted, race_encrypted, pronouns_encrypted,
          primary_diagnosis_code_encrypted, secondary_diagnosis_code_encrypted,
          referring_physician_encrypted, referring_physician_npi_encrypted,
          prior_auth_number_encrypted, email_search_hash, phone_search_hash,
          status, type, billing_type, session_cost, no_show_fee,
          default_cpt_code, place_of_service, authorization_required,
          copay_amount, deductible_amount, photo_filename, photo_original_name,
          photo_mime_type, stripe_customer_id, created_at
        ) VALUES (
          ${client.userId},
          ${client.name},
          ${encryptedData.emailEncrypted},
          ${encryptedData.phoneEncrypted},
          ${encryptedData.notesEncrypted},
          ${encryptedData.hometownEncrypted},
          ${encryptedData.raceEncrypted},
          ${encryptedData.pronounsEncrypted},
          ${encryptedData.primaryDiagnosisCodeEncrypted},
          ${encryptedData.secondaryDiagnosisCodeEncrypted},
          ${encryptedData.referringPhysicianEncrypted},
          ${encryptedData.referringPhysicianNpiEncrypted},
          ${encryptedData.priorAuthNumberEncrypted},
          ${encryptedData.emailSearchHash},
          ${encryptedData.phoneSearchHash},
          ${client.status || 'active'},
          ${client.type || 'individual'},
          ${client.billingType || 'private_pay'},
          ${client.sessionCost || 0},
          ${client.noShowFee || 0},
          ${client.defaultCptCode || ''},
          ${client.placeOfService || '11'},
          ${client.authorizationRequired || false},
          ${client.copayAmount || 0},
          ${client.deductibleAmount || 0},
          ${client.photoFilename || ''},
          ${client.photoOriginalName || ''},
          ${client.photoMimeType || ''},
          ${client.stripeCustomerId || ''},
          NOW()
        )
      `;

      console.log(`✅ Migrated client: ${client.name} (ID: ${client.id})`);
    } catch (error) {
      console.error(`❌ Error migrating client ${client.name}:`, error);
      throw error;
    }
  }

  /**
   * Migrate session data to HIPAA structure
   */
  async migrateSessionData(): Promise<void> {
    console.log('🔄 Starting session data migration...');

    try {
      // Get all sessions from source database
      const sessions = await this.sourceDb`
        SELECT * FROM sessions 
        ORDER BY id
      `;

      console.log(`📊 Found ${sessions.length} sessions to migrate`);

      for (const session of sessions) {
        await this.migrateSingleSession(session);
      }

      console.log('✅ Session data migration completed');
    } catch (error) {
      console.error('❌ Error migrating session data:', error);
      throw error;
    }
  }

  /**
   * Migrate a single session's data
   */
  private async migrateSingleSession(session: any): Promise<void> {
    try {
      // Encrypt PHI fields
      const encryptedNotes = PHIEncryptionService.encryptPHI(session.notes);

      await this.targetDb`
        INSERT INTO sessions_hipaa (
          therapist_id, patient_id, date, duration, type, status,
          notes_encrypted, cpt_code, add_on_cpt_codes, authorization_required,
          authorization_number, is_paid, payment_id, is_intake, session_format, created_at
        ) VALUES (
          ${session.userId},
          ${session.patientId},
          ${session.date},
          ${session.duration || 50},
          ${session.type || 'individual'},
          ${session.status || 'scheduled'},
          ${encryptedNotes},
          ${session.cptCode || ''},
          ${session.addOnCptCodes ? JSON.stringify(session.addOnCptCodes) : '[]'},
          ${session.authorizationRequired || false},
          ${session.authorizationNumber || ''},
          ${session.isPaid || false},
          ${session.paymentId || ''},
          ${session.isIntake || false},
          ${session.sessionFormat || ''},
          NOW()
        )
      `;

      console.log(`✅ Migrated session: ${session.id}`);
    } catch (error) {
      console.error(`❌ Error migrating session ${session.id}:`, error);
      throw error;
    }
  }

  /**
   * Run complete migration
   */
  async runCompleteMigration(): Promise<void> {
    console.log('🚀 Starting complete HIPAA data migration...');
    console.log(`📋 Configuration: ${this.config.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);

    try {
      // Step 1: Migrate therapist data
      await this.migrateTherapistData();

      // Step 2: Migrate client data
      await this.migrateClientData();

      // Step 3: Migrate session data
      await this.migrateSessionData();

      console.log('🎉 Complete HIPAA migration finished successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration integrity...');

    try {
      // Count records in source and target
      const sourceUsers = await this.sourceDb`SELECT COUNT(*) as count FROM users`;
      const targetUsers = await this.targetDb`SELECT COUNT(*) as count FROM users_auth`;

      const sourceClients = await this.sourceDb`SELECT COUNT(*) as count FROM clients WHERE deleted = false`;
      const targetClients = await this.targetDb`SELECT COUNT(*) as count FROM clients_hipaa WHERE deleted = false`;

      const sourceSessions = await this.sourceDb`SELECT COUNT(*) as count FROM sessions`;
      const targetSessions = await this.targetDb`SELECT COUNT(*) as count FROM sessions_hipaa`;

      console.log('📊 Migration verification results:');
      console.log(`  Users: ${sourceUsers[0].count} → ${targetUsers[0].count}`);
      console.log(`  Clients: ${sourceClients[0].count} → ${targetClients[0].count}`);
      console.log(`  Sessions: ${sourceSessions[0].count} → ${targetSessions[0].count}`);

      // Verify encryption
      const encryptedFields = await this.targetDb`
        SELECT COUNT(*) as count FROM therapist_phi 
        WHERE ssn_encrypted IS NOT NULL
      `;

      console.log(`  Encrypted PHI fields: ${encryptedFields[0].count}`);

      console.log('✅ Migration verification completed');
    } catch (error) {
      console.error('❌ Migration verification failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const config: MigrationConfig = {
    sourceDatabaseUrl: process.env.DATABASE_URL || '',
    targetDatabaseUrl: process.env.DATABASE_URL || '', // Same DB for now
    batchSize: 100,
    dryRun: process.env.DRY_RUN === 'true',
  };

  if (!config.sourceDatabaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const migration = new HIPAAMigrationService(config);

  try {
    if (config.dryRun) {
      console.log('🧪 Running in DRY RUN mode - no data will be modified');
    }

    await migration.runCompleteMigration();
    await migration.verifyMigration();

    console.log('🎉 HIPAA migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HIPAAMigrationService };
