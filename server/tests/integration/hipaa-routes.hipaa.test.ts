import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';

/**
 * HIPAA Route Integration Tests
 * 
 * Tests for HIPAA-compliant API routes
 */

describe('HIPAA Routes', () => {
  let authToken: string;
  let userId: number;

  beforeEach(async () => {
    // Mock authentication
    authToken = 'mock-auth-token';
    userId = 1;
  });

  describe('GET /api/hipaa/health', () => {
    it('should return HIPAA system health status', async () => {
      const response = await request(app)
        .get('/api/hipaa/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.featureFlags).toBeDefined();
      expect(response.body.encryptionEnabled).toBeDefined();
      expect(response.body.auditLoggingEnabled).toBeDefined();
    });
  });

  describe('GET /api/hipaa/status', () => {
    it('should return HIPAA compliance status', async () => {
      const response = await request(app)
        .get('/api/hipaa/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.complianceScore).toBeGreaterThan(90);
      expect(response.body.encryptionCoverage).toBe('100%');
    });
  });

  describe('GET /api/therapist-hipaa/profile', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/therapist-hipaa/profile')
        .expect(401);
    });

    it('should return therapist profile with PHI protection', async () => {
      // Mock authentication middleware
      const response = await request(app)
        .get('/api/therapist-hipaa/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.phiFieldsDecrypted).toBe(true);
    });
  });

  describe('PUT /api/therapist-hipaa/profile', () => {
    it('should encrypt PHI fields on update', async () => {
      const updateData = {
        profile: { name: 'Updated Name' },
        phi: { 
          ssnEncrypted: '123-45-6789',
          personalEmailEncrypted: 'updated@example.com'
        }
      };

      const response = await request(app)
        .put('/api/therapist-hipaa/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.phiFieldsEncrypted).toBe(true);
    });
  });

  describe('GET /api/patients', () => {
    it('should return clients with PHI protection', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.phiFieldsDecrypted).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/patients', () => {
    it('should create client with PHI encryption', async () => {
      const clientData = {
        name: 'Test Client',
        email: 'test@example.com',
        phone: '555-1234',
        notes: 'Test notes'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.phiFieldsEncrypted).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing required 'name' field
      };

      await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/clinical-sessions', () => {
    it('should return sessions with PHI protection', async () => {
      const response = await request(app)
        .get('/api/clinical-sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.phiFieldsDecrypted).toBe(true);
    });

    it('should support filtering by client', async () => {
      const response = await request(app)
        .get('/api/clinical-sessions?patientId=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/clinical-sessions', () => {
    it('should create session with PHI encryption', async () => {
      const sessionData = {
        patientId: 1,
        date: new Date().toISOString(),
        notes: 'Session notes',
        assessments: 'Assessment data'
      };

      const response = await request(app)
        .post('/api/clinical-sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.hipaaCompliant).toBe(true);
      expect(response.body.phiFieldsEncrypted).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should include HIPAA security headers', async () => {
      const response = await request(app)
        .get('/api/hipaa/health')
        .expect(200);

      expect(response.headers['x-hipaa-compliant']).toBe('true');
      expect(response.headers['x-phi-protected']).toBe('true');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('Feature Flags', () => {
    it('should respect HIPAA feature flags', async () => {
      // Test with feature flags disabled
      process.env.ENABLE_HIPAA_ROUTES = 'false';

      await request(app)
        .get('/api/therapist-hipaa/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      // Re-enable for other tests
      process.env.ENABLE_HIPAA_ROUTES = 'true';
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Mock encryption service to throw error
      const originalEncrypt = require('../../services/HIPAAService').PHIEncryptionService.encryptPHI;
      require('../../services/HIPAAService').PHIEncryptionService.encryptPHI = vi.fn().mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      const clientData = {
        name: 'Test Client',
        email: 'test@example.com'
      };

      await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(500);

      // Restore original function
      require('../../services/HIPAAService').PHIEncryptionService.encryptPHI = originalEncrypt;
    });
  });
});
