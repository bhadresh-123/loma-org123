import { Router } from 'express';
import { TherapistService } from '../services/TherapistService';
import { authenticateToken, rbac } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';
import { rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTherapistProfileSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  professionalTitle: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().length(2).optional(),
  licenseExpirationDate: z.string().optional(),
  npiNumber: z.string().optional(),
  taxonomyCode: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  sessionFormat: z.enum(['in-person', 'telehealth', 'both']).optional(),
  baseRate: z.number().positive().optional(),
  slidingScale: z.boolean().optional(),
  groupSessionRate: z.number().positive().optional(),
  therapistIdentities: z.array(z.string()).optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  businessAddress: z.string().optional(),
  businessCity: z.string().optional(),
  businessState: z.string().optional(),
  businessZip: z.string().optional(),
  cvFilename: z.string().optional(),
  cvOriginalName: z.string().optional(),
  cvMimeType: z.string().optional(),
  cvParsedForCredentialing: z.boolean().optional(),
  defaultNoteFormat: z.string().optional(),
  sessionDuration: z.number().int().positive().optional(),
  timeZone: z.string().optional(),
  isInsuranceProvider: z.boolean().optional(),
  acceptedProviders: z.array(z.string()).optional(),
  stripeConnectAccountId: z.string().optional(),
  stripeConnectOnboardingComplete: z.boolean().optional(),
  stripeConnectChargesEnabled: z.boolean().optional(),
  stripeConnectPayoutsEnabled: z.boolean().optional(),
  stripeConnectDetailsSubmitted: z.boolean().optional(),
  stripeConnectCardIssuingEnabled: z.boolean().optional(),
});

const updateTherapistProfileSchema = createTherapistProfileSchema.partial().omit({ userId: true });

const createTherapistPHISchema = z.object({
  userId: z.number().int().positive(),
  ssn: z.string().optional(),
  dob: z.string().optional(),
  homeAddress: z.string().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().optional(),
  homeZip: z.string().optional(),
  personalPhone: z.string().optional(),
  personalEmail: z.string().email().optional(),
  birthCity: z.string().optional(),
  birthState: z.string().optional(),
  birthCountry: z.string().optional(),
  isUsCitizen: z.boolean().optional(),
  workPermitVisa: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
});

const updateTherapistPHISchema = createTherapistPHISchema.partial().omit({ userId: true });

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /therapists
 * Get all therapists (with access control)
 */
router.get('/', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get organization ID from query params
    const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : undefined;
    
    let therapists;
    if (organizationId) {
      therapists = await TherapistService.getTherapistsInOrganization(organizationId, userId);
    } else {
      // Get user's own profile
      const profile = await TherapistService.getTherapistProfile(userId, userId);
      therapists = profile ? [profile] : [];
    }
    
    res.json({
      success: true,
      data: therapists,
      count: therapists.length
    });
  } catch (error) {
    console.error('Error fetching therapists:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch therapists',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /therapists/:id
 * Get specific therapist profile by user ID
 */
router.get('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const therapistId = parseInt(req.params.id);
    if (isNaN(therapistId)) {
      return res.status(400).json({ error: 'Invalid therapist ID' });
    }

    const therapist = await TherapistService.getTherapistProfile(therapistId, userId);
    
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found' });
    }

    res.json({
      success: true,
      data: therapist
    });
  } catch (error) {
    console.error('Error fetching therapist:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch therapist',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /therapists/:id/phi
 * Get therapist PHI by user ID
 */
router.get('/:id/phi', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('READ', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const therapistId = parseInt(req.params.id);
    if (isNaN(therapistId)) {
      return res.status(400).json({ error: 'Invalid therapist ID' });
    }

    const phi = await TherapistService.getTherapistPHI(therapistId, userId);
    
    if (!phi) {
      return res.status(404).json({ error: 'Therapist PHI not found' });
    }

    res.json({
      success: true,
      data: phi
    });
  } catch (error) {
    console.error('Error fetching therapist PHI:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch therapist PHI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /therapists
 * Create therapist profile
 */
router.post('/', 
  rateLimits.admin,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('CREATE', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  validateRequest(createTherapistProfileSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const therapist = await TherapistService.createTherapistProfile(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: therapist,
      message: 'Therapist profile created successfully'
    });
  } catch (error) {
    console.error('Error creating therapist profile:', error);
    res.status(500).json({ 
      error: 'Failed to create therapist profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /therapists/:id
 * Update therapist profile
 */
router.put('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('UPDATE', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  validateRequest(updateTherapistProfileSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const profileId = parseInt(req.params.id);
    if (isNaN(profileId)) {
      return res.status(400).json({ error: 'Invalid profile ID' });
    }

    const therapist = await TherapistService.updateTherapistProfile(profileId, req.body, userId);
    
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist profile not found' });
    }

    res.json({
      success: true,
      data: therapist,
      message: 'Therapist profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating therapist profile:', error);
    res.status(500).json({ 
      error: 'Failed to update therapist profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /therapists/:id/phi
 * Create therapist PHI
 */
router.post('/:id/phi', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('CREATE', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  validateRequest(createTherapistPHISchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const therapistId = parseInt(req.params.id);
    if (isNaN(therapistId)) {
      return res.status(400).json({ error: 'Invalid therapist ID' });
    }

    const phi = await TherapistService.createTherapistPHI(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: phi,
      message: 'Therapist PHI created successfully'
    });
  } catch (error) {
    console.error('Error creating therapist PHI:', error);
    res.status(500).json({ 
      error: 'Failed to create therapist PHI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /therapists/:id/phi
 * Update therapist PHI
 */
router.put('/:id/phi', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('UPDATE', 'THERAPIST_PHI', { trackFields: true, requireAuthorization: true }),
  validateRequest(updateTherapistPHISchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const therapistId = parseInt(req.params.id);
    if (isNaN(therapistId)) {
      return res.status(400).json({ error: 'Invalid therapist ID' });
    }

    const phi = await TherapistService.updateTherapistPHI(therapistId, req.body, userId);
    
    if (!phi) {
      return res.status(404).json({ error: 'Therapist PHI not found' });
    }

    res.json({
      success: true,
      data: phi,
      message: 'Therapist PHI updated successfully'
    });
  } catch (error) {
    console.error('Error updating therapist PHI:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to update therapist PHI',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
