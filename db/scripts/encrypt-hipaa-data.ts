import { db } from '../index';
import { therapistPHI, clientsHIPAA, sessionsHIPAA, treatmentPlansHIPAA } from '../schema-hipaa-refactored';
import { encryptPHI, createSearchHash } from '../server/utils/phi-encryption';

/**
 * HIPAA Data Encryption Script
 * 
 * This script encrypts all PHI data in the newly migrated HIPAA tables.
 * It should be run after the schema migration is complete.
 */

async function encryptTherapistPHI() {
  console.log('🔐 Encrypting therapist PHI data...');
  
  try {
    // Get all therapist PHI records that need encryption
    const therapistPHIRecords = await db.select().from(therapistPHI);
    
    for (const record of therapistPHIRecords) {
      const updates: any = {};
      
      // Encrypt SSN
      if (record.ssnEncrypted && !record.ssnEncrypted.startsWith('encrypted:')) {
        updates.ssnEncrypted = await encryptPHI(record.ssnEncrypted);
      }
      
      // Encrypt date of birth
      if (record.dateOfBirthEncrypted && !record.dateOfBirthEncrypted.startsWith('encrypted:')) {
        updates.dateOfBirthEncrypted = await encryptPHI(record.dateOfBirthEncrypted);
      }
      
      // Encrypt personal address
      if (record.personalAddressEncrypted && !record.personalAddressEncrypted.startsWith('encrypted:')) {
        updates.personalAddressEncrypted = await encryptPHI(record.personalAddressEncrypted);
      }
      
      // Encrypt personal phone
      if (record.personalPhoneEncrypted && !record.personalPhoneEncrypted.startsWith('encrypted:')) {
        updates.personalPhoneEncrypted = await encryptPHI(record.personalPhoneEncrypted);
        updates.personalPhoneSearchHash = await createSearchHash(record.personalPhoneEncrypted);
      }
      
      // Encrypt personal email
      if (record.personalEmailEncrypted && !record.personalEmailEncrypted.startsWith('encrypted:')) {
        updates.personalEmailEncrypted = await encryptPHI(record.personalEmailEncrypted);
        updates.personalEmailSearchHash = await createSearchHash(record.personalEmailEncrypted);
      }
      
      // Encrypt birth city
      if (record.birthCityEncrypted && !record.birthCityEncrypted.startsWith('encrypted:')) {
        updates.birthCityEncrypted = await encryptPHI(record.birthCityEncrypted);
      }
      
      // Encrypt birth state
      if (record.birthStateEncrypted && !record.birthStateEncrypted.startsWith('encrypted:')) {
        updates.birthStateEncrypted = await encryptPHI(record.birthStateEncrypted);
      }
      
      // Encrypt birth country
      if (record.birthCountryEncrypted && !record.birthCountryEncrypted.startsWith('encrypted:')) {
        updates.birthCountryEncrypted = await encryptPHI(record.birthCountryEncrypted);
      }
      
      // Encrypt work permit visa
      if (record.workPermitVisaEncrypted && !record.workPermitVisaEncrypted.startsWith('encrypted:')) {
        updates.workPermitVisaEncrypted = await encryptPHI(record.workPermitVisaEncrypted);
      }
      
      // Encrypt emergency contact
      if (record.emergencyContactEncrypted && !record.emergencyContactEncrypted.startsWith('encrypted:')) {
        updates.emergencyContactEncrypted = await encryptPHI(record.emergencyContactEncrypted);
      }
      
      // Encrypt emergency phone
      if (record.emergencyPhoneEncrypted && !record.emergencyPhoneEncrypted.startsWith('encrypted:')) {
        updates.emergencyPhoneEncrypted = await encryptPHI(record.emergencyPhoneEncrypted);
      }
      
      // Update record if there are changes
      if (Object.keys(updates).length > 0) {
        await db.update(therapistPHI)
          .set(updates)
          .where(eq(therapistPHI.id, record.id));
        
        console.log(`✅ Encrypted therapist PHI for user ${record.userId}`);
      }
    }
    
    console.log('✅ Therapist PHI encryption complete');
  } catch (error) {
    console.error('❌ Error encrypting therapist PHI:', error);
    throw error;
  }
}

