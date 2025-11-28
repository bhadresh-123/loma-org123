import { Router } from 'express';
import { ClinicalSessionService } from '../services/ClinicalSessionService';
import { OrganizationService } from '../services/OrganizationService';
import { authenticateToken, rbac } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';
import { parsePagination, rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createClinicalSessionSchema = z.object({
  patientId: z.number().int().positive(),
  date: z.string().datetime(),
  duration: z.number().int().min(15).max(240).default(50),
  type: z.enum(['individual', 'couple', 'family', 'group']).default('individual'),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  sessionClinicalNotesEncrypted: z.string().optional(),
  sessionSubjectiveNotesEncrypted: z.string().optional(),
  sessionObjectiveNotesEncrypted: z.string().optional(),
  sessionAssessmentNotesEncrypted: z.string().optional(),
  sessionPlanNotesEncrypted: z.string().optional(),
  sessionTreatmentGoalsEncrypted: z.string().optional(),
  sessionProgressNotesEncrypted: z.string().optional(),
  sessionInterventionsEncrypted: z.string().optional(),
  isIntake: z.boolean().default(false),
  sessionFormat: z.enum(['in-person', 'telehealth']).optional(),
  cptCode: z.string().nullable().optional(),
  addOnCptCodes: z.array(z.string()).default([]),
  authorizationRequired: z.boolean().default(false),
  authorizationNumber: z.string().nullable().optional(),
  isPaid: z.boolean().default(false),
  paymentId: z.string().optional(),
});

const updateClinicalSessionSchema = createClinicalSessionSchema.partial();

// ============================================================================
// CLINICAL SESSION ROUTES
// ============================================================================

// GET /api/clinical-sessions - Get all clinical sessions for user's organization
// Supports pagination via query params: ?page=1&limit=50&sortBy=date&sortOrder=desc
router.get('/', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'CLINICAL_SESSION', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Parse pagination parameters
    const { page, limit, offset } = parsePagination(req);
    
    // Get all sessions (TODO: optimize with database-level pagination)
    const allSessions = await ClinicalSessionService.getUserSessions(userId);
    
    // Apply pagination in-memory
    const total = allSessions.length;
    const paginatedSessions = allSessions.slice(offset, offset + limit);
    
    res.json({
      success: true,
      data: paginatedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching clinical sessions:', error);
    res.status(500).json({
      error: 'CLINICAL_SESSIONS_FETCH_FAILED',
      message: 'Failed to fetch clinical sessions'
    });
  }
});

// GET /api/clinical-sessions/:id - Get specific clinical session
router.get('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'CLINICAL_SESSION', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params.id);
    
    const session = await ClinicalSessionService.getSession(sessionId, userId);
    
    if (!session) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Clinical session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching clinical session:', error);
    res.status(500).json({
      error: 'CLINICAL_SESSION_FETCH_FAILED',
      message: 'Failed to fetch clinical session'
    });
  }
});

