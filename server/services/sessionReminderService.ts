import { db, getActiveSchema } from '@db';
import dayjs from 'dayjs';
import { sql, eq } from 'drizzle-orm';
import { createNotification } from './notificationService';

/**
 * Creates session reminder notifications for upcoming schema.sessions
 * Notifications are sent 15 minutes before the session starts
 */
export const createSessionReminderNotifications = async () => {
  try {
    console.log('Checking for upcoming sessions that need reminders...');
    const schema = getActiveSchema();
    
    // Check if required tables exist in current schema
    if (!schema.clinicalSessions || !schema.users || !schema.patients || !schema.notifications) {
      console.log('Required tables not available in HIPAA schema - skipping session reminder notifications');
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const now = new Date();
    
    // Find sessions that are starting in the next 15 minutes
    // and haven't had a notification sent yet
    // We'll use a 5-minute window to ensure we don't miss any sessions
    // (e.g., if the scheduled task runs every 5 minutes)
    const reminderWindowStart = now;
    const reminderWindowEnd = dayjs(now).add(20, 'minute').toDate();
    
    const upcomingSessions = await db.execute(
      sql`SELECT s.*, u.id as user_id, c.id as patient_id, c.name as client_name
          FROM ${schema.clinicalSessions} s
          JOIN ${schema.users} u ON s.therapist_id = u.id
          JOIN ${schema.patients} c ON s.patient_id = c.id
          WHERE s.date > ${reminderWindowStart}
          AND s.date < ${reminderWindowEnd}
          AND s.status = 'scheduled'
          AND NOT EXISTS (
            SELECT 1 FROM ${schema.notifications} n
            WHERE n.entity_id = s.id
            AND n.entity_type = 'session'
            AND n.type = 'session_reminder'
            AND n.created_at > ${dayjs(now).subtract(30, 'minute').toDate()}
          )`
    );
    
    const sessionsToRemind = upcomingSessions.rows;
    console.log(`Found ${sessionsToRemind.length} upcoming sessions that need reminders`);
    
    // Group sessions by userId to check notification settings
    const sessionsByUserId = sessionsToRemind.reduce((acc, session) => {
      const userId = String(session.user_id);
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(session);
      return acc;
    }, {} as Record<string, any[]>);
    
    let remindersSent = 0;
    
    // Process sessions by user
    for (const userId in sessionsByUserId) {
      // Check if user has session reminders enabled
      const userSettings = await db.query.notificationSettings.findFirst({
        where: eq(notificationSettings.userId, parseInt(userId))
      });
      
      // Skip if the user has disabled session reminders
      if (!userSettings || !userSettings.sessionReminder) {
        console.log(`Skipping session reminders for user ${userId} (reminders disabled)`);
        continue;
      }
      
      // Send reminders for each session
      for (const session of sessionsByUserId[userId]) {
        const sessionDate = new Date(session.date);
        
        // Only send reminders for sessions starting in the next 15 minutes
        const fifteenMinutesFromNow = dayjs(now).add(15, 'minute').toDate();
        const fiveMinutesFromNow = dayjs(now).add(5, 'minute').toDate();
        
        if (sessionDate >= fiveMinutesFromNow && sessionDate <= fifteenMinutesFromNow) {
          // Format time for the notification
          const formattedTime = sessionDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          // Format date for the notification
          const formattedDate = sessionDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          
          // Create the notification
          await createNotification({
            userId: parseInt(userId),
            title: "Upcoming Session Reminder",
            message: `You have a session with ${session.client_name} at ${formattedTime} on ${formattedDate} (in 15 minutes).`,
            type: "session_reminder",
            entityId: session.id,
            entityType: "session"
          });
          
          remindersSent++;
          console.log(`Created session reminder for user ${userId}, session ${session.id} with ${session.client_name}`);
        }
      }
    }
    
    console.log(`Session reminder notifications sent: ${remindersSent}`);
    return { success: true, remindersSent };
  } catch (error) {
    console.error('Error creating session reminder notifications:', error);
    return { success: false, error };
  }
};