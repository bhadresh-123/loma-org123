/**
 * Calendar Block Validation Utilities
 * 
 * Pure functions for validating calendar block data without database dependencies
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface CalendarBlockInput {
  startDate: Date;
  endDate: Date;
  blockType: string;
  reason?: string;
  isRecurring?: boolean;
  recurringPattern?: any;
}

/**
 * Validate calendar block data
 */
export function validateCalendarBlockData(data: CalendarBlockInput): ValidationError[] {
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
 * Validate date range overlap
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return endDate > startDate;
}

/**
 * Validate block type
 */
export function validateBlockType(blockType: string): boolean {
  const validBlockTypes = ['intake', 'lunch', 'recurring', 'blocked', 'meeting', 'notes', 'vacation', 'sick', 'admin', 'personal', 'other'];
  return validBlockTypes.includes(blockType);
}

/**
 * Validate recurring pattern
 */
export function validateRecurringPattern(pattern: any): boolean {
  if (!pattern) return true; // Optional field
  
  const validFrequencies = ['daily', 'weekly', 'monthly'];
  return validFrequencies.includes(pattern.frequency) && 
         typeof pattern.interval === 'number' && 
         pattern.interval > 0;
}
