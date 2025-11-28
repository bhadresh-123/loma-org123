import { db, getActiveSchema } from '@db';
import { eq, and, lt, isNull, isNotNull, ne, gt, sql } from 'drizzle-orm';
import dayjs from "dayjs";;
import { createNotification } from './notificationService';
import { createSessionReminderNotifications } from './sessionReminderService';
import { getUserTimezone, formatDateInUserTimezone } from '../utils/timezone-helper';
import { auditRetentionService } from './AuditRetentionService';
import { safeDatabaseOperation, validateRequiredTables, DatabaseError } from '../utils/database-error-handling';
import { userSettings } from '@db/schema-hipaa-refactored';

// Enhanced helper function to check if required tables are available
const checkRequiredTables = (schema: any) => {
  const requiredTables = ['clinicalSessions', 'patients', 'tasks', 'userSettings', 'notifications'];
  return requiredTables.every(table => schema[table] !== null && schema[table] !== undefined);
};

// Enhanced helper function to get table names with validation
const getTableNames = (schema: any) => {
  try {
    validateRequiredTables(schema, ['clinicalSessions', 'patients', 'tasks']);
    return {
      sessions: schema.clinicalSessions,
      clients: schema.patients,
      tasks: schema.tasks
    };
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.error('Schema validation failed:', error.message);
    }
    return null;
  }
};

// Global check for all scheduled task functions
const checkScheduledTasksAvailable = () => {
  const schema = getActiveSchema();
  if (!checkRequiredTables(schema)) {
    console.log('Scheduled tasks not available - required tables not in HIPAA schema');
    return false;
  }
  return true;
};

/**
 * Creates tasks for session session_clinical_notes_encrypted after sessions have ended
 * This function is designed to be run periodically
 */
