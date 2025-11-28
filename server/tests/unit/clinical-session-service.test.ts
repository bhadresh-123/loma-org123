import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClinicalSessionService } from '../../services/ClinicalSessionService';
import { ClinicalSessionRepository } from '../../repositories';
import * as phiEncryption from '../../utils/phi-encryption';

// Mock the repository
vi.mock('../../repositories', () => ({
  ClinicalSessionRepository: {
    getUserSessions: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    getPatientSessions: vi.fn(),
  },
  PatientRepository: {
    findById: vi.fn(),
  },
}));

// Mock PHI encryption utilities
vi.mock('../../utils/phi-encryption', () => ({
  encryptPHI: vi.fn((value) => value ? `encrypted_${value}` : null),
  decryptPHI: vi.fn((value) => value ? value.replace('encrypted_', '') : null),
  createSearchHash: vi.fn((value) => `hash_${value}`),
}));

describe('ClinicalSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSessions', () => {
    it('should return decrypted sessions with clean property names (without Encrypted suffix)', async () => {
      const mockSessions = [{
        id: 1,
        sessionClinicalNotesEncrypted: 'encrypted_clinical notes',
        sessionSubjectiveNotesEncrypted: 'encrypted_subjective notes',
        sessionObjectiveNotesEncrypted: 'encrypted_objective notes',
        sessionAssessmentNotesEncrypted: 'encrypted_assessment notes',
        sessionPlanNotesEncrypted: 'encrypted_plan notes',
        sessionTreatmentGoalsEncrypted: 'encrypted_treatment goals',
        sessionProgressNotesEncrypted: 'encrypted_progress notes',
        sessionInterventionsEncrypted: 'encrypted_interventions',
      }];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(1);

      // Should have decrypted properties with clean names
      expect(result[0]).toHaveProperty('sessionClinicalNotes', 'clinical notes');
      expect(result[0]).toHaveProperty('sessionSubjectiveNotes', 'subjective notes');
      expect(result[0]).toHaveProperty('sessionObjectiveNotes', 'objective notes');
      expect(result[0]).toHaveProperty('sessionAssessmentNotes', 'assessment notes');
      expect(result[0]).toHaveProperty('sessionPlanNotes', 'plan notes');
      expect(result[0]).toHaveProperty('sessionTreatmentGoals', 'treatment goals');
      expect(result[0]).toHaveProperty('sessionProgressNotes', 'progress notes');
      expect(result[0]).toHaveProperty('sessionInterventions', 'interventions');

      // Should NOT have properties with "Encrypted" suffix
      expect(result[0]).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionSubjectiveNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionObjectiveNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionAssessmentNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionPlanNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionTreatmentGoalsEncrypted');
      expect(result[0]).not.toHaveProperty('sessionProgressNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionInterventionsEncrypted');
    });

    it('should handle null values correctly', async () => {
      const mockSessions = [{
        id: 1,
        sessionClinicalNotesEncrypted: null,
        sessionSubjectiveNotesEncrypted: null,
        sessionObjectiveNotesEncrypted: null,
        sessionAssessmentNotesEncrypted: null,
        sessionPlanNotesEncrypted: null,
        sessionTreatmentGoalsEncrypted: null,
        sessionProgressNotesEncrypted: null,
        sessionInterventionsEncrypted: null,
      }];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(1);

      expect(result[0].sessionClinicalNotes).toBeNull();
      expect(result[0].sessionSubjectiveNotes).toBeNull();
      expect(result[0].sessionObjectiveNotes).toBeNull();
      expect(result[0].sessionAssessmentNotes).toBeNull();
      expect(result[0].sessionPlanNotes).toBeNull();
      expect(result[0].sessionTreatmentGoals).toBeNull();
      expect(result[0].sessionProgressNotes).toBeNull();
      expect(result[0].sessionInterventions).toBeNull();
    });

    it('should call decryptPHI for each encrypted field', async () => {
      const mockSessions = [{
        id: 1,
        sessionClinicalNotesEncrypted: 'encrypted_clinical',
        sessionSubjectiveNotesEncrypted: 'encrypted_subjective',
        sessionObjectiveNotesEncrypted: 'encrypted_objective',
        sessionAssessmentNotesEncrypted: 'encrypted_assessment',
        sessionPlanNotesEncrypted: 'encrypted_plan',
        sessionTreatmentGoalsEncrypted: 'encrypted_goals',
        sessionProgressNotesEncrypted: 'encrypted_progress',
        sessionInterventionsEncrypted: 'encrypted_interventions',
      }];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      await ClinicalSessionService.getUserSessions(1);

      // Verify decryptPHI was called for each field
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_clinical');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_subjective');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_objective');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_assessment');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_plan');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_goals');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_progress');
      expect(phiEncryption.decryptPHI).toHaveBeenCalledWith('encrypted_interventions');
    });
  });

  describe('getSession', () => {
    it('should return decrypted session with clean property names', async () => {
      const mockSession = {
        id: 1,
        sessionClinicalNotesEncrypted: 'encrypted_clinical notes',
        sessionSubjectiveNotesEncrypted: 'encrypted_subjective notes',
        sessionObjectiveNotesEncrypted: 'encrypted_objective notes',
        sessionAssessmentNotesEncrypted: 'encrypted_assessment notes',
        sessionPlanNotesEncrypted: 'encrypted_plan notes',
        sessionTreatmentGoalsEncrypted: 'encrypted_treatment goals',
        sessionProgressNotesEncrypted: 'encrypted_progress notes',
        sessionInterventionsEncrypted: 'encrypted_interventions',
      };

      vi.mocked(ClinicalSessionRepository.getSession).mockResolvedValue(mockSession);

      const result = await ClinicalSessionService.getSession(1, 1);

      // Should have clean property names
      expect(result).toHaveProperty('sessionClinicalNotes', 'clinical notes');
      expect(result).toHaveProperty('sessionSubjectiveNotes', 'subjective notes');
      
      // Should not have encrypted property names
      expect(result).not.toHaveProperty('sessionClinicalNotesEncrypted');
    });

    it('should return null if session not found', async () => {
      vi.mocked(ClinicalSessionRepository.getSession).mockResolvedValue(null);

      const result = await ClinicalSessionService.getSession(1, 1);

      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should return created session with clean property names', async () => {
      const inputData = {
        patientId: 1,
        organizationId: 1,
        therapistId: 1,
        date: '2025-01-01',
        sessionClinicalNotesEncrypted: 'clinical notes',
        sessionSubjectiveNotesEncrypted: 'subjective notes',
      };

      const mockCreatedSession = {
        id: 1,
        ...inputData,
        sessionClinicalNotesEncrypted: 'encrypted_clinical notes',
        sessionSubjectiveNotesEncrypted: 'encrypted_subjective notes',
        sessionObjectiveNotesEncrypted: null,
        sessionAssessmentNotesEncrypted: null,
        sessionPlanNotesEncrypted: null,
        sessionTreatmentGoalsEncrypted: null,
        sessionProgressNotesEncrypted: null,
        sessionInterventionsEncrypted: null,
      };

      vi.mocked(ClinicalSessionRepository.createSession).mockResolvedValue(mockCreatedSession);

      const result = await ClinicalSessionService.createSession(inputData);

      // Should have clean property names in response
      expect(result).toHaveProperty('sessionClinicalNotes', 'clinical notes');
      expect(result).toHaveProperty('sessionSubjectiveNotes', 'subjective notes');
      
      // Should not have encrypted property names in response
      expect(result).not.toHaveProperty('sessionClinicalNotesEncrypted');
    });

    it('should encrypt data before saving to repository', async () => {
      const inputData = {
        patientId: 1,
        organizationId: 1,
        therapistId: 1,
        date: '2025-01-01',
        sessionClinicalNotesEncrypted: 'clinical notes',
      };

      const mockCreatedSession = {
        id: 1,
        sessionClinicalNotesEncrypted: 'encrypted_clinical notes',
        sessionSubjectiveNotesEncrypted: null,
        sessionObjectiveNotesEncrypted: null,
        sessionAssessmentNotesEncrypted: null,
        sessionPlanNotesEncrypted: null,
        sessionTreatmentGoalsEncrypted: null,
        sessionProgressNotesEncrypted: null,
        sessionInterventionsEncrypted: null,
      };

      vi.mocked(ClinicalSessionRepository.createSession).mockResolvedValue(mockCreatedSession);

      await ClinicalSessionService.createSession(inputData);

      // Verify encryptPHI was called
      expect(phiEncryption.encryptPHI).toHaveBeenCalledWith('clinical notes');
    });
  });

  describe('updateSession', () => {
    it('should return updated session with clean property names', async () => {
      const updateData = {
        sessionClinicalNotesEncrypted: 'updated clinical notes',
      };

      const mockUpdatedSession = {
        id: 1,
        sessionClinicalNotesEncrypted: 'encrypted_updated clinical notes',
        sessionSubjectiveNotesEncrypted: null,
        sessionObjectiveNotesEncrypted: null,
        sessionAssessmentNotesEncrypted: null,
        sessionPlanNotesEncrypted: null,
        sessionTreatmentGoalsEncrypted: null,
        sessionProgressNotesEncrypted: null,
        sessionInterventionsEncrypted: null,
      };

      vi.mocked(ClinicalSessionRepository.updateSession).mockResolvedValue(mockUpdatedSession);

      const result = await ClinicalSessionService.updateSession(1, updateData, 1);

      // Should have clean property names
      expect(result).toHaveProperty('sessionClinicalNotes', 'updated clinical notes');
      
      // Should not have encrypted property names
      expect(result).not.toHaveProperty('sessionClinicalNotesEncrypted');
    });

    it('should return null if session not found', async () => {
      vi.mocked(ClinicalSessionRepository.updateSession).mockResolvedValue(null);

      const result = await ClinicalSessionService.updateSession(1, {}, 1);

      expect(result).toBeNull();
    });
  });

  describe('getPatientSessions', () => {
    it('should return decrypted patient sessions with clean property names', async () => {
      const mockSessions = [{
        id: 1,
        sessionClinicalNotesEncrypted: 'encrypted_clinical notes',
        sessionSubjectiveNotesEncrypted: 'encrypted_subjective notes',
        sessionObjectiveNotesEncrypted: null,
        sessionAssessmentNotesEncrypted: null,
        sessionPlanNotesEncrypted: null,
        sessionTreatmentGoalsEncrypted: null,
        sessionProgressNotesEncrypted: null,
        sessionInterventionsEncrypted: null,
      }];

      vi.mocked(ClinicalSessionRepository.getPatientSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getPatientSessions(1, 1);

      // Should have clean property names
      expect(result[0]).toHaveProperty('sessionClinicalNotes', 'clinical notes');
      expect(result[0]).toHaveProperty('sessionSubjectiveNotes', 'subjective notes');
      
      // Should not have encrypted property names
      expect(result[0]).not.toHaveProperty('sessionClinicalNotesEncrypted');
    });
  });
});

