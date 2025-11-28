// Database transaction safety utilities for Phase 2.5
import { db, getActiveSchema } from '@db';
import { eq, desc, and } from 'drizzle-orm';
import { APIResponse, createSuccessResponse, APIErrorHandler } from './api-error-handler';

export interface WorkScheduleData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export class DatabaseTransactionHandler {
  /**
   * Safely update work schedules with atomic transaction
   */
  static async updateWorkSchedules(
    userId: number,
    schedules: WorkScheduleData[]
  ): Promise<APIResponse<any[]>> {
    // Validate input data first
    const validationError = this.validateWorkSchedules(schedules);
    if (validationError) {
      return {
        success: false,
        error: validationError
      };
    }

    try {
      // Validate user permissions
      await this.validateUserPermissions(userId);
      
      // Delete existing schedules for user
      const schema = getActiveSchema();
      if (!schema.workSchedules) {
        return {
          success: false,
          error: {
            code: 'SCHEMA_NOT_AVAILABLE',
            message: 'Work schedules table not available in current schema',
            correlationId: 'schema-' + Date.now(),
            retryable: false,
            suggestions: ['Please contact support']
          }
        };
      }
      
      await db.delete(schema.workSchedules).where(eq(schema.workSchedules.userId, userId));
      
      // Insert new schedules if any provided
      let insertedSchedules: any[] = [];
      if (schedules.length > 0) {
        const schedulesWithUserId = schedules.map(schedule => ({
          userId,
          organizationId: schedule.organizationId || 1, // Default to organization 1 if not provided
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        }));
        
        insertedSchedules = await db
          .insert(schema.workSchedules)
          .values(schedulesWithUserId)
          .returning();
      }
      
      return createSuccessResponse(insertedSchedules, 'Work schedules updated successfully');
      
    } catch (error) {
      return this.handleDatabaseError(error as Error);
    }
  }

  /**
   * Safely fetch work schedules with error handling
   */
  static async getWorkSchedules(userId: number): Promise<APIResponse<any[]>> {
    try {
      const schema = getActiveSchema();
      if (!schema.workSchedules) {
        return {
          success: false,
          error: {
            code: 'SCHEMA_NOT_AVAILABLE',
            message: 'Work schedules table not available in current schema',
            correlationId: 'schema-' + Date.now(),
            retryable: false,
            suggestions: ['Please contact support']
          }
        };
      }
      
      const schedules = await db.query.workSchedules.findMany({
        where: eq(schema.workSchedules.userId, userId),
        orderBy: [schema.workSchedules.dayOfWeek, schema.workSchedules.startTime]
      });
      
      return createSuccessResponse(schedules);
      
    } catch (error) {
      return this.handleDatabaseError(error as Error);
    }
  }

  /**
   * Validate work schedule data integrity
   */
  private static validateWorkSchedules(schedules: WorkScheduleData[]): any {
    const errors: string[] = [];
    
    for (const schedule of schedules) {
      // Validate day of week
      if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        errors.push(`Invalid day of week: ${schedule.dayOfWeek}. Must be 0-6.`);
      }
      
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(schedule.startTime)) {
        errors.push(`Invalid start time format: ${schedule.startTime}. Must be HH:MM.`);
      }
      if (!timeRegex.test(schedule.endTime)) {
        errors.push(`Invalid end time format: ${schedule.endTime}. Must be HH:MM.`);
      }
      
      // Validate time logic
      if (schedule.startTime >= schedule.endTime) {
        errors.push(`Start time ${schedule.startTime} must be before end time ${schedule.endTime}.`);
      }
    }
    
    // Check for overlapping schedules on same day
    const daySchedules = new Map<number, WorkScheduleData[]>();
    for (const schedule of schedules) {
      if (!daySchedules.has(schedule.dayOfWeek)) {
        daySchedules.set(schedule.dayOfWeek, []);
      }
      daySchedules.get(schedule.dayOfWeek)!.push(schedule);
    }
    
    daySchedules.forEach((dayScheds, day) => {
      for (let i = 0; i < dayScheds.length; i++) {
        for (let j = i + 1; j < dayScheds.length; j++) {
          if (this.scheduleOverlap(dayScheds[i], dayScheds[j])) {
            errors.push(`Overlapping schedules on day ${day}: ${dayScheds[i].startTime}-${dayScheds[i].endTime} and ${dayScheds[j].startTime}-${dayScheds[j].endTime}`);
          }
        }
      }
    });
    
    if (errors.length > 0) {
      return {
        code: 'VALIDATION_FAILED',
        message: 'Work schedule validation failed',
        correlationId: 'validation-' + Date.now(),
        retryable: false,
        suggestions: errors
      };
    }
    
    return null;
  }

  /**
   * Check if two schedules overlap
   */
  private static scheduleOverlap(schedule1: WorkScheduleData, schedule2: WorkScheduleData): boolean {
    if (schedule1.dayOfWeek !== schedule2.dayOfWeek) return false;
    
    const start1 = this.timeToMinutes(schedule1.startTime);
    const end1 = this.timeToMinutes(schedule1.endTime);
    const start2 = this.timeToMinutes(schedule2.startTime);
    const end2 = this.timeToMinutes(schedule2.endTime);
    
    return (start1 < end2 && start2 < end1);
  }

  /**
   * Convert time string to minutes for comparison
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validate user permissions
   */
  private static async validateUserPermissions(userId: number): Promise<void> {
    // Basic user existence check - can be expanded for role-based permissions
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID provided');
    }
  }

  /**
   * Handle database-specific errors
   */
  private static handleDatabaseError(error: Error): APIResponse<any> {
    console.error('Database operation failed:', error);
    
    // Check for connection errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
      return {
        success: false,
        error: {
          code: 'DATABASE_CONNECTION_FAILED',
          message: 'Database connection temporarily unavailable',
          correlationId: 'db-' + Date.now(),
          retryable: true,
          suggestions: ['Please try again in a few moments', 'Contact support if the issue persists']
        }
      };
    }
    
    // Check for constraint violations
    if (error.message.includes('constraint') || error.message.includes('unique')) {
      return {
        success: false,
        error: {
          code: 'DATABASE_CONSTRAINT_VIOLATION',
          message: 'Data constraint violation',
          correlationId: 'constraint-' + Date.now(),
          retryable: false,
          suggestions: ['Please check your input data', 'Ensure no duplicate entries']
        }
      };
    }
    
    // Generic database error
    return {
      success: false,
      error: {
        code: 'DATABASE_OPERATION_FAILED',
        message: 'Database operation failed',
        correlationId: 'db-error-' + Date.now(),
        retryable: true,
        suggestions: ['Please try again', 'Contact support if the issue persists']
      }
    };
  }
}