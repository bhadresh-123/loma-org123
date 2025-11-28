import { Router } from 'express';
import { PatientTreatmentPlanService } from '../services/PatientTreatmentPlanService';
import { OrganizationService } from '../services/OrganizationService';
import { authenticateToken, rbac } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';
import { rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createPatientTreatmentPlanSchema = z.object({
  patientId: z.number().int().positive(),
  planName: z.string().min(1),
  planType: z.enum(['individual', 'family', 'group']).default('individual'),
  status: z.enum(['active', 'completed', 'discontinued']).default('active'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  goals: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  interventions: z.array(z.string()).default([]),
  progressNotes: z.string().optional(),
  therapistNotes: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updatePatientTreatmentPlanSchema = createPatientTreatmentPlanSchema.partial();

// ============================================================================
// PATIENT TREATMENT PLAN ROUTES
// ============================================================================

// GET /api/patient-treatment-plans - Get all treatment plans for user's organization
router.get('/',
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'TREATMENT_PLAN', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const plans = await PatientTreatmentPlanService.getUserTreatmentPlans(userId);
    
    res.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Error fetching patient treatment plans:', error);
    res.status(500).json({
      error: 'TREATMENT_PLANS_FETCH_FAILED',
      message: 'Failed to fetch treatment plans'
    });
  }
});

// GET /api/patient-treatment-plans/:id - Get specific treatment plan
router.get('/:id',
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'TREATMENT_PLAN', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const planId = parseInt(req.params.id);
    
    const plan = await PatientTreatmentPlanService.getTreatmentPlan(planId, userId);
    
    if (!plan) {
      return res.status(404).json({
        error: 'TREATMENT_PLAN_NOT_FOUND',
        message: 'Treatment plan not found'
      });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error fetching treatment plan:', error);
    res.status(500).json({
      error: 'TREATMENT_PLAN_FETCH_FAILED',
      message: 'Failed to fetch treatment plan'
    });
  }
});

// POST /api/patient-treatment-plans - Create new treatment plan
router.post('/', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('CREATE', 'TREATMENT_PLAN', { trackFields: true, requireAuthorization: true }),
  validateRequest(createPatientTreatmentPlanSchema), 
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const planData = req.body;
    
    // Get user's organization
    const userOrganizations = await OrganizationService.getUserOrganizations(userId);
    if (userOrganizations.length === 0) {
      return res.status(400).json({
        error: 'NO_ORGANIZATION',
        message: 'User must belong to an organization to create treatment plans'
      });
    }
    
    const organizationId = userOrganizations[0].organizationId;
    
    const newPlan = await PatientTreatmentPlanService.createTreatmentPlan({
      ...planData,
      organizationId,
      therapistId: userId
    });
    
    res.status(201).json({
      success: true,
      data: newPlan,
      message: 'Treatment plan created successfully'
    });
  } catch (error) {
    console.error('Error creating treatment plan:', error);
    res.status(500).json({
      error: 'TREATMENT_PLAN_CREATE_FAILED',
      message: 'Failed to create treatment plan'
    });
  }
});

// PUT /api/patient-treatment-plans/:id - Update treatment plan
router.put('/:id', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('UPDATE', 'TREATMENT_PLAN', { trackFields: true, requireAuthorization: true }),
  validateRequest(updatePatientTreatmentPlanSchema), 
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const planId = parseInt(req.params.id);
    const updateData = req.body;
    
    const updatedPlan = await PatientTreatmentPlanService.updateTreatmentPlan(planId, updateData, userId);
    
    if (!updatedPlan) {
      return res.status(404).json({
        error: 'TREATMENT_PLAN_NOT_FOUND',
        message: 'Treatment plan not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedPlan,
      message: 'Treatment plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating treatment plan:', error);
    res.status(500).json({
      error: 'TREATMENT_PLAN_UPDATE_FAILED',
      message: 'Failed to update treatment plan'
    });
  }
});

// DELETE /api/patient-treatment-plans/:id - Delete treatment plan
router.delete('/:id',
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('DELETE', 'TREATMENT_PLAN', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const planId = parseInt(req.params.id);
    
    const deleted = await PatientTreatmentPlanService.deleteTreatmentPlan(planId, userId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'TREATMENT_PLAN_NOT_FOUND',
        message: 'Treatment plan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Treatment plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting treatment plan:', error);
    res.status(500).json({
      error: 'TREATMENT_PLAN_DELETE_FAILED',
      message: 'Failed to delete treatment plan'
    });
  }
});

// GET /api/patient-treatment-plans/patient/:patientId - Get treatment plans for specific patient
router.get('/patient/:patientId',
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'TREATMENT_PLAN', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const patientId = parseInt(req.params.patientId);
    
    const plans = await PatientTreatmentPlanService.getPatientTreatmentPlans(patientId, userId);
    
    res.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Error fetching patient treatment plans:', error);
    res.status(500).json({
      error: 'PATIENT_TREATMENT_PLANS_FETCH_FAILED',
      message: 'Failed to fetch patient treatment plans'
    });
  }
});

export default router;
