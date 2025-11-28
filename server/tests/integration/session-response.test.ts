/**
 * Session Response Integration Tests
 * Phase 5: Testing Strategy
 * 
 * Verifies that clinical session API responses return decrypted properties
 * with correct naming (without "Encrypted" suffix) and that encrypted
 * properties are not included in responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClinicalSessionService } from '../../services/ClinicalSessionService';
import { ClinicalSessionRepository } from '../../repositories';
import { encryptPHI, decryptPHI } from '../../utils/phi-encryption';

// Mock repositories
vi.mock('../../repositories', () => ({
  ClinicalSessionRepository: {
    getUserSessions: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    getPatientSessions: vi.fn()
  }
}));

// Mock PHI encryption utilities
vi.mock('../../utils/phi-encryption', () => ({
  encryptPHI: vi.fn((data) => data ? `encrypted_${data}` : null),
  decryptPHI: vi.fn((data) => data ? data.replace('encrypted_', '') : null),
  createSearchHash: vi.fn((data) => data ? `hash_${data}` : null)
}));

describe('Session Response Property Names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSessions Response Structure', () => {
    it('should return decrypted properties WITHOUT "Encrypted" suffix', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          therapistId: 456,
          sessionDate: '2025-01-20',
          sessionDuration: 50,
          sessionClinicalNotesEncrypted: 'encrypted_clinical notes content',
          sessionSubjectiveNotesEncrypted: 'encrypted_subjective notes',
          sessionObjectiveNotesEncrypted: 'encrypted_objective notes',
          sessionAssessmentNotesEncrypted: 'encrypted_assessment notes',
          sessionPlanNotesEncrypted: 'encrypted_plan notes',
          sessionTreatmentGoalsEncrypted: 'encrypted_treatment goals',
          sessionProgressNotesEncrypted: 'encrypted_progress notes',
          sessionInterventionsEncrypted: 'encrypted_interventions'
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);

      expect(result).toHaveLength(1);
      const session = result[0];

      // Verify decrypted properties have clean names (no "Encrypted" suffix)
      expect(session).toHaveProperty('sessionClinicalNotes');
      expect(session).toHaveProperty('sessionSubjectiveNotes');
      expect(session).toHaveProperty('sessionObjectiveNotes');
      expect(session).toHaveProperty('sessionAssessmentNotes');
      expect(session).toHaveProperty('sessionPlanNotes');
      expect(session).toHaveProperty('sessionTreatmentGoals');
      expect(session).toHaveProperty('sessionProgressNotes');
      expect(session).toHaveProperty('sessionInterventions');

      // Verify values are decrypted
      expect(session.sessionClinicalNotes).toBe('clinical notes content');
      expect(session.sessionSubjectiveNotes).toBe('subjective notes');
      expect(session.sessionObjectiveNotes).toBe('objective notes');
      expect(session.sessionAssessmentNotes).toBe('assessment notes');
      expect(session.sessionPlanNotes).toBe('plan notes');
      expect(session.sessionTreatmentGoals).toBe('treatment goals');
      expect(session.sessionProgressNotes).toBe('progress notes');
      expect(session.sessionInterventions).toBe('interventions');
    });

    it('should NOT include encrypted properties in response', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          sessionClinicalNotesEncrypted: 'encrypted_clinical notes',
          sessionSubjectiveNotesEncrypted: 'encrypted_subjective notes'
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);
      const session = result[0];

      // Encrypted properties should NOT be in the response
      expect(session).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(session).not.toHaveProperty('sessionSubjectiveNotesEncrypted');
      expect(session).not.toHaveProperty('sessionObjectiveNotesEncrypted');
      expect(session).not.toHaveProperty('sessionAssessmentNotesEncrypted');
      expect(session).not.toHaveProperty('sessionPlanNotesEncrypted');
      expect(session).not.toHaveProperty('sessionTreatmentGoalsEncrypted');
      expect(session).not.toHaveProperty('sessionProgressNotesEncrypted');
      expect(session).not.toHaveProperty('sessionInterventionsEncrypted');

      // But should have the decrypted versions
      expect(session).toHaveProperty('sessionClinicalNotes');
      expect(session).toHaveProperty('sessionSubjectiveNotes');
    });

    it('should handle null encrypted values correctly', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          sessionClinicalNotesEncrypted: null,
          sessionSubjectiveNotesEncrypted: undefined,
          sessionObjectiveNotesEncrypted: 'encrypted_objective notes'
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);
      const session = result[0];

      // Null/undefined encrypted values should result in null decrypted values
      expect(session.sessionClinicalNotes).toBeNull();
      expect(session.sessionSubjectiveNotes).toBeNull();
      expect(session.sessionObjectiveNotes).toBe('objective notes');
    });

    it('should preserve non-PHI fields in response', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          therapistId: 456,
          sessionDate: '2025-01-20',
          sessionDuration: 50,
          sessionType: 'individual',
          sessionStatus: 'completed',
          sessionClinicalNotesEncrypted: 'encrypted_notes'
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);
      const session = result[0];

      // Non-PHI fields should be preserved
      expect(session.id).toBe(1);
      expect(session.patientId).toBe(123);
      expect(session.therapistId).toBe(456);
      expect(session.sessionDate).toBe('2025-01-20');
      expect(session.sessionDuration).toBe(50);
      expect(session.sessionType).toBe('individual');
      expect(session.sessionStatus).toBe('completed');
    });
  });

  describe('getSession Response Structure', () => {
    it('should return single session with correct property names', async () => {
      const mockSession = {
        id: 1,
        patientId: 123,
        sessionClinicalNotesEncrypted: 'encrypted_clinical content',
        sessionSubjectiveNotesEncrypted: 'encrypted_subjective content',
        sessionAssessmentNotesEncrypted: 'encrypted_assessment content'
      };

      vi.mocked(ClinicalSessionRepository.getSession).mockResolvedValue(mockSession);

      const result = await ClinicalSessionService.getSession(1, 456);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('sessionClinicalNotes');
      expect(result).toHaveProperty('sessionSubjectiveNotes');
      expect(result).toHaveProperty('sessionAssessmentNotes');

      // Should NOT have encrypted properties
      expect(result).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(result).not.toHaveProperty('sessionSubjectiveNotesEncrypted');
      expect(result).not.toHaveProperty('sessionAssessmentNotesEncrypted');

      // Values should be decrypted
      expect(result.sessionClinicalNotes).toBe('clinical content');
      expect(result.sessionSubjectiveNotes).toBe('subjective content');
      expect(result.sessionAssessmentNotes).toBe('assessment content');
    });
  });

  describe('createSession Response Structure', () => {
    it('should return created session with correct property names', async () => {
      const inputData = {
        patientId: 123,
        organizationId: 1,
        therapistId: 456,
        date: '2025-01-20',
        sessionClinicalNotesEncrypted: 'new clinical notes',
        sessionSubjectiveNotesEncrypted: 'new subjective notes'
      };

      const mockCreatedSession = {
        id: 1,
        patientId: 123,
        organizationId: 1,
        therapistId: 456,
        date: new Date('2025-01-20'),
        sessionClinicalNotesEncrypted: 'encrypted_new clinical notes',
        sessionSubjectiveNotesEncrypted: 'encrypted_new subjective notes'
      };

      vi.mocked(ClinicalSessionRepository.createSession).mockResolvedValue(mockCreatedSession);

      const result = await ClinicalSessionService.createSession(inputData);

      expect(result).toBeDefined();
      
      // Response should have decrypted properties with clean names
      expect(result).toHaveProperty('sessionClinicalNotes');
      expect(result).toHaveProperty('sessionSubjectiveNotes');
      
      // Should NOT have encrypted properties
      expect(result).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(result).not.toHaveProperty('sessionSubjectiveNotesEncrypted');

      // Values should be decrypted
      expect(result.sessionClinicalNotes).toBe('new clinical notes');
      expect(result.sessionSubjectiveNotes).toBe('new subjective notes');
    });
  });

  describe('updateSession Response Structure', () => {
    it('should return updated session with correct property names', async () => {
      const updateData = {
        sessionClinicalNotesEncrypted: 'updated clinical notes',
        sessionProgressNotesEncrypted: 'updated progress notes'
      };

      const mockUpdatedSession = {
        id: 1,
        patientId: 123,
        sessionClinicalNotesEncrypted: 'encrypted_updated clinical notes',
        sessionProgressNotesEncrypted: 'encrypted_updated progress notes'
      };

      vi.mocked(ClinicalSessionRepository.updateSession).mockResolvedValue(mockUpdatedSession);

      const result = await ClinicalSessionService.updateSession(1, updateData, 456);

      expect(result).toBeDefined();
      
      // Response should have decrypted properties
      expect(result).toHaveProperty('sessionClinicalNotes');
      expect(result).toHaveProperty('sessionProgressNotes');
      
      // Should NOT have encrypted properties
      expect(result).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(result).not.toHaveProperty('sessionProgressNotesEncrypted');

      // Values should be decrypted
      expect(result.sessionClinicalNotes).toBe('updated clinical notes');
      expect(result.sessionProgressNotes).toBe('updated progress notes');
    });
  });

  describe('getPatientSessions Response Structure', () => {
    it('should return patient sessions with correct property names', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          sessionClinicalNotesEncrypted: 'encrypted_session 1 notes',
          sessionTreatmentGoalsEncrypted: 'encrypted_goals 1'
        },
        {
          id: 2,
          patientId: 123,
          sessionClinicalNotesEncrypted: 'encrypted_session 2 notes',
          sessionTreatmentGoalsEncrypted: 'encrypted_goals 2'
        }
      ];

      vi.mocked(ClinicalSessionRepository.getPatientSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getPatientSessions(123, 456);

      expect(result).toHaveLength(2);

      // Check first session
      expect(result[0]).toHaveProperty('sessionClinicalNotes');
      expect(result[0]).toHaveProperty('sessionTreatmentGoals');
      expect(result[0]).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(result[0]).not.toHaveProperty('sessionTreatmentGoalsEncrypted');
      expect(result[0].sessionClinicalNotes).toBe('session 1 notes');
      expect(result[0].sessionTreatmentGoals).toBe('goals 1');

      // Check second session
      expect(result[1]).toHaveProperty('sessionClinicalNotes');
      expect(result[1]).toHaveProperty('sessionTreatmentGoals');
      expect(result[1]).not.toHaveProperty('sessionClinicalNotesEncrypted');
      expect(result[1]).not.toHaveProperty('sessionTreatmentGoalsEncrypted');
      expect(result[1].sessionClinicalNotes).toBe('session 2 notes');
      expect(result[1].sessionTreatmentGoals).toBe('goals 2');
    });
  });

  describe('Complete SOAP Notes Structure', () => {
    it('should return all SOAP note fields with correct names', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          // All SOAP fields encrypted
          sessionSubjectiveNotesEncrypted: 'encrypted_subjective',
          sessionObjectiveNotesEncrypted: 'encrypted_objective',
          sessionAssessmentNotesEncrypted: 'encrypted_assessment',
          sessionPlanNotesEncrypted: 'encrypted_plan',
          sessionClinicalNotesEncrypted: 'encrypted_clinical',
          sessionTreatmentGoalsEncrypted: 'encrypted_goals',
          sessionProgressNotesEncrypted: 'encrypted_progress',
          sessionInterventionsEncrypted: 'encrypted_interventions'
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);
      const session = result[0];

      // Verify complete SOAP structure
      const expectedFields = [
        'sessionSubjectiveNotes',
        'sessionObjectiveNotes',
        'sessionAssessmentNotes',
        'sessionPlanNotes',
        'sessionClinicalNotes',
        'sessionTreatmentGoals',
        'sessionProgressNotes',
        'sessionInterventions'
      ];

      for (const field of expectedFields) {
        expect(session).toHaveProperty(field);
        expect(typeof session[field]).toBe('string');
        expect(session[field]).not.toContain('encrypted_');
      }

      // Verify NO encrypted fields in response
      const encryptedFields = [
        'sessionSubjectiveNotesEncrypted',
        'sessionObjectiveNotesEncrypted',
        'sessionAssessmentNotesEncrypted',
        'sessionPlanNotesEncrypted',
        'sessionClinicalNotesEncrypted',
        'sessionTreatmentGoalsEncrypted',
        'sessionProgressNotesEncrypted',
        'sessionInterventionsEncrypted'
      ];

      for (const field of encryptedFields) {
        expect(session).not.toHaveProperty(field);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sessions array', async () => {
      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue([]);

      const result = await ClinicalSessionService.getUserSessions(456);

      expect(result).toEqual([]);
    });

    it('should handle sessions with no encrypted fields', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          sessionDate: '2025-01-20',
          sessionDuration: 50
          // No encrypted fields
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].patientId).toBe(123);
      
      // All note fields should be null
      expect(result[0].sessionClinicalNotes).toBeNull();
      expect(result[0].sessionSubjectiveNotes).toBeNull();
    });

    it('should handle mixed presence of encrypted fields', async () => {
      const mockSessions = [
        {
          id: 1,
          patientId: 123,
          sessionClinicalNotesEncrypted: 'encrypted_clinical',
          // Other fields missing
          sessionSubjectiveNotesEncrypted: null
        }
      ];

      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue(mockSessions);

      const result = await ClinicalSessionService.getUserSessions(456);
      const session = result[0];

      expect(session.sessionClinicalNotes).toBe('clinical');
      expect(session.sessionSubjectiveNotes).toBeNull();
      expect(session.sessionObjectiveNotes).toBeNull();
    });
  });

  describe('Consistency Across All Endpoints', () => {
    it('should use consistent property naming across all session endpoints', async () => {
      const mockSessionData = {
        id: 1,
        patientId: 123,
        sessionClinicalNotesEncrypted: 'encrypted_notes'
      };

      // Test getUserSessions
      vi.mocked(ClinicalSessionRepository.getUserSessions).mockResolvedValue([mockSessionData]);
      const userSessions = await ClinicalSessionService.getUserSessions(456);
      expect(userSessions[0]).toHaveProperty('sessionClinicalNotes');
      expect(userSessions[0]).not.toHaveProperty('sessionClinicalNotesEncrypted');

      // Test getSession
      vi.mocked(ClinicalSessionRepository.getSession).mockResolvedValue(mockSessionData);
      const singleSession = await ClinicalSessionService.getSession(1, 456);
      expect(singleSession).toHaveProperty('sessionClinicalNotes');
      expect(singleSession).not.toHaveProperty('sessionClinicalNotesEncrypted');

      // Test getPatientSessions
      vi.mocked(ClinicalSessionRepository.getPatientSessions).mockResolvedValue([mockSessionData]);
      const patientSessions = await ClinicalSessionService.getPatientSessions(123, 456);
      expect(patientSessions[0]).toHaveProperty('sessionClinicalNotes');
      expect(patientSessions[0]).not.toHaveProperty('sessionClinicalNotesEncrypted');

      // All should return the same property structure
      const keys1 = Object.keys(userSessions[0]).filter(k => k.includes('session'));
      const keys2 = Object.keys(singleSession).filter(k => k.includes('session'));
      const keys3 = Object.keys(patientSessions[0]).filter(k => k.includes('session'));

      expect(keys1).toEqual(keys2);
      expect(keys2).toEqual(keys3);
    });
  });
});

