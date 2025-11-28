import { db, getActiveSchema } from "db";
import { sql, eq } from "drizzle-orm";

/**
 * Get notification settings for a user
 */
export const getNotificationSettings = async (userId: number) => {
  try {
    const schema = getActiveSchema();
    
    // Check if notification settings table exists
    if (!schema.notificationSettings) {
      console.warn('Notification settings table not available in current schema');
      return { success: false, error: 'Notification settings not available', settings: null };
    }

    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.userId, userId),
    });

    // If no settings exist, create default settings
    if (!settings) {
      return createDefaultNotificationSettings(userId);
    }

    return { success: true, settings };
  } catch (error) {
    console.error("Error getting notification settings:", error);
    return { success: false, error, settings: null };
  }
};

/**
 * Create default notification settings for a user
 */
export const createDefaultNotificationSettings = async (userId: number) => {
  try {
    const schema = getActiveSchema();
    
    if (!schema.notificationSettings) {
      console.warn('Notification settings table not available in current schema');
      return { success: false, error: 'Notification settings not available', settings: null };
    }

    const [settings] = await db
      .insert(schema.notificationSettings)
      .values({
        userId,
        sessionReminder: true,
        taskAutomation: true,
        taskCompleted: true,
        documentUploaded: true,
        invoiceGenerated: true,
      })
      .returning();

    return { success: true, settings };
  } catch (error) {
    console.error("Error creating default notification settings:", error);
    return { success: false, error, settings: null };
  }
};

/**
 * Update notification settings for a user
 */
export const updateNotificationSettings = async (
  userId: number,
  updatedSettings: any
) => {
  try {
    const schema = getActiveSchema();
    
    if (!schema.notificationSettings) {
      console.warn('Notification settings table not available in current schema');
      return { success: false, error: 'Notification settings not available' };
    }

    // Remove id and userId from the update payload
    const { id, userId: _, createdAt, updatedAt, ...settingsToUpdate } = updatedSettings as any;

    // Update with current timestamp
    const [settings] = await db
      .update(schema.notificationSettings)
      .set({
        ...settingsToUpdate,
        updatedAt: new Date(),
      })
      .where(eq(schema.notificationSettings.userId, userId))
      .returning();

    return { success: true, settings };
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return { success: false, error };
  }
};