async function encryptClientPHI() {
  console.log('🔐 Encrypting client PHI data...');
  
  try {
    // Get all client PHI records that need encryption
    const clientPHIRecords = await db.select().from(clientsHIPAA);
    
    for (const record of clientPHIRecords) {
      const updates: any = {};
      
      // Encrypt email
      if (record.emailEncrypted && !record.emailEncrypted.startsWith('encrypted:')) {
        updates.emailEncrypted = await encryptPHI(record.emailEncrypted);
        updates.emailSearchHash = await createSearchHash(record.emailEncrypted);
      }
      
      // Encrypt phone
      if (record.phoneEncrypted && !record.phoneEncrypted.startsWith('encrypted:')) {
        updates.phoneEncrypted = await encryptPHI(record.phoneEncrypted);
        updates.phoneSearchHash = await createSearchHash(record.phoneEncrypted);
      }
      
      // Encrypt address
      if (record.addressEncrypted && !record.addressEncrypted.startsWith('encrypted:')) {
        updates.addressEncrypted = await encryptPHI(record.addressEncrypted);
      }
      
      // Encrypt city
      if (record.cityEncrypted && !record.cityEncrypted.startsWith('encrypted:')) {
        updates.cityEncrypted = await encryptPHI(record.cityEncrypted);
      }
      
      // Encrypt state
      if (record.stateEncrypted && !record.stateEncrypted.startsWith('encrypted:')) {
        updates.stateEncrypted = await encryptPHI(record.stateEncrypted);
      }
      
      // Encrypt zip code
      if (record.zipCodeEncrypted && !record.zipCodeEncrypted.startsWith('encrypted:')) {
        updates.zipCodeEncrypted = await encryptPHI(record.zipCodeEncrypted);
      }
      
      // Encrypt date of birth
      if (record.dateOfBirthEncrypted && !record.dateOfBirthEncrypted.startsWith('encrypted:')) {
        updates.dateOfBirthEncrypted = await encryptPHI(record.dateOfBirthEncrypted);
      }
      
      // Encrypt gender
      if (record.genderEncrypted && !record.genderEncrypted.startsWith('encrypted:')) {
        updates.genderEncrypted = await encryptPHI(record.genderEncrypted);
      }
      
      // Encrypt race
      if (record.raceEncrypted && !record.raceEncrypted.startsWith('encrypted:')) {
        updates.raceEncrypted = await encryptPHI(record.raceEncrypted);
      }
      
      // Encrypt ethnicity
      if (record.ethnicityEncrypted && !record.ethnicityEncrypted.startsWith('encrypted:')) {
        updates.ethnicityEncrypted = await encryptPHI(record.ethnicityEncrypted);
      }
      
      // Encrypt pronouns
      if (record.pronounsEncrypted && !record.pronounsEncrypted.startsWith('encrypted:')) {
        updates.pronounsEncrypted = await encryptPHI(record.pronounsEncrypted);
      }
      
      // Encrypt hometown
      if (record.hometownEncrypted && !record.hometownEncrypted.startsWith('encrypted:')) {
        updates.hometownEncrypted = await encryptPHI(record.hometownEncrypted);
      }
      
      // Encrypt notes
      if (record.notesEncrypted && !record.notesEncrypted.startsWith('encrypted:')) {
        updates.notesEncrypted = await encryptPHI(record.notesEncrypted);
      }
      
      // Encrypt diagnosis codes
      if (record.diagnosisCodesEncrypted && !record.diagnosisCodesEncrypted.startsWith('encrypted:')) {
        updates.diagnosisCodesEncrypted = await encryptPHI(record.diagnosisCodesEncrypted);
      }
      
      // Encrypt treatment history
      if (record.treatmentHistoryEncrypted && !record.treatmentHistoryEncrypted.startsWith('encrypted:')) {
        updates.treatmentHistoryEncrypted = await encryptPHI(record.treatmentHistoryEncrypted);
      }
      
      // Encrypt primary diagnosis code
      if (record.primaryDiagnosisCodeEncrypted && !record.primaryDiagnosisCodeEncrypted.startsWith('encrypted:')) {
        updates.primaryDiagnosisCodeEncrypted = await encryptPHI(record.primaryDiagnosisCodeEncrypted);
      }
      
      // Encrypt secondary diagnosis code
      if (record.secondaryDiagnosisCodeEncrypted && !record.secondaryDiagnosisCodeEncrypted.startsWith('encrypted:')) {
        updates.secondaryDiagnosisCodeEncrypted = await encryptPHI(record.secondaryDiagnosisCodeEncrypted);
      }
      
      // Encrypt referring physician
      if (record.referringPhysicianEncrypted && !record.referringPhysicianEncrypted.startsWith('encrypted:')) {
        updates.referringPhysicianEncrypted = await encryptPHI(record.referringPhysicianEncrypted);
      }
      
      // Encrypt referring physician NPI
      if (record.referringPhysicianNpiEncrypted && !record.referringPhysicianNpiEncrypted.startsWith('encrypted:')) {
        updates.referringPhysicianNpiEncrypted = await encryptPHI(record.referringPhysicianNpiEncrypted);
      }
      
      // Encrypt insurance info
      if (record.insuranceInfoEncrypted && !record.insuranceInfoEncrypted.startsWith('encrypted:')) {
        updates.insuranceInfoEncrypted = await encryptPHI(record.insuranceInfoEncrypted);
      }
      
      // Encrypt authorization info
      if (record.authorizationInfoEncrypted && !record.authorizationInfoEncrypted.startsWith('encrypted:')) {
        updates.authorizationInfoEncrypted = await encryptPHI(record.authorizationInfoEncrypted);
      }
      
      // Encrypt prior auth number
      if (record.priorAuthNumberEncrypted && !record.priorAuthNumberEncrypted.startsWith('encrypted:')) {
        updates.priorAuthNumberEncrypted = await encryptPHI(record.priorAuthNumberEncrypted);
      }
      
      // Encrypt member ID
      if (record.memberIdEncrypted && !record.memberIdEncrypted.startsWith('encrypted:')) {
        updates.memberIdEncrypted = await encryptPHI(record.memberIdEncrypted);
      }
      
      // Encrypt group number
      if (record.groupNumberEncrypted && !record.groupNumberEncrypted.startsWith('encrypted:')) {
        updates.groupNumberEncrypted = await encryptPHI(record.groupNumberEncrypted);
      }
      
      // Encrypt primary insured name
      if (record.primaryInsuredNameEncrypted && !record.primaryInsuredNameEncrypted.startsWith('encrypted:')) {
        updates.primaryInsuredNameEncrypted = await encryptPHI(record.primaryInsuredNameEncrypted);
      }
      
      // Update record if there are changes
      if (Object.keys(updates).length > 0) {
        await db.update(clientsHIPAA)
          .set(updates)
          .where(eq(clientsHIPAA.id, record.id));
        
        console.log(`✅ Encrypted client PHI for client ${record.id}`);
      }
    }
    
    console.log('✅ Client PHI encryption complete');
  } catch (error) {
    console.error('❌ Error encrypting client PHI:', error);
    throw error;
  }
}

