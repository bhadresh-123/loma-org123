import { ClinicalSessionRepository } from '../repositories';
import { encryptPHI, decryptPHI, createSearchHash } from '../utils/phi-encryption';

/**
 * Clinical Session Service
 * 
 * Handles clinical session management with HIPAA compliance and organization-aware access control
 */
export class ClinicalSessionService {
  
  /**
   * Validate that a patient exists and belongs to the specified organization
   */
  static async validatePatientAccess(patientId: number, organizationId: number) {
    try {
      const { PatientRepository } = await import('../repositories');
      const patient = await PatientRepository.findById(patientId);
      
      if (!patient) {
        return null;
      }
      
      if (patient.organizationId !== organizationId) {
        console.warn(`[ClinicalSessionService] Patient ${patientId} does not belong to organization ${organizationId}`);
        return null;
      }
      
      return patient;
    } catch (error) {
      console.error('[ClinicalSessionService] Error validating patient access:', error);
      throw error;
    }
  }
  
  /**
   * Get all clinical sessions for a user's organization
   */
  static async getUserSessions(userId: number) {
    try {
      const sessions = await ClinicalSessionRepository.getUserSessions(userId);
      
      // Decrypt PHI fields for each session, handling null/undefined safely
      // Return clean property names (without "Encrypted" suffix) for decrypted data
      return sessions.map(session => {
        const { 
          sessionClinicalNotesEncrypted,
          sessionSubjectiveNotesEncrypted,
          sessionObjectiveNotesEncrypted,
          sessionAssessmentNotesEncrypted,
          sessionPlanNotesEncrypted,
          sessionTreatmentGoalsEncrypted,
          sessionProgressNotesEncrypted,
          sessionInterventionsEncrypted,
          ...rest 
        } = session;
        
        return {
          ...rest,
          // Decrypted fields use clean property names (no "Encrypted" suffix)
          sessionClinicalNotes: sessionClinicalNotesEncrypted ? decryptPHI(sessionClinicalNotesEncrypted) : null,
          sessionSubjectiveNotes: sessionSubjectiveNotesEncrypted ? decryptPHI(sessionSubjectiveNotesEncrypted) : null,
          sessionObjectiveNotes: sessionObjectiveNotesEncrypted ? decryptPHI(sessionObjectiveNotesEncrypted) : null,
          sessionAssessmentNotes: sessionAssessmentNotesEncrypted ? decryptPHI(sessionAssessmentNotesEncrypted) : null,
          sessionPlanNotes: sessionPlanNotesEncrypted ? decryptPHI(sessionPlanNotesEncrypted) : null,
          sessionTreatmentGoals: sessionTreatmentGoalsEncrypted ? decryptPHI(sessionTreatmentGoalsEncrypted) : null,
          sessionProgressNotes: sessionProgressNotesEncrypted ? decryptPHI(sessionProgressNotesEncrypted) : null,
          sessionInterventions: sessionInterventionsEncrypted ? decryptPHI(sessionInterventionsEncrypted) : null,
        };
      });
    } catch (error) {
      console.error('Error in ClinicalSessionService.getUserSessions:', error);
      // If the table doesn't exist, return empty array instead of throwing
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('does not exist')) {
        console.warn('Clinical sessions table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a specific clinical session
   */
  static async getSession(sessionId: number, userId: number) {
    try {
      const session = await ClinicalSessionRepository.getSession(sessionId, userId);
      
      if (!session) {
        return null;
      }
      
      // Decrypt PHI fields, handling null/undefined safely
      // Return clean property names (without "Encrypted" suffix) for decrypted data
      const { 
        sessionClinicalNotesEncrypted,
        sessionSubjectiveNotesEncrypted,
        sessionObjectiveNotesEncrypted,
        sessionAssessmentNotesEncrypted,
        sessionPlanNotesEncrypted,
        sessionTreatmentGoalsEncrypted,
        sessionProgressNotesEncrypted,
        sessionInterventionsEncrypted,
        ...rest 
      } = session;
      
      return {
        ...rest,
        // Decrypted fields use clean property names (no "Encrypted" suffix)
        sessionClinicalNotes: sessionClinicalNotesEncrypted ? decryptPHI(sessionClinicalNotesEncrypted) : null,
        sessionSubjectiveNotes: sessionSubjectiveNotesEncrypted ? decryptPHI(sessionSubjectiveNotesEncrypted) : null,
        sessionObjectiveNotes: sessionObjectiveNotesEncrypted ? decryptPHI(sessionObjectiveNotesEncrypted) : null,
        sessionAssessmentNotes: sessionAssessmentNotesEncrypted ? decryptPHI(sessionAssessmentNotesEncrypted) : null,
        sessionPlanNotes: sessionPlanNotesEncrypted ? decryptPHI(sessionPlanNotesEncrypted) : null,
        sessionTreatmentGoals: sessionTreatmentGoalsEncrypted ? decryptPHI(sessionTreatmentGoalsEncrypted) : null,
        sessionProgressNotes: sessionProgressNotesEncrypted ? decryptPHI(sessionProgressNotesEncrypted) : null,
        sessionInterventions: sessionInterventionsEncrypted ? decryptPHI(sessionInterventionsEncrypted) : null,
      };
    } catch (error) {
      console.error('Error in ClinicalSessionService.getSession:', error);
      throw error;
    }
  }

  /**
   * Create a new clinical session
   */
  static async createSession(sessionData: any) {
    console.log('[ClinicalSessionService] Creating session with data:', {
      patientId: sessionData.patientId,
      organizationId: sessionData.organizationId,
      therapistId: sessionData.therapistId,
      date: sessionData.date,
      type: sessionData.type
    });
    
    try {
      // Validate required fields
      if (!sessionData.patientId) {
        throw new Error('patientId is required');
      }
      if (!sessionData.organizationId) {
        throw new Error('organizationId is required');
      }
      if (!sessionData.therapistId) {
        throw new Error('therapistId is required');
      }
      if (!sessionData.date) {
        throw new Error('date is required');
      }
      
      // Convert date string to Date object for database
      let processedData;
      try {
        processedData = {
          ...sessionData,
          date: sessionData.date ? new Date(sessionData.date) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log('[ClinicalSessionService] Date parsed successfully:', processedData.date);
      } catch (dateError) {
        console.error('[ClinicalSessionService] Date parsing failed:', dateError);
        throw new Error(`Invalid date format: ${sessionData.date}`);
      }

      // Check for overlapping sessions before creating
      const duration = processedData.duration || 50;
      const hasOverlap = await ClinicalSessionRepository.hasOverlappingSession(
        processedData.therapistId,
        processedData.date,
        duration
      );

      if (hasOverlap) {
        throw new Error('A session is already scheduled at this time. Please choose a different time slot.');
      }

      // Encrypt PHI fields and build clean data object for database
      let encryptedData: any;
      try {
        // Start with required fields
        encryptedData = {
          organizationId: processedData.organizationId,
          patientId: processedData.patientId,
          therapistId: processedData.therapistId,
          date: processedData.date,
          createdAt: processedData.createdAt,
          updatedAt: processedData.updatedAt,
        };

        // Add optional fields only if they are defined (not undefined)
        // Allow null values since they're explicitly provided
        if (processedData.duration !== undefined) {
          encryptedData.duration = processedData.duration;
        }
        if (processedData.type !== undefined) {
          encryptedData.type = processedData.type;
        }
        if (processedData.status !== undefined) {
          encryptedData.status = processedData.status;
        }
        if (processedData.isIntake !== undefined) {
          encryptedData.isIntake = processedData.isIntake;
        }
        if (processedData.sessionFormat !== undefined) {
          encryptedData.sessionFormat = processedData.sessionFormat;
        }
        if (processedData.cptCode !== undefined) {
          encryptedData.cptCode = processedData.cptCode;
        }
        if (processedData.addOnCptCodes !== undefined) {
          encryptedData.addOnCptCodes = processedData.addOnCptCodes;
        }
        if (processedData.authorizationRequired !== undefined) {
          encryptedData.authorizationRequired = processedData.authorizationRequired;
        }
        // Only include authorizationNumber if authorizationRequired is true, or if explicitly provided
        if (processedData.authorizationNumber !== undefined) {
          encryptedData.authorizationNumber = processedData.authorizationNumber;
        }
        if (processedData.isPaid !== undefined) {
          encryptedData.isPaid = processedData.isPaid;
        }
        if (processedData.paymentId !== undefined) {
          encryptedData.paymentId = processedData.paymentId;
        }

        // Encrypt PHI fields only if they have values
        const sessionClinicalNotes = encryptPHI(processedData.sessionClinicalNotesEncrypted);
        if (sessionClinicalNotes !== null && sessionClinicalNotes !== undefined) {
          encryptedData.sessionClinicalNotesEncrypted = sessionClinicalNotes;
        }
        const sessionSubjectiveNotes = encryptPHI(processedData.sessionSubjectiveNotesEncrypted);
        if (sessionSubjectiveNotes !== null && sessionSubjectiveNotes !== undefined) {
          encryptedData.sessionSubjectiveNotesEncrypted = sessionSubjectiveNotes;
        }
        const sessionObjectiveNotes = encryptPHI(processedData.sessionObjectiveNotesEncrypted);
        if (sessionObjectiveNotes !== null && sessionObjectiveNotes !== undefined) {
          encryptedData.sessionObjectiveNotesEncrypted = sessionObjectiveNotes;
        }
        const sessionAssessmentNotes = encryptPHI(processedData.sessionAssessmentNotesEncrypted);
        if (sessionAssessmentNotes !== null && sessionAssessmentNotes !== undefined) {
          encryptedData.sessionAssessmentNotesEncrypted = sessionAssessmentNotes;
        }
        const sessionPlanNotes = encryptPHI(processedData.sessionPlanNotesEncrypted);
        if (sessionPlanNotes !== null && sessionPlanNotes !== undefined) {
          encryptedData.sessionPlanNotesEncrypted = sessionPlanNotes;
        }
        const sessionTreatmentGoals = encryptPHI(processedData.sessionTreatmentGoalsEncrypted);
        if (sessionTreatmentGoals !== null && sessionTreatmentGoals !== undefined) {
          encryptedData.sessionTreatmentGoalsEncrypted = sessionTreatmentGoals;
        }
        const sessionProgressNotes = encryptPHI(processedData.sessionProgressNotesEncrypted);
        if (sessionProgressNotes !== null && sessionProgressNotes !== undefined) {
          encryptedData.sessionProgressNotesEncrypted = sessionProgressNotes;
        }
        const sessionInterventions = encryptPHI(processedData.sessionInterventionsEncrypted);
        if (sessionInterventions !== null && sessionInterventions !== undefined) {
          encryptedData.sessionInterventionsEncrypted = sessionInterventions;
        }

        console.log('[ClinicalSessionService] PHI fields encrypted successfully');
        console.log('[ClinicalSessionService] Prepared data for insert:', {
          organizationId: encryptedData.organizationId,
          patientId: encryptedData.patientId,
          therapistId: encryptedData.therapistId,
          date: encryptedData.date,
          hasCptCode: !!encryptedData.cptCode,
          hasAddOnCodes: !!encryptedData.addOnCptCodes,
        });
      } catch (encryptError) {
        console.error('[ClinicalSessionService] PHI encryption failed:', encryptError);
        const error = new Error('Failed to encrypt PHI data');
        (error as any).originalError = encryptError;
        throw error;
      }

      // Insert into database
      let newSession;
      try {
        // Defensive: ensure no id field is passed down
        if ('id' in encryptedData) {
          console.warn('[ClinicalSessionService] Removing id from encryptedData before repository call. Incoming id:', (encryptedData as any).id);
          delete (encryptedData as any).id;
        }
        console.log('[ClinicalSessionService] Calling repository with data (excluding PHI). Keys:', Object.keys(encryptedData).filter(k => !k.includes('Encrypted')));
        console.log('[ClinicalSessionService] Verifying id is absent:', 'id' in encryptedData ? 'PRESENT (ERROR!)' : 'absent (OK)');
        newSession = await ClinicalSessionRepository.createSession(encryptedData);
        console.log('[ClinicalSessionService] Database insert successful, session ID:', newSession.id);
      } catch (dbError) {
        console.error('[ClinicalSessionService] Database insert failed:', dbError);
        throw dbError; // Preserve the original database error
      }
      
      // Return decrypted version with clean property names
      try {
        const { 
          sessionClinicalNotesEncrypted,
          sessionSubjectiveNotesEncrypted,
          sessionObjectiveNotesEncrypted,
          sessionAssessmentNotesEncrypted,
          sessionPlanNotesEncrypted,
          sessionTreatmentGoalsEncrypted,
          sessionProgressNotesEncrypted,
          sessionInterventionsEncrypted,
          ...rest 
        } = newSession;
        
        return {
          ...rest,
          // Decrypted fields use clean property names (no "Encrypted" suffix)
          sessionClinicalNotes: sessionClinicalNotesEncrypted ? decryptPHI(sessionClinicalNotesEncrypted) : null,
          sessionSubjectiveNotes: sessionSubjectiveNotesEncrypted ? decryptPHI(sessionSubjectiveNotesEncrypted) : null,
          sessionObjectiveNotes: sessionObjectiveNotesEncrypted ? decryptPHI(sessionObjectiveNotesEncrypted) : null,
          sessionAssessmentNotes: sessionAssessmentNotesEncrypted ? decryptPHI(sessionAssessmentNotesEncrypted) : null,
          sessionPlanNotes: sessionPlanNotesEncrypted ? decryptPHI(sessionPlanNotesEncrypted) : null,
          sessionTreatmentGoals: sessionTreatmentGoalsEncrypted ? decryptPHI(sessionTreatmentGoalsEncrypted) : null,
          sessionProgressNotes: sessionProgressNotesEncrypted ? decryptPHI(sessionProgressNotesEncrypted) : null,
          sessionInterventions: sessionInterventionsEncrypted ? decryptPHI(sessionInterventionsEncrypted) : null,
        };
      } catch (decryptError) {
        console.error('[ClinicalSessionService] PHI decryption failed (returning raw session):', decryptError);
        // Return the session even if decryption fails, as it was successfully created
        return newSession;
      }
    } catch (error: any) {
      console.error('[ClinicalSessionService] Error in createSession:', error);
      console.error('[ClinicalSessionService] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Update a clinical session
   */
  static async updateSession(sessionId: number, updateData: any, userId: number) {
    try {
      // Encrypt PHI fields if they're being updated
      const encryptedData = { ...updateData };
      
      if (updateData.sessionClinicalNotesEncrypted !== undefined) {
        encryptedData.sessionClinicalNotesEncrypted = encryptPHI(updateData.sessionClinicalNotesEncrypted);
      }
      if (updateData.sessionSubjectiveNotesEncrypted !== undefined) {
        encryptedData.sessionSubjectiveNotesEncrypted = encryptPHI(updateData.sessionSubjectiveNotesEncrypted);
      }
      if (updateData.sessionObjectiveNotesEncrypted !== undefined) {
        encryptedData.sessionObjectiveNotesEncrypted = encryptPHI(updateData.sessionObjectiveNotesEncrypted);
      }
      if (updateData.sessionAssessmentNotesEncrypted !== undefined) {
        encryptedData.sessionAssessmentNotesEncrypted = encryptPHI(updateData.sessionAssessmentNotesEncrypted);
      }
      if (updateData.sessionPlanNotesEncrypted !== undefined) {
        encryptedData.sessionPlanNotesEncrypted = encryptPHI(updateData.sessionPlanNotesEncrypted);
      }
      if (updateData.sessionTreatmentGoalsEncrypted !== undefined) {
        encryptedData.sessionTreatmentGoalsEncrypted = encryptPHI(updateData.sessionTreatmentGoalsEncrypted);
      }
      if (updateData.sessionProgressNotesEncrypted !== undefined) {
        encryptedData.sessionProgressNotesEncrypted = encryptPHI(updateData.sessionProgressNotesEncrypted);
      }
      if (updateData.sessionInterventionsEncrypted !== undefined) {
        encryptedData.sessionInterventionsEncrypted = encryptPHI(updateData.sessionInterventionsEncrypted);
      }

      const updatedSession = await ClinicalSessionRepository.updateSession(sessionId, encryptedData, userId);
      
      if (!updatedSession) {
        return null;
      }
      
      // Return decrypted version with clean property names
      const { 
        sessionClinicalNotesEncrypted,
        sessionSubjectiveNotesEncrypted,
        sessionObjectiveNotesEncrypted,
        sessionAssessmentNotesEncrypted,
        sessionPlanNotesEncrypted,
        sessionTreatmentGoalsEncrypted,
        sessionProgressNotesEncrypted,
        sessionInterventionsEncrypted,
        ...rest 
      } = updatedSession;
      
      return {
        ...rest,
        // Decrypted fields use clean property names (no "Encrypted" suffix)
        sessionClinicalNotes: sessionClinicalNotesEncrypted ? decryptPHI(sessionClinicalNotesEncrypted) : null,
        sessionSubjectiveNotes: sessionSubjectiveNotesEncrypted ? decryptPHI(sessionSubjectiveNotesEncrypted) : null,
        sessionObjectiveNotes: sessionObjectiveNotesEncrypted ? decryptPHI(sessionObjectiveNotesEncrypted) : null,
        sessionAssessmentNotes: sessionAssessmentNotesEncrypted ? decryptPHI(sessionAssessmentNotesEncrypted) : null,
        sessionPlanNotes: sessionPlanNotesEncrypted ? decryptPHI(sessionPlanNotesEncrypted) : null,
        sessionTreatmentGoals: sessionTreatmentGoalsEncrypted ? decryptPHI(sessionTreatmentGoalsEncrypted) : null,
        sessionProgressNotes: sessionProgressNotesEncrypted ? decryptPHI(sessionProgressNotesEncrypted) : null,
        sessionInterventions: sessionInterventionsEncrypted ? decryptPHI(sessionInterventionsEncrypted) : null,
      };
    } catch (error) {
      console.error('Error in ClinicalSessionService.updateSession:', error);
      throw error;
    }
  }

  /**
   * Delete a clinical session
   */
  static async deleteSession(sessionId: number, userId: number) {
    try {
      return await ClinicalSessionRepository.deleteSession(sessionId, userId);
    } catch (error) {
      console.error('Error in ClinicalSessionService.deleteSession:', error);
      throw error;
    }
  }

  /**
   * Get sessions for a specific patient
   */
  static async getPatientSessions(patientId: number, userId: number) {
    try {
      const sessions = await ClinicalSessionRepository.getPatientSessions(patientId, userId);
      
      // Decrypt PHI fields for each session, handling null/undefined safely
      // Return clean property names (without "Encrypted" suffix) for decrypted data
      return sessions.map(session => {
        const { 
          sessionClinicalNotesEncrypted,
          sessionSubjectiveNotesEncrypted,
          sessionObjectiveNotesEncrypted,
          sessionAssessmentNotesEncrypted,
          sessionPlanNotesEncrypted,
          sessionTreatmentGoalsEncrypted,
          sessionProgressNotesEncrypted,
          sessionInterventionsEncrypted,
          ...rest 
        } = session;
        
        return {
          ...rest,
          // Decrypted fields use clean property names (no "Encrypted" suffix)
          sessionClinicalNotes: sessionClinicalNotesEncrypted ? decryptPHI(sessionClinicalNotesEncrypted) : null,
          sessionSubjectiveNotes: sessionSubjectiveNotesEncrypted ? decryptPHI(sessionSubjectiveNotesEncrypted) : null,
          sessionObjectiveNotes: sessionObjectiveNotesEncrypted ? decryptPHI(sessionObjectiveNotesEncrypted) : null,
          sessionAssessmentNotes: sessionAssessmentNotesEncrypted ? decryptPHI(sessionAssessmentNotesEncrypted) : null,
          sessionPlanNotes: sessionPlanNotesEncrypted ? decryptPHI(sessionPlanNotesEncrypted) : null,
          sessionTreatmentGoals: sessionTreatmentGoalsEncrypted ? decryptPHI(sessionTreatmentGoalsEncrypted) : null,
          sessionProgressNotes: sessionProgressNotesEncrypted ? decryptPHI(sessionProgressNotesEncrypted) : null,
          sessionInterventions: sessionInterventionsEncrypted ? decryptPHI(sessionInterventionsEncrypted) : null,
        };
      });
    } catch (error) {
      console.error('Error in ClinicalSessionService.getPatientSessions:', error);
      // If the table doesn't exist, return empty array instead of throwing
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('does not exist')) {
        console.warn('Clinical sessions table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }
}
