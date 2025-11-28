import { describe, it, expect } from 'vitest';
import { validateNoOverlaps, validateTimeFormat, validateTimeOrder, validateDayOfWeek } from '../utils/work-schedule-validation';

describe('Work Schedule Validation Tests', () => {
  describe('validateNoOverlaps', () => {
    it('should validate no overlaps correctly', () => {
      const validSchedules = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' }
      ];

      const errors = validateNoOverlaps(validSchedules);
      expect(errors).toEqual([]);
    });

    it('should detect overlaps correctly', () => {
      const overlappingSchedules = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '15:00' }
      ];

      const errors = validateNoOverlaps(overlappingSchedules);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('dayOfWeek_1');
      expect(errors[0].message).toContain('overlap');
    });

    it('should handle different days correctly', () => {
      const differentDaySchedules = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }
      ];

      const errors = validateNoOverlaps(differentDaySchedules);
      expect(errors).toEqual([]);
    });

    it('should handle multiple overlaps on same day', () => {
      const multipleOverlaps = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '15:00' },
        { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' }
      ];

      const errors = validateNoOverlaps(multipleOverlaps);
      expect(errors.length).toBeGreaterThan(0);
      // Should detect both overlaps
      expect(errors.some(e => e.message.includes('09:00-12:00'))).toBe(true);
      expect(errors.some(e => e.message.includes('11:00-15:00'))).toBe(true);
    });

    it('should handle edge case where end time equals start time', () => {
      const edgeCaseSchedules = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '12:00', endTime: '15:00' }
      ];

      const errors = validateNoOverlaps(edgeCaseSchedules);
      expect(errors).toEqual([]); // Should not be considered overlapping
    });

    it('should handle empty schedules array', () => {
      const errors = validateNoOverlaps([]);
      expect(errors).toEqual([]);
    });

    it('should handle single schedule', () => {
      const singleSchedule = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }
      ];

      const errors = validateNoOverlaps(singleSchedule);
      expect(errors).toEqual([]);
    });
  });

  describe('validateTimeFormat', () => {
    it('should validate correct time formats', () => {
      expect(validateTimeFormat('09:00')).toBe(true);
      expect(validateTimeFormat('23:59')).toBe(true);
      expect(validateTimeFormat('00:00')).toBe(true);
      expect(validateTimeFormat('12:30')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(validateTimeFormat('25:00')).toBe(false);
      expect(validateTimeFormat('09:60')).toBe(false);
      expect(validateTimeFormat('9:00')).toBe(false);
      expect(validateTimeFormat('09:0')).toBe(false);
      expect(validateTimeFormat('invalid')).toBe(false);
    });
  });

  describe('validateTimeOrder', () => {
    it('should validate correct time order', () => {
      expect(validateTimeOrder('09:00', '17:00')).toBe(true);
      expect(validateTimeOrder('00:00', '23:59')).toBe(true);
      expect(validateTimeOrder('12:00', '12:30')).toBe(true);
    });

    it('should reject incorrect time order', () => {
      expect(validateTimeOrder('17:00', '09:00')).toBe(false);
      expect(validateTimeOrder('12:00', '12:00')).toBe(false);
      expect(validateTimeOrder('23:59', '00:00')).toBe(false);
    });
  });

  describe('validateDayOfWeek', () => {
    it('should validate correct day of week values', () => {
      expect(validateDayOfWeek(0)).toBe(true); // Sunday
      expect(validateDayOfWeek(6)).toBe(true); // Saturday
      expect(validateDayOfWeek(3)).toBe(true); // Wednesday
    });

    it('should reject invalid day of week values', () => {
      expect(validateDayOfWeek(-1)).toBe(false);
      expect(validateDayOfWeek(7)).toBe(false);
      expect(validateDayOfWeek(1.5)).toBe(false);
      expect(validateDayOfWeek(NaN)).toBe(false);
    });
  });
});
