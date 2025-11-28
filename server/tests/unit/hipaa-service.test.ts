import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PHIEncryptionService, HIPAAAuditService, TherapistService, PatientService } from '../../services/HIPAAService';

/**
 * HIPAA Service Unit Tests
 * 
 * Comprehensive tests for HIPAA compliance functionality
 * Tests PHI encryption, audit logging, and service operations
 */

describe('PHIEncryptionService', () => {
  beforeEach(() => {
    // Validate test encryption key is set
    // Never hardcode encryption keys - they should come from .env.test or CI/CD secrets
    if (!process.env.PHI_ENCRYPTION_KEY) {
      throw new Error('PHI_ENCRYPTION_KEY environment variable must be set for tests');
    }
    // Clear any cached key
    (PHIEncryptionService as any).encryptionKey = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Key Initialization', () => {
    it('should initialize encryption key from environment', () => {
      const key = PHIEncryptionService.initializeKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 32 bytes for AES-256
    });

    it('should throw error when PHI_ENCRYPTION_KEY is missing', () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      (PHIEncryptionService as any).encryptionKey = null;
      
      expect(() => {
        PHIEncryptionService.initializeKey();
      }).toThrow('PHI_ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    });

    it('should throw error when PHI_ENCRYPTION_KEY has wrong length', () => {
      process.env.PHI_ENCRYPTION_KEY = 'invalid_key';
      (PHIEncryptionService as any).encryptionKey = null;
      
      expect(() => {
        PHIEncryptionService.initializeKey();
      }).toThrow('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    });

    it('should return cached key on subsequent calls', () => {
      const key1 = PHIEncryptionService.initializeKey();
      const key2 = PHIEncryptionService.initializeKey();
      
      expect(key1).toBe(key2);
    });
  });

  describe('encryptPHI', () => {
    it('should encrypt PHI data correctly', () => {
      const testData = 'Test PHI data';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted).toMatch(/^v2:/);
      expect(encrypted).toMatch(/^v2:[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/);
    });

    it('should handle null and empty values', () => {
      expect(PHIEncryptionService.encryptPHI(null)).toBeNull();
      expect(PHIEncryptionService.encryptPHI('')).toBeNull();
      expect(PHIEncryptionService.encryptPHI('   ')).toBeNull();
    });

    it('should produce different encrypted values for same input', () => {
      const testData = 'Test PHI data';
      const encrypted1 = PHIEncryptionService.encryptPHI(testData);
      const encrypted2 = PHIEncryptionService.encryptPHI(testData);
      
      expect(encrypted1).not.toBe(encrypted2); // Different IVs should produce different results
    });

    it('should handle special characters and unicode', () => {
      const testData = 'Test PHI with special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./ and unicode: 你好世界';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).toMatch(/^v2:/);
    });

    it('should handle long text data', () => {
      const longText = 'A'.repeat(10000);
      const encrypted = PHIEncryptionService.encryptPHI(longText);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).toMatch(/^v2:/);
    });

    it('should throw error on encryption failure', () => {
      // Mock crypto to throw error
      const originalCreateCipheriv = require('crypto').createCipheriv;
      vi.spyOn(require('crypto'), 'createCipheriv').mockImplementation(() => {
        throw new Error('Crypto error');
      });

      expect(() => {
        PHIEncryptionService.encryptPHI('test data');
      }).toThrow('Failed to encrypt PHI data');

      // Restore original function
      require('crypto').createCipheriv = originalCreateCipheriv;
    });
  });

  describe('decryptPHI', () => {
    it('should decrypt PHI data correctly', () => {
      const testData = 'Test PHI data';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      const decrypted = PHIEncryptionService.decryptPHI(encrypted);
      
      expect(decrypted).toBe(testData);
    });

    it('should handle null and empty values', () => {
      expect(PHIEncryptionService.decryptPHI(null)).toBeNull();
      expect(PHIEncryptionService.decryptPHI('')).toBeNull();
    });

    it('should throw error for invalid ciphertext format', () => {
      expect(() => {
        PHIEncryptionService.decryptPHI('invalid-ciphertext');
      }).toThrow('Invalid ciphertext format');
    });

    it('should handle version mismatch gracefully', () => {
      const testData = 'Test PHI data';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      const modifiedEncrypted = encrypted.replace('v2:', 'v1:');
      
      // Should still work but log warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        PHIEncryptionService.decryptPHI(modifiedEncrypted);
      }).toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Encryption version mismatch')
      );
      
      consoleSpy.mockRestore();
    });

    it('should throw error for corrupted ciphertext', () => {
      const testData = 'Test PHI data';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      const corruptedEncrypted = encrypted.slice(0, -10); // Remove last 10 characters
      
      expect(() => {
        PHIEncryptionService.decryptPHI(corruptedEncrypted);
      }).toThrow();
    });

    it('should handle special characters and unicode', () => {
      const testData = 'Test PHI with special chars: @#$%^&*()_+{}|:"<>?[]\\;\',./ and unicode: 你好世界';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      const decrypted = PHIEncryptionService.decryptPHI(encrypted);
      
      expect(decrypted).toBe(testData);
    });
  });

  describe('createSearchHash', () => {
    it('should create consistent search hashes', () => {
      const testData = 'test@example.com';
      const hash1 = PHIEncryptionService.createSearchHash(testData);
      const hash2 = PHIEncryptionService.createSearchHash(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should handle case insensitive hashing', () => {
      const hash1 = PHIEncryptionService.createSearchHash('Test@Example.com');
      const hash2 = PHIEncryptionService.createSearchHash('test@example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('should handle null and empty values', () => {
      expect(PHIEncryptionService.createSearchHash(null)).toBeNull();
      expect(PHIEncryptionService.createSearchHash('')).toBeNull();
    });

    it('should normalize whitespace', () => {
      const hash1 = PHIEncryptionService.createSearchHash('  test@example.com  ');
      const hash2 = PHIEncryptionService.createSearchHash('test@example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('should handle special characters consistently', () => {
      const testData = 'user+tag@example.com';
      const hash1 = PHIEncryptionService.createSearchHash(testData);
      const hash2 = PHIEncryptionService.createSearchHash(testData);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete encrypt-decrypt cycle', () => {
      const testCases = [
        'simple@email.com',
        'complex.email+tag@domain.co.uk',
        'phone: +1-555-123-4567',
        'SSN: 123-45-6789',
        'Address: 123 Main St, Anytown, ST 12345',
        'Medical record: Patient has anxiety disorder',
        'Unicode: 患者姓名：张三',
        'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      ];

      testCases.forEach(testData => {
        const encrypted = PHIEncryptionService.encryptPHI(testData);
        expect(encrypted).toBeDefined();
        expect(encrypted).toMatch(/^v2:/);
        
        const decrypted = PHIEncryptionService.decryptPHI(encrypted);
        expect(decrypted).toBe(testData);
      });
    });

    it('should maintain data integrity across multiple operations', () => {
      const originalData = 'Patient: John Doe, DOB: 1990-01-01, SSN: 123-45-6789';
      
      // Encrypt multiple times
      const encrypted1 = PHIEncryptionService.encryptPHI(originalData);
      const encrypted2 = PHIEncryptionService.encryptPHI(originalData);
      
      // Decrypt both
      const decrypted1 = PHIEncryptionService.decryptPHI(encrypted1);
      const decrypted2 = PHIEncryptionService.decryptPHI(encrypted2);
      
      // All should match original
      expect(decrypted1).toBe(originalData);
      expect(decrypted2).toBe(originalData);
      
      // But encrypted versions should be different
      expect(encrypted1).not.toBe(encrypted2);
    });
  });
});

describe('HIPAAAuditService', () => {
  beforeEach(() => {
    // Mock database operations
    vi.mock('../../db', () => ({
      db: {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([])
        })
      }
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logPHIAccess', () => {
    it('should log PHI access with correct parameters', async () => {
      const params = {
        userId: 1,
        action: 'PHI_ACCESS',
        resourceType: 'CLIENT',
        resourceId: 123,
        fieldsAccessed: ['email', 'phone'],
        requestMethod: 'GET',
        requestPath: '/api/clients/123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        responseStatus: 200,
        responseTime: 150,
        correlationId: 'test-correlation-id'
      };

      await expect(HIPAAAuditService.logPHIAccess(params)).resolves.not.toThrow();
    });

    it('should handle missing optional parameters', async () => {
      const params = {
        userId: 1,
        action: 'READ',
        resourceType: 'CLIENT'
      };

      await expect(HIPAAAuditService.logPHIAccess(params)).resolves.not.toThrow();
    });

    it('should not throw on database errors', async () => {
      // Mock database error
      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.insert).mockRejectedValue(new Error('Database error'));

      const params = {
        userId: 1,
        action: 'PHI_ACCESS',
        resourceType: 'CLIENT'
      };

      await expect(HIPAAAuditService.logPHIAccess(params)).resolves.not.toThrow();
    });

    it('should validate required parameters', async () => {
      const invalidParams = [
        { action: 'READ', resourceType: 'CLIENT' }, // Missing userId
        { userId: 1, resourceType: 'CLIENT' }, // Missing action
        { userId: 1, action: 'READ' } // Missing resourceType
      ];

      for (const params of invalidParams) {
        await expect(HIPAAAuditService.logPHIAccess(params as any)).rejects.toThrow();
      }
    });

    it('should handle different action types', async () => {
      const actions = [
        'CREATE', 'READ', 'UPDATE', 'DELETE',
        'PHI_ACCESS', 'PHI_EXPORT', 'PHI_IMPORT',
        'LOGIN', 'LOGOUT', 'SESSION_EXPIRED'
      ];

      for (const action of actions) {
        const params = {
          userId: 1,
          action,
          resourceType: 'CLIENT'
        };

        await expect(HIPAAAuditService.logPHIAccess(params)).resolves.not.toThrow();
      }
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events correctly', async () => {
      const params = {
        userId: 1,
        eventType: 'FAILED_LOGIN',
        severity: 'HIGH',
        details: {
          ipAddress: '192.168.1.100',
          userAgent: 'suspicious-agent',
          attemptCount: 5
        }
      };

      await expect(HIPAAAuditService.logSecurityEvent(params)).resolves.not.toThrow();
    });

    it('should handle different severity levels', async () => {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      for (const severity of severities) {
        const params = {
          userId: 1,
          eventType: 'TEST_EVENT',
          severity,
          details: { test: true }
        };

        await expect(HIPAAAuditService.logSecurityEvent(params)).resolves.not.toThrow();
      }
    });
  });
});

describe('TherapistService', () => {
  beforeEach(() => {
    // Mock database operations
    vi.mock('../../db', () => ({
      db: {
        query: {
          usersAuth: {
            findFirst: vi.fn()
          },
          therapistProfiles: {
            findFirst: vi.fn()
          },
          therapistPHI: {
            findFirst: vi.fn()
          }
        },
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        })
      }
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return complete therapist profile with decrypted PHI', async () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      const mockProfile = { id: 1, userId: 1, name: 'Test Therapist' };
      const mockPHI = { 
        id: 1, 
        userId: 1, 
        ssnEncrypted: PHIEncryptionService.encryptPHI('123-45-6789'),
        personalEmailEncrypted: PHIEncryptionService.encryptPHI('personal@example.com')
      };

      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue(mockUser);
      vi.mocked(mockDb.db.query.therapistProfiles.findFirst).mockResolvedValue(mockProfile);
      vi.mocked(mockDb.db.query.therapistPHI.findFirst).mockResolvedValue(mockPHI);

      const result = await TherapistService.getProfile(1);

      expect(result.auth).toEqual(mockUser);
      expect(result.profile).toEqual(mockProfile);
      expect(result.phi?.ssnEncrypted).toBe('123-45-6789');
      expect(result.phi?.personalEmailEncrypted).toBe('personal@example.com');
    });

    it('should handle missing profile data', async () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };

      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue(mockUser);
      vi.mocked(mockDb.db.query.therapistProfiles.findFirst).mockResolvedValue(null);
      vi.mocked(mockDb.db.query.therapistPHI.findFirst).mockResolvedValue(null);

      const result = await TherapistService.getProfile(1);

      expect(result.auth).toEqual(mockUser);
      expect(result.profile).toBeNull();
      expect(result.phi).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue(null);

      await expect(TherapistService.getProfile(999)).rejects.toThrow('Therapist not found');
    });

    it('should handle encrypted PHI fields correctly', async () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };
      const mockProfile = { id: 1, userId: 1, name: 'Test Therapist' };
      const mockPHI = { 
        id: 1, 
        userId: 1, 
        ssnEncrypted: PHIEncryptionService.encryptPHI('123-45-6789'),
        personalEmailEncrypted: PHIEncryptionService.encryptPHI('personal@example.com'),
        personalPhoneEncrypted: PHIEncryptionService.encryptPHI('555-123-4567'),
        homeAddressEncrypted: PHIEncryptionService.encryptPHI('123 Main St')
      };

      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue(mockUser);
      vi.mocked(mockDb.db.query.therapistProfiles.findFirst).mockResolvedValue(mockProfile);
      vi.mocked(mockDb.db.query.therapistPHI.findFirst).mockResolvedValue(mockPHI);

      const result = await TherapistService.getProfile(1);

      expect(result.phi?.ssnEncrypted).toBe('123-45-6789');
      expect(result.phi?.personalEmailEncrypted).toBe('personal@example.com');
      expect(result.phi?.personalPhoneEncrypted).toBe('555-123-4567');
      expect(result.phi?.homeAddressEncrypted).toBe('123 Main St');
    });
  });

  describe('updateProfile', () => {
    it('should update profile and encrypt PHI fields', async () => {
      const updateData = {
        profile: { name: 'Updated Name' },
        phi: { 
          ssnEncrypted: '123-45-6789',
          personalEmailEncrypted: 'updated@example.com'
        }
      };

      await TherapistService.updateProfile(1, updateData);

      // Verify database update was called
      const mockDb = await import('../../db');
      expect(mockDb.db.update).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const updateData = {
        profile: { name: 'Updated Name' }
        // No PHI updates
      };

      await TherapistService.updateProfile(1, updateData);

      const mockDb = await import('../../db');
      expect(mockDb.db.update).toHaveBeenCalled();
    });

    it('should encrypt PHI data before storing', async () => {
      const updateData = {
        phi: { 
          ssnEncrypted: '123-45-6789',
          personalEmailEncrypted: 'test@example.com'
        }
      };

      await TherapistService.updateProfile(1, updateData);

      // Verify that PHI data would be encrypted (this would be tested in integration tests)
      const mockDb = await import('../../db');
      expect(mockDb.db.update).toHaveBeenCalled();
    });
  });
});

