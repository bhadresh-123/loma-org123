import { db } from '@db';
import { medicalCodes, type MedicalCode, type NewMedicalCode } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { HIPAAAuditService } from './ClinicalService';

/**
 * Medical Codes Service
 * 
 * Manages medical billing codes (CPT, ICD-10, HCPCS) used for insurance billing.
 * These are reference data shared across all organizations.
 */
export class MedicalCodesService {
  /**
   * Get all active CPT codes
   */
  static async getAllCPTCodes(): Promise<MedicalCode[]> {
    try {
      const codes = await db
        .select()
        .from(medicalCodes)
        .where(and(
          eq(medicalCodes.codeType, 'cpt'),
          eq(medicalCodes.isActive, true)
        ))
        .orderBy(medicalCodes.code);
      
      return codes;
    } catch (error) {
      console.error('Error fetching CPT codes:', error);
      throw new Error('Failed to fetch CPT codes');
    }
  }

  /**
   * Get specific CPT code by code string
   */
  static async getCPTCodeByCode(code: string): Promise<MedicalCode | null> {
    try {
      const [result] = await db
        .select()
        .from(medicalCodes)
        .where(and(
          eq(medicalCodes.code, code),
          eq(medicalCodes.codeType, 'cpt')
        ))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching CPT code:', error);
      throw new Error('Failed to fetch CPT code');
    }
  }

  /**
   * Get medical code by ID
   */
  static async getCodeById(id: number): Promise<MedicalCode | null> {
    try {
      const [result] = await db
        .select()
        .from(medicalCodes)
        .where(eq(medicalCodes.id, id))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching medical code:', error);
      throw new Error('Failed to fetch medical code');
    }
  }

  /**
   * Create new CPT code (admin only)
   */
  static async createCPTCode(
    data: Omit<NewMedicalCode, 'id' | 'createdAt' | 'updatedAt'>,
    userId: number
  ): Promise<MedicalCode> {
    try {
      const [newCode] = await db
        .insert(medicalCodes)
        .values({
          ...data,
          codeType: 'cpt',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'CREATE_MEDICAL_CODE',
        resourceType: 'medical_code',
        resourceId: newCode.id,
        details: {
          code: newCode.code,
          description: newCode.description,
        }
      });
      
      return newCode;
    } catch (error) {
      console.error('Error creating CPT code:', error);
      throw new Error('Failed to create CPT code');
    }
  }

  /**
   * Update CPT code (admin only)
   */
  static async updateCPTCode(
    id: number,
    data: Partial<Omit<NewMedicalCode, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
    userId: number
  ): Promise<MedicalCode> {
    try {
      // Get old value for audit
      const oldCode = await this.getCodeById(id);
      if (!oldCode) {
        throw new Error('Medical code not found');
      }
      
      const [updated] = await db
        .update(medicalCodes)
        .set({
          ...data,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(medicalCodes.id, id))
        .returning();
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'UPDATE_MEDICAL_CODE',
        resourceType: 'medical_code',
        resourceId: id,
        details: {
          oldValue: {
            code: oldCode.code,
            description: oldCode.description,
            isActive: oldCode.isActive,
          },
          newValue: {
            code: updated.code,
            description: updated.description,
            isActive: updated.isActive,
          }
        }
      });
      
      return updated;
    } catch (error) {
      console.error('Error updating CPT code:', error);
      throw new Error('Failed to update CPT code');
    }
  }

  /**
   * Soft delete CPT code (admin only)
   * Sets isActive to false instead of deleting
   */
  static async deleteCPTCode(id: number, userId: number): Promise<void> {
    try {
      const code = await this.getCodeById(id);
      if (!code) {
        throw new Error('Medical code not found');
      }
      
      await db
        .update(medicalCodes)
        .set({
          isActive: false,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(medicalCodes.id, id));
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'DELETE_MEDICAL_CODE',
        resourceType: 'medical_code',
        resourceId: id,
        details: {
          code: code.code,
          description: code.description,
        }
      });
    } catch (error) {
      console.error('Error deleting CPT code:', error);
      throw new Error('Failed to delete CPT code');
    }
  }

  // ============================================================================
  // ICD-10 DIAGNOSIS CODES
  // ============================================================================

  /**
   * Get all active ICD-10 diagnosis codes
   */
  static async getAllDiagnosisCodes(): Promise<MedicalCode[]> {
    try {
      const codes = await db
        .select()
        .from(medicalCodes)
        .where(and(
          eq(medicalCodes.codeType, 'icd10'),
          eq(medicalCodes.isActive, true)
        ))
        .orderBy(medicalCodes.code);
      
      return codes;
    } catch (error) {
      console.error('Error fetching diagnosis codes:', error);
      throw new Error('Failed to fetch diagnosis codes');
    }
  }

  /**
   * Get specific diagnosis code by code string
   */
  static async getDiagnosisCodeByCode(code: string): Promise<MedicalCode | null> {
    try {
      const [result] = await db
        .select()
        .from(medicalCodes)
        .where(and(
          eq(medicalCodes.code, code),
          eq(medicalCodes.codeType, 'icd10')
        ))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching diagnosis code:', error);
      throw new Error('Failed to fetch diagnosis code');
    }
  }

  /**
   * Create new diagnosis code (admin only)
   */
  static async createDiagnosisCode(
    data: Omit<NewMedicalCode, 'id' | 'createdAt' | 'updatedAt'>,
    userId: number
  ): Promise<MedicalCode> {
    try {
      const [newCode] = await db
        .insert(medicalCodes)
        .values({
          ...data,
          codeType: 'icd10',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'CREATE_MEDICAL_CODE',
        resourceType: 'medical_code',
        resourceId: newCode.id,
        details: {
          code: newCode.code,
          description: newCode.description,
        }
      });
      
      return newCode;
    } catch (error) {
      console.error('Error creating diagnosis code:', error);
      throw new Error('Failed to create diagnosis code');
    }
  }

  /**
   * Update diagnosis code (admin only)
   */
  static async updateDiagnosisCode(
    id: number,
    data: Partial<Omit<NewMedicalCode, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
    userId: number
  ): Promise<MedicalCode> {
    try {
      // Get old value for audit
      const oldCode = await this.getCodeById(id);
      if (!oldCode) {
        throw new Error('Medical code not found');
      }
      
      const [updated] = await db
        .update(medicalCodes)
        .set({
          ...data,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(medicalCodes.id, id))
        .returning();
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'UPDATE_MEDICAL_CODE',
        resourceType: 'medical_code',
        resourceId: id,
        details: {
          oldValue: {
            code: oldCode.code,
            description: oldCode.description,
            isActive: oldCode.isActive,
          },
          newValue: {
            code: updated.code,
            description: updated.description,
            isActive: updated.isActive,
          }
        }
      });
      
      return updated;
    } catch (error) {
      console.error('Error updating diagnosis code:', error);
      throw new Error('Failed to update diagnosis code');
    }
  }

  /**
   * Soft delete diagnosis code (admin only)
   * Sets isActive to false instead of deleting
   */
  static async deleteDiagnosisCode(id: number, userId: number): Promise<void> {
    try {
      const code = await this.getCodeById(id);
      if (!code) {
        throw new Error('Medical code not found');
      }
      
      await db
        .update(medicalCodes)
        .set({
          isActive: false,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(medicalCodes.id, id));
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'DELETE_MEDICAL_CODE',
        resourceType: 'medical_code',
        resourceId: id,
        details: {
          code: code.code,
          description: code.description,
        }
      });
    } catch (error) {
      console.error('Error deleting diagnosis code:', error);
      throw new Error('Failed to delete diagnosis code');
    }
  }
}

