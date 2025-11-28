import { CalendarBlockRepository, OrganizationMembershipRepository, AuditLogRepository } from '../repositories';
import { ValidationError } from '../utils/work-schedule-validation';

/**
 * Calendar Block Service
 * 
 * Handles calendar block management with organization-aware access control and validation
 */

export interface CalendarBlockInput {
  startDate: Date;
  endDate: Date;
  blockType: string;
  reason?: string;
  isRecurring?: boolean;
  recurringPattern?: any;
}

export class CalendarBlockService {
  /**
   * Get calendar blocks for a user (with access control)
   */
  static async getBlocksForUser(
    userId: number, 
    requestingUserId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    if (memberships.length === 0) {
      return [];
    }

    // Check if requesting user can view blocks for this user
    const canView = await this.canViewUserBlocks(userId, requestingUserId, memberships);
    if (!canView) {
      return [];
    }

    const blocks = await CalendarBlockRepository.findByUserId(userId, startDate, endDate);

    // Log access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'READ',
      resourceType: 'CALENDAR_BLOCK',
      resourceId: userId,
      fieldsAccessed: ['startDate', 'endDate', 'blockType', 'reason'],
      phiFieldsCount: 0,
      requestMethod: 'GET',
      requestPath: '/api/calendar/blocks',
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return blocks;
  }

  /**
   * Create a calendar block (with validation and access control)
   */
  static async createBlock(
    userId: number,
    blockData: CalendarBlockInput,
    requestingUserId: number
  ): Promise<{ success: boolean; data?: any; errors?: ValidationError[] }> {
    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    if (memberships.length === 0) {
      return { success: false, errors: [{ field: 'access', message: 'No organization access' }] };
    }

    // Check if requesting user can modify blocks for this user
    const canModify = await this.canModifyUserBlocks(userId, requestingUserId, memberships);
    if (!canModify) {
      return { success: false, errors: [{ field: 'access', message: 'Insufficient permissions' }] };
    }

    // Validate block data
    const validationErrors = this.validateBlockData(blockData);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // Check for conflicts
    const conflicts = await CalendarBlockRepository.findConflicts(
      userId, 
      blockData.startDate, 
      blockData.endDate
    );
    
    console.log('Conflict check:', {
      userId,
      startDate: blockData.startDate,
      endDate: blockData.endDate,
      conflictsFound: conflicts.length,
      conflicts: conflicts.map(c => ({ id: c.id, startDate: c.startDate, endDate: c.endDate, reason: c.reason }))
    });
    
    if (conflicts.length > 0) {
      return { 
        success: false, 
        errors: [{ field: 'conflict', message: 'Time period conflicts with existing blocks' }] 
      };
    }

    // Get organization ID from memberships
    const organizationId = memberships[0].organizationId;

    // Create the block
    const block = await CalendarBlockRepository.create({
      userId,
      organizationId,
      ...blockData
    });

    // Log creation
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'CREATE',
      resourceType: 'CALENDAR_BLOCK',
      resourceId: block.id,
      fieldsAccessed: ['startDate', 'endDate', 'blockType', 'reason'],
      phiFieldsCount: 0,
      requestMethod: 'POST',
      requestPath: '/api/calendar/blocks',
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return { success: true, data: block };
  }

  /**
   * Update a calendar block
   */
  static async updateBlock(
    blockId: number,
    data: Partial<CalendarBlockInput>,
    requestingUserId: number
  ): Promise<{ success: boolean; data?: any; errors?: ValidationError[] }> {
    // Get the existing block
    const existingBlock = await CalendarBlockRepository.findById(blockId);
    if (!existingBlock) {
      return { success: false, errors: [{ field: 'block', message: 'Block not found' }] };
    }

    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    if (memberships.length === 0) {
      return { success: false, errors: [{ field: 'access', message: 'No organization access' }] };
    }

    // Check if requesting user can modify this block
    const canModify = await this.canModifyUserBlocks(existingBlock.userId, requestingUserId, memberships);
    if (!canModify) {
      return { success: false, errors: [{ field: 'access', message: 'Insufficient permissions' }] };
    }

    // Validate updated data
    if (data.startDate || data.endDate) {
      const validationData = {
        startDate: data.startDate || existingBlock.startDate,
        endDate: data.endDate || existingBlock.endDate,
        blockType: data.blockType || existingBlock.blockType,
        reason: data.reason || existingBlock.reason,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : existingBlock.isRecurring,
        recurringPattern: data.recurringPattern || existingBlock.recurringPattern
      };

      const validationErrors = this.validateBlockData(validationData);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }
    }

