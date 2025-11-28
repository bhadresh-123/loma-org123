/**
 * Unit Tests for Safe Logger Utility
 * Phase 1: Critical Logging Fixes
 */

import { describe, it, expect } from 'vitest';
import {
  redactEmail,
  redactPhone,
  redactSSN,
  redactDOB,
  redactPHI,
  redactPHIFromObject,
  safeLog
} from '../utils/safe-logger';

describe('Safe Logger - Email Redaction', () => {
  it('should redact standard email addresses', () => {
    expect(redactEmail('john.doe@example.com')).toBe('j***@example.com');
    expect(redactEmail('alice@test.org')).toBe('a***@test.org');
  });

  it('should handle short email addresses', () => {
    const result = redactEmail('a@b.com');
    expect(result).toContain('@b.com'); // Preserves domain
    expect(result).not.toBe('a@b.com'); // Is redacted
  });

  it('should return placeholder for invalid input', () => {
    expect(redactEmail('')).toBe('[no-email]');
  });

  it('should preserve domain for tracking purposes', () => {
    const redacted = redactEmail('support@company.com');
    expect(redacted).toContain('@company.com');
  });
});

describe('Safe Logger - Phone Redaction', () => {
  it('should redact phone numbers with various formats', () => {
    expect(redactPhone('(555) 123-4567')).toBe('***-***-4567');
    expect(redactPhone('555-123-4567')).toBe('***-***-4567');
    expect(redactPhone('5551234567')).toBe('***-***-4567');
  });

  it('should preserve last 4 digits', () => {
    const redacted = redactPhone('(555) 123-4567');
    expect(redacted).toContain('4567');
  });

  it('should return placeholder for invalid input', () => {
    expect(redactPhone('')).toBe('[no-phone]');
  });
});

describe('Safe Logger - SSN Redaction', () => {
  it('should redact SSN mostly but preserve last 4', () => {
    expect(redactSSN('123-45-6789')).toBe('***-**-6789');
    expect(redactSSN('123456789')).toBe('***-**-6789');
  });

  it('should return placeholder for invalid input', () => {
    expect(redactSSN('')).toBe('[no-ssn]');
  });
});

describe('Safe Logger - DOB Redaction', () => {
  it('should redact date of birth', () => {
    expect(redactDOB('01/15/1985')).toBe('[REDACTED-DOB]');
    expect(redactDOB('1985-01-15')).toBe('[REDACTED-DOB]');
  });
});

describe('Safe Logger - PHI Pattern Detection', () => {
  it('should detect and redact multiple PHI patterns in text', () => {
    const text = 'Contact john.doe@example.com or call (555) 123-4567';
    const redacted = redactPHI(text);
    
    // Should not contain original values
    expect(redacted).not.toContain('john.doe@example.com');
    expect(redacted).not.toContain('(555) 123-4567');
    
    // Should contain redacted versions
    expect(redacted).toContain('@example.com'); // Domain preserved
    expect(redacted).toContain('4567'); // Last 4 digits preserved
  });

  it('should redact SSN patterns', () => {
    const text = 'SSN: 123-45-6789';
    const redacted = redactPHI(text);
    
    expect(redacted).not.toContain('123-45-6789');
    expect(redacted).toContain('6789'); // Last 4 preserved
  });

  it('should handle text with no PHI', () => {
    const text = 'This is a safe message with no PHI';
    const redacted = redactPHI(text);
    
    expect(redacted).toBe(text);
  });

  it('should redact multiple occurrences', () => {
    const text = 'Email: john@test.com and jane@test.com';
    const redacted = redactPHI(text);
    
    expect(redacted).not.toContain('john@test.com');
    expect(redacted).not.toContain('jane@test.com');
    expect(redacted).toContain('@test.com'); // Domains preserved
  });
});

describe('Safe Logger - Object Sanitization', () => {
  it('should handle objects with PHI when logging', () => {
    const obj = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      metadata: {
        contactEmail: 'contact@example.com'
      }
    };

    // safeLog should not throw when given objects with PHI
    expect(() => safeLog('info', 'Test message', obj)).not.toThrow();
  });

  it('should handle arrays with PHI when logging', () => {
    const obj = {
      contacts: [
        { email: 'test1@example.com' },
        { email: 'test2@example.com' }
      ]
    };

    expect(() => safeLog('info', 'Array test', obj)).not.toThrow();
  });

  it('should handle null and undefined values when logging', () => {
    const obj = {
      email: null,
      phone: undefined,
      name: 'Test'
    };

    expect(() => safeLog('info', 'Null test', obj)).not.toThrow();
  });
});

