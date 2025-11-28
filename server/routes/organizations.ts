import { Router } from 'express';
import { OrganizationService } from '../services/OrganizationService';
import { TherapistService } from '../services/TherapistService';
import { InviteService } from '../services/InviteService';
import { authenticateToken } from '../auth-simple';
import { auditMiddleware } from '../middleware/audit-logging';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['solo', 'partnership', 'group_practice']),
  businessEin: z.string().optional(),
  businessAddress: z.string().optional(),
  businessCity: z.string().optional(),
  businessState: z.string().optional(),
  businessZip: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  defaultSessionDuration: z.number().int().positive().optional(),
  timezone: z.string().optional(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

const addTherapistSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['business_owner', 'admin', 'therapist', 'contractor_1099']),
  canViewAllPatients: z.boolean().optional(),
  canViewSelectedPatients: z.array(z.number().int().positive()).optional(),
  canViewAllCalendars: z.boolean().optional(),
  canViewSelectedCalendars: z.array(z.number().int().positive()).optional(),
  canManageBilling: z.boolean().optional(),
  canManageStaff: z.boolean().optional(),
  canManageSettings: z.boolean().optional(),
  employmentStartDate: z.string().optional(),
  isPrimaryOwner: z.boolean().optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(['business_owner', 'admin', 'therapist', 'contractor_1099']).optional(),
  canViewAllPatients: z.boolean().optional(),
  canViewSelectedPatients: z.array(z.number().int().positive()).optional(),
  canViewAllCalendars: z.boolean().optional(),
  canViewSelectedCalendars: z.array(z.number().int().positive()).optional(),
  canManageBilling: z.boolean().optional(),
  canManageStaff: z.boolean().optional(),
  canManageSettings: z.boolean().optional(),
  canCreatePatients: z.boolean().optional(),
  isActive: z.boolean().optional(),
  employmentEndDate: z.string().optional(),
});