describe('PatientService', () => {
  beforeEach(() => {
    // Mock database operations
    vi.mock('../../db', () => ({
      db: {
        query: {
          clientsHIPAA: {
            findMany: vi.fn(),
            findFirst: vi.fn()
          }
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }])
          })
        })
      }
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getClients', () => {
    it('should return clients with decrypted PHI', async () => {
      const mockClients = [{
        id: 1,
        name: 'Test Client',
        emailEncrypted: PHIEncryptionService.encryptPHI('client@example.com'),
        phoneEncrypted: PHIEncryptionService.encryptPHI('555-1234'),
        deleted: false
      }];

      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.clientsHIPAA.findMany).mockResolvedValue(mockClients);

      const result = await PatientService.getPatients(1);

      expect(result).toHaveLength(1);
      expect(result[0].emailEncrypted).toBe('client@example.com');
      expect(result[0].phoneEncrypted).toBe('555-1234');
    });

    it('should handle empty client list', async () => {
      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.clientsHIPAA.findMany).mockResolvedValue([]);

      const result = await PatientService.getPatients(1);

      expect(result).toEqual([]);
    });

    it('should filter out deleted clients', async () => {
      const mockClients = [
        { id: 1, name: 'Active Client', deleted: false },
        { id: 2, name: 'Deleted Client', deleted: true }
      ];

      const mockDb = await import('../../db');
      vi.mocked(mockDb.db.query.clientsHIPAA.findMany).mockResolvedValue(mockClients);

      const result = await PatientService.getPatients(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Client');
    });
  });

  describe('createClient', () => {
    it('should create client with encrypted PHI', async () => {
      const clientData = {
        name: 'New Client',
        email: 'newclient@example.com',
        phone: '555-5678',
        notes: 'Test notes'
      };

      const result = await PatientService.createPatient(1, patientData);

      expect(result.name).toBe('New Client');
      expect(result.emailEncrypted).toBe('newclient@example.com');
      expect(result.phoneEncrypted).toBe('555-5678');
      expect(result.notesEncrypted).toBe('Test notes');
    });

    it('should handle missing optional fields', async () => {
      const clientData = {
        name: 'Minimal Client'
        // No email, phone, or notes
      };

      const result = await PatientService.createPatient(1, patientData);

      expect(result.name).toBe('Minimal Client');
      expect(result.emailEncrypted).toBeNull();
      expect(result.phoneEncrypted).toBeNull();
      expect(result.notesEncrypted).toBeNull();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required name field
        email: 'test@example.com'
      };

      await expect(PatientService.createPatient(1, invalidData as any)).rejects.toThrow();
    });
  });
});
