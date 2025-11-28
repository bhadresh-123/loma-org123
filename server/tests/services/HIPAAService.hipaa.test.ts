import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PHIEncryptionService, HIPAAAuditService, TherapistService, PatientService } from '../../services/ClinicalService';

/**
 * HIPAA Service Tests
 * 
 * Comprehensive tests for HIPAA compliance functionality
 */

describe('PHIEncryptionService', () => {
  beforeEach(() => {
    // Validate test encryption key is set
    // Never hardcode encryption keys - they should come from .env.test or CI/CD secrets
    if (!process.env.PHI_ENCRYPTION_KEY) {
      throw new Error('PHI_ENCRYPTION_KEY environment variable must be set for tests');
    }
  });

  describe('encryptPHI', () => {
    it('should encrypt PHI data correctly', () => {
      const testData = 'Test PHI data';
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(encrypted).toMatch(/^v2:/);
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

    it('should throw error for invalid ciphertext', () => {
      expect(() => {
        PHIEncryptionService.decryptPHI('invalid-ciphertext');
      }).toThrow();
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
  });
});

describe('HIPAAAuditService', () => {
  beforeEach(() => {
    // Mock database operations
    vi.mock('@db', () => ({
      db: {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([])
        })
      }
    }));
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
        requestPath: '/api/patients/123',
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
      vi.mocked(require('@db').db.insert).mockRejectedValue(new Error('Database error'));

      const params = {
        userId: 1,
        action: 'PHI_ACCESS',
        resourceType: 'CLIENT'
      };

      await expect(HIPAAAuditService.logPHIAccess(params)).resolves.not.toThrow();
    });
  });
});

describe('TherapistService', () => {
  beforeEach(() => {
    // Mock database operations
    vi.mock('@db', () => ({
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

      vi.mocked(require('@db').db.query.usersAuth.findFirst).mockResolvedValue(mockUser);
      vi.mocked(require('@db').db.query.therapistProfiles.findFirst).mockResolvedValue(mockProfile);
      vi.mocked(require('@db').db.query.therapistPHI.findFirst).mockResolvedValue(mockPHI);

      const result = await TherapistService.getProfile(1);

      expect(result.auth).toEqual(mockUser);
      expect(result.profile).toEqual(mockProfile);
      expect(result.phi?.ssnEncrypted).toBe('123-45-6789');
      expect(result.phi?.personalEmailEncrypted).toBe('personal@example.com');
    });

    it('should handle missing profile data', async () => {
      const mockUser = { id: 1, username: 'test', email: 'test@example.com' };

      vi.mocked(require('@db').db.query.usersAuth.findFirst).mockResolvedValue(mockUser);
      vi.mocked(require('@db').db.query.therapistProfiles.findFirst).mockResolvedValue(null);
      vi.mocked(require('@db').db.query.therapistPHI.findFirst).mockResolvedValue(null);

      const result = await TherapistService.getProfile(1);

      expect(result.auth).toEqual(mockUser);
      expect(result.profile).toBeNull();
      expect(result.phi).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      vi.mocked(require('@db').db.query.usersAuth.findFirst).mockResolvedValue(null);

      await expect(TherapistService.getProfile(999)).rejects.toThrow('Therapist not found');
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
      expect(require('@db').db.update).toHaveBeenCalled();
    });
  });
});

describe('PatientService', () => {
  beforeEach(() => {
    // Mock database operations
    vi.mock('@db', () => ({
      db: {
        query: {
          patients: {
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

  describe('getClients', () => {
    it('should return clients with decrypted PHI', async () => {
      const mockClients = [{
        id: 1,
        name: 'Test Client',
        emailEncrypted: PHIEncryptionService.encryptPHI('client@example.com'),
        phoneEncrypted: PHIEncryptionService.encryptPHI('555-1234'),
        deleted: false
      }];

      vi.mocked(require('@db').db.query.patients.findMany).mockResolvedValue(mockClients);

      const result = await PatientService.getPatients(1);

      expect(result).toHaveLength(1);
      expect(result[0].emailEncrypted).toBe('client@example.com');
      expect(result[0].phoneEncrypted).toBe('555-1234');
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
  });
});
