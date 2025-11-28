import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { parsePagination } from '../middleware/core-security';
import { db, getActiveSchema } from '../../db';
import { notificationSettings } from '../../db/schema-hipaa-refactored';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

/**
 * Notifications API Routes
 * 
 * Provides notification management functionality
 */

// GET /api/notifications - Get all notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const schema = getActiveSchema();
    
    // Parse pagination parameters
    const { page, limit, offset } = parsePagination(req);
    
    // Check if notifications table exists in current schema
    try {
      if (schema.notifications && db.query.notifications) {
        // Get total count
        const [{ count: total }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, userId));
        
        // Get paginated notifications
        const notifications = await db
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, userId))
          .orderBy(desc(schema.notifications.createdAt))
          .limit(limit)
          .offset(offset);
        
        res.json({
          data: notifications,
          pagination: {
            page,
            limit,
            total: Number(total),
            totalPages: Math.ceil(Number(total) / limit),
            hasMore: offset + limit < Number(total)
          }
        });
      } else {
        // Return empty array if notifications table doesn't exist
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array on error to prevent crashes
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
});

// POST /api/notifications - Create new notification
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { title, message, type = 'info', organizationId } = req.body;
    const schema = getActiveSchema();
    
    if (!schema.notifications) {
      return res.status(400).json({ 
        error: 'NOTIFICATIONS_NOT_AVAILABLE',
        message: 'Notifications feature not available'
      });
    }
    
    if (!title || !message) {
      return res.status(400).json({ 
        error: 'MISSING_FIELDS',
        message: 'Title and message are required'
      });
    }
    
    const [newNotification] = await db.insert(schema.notifications).values({
      organizationId: organizationId || 1, // Default to organization 1 for now
      userId,
      title,
      message,
      type,
      isRead: false
    }).returning();
    
    res.status(201).json(newNotification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PUT /api/notifications/:id - Mark notification as read
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);
    const schema = getActiveSchema();
    
    if (!schema.notifications) {
      return res.status(400).json({ 
        error: 'NOTIFICATIONS_NOT_AVAILABLE',
        message: 'Notifications feature not available'
      });
    }
    
    const [updatedNotification] = await db.update(schema.notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      ))
      .returning();
    
    if (!updatedNotification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);
    const schema = getActiveSchema();
    
    if (!schema.notifications) {
      return res.status(400).json({ 
        error: 'NOTIFICATIONS_NOT_AVAILABLE',
        message: 'Notifications feature not available'
      });
    }
    
    const deletedNotification = await db.delete(schema.notifications)
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      ))
      .returning();
    
    if (!deletedNotification.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * Notification Settings Routes
 * Mounted at /notification-settings for direct access
 */

// Handler for getting notification settings
const getNotificationSettings = async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    
    // Try to get existing settings
    let [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);
    
    // If no settings exist, create default settings
    if (!settings) {
      [settings] = await db
        .insert(notificationSettings)
        .values({
          userId,
          sessionReminder: true,
          taskAutomation: true,
          taskCompleted: false,
          documentUploaded: true,
          invoiceGenerated: true,
        })
        .returning();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
};

// Handler for updating notification settings
const updateNotificationSettings = async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const {
      sessionReminder,
      taskAutomation,
      taskCompleted,
      documentUploaded,
      invoiceGenerated,
    } = req.body;
    
    // First check if settings exist
    const [existingSettings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);
    
    let updatedSettings;
    
    if (existingSettings) {
      // Update existing settings
      [updatedSettings] = await db
        .update(notificationSettings)
        .set({
          sessionReminder,
          taskAutomation,
          taskCompleted,
          documentUploaded,
          invoiceGenerated,
          updatedAt: new Date(),
        })
        .where(eq(notificationSettings.userId, userId))
        .returning();
    } else {
      // Create new settings if they don't exist
      [updatedSettings] = await db
        .insert(notificationSettings)
        .values({
          userId,
          sessionReminder,
          taskAutomation,
          taskCompleted,
          documentUploaded,
          invoiceGenerated,
        })
        .returning();
    }
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
};

// Register settings routes under /settings path
router.get('/settings', authenticateToken, getNotificationSettings);
router.put('/settings', authenticateToken, updateNotificationSettings);

// Create a separate router for direct /api/notification-settings access
export const notificationSettingsRouter = Router();
notificationSettingsRouter.get('/', authenticateToken, getNotificationSettings);
notificationSettingsRouter.put('/', authenticateToken, updateNotificationSettings);

export default router;
