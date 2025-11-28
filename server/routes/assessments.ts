import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { AssessmentCategoriesService } from '../services/AssessmentCategoriesService';
import { validateRequest } from '../middleware/validation';
import { auditMiddleware } from '../middleware/audit-logging';
import { z } from 'zod';
import { db } from '@db';
import { organizationMemberships } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Assessment Categories API Routes
 * 
 * Provides CRUD operations for assessment category types.
 * Read operations are available to all authenticated users.
 * Write operations require business_owner or canManageSettings permission.
 */

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

/**
 * Check if user has admin permissions
 */
async function checkAdminPermission(userId: number): Promise<boolean> {
  try {
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
    
    if (!membership) {
      return false;
    }
    
    // Allow business_owner or users with canManageSettings permission
    return membership.role === 'business_owner' || membership.canManageSettings === true;
  } catch (error) {
    console.error('Error checking admin permission:', error);
    return false;
  }
}

// GET /api/assessments/categories - Get all assessment categories
router.get('/categories', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { trackFields: false }),
  async (req, res) => {
  try {
    const categories = await AssessmentCategoriesService.getAllCategories();
    
    // Return just the names as strings for backward compatibility with frontend
    const categoryNames = categories.map(cat => cat.name);
    res.json(categoryNames);
  } catch (error) {
    console.error('Error fetching assessment categories:', error);
    res.status(500).json({ 
      error: 'ASSESSMENT_CATEGORIES_FETCH_FAILED',
      message: 'Failed to fetch assessment categories'
    });
  }
});

// GET /api/assessments/categories/:id - Get specific assessment category
router.get('/categories/:id', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { trackFields: false }),
  async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid category ID'
      });
    }
    
    const category = await AssessmentCategoriesService.getCategoryById(id);
    
    if (!category) {
      return res.status(404).json({
        error: 'CATEGORY_NOT_FOUND',
        message: `Assessment category ${id} not found`
      });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error fetching assessment category:', error);
    res.status(500).json({ 
      error: 'CATEGORY_FETCH_FAILED',
      message: 'Failed to fetch assessment category'
    });
  }
});

// POST /api/assessments/categories - Create new assessment category (admin only)
router.post('/categories', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('CREATE', 'PATIENT', { trackFields: false }),
  validateRequest(createCategorySchema), 
  async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can create assessment categories'
      });
    }
    
    const newCategory = await AssessmentCategoriesService.createCategory(req.body, userId);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating assessment category:', error);
    res.status(500).json({ 
      error: 'CATEGORY_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create assessment category'
    });
  }
});

// PUT /api/assessments/categories/:id - Update assessment category (admin only)
router.put('/categories/:id', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('UPDATE', 'PATIENT', { trackFields: false }),
  validateRequest(updateCategorySchema), 
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid category ID'
      });
    }
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can update assessment categories'
      });
    }
    
    const updated = await AssessmentCategoriesService.updateCategory(id, req.body, userId);
    res.json(updated);
  } catch (error) {
    console.error('Error updating assessment category:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'CATEGORY_NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'CATEGORY_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to update assessment category'
    });
  }
});

// DELETE /api/assessments/categories/:id - Soft delete assessment category (admin only)
router.delete('/categories/:id', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('DELETE', 'PATIENT', { trackFields: false }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid category ID'
      });
    }
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can delete assessment categories'
      });
    }
    
    await AssessmentCategoriesService.deleteCategory(id, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting assessment category:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'CATEGORY_NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'CATEGORY_DELETE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to delete assessment category'
    });
  }
});

export default router;

