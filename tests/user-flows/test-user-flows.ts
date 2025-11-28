import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { db } from '../db';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'test-therapist@example.com',
  password: 'TestPassword123!',
  name: 'Dr. Test Therapist',
  title: 'Licensed Clinical Psychologist',
  license: 'LCP-12345'
};

const testClient = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '555-123-4567',
  billingType: 'private_pay',
  sessionCost: '150.00',
  race: 'White',
  age: 35,
  hometown: 'Anytown, USA',
  pronouns: 'he/him'
};

const testSession = {
  patientId: 1,
  sessionDate: '2025-01-20',
  sessionNotes: 'Initial assessment completed. Client presents with anxiety symptoms.',
  sessionType: 'individual',
  duration: 50
};

const testTask = {
  title: 'Follow up on homework assignment',
  description: 'Check if client completed anxiety journal',
  dueDate: '2025-01-25',
  priority: 'medium',
  patientId: 1
};

describe('LOMA Platform - User Flow Tests', () => {
  let authToken: string;
  let userId: number;
  let clientId: number;
  let sessionId: number;
  let taskId: number;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe('Authentication Flows', () => {
    test('1. User Registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(testUser.username);
      userId = response.body.user.id;
    });

    test('2. User Login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(testUser.username);
      
      // Extract session cookie for subsequent requests
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    test('3. Get Current User', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(testUser.username);
    });

    test('4. User Logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Client Management Flows', () => {
    test('5. Create Client', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Cookie', await getAuthCookie())
        .send(testClient)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testClient.name);
      expect(response.body.email).toBe(testClient.email);
      clientId = response.body.id;
    });

    test('6. List Clients', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
    });

    test('7. Get Client Details', async () => {
      const response = await request(app)
        .get(`/api/clients/${clientId}`)
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(response.body).toHaveProperty('id', clientId);
      expect(response.body.name).toBe(testClient.name);
    });

    test('8. Update Client', async () => {
      const updateData = {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '555-987-6543'
      };

      const response = await request(app)
        .put(`/api/clients/${clientId}`)
        .set('Cookie', await getAuthCookie())
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', clientId);
      expect(response.body.name).toBe(updateData.name);
    });

    test('9. Delete Client', async () => {
      const response = await request(app)
        .delete(`/api/clients/${clientId}`)
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Session Management Flows', () => {
    test('10. Create Session', async () => {
      // First create a client for the session
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Cookie', await getAuthCookie())
        .send(testClient)
        .expect(201);
      
      const sessionData = {
        ...testSession,
        patientId: clientResponse.body.id
      };

      const response = await request(app)
        .post('/api/sessions')
        .set('Cookie', await getAuthCookie())
        .send(sessionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.patientId).toBe(sessionData.patientId);
      sessionId = response.body.id;
    });

    test('11. List Sessions', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('12. Get Session Details', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(response.body).toHaveProperty('id', sessionId);
      expect(response.body).toHaveProperty('patientId');
    });

    test('13. Update Session Status', async () => {
      const response = await request(app)
        .put(`/api/sessions/${sessionId}/status`)
        .set('Cookie', await getAuthCookie())
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'completed');
    });
  });

  describe('Task Management Flows', () => {
    test('14. Create Task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Cookie', await getAuthCookie())
        .send(testTask)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(testTask.title);
      taskId = response.body.id;
    });

    test('15. List Tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('16. Complete Task', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', await getAuthCookie())
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'completed');
    });
  });

  describe('Profile Management Flows', () => {
    test('17. Get User Profile', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Cookie', await getAuthCookie())
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('practiceDetails');
    });

    test('18. Update User Profile', async () => {
      const updateData = {
        name: 'Dr. Updated Therapist',
        practiceDetails: {
          biography: 'Updated biography',
          yearsOfExperience: 15,
          specialties: ['Anxiety', 'Depression', 'Trauma']
        }
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Cookie', await getAuthCookie())
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Error Handling Tests', () => {
    test('19. Unauthenticated Request', async () => {
      const response = await request(app)
        .get('/api/clients')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('20. Invalid Client ID', async () => {
      const response = await request(app)
        .get('/api/clients/99999')
        .set('Cookie', await getAuthCookie())
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('21. Invalid Session Data', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Cookie', await getAuthCookie())
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // Helper functions
  async function getAuthCookie(): Promise<string> {
    const response = await request(app)
      .post('/api/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });
    
    const cookies = response.headers['set-cookie'];
    return cookies ? cookies.join('; ') : '';
  }

  async function cleanupTestData() {
    try {
      // Clean up test data in reverse order of dependencies
      if (taskId) {
        await db.delete(db.query.tasks).where(eq(db.query.tasks.id, taskId));
      }
      if (sessionId) {
        await db.delete(db.query.sessions).where(eq(db.query.sessions.id, sessionId));
      }
      if (clientId) {
        await db.delete(db.query.clients).where(eq(db.query.clients.id, clientId));
      }
      if (userId) {
        await db.delete(db.query.users).where(eq(db.query.users.id, userId));
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
});