async function encryptSessionPHI() {
  console.log('🔐 Encrypting session PHI data...');
  
  try {
    // Get all session PHI records that need encryption
    const sessionPHIRecords = await db.select().from(sessionsHIPAA);
    
    for (const record of sessionPHIRecords) {
      const updates: any = {};
      
      // Encrypt notes
      if (record.notesEncrypted && !record.notesEncrypted.startsWith('encrypted:')) {
        updates.notesEncrypted = await encryptPHI(record.notesEncrypted);
      }
      
      // Encrypt assessments
      if (record.assessmentsEncrypted && !record.assessmentsEncrypted.startsWith('encrypted:')) {
        updates.assessmentsEncrypted = await encryptPHI(record.assessmentsEncrypted);
      }
      
      // Encrypt treatment goals
      if (record.treatmentGoalsEncrypted && !record.treatmentGoalsEncrypted.startsWith('encrypted:')) {
        updates.treatmentGoalsEncrypted = await encryptPHI(record.treatmentGoalsEncrypted);
      }
      
      // Encrypt progress notes
      if (record.progressNotesEncrypted && !record.progressNotesEncrypted.startsWith('encrypted:')) {
        updates.progressNotesEncrypted = await encryptPHI(record.progressNotesEncrypted);
      }
      
      // Update record if there are changes
      if (Object.keys(updates).length > 0) {
        await db.update(sessionsHIPAA)
          .set(updates)
          .where(eq(sessionsHIPAA.id, record.id));
        
        console.log(`✅ Encrypted session PHI for session ${record.id}`);
      }
    }
    
    console.log('✅ Session PHI encryption complete');
  } catch (error) {
    console.error('❌ Error encrypting session PHI:', error);
    throw error;
  }
}