// POST /api/clinical-sessions - Create new clinical session
router.post('/', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('CREATE', 'CLINICAL_SESSION', { trackFields: true, requireAuthorization: true }),
  validateRequest(createClinicalSessionSchema), 
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionData = req.body;
    
    console.log('[Clinical Session Creation] Starting session creation for user:', userId);
    console.log('[Clinical Session Creation] Session data:', {
      patientId: sessionData.patientId,
      date: sessionData.date,
      type: sessionData.type,
      status: sessionData.status,
      hasNotes: !!sessionData.sessionClinicalNotesEncrypted
    });
    
    // Get user's organization
    let userOrganizations;
    try {
      userOrganizations = await OrganizationService.getUserOrganizations(userId);
      console.log('[Clinical Session Creation] Found organizations:', userOrganizations.length);
    } catch (orgError) {
      console.error('[Clinical Session Creation] Failed to fetch user organizations:', orgError);
      return res.status(500).json({
        error: 'ORGANIZATION_FETCH_FAILED',
        message: 'Failed to retrieve user organization',
        details: process.env.NODE_ENV === 'development' ? orgError.message : undefined
      });
    }
    
    if (userOrganizations.length === 0) {
      console.warn('[Clinical Session Creation] User has no organization:', userId);
      return res.status(400).json({
        error: 'NO_ORGANIZATION',
        message: 'User must belong to an organization to create sessions'
      });
    }
    
    const organizationId = userOrganizations[0].organizationId;
    console.log('[Clinical Session Creation] Using organization:', organizationId);
    
    // Validate patient exists and belongs to organization
    try {
      const patient = await ClinicalSessionService.validatePatientAccess(sessionData.patientId, organizationId);
      if (!patient) {
        console.warn('[Clinical Session Creation] Patient not found or not accessible:', sessionData.patientId);
        return res.status(404).json({
          error: 'PATIENT_NOT_FOUND',
          message: 'Patient not found or not accessible in this organization'
        });
      }
    } catch (patientError) {
      console.error('[Clinical Session Creation] Patient validation failed:', patientError);
      return res.status(500).json({
        error: 'PATIENT_VALIDATION_FAILED',
        message: 'Failed to validate patient access',
        details: process.env.NODE_ENV === 'development' ? patientError.message : undefined
      });
    }
    
    let newSession;
    try {
      newSession = await ClinicalSessionService.createSession({
        ...sessionData,
        organizationId,
        therapistId: userId
      });
      console.log('[Clinical Session Creation] Session created successfully:', newSession.id);
    } catch (createError: any) {
      console.error('[Clinical Session Creation] Failed to create session:', createError);
      console.error('[Clinical Session Creation] Error details:', {
        name: createError.name,
        message: createError.message,
        code: createError.code,
        constraint: createError.constraint,
        table: createError.table,
        column: createError.column
      });
      
      // Handle specific error types
      if (createError.message?.includes('does not exist')) {
        return res.status(500).json({
          error: 'DATABASE_SCHEMA_ERROR',
          message: 'Database schema is not properly configured',
          details: process.env.NODE_ENV === 'development' ? createError.message : 'Please contact support'
        });
      }
      
      if (createError.message?.includes('encryption')) {
        return res.status(500).json({
          error: 'ENCRYPTION_ERROR',
          message: 'Failed to encrypt session data',
          details: process.env.NODE_ENV === 'development' ? createError.message : 'Please contact support'
        });
      }
      
      if (createError.code === '23503') { // Foreign key violation
        return res.status(400).json({
          error: 'INVALID_REFERENCE',
          message: 'Referenced patient, therapist, or organization does not exist',
          details: process.env.NODE_ENV === 'development' ? createError.detail : undefined
        });
      }
      
      if (createError.code === '23502') { // Not null violation
        return res.status(400).json({
          error: 'MISSING_REQUIRED_FIELD',
          message: 'Required field is missing',
          details: process.env.NODE_ENV === 'development' ? createError.column : undefined
        });
      }
      
      throw createError; // Re-throw if not handled
    }
    
    res.status(201).json({
      success: true,
      data: newSession,
      message: 'Clinical session created successfully'
    });
  } catch (error: any) {
    console.error('[Clinical Session Creation] Unhandled error:', error);
    console.error('[Clinical Session Creation] Stack trace:', error.stack);
    res.status(500).json({
      error: 'CLINICAL_SESSION_CREATE_FAILED',
      message: 'Failed to create clinical session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/clinical-sessions/:id - Update clinical session
router.put('/:id', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('UPDATE', 'CLINICAL_SESSION', { trackFields: true, requireAuthorization: true }),
  validateRequest(updateClinicalSessionSchema), 
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params.id);
    const updateData = req.body;
    
    const updatedSession = await ClinicalSessionService.updateSession(sessionId, updateData, userId);
    
    if (!updatedSession) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Clinical session not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedSession,
      message: 'Clinical session updated successfully'
    });
  } catch (error) {
    console.error('Error updating clinical session:', error);
    res.status(500).json({
      error: 'CLINICAL_SESSION_UPDATE_FAILED',
      message: 'Failed to update clinical session'
    });
  }
});

// DELETE /api/clinical-sessions/:id - Delete clinical session
router.delete('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('DELETE', 'CLINICAL_SESSION', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params.id);
    
    const deleted = await ClinicalSessionService.deleteSession(sessionId, userId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Clinical session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Clinical session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting clinical session:', error);
    res.status(500).json({
      error: 'CLINICAL_SESSION_DELETE_FAILED',
      message: 'Failed to delete clinical session'
    });
  }
});

// GET /api/clinical-sessions/patient/:patientId - Get sessions for specific patient
router.get('/patient/:patientId', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'CLINICAL_SESSION', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user!.id;
    const patientId = parseInt(req.params.patientId);
    
    const sessions = await ClinicalSessionService.getPatientSessions(patientId, userId);
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error fetching patient sessions:', error);
    res.status(500).json({
      error: 'PATIENT_SESSIONS_FETCH_FAILED',
      message: 'Failed to fetch patient sessions'
    });
  }
});

export default router;
