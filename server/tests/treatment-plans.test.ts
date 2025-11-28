import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { db } from '@db';
import { getSchemaInfo } from '@db';

// Use HIPAA schema only
import * as hipaaSchema from "@db/schema-hipaa-refactored";
const usersTable = hipaaSchema.usersAuth;
const patientsTable = hipaaSchema.patients;
const clinicalSessionsTable = hipaaSchema.clinicalSessions;
const patientTreatmentPlansTable = hipaaSchema.patientTreatmentPlans;

import { eq } from 'drizzle-orm';
import patientRoutes from '../routes/patients';

const app = express();
app.use(express.json());
app.use('/api/patients', patientRoutes);

describe('Treatment Plans API', () => {
  const testPatientId = 109;

  // Clean up test data after all tests
  afterAll(async () => {
    await db.delete(patientTreatmentPlansTable)
      .where(eq(patientTreatmentPlansTable.patientId, testPatientId));
  });

  describe('POST /api/patients/:patientId/treatment-plans', () => {
    it('should create a new treatment plan', async () => {
      const planData = {
        content: 'Test treatment plan content',
        goals: 'Test treatment goals'
      };

      const response = await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send(planData)
        .expect(201);

      expect(response.body).toMatchObject({
        patientId: testPatientId,
        content: planData.content,
        goals: expect.objectContaining({
          text: planData.goals,
          created: expect.any(String)
        }),
        version: 1,
        status: 'active'
      });
    });

    it('should reject creation for non-existent client', async () => {
      const nonExistentClientId = 99999;
      const planData = {
        content: 'Test content',
        goals: 'Test goals'
      };

      const response = await request(app)
        .post(`/api/patients/${nonExistentClientId}/treatment-plans`)
        .send(planData)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: 'Client not found'
      });
    });

    it('should reject creation without required fields', async () => {
      const response = await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send({ content: 'Test content' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: expect.stringContaining('required')
      });
    });

    it('should increment version number for subsequent plans', async () => {
      const planData = {
        content: 'Updated treatment plan',
        goals: 'Updated goals'
      };

      const response = await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send(planData)
        .expect(201);

      expect(response.body.version).toBe(2);
    });

    it('should properly format and validate goals', async () => {
      const planData = {
        content: 'Test plan with goals',
        goals: 'Specific treatment goals'
      };

      const response = await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send(planData)
        .expect(201);

      expect(response.body.goals).toMatchObject({
        text: planData.goals,
        created: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      });
    });
  });

  describe('GET /api/patients/:patientId/treatment-plans', () => {
    it('should retrieve all treatment plans for a client', async () => {
      const response = await request(app)
        .get(`/api/patients/${testPatientId}/treatment-plans`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toMatchObject({
        patientId: testPatientId,
        content: expect.any(String),
        goals: expect.objectContaining({
          text: expect.any(String),
          created: expect.any(String)
        }),
        version: expect.any(Number)
      });
    });

    it('should return plans in descending version order', async () => {
      const response = await request(app)
        .get(`/api/patients/${testPatientId}/treatment-plans`)
        .expect(200);

      const versions = response.body.map((plan: { version: number }) => plan.version);
      expect(versions).toEqual([...versions].sort((a, b) => b - a));
    });

    it('should handle non-existent client ID', async () => {
      const nonExistentClientId = 99999;
      const response = await request(app)
        .get(`/api/patients/${nonExistentClientId}/treatment-plans`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'NOT_FOUND',
        message: 'Client not found'
      });
    });
  });
});