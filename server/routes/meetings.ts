import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { db, getActiveSchema } from '../../db';
import { eq, and, desc } from 'drizzle-orm';
import { meetings, meetingTypes, organizationMemberships } from '@db/schema';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createMeetingSchema = z.object({
  typeId: z.number().int().positive(),
  title: z.string().min(1),
  date: z.string().datetime(),
  duration: z.number().int().min(15).max(480).default(60),
  notes: z.string().optional(),
});

const createMeetingTypeSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
});

const updateMeetingSchema = createMeetingSchema.partial();

// ============================================================================
// MEETING ROUTES
// ============================================================================

/**
 * GET /api/meetings
 * Get all meetings for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization
    const [orgMembership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);

    const organizationId = orgMembership?.organizationId;

    // Fetch meetings for this user/organization
    const userMeetings = await db
      .select()
      .from(meetings)
      .where(
        organizationId
          ? eq(meetings.organizationId, organizationId)
          : eq(meetings.userId, userId)
      )
      .orderBy(desc(meetings.date));

    res.json(userMeetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({
      error: 'MEETINGS_FETCH_FAILED',
      message: 'Failed to fetch meetings'
    });
  }
});

/**
 * POST /api/meetings
 * Create a new meeting
 */
router.post('/', authenticateToken, validateRequest(createMeetingSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization
    const [orgMembership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);

    const organizationId = orgMembership?.organizationId;

    // Create the meeting
    const [newMeeting] = await db
      .insert(meetings)
      .values({
        userId,
        organizationId,
        typeId: req.body.typeId,
        title: req.body.title,
        date: new Date(req.body.date),
        duration: req.body.duration,
        notes: req.body.notes,
      })
      .returning();

    res.json(newMeeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      error: 'MEETING_CREATE_FAILED',
      message: 'Failed to create meeting'
    });
  }
});

/**
 * PUT /api/meetings/:id
 * Update a meeting
 */
router.put('/:id', authenticateToken, validateRequest(updateMeetingSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // For now, return success but don't actually update since meetings table doesn't exist
    res.json({
      success: true,
      message: 'Meeting functionality temporarily disabled during HIPAA migration'
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({
      error: 'MEETING_UPDATE_FAILED',
      message: 'Failed to update meeting'
    });
  }
});

/**
 * DELETE /api/meetings/:id
 * Delete a meeting
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // For now, return success but don't actually delete since meetings table doesn't exist
    res.json({
      success: true,
      message: 'Meeting functionality temporarily disabled during HIPAA migration'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      error: 'MEETING_DELETE_FAILED',
      message: 'Failed to delete meeting'
    });
  }
});

// ============================================================================
// MEETING TYPE ROUTES
// ============================================================================

/**
 * GET /api/meeting-types
 * Get all meeting types for the authenticated user
 */
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization
    const [orgMembership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);

    const organizationId = orgMembership?.organizationId;

    // Fetch meeting types for this user/organization
    let userMeetingTypes = await db
      .select()
      .from(meetingTypes)
      .where(
        organizationId
          ? eq(meetingTypes.organizationId, organizationId)
          : eq(meetingTypes.userId, userId)
      );

    // If no types exist, create default ones
    if (userMeetingTypes.length === 0) {
      const defaultTypes = [
        { userId, organizationId, name: 'Team Meeting', color: '#3B82F6', isDefault: true },
        { userId, organizationId, name: 'Client Consultation', color: '#10B981', isDefault: true },
        { userId, organizationId, name: 'Training Session', color: '#F59E0B', isDefault: true },
        { userId, organizationId, name: 'Administrative', color: '#6B7280', isDefault: true },
      ];

      userMeetingTypes = await db
        .insert(meetingTypes)
        .values(defaultTypes)
        .returning();
    }

    res.json(userMeetingTypes);
  } catch (error) {
    console.error('Error fetching meeting types:', error);
    res.status(500).json({
      error: 'MEETING_TYPES_FETCH_FAILED',
      message: 'Failed to fetch meeting types'
    });
  }
});

/**
 * POST /api/meeting-types
 * Create a new meeting type
 */
router.post('/types', authenticateToken, validateRequest(createMeetingTypeSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization
    const [orgMembership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);

    const organizationId = orgMembership?.organizationId;

    // Create the meeting type
    const [newMeetingType] = await db
      .insert(meetingTypes)
      .values({
        userId,
        organizationId,
        name: req.body.name,
        color: req.body.color,
        isDefault: false,
      })
      .returning();

    res.json(newMeetingType);
  } catch (error) {
    console.error('Error creating meeting type:', error);
    res.status(500).json({
      error: 'MEETING_TYPE_CREATE_FAILED',
      message: 'Failed to create meeting type'
    });
  }
});

export default router;
