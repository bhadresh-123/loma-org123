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
import patientRoutes from '../../routes/patients';
import treatmentPlanRoutes from '../../routes/patient-treatment-plans';

const app = express();
app.use(express.json());
app.use('/api/patients', patientRoutes);
app.use('/api/patients/:patientId/treatment-plans', treatmentPlanRoutes);

describe('Client Treatment Flow', () => {
  let testPatientId: number;

  beforeAll(async () => {
    const [client] = await db.insert(patientsTable).values({
      name: 'Test Client',
      email: 'test@example.com',
      phone: '555-0123',
      status: 'active',
      type: 'individual',
      billingType: 'private_pay'
    }).returning();

    testPatientId = client.id;
  });

  afterAll(async () => {
    if (testPatientId) {
      await db.delete(patientTreatmentPlansTable).where(eq(patientTreatmentPlansTable.patientId, testPatientId));
      await db.delete(patientsTable).where(eq(patientsTable.id, testPatientId));
    }
  });

  describe('Treatment Plan Management', () => {
    it('should handle the complete treatment plan flow', async () => {
      // Create initial version
      const initialPlanResponse = await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send({ content: 'Initial treatment plan content' })
        .expect(201);

      expect(initialPlanResponse.body).toMatchObject({
        patientId: testPatientId,
        content: 'Initial treatment plan content',
        version: 1
      });

      // Create updated version
      const updatedPlanResponse = await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send({ content: 'Updated treatment plan content' })
        .expect(201);

      expect(updatedPlanResponse.body).toMatchObject({
        patientId: testPatientId,
        content: 'Updated treatment plan content',
        version: 2
      });

      // Verify treatment plan history
      const plansResponse = await request(app)
        .get(`/api/patients/${testPatientId}/treatment-plans`)
        .expect(200);

      expect(Array.isArray(plansResponse.body)).toBe(true);
      expect(plansResponse.body).toHaveLength(2);
      expect(plansResponse.body[0].version).toBe(2); // Latest version first
      expect(plansResponse.body[1].version).toBe(1);
    });

    it('should handle errors appropriately', async () => {
      // Test invalid treatment plan
      await request(app)
        .post(`/api/patients/${testPatientId}/treatment-plans`)
        .send({ content: '' }) // Empty content should fail validation
        .expect(400);

      // Test non-existent client
      await request(app)
        .post('/api/patients/99999/treatment-plans')
        .send({ content: 'Test content' })
        .expect(404);
    });
  });
});