import {
  validateAndNormalizePath,
  validatePathIdentifier,
  safePathJoin,
  safeFileExists,
  getAllowedBaseDirs,
} from '../path-security';
import path from 'path';
import fs from 'fs';

describe('Path Security', () => {
  const testBaseDirs = getAllowedBaseDirs();

  describe('validateAndNormalizePath', () => {
    it('should accept valid paths within allowed directory', () => {
      const result = validateAndNormalizePath('test.txt', 'uploads');
      expect(result).toContain('uploads');
      expect(result).toContain('test.txt');
    });

    it('should reject path traversal with ..', () => {
      expect(() => {
        validateAndNormalizePath('../../../etc/passwd', 'uploads');
      }).toThrow('Path traversal detected');
    });

    it('should reject absolute paths outside allowed directory', () => {
      expect(() => {
        validateAndNormalizePath('/etc/passwd', 'uploads');
      }).toThrow('Path traversal detected');
    });

    it('should reject paths with null bytes', () => {
      expect(() => {
        validateAndNormalizePath('test\0.txt', 'uploads');
      }).toThrow('null bytes not allowed');
    });

    it('should reject hidden files', () => {
      expect(() => {
        validateAndNormalizePath('.hidden', 'uploads');
      }).toThrow('hidden files not allowed');
    });

    it('should reject backup files', () => {
      expect(() => {
        validateAndNormalizePath('file.bak', 'uploads');
      }).toThrow('suspicious pattern');
    });

    it('should reject paths with .. in filename', () => {
      expect(() => {
        validateAndNormalizePath('file..txt', 'uploads');
      }).toThrow('suspicious pattern');
    });

    it('should handle nested subdirectories correctly', () => {
      const result = validateAndNormalizePath('user/123/file.txt', 'uploads');
      expect(result).toContain('uploads');
      expect(result).toContain('user');
      expect(result).toContain('123');
      expect(result).toContain('file.txt');
    });

    it('should reject invalid base directory', () => {
      expect(() => {
        validateAndNormalizePath('test.txt', 'invalid' as any);
      }).toThrow('Invalid base directory type');
    });

    it('should reject empty path', () => {
      expect(() => {
        validateAndNormalizePath('', 'uploads');
      }).toThrow('must be a non-empty string');
    });

    it('should reject non-string path', () => {
      expect(() => {
        validateAndNormalizePath(null as any, 'uploads');
      }).toThrow('must be a non-empty string');
    });
  });

  describe('validatePathIdentifier', () => {
    it('should accept valid alphanumeric identifiers', () => {
      expect(validatePathIdentifier('user123')).toBe('user123');
      expect(validatePathIdentifier('abc-def_123')).toBe('abc-def_123');
    });

    it('should accept numeric identifiers', () => {
      expect(validatePathIdentifier(12345)).toBe('12345');
    });

    it('should reject identifiers with special characters', () => {
      expect(() => {
        validatePathIdentifier('user/../admin');
      }).toThrow('only alphanumeric');
    });

    it('should reject identifiers with slashes', () => {
      expect(() => {
        validatePathIdentifier('user/admin');
      }).toThrow('only alphanumeric');
    });

    it('should reject identifiers with null bytes', () => {
      expect(() => {
        validatePathIdentifier('user\0admin');
      }).toThrow('only alphanumeric');
    });

    it('should reject excessively long identifiers', () => {
      const longId = 'a'.repeat(101);
      expect(() => {
        validatePathIdentifier(longId);
      }).toThrow('too long');
    });
  });

  describe('safePathJoin', () => {
    it('should join paths safely', () => {
      const result = safePathJoin('uploads', 'user', '123', 'file.txt');
      expect(result).toContain('uploads');
      expect(result).toContain('user');
      expect(result).toContain('123');
      expect(result).toContain('file.txt');
    });

    it('should reject segments with ..', () => {
      expect(() => {
        safePathJoin('uploads', '..', 'etc', 'passwd');
      }).toThrow('Invalid path segment');
    });

    it('should reject absolute path segments', () => {
      expect(() => {
        safePathJoin('uploads', '/etc/passwd');
      }).toThrow('Invalid path segment');
    });

    it('should reject segments with null bytes', () => {
      expect(() => {
        safePathJoin('uploads', 'user\0admin');
      }).toThrow('Invalid path segment');
    });
  });

  describe('safeFileExists', () => {
    it('should return false for paths outside allowed directory', () => {
      const result = safeFileExists('/etc/passwd', 'uploads');
      expect(result).toBe(false);
    });

    it('should return false for path traversal attempts', () => {
      const result = safeFileExists('../../../etc/passwd', 'uploads');
      expect(result).toBe(false);
    });

    it('should return false for non-existent files', () => {
      const result = safeFileExists('nonexistent-file.txt', 'uploads');
      expect(result).toBe(false);
    });
  });

  describe('getAllowedBaseDirs', () => {
    it('should return all allowed base directories', () => {
      const dirs = getAllowedBaseDirs();
      expect(dirs).toHaveProperty('uploads');
      expect(dirs).toHaveProperty('temp');
      expect(dirs).toHaveProperty('storage');
      expect(dirs).toHaveProperty('encrypted');
    });

    it('should return absolute paths', () => {
      const dirs = getAllowedBaseDirs();
      Object.values(dirs).forEach(dir => {
        expect(path.isAbsolute(dir)).toBe(true);
      });
    });
  });

  describe('Real-world attack scenarios', () => {
    it('should prevent reading /etc/passwd', () => {
      expect(() => {
        validateAndNormalizePath('/etc/passwd', 'uploads');
      }).toThrow();
    });

    it('should prevent reading sensitive files via path traversal', () => {
      expect(() => {
        validateAndNormalizePath('../../../.env', 'uploads');
      }).toThrow();
    });

    it('should prevent reading files via URL encoding', () => {
      expect(() => {
        validateAndNormalizePath('..%2F..%2F..%2Fetc%2Fpasswd', 'uploads');
      }).toThrow();
    });

    it('should prevent symlink attacks by checking final path', () => {
      expect(() => {
        // Even if a symlink exists, the final resolved path must be in allowed dir
        validateAndNormalizePath('/tmp/sensitive-data', 'uploads');
      }).toThrow();
    });

    it('should prevent null byte injection', () => {
      expect(() => {
        validateAndNormalizePath('safe.txt\0../../etc/passwd', 'uploads');
      }).toThrow();
    });
  });
});

