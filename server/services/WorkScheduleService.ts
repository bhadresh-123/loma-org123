import { WorkScheduleRepository, OrganizationMembershipRepository, AuditLogRepository } from '../repositories';
import { DatabaseTransactionHandler } from '../utils/database-transaction';
import { validateNoOverlaps, ValidationError } from '../utils/work-schedule-validation';

export interface TimeSlot {
  hour: number;
  minute: number;
  available: boolean;
}

export class WorkScheduleService {
  /**
   * Get work schedules for a user (with access control)
   */
  static async getSchedulesForUser(userId: number, requestingUserId: number): Promise<any[]> {
    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    if (memberships.length === 0) {
      return [];
    }

    // Check if requesting user can view schedules for this user
    const canView = await this.canViewUserSchedules(userId, requestingUserId, memberships);
    if (!canView) {
      return [];
    }

    const schedules = await WorkScheduleRepository.findByUserId(userId);

    // Log access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'READ',
      resourceType: 'WORK_SCHEDULE',
      resourceId: userId,
      fieldsAccessed: ['dayOfWeek', 'startTime', 'endTime', 'isActive'],
      phiFieldsCount: 0,
      requestMethod: 'GET',
      requestPath: '/api/work-schedules',
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return schedules;
  }

  /**
   * Update work schedules for a user (with validation and access control)
   */
  static async updateSchedules(
    userId: number, 
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isActive?: boolean;
    }>, 
    requestingUserId: number
  ): Promise<{ success: boolean; data?: any[]; errors?: ValidationError[] }> {
    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    if (memberships.length === 0) {
      return { success: false, errors: [{ field: 'access', message: 'No organization access' }] };
    }

    // Check if requesting user can modify schedules for this user
    const canModify = await this.canModifyUserSchedules(userId, requestingUserId, memberships);
    if (!canModify) {
      return { success: false, errors: [{ field: 'access', message: 'Insufficient permissions' }] };
    }

    // Validate schedules
    const validationErrors = validateNoOverlaps(schedules);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // Get organization ID from memberships
    const organizationId = memberships[0].organizationId;

    // Use transaction handler for atomic updates
    const result = await DatabaseTransactionHandler.updateWorkSchedules(userId, schedules.map(schedule => ({
      organizationId: organizationId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    })));

    if (!result.success) {
      return { success: false, errors: [{ field: 'database', message: result.error?.message || 'Database error' }] };
    }

    // Log modification
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'UPDATE',
      resourceType: 'WORK_SCHEDULE',
      resourceId: userId,
      fieldsAccessed: ['dayOfWeek', 'startTime', 'endTime', 'isActive'],
      phiFieldsCount: 0,
      requestMethod: 'POST',
      requestPath: '/api/work-schedules',
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return { success: true, data: result.data };
  }

  /**
   * Get available time slots for a specific date
   */
  static async getAvailableSlots(userId: number, date: Date): Promise<TimeSlot[]> {
    const dayOfWeek = date.getDay();
    const schedules = await WorkScheduleRepository.findByUserId(userId);
    
    const daySchedule = schedules.find(s => s.dayOfWeek === dayOfWeek && s.isActive);
    
    if (!daySchedule) {
      return []; // No schedule for this day
    }

    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) { // 30-minute slots
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      
      slots.push({
        hour,
        minute,
        available: true
      });
    }
    
    return slots;
  }

  /**
   * Check if requesting user can view schedules for target user
   */
  private static async canViewUserSchedules(
    targetUserId: number, 
    requestingUserId: number, 
    memberships: any[]
  ): Promise<boolean> {
    // Users can always view their own schedules
    if (targetUserId === requestingUserId) {
      return true;
    }

    // Check organization permissions
    for (const membership of memberships) {
      if (membership.canViewAllCalendars) {
        return true; // Business owner can view all
      }
      
      if (membership.canViewSelectedCalendars && 
          Array.isArray(membership.canViewSelectedCalendars) && 
          membership.canViewSelectedCalendars.includes(targetUserId)) {
        return true; // Admin can view selected calendars
      }
    }

    return false;
  }

  /**
   * Check if requesting user can modify schedules for target user
   */
  private static async canModifyUserSchedules(
    targetUserId: number, 
    requestingUserId: number, 
    memberships: any[]
  ): Promise<boolean> {
    // Users can always modify their own schedules
    if (targetUserId === requestingUserId) {
      return true;
    }

    // Check organization permissions
    for (const membership of memberships) {
      if (membership.canManageStaff) {
        return true; // Business owner can manage all schedules
      }
    }

    return false;
  }

  /**
   * Delete a specific work schedule
   */
  static async deleteSchedule(scheduleId: number, requestingUserId: number): Promise<{ success: boolean; error?: string }> {
    const schedule = await WorkScheduleRepository.findById(scheduleId);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }

    // Check permissions
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    const canModify = await this.canModifyUserSchedules(schedule.userId, requestingUserId, memberships);
    
    if (!canModify) {
      return { success: false, error: 'Insufficient permissions' };
    }

    await WorkScheduleRepository.delete(scheduleId);

    // Log deletion
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'DELETE',
      resourceType: 'WORK_SCHEDULE',
      resourceId: scheduleId,
      fieldsAccessed: ['id'],
      phiFieldsCount: 0,
      requestMethod: 'DELETE',
      requestPath: `/api/work-schedules/${scheduleId}`,
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return { success: true };
  }
}
