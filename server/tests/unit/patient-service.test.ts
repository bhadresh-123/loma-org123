import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PatientService } from '../../services/PatientService';
import { PatientRepository, OrganizationMembershipRepository, ClinicalSessionRepository, PatientTreatmentPlanRepository, AuditLogRepository } from '../../repositories';
import { encryptPHI, decryptPHI, createSearchHash } from '../../utils/phi-encryption';

/**
 * Patient Service Unit Tests
 * 
 * Comprehensive tests for patient management with HIPAA compliance
 * Tests PHI handling, access control, and audit logging
 */

// Mock repositories
vi.mock('../../repositories', () => ({
  PatientRepository: {
    findByOrganization: vi.fn(),
    findByTherapist: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findBySearchHash: vi.fn()
  },
  OrganizationMembershipRepository: {
    findByUserId: vi.fn(),
    findByOrganizationAndUser: vi.fn()
  },
  ClinicalSessionRepository: {
    findByPatient: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  PatientTreatmentPlanRepository: {
    findByPatient: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  AuditLogRepository: {
    create: vi.fn()
  }
}));

// Mock PHI encryption utilities
vi.mock('../../utils/phi-encryption', () => ({
  encryptPHI: vi.fn((data) => data ? `encrypted_${data}` : null),
  decryptPHI: vi.fn((data) => data ? data.replace('encrypted_', '') : null),
  createSearchHash: vi.fn((data) => data ? `hash_${data}` : null)
}));

describe('PatientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPatientsForTherapist', () => {
    it('should return empty array when user has no organization memberships', async () => {
      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue([]);

      const result = await PatientService.getPatientsForTherapist(1, 1);

      expect(result).toEqual([]);
      expect(OrganizationMembershipRepository.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should return all patients for business owner', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'business_owner',
        canViewAllPatients: true,
        canViewSelectedPatients: null
      }];

      const patients = [
        {
          id: 1,
          name: 'Patient One',
          emailEncrypted: 'encrypted_email1@example.com',
          phoneEncrypted: 'encrypted_555-1234',
          organizationId: 1
        },
        {
          id: 2,
          name: 'Patient Two',
          emailEncrypted: 'encrypted_email2@example.com',
          phoneEncrypted: 'encrypted_555-5678',
          organizationId: 1
        }
      ];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByOrganization).mockResolvedValue(patients);

      const result = await PatientService.getPatientsForTherapist(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Patient One');
      expect(result[1].name).toBe('Patient Two');
      expect(PatientRepository.findByOrganization).toHaveBeenCalledWith(1);
    });

    it('should return selected therapist patients for admin', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'admin',
        canViewAllPatients: false,
        canViewSelectedPatients: [1, 2]
      }];

      const patients = [{
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        primaryTherapistId: 1
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByTherapist).mockResolvedValue(patients);

      const result = await PatientService.getPatientsForTherapist(1, 2);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Patient One');
      expect(PatientRepository.findByTherapist).toHaveBeenCalledWith(1);
    });

    it('should return own patients for therapist', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'therapist',
        canViewAllPatients: false,
        canViewSelectedPatients: null
      }];

      const patients = [{
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        primaryTherapistId: 1
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByTherapist).mockResolvedValue(patients);

      const result = await PatientService.getPatientsForTherapist(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Patient One');
      expect(PatientRepository.findByTherapist).toHaveBeenCalledWith(1);
    });

    it('should decrypt PHI for all patients', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'business_owner',
        canViewAllPatients: true,
        canViewSelectedPatients: null
      }];

      const patients = [{
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        organizationId: 1
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByOrganization).mockResolvedValue(patients);

      const result = await PatientService.getPatientsForTherapist(1, 1);

      expect(result[0].emailEncrypted).toBe('email1@example.com');
      expect(result[0].phoneEncrypted).toBe('555-1234');
    });

    it('should log PHI access audit', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'business_owner',
        canViewAllPatients: true,
        canViewSelectedPatients: null
      }];

      const patients = [{
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        organizationId: 1
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByOrganization).mockResolvedValue(patients);

      await PatientService.getPatientsForTherapist(1, 1);

      expect(AuditLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        action: 'PHI_ACCESS',
        resourceType: 'PATIENT',
        fieldsAccessed: expect.any(Array),
        phiFieldsCount: expect.any(Number),
        securityLevel: 'phi-protected',
        riskScore: 40,
        hipaaCompliant: true
      });
    });
  });

  describe('getPatient', () => {
    it('should return null for non-existent patient', async () => {
      vi.mocked(PatientRepository.findById).mockResolvedValue(null);

      const result = await PatientService.getPatient(999, 1);

      expect(result).toBeNull();
    });

    it('should return patient with decrypted PHI when user has access', async () => {
      const patient = {
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        organizationId: 1,
        primaryTherapistId: 1
      };

      vi.mocked(PatientRepository.findById).mockResolvedValue(patient);
      
      // Mock access control
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);

      const result = await PatientService.getPatient(1, 1);

      expect(result).toBeDefined();
      expect(result.name).toBe('Patient One');
      expect(result.emailEncrypted).toBe('email1@example.com');
      expect(result.phoneEncrypted).toBe('555-1234');
    });

    it('should throw error when user lacks access permissions', async () => {
      const patient = {
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        organizationId: 1,
        primaryTherapistId: 2
      };

      vi.mocked(PatientRepository.findById).mockResolvedValue(patient);
      
      // Mock access control denial
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(false);

      await expect(PatientService.getPatient(1, 1)).rejects.toThrow('Insufficient permissions to access patient');
    });

    it('should log PHI access audit for individual patient', async () => {
      const patient = {
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        phoneEncrypted: 'encrypted_555-1234',
        organizationId: 1,
        primaryTherapistId: 1
      };

      vi.mocked(PatientRepository.findById).mockResolvedValue(patient);
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);

      await PatientService.getPatient(1, 1);

      expect(AuditLogRepository.create).toHaveBeenCalledWith({
        userId: 1,
        action: 'PHI_ACCESS',
        resourceType: 'PATIENT',
        resourceId: 1,
        fieldsAccessed: expect.any(Array),
        phiFieldsCount: expect.any(Number),
        securityLevel: 'phi-protected',
        riskScore: 50,
        hipaaCompliant: true
      });
    });
  });

  describe('createPatient', () => {
    it('should create patient with encrypted PHI', async () => {
      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'New Patient',
        contactEmail: 'patient@example.com',
        contactPhone: '555-123-4567',
        dob: '1990-01-01',
        gender: 'female',
        clinicalNotes: 'Initial assessment notes'
      };

      const createdPatient = {
        id: 1,
        ...patientData,
        emailEncrypted: 'encrypted_patient@example.com',
        phoneEncrypted: 'encrypted_555-123-4567',
        dobEncrypted: 'encrypted_1990-01-01',
        clinicalNotesEncrypted: 'encrypted_Initial assessment notes'
      };

      vi.mocked(PatientRepository.create).mockResolvedValue(createdPatient);

      const result = await PatientService.createPatient(patientData);

      expect(result).toBeDefined();
      expect(result.name).toBe('New Patient');
      expect(PatientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 1,
          primaryTherapistId: 1,
          name: 'New Patient',
          emailEncrypted: 'encrypted_patient@example.com',
          phoneEncrypted: 'encrypted_555-123-4567',
          dobEncrypted: 'encrypted_1990-01-01',
          clinicalNotesEncrypted: 'encrypted_Initial assessment notes'
        })
      );
    });

    it('should handle missing optional fields', async () => {
      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'Minimal Patient'
        // No optional fields
      };

      const createdPatient = {
        id: 1,
        ...patientData,
        emailEncrypted: null,
        phoneEncrypted: null,
        dobEncrypted: null,
        clinicalNotesEncrypted: null
      };

      vi.mocked(PatientRepository.create).mockResolvedValue(createdPatient);

      const result = await PatientService.createPatient(patientData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Minimal Patient');
      expect(result.emailEncrypted).toBeNull();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required organizationId and primaryTherapistId
        name: 'Invalid Patient'
      };

      await expect(PatientService.createPatient(invalidData as any)).rejects.toThrow();
    });

    it('should create search hashes for searchable fields', async () => {
      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'Searchable Patient',
        contactEmail: 'search@example.com',
        contactPhone: '555-999-8888'
      };

      const createdPatient = {
        id: 1,
        ...patientData,
        emailSearchHash: 'hash_search@example.com',
        phoneSearchHash: 'hash_555-999-8888'
      };

      vi.mocked(PatientRepository.create).mockResolvedValue(createdPatient);

      await PatientService.createPatient(patientData);

      expect(PatientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailSearchHash: 'hash_search@example.com',
          phoneSearchHash: 'hash_555-999-8888'
        })
      );
    });
  });

  describe('updatePatient', () => {
    it('should update patient with encrypted PHI', async () => {
      const patientId = 1;
      const updateData = {
        name: 'Updated Patient',
        contactEmail: 'updated@example.com',
        clinicalNotes: 'Updated notes'
      };

      const updatedPatient = {
        id: patientId,
        name: 'Updated Patient',
        emailEncrypted: 'encrypted_updated@example.com',
        clinicalNotesEncrypted: 'encrypted_Updated notes'
      };

      vi.mocked(PatientRepository.update).mockResolvedValue(updatedPatient);

      const result = await PatientService.updatePatient(patientId, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Patient');
      expect(PatientRepository.update).toHaveBeenCalledWith(
        patientId,
        expect.objectContaining({
          name: 'Updated Patient',
          emailEncrypted: 'encrypted_updated@example.com',
          clinicalNotesEncrypted: 'encrypted_Updated notes'
        })
      );
    });

    it('should handle partial updates', async () => {
      const patientId = 1;
      const updateData = {
        name: 'Partially Updated Patient'
        // Only updating name
      };

      const updatedPatient = {
        id: patientId,
        name: 'Partially Updated Patient'
      };

      vi.mocked(PatientRepository.update).mockResolvedValue(updatedPatient);

      const result = await PatientService.updatePatient(patientId, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Partially Updated Patient');
    });

    it('should throw error for non-existent patient', async () => {
      const patientId = 999;
      const updateData = { name: 'Updated Patient' };

      vi.mocked(PatientRepository.update).mockResolvedValue(null);

      await expect(PatientService.updatePatient(patientId, updateData)).rejects.toThrow('Patient not found');
    });
  });

  describe('deletePatient', () => {
    it('should soft delete patient', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      // Mock access control
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);
      vi.mocked(PatientRepository.update).mockResolvedValue({ id: patientId, deleted: true });

      await PatientService.deletePatient(patientId, requestingUserId);

      expect(PatientRepository.update).toHaveBeenCalledWith(
        patientId,
        expect.objectContaining({
          deleted: true,
          deletedAt: expect.any(Date),
          deletedBy: requestingUserId
        })
      );
    });

    it('should throw error when user lacks delete permissions', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(false);

      await expect(PatientService.deletePatient(patientId, requestingUserId)).rejects.toThrow('Insufficient permissions to delete patient');
    });

    it('should log deletion audit', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);
      vi.mocked(PatientRepository.update).mockResolvedValue({ id: patientId, deleted: true });

      await PatientService.deletePatient(patientId, requestingUserId);

      expect(AuditLogRepository.create).toHaveBeenCalledWith({
        userId: requestingUserId,
        action: 'DELETE',
        resourceType: 'PATIENT',
        resourceId: patientId,
        securityLevel: 'phi-protected',
        riskScore: 60,
        hipaaCompliant: true
      });
    });
  });

  describe('searchPatients', () => {
    it('should search patients by email hash', async () => {
      const searchTerm = 'test@example.com';
      const requestingUserId = 1;

      const patients = [{
        id: 1,
        name: 'Test Patient',
        emailEncrypted: 'encrypted_test@example.com',
        emailSearchHash: 'hash_test@example.com'
      }];

      vi.mocked(PatientRepository.findBySearchHash).mockResolvedValue(patients);
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);

      const result = await PatientService.searchPatients(searchTerm, requestingUserId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Patient');
      expect(PatientRepository.findBySearchHash).toHaveBeenCalledWith('hash_test@example.com');
    });

    it('should search patients by phone hash', async () => {
      const searchTerm = '555-123-4567';
      const requestingUserId = 1;

      const patients = [{
        id: 1,
        name: 'Test Patient',
        phoneEncrypted: 'encrypted_555-123-4567',
        phoneSearchHash: 'hash_555-123-4567'
      }];

      vi.mocked(PatientRepository.findBySearchHash).mockResolvedValue(patients);
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);

      const result = await PatientService.searchPatients(searchTerm, requestingUserId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Patient');
    });

    it('should filter results by access permissions', async () => {
      const searchTerm = 'test@example.com';
      const requestingUserId = 1;

      const patients = [
        {
          id: 1,
          name: 'Accessible Patient',
          emailEncrypted: 'encrypted_test@example.com',
          organizationId: 1,
          primaryTherapistId: 1
        },
        {
          id: 2,
          name: 'Restricted Patient',
          emailEncrypted: 'encrypted_test@example.com',
          organizationId: 2,
          primaryTherapistId: 2
        }
      ];

      vi.mocked(PatientRepository.findBySearchHash).mockResolvedValue(patients);
      
      // Mock access control - first patient accessible, second not
      vi.spyOn(PatientService as any, 'canUserAccessPatient')
        .mockResolvedValueOnce(true)  // First patient
        .mockResolvedValueOnce(false); // Second patient

      const result = await PatientService.searchPatients(searchTerm, requestingUserId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Accessible Patient');
    });

    it('should return empty array for no matches', async () => {
      const searchTerm = 'nonexistent@example.com';
      const requestingUserId = 1;

      vi.mocked(PatientRepository.findBySearchHash).mockResolvedValue([]);

      const result = await PatientService.searchPatients(searchTerm, requestingUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getPatientSessions', () => {
    it('should return patient sessions with access control', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      const sessions = [
        {
          id: 1,
          patientId: 1,
          date: '2025-01-20',
          duration: 50,
          notesEncrypted: 'encrypted_session_notes'
        }
      ];

      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);
      vi.mocked(ClinicalSessionRepository.findByPatient).mockResolvedValue(sessions);

      const result = await PatientService.getPatientSessions(patientId, requestingUserId);

      expect(result).toHaveLength(1);
      expect(result[0].notesEncrypted).toBe('session_notes'); // Decrypted
      expect(ClinicalSessionRepository.findByPatient).toHaveBeenCalledWith(patientId);
    });

    it('should throw error when user lacks access', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(false);

      await expect(PatientService.getPatientSessions(patientId, requestingUserId)).rejects.toThrow('Insufficient permissions to access patient sessions');
    });
  });

  describe('getPatientTreatmentPlans', () => {
    it('should return patient treatment plans with access control', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      const treatmentPlans = [
        {
          id: 1,
          patientId: 1,
          title: 'Anxiety Treatment Plan',
          goalsEncrypted: 'encrypted_treatment_goals',
          interventionsEncrypted: 'encrypted_interventions'
        }
      ];

      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);
      vi.mocked(PatientTreatmentPlanRepository.findByPatient).mockResolvedValue(treatmentPlans);

      const result = await PatientService.getPatientTreatmentPlans(patientId, requestingUserId);

      expect(result).toHaveLength(1);
      expect(result[0].goalsEncrypted).toBe('treatment_goals'); // Decrypted
      expect(result[0].interventionsEncrypted).toBe('interventions'); // Decrypted
      expect(PatientTreatmentPlanRepository.findByPatient).toHaveBeenCalledWith(patientId);
    });

    it('should throw error when user lacks access', async () => {
      const patientId = 1;
      const requestingUserId = 1;

      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(false);

      await expect(PatientService.getPatientTreatmentPlans(patientId, requestingUserId)).rejects.toThrow('Insufficient permissions to access patient treatment plans');
    });
  });

  describe('PHI Encryption/Decryption', () => {
    it('should encrypt PHI fields correctly', () => {
      const patientData = {
        contactEmail: 'test@example.com',
        contactPhone: '555-123-4567',
        dob: '1990-01-01',
        clinicalNotes: 'Sensitive clinical information'
      };

      const encrypted = (PatientService as any).encryptPatientPHI(patientData);

      expect(encrypted.emailEncrypted).toBe('encrypted_test@example.com');
      expect(encrypted.phoneEncrypted).toBe('encrypted_555-123-4567');
      expect(encrypted.dobEncrypted).toBe('encrypted_1990-01-01');
      expect(encrypted.clinicalNotesEncrypted).toBe('encrypted_Sensitive clinical information');
    });

    it('should decrypt PHI fields correctly', () => {
      const encryptedPatient = {
        emailEncrypted: 'encrypted_test@example.com',
        phoneEncrypted: 'encrypted_555-123-4567',
        dobEncrypted: 'encrypted_1990-01-01',
        clinicalNotesEncrypted: 'encrypted_Sensitive clinical information'
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      expect(decrypted.emailEncrypted).toBe('test@example.com');
      expect(decrypted.phoneEncrypted).toBe('555-123-4567');
      expect(decrypted.dobEncrypted).toBe('1990-01-01');
      expect(decrypted.clinicalNotesEncrypted).toBe('Sensitive clinical information');
    });

    it('should handle null PHI fields', () => {
      const patientData = {
        contactEmail: null,
        contactPhone: '',
        dob: undefined,
        clinicalNotes: '   '
      };

      const encrypted = (PatientService as any).encryptPatientPHI(patientData);

      expect(encrypted.emailEncrypted).toBeNull();
      expect(encrypted.phoneEncrypted).toBeNull();
      expect(encrypted.dobEncrypted).toBeNull();
      expect(encrypted.clinicalNotesEncrypted).toBeNull();
    });
  });

  describe('Age Computation', () => {
    it('should compute age correctly from DOB', () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 35; // 35 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
      
      const encryptedPatient = {
        id: 1,
        name: 'Test Patient',
        patientDobEncrypted: `encrypted_${dob}`
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      expect(decrypted.patientAge).toBe(35);
    });

    it('should compute age correctly when birthday has not occurred this year', () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 35;
      const futureMonth = (today.getMonth() + 1) % 12; // Next month
      const dob = `${dobYear}-${String(futureMonth + 1).padStart(2, '0')}-15`;
      
      const encryptedPatient = {
        id: 1,
        name: 'Test Patient',
        patientDobEncrypted: `encrypted_${dob}`
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      // Age should be 34 since birthday hasn't occurred yet this year
      expect(decrypted.patientAge).toBe(34);
    });

    it('should apply HIPAA Safe Harbor rule for ages >89', () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 95; // 95 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
      
      const encryptedPatient = {
        id: 1,
        name: 'Elderly Patient',
        patientDobEncrypted: `encrypted_${dob}`
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      // Ages >89 should display as "90+"
      expect(decrypted.patientAge).toBe('90+');
    });

    it('should display age 89 as number, not "90+"', () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 89; // Exactly 89 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
      
      const encryptedPatient = {
        id: 1,
        name: 'Patient 89',
        patientDobEncrypted: `encrypted_${dob}`
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      // 89 is the threshold - should still be displayed as number
      expect(decrypted.patientAge).toBe(89);
    });

    it('should display age 90 as "90+"', () => {
      const today = new Date();
      const dobYear = today.getFullYear() - 90; // Exactly 90 years old
      const dobMonth = today.getMonth();
      const dobDay = today.getDate();
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;
      
      const encryptedPatient = {
        id: 1,
        name: 'Patient 90',
        patientDobEncrypted: `encrypted_${dob}`
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      // Ages >89 means 90 and above display as "90+"
      expect(decrypted.patientAge).toBe('90+');
    });

    it('should handle missing DOB gracefully', () => {
      const encryptedPatient = {
        id: 1,
        name: 'No DOB Patient',
        patientDobEncrypted: null
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      // No age should be computed if DOB is missing
      expect(decrypted.patientAge).toBeUndefined();
    });

    it('should handle invalid DOB format gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const encryptedPatient = {
        id: 1,
        name: 'Invalid DOB Patient',
        patientDobEncrypted: 'encrypted_invalid-date-format'
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      // Should set age to null on error
      expect(decrypted.patientAge).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error computing age from DOB: Invalid date format');
      
      consoleSpy.mockRestore();
    });

    it('should compute age 0 for infants born this year', () => {
      const today = new Date();
      const dobYear = today.getFullYear();
      const dobMonth = Math.max(0, today.getMonth() - 2); // 2 months ago
      const dob = `${dobYear}-${String(dobMonth + 1).padStart(2, '0')}-15`;
      
      const encryptedPatient = {
        id: 1,
        name: 'Infant Patient',
        patientDobEncrypted: `encrypted_${dob}`
      };

      const decrypted = (PatientService as any).decryptPatientPHI(encryptedPatient);

      expect(decrypted.patientAge).toBe(0);
    });
  });

  describe('Name Search Hash', () => {
    it('should generate name search hash when creating patient', async () => {
      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'John Doe',
        contactEmail: 'john@example.com'
      };

      const createdPatient = {
        id: 1,
        ...patientData,
        patientNameSearchHash: 'hash_John Doe'
      };

      vi.mocked(PatientRepository.create).mockResolvedValue(createdPatient);

      await PatientService.createPatient(patientData, 1);

      expect(PatientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          patientNameSearchHash: 'hash_John Doe'
        })
      );
    });

    it('should update name search hash when updating patient name', async () => {
      const patientId = 1;
      const updateData = {
        name: 'Jane Smith Updated'
      };

      const existingPatient = {
        id: patientId,
        name: 'Jane Smith',
        organizationId: 1,
        primaryTherapistId: 1
      };

      const updatedPatient = {
        ...existingPatient,
        name: 'Jane Smith Updated',
        patientNameSearchHash: 'hash_Jane Smith Updated'
      };

      vi.mocked(PatientRepository.findById).mockResolvedValue(existingPatient);
      vi.mocked(PatientRepository.update).mockResolvedValue(updatedPatient);
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);

      await PatientService.updatePatient(patientId, updateData, 1);

      expect(PatientRepository.update).toHaveBeenCalledWith(
        patientId,
        expect.objectContaining({
          name: 'Jane Smith Updated',
          patientNameSearchHash: 'hash_Jane Smith Updated'
        })
      );
    });

    it('should handle null name when creating patient', async () => {
      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: null,
        contactEmail: 'test@example.com'
      };

      const createdPatient = {
        id: 1,
        ...patientData,
        patientNameSearchHash: null
      };

      vi.mocked(PatientRepository.create).mockResolvedValue(createdPatient);

      await PatientService.createPatient(patientData as any, 1);

      expect(PatientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientNameSearchHash: null
        })
      );
    });

    it('should not update name search hash when name is not being updated', async () => {
      const patientId = 1;
      const updateData = {
        contactEmail: 'newemail@example.com'
        // NOT updating name
      };

      const existingPatient = {
        id: patientId,
        name: 'Existing Name',
        organizationId: 1,
        primaryTherapistId: 1
      };

      const updatedPatient = {
        ...existingPatient,
        patientContactEmailEncrypted: 'encrypted_newemail@example.com'
      };

      vi.mocked(PatientRepository.findById).mockResolvedValue(existingPatient);
      vi.mocked(PatientRepository.update).mockResolvedValue(updatedPatient);
      vi.spyOn(PatientService as any, 'canUserAccessPatient').mockResolvedValue(true);

      await PatientService.updatePatient(patientId, updateData, 1);

      // Should not include patientNameSearchHash in update since name wasn't changed
      expect(PatientRepository.update).toHaveBeenCalledWith(
        patientId,
        expect.not.objectContaining({
          patientNameSearchHash: expect.anything()
        })
      );
    });

    it('should create search hash using createSearchHash utility', async () => {
      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'Search Test Patient',
        contactEmail: 'search@example.com'
      };

      vi.mocked(PatientRepository.create).mockResolvedValue({ id: 1, ...patientData });

      await PatientService.createPatient(patientData, 1);

      // Verify createSearchHash was called with the name
      expect(createSearchHash).toHaveBeenCalledWith('Search Test Patient');
    });
  });

  describe('Access Control', () => {
    it('should allow business owner to access any patient in organization', async () => {
      const patient = {
        id: 1,
        organizationId: 1,
        primaryTherapistId: 2
      };

      const memberships = [{
        organizationId: 1,
        role: 'business_owner',
        canViewAllPatients: true
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);

      const canAccess = await (PatientService as any).canUserAccessPatient(1, patient);

      expect(canAccess).toBe(true);
    });

    it('should allow therapist to access their own patients', async () => {
      const patient = {
        id: 1,
        organizationId: 1,
        primaryTherapistId: 1
      };

      const memberships = [{
        organizationId: 1,
        role: 'therapist',
        canViewAllPatients: false
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);

      const canAccess = await (PatientService as any).canUserAccessPatient(1, patient);

      expect(canAccess).toBe(true);
    });

    it('should deny access when user has no organization membership', async () => {
      const patient = {
        id: 1,
        organizationId: 1,
        primaryTherapistId: 1
      };

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue([]);

      const canAccess = await (PatientService as any).canUserAccessPatient(1, patient);

      expect(canAccess).toBe(false);
    });

    it('should deny access when user is in different organization', async () => {
      const patient = {
        id: 1,
        organizationId: 1,
        primaryTherapistId: 1
      };

      const memberships = [{
        organizationId: 2, // Different organization
        role: 'therapist',
        canViewAllPatients: false
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);

      const canAccess = await (PatientService as any).canUserAccessPatient(1, patient);

      expect(canAccess).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(OrganizationMembershipRepository.findByUserId).mockRejectedValue(new Error('Database connection failed'));

      await expect(PatientService.getPatientsForTherapist(1, 1)).rejects.toThrow('Database connection failed');
    });

    it('should handle encryption errors', async () => {
      vi.mocked(encryptPHI).mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      const patientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'Test Patient',
        contactEmail: 'test@example.com'
      };

      await expect(PatientService.createPatient(patientData)).rejects.toThrow('Encryption failed');
    });

    it('should handle audit logging errors without failing operation', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'business_owner',
        canViewAllPatients: true
      }];

      const patients = [{
        id: 1,
        name: 'Patient One',
        emailEncrypted: 'encrypted_email1@example.com',
        organizationId: 1
      }];

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByOrganization).mockResolvedValue(patients);
      vi.mocked(AuditLogRepository.create).mockRejectedValue(new Error('Audit logging failed'));

      // Should not throw error even if audit logging fails
      const result = await PatientService.getPatientsForTherapist(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Patient One');
    });
  });

  describe('Performance', () => {
    it('should handle large patient lists efficiently', async () => {
      const memberships = [{
        organizationId: 1,
        role: 'business_owner',
        canViewAllPatients: true
      }];

      // Create large patient list
      const patients = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Patient ${i + 1}`,
        emailEncrypted: `encrypted_patient${i + 1}@example.com`,
        organizationId: 1
      }));

      vi.mocked(OrganizationMembershipRepository.findByUserId).mockResolvedValue(memberships);
      vi.mocked(PatientRepository.findByOrganization).mockResolvedValue(patients);

      const startTime = Date.now();
      const result = await PatientService.getPatientsForTherapist(1, 1);
      const duration = Date.now() - startTime;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
