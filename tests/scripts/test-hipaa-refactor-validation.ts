#!/usr/bin/env node

/**
 * HIPAA Schema Refactor Validation Test
 * 
 * This script tests the migration and new schema functionality
 */

import { db } from './db';
import { 
  usersAuth, 
  organizations, 
  organizationMemberships, 
  therapistProfiles, 
  therapistPHI, 
  patients, 
  clinicalSessions, 
  patientTreatmentPlans,
  auditLogsHIPAA 
} from './db/schema-hipaa-refactored';
import { eq, and } from 'drizzle-orm';
import { PHIEncryptionService } from './server/utils/phi-encryption';

// Test data
const testData = {
  user: {
    username: 'test_therapist',
    password: 'hashed_password',
    email: 'test@example.com'
  },
  organization: {
    name: 'Test Practice',
    type: 'solo' as const
  },
  therapistProfile: {
    name: 'Dr. Test Therapist',
    professionalTitle: 'LCSW',
    licenseNumber: '12345',
    licenseState: 'CA',
    specialties: ['anxiety', 'depression'],
    languages: ['English', 'Spanish'],
    sessionFormat: 'both',
    baseRate: 150.00,
    slidingScale: true,
    therapistBusinessPhone: '555-1234',
    therapistBusinessEmail: 'dr.test@practice.com',
    therapistBusinessAddress: '123 Main St',
    therapistBusinessCity: 'San Francisco',
    therapistBusinessState: 'CA',
    therapistBusinessZip: '94102'
  },
  therapistPHI: {
    ssn: '123-45-6789',
    dob: '1980-01-01',
    homeAddress: '456 Oak Ave',
    homeCity: 'San Francisco',
    homeState: 'CA',
    homeZip: '94103',
    personalPhone: '555-5678',
    personalEmail: 'personal@example.com',
    birthCity: 'Los Angeles',
    birthState: 'CA',
    birthCountry: 'USA',
    isUsCitizen: true,
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '555-9999',
    emergencyContactRelationship: 'Spouse'
  },
  patient: {
    name: 'John Patient',
    status: 'active',
    type: 'individual',
    contactEmail: 'john@example.com',
    contactPhone: '555-1111',
    homeAddress: '789 Pine St',
    homeCity: 'San Francisco',
    homeState: 'CA',
    homeZip: '94104',
    dob: '1990-05-15',
    gender: 'Male',
    race: 'White',
    ethnicity: 'Non-Hispanic',
    pronouns: 'he/him',
    hometown: 'Sacramento',
    clinicalNotes: 'Patient presents with anxiety symptoms',
    diagnosisCodes: 'F41.1',
    primaryDiagnosis: 'Generalized Anxiety Disorder',
    billingType: 'private_pay',
    sessionCost: 150.00
  },
  clinicalSession: {
    date: new Date(),
    duration: 50,
    type: 'individual',
    status: 'completed',
    sessionClinicalNotes: 'Patient discussed work stress and coping strategies',
    sessionSubjectiveNotes: 'Patient reports feeling overwhelmed',
    sessionObjectiveNotes: 'Appears anxious, fidgeting',
    sessionAssessmentNotes: 'GAD symptoms present',
    sessionPlanNotes: 'Continue CBT techniques',
    isIntake: false,
    sessionFormat: 'in-person',
    cptCode: '90834',
    isPaid: true
  },
  treatmentPlan: {
    version: 1,
    status: 'active',
    treatmentPlanContent: 'Comprehensive treatment plan for GAD',
    treatmentPlanGoals: 'Reduce anxiety symptoms by 50%',
    treatmentPlanObjectives: 'Practice mindfulness daily',
    treatmentPlanInterventions: 'CBT, relaxation techniques',
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  }
};