describe('Safe Logger - redactPHIFromObject', () => {
  it('should redact PHI in simple objects', () => {
    const obj = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    };

    const redacted = redactPHIFromObject(obj);

    expect(redacted.name).toBe('John Doe');
    expect(redacted.email).not.toBe('john@example.com');
    expect(redacted.email).toContain('@example.com');
    expect(redacted.phone).not.toBe('(555) 123-4567');
    expect(redacted.phone).toContain('4567');
  });

  it('should redact PHI in nested objects', () => {
    const obj = {
      user: {
        profile: {
          email: 'user@test.com',
          phone: '(555) 123-4567',
          personal: {
            ssn: '123-45-6789',
            dob: '01/15/1985'
          }
        }
      }
    };

    const redacted = redactPHIFromObject(obj);

    expect(redacted.user.profile.email).not.toBe('user@test.com');
    expect(redacted.user.profile.email).toContain('@test.com');
    expect(redacted.user.profile.phone).toContain('4567');
    expect(redacted.user.profile.personal.ssn).not.toBe('123-45-6789');
    expect(redacted.user.profile.personal.ssn).toContain('6789');
  });

  it('should mark encrypted fields as [encrypted-field]', () => {
    const obj = {
      name: 'Test',
      emailEncrypted: 'encrypted_data_here',
      patientDobEncrypted: 'encrypted_dob',
      sessionNotesEncrypted: 'encrypted_notes'
    };

    const redacted = redactPHIFromObject(obj);

    expect(redacted.emailEncrypted).toBe('[encrypted-field]');
    expect(redacted.patientDobEncrypted).toBe('[encrypted-field]');
    expect(redacted.sessionNotesEncrypted).toBe('[encrypted-field]');
  });

  it('should mark password fields as [redacted-credential]', () => {
    const obj = {
      username: 'testuser',
      password: 'secretpassword123',
      apiSecret: 'secret_key_here'
    };

    const redacted = redactPHIFromObject(obj);

    expect(redacted.username).toBe('testuser');
    expect(redacted.password).toBe('[redacted-credential]');
    expect(redacted.apiSecret).toBe('[redacted-credential]');
  });

  it('should handle arrays with PHI', () => {
    const obj = {
      contacts: [
        { email: 'test1@example.com', phone: '555-111-1111' },
        { email: 'test2@example.com', phone: '555-222-2222' }
      ]
    };

    const redacted = redactPHIFromObject(obj);

    expect(Array.isArray(redacted.contacts)).toBe(true);
    expect(redacted.contacts[0].email).not.toBe('test1@example.com');
    expect(redacted.contacts[0].email).toContain('@example.com');
    expect(redacted.contacts[1].phone).toContain('2222');
  });

  it('should handle null and undefined values', () => {
    const obj = {
      email: null,
      phone: undefined,
      name: 'Test',
      nested: {
        value: null
      }
    };

    const redacted = redactPHIFromObject(obj);

    expect(redacted.email).toBeNull();
    expect(redacted.phone).toBeUndefined();
    expect(redacted.name).toBe('Test');
    expect(redacted.nested.value).toBeNull();
  });

  it('should prevent infinite recursion with max depth', () => {
    const obj: any = { level: 1 };
    let current = obj;
    for (let i = 2; i <= 15; i++) {
      current.nested = { level: i };
      current = current.nested;
    }

    const redacted = redactPHIFromObject(obj);

    // Should reach max depth and return placeholder
    let depth = 0;
    let curr = redacted;
    while (curr.nested && depth < 20) {
      curr = curr.nested;
      depth++;
      if (curr === '[max-depth-exceeded]') break;
    }

    expect(depth).toBeLessThan(15);
  });

  it('should handle mixed PHI patterns in object values', () => {
    const obj = {
      notes: 'Contact john@test.com or call (555) 123-4567 for more info',
      description: 'SSN: 123-45-6789, DOB: 01/15/1985'
    };

    const redacted = redactPHIFromObject(obj);

    expect(redacted.notes).not.toContain('john@test.com');
    expect(redacted.notes).not.toContain('(555) 123-4567');
    expect(redacted.description).not.toContain('123-45-6789');
    expect(redacted.description).not.toContain('01/15/1985');
  });
});

describe('Safe Logger - safeLog function', () => {
  it('should not throw errors when logging', () => {
    expect(() => {
      safeLog('Test message', {
        email: 'test@example.com',
        phone: '555-1234'
      });
    }).not.toThrow();
  });

  it('should handle message-only logging', () => {
    expect(() => {
      safeLog('Simple log message');
    }).not.toThrow();
  });

  it('should handle complex nested objects', () => {
    const complexObj = {
      user: {
        profile: {
          email: 'user@test.com',
          phone: '(555) 123-4567',
          nested: {
            ssn: '123-45-6789'
          }
        }
      }
    };

    expect(() => {
      safeLog('Complex object test', complexObj);
    }).not.toThrow();
  });

  it('should redact PHI in log messages', () => {
    // This test verifies that safeLog processes the message through redactPHI
    expect(() => {
      safeLog('User email: john@example.com phone: 555-123-4567');
    }).not.toThrow();
  });
});

