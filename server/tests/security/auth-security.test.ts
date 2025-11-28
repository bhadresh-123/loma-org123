import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '@db';
import { getSchemaInfo } from '@db';

// Use HIPAA schema only
import * as hipaaSchema from "@db/schema-hipaa-refactored";
const usersTable = hipaaSchema.usersAuth;
const patientsTable = hipaaSchema.patients;
const clinicalSessionsTable = hipaaSchema.clinicalSessions;
const patientTreatmentPlansTable = hipaaSchema.patientTreatmentPlans;

import { eq } from 'drizzle-orm';

describe('Authentication Security Tests', () => {
  let testUserId: number;

  beforeEach(async () => {
    const testUser = {
      username: 'security_test_user',
      password: 'SecurePass123!',
      email: 'security@test.com',
      name: 'Security Test User',
      title: 'Test Therapist'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    testUserId = response.body.user.id;
  });

  afterEach(async () => {
    if (testUserId) {
      await db.delete(usersTable).where(eq(usersTable.id, testUserId));
    }
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678',
        'password123'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: `weak_pass_test_${Date.now()}`,
            password: weakPassword,
            email: `weak${Date.now()}@test.com`,
            name: 'Weak Password Test',
            title: 'Test'
          })
          .expect(400);

        expect(response.body.error).toContain('password');
      }
    });

    it('should hash passwords securely', async () => {
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, testUserId)
      });

      expect(user?.password).not.toBe('SecurePass123!');
      expect(user?.password).toMatch(/^\$2[aby]\$\d+\$/);
    });
  });

  describe('Session Security', () => {
    it('should invalidate clinicalSessionsTable on logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'security_test_user',
          password: 'SecurePass123!'
        })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'];

      await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200);

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(401);
    });
  });

  describe('Authorization', () => {
    it('should prevent unauthorized access to protected routes', async () => {
      const protectedRoutes = [
        { method: 'get', path: '/api/patients' },
        { method: 'post', path: '/api/patients' },
        { method: 'get', path: '/api/clinicalSessionsTable' },
        { method: 'put', path: '/api/usersTable/profile' }
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)[route.method](route.path);
        expect(response.status).toBe(401);
        expect(response.body.error).toContain('AUTH_REQUIRED');
      }
    });
  });

  describe('Input Validation', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "admin'; DROP TABLE usersTable; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM usersTable --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: injection,
            password: 'any_password'
          });

        expect([400, 401]).toContain(response.status);
      }
    });
  });
});