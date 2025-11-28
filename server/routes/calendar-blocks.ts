import { Router } from 'express';
import { CalendarBlockService } from '../services/CalendarBlockService';
import { authenticateToken } from '../auth-simple';
import { validateRequest } from '../middleware/validation';
import { parsePagination } from '../middleware/core-security';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const calendarBlockSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
      blockType: z.enum(['intake', 'lunch', 'recurring', 'blocked', 'meeting', 'notes', 'vacation', 'sick', 'admin', 'personal', 'other']),
  reason: z.string().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.string().datetime().optional()
  }).optional()
}).refine(
  (data) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate > startDate;
  },
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
);

const updateCalendarBlockSchema = z.object({
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  blockType: z.enum(['intake', 'lunch', 'recurring', 'blocked', 'meeting', 'notes', 'vacation', 'sick', 'admin', 'personal', 'other']).optional(),
  reason: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().positive(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.string().datetime().optional()
  }).optional()
});

const dateRangeQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)').optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)').optional()
});

// ============================================================================
// CALENDAR BLOCK ROUTES
// ============================================================================

/**
 * GET /api/calendar/blocks
 * Get calendar blocks for the authenticated user
 */
router.get('/', authenticateToken, validateRequest(dateRangeQuerySchema, 'query'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : undefined;
    const endDate = end ? new Date(end as string) : undefined;

    // Parse pagination parameters
    const { page, limit, offset } = parsePagination(req);

    // Get all blocks (TODO: optimize with database-level pagination)
    const allBlocks = await CalendarBlockService.getBlocksForUser(userId, userId, startDate, endDate);
    
    // Apply pagination in-memory
    const total = allBlocks.length;
    const paginatedBlocks = allBlocks.slice(offset, offset + limit);
    
    res.json({
      success: true,
      data: paginatedBlocks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching calendar blocks:', error);
    res.status(500).json({
      error: 'CALENDAR_BLOCKS_FETCH_FAILED',
      message: 'Failed to fetch calendar blocks'
    });
  }
});

/**
 * POST /api/calendar/blocks
 * Create a new calendar block
 */
router.post('/', authenticateToken, validateRequest(calendarBlockSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const blockData = {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate)
    };
    
    const result = await CalendarBlockService.createBlock(userId, blockData, userId);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'CALENDAR_BLOCK_CREATE_FAILED',
        message: 'Failed to create calendar block',
        details: result.errors
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Calendar block created successfully'
    });
  } catch (error) {
    console.error('Error creating calendar block:', error);
    res.status(500).json({
      error: 'CALENDAR_BLOCK_CREATE_FAILED',
      message: 'Failed to create calendar block'
    });
  }
});

/**
 * PUT /api/calendar/blocks/:id
 * Update a calendar block
 */
router.put('/:id', authenticateToken, validateRequest(updateCalendarBlockSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const blockId = parseInt(req.params.id);
    if (isNaN(blockId)) {
      return res.status(400).json({ error: 'Invalid block ID' });
    }

    const updateData = { ...req.body };
    
    // Convert date strings to Date objects if present
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }
    
    const result = await CalendarBlockService.updateBlock(blockId, updateData, userId);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'CALENDAR_BLOCK_UPDATE_FAILED',
        message: result.errors?.[0]?.message || 'Failed to update calendar block',
        details: result.errors
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Calendar block updated successfully'
    });
  } catch (error) {
    console.error('Error updating calendar block:', error);
    res.status(500).json({
      error: 'CALENDAR_BLOCK_UPDATE_FAILED',
      message: 'Failed to update calendar block'
    });
  }
});

/**
 * DELETE /api/calendar/blocks/:id
 * Delete a calendar block
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const blockId = parseInt(req.params.id);
    if (isNaN(blockId)) {
      return res.status(400).json({ error: 'Invalid block ID' });
    }

    const result = await CalendarBlockService.deleteBlock(blockId, userId);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'CALENDAR_BLOCK_DELETE_FAILED',
        message: result.error || 'Failed to delete calendar block'
      });
    }

    res.json({
      success: true,
      message: 'Calendar block deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar block:', error);
    res.status(500).json({
      error: 'CALENDAR_BLOCK_DELETE_FAILED',
      message: 'Failed to delete calendar block'
    });
  }
});

/**
 * GET /api/calendar/blocks/conflicts
 * Check for conflicts in a date range
 */
router.get('/conflicts', authenticateToken, validateRequest(dateRangeQuerySchema, 'query'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    const conflicts = await CalendarBlockService.checkSessionConflicts(userId, startDate, endDate);
    
    res.json({
      success: true,
      data: conflicts,
      count: conflicts.length
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({
      error: 'CONFLICTS_CHECK_FAILED',
      message: 'Failed to check for conflicts'
    });
  }
});

export default router;