export const createSessionNoteTasksForCompletedSessions = async () => {
  try {
    console.log('Checking for completed sessions without note tasks...');
    const schema = getActiveSchema();
    
    // Check if required tables exist in current schema
    if (!checkRequiredTables(schema)) {
      console.log('Required tables not available in HIPAA schema - skipping session note task creation');
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const tables = getTableNames(schema);
    if (!tables) {
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const now = new Date();

    // Use raw SQL to avoid the categoryId issue
    let completedSessionsResult;
    try {
      completedSessionsResult = await db.execute(
        sql`SELECT s.*, c.id as patient_id, c.name as client_name
            FROM ${tables.sessions} s
            JOIN ${tables.clients} c ON s.patient_id = c.id
            WHERE s.date < ${now}
            AND s.session_clinical_notes_encrypted IS NULL
            AND s.status = 'scheduled'
            AND s.therapist_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM ${tables.tasks} t 
              WHERE t.session_id = s.id AND t.type = 'session_note'
            )`
      );
    } catch (dbError: any) {
      // Handle "relation does not exist" error gracefully
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        console.log('Tasks table does not exist yet - skipping session note task creation');
        return { success: true, message: 'Skipped - tasks table not created yet' };
      }
      throw dbError;
    }
    
    const completedSessions = completedSessionsResult.rows;
    console.log(`Found ${completedSessions.length} completed sessions without session_clinical_notes_encrypted`);
    
    // Group sessions by userId to batch process settings
    const sessionsByUserId = completedSessions.reduce((acc, session) => {
      // Using string conversion to ensure safe object property access
      const userId = String(session.therapist_id);
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(session);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Loop through user groups
    let createdTaskCount = 0;
    for (const userId in sessionsByUserId) {
      // Check if user has enabled task automation for session session_clinical_notes_encrypted
      const userSetting = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, parseInt(userId))
      });
      
      if (!userSetting || !userSetting.autoCreateSessionNoteTasks) {
        console.log(`Skipping session note tasks for user ${userId} (automation disabled)`);
        continue;
      }
      
      // Process sessions for this user
      for (const session of sessionsByUserId[userId]) {
        // Calculate the session end time (session start time + duration minutes)
        const sessionEndTime = new Date(session.date);
        const duration = session.duration || 50;
        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + duration);
        
        // Only process sessions that have ended
        if (sessionEndTime > now) {
          continue;
        }

        // Format the session date for display
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        const taskTitle = `Complete session_clinical_notes_encrypted for ${session.client_name}'s session on ${formattedDate}`;
        
        // Set due date to 24 hours after the session end time
        const dueDate = dayjs(sessionEndTime).add(24, 'hour').toDate();

        try {
          // Create the task without categoryId
          await db.execute(
            sql`INSERT INTO ${schema.tasks} 
                (title, description, status, type, patient_id, session_id, assigned_to_user_id, due_date, created_at, is_automated) 
                VALUES 
                (${taskTitle}, 
                 ${`Please complete the session session_clinical_notes_encrypted for ${session.client_name}'s session on ${formattedDate}.`}, 
                 'pending', 
                 'session_note', 
                 ${session.patient_id}, 
                 ${session.id}, 
                 ${session.therapist_id}, 
                 ${dueDate}, 
                 ${new Date()}, 
                 true)`
          );
          
          createdTaskCount++;
          console.log(`Created session_note task for session ${session.id} (client: ${session.client_name})`);
        } catch (error) {
          console.error(`Error creating task for session ${session.id}:`, error);
        }
      }
    }

    console.log(`Session note task creation completed, created ${createdTaskCount} tasks`);
    
    // Create notifications for each user who had tasks created
    if (createdTaskCount > 0) {
      for (const userId in sessionsByUserId) {
        // Count tasks created for this user
        let userTaskCount = 0;
        const now = new Date();
        
        for (const session of sessionsByUserId[userId]) {
          const sessionEnd = new Date(session.date);
          const duration = session.duration || 50;
          sessionEnd.setMinutes(sessionEnd.getMinutes() + duration);
          
          if (sessionEnd <= now) {
            userTaskCount++;
          }
        }
        
        // Create notification if tasks were created for this user
        if (userTaskCount > 0) {
          try {
            await createNotification({
              userId: parseInt(userId),
              title: "Tasks Automatically Created",
              message: `${userTaskCount} session note tasks were automatically created based on your completed sessions.`,
              type: "task_automation",
              entityType: "task"
            });
            console.log(`Created notification for user ${userId} about ${userTaskCount} session note tasks`);
          } catch (notifError) {
            console.error(`Error creating notification for user ${userId}:`, notifError);
          }
        }
      }
    }
    
    return { success: true, createdTasks: createdTaskCount };
  } catch (error) {
    console.error('Error creating session note tasks:', error);
    return { success: false, error };
  }
};

/**
 * Resolves existing session note tasks if the session session_clinical_notes_encrypted are completed
 */
export const resolveCompletedSessionNoteTasks = async () => {
  try {
    console.log('Checking for tasks with completed session session_clinical_notes_encrypted...');

    const schema = getActiveSchema();
    
    // Check if required tables exist in current schema
    if (!checkRequiredTables(schema)) {
      console.log('Required tables not available in HIPAA schema - skipping session note task resolution');
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const tables = getTableNames(schema);
    if (!tables) {
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    // Get all active session_note tasks with sessions that have session_clinical_notes_encrypted, including user info
    let tasksResult;
    try {
      tasksResult = await db.execute(
        sql`SELECT t.id, t.assigned_to_user_id 
            FROM ${tables.tasks} t
            JOIN ${tables.sessions} s ON t.session_id = s.id
            WHERE t.type = 'session_note'
            AND t.status != 'completed'
            AND s.session_clinical_notes_encrypted IS NOT NULL`
      );
    } catch (dbError: any) {
      // Handle "relation does not exist" error gracefully
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        console.log('Tasks table does not exist yet - skipping session note task resolution');
        return { success: true, message: 'Skipped - tasks table not created yet' };
      }
      throw dbError;
    }

    const tasks = tasksResult.rows;
    console.log(`Found ${tasks.length} active session note tasks with completed session_clinical_notes_encrypted`);
    
    // Group tasks by assigned_to_user_id to check settings once per user
    const tasksByUserId = tasks.reduce((acc, task) => {
      const userId = String(task.assigned_to_user_id);
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(task);
      return acc;
    }, {} as Record<string, any[]>);
    
    let completedCount = 0;
    
    // Process tasks by user
    for (const userId in tasksByUserId) {
      // Check if user has auto-resolve enabled
      const userSetting = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, parseInt(userId))
      });
      
      if (!userSetting || !userSetting.autoResolveCompletedTasks) {
        console.log(`Skipping auto-resolve for user ${userId} (auto-resolve disabled)`);
        continue;
      }
      
      // Update each task to completed status
      for (const task of tasksByUserId[userId]) {
          await db.execute(
            sql`UPDATE ${schema.tasks}
                SET status = 'completed', completed_at = ${new Date()}
                WHERE id = ${task.id}`
          );
        completedCount++;
      }
    }

    console.log(`Completed ${completedCount} session note tasks`);
    
    // Create notifications for users who had tasks auto-completed
    if (completedCount > 0) {
      for (const userId in tasksByUserId) {
        // Get count of tasks that were auto-completed for this user
        const userCompletedTasks = tasksByUserId[userId].length;
        
        if (userCompletedTasks > 0) {
          try {
            await createNotification({
              userId: parseInt(userId),
              title: "Tasks Automatically Completed",
              message: `${userCompletedTasks} session note tasks were automatically completed because session_clinical_notes_encrypted were found.`,
              type: "task_automation",
              entityType: "task"
            });
            console.log(`Created notification for user ${userId} about ${userCompletedTasks} auto-completed tasks`);
          } catch (notifError) {
            console.error(`Error creating notification for user ${userId}:`, notifError);
          }
        }
      }
    }
    
    return { success: true, completedTasks: completedCount };
  } catch (error) {
    console.error('Error resolving session note tasks:', error);
    return { success: false, error };
  }
};

/**
 * Creates tasks for intake document preparation when an intake session is scheduled
 * Tasks are created with due dates 2 days before the session
 */
export const createIntakeDocumentTasks = async () => {
  try {
    console.log('Checking for upcoming intake sessions without document tasks...');
    const schema = getActiveSchema();
    
    // Check if required tables exist in current schema
    if (!checkRequiredTables(schema)) {
      console.log('Required tables not available in HIPAA schema - skipping intake document task creation');
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const tables = getTableNames(schema);
    if (!tables) {
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const now = new Date();

    // Use raw SQL to avoid the categoryId issue
    const futureSessionsResult = await db.execute(
      sql`SELECT s.*, c.id as patient_id, c.name as client_name
          FROM ${tables.sessions} s
          JOIN ${tables.clients} c ON s.patient_id = c.id
          WHERE s.date > ${now}
          AND s.type = 'intake'
          AND s.therapist_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM ${tables.tasks} t 
            WHERE t.session_id = s.id AND t.type = 'intake_docs'
          )`
    );
    
    const futureSessions = futureSessionsResult.rows;
    console.log(`Found ${futureSessions.length} upcoming intake sessions`);
    
    // Group sessions by userId to batch process settings
    const sessionsByUserId = futureSessions.reduce((acc, session) => {
      // Using string conversion to ensure safe object property access
      const userId = String(session.therapist_id);
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(session);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Loop through user groups
    let createdTaskCount = 0;
    for (const userId in sessionsByUserId) {
      // Check if user has enabled task automation for intake documents
      const userSetting = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, parseInt(userId))
      });
      
      if (!userSetting || !userSetting.autoCreateIntakeDocumentTasks) {
        console.log(`Skipping intake document tasks for user ${userId} (automation disabled)`);
        continue;
      }
      
      // Process sessions for this user
      for (const session of sessionsByUserId[userId]) {
        // Format the session date for display
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Create task title and description
        const taskTitle = `Send intake documents for ${session.client_name}'s session on ${formattedDate}`;
        const taskDescription = `Please send intake documents for ${session.client_name}'s upcoming intake session on ${formattedDate}.`;
        
        // Set due date to 2 days before the session date
        const dueDate = subDays(sessionDate, 2);

        try {
          // Create the task without categoryId
          await db.execute(
            sql`INSERT INTO ${schema.tasks} 
                (title, description, status, type, patient_id, session_id, assigned_to_user_id, due_date, created_at, is_automated) 
                VALUES 
                (${taskTitle}, 
                 ${taskDescription}, 
                 'pending', 
                 'intake_docs', 
                 ${session.patient_id}, 
                 ${session.id}, 
                 ${session.therapist_id}, 
                 ${dueDate}, 
                 ${new Date()}, 
                 true)`
          );
          
          createdTaskCount++;
          console.log(`Created intake_docs task for session ${session.id} (client: ${session.client_name})`);
        } catch (error) {
          console.error(`Error creating intake document task for session ${session.id}:`, error);
        }
      }
    }

    console.log(`Intake document task creation completed, created ${createdTaskCount} tasks`);
    
    // Create notifications for users who had intake document tasks created
    if (createdTaskCount > 0) {
      for (const userId in sessionsByUserId) {
        // Get count of tasks created for this user
        const userTaskCount = sessionsByUserId[userId].length;
        
        if (userTaskCount > 0) {
          try {
            await createNotification({
              userId: parseInt(userId),
              title: "Intake Document Tasks Created",
              message: `${userTaskCount} intake document tasks were automatically created for upcoming intake sessions.`,
              type: "task_automation",
              entityType: "task"
            });
            console.log(`Created notification for user ${userId} about ${userTaskCount} intake document tasks`);
          } catch (notifError) {
            console.error(`Error creating notification for user ${userId}:`, notifError);
          }
        }
      }
    }
    
    return { success: true, createdTasks: createdTaskCount };
  } catch (error) {
    console.error('Error creating intake document tasks:', error);
    return { success: false, error };
  }
};

