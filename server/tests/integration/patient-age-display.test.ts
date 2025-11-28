import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../../db';
import { patients, usersAuth, organizations, organizationMembers } from '../../../db/schema-hipaa-refactored';
import { PatientService } from '../../services/PatientService';
import { encryptPHI } from '../../utils/phi-encryption';
import { eq } from 'drizzle-orm';

/**
 * Patient Age Display Integration Tests
 * 
 * Tests age computation from DOB with HIPAA Safe Harbor compliance
 * Validates that ages >89 are properly displayed as "90+"
 */

describe('Patient Age Display Integration Tests', () => {
  let testOrganizationId: number;
  let testTherapistId: number;
  let testPatientIds: number[] = [];

  beforeAll(async () => {
    // Create test organization
    const [org] = await db.insert(organizations).values({
      name: 'Age Test Clinic',
      slug: 'age-test-clinic',
      planTier: 'pro'
    }).returning();
    testOrganizationId = org.id;

    // Create test therapist user
    const [therapist] = await db.insert(usersAuth).values({
      username: 'age-test-therapist',
      password: 'hashedpassword',
      email: 'age-therapist@test.com',
      role: 'therapist'
    }).returning();
    testTherapistId = therapist.id;

    // Create organization membership
    await db.insert(organizationMembers).values({
      organizationId: testOrganizationId,
      userId: testTherapistId,
      role: 'therapist',
      canViewAllPatients: true
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testPatientIds.length > 0) {
      await db.delete(patients).where(
        eq(patients.organizationId, testOrganizationId)
      );
    }
    
    if (testTherapistId) {
      await db.delete(organizationMembers).where(
        eq(organizationMembers.userId, testTherapistId)
      );
      await db.delete(usersAuth).where(eq(usersAuth.id, testTherapistId));
    }
    
    if (testOrganizationId) {
      await db.delete(organizations).where(eq(organizations.id, testOrganizationId));
    }
  });

  beforeEach(() => {
    testPatientIds = [];
  });

  describe('Age Computation from DOB', () => {
    it('should compute and display correct age for adult patient', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 42; // 42 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

      // Create patient with DOB
      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Adult Patient 42',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      // Get patient through service (which decrypts and computes age)
      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe(42);
      expect(result.patientDob).toBe(dob);
    });

    it('should compute correct age when birthday has not occurred this year', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 30;
      // Set birthday to next month
      const futureMonth = (today.getMonth() + 2) % 12;
      const futureYear = futureMonth < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
      const dob = `${dobYear}-${String(futureMonth + 1).padStart(2, '0')}-15`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Future Birthday Patient',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      // Age should be 29 since birthday hasn't occurred yet this year
      expect(result.patientAge).toBe(29);
    });

    it('should compute age 0 for infant patients', async () => {
      const today = new Date();
      const dobYear = today.getFullYear();
      const dobMonth = Math.max(0, today.getMonth() - 3); // 3 months ago
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-01`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Infant Patient',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe(0);
    });

    it('should handle patients without DOB gracefully', async () => {
      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'No DOB Patient',
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBeUndefined();
    });
  });

  describe('HIPAA Safe Harbor - Ages >89', () => {
    it('should display age 89 as number, not "90+"', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 89; // Exactly 89 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Patient Age 89',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe(89);
      expect(result.patientAge).not.toBe('90+');
    });

    it('should display age 90 as "90+" per HIPAA Safe Harbor', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 90; // Exactly 90 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Patient Age 90',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe('90+');
    });

    it('should display age 95 as "90+" per HIPAA Safe Harbor', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 95; // 95 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Patient Age 95',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe('90+');
    });

    it('should display age 100+ as "90+" per HIPAA Safe Harbor', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 105; // 105 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Patient Age 105',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe('90+');
    });
  });

  describe('Patient List Age Display', () => {
    it('should compute age for all patients in list', async () => {
      const today = new Date();
      
      // Create multiple patients with different ages
      const patientsData = [
        { name: 'Young Patient', age: 25 },
        { name: 'Middle Aged Patient', age: 55 },
        { name: 'Senior Patient', age: 75 },
        { name: 'Elderly Patient', age: 92 }
      ];

      for (const data of patientsData) {
        const dobYear = today.getFullYear() - data.age;
        const dobMonth = today.getMonth();
        const dobDay = today.getDate();
        const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

        const [patient] = await db.insert(patients).values({
          organizationId: testOrganizationId,
          primaryTherapistId: testTherapistId,
          name: data.name,
          patientDobEncrypted: encryptPHI(dob),
          status: 'active',
          type: 'individual'
        }).returning();
        testPatientIds.push(patient.id);
      }

      // Get all patients through service
      const results = await PatientService.getPatientsForTherapist(
        testTherapistId,
        testTherapistId
      );

      expect(results.length).toBeGreaterThanOrEqual(4);
      
      const youngPatient = results.find(p => p.name === 'Young Patient');
      const middleAgedPatient = results.find(p => p.name === 'Middle Aged Patient');
      const seniorPatient = results.find(p => p.name === 'Senior Patient');
      const elderlyPatient = results.find(p => p.name === 'Elderly Patient');

      expect(youngPatient?.patientAge).toBe(25);
      expect(middleAgedPatient?.patientAge).toBe(55);
      expect(seniorPatient?.patientAge).toBe(75);
      expect(elderlyPatient?.patientAge).toBe('90+'); // >89 → "90+"
    });
  });

  describe('Age Computation Edge Cases', () => {
    it('should handle leap year birthdays correctly', async () => {
      // Create a patient born on Feb 29 (leap year)
      const leapYear = 1992; // Was a leap year
      const dob = '1992-02-29';

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Leap Year Patient',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBeGreaterThan(0);
      expect(typeof result.patientAge === 'number' || result.patientAge === '90+').toBe(true);
    });

    it('should handle very recent birthdays (same month)', async () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 40;
      const dobMonth = today.getMonth();
      const dobDay = Math.max(1, today.getDate() - 5); // 5 days ago
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

      const [patient] = await db.insert(patients).values({
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Recent Birthday Patient',
        patientDobEncrypted: encryptPHI(dob),
        status: 'active',
        type: 'individual'
      }).returning();
      testPatientIds.push(patient.id);

      const result = await PatientService.getPatient(patient.id, testTherapistId);

      expect(result).toBeDefined();
      expect(result.patientAge).toBe(40);
    });
  });

  describe('Name Search Hash Integration', () => {
    it('should create patient with name search hash', async () => {
      const patientData = {
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Search Test Patient',
        contactEmail: 'search@test.com',
        dob: '1985-06-15'
      };

      const result = await PatientService.createPatient(patientData, testTherapistId);
      testPatientIds.push(result.id);

      // Query database directly to verify hash was created
      const [dbPatient] = await db.select()
        .from(patients)
        .where(eq(patients.id, result.id));

      expect(dbPatient.patientNameSearchHash).toBeDefined();
      expect(dbPatient.patientNameSearchHash).not.toBeNull();
    });

    it('should update name search hash when patient name changes', async () => {
      const patientData = {
        organizationId: testOrganizationId,
        primaryTherapistId: testTherapistId,
        name: 'Original Name',
        dob: '1990-01-01'
      };

      const created = await PatientService.createPatient(patientData, testTherapistId);
      testPatientIds.push(created.id);

      // Get original hash
      const [originalPatient] = await db.select()
        .from(patients)
        .where(eq(patients.id, created.id));
      const originalHash = originalPatient.patientNameSearchHash;

      // Update name
      await PatientService.updatePatient(
        created.id,
        { name: 'Updated Name' },
        testTherapistId
      );

      // Get updated hash
      const [updatedPatient] = await db.select()
        .from(patients)
        .where(eq(patients.id, created.id));
      const updatedHash = updatedPatient.patientNameSearchHash;

      expect(updatedHash).toBeDefined();
      expect(updatedHash).not.toBeNull();
      expect(updatedHash).not.toBe(originalHash);
    });
  });
});