    // Update the block
    const updatedBlock = await CalendarBlockRepository.update(blockId, data);

    // Log update
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'UPDATE',
      resourceType: 'CALENDAR_BLOCK',
      resourceId: blockId,
      fieldsAccessed: Object.keys(data),
      phiFieldsCount: 0,
      requestMethod: 'PUT',
      requestPath: `/api/calendar/blocks/${blockId}`,
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return { success: true, data: updatedBlock };
  }

  /**
   * Delete a calendar block
   */
  static async deleteBlock(blockId: number, requestingUserId: number): Promise<{ success: boolean; error?: string }> {
    const block = await CalendarBlockRepository.findById(blockId);
    if (!block) {
      return { success: false, error: 'Block not found' };
    }

    // Check permissions
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    const canModify = await this.canModifyUserBlocks(block.userId, requestingUserId, memberships);
    
    if (!canModify) {
      return { success: false, error: 'Insufficient permissions' };
    }

    await CalendarBlockRepository.delete(blockId);

    // Log deletion
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'DELETE',
      resourceType: 'CALENDAR_BLOCK',
      resourceId: blockId,
      fieldsAccessed: ['id'],
      phiFieldsCount: 0,
      requestMethod: 'DELETE',
      requestPath: `/api/calendar/blocks/${blockId}`,
      responseStatus: 200,
      securityLevel: 'standard',
      hipaaCompliant: true
    });

    return { success: true };
  }

  /**
   * Check for session conflicts
   */
  static async checkSessionConflicts(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    return CalendarBlockRepository.findSessionConflicts(userId, startDate, endDate);
  }

  /**
   * Validate calendar block data
   */
  static validateBlockData(data: CalendarBlockInput): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate dates
    if (data.startDate >= data.endDate) {
      errors.push({
        field: 'endDate',
        message: 'End date must be after start date'
      });
    }

    // Validate block type
    const validBlockTypes = ['intake', 'lunch', 'recurring', 'blocked', 'meeting', 'notes', 'vacation', 'sick', 'admin', 'personal', 'other'];
    if (!validBlockTypes.includes(data.blockType)) {
      errors.push({
        field: 'blockType',
        message: `Block type must be one of: ${validBlockTypes.join(', ')}`
      });
    }

    // Validate recurring pattern if isRecurring is true
    if (data.isRecurring && data.recurringPattern) {
      if (!data.recurringPattern.frequency || !['daily', 'weekly', 'monthly'].includes(data.recurringPattern.frequency)) {
        errors.push({
          field: 'recurringPattern',
          message: 'Recurring pattern must have valid frequency (daily, weekly, monthly)'
        });
      }
    }

    return errors;
  }

  /**
   * Check if requesting user can view blocks for target user
   */
  private static async canViewUserBlocks(
    targetUserId: number, 
    requestingUserId: number, 
    memberships: any[]
  ): Promise<boolean> {
    // Users can always view their own blocks
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
   * Check if requesting user can modify blocks for target user
   */
  private static async canModifyUserBlocks(
    targetUserId: number, 
    requestingUserId: number, 
    memberships: any[]
  ): Promise<boolean> {
    // Users can always modify their own blocks
    if (targetUserId === requestingUserId) {
      return true;
    }

    // Check organization permissions
    for (const membership of memberships) {
      if (membership.canManageStaff) {
        return true; // Business owner can manage all blocks
      }
    }

    return false;
  }
}
