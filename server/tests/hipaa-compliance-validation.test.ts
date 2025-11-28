import crypto from 'crypto';

describe('HIPAA Compliance Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Encryption Key Requirements', () => {
    it('should fail to start without PHI_ENCRYPTION_KEY', () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      
      expect(() => {
        // Clear module cache to force re-import
        delete require.cache[require.resolve('../utils/phi-encryption')];
        require('../utils/phi-encryption');
      }).toThrow();
    });

    it('should fail to start with invalid key length', () => {
      process.env.PHI_ENCRYPTION_KEY = 'invalid-key-length';
      
      expect(() => {
        delete require.cache[require.resolve('../utils/phi-encryption')];
        require('../utils/phi-encryption');
      }).toThrow();
    });

    it('should start successfully with valid key', () => {
      process.env.PHI_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      
      expect(() => {
        delete require.cache[require.resolve('../utils/phi-encryption')];
        require('../utils/phi-encryption');
      }).not.toThrow();
    });
  });

  describe('PHI Encryption Functions', () => {
    beforeEach(() => {
      process.env.PHI_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      // Clear module cache
      delete require.cache[require.resolve('../utils/phi-encryption')];
    });

    it('should not return plaintext when encryption fails', () => {
      const { encryptPHI } = require('../utils/phi-encryption');
      
      // Temporarily remove key
      delete process.env.PHI_ENCRYPTION_KEY;
      
      expect(() => encryptPHI('sensitive data')).toThrow('CRITICAL: PHI_ENCRYPTION_KEY is required');
    });

    it('should encrypt and decrypt PHI correctly', () => {
      const { encryptPHI, decryptPHI } = require('../utils/phi-encryption');
      const plaintext = 'Patient SSN: 123-45-6789';
      
      const encrypted = encryptPHI(plaintext);
      expect(encrypted).not.toContain('123-45-6789');
      expect(encrypted).toMatch(/^v1:[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/);
      
      const decrypted = decryptPHI(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle null and empty values correctly', () => {
      const { encryptPHI, decryptPHI } = require('../utils/phi-encryption');
      
      expect(encryptPHI(null)).toBeNull();
      expect(encryptPHI('')).toBeNull();
      expect(encryptPHI('   ')).toBeNull();
      
      expect(decryptPHI(null)).toBeNull();
      expect(decryptPHI('')).toBeNull();
      expect(decryptPHI('   ')).toBeNull();
    });

    it('should fail decryption with invalid ciphertext', () => {
      const { decryptPHI } = require('../utils/phi-encryption');
      
      expect(() => decryptPHI('invalid-ciphertext')).toThrow('Invalid ciphertext format');
      expect(() => decryptPHI('v1:invalid')).toThrow('Invalid ciphertext format');
    });

    it('should fail decryption without encryption key', () => {
      const { decryptPHI } = require('../utils/phi-encryption');
      const validCiphertext = 'v1:1234567890abcdef1234567890abcdef:1234567890abcdef1234567890abcdef:encrypteddata';
      
      // Remove key
      delete process.env.PHI_ENCRYPTION_KEY;
      
      expect(() => decryptPHI(validCiphertext)).toThrow('CRITICAL: PHI_ENCRYPTION_KEY is required');
    });
  });

  describe('Key Manager', () => {
    beforeEach(() => {
      // Clear module cache
      delete require.cache[require.resolve('../utils/key-management')];
    });

    it('should require environment variable for key initialization', () => {
      delete process.env.PHI_ENCRYPTION_KEY;
      
      const { KeyManager } = require('../utils/key-management');
      
      expect(() => KeyManager.initializeKey()).toThrow('PHI_ENCRYPTION_KEY environment variable is required');
    });

    it('should validate key length', () => {
      process.env.PHI_ENCRYPTION_KEY = 'invalid-length';
      
      const { KeyManager } = require('../utils/key-management');
      
      expect(() => KeyManager.initializeKey()).toThrow('PHI_ENCRYPTION_KEY must be 64 hex characters');
    });

    it('should initialize successfully with valid key', () => {
      process.env.PHI_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      
      const { KeyManager } = require('../utils/key-management');
      
      expect(() => KeyManager.initializeKey()).not.toThrow();
      expect(KeyManager.validateCurrentKey()).toBe(true);
    });

    it('should not allow key generation in production', () => {
      process.env.NODE_ENV = 'production';
      
      const { KeyManager } = require('../utils/key-management');
      
      expect(() => KeyManager.generateNewKey()).toThrow('Key generation not allowed in production environment');
    });
  });

  describe('Search Hash Function', () => {
    beforeEach(() => {
      process.env.PHI_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      delete require.cache[require.resolve('../utils/phi-encryption')];
    });

    it('should create consistent search hashes', () => {
      const { createSearchHash } = require('../utils/phi-encryption');
      
      const email1 = 'test@example.com';
      const email2 = 'TEST@EXAMPLE.COM';
      const email3 = ' test@example.com ';
      
      const hash1 = createSearchHash(email1);
      const hash2 = createSearchHash(email2);
      const hash3 = createSearchHash(email3);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle null and empty values', () => {
      const { createSearchHash } = require('../utils/phi-encryption');
      
      expect(createSearchHash(null)).toBeNull();
      expect(createSearchHash('')).toBeNull();
      expect(createSearchHash('   ')).toBeNull();
    });
  });

  describe('Encryption Validation', () => {
    beforeEach(() => {
      process.env.PHI_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      delete require.cache[require.resolve('../utils/phi-encryption')];
    });

    it('should validate encryption system on module load', () => {
      // This test verifies that the module validates itself on import
      expect(() => {
        delete require.cache[require.resolve('../utils/phi-encryption')];
        require('../utils/phi-encryption');
      }).not.toThrow();
    });

    it('should fail validation with invalid key', () => {
      process.env.PHI_ENCRYPTION_KEY = 'invalid-key';
      
      expect(() => {
        delete require.cache[require.resolve('../utils/phi-encryption')];
        require('../utils/phi-encryption');
      }).toThrow();
    });
  });
});
