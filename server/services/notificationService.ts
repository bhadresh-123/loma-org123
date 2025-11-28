import { db, getActiveSchema } from "@db";
import { sql, eq, desc, and } from "drizzle-orm";

/**
 * Creates a new notification for a user
 */
export const createNotification = async ({
  userId,
  title,
  message,
  type,
  entityId,
  entityType,
}: {
  userId: number;
  title: string;
  message: string;
  type: string;
  entityId?: number;
  entityType?: string;
}) => {
  try {
    const schema = getActiveSchema();
    
    // Check if notifications table exists in current schema
    if (!schema.notifications) {
      console.warn('Notifications table not available in current schema');
      return { success: false, error: 'Notifications not available' };
    }

    const [notification] = await db
      .insert(schema.notifications)
      .values({
        userId,
        title,
        message,
        type,
        entityId,
        entityType,
        isRead: false,
        isAutomated: true,
        createdAt: new Date(),
      })
      .returning();

    return { success: true, notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
};

/**
 * Marks a notification as read
 */
export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const schema = getActiveSchema();
    
    if (!schema.notifications) {
      console.warn('Notifications table not available in current schema');
      return { success: false, error: 'Notifications not available' };
    }

    await db
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(schema.notifications.id, notificationId));

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error };
  }
};

/**
 * Marks all notifications for a user as read
 */
export const markAllNotificationsAsRead = async (userId: number) => {
  try {
    const schema = getActiveSchema();
    
    if (!schema.notifications) {
      console.warn('Notifications table not available in current schema');
      return { success: false, error: 'Notifications not available' };
    }

    await db
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)));

    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false, error };
  }
};

/**
 * Gets all notifications for a user
 */
export const getUserNotifications = async (userId: number, limit: number = 50) => {
  try {
    const schema = getActiveSchema();
    
    // Check if notifications table exists, if not return empty array
    if (!schema.notifications) {
      console.warn('Notifications table not available in current schema');
      return {
        success: true,
        notifications: [],
        count: 0
      };
    }

    const userNotifications = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit);
    
    return {
      success: true,
      notifications: userNotifications,
      count: userNotifications.length
    };
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return { success: false, error, notifications: [] };
  }
};

/**
 * Gets unread notifications count for a user
 */
export const getUnreadNotificationsCount = async (userId: number) => {
  try {
    const schema = getActiveSchema();
    
    if (!schema.notifications) {
      console.warn('Notifications table not available in current schema');
      return { success: false, error: 'Notifications not available', count: 0 };
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)));

    return { success: true, count: result[0]?.count || 0 };
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    return { success: false, error, count: 0 };
  }
};