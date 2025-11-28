import { Router } from 'express';
import { PatientService } from '../services/PatientService';
import { OrganizationService } from '../services/OrganizationService';
import { authenticateToken, rbac } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';
import { parsePagination, rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';
import { z } from 'zod';
import { db, getActiveSchema } from '@db';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createPatientSchema = z.object({
  organizationId: z.number().int().positive(),
  primaryTherapistId: z.number().int().positive(),
  assignedTherapistIds: z.array(z.number().int().positive()).optional(),
  name: z.string().min(1).max(255),
  status: z.enum(['active', 'inactive', 'discharged']).optional(),
  type: z.enum(['individual', 'couple', 'family', 'group']).optional(),
  
  // Contact PHI
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  homeAddress: z.string().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().optional(),
  homeZip: z.string().optional(),
  
  // Demographics PHI
  dob: z.string().optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),
  pronouns: z.string().optional(),
  hometown: z.string().optional(),
  
  // Clinical PHI
  clinicalNotes: z.string().optional(),
  diagnosisCodes: z.string().optional(),
  primaryDiagnosis: z.string().optional(),
  secondaryDiagnosis: z.string().optional(),
  tertiaryDiagnosis: z.string().optional(),
  medicalHistory: z.string().optional(),
  treatmentHistory: z.string().optional(),
  
  // Medical provider PHI
  referringPhysician: z.string().optional(),
  referringPhysicianNpi: z.string().optional(),
  
  // Insurance PHI
  insuranceProvider: z.string().optional(),
  insuranceInfo: z.string().optional(),
  memberId: z.string().optional(),
  groupNumber: z.string().optional(),
  primaryInsuredName: z.string().optional(),
  primaryInsuredDob: z.string().optional(),
  authorizationInfo: z.string().optional(),
  priorAuthNumber: z.string().optional(),
  
  // Billing
  billingType: z.enum(['private_pay', 'insurance', 'sliding_scale']).optional(),
  sessionCost: z.number().positive().nullable().optional(),
  noShowFee: z.number().positive().nullable().optional(),
  copayAmount: z.number().positive().nullable().optional(),
  deductibleAmount: z.number().positive().nullable().optional(),
  defaultCptCode: z.string().nullable().optional(),
  placeOfService: z.string().nullable().optional(),
  authorizationRequired: z.boolean().nullable().optional(),
  
  // Files
  photoFilename: z.string().optional(),
  photoOriginalName: z.string().optional(),
  photoMimeType: z.string().optional(),
  
  // Stripe
  stripeCustomerId: z.string().optional(),
});

const updatePatientSchema = createPatientSchema.partial().omit({ organizationId: true });

const searchPatientSchema = z.object({
  searchTerm: z.string().min(1),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /patients
 * Get all patients for the authenticated user (with access control)
 * Supports pagination via query params: ?page=1&limit=50&sortBy=name&sortOrder=asc
 */
router.get('/', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse pagination parameters
    const { page, limit, offset, sortBy, sortOrder } = parsePagination(req);

    // Get therapist ID from query params (optional)
    const therapistId = req.query.therapistId ? parseInt(req.query.therapistId as string) : userId;

    // For now, use existing service (which doesn't support pagination yet)
    // TODO: Update service layer to support pagination for better performance
    const allPatients = await PatientService.getPatientsForTherapist(therapistId, userId);
    
    // Apply pagination in-memory (temporary solution)
    const total = allPatients.length;
    const paginatedPatients = allPatients.slice(offset, offset + limit);
    
    // Return paginated response
    res.json({
      success: true,
      data: paginatedPatients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch patients',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /patients/:id
 * Get specific patient by ID (with access control)
 */
router.get('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canAccessPatient,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const patientId = parseInt(req.params.id);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    const patient = await PatientService.getPatient(patientId, userId);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch patient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /patients
 * Create new patient
 */
router.post('/', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canCreatePatients,
  auditMiddleware.auditPHIAccess('CREATE', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('Patient creation - req.user:', req.user);
    console.log('Patient creation - userId:', userId);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // If no organizationId provided, try to get user's organization
    let organizationId = req.body.organizationId;
    
    if (!organizationId) {
      console.log('No organizationId provided, checking user organizations...');
      
      // Get user's organizations
      const userOrganizations = await OrganizationService.getUserOrganizations(userId);
      
      if (userOrganizations.length > 0) {
        // Use the first organization
        organizationId = userOrganizations[0].organizationId;
        console.log('Using existing organization:', organizationId);
      } else {
        // User should have an organization from registration - this is an error state
        console.error('No organizations found for user:', userId);
        return res.status(400).json({ 
          error: 'No organization found. Please contact support to set up your practice.' 
        });
      }
    }

    // Update the request body with the organizationId
    req.body.organizationId = organizationId;
    
    // Set the primaryTherapistId to the current user
    req.body.primaryTherapistId = userId;
    

    // Check if user can create patients in this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to create patient in this organization' });
    }

    console.log('Creating patient, userId:', userId);
    const patient = await PatientService.createPatient(req.body, userId);
    console.log('Patient created, ID:', patient?.id);
    
    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient created successfully'
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ 
      error: 'Failed to create patient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /patients/:id
 * Update patient
 */
router.put('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canAccessPatient,
  auditMiddleware.auditPHIAccess('UPDATE', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  validateRequest(updatePatientSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const patientId = parseInt(req.params.id);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    const patient = await PatientService.updatePatient(patientId, req.body, userId);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      success: true,
      data: patient,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to update patient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /patients/:id
 * Soft delete patient (HIPAA 7-year retention)
 */
router.delete('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canAccessPatient,
  auditMiddleware.auditPHIAccess('DELETE', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const patientId = parseInt(req.params.id);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    const patient = await PatientService.deletePatient(patientId, userId);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      success: true,
      message: 'Patient deleted successfully (soft delete for HIPAA compliance)'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete patient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /patients/search
 * Search patients by email or phone
 */
router.post('/search', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  validateRequest(searchPatientSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { searchTerm } = req.body;
    const patients = await PatientService.searchPatients(searchTerm, userId);
    
    res.json({
      success: true,
      data: patients,
      count: patients.length
    });
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ 
      error: 'Failed to search patients',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /patients/:id/transfer
 * Transfer patient to different therapist
 */
router.post('/:id/transfer', 
  rateLimits.admin,
  authenticateToken,
  rbac.canManageStaff,
  auditMiddleware.auditPHIAccess('UPDATE', 'PATIENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const patientId = parseInt(req.params.id);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    const { newTherapistId } = req.body;
    if (!newTherapistId || isNaN(parseInt(newTherapistId))) {
      return res.status(400).json({ error: 'Invalid new therapist ID' });
    }

    const patient = await OrganizationService.transferPatient(patientId, parseInt(newTherapistId), userId);
    
    res.json({
      success: true,
      data: patient,
      message: 'Patient transferred successfully'
    });
  } catch (error) {
    console.error('Error transferring patient:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to transfer patient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