const transferPatientSchema = z.object({
  newTherapistId: z.number().int().positive(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /organizations
 * Get all organizations the user belongs to
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizations = await OrganizationService.getUserOrganizations(userId);
    
    res.json({
      success: true,
      data: organizations,
      count: organizations.length
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organizations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /organizations/:id
 * Get specific organization by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user can access this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to access organization' });
    }

    const organization = await OrganizationService.getOrganization(organizationId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      data: organization
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /organizations
 * Create new organization
 */
router.post('/', authenticateToken, validateRequest(createOrganizationSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organization = await OrganizationService.createOrganization(req.body);
    
    res.status(201).json({
      success: true,
      data: organization,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ 
      error: 'Failed to create organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /organizations/:id
 * Update organization
 */
router.put('/:id', authenticateToken, validateRequest(updateOrganizationSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user can manage this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to update organization' });
    }

    const organization = await OrganizationService.updateOrganization(organizationId, req.body);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      data: organization,
      message: 'Organization updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ 
      error: 'Failed to update organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /organizations/:id/members
 * Get organization members
 */
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user can access this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to view organization members' });
    }

    const members = await OrganizationService.getOrganizationMembers(organizationId);
    
    res.json({
      success: true,
      data: members,
      count: members.length
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organization members',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /organizations/:id/therapists
 * Get therapists in organization
 */
router.get('/:id/therapists', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    const therapists = await TherapistService.getTherapistsInOrganization(organizationId, userId);
    
    res.json({
      success: true,
      data: therapists,
      count: therapists.length
    });
  } catch (error) {
    console.error('Error fetching organization therapists:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch organization therapists',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /organizations/:id/patients
 * Get patients in organization
 */
router.get('/:id/patients', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user can access this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to view organization patients' });
    }

    const patients = await OrganizationService.getOrganizationPatients(organizationId);
    
    res.json({
      success: true,
      data: patients,
      count: patients.length
    });
  } catch (error) {
    console.error('Error fetching organization patients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organization patients',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /organizations/:id/members
 * Add therapist to organization
 */
router.post('/:id/members', authenticateToken, validateRequest(addTherapistSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user can manage this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to add members to organization' });
    }

    const membership = await OrganizationService.addTherapistToOrganization({
      organizationId,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      data: membership,
      message: 'Therapist added to organization successfully'
    });
  } catch (error) {
    console.error('Error adding therapist to organization:', error);
    res.status(500).json({ 
      error: 'Failed to add therapist to organization',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /organizations/:id/members/:memberId
 * Update organization member
 */
router.put('/:id/members/:memberId', authenticateToken, validateRequest(updateMemberSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    
    if (isNaN(organizationId) || isNaN(memberId)) {
      return res.status(400).json({ error: 'Invalid organization ID or member ID' });
    }

    // Check if user can manage this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to update organization members' });
    }

    const updatedMember = await OrganizationService.updateOrganizationMember(memberId, req.body, userId);
    
    if (!updatedMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({
      success: true,
      data: updatedMember,
      message: 'Member updated successfully'
    });
  } catch (error) {
    console.error('Error updating organization member:', error);
    
    if (error instanceof Error && error.message.includes('Cannot remove last business owner')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message.includes('Cannot modify own permissions')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to update member',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /organizations/:id/members/:memberId
 * Deactivate organization member
 */
router.delete('/:id/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    
    if (isNaN(organizationId) || isNaN(memberId)) {
      return res.status(400).json({ error: 'Invalid organization ID or member ID' });
    }

    // Check if user can manage this organization
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to remove organization members' });
    }

    const result = await OrganizationService.deactivateMember(memberId, userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({
      success: true,
      message: 'Member deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating organization member:', error);
    
    if (error instanceof Error && error.message.includes('Cannot remove last business owner')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error && error.message.includes('Cannot remove self')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to deactivate member',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /organizations/:id/available-therapists
 * Get available therapists for adding to organization
 */
router.get('/:id/available-therapists', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    const therapists = await OrganizationService.getAvailableTherapists(organizationId, userId);
    
    res.json({
      success: true,
      data: therapists,
      count: therapists.length
    });
  } catch (error) {
    console.error('Error fetching available therapists:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch available therapists',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /organizations/:id/invites
 * Send invite to therapist by email
 */
const sendInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['business_owner', 'admin', 'therapist', 'contractor_1099']),
  permissions: z.object({
    canViewAllPatients: z.boolean().optional(),
    canViewSelectedPatients: z.array(z.number()).optional(),
    canViewAllCalendars: z.boolean().optional(),
    canViewSelectedCalendars: z.array(z.number()).optional(),
    canManageBilling: z.boolean().optional(),
    canManageStaff: z.boolean().optional(),
    canManageSettings: z.boolean().optional(),
    canCreatePatients: z.boolean().optional(),
  }).optional(),
});

router.post('/:id/invites', authenticateToken, validateRequest(sendInviteSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    const result = await InviteService.sendInvite({
      organizationId,
      invitedBy: userId,
      email: req.body.email,
      role: req.body.role,
      permissions: req.body.permissions || {},
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send invite' });
    }

    res.json({
      success: true,
      message: 'Invite sent successfully',
      inviteId: result.inviteId,
    });
  } catch (error) {
    console.error('Error sending invite:', error);
    res.status(500).json({
      error: 'Failed to send invite',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /invites/:token
 * Get invite details by token (public endpoint for viewing invite)
 * NOTE: Must be before /:id/invites to avoid route conflicts
 */
router.get('/invites/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await InviteService.getInviteByToken(token);

    if (!result.success) {
      return res.status(404).json({ error: result.error || 'Invite not found' });
    }

    res.json({
      success: true,
      data: {
        organizationName: result.invite?.organization?.name,
        role: result.invite?.role,
        email: result.invite?.email,
        expiresAt: result.invite?.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    res.status(500).json({ error: 'Failed to fetch invite' });
  }
});

/**
 * POST /invites/:token/accept
 * Accept an invite (requires authentication)
 * NOTE: Must be before /:id/invites to avoid route conflicts
 */
router.post('/invites/:token/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { token } = req.params;
    const result = await InviteService.acceptInvite(token, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to accept invite' });
    }

    res.json({
      success: true,
      message: 'Invite accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({
      error: 'Failed to accept invite',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /organizations/:id/invites
 * Get pending invites for organization
 */
router.get('/:id/invites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const organizationId = parseInt(req.params.id);
    if (isNaN(organizationId)) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check permissions
    const canAccess = await OrganizationService.canUserAccessOrganization(userId, organizationId);
    if (!canAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // TODO: Implement getInvites method in InviteService
    res.json({
      success: true,
      data: [],
      message: 'Invites endpoint - to be implemented',
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

/**
 * POST /organizations/solo-practice
 * Create solo practice for therapist
 */
router.post('/solo-practice', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { therapistName } = req.body;
    if (!therapistName) {
      return res.status(400).json({ error: 'Therapist name is required' });
    }

    const organization = await OrganizationService.createSoloPractice(userId, therapistName);
    
    res.status(201).json({
      success: true,
      data: organization,
      message: 'Solo practice created successfully'
    });
  } catch (error) {
    console.error('Error creating solo practice:', error);
    res.status(500).json({ 
      error: 'Failed to create solo practice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
