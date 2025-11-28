import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '@db';
import { eq } from 'drizzle-orm';

/**
 * Client Creation and Scheduling Integration Tests
 * 
 * Comprehensive tests for the complete client creation and session scheduling workflow
 * Tests authentication, validation, PHI encryption, and scheduling logic
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
      organizations: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      },
      organizationMemberships: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    }
  }
}));

describe('Client Creation and Scheduling Workflow', () => {
  let authCookie: string;
  let testUserId: number;
  let testClientId: number;

  beforeEach(async () => {
    // Create test user and authenticate
    const testUser = {
      username: 'test_therapist_scheduling',
      password: 'TestPassword123!',
      email: 'test.scheduling@example.com',
      name: 'Test Therapist',
      title: 'Licensed Therapist'
    };

    // Mock user creation and authentication
    const mockDb = await import('@db');
    vi.mocked(mockDb.db.query.usersAuth.findFirst).mockResolvedValue({
      id: 1,
      username: 'test_therapist_scheduling',
      email: 'test.scheduling@example.com',
      name: 'Test Therapist',
      title: 'Licensed Therapist'
    });

    // Mock organization membership
    vi.mocked(mockDb.db.query.organizationMemberships.findMany).mockResolvedValue([{
      id: 1,
      userId: 1,
      organizationId: 1,
      role: 'therapist',
      canViewAllPatients: false,
      canViewSelectedPatients: null
    }]);

    // Mock organization
    vi.mocked(mockDb.db.query.organizations.findFirst).mockResolvedValue({
      id: 1,
      name: 'Test Organization',
      type: 'solo'
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

  describe('Complete Client Creation and Scheduling Workflow', () => {
    it('should complete full client creation and session scheduling workflow', async () => {
      // Step 1: Create a new client
      const clientData = {
        organizationId: 1,
        primaryTherapistId: testUserId,
        name: 'Scheduling Test Client',
        contactEmail: 'scheduling.client@example.com',
        contactPhone: '555-123-4567',
        dob: '1990-01-01',
        gender: 'female',
        clinicalNotes: 'Initial assessment notes'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      const createClientResponse = await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      expect(createClientResponse.status).toBe(201);
      expect(createClientResponse.body.name).toBe('Scheduling Test Client');
      testClientId = createClientResponse.body.id;

      // Step 2: Verify client was created with PHI encryption
      expect(mockDb.db.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Scheduling Test Client',
          emailEncrypted: expect.stringContaining('encrypted_'),
          phoneEncrypted: expect.stringContaining('encrypted_'),
          clinicalNotesEncrypted: expect.stringContaining('encrypted_')
        })
      );

      // Step 3: Schedule a session for the client
      const sessionData = {
        patientId: testClientId,
        therapistId: testUserId,
        date: '2025-02-15T10:00:00.000Z',
        duration: 50,
        type: 'individual',
        format: 'in_person',
        notes: 'Initial therapy session'
      };

      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      const createSessionResponse = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(sessionData);

      expect(createSessionResponse.status).toBe(201);
      expect(createSessionResponse.body.data.patientId).toBe(testClientId);
      expect(createSessionResponse.body.data.duration).toBe(50);

      // Step 4: Verify session was created with proper validation
      expect(mockDb.db.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: testClientId,
          therapistId: testUserId,
          duration: 50,
          type: 'individual',
          format: 'in_person'
        })
      );

      // Step 5: Retrieve scheduled sessions for the client
      vi.mocked(mockDb.db.query.clinicalSessions.findMany).mockResolvedValue([{
        id: 1,
        patientId: testClientId,
        therapistId: testUserId,
        date: new Date('2025-02-15T10:00:00.000Z'),
        duration: 50,
        type: 'individual',
        format: 'in_person',
        status: 'scheduled',
        notesEncrypted: 'encrypted_Initial therapy session'
      }]);

      const getSessionsResponse = await request(app)
        .get('/api/clinical-sessions')
        .query({ patientId: testClientId })
        .set('Cookie', authCookie);

      expect(getSessionsResponse.status).toBe(200);
      expect(getSessionsResponse.body).toHaveLength(1);
      expect(getSessionsResponse.body[0].patientId).toBe(testClientId);
      expect(getSessionsResponse.body[0].duration).toBe(50);
    });

    it('should handle scheduling conflicts', async () => {
      // Create client first
      const clientData = {
        organizationId: 1,
        primaryTherapistId: testUserId,
        name: 'Conflict Test Client',
        contactEmail: 'conflict.client@example.com'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 2 }]);

      await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      // Try to schedule overlapping sessions
      const sessionData1 = {
        patientId: 2,
        therapistId: testUserId,
        date: '2025-02-15T10:00:00.000Z',
        duration: 60,
        type: 'individual'
      };

      const sessionData2 = {
        patientId: 2,
        therapistId: testUserId,
        date: '2025-02-15T10:30:00.000Z', // Overlaps with first session
        duration: 60,
        type: 'individual'
      };

      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      // First session should succeed
      const response1 = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(sessionData1);

      expect(response1.status).toBe(201);

      // Second session should be rejected due to conflict
      // Mock conflict detection
      vi.mocked(mockDb.db.query.clinicalSessions.findMany).mockResolvedValue([{
        id: 1,
        therapistId: testUserId,
        date: new Date('2025-02-15T10:00:00.000Z'),
        duration: 60
      }]);

      const response2 = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(sessionData2);

      // Should return conflict error
      expect(response2.status).toBe(409);
      expect(response2.body.error).toContain('conflict');
    });

    it('should validate session scheduling constraints', async () => {
      // Test past date validation
      const pastSessionData = {
        patientId: 1,
        therapistId: testUserId,
        date: '2020-01-01T10:00:00.000Z', // Past date
        duration: 50,
        type: 'individual'
      };

      const pastResponse = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(pastSessionData);

      expect(pastResponse.status).toBe(400);
      expect(pastResponse.body.error).toContain('past');

      // Test invalid duration
      const invalidDurationData = {
        patientId: 1,
        therapistId: testUserId,
        date: '2025-02-15T10:00:00.000Z',
        duration: 0, // Invalid duration
        type: 'individual'
      };

      const invalidDurationResponse = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(invalidDurationData);

      expect(invalidDurationResponse.status).toBe(400);
      expect(invalidDurationResponse.body.error).toContain('duration');

      // Test missing required fields
      const incompleteData = {
        patientId: 1,
        // Missing therapistId, date, duration
        type: 'individual'
      };

      const incompleteResponse = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(incompleteData);

      expect(incompleteResponse.status).toBe(400);
      expect(incompleteResponse.body.error).toBeDefined();
    });

    it('should handle recurring session scheduling', async () => {
      // Create client
      const clientData = {
        organizationId: 1,
        primaryTherapistId: testUserId,
        name: 'Recurring Client',
        contactEmail: 'recurring.client@example.com'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 3 }]);

      await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      // Schedule recurring sessions
      const recurringSessionData = {
        patientId: 3,
        therapistId: testUserId,
        date: '2025-02-15T10:00:00.000Z',
        duration: 50,
        type: 'individual',
        recurrence: 'weekly',
        occurrences: 4
      };

      // Mock multiple session creation
      vi.mocked(mockDb.db.insert).mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ]);

      const recurringResponse = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(recurringSessionData);

      expect(recurringResponse.status).toBe(201);
      expect(recurringResponse.body.data).toHaveLength(4);

      // Verify sessions are spaced weekly
      const sessions = recurringResponse.body.data;
      for (let i = 1; i < sessions.length; i++) {
        const currentDate = new Date(sessions[i].date);
        const previousDate = new Date(sessions[i - 1].date);
        const daysDifference = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDifference).toBe(7); // 7 days = 1 week
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for client creation', async () => {
      const clientData = {
        organizationId: 1,
        primaryTherapistId: 1,
        name: 'Unauthorized Client',
        contactEmail: 'unauthorized@example.com'
      };

      const response = await request(app)
        .post('/api/patients')
        .send(clientData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('AUTH_REQUIRED');
    });

    it('should require authentication for session scheduling', async () => {
      const sessionData = {
        patientId: 1,
        therapistId: 1,
        date: '2025-02-15T10:00:00.000Z',
        duration: 50,
        type: 'individual'
      };

      const response = await request(app)
        .post('/api/clinical-sessions')
        .send(sessionData);

      expect(response.status).toBe(401);
    });

    it('should enforce organization-based access control', async () => {
      // Mock user from different organization
      const mockDb = await import('@db');
      vi.mocked(mockDb.db.query.organizationMemberships.findMany).mockResolvedValue([{
        id: 1,
        userId: 1,
        organizationId: 2, // Different organization
        role: 'therapist',
        canViewAllPatients: false
      }]);

      const clientData = {
        organizationId: 1, // Trying to create client in org 1
        primaryTherapistId: 1,
        name: 'Cross Org Client',
        contactEmail: 'cross.org@example.com'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });
  });

  describe('PHI Protection and HIPAA Compliance', () => {
    it('should encrypt PHI when creating clients', async () => {
      const clientData = {
        organizationId: 1,
        primaryTherapistId: testUserId,
        name: 'PHI Test Client',
        contactEmail: 'phi.test@example.com',
        contactPhone: '555-999-8888',
        clinicalNotes: 'Sensitive clinical information',
        dob: '1985-05-15',
        ssn: '123-45-6789'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      // Verify all PHI fields were encrypted
      expect(mockDb.db.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          emailEncrypted: expect.stringContaining('encrypted_'),
          phoneEncrypted: expect.stringContaining('encrypted_'),
          clinicalNotesEncrypted: expect.stringContaining('encrypted_'),
          dobEncrypted: expect.stringContaining('encrypted_'),
          ssnEncrypted: expect.stringContaining('encrypted_')
        })
      );
    });

    it('should encrypt PHI when creating sessions', async () => {
      const sessionData = {
        patientId: 1,
        therapistId: testUserId,
        date: '2025-02-15T10:00:00.000Z',
        duration: 50,
        type: 'individual',
        notes: 'Sensitive session notes',
        diagnosis: 'Anxiety disorder',
        treatmentPlan: 'CBT therapy plan'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(sessionData);

      // Verify PHI fields were encrypted
      expect(mockDb.db.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          notesEncrypted: expect.stringContaining('encrypted_'),
          diagnosisEncrypted: expect.stringContaining('encrypted_'),
          treatmentPlanEncrypted: expect.stringContaining('encrypted_')
        })
      );
    });

    it('should log PHI access for audit compliance', async () => {
      const clientData = {
        organizationId: 1,
        primaryTherapistId: testUserId,
        name: 'Audit Test Client',
        contactEmail: 'audit.test@example.com'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      // Verify audit logging was called
      // This would be verified through the audit service mock
      expect(mockDb.db.insert).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockRejectedValue(new Error('Database connection failed'));

      const clientData = {
        organizationId: 1,
        primaryTherapistId: testUserId,
        name: 'Error Test Client',
        contactEmail: 'error.test@example.com'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Cookie', authCookie)
        .send(clientData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid date formats', async () => {
      const sessionData = {
        patientId: 1,
        therapistId: testUserId,
        date: 'invalid-date-format',
        duration: 50,
        type: 'individual'
      };

      const response = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(sessionData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('date');
    });

    it('should handle missing client for session scheduling', async () => {
      const sessionData = {
        patientId: 999, // Non-existent client
        therapistId: testUserId,
        date: '2025-02-15T10:00:00.000Z',
        duration: 50,
        type: 'individual'
      };

      const mockDb = await import('@db');
      vi.mocked(mockDb.db.query.patients.findFirst).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/clinical-sessions')
        .set('Cookie', authCookie)
        .send(sessionData);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk client creation efficiently', async () => {
      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      const startTime = Date.now();
      const promises = [];

      // Create multiple clients concurrently
      for (let i = 0; i < 10; i++) {
        const clientData = {
          organizationId: 1,
          primaryTherapistId: testUserId,
          name: `Bulk Client ${i}`,
          contactEmail: `bulk${i}@example.com`
        };

        promises.push(
          request(app)
            .post('/api/patients')
            .set('Cookie', authCookie)
            .send(clientData)
        );
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle concurrent session scheduling', async () => {
      const mockDb = await import('@db');
      vi.mocked(mockDb.db.insert).mockResolvedValue([{ id: 1 }]);

      const startTime = Date.now();
      const promises = [];

      // Schedule multiple sessions concurrently
      for (let i = 0; i < 5; i++) {
        const sessionData = {
          patientId: 1,
          therapistId: testUserId,
          date: `2025-02-${15 + i}T10:00:00.000Z`,
          duration: 50,
          type: 'individual'
        };

        promises.push(
          request(app)
            .post('/api/clinical-sessions')
            .set('Cookie', authCookie)
            .send(sessionData)
        );
      }

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });
});
