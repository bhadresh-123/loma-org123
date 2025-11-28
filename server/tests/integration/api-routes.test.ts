import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '@db';
import { eq } from 'drizzle-orm';

/**
 * API Route Integration Tests
 * 
 * Tests critical API endpoints with database integration
 * Tests authentication, authorization, and data validation
 */

// Mock database for integration tests
vi.mock('@db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    query: {
      usersAuth: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      patients: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      clinicalSessions: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      patientTreatmentPlans: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    }
  }
}));

describe('API Route Integration Tests', () => {
  let authCookie: string;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user and authenticate
    const testUser = {
      username: 'test_therapist_api',
      password: 'TestPassword123!',
      email: 'test.api@example.com',
      name: 'Test Therapist',
      title: 'Licensed Therapist'
    };

    // Mock user creation
    const mockDb = await import('@db');
    vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue({
      id: 1,
      username: 'test_therapist_api',
      email: 'test.api@example.com',
      name: 'Test Therapist',
      title: 'Licensed Therapist'
    });

    // Mock login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    if (loginResponse.status === 200) {
      authCookie = loginResponse.headers['set-cookie'];
      testUserId = loginResponse.body.user.id;
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Routes', () => {
    describe('POST /api/auth/register', () => {
      it('should register new user successfully', async () => {
        const newUser = {
          username: 'new_therapist_api',
          password: 'SecurePass123!',
          email: 'new.api@example.com',
          name: 'New Therapist',
          title: 'Clinical Psychologist'
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 2 }]);

        const response = await request(app)
          .post('/api/auth/register')
          .send(newUser);

        expect(response.status).toBe(201);
        expect(response.body.user).toMatchObject({
          username: newUser.username,
          email: newUser.email,
          name: newUser.name
        });
      });

      it('should reject invalid registration data', async () => {
        const invalidUser = {
          username: 'short',
          password: 'weak',
          email: 'invalid-email',
          name: ''
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidUser);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should reject duplicate username', async () => {
        const duplicateUser = {
          username: 'test_therapist_api', // Already exists
          password: 'SecurePass123!',
          email: 'duplicate@example.com',
          name: 'Duplicate User'
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue({
          id: 1,
          username: 'test_therapist_api'
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send(duplicateUser);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('username');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue({
          id: 1,
          username: 'test_therapist_api',
          email: 'test.api@example.com',
          name: 'Test Therapist',
          password: '$2b$10$hashedpassword' // Mock hashed password
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'test_therapist_api',
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(200);
        expect(response.body.user).toBeDefined();
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should reject invalid credentials', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'nonexistent',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('Invalid');
      });

      it('should enforce rate limiting', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue(null);

        // Attempt multiple failed logins
        for (let i = 0; i < 6; i++) {
          await request(app)
            .post('/api/auth/login')
            .send({
              username: 'testuser',
              password: 'wrongpassword'
            });
        }

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'correctpassword'
          });

        expect(response.status).toBe(429);
        expect(response.body.message).toContain('Too many attempts');
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user with valid session', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue({
          id: 1,
          username: 'test_therapist_api',
          email: 'test.api@example.com',
          name: 'Test Therapist',
          title: 'Licensed Therapist'
        });

        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body.user).toMatchObject({
          id: 1,
          username: 'test_therapist_api',
          name: 'Test Therapist'
        });
      });

      it('should reject request without authentication', async () => {
        const response = await request(app)
          .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('AUTH_REQUIRED');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('successfully');
      });
    });
  });

  describe('Patient Management Routes', () => {
    describe('GET /api/patients', () => {
      it('should return patients for authenticated user', async () => {
        const mockPatients = [
          {
            id: 1,
            name: 'Test Patient',
            emailEncrypted: 'encrypted_patient@example.com',
            phoneEncrypted: 'encrypted_555-1234',
            organizationId: 1,
            primaryTherapistId: 1
          }
        ];

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findMany).mockResolvedValue(mockPatients);

        const response = await request(app)
          .get('/api/patients')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('Test Patient');
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get('/api/patients');

        expect(response.status).toBe(401);
      });

      it('should filter patients by organization', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findMany).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/patients')
          .query({ organizationId: 1 })
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });
    });

    describe('POST /api/patients', () => {
      it('should create new patient', async () => {
        const patientData = {
          organizationId: 1,
          primaryTherapistId: 1,
          name: 'New Patient',
          contactEmail: 'patient@example.com',
          contactPhone: '555-123-4567',
          dob: '1990-01-01',
          gender: 'female'
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

        const response = await request(app)
          .post('/api/patients')
          .set('Cookie', authCookie)
          .send(patientData);

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(1);
        expect(response.body.name).toBe('New Patient');
      });

      it('should validate required fields', async () => {
        const invalidData = {
          name: 'Incomplete Patient'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/patients')
          .set('Cookie', authCookie)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should encrypt PHI fields', async () => {
        const patientData = {
          organizationId: 1,
          primaryTherapistId: 1,
          name: 'PHI Test Patient',
          contactEmail: 'phi@example.com',
          contactPhone: '555-999-8888',
          clinicalNotes: 'Sensitive clinical information'
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

        const response = await request(app)
          .post('/api/patients')
          .set('Cookie', authCookie)
          .send(patientData);

        expect(response.status).toBe(201);
        
        // Verify PHI was encrypted
        expect(mockDb.db.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            emailEncrypted: expect.stringContaining('encrypted_'),
            phoneEncrypted: expect.stringContaining('encrypted_'),
            clinicalNotesEncrypted: expect.stringContaining('encrypted_')
          })
        );
      });
    });

    describe('GET /api/patients/:id', () => {
      it('should return specific patient', async () => {
        const mockPatient = {
          id: 1,
          name: 'Specific Patient',
          emailEncrypted: 'encrypted_specific@example.com',
          phoneEncrypted: 'encrypted_555-1111',
          organizationId: 1,
          primaryTherapistId: 1
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue(mockPatient);

        const response = await request(app)
          .get('/api/patients/1')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Specific Patient');
      });

      it('should return 404 for non-existent patient', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue(null);

        const response = await request(app)
          .get('/api/patients/999')
          .set('Cookie', authCookie);

        expect(response.status).toBe(404);
      });

      it('should enforce access control', async () => {
        const mockPatient = {
          id: 1,
          name: 'Restricted Patient',
          organizationId: 2, // Different organization
          primaryTherapistId: 2
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue(mockPatient);

        const response = await request(app)
          .get('/api/patients/1')
          .set('Cookie', authCookie);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });
    });

    describe('PUT /api/patients/:id', () => {
      it('should update patient', async () => {
        const updateData = {
          name: 'Updated Patient',
          contactEmail: 'updated@example.com',
          clinicalNotes: 'Updated clinical notes'
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue({
          id: 1,
          organizationId: 1,
          primaryTherapistId: 1
        });
        vi.mocked(mockDb.db.update).mockResolvedValue([{ id: 1 }]);

        const response = await request(app)
          .put('/api/patients/1')
          .set('Cookie', authCookie)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe('Updated Patient');
      });

      it('should validate update data', async () => {
        const invalidData = {
          contactEmail: 'invalid-email-format'
        };

        const response = await request(app)
          .put('/api/patients/1')
          .set('Cookie', authCookie)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('DELETE /api/patients/:id', () => {
      it('should soft delete patient', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue({
          id: 1,
          organizationId: 1,
          primaryTherapistId: 1
        });
        vi.mocked(mockDb.db.update).mockResolvedValue([{ id: 1, deleted: true }]);

        const response = await request(app)
          .delete('/api/patients/1')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');
      });

      it('should enforce delete permissions', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue({
          id: 1,
          organizationId: 2, // Different organization
          primaryTherapistId: 2
        });

        const response = await request(app)
          .delete('/api/patients/1')
          .set('Cookie', authCookie);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('permissions');
      });
    });
  });

  describe('AI Assistant Routes', () => {
    describe('POST /api/ai-assistant', () => {
      it('should generate AI response', async () => {
        const requestData = {
          message: 'Create a treatment plan for anxiety',
          context: 'Patient has generalized anxiety disorder'
        };

        const mockAIResponse = {
          text: 'Here is a comprehensive treatment plan for anxiety...',
          confidence: 0.9,
          requiresHumanReview: false,
          warnings: []
        };

        // Mock AI service
        vi.doMock('../../services/SecureAIService', () => ({
          SecureAIService: vi.fn().mockImplementation(() => ({
            generateTextWithValidation: vi.fn().mockResolvedValue(mockAIResponse)
          }))
        }));

        const response = await request(app)
          .post('/api/ai-assistant')
          .set('Cookie', authCookie)
          .send(requestData);

        expect(response.status).toBe(200);
        expect(response.body.response).toBeDefined();
        expect(response.body.confidence).toBe(0.9);
      });

      it('should validate required message field', async () => {
        const response = await request(app)
          .post('/api/ai-assistant')
          .set('Cookie', authCookie)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Message is required');
      });

      it('should handle AI service errors', async () => {
        const requestData = {
          message: 'Create a treatment plan'
        };

        // Mock AI service error
        vi.doMock('../../services/SecureAIService', () => ({
          SecureAIService: vi.fn().mockImplementation(() => ({
            generateTextWithValidation: vi.fn().mockRejectedValue(new Error('AI service unavailable'))
          }))
        }));

        const response = await request(app)
          .post('/api/ai-assistant')
          .set('Cookie', authCookie)
          .send(requestData);

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('AI service unavailable');
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .post('/api/ai-assistant')
          .send({
            message: 'Create a treatment plan'
          });

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/ai-assistant/action', () => {
      it('should execute create_treatment_plan action', async () => {
        const actionData = {
          action: 'create_treatment_plan',
          parameters: {
            patientId: 1,
            diagnosis: 'Anxiety',
            goals: ['Reduce anxiety symptoms']
          }
        };

        const response = await request(app)
          .post('/api/ai-assistant/action')
          .set('Cookie', authCookie)
          .send(actionData);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should validate required action field', async () => {
        const response = await request(app)
          .post('/api/ai-assistant/action')
          .set('Cookie', authCookie)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Action is required');
      });

      it('should reject unknown actions', async () => {
        const actionData = {
          action: 'unknown_action',
          parameters: {}
        };

        const response = await request(app)
          .post('/api/ai-assistant/action')
          .set('Cookie', authCookie)
          .send(actionData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Unknown action');
      });
    });
  });

  describe('Task Management Routes', () => {
    describe('GET /api/tasks', () => {
      it('should return tasks for organization', async () => {
        const mockTasks = [
          {
            id: 1,
            title: 'Complete intake forms',
            description: 'Patient needs to complete initial paperwork',
            status: 'pending',
            priority: 'high',
            dueDate: '2025-02-01'
          }
        ];

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.tasks.findMany).mockResolvedValue(mockTasks);

        const response = await request(app)
          .get('/api/tasks')
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].title).toBe('Complete intake forms');
      });

      it('should filter tasks by status', async () => {
        const mockDb = await import('@db');
        vi.mocked(mockDb.db.query.tasks.findMany).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/tasks')
          .query({ status: 'completed' })
          .set('Cookie', authCookie);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });
    });

    describe('POST /api/tasks', () => {
      it('should create new task', async () => {
        const taskData = {
          title: 'Follow up with patient',
          description: 'Call patient to discuss treatment progress',
          type: 'follow_up',
          priority: 'medium',
          dueDate: '2025-02-15',
          patientId: 1
        };

        const mockDb = await import('@db');
        vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

        const response = await request(app)
          .post('/api/tasks')
          .set('Cookie', authCookie)
          .send(taskData);

        expect(response.status).toBe(201);
        expect(response.body.title).toBe('Follow up with patient');
      });

      it('should validate required fields', async () => {
        const invalidData = {
          description: 'Task without title'
        };

        const response = await request(app)
          .post('/api/tasks')
          .set('Cookie', authCookie)
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockDb = await import('@db');
      vi.mocked(mockDb.db.query.usersAuth.findFirst).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send({
          name: '', // Invalid empty name
          contactEmail: 'invalid-email' // Invalid email format
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    it('should handle missing route gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('Security', () => {
    it('should prevent SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE patients; --";
      
      const response = await request(app)
        .get('/api/patients')
        .query({ search: maliciousQuery })
        .set('Cookie', authCookie);

      // Should not cause database error
      expect(response.status).not.toBe(500);
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("XSS")</script>',
        contactEmail: 'test@example.com',
        clinicalNotes: 'Notes with <img src="x" onerror="alert(\'XSS\')">'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      const response = await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(maliciousData);

      expect(response.status).toBe(201);
      
      // Verify data was sanitized
      expect(mockDb.db.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.not.stringContaining('<script>'),
          clinicalNotesEncrypted: expect.not.stringContaining('<img')
        })
      );
    });

    it('should enforce HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      // Should redirect to HTTPS or reject non-HTTPS requests
      expect([301, 302, 403]).toContain(response.status);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance', () => {
    it('should respond to requests within acceptable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Cookie', authCookie)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