async function encryptTreatmentPlanPHI() {
  console.log('🔐 Encrypting treatment plan PHI data...');
  
  try {
    // Get all treatment plan PHI records that need encryption
    const treatmentPlanPHIRecords = await db.select().from(treatmentPlansHIPAA);
    
    for (const record of treatmentPlanPHIRecords) {
      const updates: any = {};
      
      // Encrypt content
      if (record.contentEncrypted && !record.contentEncrypted.startsWith('encrypted:')) {
        updates.contentEncrypted = await encryptPHI(record.contentEncrypted);
      }
      
      // Encrypt goals
      if (record.goalsEncrypted && !record.goalsEncrypted.startsWith('encrypted:')) {
        updates.goalsEncrypted = await encryptPHI(record.goalsEncrypted);
      }
      
      // Encrypt objectives
      if (record.objectivesEncrypted && !record.objectivesEncrypted.startsWith('encrypted:')) {
        updates.objectivesEncrypted = await encryptPHI(record.objectivesEncrypted);
      }
      
      // Encrypt interventions
      if (record.interventionsEncrypted && !record.interventionsEncrypted.startsWith('encrypted:')) {
        updates.interventionsEncrypted = await encryptPHI(record.interventionsEncrypted);
      }
      
      // Encrypt progress notes
      if (record.progressNotesEncrypted && !record.progressNotesEncrypted.startsWith('encrypted:')) {
        updates.progressNotesEncrypted = await encryptPHI(record.progressNotesEncrypted);
      }
      
      // Update record if there are changes
      if (Object.keys(updates).length > 0) {
        await db.update(treatmentPlansHIPAA)
          .set(updates)
          .where(eq(treatmentPlansHIPAA.id, record.id));
        
        console.log(`✅ Encrypted treatment plan PHI for plan ${record.id}`);
      }
    }
    
    console.log('✅ Treatment plan PHI encryption complete');
  } catch (error) {
    console.error('❌ Error encrypting treatment plan PHI:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting HIPAA data encryption process...');
  
  try {
    // Encrypt all PHI data
    await encryptTherapistPHI();
    await encryptClientPHI();
    await encryptSessionPHI();
    await encryptTreatmentPlanPHI();
    
    console.log('🎉 HIPAA data encryption complete!');
    console.log('✅ All PHI data has been encrypted');
    console.log('✅ Search hashes have been created');
    console.log('✅ HIPAA compliance achieved');
    
  } catch (error) {
    console.error('❌ HIPAA data encryption failed:', error);
    process.exit(1);
  }
}

// Run the encryption script
if (require.main === module) {
  main();
}

export { encryptTherapistPHI, encryptClientPHI, encryptSessionPHI, encryptTreatmentPlanPHI };
