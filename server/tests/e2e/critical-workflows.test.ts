import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '@db';
import { getSchemaInfo } from '@db';

// Use HIPAA schema only - legacy schema support removed
import * as hipaaSchema from "@db/schema-hipaa-refactored";
let usersTable = hipaaSchema.usersAuth;
let patientsTable = hipaaSchema.patients;
let clinicalSessionsTable = hipaaSchema.clinicalSessions;
let patientTreatmentPlansTable = hipaaSchema.patientTreatmentPlans;


describe('Critical Workflows E2E Tests', () => {
  let authCookie: string;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user and authenticate
    const testUser = {
      username: 'test_therapist_e2e',
      password: 'TestPassword123!',
      email: 'test.e2e@example.com',
      name: 'Test Therapist',
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

  afterEach(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.userId, testUserId));
      await db.delete(patientsTable).where(eq(patientsTable.userId, testUserId));
      await db.delete(usersTable).where(eq(usersTable.id, testUserId));
    }
  });

  describe('User Registration and Profile Setup', () => {
    it('should complete full user onboarding workflow', async () => {
      const newUser = {
        username: 'new_therapist_workflow',
        password: 'SecurePass123!',
        email: 'workflow@example.com',
        name: 'Workflow Test Therapist',
        title: 'Clinical Psychologist'
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(registerResponse.body.user).toMatchObject({
        username: newUser.username,
        email: newUser.email,
        name: newUser.name
      });

      // Step 2: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: newUser.username,
          password: newUser.password
        })
        .expect(200);

      const userCookie = loginResponse.headers['set-cookie'];
      const userId = loginResponse.body.user.id;

      // Step 3: Complete profile setup
      const profileData = {
        practiceDetails: {
          address: '123 Therapy St',
          city: 'Mental Health City',
          state: 'CA',
          zipCode: '90210',
          specialties: ['CBT', 'Anxiety', 'Depression'],
          yearsOfExperience: 5,
          sessionFormat: 'hybrid',
          baseRate: 150
        },
        credentialing: {
          ssn: '123456789',
          dateOfBirth: '1985-01-01',
          npiNumber: '1234567890',
          legalBusinessName: 'Test Therapy Practice'
        },
        lomaSettings: {
          defaultNoteFormat: 'SOAP',
          sessionDuration: 50,
          timeZone: 'America/Los_Angeles'
        }
      };

      const profileResponse = await request(app)
        .put('/api/usersTable/profile')
        .set('Cookie', userCookie)
        .send(profileData)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        name: newUser.name,
        title: newUser.title
      });

      // Step 4: Verify profile completion
      const userInfoResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', userCookie)
        .expect(200);

      expect(userInfoResponse.body.user.name).toBe(newUser.name);

      // Cleanup
      await db.delete(usersTable).where(eq(usersTable.id, userId));
    });
  });

  describe('Client Management Workflow', () => {
    it('should complete client creation, modification, and session booking', async () => {
      // Step 1: Create client
      const clientData = {
        name: 'Test E2E Client',
        type: 'individual',
        email: 'client.e2e@example.com',
        phone: '555-123-4567',
        billingType: 'private_pay',
        sessionCost: '150',
        age: 30,
        pronouns: 'they/them'
      };

      const createClientResponse = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send(clientData)
        .expect(201);

      const patientId = createClientResponse.body.id;
      expect(createClientResponse.body).toMatchObject(clientData);

      // Step 2: Update client information
      const updatedClientData = {
        ...clientData,
        notes: 'Updated client notes for E2E testing'
      };

      const updateClientResponse = await request(app)
        .put(`/api/patientsTable/${patientId}`)
        .set('Cookie', authCookie)
        .send(updatedClientData)
        .expect(200);

      expect(updateClientResponse.body.notes).toBe(updatedClientData.notes);

      // Step 3: Create session for client
      const sessionData = {
        patientId: patientId,
        date: '2025-06-25',
        time: '10:00',
        duration: 50,
        type: 'therapy',
        format: 'in_person',
        cost: 150
      };

      const createSessionResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send(sessionData)
        .expect(201);

      const sessionId = createSessionResponse.body.id;
      expect(createSessionResponse.body.patientId).toBe(patientId);

      // Step 4: Add session notes
      const noteData = {
        sessionId: sessionId,
        content: 'E2E test session note content',
        format: 'SOAP',
        isCompleted: true
      };

      const createNoteResponse = await request(app)
        .post('/api/session-notes')
        .set('Cookie', authCookie)
        .send(noteData)
        .expect(201);

      expect(createNoteResponse.body.content).toBe(noteData.content);

      // Step 5: Verify complete workflow data
      const clientResponse = await request(app)
        .get(`/api/patientsTable/${patientId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(clientResponse.body.notes).toBe(updatedClientData.notes);

      const sessionsResponse = await request(app)
        .get('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .query({ patientId })
        .expect(200);

      expect(sessionsResponse.body).toHaveLength(1);
      expect(sessionsResponse.body[0].id).toBe(sessionId);
    });
  });

  describe('Billing and Invoice Workflow', () => {
    it('should complete session billing and invoice generation', async () => {
      // Setup: Create client and session
      const clientResponse = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send({
          name: 'Billing Test Client',
          type: 'individual',
          billingType: 'private_pay',
          sessionCost: '200'
        })
        .expect(201);

      const patientId = clientResponse.body.id;

      const sessionResponse = await request(app)
        .post('/api/clinicalSessionsTable')
        .set('Cookie', authCookie)
        .send({
          patientId,
          date: '2025-06-25',
          time: '14:00',
          duration: 50,
          type: 'therapy',
          cost: 200,
          status: 'completed'
        })
        .expect(201);

      const sessionId = sessionResponse.body.id;

      // Step 1: Generate invoice
      const invoiceData = {
        sessionIds: [sessionId],
        dueDate: '2025-07-25',
        notes: 'E2E test invoice'
      };

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Cookie', authCookie)
        .send(invoiceData)
        .expect(201);

      const invoiceId = invoiceResponse.body.id;
      expect(invoiceResponse.body.total).toBe(200);

      // Step 2: Verify invoice details
      const getInvoiceResponse = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(getInvoiceResponse.body).toMatchObject({
        id: invoiceId,
        total: 200,
        status: 'pending'
      });

      // Step 3: Mark invoice as paid
      const paymentData = {
        amount: 200,
        method: 'credit_card',
        reference: 'test_payment_ref'
      };

      const paymentResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/payments`)
        .set('Cookie', authCookie)
        .send(paymentData)
        .expect(201);

      expect(paymentResponse.body.amount).toBe(200);

      // Step 4: Verify invoice is marked paid
      const paidInvoiceResponse = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(paidInvoiceResponse.body.status).toBe('paid');
    });
  });

  describe('Schedule Management Workflow', () => {
    it('should manage work schedule and availability', async () => {
      // Step 1: Set work schedule
      const scheduleData = [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        },
        {
          dayOfWeek: 2, // Tuesday
          startTime: '10:00',
          endTime: '18:00',
          isActive: true
        }
      ];

      for (const schedule of scheduleData) {
        await request(app)
          .post('/api/work-schedules')
          .set('Cookie', authCookie)
          .send(schedule)
          .expect(201);
      }

      // Step 2: Get work schedules
      const getScheduleResponse = await request(app)
        .get('/api/work-schedules')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getScheduleResponse.body).toHaveLength(2);

      // Step 3: Update schedule
      const scheduleId = getScheduleResponse.body[0].id;
      const updatedSchedule = {
        startTime: '08:00',
        endTime: '16:00'
      };

      const updateResponse = await request(app)
        .put(`/api/work-schedules/${scheduleId}`)
        .set('Cookie', authCookie)
        .send(updatedSchedule)
        .expect(200);

      expect(updateResponse.body.startTime).toBe('08:00');

      // Step 4: Check availability for booking
      const availabilityResponse = await request(app)
        .get('/api/availability')
        .set('Cookie', authCookie)
        .query({
          date: '2025-06-23', // Monday
          duration: 50
        })
        .expect(200);

      expect(availabilityResponse.body.available).toBe(true);
      expect(availabilityResponse.body.slots).toBeDefined();
    });
  });

  describe('Task Management Workflow', () => {
    it('should create, assign, and complete tasks', async () => {
      // Setup: Create client for task assignment
      const clientResponse = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send({
          name: 'Task Test Client',
          type: 'individual',
          billingType: 'insurance'
        })
        .expect(201);

      const patientId = clientResponse.body.id;

      // Step 1: Create task
      const taskData = {
        title: 'Complete intake forms',
        description: 'Client needs to complete initial paperwork',
        type: 'document_request',
        priority: 'high',
        dueDate: '2025-06-30',
        patientId: patientId
      };

      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Cookie', authCookie)
        .send(taskData)
        .expect(201);

      const taskId = taskResponse.body.id;
      expect(taskResponse.body.title).toBe(taskData.title);

      // Step 2: Update task status
      const updateTaskResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({
          status: 'in_progress',
          notes: 'Client has been contacted'
        })
        .expect(200);

      expect(updateTaskResponse.body.status).toBe('in_progress');

      // Step 3: Complete task
      const completeTaskResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', authCookie)
        .send({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
        .expect(200);

      expect(completeTaskResponse.body.status).toBe('completed');

      // Step 4: Verify task in completed list
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Cookie', authCookie)
        .query({ status: 'completed' })
        .expect(200);

      const completedTask = tasksResponse.body.find((t: any) => t.id === taskId);
      expect(completedTask).toBeDefined();
      expect(completedTask.status).toBe('completed');
    });
  });

  describe('Authentication and Security Workflow', () => {
    it('should handle password reset workflow', async () => {
      // Step 1: Request password reset
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test.e2e@example.com' })
        .expect(200);

      expect(resetResponse.body.message).toContain('reset');

      // Step 2: Verify user can still access with current password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_therapist_e2e',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.user).toBeDefined();
    });

    it('should handle session timeout and re-authentication', async () => {
      // Step 1: Access protected resource with valid session
      const protectedResponse1 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200);

      expect(protectedResponse1.body.user).toBeDefined();

      // Step 2: Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      // Step 3: Try to access protected resource after logout
      const protectedResponse2 = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(401);

      expect(protectedResponse2.body.error).toContain('AUTH_REQUIRED');

      // Step 4: Re-authenticate
      const reLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test_therapist_e2e',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(reLoginResponse.body.user).toBeDefined();
    });
  });

  describe('Data Export and Backup Workflow', () => {
    it('should export user data and maintain data integrity', async () => {
      // Setup: Create comprehensive test data
      const clientResponse = await request(app)
        .post('/api/patientsTable')
        .set('Cookie', authCookie)
        .send({
          name: 'Export Test Client',
          type: 'individual',
          email: 'export@example.com'
        })
        .expect(201);

      const patientId = clientResponse.body.id;

      // Step 1: Export client data
      const exportResponse = await request(app)
        .get(`/api/patientsTable/${patientId}/export`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(exportResponse.body).toMatchObject({
        client: expect.objectContaining({
          name: 'Export Test Client',
          email: 'export@example.com'
        }),
        clinicalSessionsTable: expect.any(Array),
        notes: expect.any(Array)
      });

      // Step 2: Verify data completeness
      expect(exportResponse.body.client.id).toBe(patientId);
      expect(exportResponse.body.exportedAt).toBeDefined();
      expect(exportResponse.body.version).toBeDefined();
    });
  });
});