/**
 * Creates invoice tasks for completed sessions that haven't been billed yet
 * Tasks are automatically resolved when a payment is recorded for the session
 */
export const createInvoiceTasksForCompletedSessions = async () => {
  try {
    console.log('Checking for completed sessions without invoice tasks...');
    const schema = getActiveSchema();
    
    // Check if required tables exist in current schema
    if (!checkRequiredTables(schema)) {
      console.log('Required tables not available in HIPAA schema - skipping invoice task creation');
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const tables = getTableNames(schema);
    if (!tables) {
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const now = new Date();

    // Use raw SQL to avoid the categoryId issue
    let completedSessionsResult;
    try {
      completedSessionsResult = await db.execute(
        sql`SELECT s.*, c.id as patient_id, c.name as client_name
            FROM ${tables.sessions} s
            JOIN ${tables.clients} c ON s.patient_id = c.id
            WHERE s.date < ${now}
            AND s.is_paid = false
            AND s.status = 'scheduled'
            AND s.therapist_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM ${tables.tasks} t 
              WHERE t.session_id = s.id AND t.type = 'invoice'
            )`
      );
    } catch (dbError: any) {
      // Handle "relation does not exist" error gracefully
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        console.log('Tasks table does not exist yet - skipping invoice task creation');
        return { success: true, message: 'Skipped - tasks table not created yet' };
      }
      throw dbError;
    }
    
    const completedSessions = completedSessionsResult.rows;
    console.log(`Found ${completedSessions.length} completed sessions without invoice tasks`);
    
    // Group sessions by userId to batch process settings
    const sessionsByUserId = completedSessions.reduce((acc, session) => {
      // Using string conversion to ensure safe object property access
      const userId = String(session.therapist_id);
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(session);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Loop through user groups
    let createdTaskCount = 0;
    for (const userId in sessionsByUserId) {
      // Check if user has enabled task automation for invoices
      const userSetting = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, parseInt(userId))
      });
      
      if (!userSetting || !userSetting.autoCreateInvoiceTasks) {
        console.log(`Skipping invoice tasks for user ${userId} (automation disabled)`);
        continue;
      }
      
      // Process sessions for this user
      for (const session of sessionsByUserId[userId]) {
        // Calculate the session end time (session start time + duration minutes)
        const sessionEndTime = new Date(session.date);
        const duration = session.duration || 50;
        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + duration);
        
        // Only process sessions that have ended
        if (sessionEndTime > now) {
          continue;
        }

        // Format the session date for display
        const sessionDate = new Date(session.date);
        const formattedDate = sessionDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        const taskTitle = `Create invoice for ${session.client_name}'s session on ${formattedDate}`;
        
        // Set due date to 2 days after the session end time
        const dueDate = dayjs(sessionEndTime).add(48, 'hour').toDate();

        try {
          // Create the task without categoryId
          await db.execute(
            sql`INSERT INTO ${schema.tasks} 
                (title, description, status, type, patient_id, session_id, assigned_to_user_id, due_date, created_at, is_automated) 
                VALUES 
                (${taskTitle}, 
                 ${`Please create and send an invoice for ${session.client_name}'s session on ${formattedDate}.`}, 
                 'pending', 
                 'invoice', 
                 ${session.patient_id}, 
                 ${session.id}, 
                 ${session.therapist_id}, 
                 ${dueDate}, 
                 ${new Date()}, 
                 true)`
          );
          
          createdTaskCount++;
          console.log(`Created invoice task for session ${session.id} (client: ${session.client_name})`);
        } catch (error) {
          console.error(`Error creating invoice task for session ${session.id}:`, error);
        }
      }
    }

    console.log(`Invoice task creation completed, created ${createdTaskCount} tasks`);
    
    // Create notifications for users who had invoice tasks created
    if (createdTaskCount > 0) {
      for (const userId in sessionsByUserId) {
        // Count tasks created for this user
        let userTaskCount = 0;
        const now = new Date();
        
        for (const session of sessionsByUserId[userId]) {
          const sessionEnd = new Date(session.date);
          const duration = session.duration || 50;
          sessionEnd.setMinutes(sessionEnd.getMinutes() + duration);
          
          if (sessionEnd <= now) {
            userTaskCount++;
          }
        }
        
        if (userTaskCount > 0) {
          try {
            await createNotification({
              userId: parseInt(userId),
              title: "Invoice Tasks Created",
              message: `${userTaskCount} invoice tasks were automatically created for completed sessions.`,
              type: "task_automation",
              entityType: "task"
            });
            console.log(`Created notification for user ${userId} about ${userTaskCount} invoice tasks`);
          } catch (notifError) {
            console.error(`Error creating notification for user ${userId}:`, notifError);
          }
        }
      }
    }
    
    return { success: true, createdTasks: createdTaskCount };
  } catch (error) {
    console.error('Error creating invoice tasks:', error);
    return { success: false, error };
  }
};

/**
 * Resolves existing invoice tasks if the session has been paid
 */
export const resolveCompletedInvoiceTasks = async () => {
  try {
    console.log('Checking for invoice tasks with paid sessions...');
    const schema = getActiveSchema();
    
    // Check if required tables exist in current schema
    if (!checkRequiredTables(schema)) {
      console.log('Required tables not available in HIPAA schema - skipping invoice task resolution');
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    const tables = getTableNames(schema);
    if (!tables) {
      return { success: true, message: 'Skipped - tables not available in HIPAA schema' };
    }

    // Get all active invoice tasks with sessions that are paid, including user info
    let tasksResult;
    try {
      tasksResult = await db.execute(
        sql`SELECT t.id, t.assigned_to_user_id
            FROM ${tables.tasks} t
            JOIN ${tables.sessions} s ON t.session_id = s.id
            WHERE t.type = 'invoice'
            AND t.status != 'completed'
            AND s.is_paid = true`
      );
    } catch (dbError: any) {
      // Handle "relation does not exist" error gracefully
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        console.log('Tasks table does not exist yet - skipping invoice task resolution');
        return { success: true, message: 'Skipped - tasks table not created yet' };
      }
      throw dbError;
    }

    const tasks = tasksResult.rows;
    console.log(`Found ${tasks.length} active invoice tasks with paid sessions`);
    
    // Group tasks by assigned_to_user_id to check settings once per user
    const tasksByUserId = tasks.reduce((acc, task) => {
      const userId = String(task.assigned_to_user_id);
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(task);
      return acc;
    }, {} as Record<string, any[]>);
    
    let completedCount = 0;
    
    // Process tasks by user
    for (const userId in tasksByUserId) {
      // Check if user has auto-resolve enabled
      const userSetting = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, parseInt(userId))
      });
      
      if (!userSetting || !userSetting.autoResolveCompletedTasks) {
        console.log(`Skipping auto-resolve for user ${userId} (auto-resolve disabled)`);
        continue;
      }
      
      // Update each task to completed status
      for (const task of tasksByUserId[userId]) {
          await db.execute(
            sql`UPDATE ${schema.tasks}
                SET status = 'completed', completed_at = ${new Date()}
                WHERE id = ${task.id}`
          );
        completedCount++;
      }
    }

    console.log(`Completed ${completedCount} invoice tasks`);
    
    // Create notifications for users who had invoice tasks auto-completed
    if (completedCount > 0) {
      for (const userId in tasksByUserId) {
        // Get count of tasks that were auto-completed for this user
        const userCompletedTasks = tasksByUserId[userId].length;
        
        if (userCompletedTasks > 0) {
          try {
            await createNotification({
              userId: parseInt(userId),
              title: "Invoice Tasks Automatically Completed",
              message: `${userCompletedTasks} invoice tasks were automatically completed because payments were recorded.`,
              type: "task_automation",
              entityType: "task"
            });
            console.log(`Created notification for user ${userId} about ${userCompletedTasks} auto-completed invoice tasks`);
          } catch (notifError) {
            console.error(`Error creating notification for user ${userId}:`, notifError);
          }
        }
      }
    }
    
    return { success: true, completedTasks: completedCount };
  } catch (error) {
    console.error('Error resolving invoice tasks:', error);
    return { success: false, error };
  }
};

/**
 * Enforces audit log retention policy
 * This function is designed to be run periodically (e.g., weekly)
 */
export const enforceAuditLogRetention = async () => {
  try {
    console.log('Starting audit log retention policy enforcement...');
    
    const schema = getActiveSchema();
    
    // Check if audit logs table exists in current schema
    if (!schema.auditLogs) {
      console.log('Audit logs table not available in HIPAA schema - skipping audit log retention');
      return { success: true, message: 'Skipped - audit logs table not available in HIPAA schema' };
    }
    
    // Get current storage stats
    const stats = await auditRetentionService.getStorageStats();
    console.log(`Current audit log storage: ${stats.totalRecords} records, ${stats.estimatedStorageSize}`);
    
    // Validate retention policy
    const validation = await auditRetentionService.validateRetentionPolicy();
    if (!validation.isValid) {
      console.warn('Retention policy validation issues:', validation.issues);
      console.log('Recommendations:', validation.recommendations);
    }
    
    // Enforce retention policy
    const retentionStats = await auditRetentionService.enforceRetentionPolicy();
    
    console.log(`Audit retention enforcement completed:`);
    console.log(`- Records processed: ${retentionStats.recordsProcessed}`);
    console.log(`- Records deleted: ${retentionStats.recordsDeleted}`);
    console.log(`- Records archived: ${retentionStats.recordsArchived}`);
    console.log(`- Errors: ${retentionStats.errors}`);
    console.log(`- Duration: ${retentionStats.durationMs}ms`);
    
    return {
      success: true,
      stats: retentionStats,
      validation
    };
  } catch (error) {
    console.error('Error enforcing audit log retention:', error);
    return { success: false, error };
  }
};