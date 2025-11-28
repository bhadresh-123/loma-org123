import { db } from '@db';
import { assessmentCategories, type AssessmentCategory, type NewAssessmentCategory } from '@db/schema';
import { eq } from 'drizzle-orm';
import { HIPAAAuditService } from './ClinicalService';

/**
 * Assessment Categories Service
 * 
 * Manages assessment category types used for clinical assessments.
 * These are reference data shared across all organizations.
 */
export class AssessmentCategoriesService {
  /**
   * Get all active assessment categories
   */
  static async getAllCategories(): Promise<AssessmentCategory[]> {
    try {
      const categories = await db
        .select()
        .from(assessmentCategories)
        .where(eq(assessmentCategories.isActive, true))
        .orderBy(assessmentCategories.sortOrder, assessmentCategories.name);
      
      return categories;
    } catch (error) {
      console.error('Error fetching assessment categories:', error);
      throw new Error('Failed to fetch assessment categories');
    }
  }

  /**
   * Get specific assessment category by ID
   */
  static async getCategoryById(id: number): Promise<AssessmentCategory | null> {
    try {
      const [result] = await db
        .select()
        .from(assessmentCategories)
        .where(eq(assessmentCategories.id, id))
        .limit(1);
      
      return result || null;
    } catch (error) {
      console.error('Error fetching assessment category:', error);
      throw new Error('Failed to fetch assessment category');
    }
  }

  /**
   * Create new assessment category (admin only)
   */
  static async createCategory(
    data: Omit<NewAssessmentCategory, 'id' | 'createdAt' | 'updatedAt'>,
    userId: number
  ): Promise<AssessmentCategory> {
    try {
      const [newCategory] = await db
        .insert(assessmentCategories)
        .values({
          ...data,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'CREATE_ASSESSMENT_CATEGORY',
        resourceType: 'assessment_category',
        resourceId: newCategory.id,
        details: {
          name: newCategory.name,
          description: newCategory.description,
        }
      });
      
      return newCategory;
    } catch (error) {
      console.error('Error creating assessment category:', error);
      throw new Error('Failed to create assessment category');
    }
  }

  /**
   * Update assessment category (admin only)
   */
  static async updateCategory(
    id: number,
    data: Partial<Omit<NewAssessmentCategory, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
    userId: number
  ): Promise<AssessmentCategory> {
    try {
      // Get old value for audit
      const oldCategory = await this.getCategoryById(id);
      if (!oldCategory) {
        throw new Error('Assessment category not found');
      }
      
      const [updated] = await db
        .update(assessmentCategories)
        .set({
          ...data,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(assessmentCategories.id, id))
        .returning();
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'UPDATE_ASSESSMENT_CATEGORY',
        resourceType: 'assessment_category',
        resourceId: id,
        details: {
          oldValue: {
            name: oldCategory.name,
            description: oldCategory.description,
            isActive: oldCategory.isActive,
          },
          newValue: {
            name: updated.name,
            description: updated.description,
            isActive: updated.isActive,
          }
        }
      });
      
      return updated;
    } catch (error) {
      console.error('Error updating assessment category:', error);
      throw new Error('Failed to update assessment category');
    }
  }

  /**
   * Soft delete assessment category (admin only)
   * Sets isActive to false instead of deleting
   */
  static async deleteCategory(id: number, userId: number): Promise<void> {
    try {
      const category = await this.getCategoryById(id);
      if (!category) {
        throw new Error('Assessment category not found');
      }
      
      await db
        .update(assessmentCategories)
        .set({
          isActive: false,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(assessmentCategories.id, id));
      
      // Log audit trail
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'DELETE_ASSESSMENT_CATEGORY',
        resourceType: 'assessment_category',
        resourceId: id,
        details: {
          name: category.name,
          description: category.description,
        }
      });
    } catch (error) {
      console.error('Error deleting assessment category:', error);
      throw new Error('Failed to delete assessment category');
    }
  }
}

