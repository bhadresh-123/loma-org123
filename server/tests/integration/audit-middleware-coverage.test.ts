/**
 * Audit Middleware Coverage Integration Tests
 * 
 * Verifies that audit logging middleware is properly wired to all PHI routes
 * and that audit events are correctly logged to the audit_logs_hipaa table.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { db } from '../../../db';
import { getActiveSchema } from '../../../db';
import { sql } from 'drizzle-orm';
import { registerRoutes } from '../../routes';
import { setupAuth } from '../../auth-simple';

describe('Audit Middleware Coverage', () => {
  let app: Express;
  let authToken: string;
  let userId: number;
  let organizationId: number;

  beforeAll(async () => {
    // Set up Express app with all routes
    app = express();
    app.use(express.json());
    setupAuth(app);
    registerRoutes(app);

    // Create test user and get auth token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: `audit_test_${Date.now()}`,
        password: 'TestPassword123!@#$',
        email: `audit_test_${Date.now()}@test.com`,
        name: 'Audit Test User',
        practiceName: 'Test Practice'
      });

    if (registerRes.status === 201) {
      authToken = registerRes.body.token;
      userId = registerRes.body.user.id;
      organizationId = registerRes.body.organization.id;
    }
  });

  beforeEach(async () => {
    // Clear audit logs before each test
    const schema = getActiveSchema();
    if (schema.auditLogsHipaa && db) {
      await db.delete(schema.auditLogsHipaa);
    }
  });

  describe('Patient Routes Audit Logging', () => {
    it('should log GET /api/patients audit event', async () => {
      await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          expect([200, 401, 403]).toContain(res.status);
        });

      // Verify audit log was created
      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'READ' AND resource_type = 'PATIENT'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
        expect(auditLogs[0].userId).toBe(userId);
      }
    });

    it('should log POST /api/patients audit event', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Patient',
          organizationId,
          primaryTherapistId: userId
        });

      // Verify audit log
      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'CREATE' AND resource_type = 'PATIENT'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Clinical Session Routes Audit Logging', () => {
    it('should log GET /api/clinical-sessions audit event', async () => {
      await request(app)
        .get('/api/clinical-sessions')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'READ' AND resource_type = 'CLINICAL_SESSION'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Document Routes Audit Logging', () => {
    it('should log GET /api/documents audit event', async () => {
      await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'READ' AND resource_type = 'DOCUMENT'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Treatment Plan Routes Audit Logging', () => {
    it('should log GET /api/patient-treatment-plans audit event', async () => {
      await request(app)
        .get('/api/patient-treatment-plans')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'READ' AND resource_type = 'TREATMENT_PLAN'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Therapist PHI Routes Audit Logging', () => {
    it('should log GET /api/therapists audit event', async () => {
      await request(app)
        .get('/api/therapists')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'READ' AND resource_type = 'THERAPIST_PHI'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Invoice Routes Audit Logging', () => {
    it('should log GET /api/invoices audit event', async () => {
      await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .where(sql`action = 'READ' AND resource_type = 'INVOICE'`)
          .limit(1);

        expect(auditLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Audit Log Data Integrity', () => {
    it('should include correlation ID in audit logs', async () => {
      await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .limit(1);

        expect(auditLogs[0].correlationId).toBeDefined();
        expect(auditLogs[0].correlationId).toMatch(/^[a-f0-9-]+$/);
      }
    });

    it('should include IP address and user agent', async () => {
      await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', 'Test Agent');

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .limit(1);

        expect(auditLogs[0].ipAddress).toBeDefined();
        expect(auditLogs[0].userAgent).toContain('Test Agent');
      }
    });

    it('should calculate risk score for PHI access', async () => {
      await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`);

      const schema = getActiveSchema();
      if (schema.auditLogsHipaa && db) {
        const auditLogs = await db
          .select()
          .from(schema.auditLogsHipaa)
          .limit(1);

        expect(auditLogs[0].riskScore).toBeGreaterThanOrEqual(0);
        expect(auditLogs[0].riskScore).toBeLessThanOrEqual(100);
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    const schema = getActiveSchema();
    if (schema.auditLogsHipaa && db) {
      await db.delete(schema.auditLogsHipaa);
    }
  });
});

