import { Router } from 'express';
import { WorkScheduleService } from '../services/WorkScheduleService';
import { authenticateToken } from '../auth-simple';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const workScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0=Sunday, 6=Saturday
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  isActive: z.boolean().optional().default(true)
}).refine(
  (data) => {
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return endMinutes > startMinutes;
  },
  {
    message: "End time must be after start time",
    path: ["endTime"]
  }
);

const updateWorkSchedulesSchema = z.object({
  schedules: z.array(workScheduleSchema).min(1, 'At least one schedule is required')
});

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
});

// ============================================================================
// WORK SCHEDULE ROUTES
// ============================================================================

/**
 * GET /api/work-schedules
 * Get work schedules for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const schedules = await WorkScheduleService.getSchedulesForUser(userId, userId);
    
    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error) {
    console.error('Error fetching work schedules:', error);
    res.status(500).json({
      error: 'WORK_SCHEDULES_FETCH_FAILED',
      message: 'Failed to fetch work schedules'
    });
  }
});

/**
 * GET /api/work-schedules/availability
 * Get available time slots for a specific date
 */
router.get('/availability', authenticateToken, validateRequest(availabilityQuerySchema, 'query'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { date } = req.query;
    const targetDate = new Date(date as string);
    
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const slots = await WorkScheduleService.getAvailableSlots(userId, targetDate);
    
    res.json({
      success: true,
      data: slots,
      count: slots.length
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      error: 'AVAILABILITY_FETCH_FAILED',
      message: 'Failed to fetch availability'
    });
  }
});

/**
 * POST /api/work-schedules
 * Create or update work schedules for the authenticated user
 */
router.post('/', authenticateToken, validateRequest(updateWorkSchedulesSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { schedules } = req.body;
    
    const result = await WorkScheduleService.updateSchedules(userId, schedules, userId);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'WORK_SCHEDULES_UPDATE_FAILED',
        message: 'Failed to update work schedules',
        details: result.errors
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Work schedules updated successfully'
    });
  } catch (error) {
    console.error('Error updating work schedules:', error);
    res.status(500).json({
      error: 'WORK_SCHEDULES_UPDATE_FAILED',
      message: 'Failed to update work schedules'
    });
  }
});

/**
 * DELETE /api/work-schedules/:id
 * Delete a specific work schedule
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const scheduleId = parseInt(req.params.id);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const result = await WorkScheduleService.deleteSchedule(scheduleId, userId);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'WORK_SCHEDULE_DELETE_FAILED',
        message: result.error || 'Failed to delete work schedule'
      });
    }

    res.json({
      success: true,
      message: 'Work schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting work schedule:', error);
    res.status(500).json({
      error: 'WORK_SCHEDULE_DELETE_FAILED',
      message: 'Failed to delete work schedule'
    });
  }
});

export default router;
