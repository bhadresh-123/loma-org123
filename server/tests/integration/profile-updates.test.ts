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

import { eq } from 'drizzle-orm';

describe('Profile Updates Integration Tests - CRITICAL BUSINESS LOGIC', () => {
  let authCookie: string;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user and authenticate
    const testUser = {
      username: 'profile_test_user',
      password: 'SecurePass123!',
      email: 'profile@test.com',
      name: 'Profile Test User',
      title: 'Initial Title'
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
      await db.delete(usersTable).where(eq(usersTable.id, testUserId));
    }
  });

  describe('Basic Profile Field Updates', () => {
    it('should successfully update professional title', async () => {
      const titleUpdate = {
        title: 'Licensed Clinical Social Worker'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(titleUpdate)
        .expect(200);

      expect(response.body.title).toBe('Licensed Clinical Social Worker');

      // Verify in database
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, testUserId)
      });
      expect(user?.title).toBe('Licensed Clinical Social Worker');
    });

    it('should successfully update license number', async () => {
      const licenseUpdate = {
        license: 'LCSW-12345'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(licenseUpdate)
        .expect(200);

      expect(response.body.license).toBe('LCSW-12345');
    });

    it('should successfully update email', async () => {
      const emailUpdate = {
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(emailUpdate)
        .expect(200);

      expect(response.body.email).toBe('updated@example.com');
    });

    it('should successfully update phone number', async () => {
      const phoneUpdate = {
        phone: '555-123-4567'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(phoneUpdate)
        .expect(200);

      expect(response.body.phone).toBe('555-123-4567');
    });

    it('should handle empty string values correctly', async () => {
      const emptyUpdate = {
        title: '',
        license: '',
        email: ''
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(emptyUpdate)
        .expect(200);

      // Empty strings should be preserved for basic fields
      expect(response.body.title).toBe('');
      expect(response.body.license).toBe('');
      expect(response.body.email).toBe('');
    });
  });

  describe('Data Transformation Validation', () => {
    it('should correctly transform frontend camelCase to database snake_case', async () => {
      const complexUpdate = {
        personalPhone: '555-987-6543',
        personalEmail: 'personal@example.com',
        zipCode: '12345',
        yearsOfExperience: 10,
        sessionFormat: 'hybrid',
        baseRate: 150.50
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(complexUpdate)
        .expect(200);

      // Verify camelCase response
      expect(response.body.personalPhone).toBe('555-987-6543');
      expect(response.body.personalEmail).toBe('personal@example.com');
      expect(response.body.zipCode).toBe('12345');
      expect(response.body.yearsOfExperience).toBe(10);
      expect(response.body.sessionFormat).toBe('hybrid');
      expect(response.body.baseRate).toBe(150.50);

      // Verify database stored in snake_case
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, testUserId)
      });
      expect(user?.personalphone).toBe('555-987-6543');
      expect(user?.personalemail).toBe('personal@example.com');
      expect(user?.zipcode).toBe('12345');
      expect(user?.yearsofexperience).toBe(10);
      expect(user?.sessionformat).toBe('hybrid');
    });

    it('should handle array fields with JSON serialization', async () => {
      const arrayUpdate = {
        specialties: ['CBT', 'Anxiety', 'Depression'],
        languages: ['English', 'Spanish'],
        therapistIdentities: ['LGBTQ+ Affirming', 'Trauma-Informed']
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(arrayUpdate)
        .expect(200);

      // Verify arrays are returned correctly
      expect(response.body.specialties).toEqual(['CBT', 'Anxiety', 'Depression']);
      expect(response.body.languages).toEqual(['English', 'Spanish']);
      expect(response.body.therapistIdentities).toEqual(['LGBTQ+ Affirming', 'Trauma-Informed']);

      // Verify stored as JSON strings in database
      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, testUserId)
      });
      expect(user?.specialties).toBe('["CBT","Anxiety","Depression"]');
      expect(user?.languages).toBe('["English","Spanish"]');
    });
  });

  describe('Route Consistency Validation', () => {
    it('should have consistent behavior between /api/profile and /api/usersTable/profile', async () => {
      const testUpdate = {
        title: 'Test Consistency Title',
        email: 'consistency@test.com'
      };

      // Test /api/profile route
      const profileResponse = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(testUpdate)
        .expect(200);

      expect(profileResponse.body.title).toBe('Test Consistency Title');
      expect(profileResponse.body.email).toBe('consistency@test.com');

      // Reset and test /api/usersTable/profile route
      const resetUpdate = { title: 'Reset Title', email: 'reset@test.com' };
      await request(app)
        .put('/api/usersTable/profile')
        .set('Cookie', authCookie)
        .send(resetUpdate)
        .expect(200);

      const usersResponse = await request(app)
        .put('/api/usersTable/profile')
        .set('Cookie', authCookie)
        .send(testUpdate)
        .expect(200);

      // Both routes should produce identical results
      expect(usersResponse.body.title).toBe(profileResponse.body.title);
      expect(usersResponse.body.email).toBe(profileResponse.body.email);
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should validate field length constraints', async () => {
      const invalidUpdate = {
        title: 'x'.repeat(200), // Exceeds typical length limit
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should preserve existing data when partial update fails', async () => {
      // Set initial valid data
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ title: 'Valid Title', email: 'valid@example.com' })
        .expect(200);

      // Attempt invalid partial update
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ email: 'invalid-email' })
        .expect(400);

      // Verify original data preserved
      const response = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.title).toBe('Valid Title');
      expect(response.body.email).toBe('valid@example.com');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent profile updates', async () => {
      const updates = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .put('/api/profile')
          .set('Cookie', authCookie)
          .send({ title: `Concurrent Title ${i}` })
      );

      const results = await Promise.all(updates);
      
      // All updates should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.title).toMatch(/^Concurrent Title \d$/);
      });
    });

    it('should complete profile updates within performance threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({
          title: 'Performance Test Title',
          email: 'performance@test.com',
          phone: '555-123-4567',
          personalPhone: '555-987-6543',
          address: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        })
        .expect(200);

      const duration = Date.now() - startTime;
      
      // Should complete within 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});