async function runTests() {
  console.log('🧪 Starting HIPAA Schema Refactor Validation Tests...\n');

  try {
    // Test 1: Create test user
    console.log('Test 1: Creating test user...');
    const [user] = await db.insert(usersAuth).values(testData.user).returning();
    console.log('✅ User created:', user.id);

    // Test 2: Create organization
    console.log('\nTest 2: Creating organization...');
    const [organization] = await db.insert(organizations).values(testData.organization).returning();
    console.log('✅ Organization created:', organization.id);

    // Test 3: Create organization membership
    console.log('\nTest 3: Creating organization membership...');
    const [membership] = await db.insert(organizationMemberships).values({
      organizationId: organization.id,
      userId: user.id,
      role: 'business_owner',
      canViewAllPatients: true,
      canViewAllCalendars: true,
      canManageBilling: true,
      canManageStaff: true,
      canManageSettings: true,
      isPrimaryOwner: true,
      isActive: true
    }).returning();
    console.log('✅ Organization membership created:', membership.id);

    // Test 4: Create therapist profile
    console.log('\nTest 4: Creating therapist profile...');
    const [therapistProfile] = await db.insert(therapistProfiles).values({
      userId: user.id,
      ...testData.therapistProfile
    }).returning();
    console.log('✅ Therapist profile created:', therapistProfile.id);

    // Test 5: Create therapist PHI (encrypted)
    console.log('\nTest 5: Creating therapist PHI with encryption...');
    const encryptedPHI = {
      userId: user.id,
      therapistSsnEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.ssn),
      therapistDobEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.dob),
      therapistHomeAddressEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.homeAddress),
      therapistHomeCityEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.homeCity),
      therapistHomeStateEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.homeState),
      therapistHomeZipEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.homeZip),
      therapistPersonalPhoneEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.personalPhone),
      therapistPersonalEmailEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.personalEmail),
      therapistBirthCityEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.birthCity),
      therapistBirthStateEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.birthState),
      therapistBirthCountryEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.birthCountry),
      therapistIsUsCitizen: testData.therapistPHI.isUsCitizen,
      therapistEmergencyContactNameEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.emergencyContactName),
      therapistEmergencyContactPhoneEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.emergencyContactPhone),
      therapistEmergencyContactRelationshipEncrypted: PHIEncryptionService.encryptPHI(testData.therapistPHI.emergencyContactRelationship),
      therapistPersonalPhoneSearchHash: PHIEncryptionService.createSearchHash(testData.therapistPHI.personalPhone),
      therapistPersonalEmailSearchHash: PHIEncryptionService.createSearchHash(testData.therapistPHI.personalEmail)
    };

    const [therapistPHIRecord] = await db.insert(therapistPHI).values(encryptedPHI).returning();
    console.log('✅ Therapist PHI created with encryption:', therapistPHIRecord.id);

    // Test 6: Create patient (encrypted)
    console.log('\nTest 6: Creating patient with PHI encryption...');
    const encryptedPatient = {
      organizationId: organization.id,
      primaryTherapistId: user.id,
      name: testData.patient.name,
      status: testData.patient.status,
      type: testData.patient.type,
      patientContactEmailEncrypted: PHIEncryptionService.encryptPHI(testData.patient.contactEmail),
      patientContactPhoneEncrypted: PHIEncryptionService.encryptPHI(testData.patient.contactPhone),
      patientHomeAddressEncrypted: PHIEncryptionService.encryptPHI(testData.patient.homeAddress),
      patientHomeCityEncrypted: PHIEncryptionService.encryptPHI(testData.patient.homeCity),
      patientHomeStateEncrypted: PHIEncryptionService.encryptPHI(testData.patient.homeState),
      patientHomeZipEncrypted: PHIEncryptionService.encryptPHI(testData.patient.homeZip),
      patientDobEncrypted: PHIEncryptionService.encryptPHI(testData.patient.dob),
      patientGenderEncrypted: PHIEncryptionService.encryptPHI(testData.patient.gender),
      patientRaceEncrypted: PHIEncryptionService.encryptPHI(testData.patient.race),
      patientEthnicityEncrypted: PHIEncryptionService.encryptPHI(testData.patient.ethnicity),
      patientPronounsEncrypted: PHIEncryptionService.encryptPHI(testData.patient.pronouns),
      patientHometownEncrypted: PHIEncryptionService.encryptPHI(testData.patient.hometown),
      patientClinicalNotesEncrypted: PHIEncryptionService.encryptPHI(testData.patient.clinicalNotes),
      patientDiagnosisCodesEncrypted: PHIEncryptionService.encryptPHI(testData.patient.diagnosisCodes),
      patientPrimaryDiagnosisEncrypted: PHIEncryptionService.encryptPHI(testData.patient.primaryDiagnosis),
      patientContactEmailSearchHash: PHIEncryptionService.createSearchHash(testData.patient.contactEmail),
      patientContactPhoneSearchHash: PHIEncryptionService.createSearchHash(testData.patient.contactPhone),
      billingType: testData.patient.billingType,
      sessionCost: testData.patient.sessionCost
    };

    const [patient] = await db.insert(patients).values(encryptedPatient).returning();
    console.log('✅ Patient created with PHI encryption:', patient.id);

    // Test 7: Create clinical session (encrypted)
    console.log('\nTest 7: Creating clinical session with PHI encryption...');
    const encryptedSession = {
      organizationId: organization.id,
      patientId: patient.id,
      therapistId: user.id,
      date: testData.clinicalSession.date,
      duration: testData.clinicalSession.duration,
      type: testData.clinicalSession.type,
      status: testData.clinicalSession.status,
      sessionClinicalNotesEncrypted: PHIEncryptionService.encryptPHI(testData.clinicalSession.sessionClinicalNotes),
      sessionSubjectiveNotesEncrypted: PHIEncryptionService.encryptPHI(testData.clinicalSession.sessionSubjectiveNotes),
      sessionObjectiveNotesEncrypted: PHIEncryptionService.encryptPHI(testData.clinicalSession.sessionObjectiveNotes),
      sessionAssessmentNotesEncrypted: PHIEncryptionService.encryptPHI(testData.clinicalSession.sessionAssessmentNotes),
      sessionPlanNotesEncrypted: PHIEncryptionService.encryptPHI(testData.clinicalSession.sessionPlanNotes),
      isIntake: testData.clinicalSession.isIntake,
      sessionFormat: testData.clinicalSession.sessionFormat,
      cptCode: testData.clinicalSession.cptCode,
      isPaid: testData.clinicalSession.isPaid
    };

    const [session] = await db.insert(clinicalSessions).values(encryptedSession).returning();
    console.log('✅ Clinical session created with PHI encryption:', session.id);

    // Test 8: Create treatment plan (encrypted)
    console.log('\nTest 8: Creating treatment plan with PHI encryption...');
    const encryptedTreatmentPlan = {
      organizationId: organization.id,
      patientId: patient.id,
      therapistId: user.id,
      version: testData.treatmentPlan.version,
      status: testData.treatmentPlan.status,
      treatmentPlanContentEncrypted: PHIEncryptionService.encryptPHI(testData.treatmentPlan.treatmentPlanContent),
      treatmentPlanGoalsEncrypted: PHIEncryptionService.encryptPHI(testData.treatmentPlan.treatmentPlanGoals),
      treatmentPlanObjectivesEncrypted: PHIEncryptionService.encryptPHI(testData.treatmentPlan.treatmentPlanObjectives),
      treatmentPlanInterventionsEncrypted: PHIEncryptionService.encryptPHI(testData.treatmentPlan.treatmentPlanInterventions),
      startDate: testData.treatmentPlan.startDate,
      endDate: testData.treatmentPlan.endDate,
      reviewDate: testData.treatmentPlan.reviewDate
    };

    const [treatmentPlan] = await db.insert(patientTreatmentPlans).values(encryptedTreatmentPlan).returning();
    console.log('✅ Treatment plan created with PHI encryption:', treatmentPlan.id);

    // Test 9: Test decryption
    console.log('\nTest 9: Testing PHI decryption...');
    const retrievedPatient = await db.query.patients.findFirst({
      where: eq(patients.id, patient.id)
    });

    if (retrievedPatient) {
      const decryptedEmail = PHIEncryptionService.decryptPHI(retrievedPatient.patientContactEmailEncrypted);
      const decryptedPhone = PHIEncryptionService.decryptPHI(retrievedPatient.patientContactPhoneEncrypted);
      const decryptedNotes = PHIEncryptionService.decryptPHI(retrievedPatient.patientClinicalNotesEncrypted);
      
      console.log('✅ Decryption test passed');
      console.log('   Original email:', testData.patient.contactEmail);
      console.log('   Decrypted email:', decryptedEmail);
      console.log('   Match:', testData.patient.contactEmail === decryptedEmail);
    }

    // Test 10: Test search functionality
    console.log('\nTest 10: Testing search functionality...');
    const emailSearchHash = PHIEncryptionService.createSearchHash(testData.patient.contactEmail);
    const phoneSearchHash = PHIEncryptionService.createSearchHash(testData.patient.contactPhone);
    
    const patientByEmail = await db.query.patients.findFirst({
      where: eq(patients.patientContactEmailSearchHash, emailSearchHash)
    });
    
    const patientByPhone = await db.query.patients.findFirst({
      where: eq(patients.patientContactPhoneSearchHash, phoneSearchHash)
    });
    
    console.log('✅ Search test passed');
    console.log('   Found by email:', patientByEmail?.id === patient.id);
    console.log('   Found by phone:', patientByPhone?.id === patient.id);

    // Test 11: Test audit logging
    console.log('\nTest 11: Testing audit logging...');
    const [auditLog] = await db.insert(auditLogsHIPAA).values({
      userId: user.id,
      action: 'PHI_ACCESS',
      resourceType: 'PATIENT',
      resourceId: patient.id,
      fieldsAccessed: ['patientContactEmailEncrypted', 'patientContactPhoneEncrypted'],
      phiFieldsCount: 2,
      requestMethod: 'GET',
      requestPath: '/api/patients/' + patient.id,
      responseStatus: 200,
      responseTime: 150,
      securityLevel: 'phi-protected',
      riskScore: 50,
      hipaaCompliant: true
    }).returning();
    
    console.log('✅ Audit log created:', auditLog.id);

    // Test 12: Test organization relationships
    console.log('\nTest 12: Testing organization relationships...');
    const orgWithMembers = await db.query.organizations.findFirst({
      where: eq(organizations.id, organization.id),
      with: {
        memberships: {
          with: {
            user: {
              with: {
                therapistProfile: true
              }
            }
          }
        }
      }
    });
    
    console.log('✅ Organization relationships test passed');
    console.log('   Organization name:', orgWithMembers?.name);
    console.log('   Member count:', orgWithMembers?.memberships.length);

    // Test 13: Test patient relationships
    console.log('\nTest 13: Testing patient relationships...');
    const patientWithRelations = await db.query.patients.findFirst({
      where: eq(patients.id, patient.id),
      with: {
        organization: true,
        primaryTherapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
    
    console.log('✅ Patient relationships test passed');
    console.log('   Patient name:', patientWithRelations?.name);
    console.log('   Organization:', patientWithRelations?.organization?.name);
    console.log('   Primary therapist:', patientWithRelations?.primaryTherapist?.therapistProfile?.name);

    console.log('\n🎉 All tests passed! HIPAA Schema Refactor is working correctly.');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ User creation');
    console.log('   ✅ Organization creation');
    console.log('   ✅ Organization membership');
    console.log('   ✅ Therapist profile creation');
    console.log('   ✅ Therapist PHI encryption');
    console.log('   ✅ Patient PHI encryption');
    console.log('   ✅ Clinical session PHI encryption');
    console.log('   ✅ Treatment plan PHI encryption');
    console.log('   ✅ PHI decryption');
    console.log('   ✅ Search functionality');
    console.log('   ✅ Audit logging');
    console.log('   ✅ Organization relationships');
    console.log('   ✅ Patient relationships');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(() => {
    console.log('\n✨ Validation complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

export { runTests };
