import { describe, it, expect } from 'vitest';
import { validateCalendarBlockData, validateDateRange, validateBlockType, validateRecurringPattern } from '../utils/calendar-block-validation';

describe('Calendar Block Validation Tests', () => {
  describe('validateCalendarBlockData', () => {
    it('should validate correct block data', () => {
      const validBlock = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        blockType: 'vacation',
        reason: 'Family vacation',
        isRecurring: false
      };

      const errors = validateCalendarBlockData(validBlock);
      expect(errors).toEqual([]);
    });

    it('should reject end date before start date', () => {
      const invalidBlock = {
        startDate: new Date('2024-01-01T17:00:00Z'),
        endDate: new Date('2024-01-01T09:00:00Z'),
        blockType: 'vacation',
        reason: 'Invalid dates'
      };

      const errors = validateCalendarBlockData(invalidBlock);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('endDate');
      expect(errors[0].message).toContain('End date must be after start date');
    });

    it('should reject invalid block types', () => {
      const invalidBlock = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        blockType: 'invalid_type',
        reason: 'Invalid type'
      };

      const errors = validateCalendarBlockData(invalidBlock);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('blockType');
      expect(errors[0].message).toContain('Block type must be one of');
    });

    it('should accept all valid block types', () => {
      const validTypes = ['vacation', 'sick', 'admin', 'personal', 'other'];
      
      validTypes.forEach(blockType => {
        const block = {
          startDate: new Date('2024-01-01T09:00:00Z'),
          endDate: new Date('2024-01-01T17:00:00Z'),
          blockType,
          reason: 'Test'
        };

        const errors = validateCalendarBlockData(block);
        expect(errors).toEqual([]);
      });
    });

    it('should validate recurring pattern when isRecurring is true', () => {
      const invalidRecurringBlock = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        blockType: 'vacation',
        reason: 'Recurring vacation',
        isRecurring: true,
        recurringPattern: {
          frequency: 'invalid_frequency',
          interval: 1
        }
      };

      const errors = validateCalendarBlockData(invalidRecurringBlock);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('recurringPattern');
      expect(errors[0].message).toContain('Recurring pattern must have valid frequency');
    });

    it('should accept valid recurring patterns', () => {
      const validFrequencies = ['daily', 'weekly', 'monthly'];
      
      validFrequencies.forEach(frequency => {
        const block = {
          startDate: new Date('2024-01-01T09:00:00Z'),
          endDate: new Date('2024-01-01T17:00:00Z'),
          blockType: 'vacation',
          reason: 'Recurring vacation',
          isRecurring: true,
          recurringPattern: {
            frequency,
            interval: 1
          }
        };

        const errors = validateCalendarBlockData(block);
        expect(errors).toEqual([]);
      });
    });

    it('should handle edge case where start and end dates are equal', () => {
      const sameDateBlock = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T09:00:00Z'),
        blockType: 'vacation',
        reason: 'Same dates'
      };

      const errors = validateCalendarBlockData(sameDateBlock);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('endDate');
    });

    it('should handle missing optional fields', () => {
      const minimalBlock = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        blockType: 'personal'
      };

      const errors = validateCalendarBlockData(minimalBlock);
      expect(errors).toEqual([]);
    });

    it('should handle complex recurring patterns', () => {
      const complexRecurringBlock = {
        startDate: new Date('2024-01-01T09:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        blockType: 'admin',
        reason: 'Weekly admin time',
        isRecurring: true,
        recurringPattern: {
          frequency: 'weekly',
          interval: 2,
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
          endDate: '2024-12-31T23:59:59Z'
        }
      };

      const errors = validateCalendarBlockData(complexRecurringBlock);
      expect(errors).toEqual([]);
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date ranges', () => {
      expect(validateDateRange(
        new Date('2024-01-01T09:00:00Z'),
        new Date('2024-01-01T17:00:00Z')
      )).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      expect(validateDateRange(
        new Date('2024-01-01T17:00:00Z'),
        new Date('2024-01-01T09:00:00Z')
      )).toBe(false);
    });

    it('should reject equal dates', () => {
      const sameDate = new Date('2024-01-01T09:00:00Z');
      expect(validateDateRange(sameDate, sameDate)).toBe(false);
    });
  });

  describe('validateBlockType', () => {
    it('should validate correct block types', () => {
      const validTypes = ['vacation', 'sick', 'admin', 'personal', 'other'];
      validTypes.forEach(type => {
        expect(validateBlockType(type)).toBe(true);
      });
    });

    it('should reject invalid block types', () => {
      expect(validateBlockType('invalid')).toBe(false);
      expect(validateBlockType('')).toBe(false);
    });
  });

  describe('validateRecurringPattern', () => {
    it('should validate correct recurring patterns', () => {
      const validPatterns = [
        { frequency: 'daily', interval: 1 },
        { frequency: 'weekly', interval: 2 },
        { frequency: 'monthly', interval: 1 }
      ];

      validPatterns.forEach(pattern => {
        expect(validateRecurringPattern(pattern)).toBe(true);
      });
    });

    it('should reject invalid recurring patterns', () => {
      const invalidPatterns = [
        { frequency: 'invalid', interval: 1 },
        { frequency: 'daily', interval: 0 },
        { frequency: 'weekly', interval: -1 },
        { frequency: 'daily' }, // missing interval
        { interval: 1 } // missing frequency
      ];

      invalidPatterns.forEach(pattern => {
        expect(validateRecurringPattern(pattern)).toBe(false);
      });
    });

    it('should accept null/undefined patterns', () => {
      expect(validateRecurringPattern(null)).toBe(true);
      expect(validateRecurringPattern(undefined)).toBe(true);
    });
  });
});
