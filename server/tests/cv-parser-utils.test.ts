import { describe, it, expect } from 'vitest';
import { parseDate } from '../utils/cv-parser';

describe('CV Parser Utils', () => {
  describe('parseDate', () => {
    it('should parse year-only dates', () => {
      const result = parseDate('2023');
      expect(result).toEqual(new Date('2023-01-01'));
    });

    it('should parse year-month dates', () => {
      const result = parseDate('2023-06');
      expect(result).toEqual(new Date('2023-06-01'));
    });

    it('should parse full dates', () => {
      const result = parseDate('2023-06-15');
      expect(result).toEqual(new Date('2023-06-15'));
    });

    it('should return null for null input', () => {
      const result = parseDate(null);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseDate('');
      expect(result).toBeNull();
    });

    it('should return null for invalid date strings', () => {
      expect(parseDate('invalid-date')).toBeNull();
      expect(parseDate('2023-13-01')).toBeNull();
      expect(parseDate('abcd')).toBeNull();
    });

    it('should handle various date formats', () => {
      expect(parseDate('2023')).toEqual(new Date('2023-01-01'));
      expect(parseDate('2023-12')).toEqual(new Date('2023-12-01'));
      expect(parseDate('2023-12-25')).toEqual(new Date('2023-12-25'));
    });
  });
});