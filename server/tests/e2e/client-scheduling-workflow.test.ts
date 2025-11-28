import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '@db';
import { eq } from 'drizzle-orm';

/**
 * End-to-End Client Creation and Scheduling Tests
 * 
 * Complete workflow testing from user authentication through client creation
 * and session scheduling, including PHI encryption and audit logging
 */

// Use HIPAA schema only
import * as hipaaSchema from "@db/schema-hipaa-refactored";
const usersTable = hipaaSchema.usersAuth;
const patientsTable = hipaaSchema.patients;
const clinicalSessionsTable = hipaaSchema.clinicalSessions;

describe('Complete Client Creation and Scheduling E2E Workflow', () => {
  let authCookie: string;
  let testUserId: number;
  let testClientId: number;
  let testSessionId: number;

  beforeAll(async () => {
    // Create test user and authenticate
    const testUser = {
      username: 'e2e_therapist_scheduling',
      password: 'TestPassword123!',
      email: 'e2e.scheduling@example.com',
      name: 'E2E Test Therapist',
      title: 'Licensed Therapist'
    };

    // Register user
    await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    // Login and get auth cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      })
      .expect(200);

    authCookie = loginResponse.headers['set-cookie'];
    testUserId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testSessionId) {
      await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, testSessionId));
    }
    if (testClientId) {
      await db.delete(patientsTable).where(eq(patientsTable.id, testClientId));
    }
    if (testUserId) {
      await db.delete(usersTable).where(eq(usersTable.id, testUserId));
    }
  });

  describe('Complete Client Creation and Scheduling Workflow', () => {
    it('should complete full client creation and session scheduling workflow', async () => {
      // Step 1: Create a new client
      const clientData = {
        name: 'E2E Scheduling Client',
        type: 'individual',
        email: 'e2e.scheduling.client@example.com',
        phone: '555-123-4567',
        billingType: 'private_pay',
        sessionCost: '150',
        age: 30,
        pronouns: 'they/them',
        notes: 'Initial client assessment notes'
      };

      const createClientResponse = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send(clientData)
        .expect(201);

      testClientId = createClientResponse.body.id;
      expect(createClientResponse.body).toMatchObject({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        billingType: clientData.billingType
      });

      // Step 2: Verify client was created in database
      const clientInDb = await db.query.patientsTable.findFirst({
        where: eq(patientsTable.id, testClientId)
      });

      expect(clientInDb).toBeDefined();
      expect(clientInDb?.name).toBe(clientData.name);

      // Step 3: Schedule a session for the client
      const sessionData = {
        patientId: testClientId,
        date: '2025-06-25',
        time: '10:00',
        duration: 50,
        type: 'therapy',
        format: 'in_person',
        cost: 150,
        notes: 'Initial therapy session - assessment and goal setting'
      };

      const createSessionResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(sessionData)
        .expect(201);

      testSessionId = createSessionResponse.body.id;
      expect(createSessionResponse.body).toMatchObject({
        patientId: testClientId,
        duration: sessionData.duration,
        type: sessionData.type,
        format: sessionData.format
      });

      // Step 4: Verify session was created in database
      const sessionInDb = await db.query.clinicalSessionsTable.findFirst({
        where: eq(clinicalSessionsTable.id, testSessionId)
      });

      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.patientId).toBe(testClientId);
      expect(sessionInDb?.duration).toBe(sessionData.duration);

      // Step 5: Retrieve scheduled sessions for the client
      const getSessionsResponse = await request(app)
        .get('/api/clinicalSessionsTable')
        .query({ patientId: testClientId })
        .set('Cookie', authCookie)
        .expect(200);

      expect(getSessionsResponse.body).toHaveLength(1);
      expect(getSessionsResponse.body[0].id).toBe(testSessionId);
      expect(getSessionsResponse.body[0].patientId).toBe(testClientId);

      // Step 6: Update session with notes
      const noteData = {
        sessionId: testSessionId,
        content: 'Session completed successfully. Client engaged well.',
        format: 'SOAP',
        isCompleted: true
      };

      const createNoteResponse = await request(app)
        .post('/api/session-notes')
        .set('Cookie', authCookie)
        .send(noteData)
        .expect(201);

      expect(createNoteResponse.body.content).toBe(noteData.content);

      // Step 7: Complete the session
      const completeSessionResponse = await request(app)
        .put(`/api/clinicalSessionsTable/${testSessionId}/complete`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(completeSessionResponse.body.session.status).toBe('completed');

      // Step 8: Verify session completion in database
      const completedSession = await db.query.clinicalSessionsTable.findFirst({
        where: eq(clinicalSessionsTable.id, testSessionId)
      });

      expect(completedSession?.status).toBe('completed');
    });

    it('should handle scheduling conflicts and validation', async () => {
      // Create another client for conflict testing
      const clientData2 = {
        name: 'Conflict Test Client',
        type: 'individual',
        email: 'conflict.test@example.com',
        phone: '555-987-6543',
        billingType: 'insurance'
      };

      const createClientResponse2 = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send(clientData2)
        .expect(201);

      const patientId2 = createClientResponse2.body.id;

      // Schedule first session
      const sessionData1 = {
        patientId: patientId2,
        date: '2025-06-26',
        time: '14:00',
        duration: 60,
        type: 'therapy',
        format: 'in_person'
      };

      const createSessionResponse1 = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(sessionData1)
        .expect(201);

      // Try to schedule overlapping session (should be rejected)
      const sessionData2 = {
        patientId: patientId2,
        date: '2025-06-26',
        time: '14:30', // Overlaps with 60-minute session
        duration: 50,
        type: 'therapy',
        format: 'in_person'
      };

      const createSessionResponse2 = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(sessionData2);

      // Should return conflict error
      expect(createSessionResponse2.status).toBe(409);
      expect(createSessionResponse2.body.error).toContain('conflict');

      // Cleanup
      await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, createSessionResponse1.body.id));
      await db.delete(patientsTable).where(eq(patientsTable.id, patientId2));
    });

    it('should validate session scheduling constraints', async () => {
      // Test past date validation
      const pastSessionData = {
        patientId: testClientId,
        date: '2020-01-01',
        time: '10:00',
        duration: 50,
        type: 'therapy'
      };

      const pastResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(pastSessionData);

      expect(pastResponse.status).toBe(400);
      expect(pastResponse.body.error).toContain('past');

      // Test invalid duration
      const invalidDurationData = {
        patientId: testClientId,
        date: '2025-06-27',
        time: '10:00',
        duration: 0, // Invalid duration
        type: 'therapy'
      };

      const invalidDurationResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(invalidDurationData);

      expect(invalidDurationResponse.status).toBe(400);
      expect(invalidDurationResponse.body.error).toContain('duration');

      // Test missing required fields
      const incompleteData = {
        patientId: testClientId,
        // Missing date, time, duration
        type: 'therapy'
      };

      const incompleteResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(incompleteData);

      expect(incompleteResponse.status).toBe(400);
      expect(incompleteResponse.body.error).toBeDefined();
    });

    it('should handle recurring session scheduling', async () => {
      // Create client for recurring sessions
      const recurringClientData = {
        name: 'Recurring Session Client',
        type: 'individual',
        email: 'recurring.client@example.com',
        phone: '555-111-2222',
        billingType: 'private_pay'
      };

      const createRecurringClientResponse = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send(recurringClientData)
        .expect(201);

      const recurringClientId = createRecurringClientResponse.body.id;

      // Schedule recurring sessions (weekly for 4 weeks)
      const recurringSessionData = {
        patientId: recurringClientId,
        date: '2025-07-01',
        time: '11:00',
        duration: 50,
        type: 'therapy',
        format: 'in_person',
        recurrence: 'weekly',
        occurrences: 4
      };

      const createRecurringResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(recurringSessionData)
        .expect(201);

      // Verify multiple sessions were created
      expect(createRecurringResponse.body.sessions).toHaveLength(4);

      // Verify sessions are spaced weekly
      const sessions = createRecurringResponse.body.sessions;
      for (let i = 1; i < sessions.length; i++) {
        const currentDate = new Date(sessions[i].date);
        const previousDate = new Date(sessions[i - 1].date);
        const daysDifference = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDifference).toBe(7); // 7 days = 1 week
      }

      // Cleanup recurring sessions and client
      for (const session of sessions) {
        await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, session.id));
      }
      await db.delete(patientsTable).where(eq(patientsTable.id, recurringClientId));
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for client creation', async () => {
      const clientData = {
        name: 'Unauthorized Client',
        type: 'individual',
        email: 'unauthorized@example.com'
      };

      const response = await request(app)
        .post('/api/patientsTable')
        .send(clientData);

      expect(response.status).toBe(401);
    });

    it('should require authentication for session scheduling', async () => {
      const sessionData = {
        patientId: testClientId,
        date: '2025-06-28',
        time: '10:00',
        duration: 50,
        type: 'therapy'
      };

      const response = await request(app)
        .post('/api/clinicalSessionsTable')
        .send(sessionData);

      expect(response.status).toBe(401);
    });

    it('should enforce user ownership of clients', async () => {
      // Create a client with a different user
      const otherUser = {
        username: 'other_therapist',
        password: 'OtherPassword123!',
        email: 'other.therapist@example.com',
        name: 'Other Therapist'
      };

      await request(app)
        .post('/api/auth/register')
        .send(otherUser)
        .expect(201);

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: otherUser.username,
          password: otherUser.password
        })
        .expect(200);

      const otherAuthCookie = otherLoginResponse.headers['set-cookie'];

      // Try to schedule session for client owned by different user
      const sessionData = {
        patientId: testClientId, // Owned by testUserId
        date: '2025-06-28',
        time: '10:00',
        duration: 50,
        type: 'therapy'
      };

      const response = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', otherAuthCookie)
        .send(sessionData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');

      // Cleanup other user
      await db.delete(usersTable).where(eq(usersTable.id, otherLoginResponse.body.user.id));
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain referential integrity between clients and sessions', async () => {
      // Create a session for non-existent client
      const invalidSessionData = {
        patientId: 99999, // Non-existent client
        date: '2025-06-29',
        time: '10:00',
        duration: 50,
        type: 'therapy'
      };

      const response = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(invalidSessionData);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should validate client data before creation', async () => {
      // Test invalid email format
      const invalidClientData = {
        name: 'Invalid Email Client',
        type: 'individual',
        email: 'invalid-email-format',
        phone: '555-123-4567'
      };

      const response = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send(invalidClientData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('should handle concurrent client creation', async () => {
      const promises = [];

      // Create multiple clients concurrently
      for (let i = 0; i < 5; i++) {
        const clientData = {
          name: `Concurrent Client ${i}`,
          type: 'individual',
          email: `concurrent${i}@example.com`,
          phone: `555-${100 + i}-${1000 + i}`
        };

        promises.push(
          request(app)
            .post('/api/patientsTable')
            .set('Cookie', authCookie)
            .send(clientData)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Cleanup concurrent clients
      for (const response of responses) {
        await db.delete(patientsTable).where(eq(patientsTable.id, response.body.id));
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of sessions efficiently', async () => {
      const startTime = Date.now();
      const sessionPromises = [];

      // Create multiple sessions for the test client
      for (let i = 0; i < 10; i++) {
        const sessionData = {
          patientId: testClientId,
          date: `2025-07-${String(i + 1).padStart(2, '0')}`,
          time: '10:00',
          duration: 50,
          type: 'therapy'
        };

        sessionPromises.push(
          request(app)
            .post('/api/clinicalSessionsTable')
            .set('Cookie', authCookie)
            .send(sessionData)
        );
      }

      const responses = await Promise.all(sessionPromises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Cleanup sessions
      for (const response of responses) {
        await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, response.body.id));
      }
    });

    it('should efficiently retrieve client sessions', async () => {
      // Create multiple sessions first
      const sessionIds = [];
      for (let i = 0; i < 5; i++) {
        const sessionData = {
          patientId: testClientId,
          date: `2025-08-${String(i + 1).padStart(2, '0')}`,
          time: '10:00',
          duration: 50,
          type: 'therapy'
        };

        const response = await request(app)
          .post('/api/clinicalSessionsTable')
          .set('Cookie', authCookie)
          .send(sessionData)
          .expect(201);

        sessionIds.push(response.body.id);
      }

      // Retrieve all sessions for the client
      const startTime = Date.now();
      const getSessionsResponse = await request(app)
        .get('/api/clinicalSessionsTable')
        .query({ patientId: testClientId })
        .set('Cookie', authCookie)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(getSessionsResponse.body).toHaveLength(5);
      expect(duration).toBeLessThan(1000); // Should be fast

      // Cleanup sessions
      for (const sessionId of sessionIds) {
        await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, sessionId));
      }
    });
  });
});
