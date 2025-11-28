import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCloudStorage } from '../../services/CloudStorageService';
import { storeFile, retrieveFile, deleteFile, fileExists } from '../../utils/file-storage';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('R2 Cloud Storage Integration', () => {
  const testDir = path.join(process.cwd(), 'uploads', 'test');
  let testFilePath: string;
  let testKey: string;

  beforeAll(async () => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test file
    testFilePath = path.join(testDir, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Test content for R2 storage');
    testKey = `test/integration/${crypto.randomBytes(8).toString('hex')}.txt`;
  });

  afterAll(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // Clean up from R2 if uploaded
    try {
      await deleteFile(testKey);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('CloudStorageService', () => {
    it('should initialize R2 client', () => {
      const cloudStorage = getCloudStorage();
      expect(cloudStorage).toBeDefined();
    });

    it('should report availability status', () => {
      const cloudStorage = getCloudStorage();
      const isAvailable = cloudStorage.available();
      
      // R2 may or may not be configured in test environment
      expect(typeof isAvailable).toBe('boolean');
      
      if (!isAvailable) {
        console.log('ℹ️ R2 not configured - tests will use local fallback');
      }
    });

    it('should perform health check', async () => {
      const cloudStorage = getCloudStorage();
      const health = await cloudStorage.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('message');
      expect(typeof health.healthy).toBe('boolean');
    });
  });

  describe('File Storage Abstraction', () => {
    it('should store file with encryption', async () => {
      const result = await storeFile(testFilePath, testKey, {
        encrypt: true,
        mimeType: 'text/plain',
        metadata: {
          test: 'true',
          source: 'integration-test',
        },
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.encrypted).toBe(true);
      expect(result.metadata?.location).toMatch(/^(cloud|local)$/);
      
      console.log(`✅ File stored in: ${result.metadata?.location}`);
    });

    it('should check if file exists', async () => {
      const result = await fileExists(testKey);
      
      expect(result.exists).toBe(true);
      expect(result.location).toMatch(/^(cloud|local)$/);
    });

    it('should retrieve and decrypt file', async () => {
      const result = await retrieveFile(testKey, { decrypt: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        const content = result.data.toString('utf-8');
        expect(content).toBe('Test content for R2 storage');
      }
    });

    it('should delete file', async () => {
      const result = await deleteFile(testKey);
      
      expect(result.success).toBe(true);
      
      // Verify deletion
      const existsResult = await fileExists(testKey);
      expect(existsResult.exists).toBe(false);
    });

    it('should handle non-existent file gracefully', async () => {
      const nonExistentKey = 'test/does-not-exist.txt';
      const result = await retrieveFile(nonExistentKey);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Automatic Fallback', () => {
    it('should fallback to local storage if R2 unavailable', async () => {
      // This test verifies the fallback behavior
      // If R2 is not configured, file-storage should still work via local storage
      
      const cloudStorage = getCloudStorage();
      const isR2Available = cloudStorage.available();
      
      if (!isR2Available) {
        // R2 not configured, should use local fallback
        const fallbackKey = `test/fallback/${crypto.randomBytes(8).toString('hex')}.txt`;
        const fallbackFile = path.join(testDir, 'fallback-test.txt');
        fs.writeFileSync(fallbackFile, 'Fallback test content');
        
        const storeResult = await storeFile(fallbackFile, fallbackKey, {
          encrypt: false,
          mimeType: 'text/plain',
        });
        
        expect(storeResult.success).toBe(true);
        expect(storeResult.metadata?.location).toBe('local');
        
        // Clean up
        fs.unlinkSync(fallbackFile);
        await deleteFile(fallbackKey);
      } else {
        console.log('✅ R2 is configured - fallback not tested');
      }
    });
  });
});

