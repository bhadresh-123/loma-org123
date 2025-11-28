import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { MedicalCodesService } from '../services/MedicalCodesService';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { db } from '@db';
import { organizationMemberships } from '@db/schema';
import { eq } from 'drizzle-orm';
import { withCache, CachePresets, invalidateMedicalCodesCache } from '../middleware/cache-middleware';

const router = Router();

/**
 * Medical Codes API Routes
 * 
 * Provides CRUD operations for medical billing codes (CPT, ICD-10, HCPCS).
 * Read operations are available to all authenticated users.
 * Write operations require business_owner or canManageSettings permission.
 */

// Validation schemas
const createCPTCodeSchema = z.object({
  code: z.string().min(1).max(10),
  description: z.string().min(1).max(500),
  category: z.enum(['individual', 'family', 'group', 'assessment', 'addon']).optional(),
  duration: z.number().int().min(1).max(240).optional(),
  effectiveDate: z.string().datetime().optional(),
  terminationDate: z.string().datetime().optional(),
});

const updateCPTCodeSchema = createCPTCodeSchema.partial();

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

// GET /api/medical-codes/cpt - Get all CPT codes
router.get('/cpt', 
  authenticateToken,
  withCache(CachePresets.medicalCodes(() => 'cpt:all')),
  async (req, res) => {
    try {
      const codes = await MedicalCodesService.getAllCPTCodes();
      res.json(codes);
    } catch (error) {
      console.error('Error fetching CPT codes:', error);
      res.status(500).json({ 
        error: 'CPT_CODES_FETCH_FAILED',
        message: 'Failed to fetch CPT codes'
      });
    }
  }
);

// GET /api/medical-codes/cpt/:code - Get specific CPT code
router.get('/cpt/:code',
  authenticateToken,
  withCache(CachePresets.medicalCodes(req => `cpt:${req.params.code}`)),
  async (req, res) => {
    try {
      const { code } = req.params;
      const cptCode = await MedicalCodesService.getCPTCodeByCode(code);
      
      if (!cptCode) {
        return res.status(404).json({
          error: 'CPT_CODE_NOT_FOUND',
          message: `CPT code ${code} not found`
        });
      }
      
      res.json(cptCode);
    } catch (error) {
      console.error('Error fetching CPT code:', error);
      res.status(500).json({ 
        error: 'CPT_CODE_FETCH_FAILED',
        message: 'Failed to fetch CPT code'
      });
    }
  }
);

// POST /api/medical-codes/cpt - Create new CPT code (admin only)
router.post('/cpt', authenticateToken, validateRequest(createCPTCodeSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can create CPT codes'
      });
    }
    
    const newCode = await MedicalCodesService.createCPTCode(req.body, userId);
    
    // Invalidate CPT codes cache
    await invalidateMedicalCodesCache('cpt');
    
    res.status(201).json(newCode);
  } catch (error) {
    console.error('Error creating CPT code:', error);
    res.status(500).json({ 
      error: 'CPT_CODE_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create CPT code'
    });
  }
});

// PUT /api/medical-codes/cpt/:id - Update CPT code (admin only)
router.put('/cpt/:id', authenticateToken, validateRequest(updateCPTCodeSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid CPT code ID'
      });
    }
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can update CPT codes'
      });
    }
    
    const updated = await MedicalCodesService.updateCPTCode(id, req.body, userId);
    
    // Invalidate CPT codes cache
    await invalidateMedicalCodesCache('cpt');
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating CPT code:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'CPT_CODE_NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'CPT_CODE_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to update CPT code'
    });
  }
});

// DELETE /api/medical-codes/cpt/:id - Soft delete CPT code (admin only)
router.delete('/cpt/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid CPT code ID'
      });
    }
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can delete CPT codes'
      });
    }
    
    await MedicalCodesService.deleteCPTCode(id, userId);
    
    // Invalidate CPT codes cache
    await invalidateMedicalCodesCache('cpt');
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting CPT code:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'CPT_CODE_NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'CPT_CODE_DELETE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to delete CPT code'
    });
  }
});

// ============================================================================
// DIAGNOSIS CODES (ICD-10) ROUTES
// ============================================================================

// GET /api/medical-codes/diagnosis - Get all diagnosis codes
router.get('/diagnosis',
  authenticateToken,
  withCache(CachePresets.medicalCodes(() => 'diagnosis:all')),
  async (req, res) => {
    try {
      const codes = await MedicalCodesService.getAllDiagnosisCodes();
      res.json(codes);
    } catch (error) {
      console.error('Error fetching diagnosis codes:', error);
      res.status(500).json({ 
        error: 'DIAGNOSIS_CODES_FETCH_FAILED',
        message: 'Failed to fetch diagnosis codes'
      });
    }
  }
);

// GET /api/medical-codes/diagnosis/:code - Get specific diagnosis code
router.get('/diagnosis/:code',
  authenticateToken,
  withCache(CachePresets.medicalCodes(req => `diagnosis:${req.params.code}`)),
  async (req, res) => {
    try {
      const { code } = req.params;
      const diagnosisCode = await MedicalCodesService.getDiagnosisCodeByCode(code);
      
      if (!diagnosisCode) {
        return res.status(404).json({
          error: 'DIAGNOSIS_CODE_NOT_FOUND',
          message: `Diagnosis code ${code} not found`
        });
      }
      
      res.json(diagnosisCode);
    } catch (error) {
      console.error('Error fetching diagnosis code:', error);
      res.status(500).json({ 
        error: 'DIAGNOSIS_CODE_FETCH_FAILED',
        message: 'Failed to fetch diagnosis code'
      });
    }
  }
);

// POST /api/medical-codes/diagnosis - Create new diagnosis code (admin only)
router.post('/diagnosis', authenticateToken, validateRequest(createCPTCodeSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can create diagnosis codes'
      });
    }
    
    const newCode = await MedicalCodesService.createDiagnosisCode(req.body, userId);
    
    // Invalidate diagnosis codes cache
    await invalidateMedicalCodesCache('icd10');
    
    res.status(201).json(newCode);
  } catch (error) {
    console.error('Error creating diagnosis code:', error);
    res.status(500).json({ 
      error: 'DIAGNOSIS_CODE_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create diagnosis code'
    });
  }
});

// PUT /api/medical-codes/diagnosis/:id - Update diagnosis code (admin only)
router.put('/diagnosis/:id', authenticateToken, validateRequest(updateCPTCodeSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid diagnosis code ID'
      });
    }
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can update diagnosis codes'
      });
    }
    
    const updated = await MedicalCodesService.updateDiagnosisCode(id, req.body, userId);
    
    // Invalidate diagnosis codes cache
    await invalidateMedicalCodesCache('icd10');
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating diagnosis code:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'DIAGNOSIS_CODE_NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'DIAGNOSIS_CODE_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to update diagnosis code'
    });
  }
});

// DELETE /api/medical-codes/diagnosis/:id - Soft delete diagnosis code (admin only)
router.delete('/diagnosis/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid diagnosis code ID'
      });
    }
    
    // Check admin permission
    const hasPermission = await checkAdminPermission(userId);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'PERMISSION_DENIED',
        message: 'Only administrators can delete diagnosis codes'
      });
    }
    
    await MedicalCodesService.deleteDiagnosisCode(id, userId);
    
    // Invalidate diagnosis codes cache
    await invalidateMedicalCodesCache('icd10');
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting diagnosis code:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'DIAGNOSIS_CODE_NOT_FOUND',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'DIAGNOSIS_CODE_DELETE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to delete diagnosis code'
    });
  }
});

export default router;

