import { PatientTreatmentPlanRepository } from '../repositories';
import { encryptPHI, decryptPHI, createSearchHash } from '../utils/phi-encryption';

/**
 * Patient Treatment Plan Service
 * 
 * Handles treatment plan management with HIPAA compliance and organization-aware access control
 */
export class PatientTreatmentPlanService {
  
  /**
   * Get all treatment plans for a user's organization
   */
  static async getUserTreatmentPlans(userId: number) {
    try {
      const plans = await PatientTreatmentPlanRepository.getUserTreatmentPlans(userId);
      
      // Decrypt PHI fields for each plan
      return plans.map(plan => ({
        ...plan,
        progressNotesEncrypted: decryptPHI(plan.progressNotesEncrypted),
        therapistNotesEncrypted: decryptPHI(plan.therapistNotesEncrypted),
      }));
    } catch (error) {
      console.error('Error in PatientTreatmentPlanService.getUserTreatmentPlans:', error);
      throw error;
    }
  }

  /**
   * Get a specific treatment plan
   */
  static async getTreatmentPlan(planId: number, userId: number) {
    try {
      const plan = await PatientTreatmentPlanRepository.getTreatmentPlan(planId, userId);
      
      if (!plan) {
        return null;
      }
      
      // Decrypt PHI fields
      return {
        ...plan,
        progressNotesEncrypted: decryptPHI(plan.progressNotesEncrypted),
        therapistNotesEncrypted: decryptPHI(plan.therapistNotesEncrypted),
      };
    } catch (error) {
      console.error('Error in PatientTreatmentPlanService.getTreatmentPlan:', error);
      throw error;
    }
  }

  /**
   * Create a new treatment plan
   */
  static async createTreatmentPlan(planData: any) {
    try {
      // Encrypt PHI fields
      const encryptedData = {
        ...planData,
        progressNotesEncrypted: encryptPHI(planData.progressNotes),
        therapistNotesEncrypted: encryptPHI(planData.therapistNotes),
      };

      const newPlan = await PatientTreatmentPlanRepository.createTreatmentPlan(encryptedData);
      
      // Return decrypted version
      return {
        ...newPlan,
        progressNotesEncrypted: decryptPHI(newPlan.progressNotesEncrypted),
        therapistNotesEncrypted: decryptPHI(newPlan.therapistNotesEncrypted),
      };
    } catch (error) {
      console.error('Error in PatientTreatmentPlanService.createTreatmentPlan:', error);
      throw error;
    }
  }

  /**
   * Update a treatment plan
   */
  static async updateTreatmentPlan(planId: number, updateData: any, userId: number) {
    try {
      // Encrypt PHI fields if they're being updated
      const encryptedData = { ...updateData };
      
      if (updateData.progressNotes !== undefined) {
        encryptedData.progressNotesEncrypted = encryptPHI(updateData.progressNotes);
      }
      if (updateData.therapistNotes !== undefined) {
        encryptedData.therapistNotesEncrypted = encryptPHI(updateData.therapistNotes);
      }

      const updatedPlan = await PatientTreatmentPlanRepository.updateTreatmentPlan(planId, encryptedData, userId);
      
      if (!updatedPlan) {
        return null;
      }
      
      // Return decrypted version
      return {
        ...updatedPlan,
        progressNotesEncrypted: decryptPHI(updatedPlan.progressNotesEncrypted),
        therapistNotesEncrypted: decryptPHI(updatedPlan.therapistNotesEncrypted),
      };
    } catch (error) {
      console.error('Error in PatientTreatmentPlanService.updateTreatmentPlan:', error);
      throw error;
    }
  }

  /**
   * Delete a treatment plan
   */
  static async deleteTreatmentPlan(planId: number, userId: number) {
    try {
      return await PatientTreatmentPlanRepository.deleteTreatmentPlan(planId, userId);
    } catch (error) {
      console.error('Error in PatientTreatmentPlanService.deleteTreatmentPlan:', error);
      throw error;
    }
  }

  /**
   * Get treatment plans for a specific patient
   */
  static async getPatientTreatmentPlans(patientId: number, userId: number) {
    try {
      const plans = await PatientTreatmentPlanRepository.getPatientTreatmentPlans(patientId, userId);
      
      // Decrypt PHI fields for each plan
      return plans.map(plan => ({
        ...plan,
        progressNotesEncrypted: decryptPHI(plan.progressNotesEncrypted),
        therapistNotesEncrypted: decryptPHI(plan.therapistNotesEncrypted),
      }));
    } catch (error) {
      console.error('Error in PatientTreatmentPlanService.getPatientTreatmentPlans:', error);
      throw error;
    }
  }
}
