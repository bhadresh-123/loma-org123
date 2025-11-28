import { describe, it, expect } from 'vitest';
import { encryptPHI, decryptPHI } from '../../utils/phi-encryption';

describe('Profile Data Persistence - Critical Fields', () => {
  describe('PHI Encryption Round-Trip', () => {
    it('should encrypt and decrypt SSN correctly', () => {
      const ssn = '123-45-6789';
      const encrypted = encryptPHI(ssn);
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(ssn); // Should be encrypted, not plaintext
      expect(encrypted).toMatch(/^v1:/); // Should have version prefix
      
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(ssn);
    });

    it('should encrypt and decrypt DOB correctly', () => {
      const dob = '1985-01-15';
      const encrypted = encryptPHI(dob);
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(dob);
      expect(encrypted).toMatch(/^v1:/);
      
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(dob);
    });

    it('should encrypt and decrypt birth city correctly', () => {
      const birthCity = 'San Francisco';
      const encrypted = encryptPHI(birthCity);
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(birthCity);
      expect(encrypted).toMatch(/^v1:/);
      
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(birthCity);
    });

    it('should encrypt and decrypt birth state correctly', () => {
      const birthState = 'California';
      const encrypted = encryptPHI(birthState);
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(birthState);
      expect(encrypted).toMatch(/^v1:/);
      
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(birthState);
    });

    it('should encrypt and decrypt birth country correctly', () => {
      const birthCountry = 'United States';
      const encrypted = encryptPHI(birthCountry);
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(birthCountry);
      expect(encrypted).toMatch(/^v1:/);
      
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(birthCountry);
    });

    it('should handle null values', () => {
      expect(encryptPHI(null)).toBeNull();
      expect(decryptPHI(null)).toBeNull();
    });

    it('should handle empty strings', () => {
      expect(encryptPHI('')).toBeNull();
      expect(encryptPHI('   ')).toBeNull();
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const ssn = '123-45-6789';
      const encrypted1 = encryptPHI(ssn);
      const encrypted2 = encryptPHI(ssn);
      
      // Different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both decrypt to same value
      expect(decryptPHI(encrypted1)).toBe(ssn);
      expect(decryptPHI(encrypted2)).toBe(ssn);
    });

    it('should maintain data integrity through encryption/decryption cycles', () => {
      const testValues = [
        '123-45-6789',
        '1985-01-15',
        'San Francisco',
        'CA',
        'USA',
        'Test with special chars: !@#$%',
        'Unicode test: 你好'
      ];

      for (const value of testValues) {
        const encrypted = encryptPHI(value);
        const decrypted = decryptPHI(encrypted);
        expect(decrypted).toBe(value);
      }
    });

    it('should throw error on invalid ciphertext format', () => {
      expect(() => decryptPHI('invalid-format')).toThrow();
      expect(() => decryptPHI('v2:abc:def:ghi')).toThrow(); // Wrong version
    });
  });

  describe('NPI and Taxonomy (Non-PHI)', () => {
    it('should validate NPI format (10 digits)', () => {
      const validNPI = '1234567890';
      expect(validNPI).toMatch(/^\d{10}$/);
      expect(validNPI.length).toBe(10);
    });

    it('should reject invalid NPI formats', () => {
      const invalidNPIs = [
        '123456789',    // Too short
        '12345678901',  // Too long
        '12345abcde',   // Contains letters
        '123-456-7890', // Contains dashes
      ];

      for (const npi of invalidNPIs) {
        expect(npi).not.toMatch(/^\d{10}$/);
      }
    });

    it('should validate taxonomy code format', () => {
      const validTaxonomyCodes = [
        '103T00000X',
        '103TC0700X',
        '1041C0700X',
      ];

      for (const code of validTaxonomyCodes) {
        expect(code.length).toBeGreaterThan(0);
        expect(code).toMatch(/^\d{3}[A-Z\d]{7}$/); // NUCC format
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const encrypted = encryptPHI(longString);
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(longString);
    });

    it('should handle strings with newlines', () => {
      const multiline = 'Line 1\nLine 2\nLine 3';
      const encrypted = encryptPHI(multiline);
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(multiline);
    });

    it('should handle strings with special characters', () => {
      const special = 'Test!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const encrypted = encryptPHI(special);
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(special);
    });
  });
});

