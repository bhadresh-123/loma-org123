import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, cleanupTestUser } from './utils/test-server';
import { db } from '@db';
import { getSchemaInfo } from '@db';

// Use HIPAA schema only - legacy schema support removed
import * as hipaaSchema from "@db/schema-hipaa-refactored";
let usersTable = hipaaSchema.usersAuth;
let patientsTable = hipaaSchema.patients;
let clinicalSessionsTable = hipaaSchema.clinicalSessions;
let patientTreatmentPlansTable = hipaaSchema.patientTreatmentPlans;

import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

describe('CV Parser API', () => {
  let app: any;
  let testUserId: number;
  let authCookie: string;

  beforeEach(async () => {
    app = await createTestApp();
    const userResult = await createTestUser(app);
    testUserId = userResult.userId;
    authCookie = userResult.authCookie;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(cvEducationData).where(eq(cvEducationData.userId, testUserId));
    await db.delete(cvWorkExperienceData).where(eq(cvWorkExperienceData.userId, testUserId));
    await cleanupTestUser(testUserId);
  });

  describe('GET /api/cv-parser/data', () => {
    it('should return empty data for new user', async () => {
      const response = await request(app)
        .get('/api/cv-parser/data')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body).toEqual({
        hasParsedData: false,
        education: [],
        workExperience: []
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      await request(app)
        .get('/api/cv-parser/data')
        .expect(401);
    });
  });

  describe('POST /api/cv-parser/parse', () => {
    const createTestDOCX = () => {
      // Create a simple test DOCX file buffer
      const testContent = 'Test CV Content\nEducation: University of Test\nWork: Test Company';
      return Buffer.from(testContent);
    };

    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/cv-parser/parse')
        .set('Cookie', authCookie)
        .expect(400);

      expect(response.body.error).toBe('No CV file uploaded');
    });

    it('should reject invalid file types', async () => {
      const testBuffer = Buffer.from('test content');
      
      const response = await request(app)
        .post('/api/cv-parser/parse')
        .set('Cookie', authCookie)
        .attach('cv', testBuffer, 'test.txt')
        .expect(400);

      expect(response.body.message).toContain('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/cv-parser/parse')
        .set('Cookie', authCookie)
        .attach('cv', largeBuffer, 'large.docx')
        .expect(400);

      expect(response.body.message).toContain('File too large');
    });

    it('should require authentication', async () => {
      const testBuffer = createTestDOCX();
      
      await request(app)
        .post('/api/cv-parser/parse')
        .attach('cv', testBuffer, 'test.docx')
        .expect(401);
    });
  });

  describe('PUT /api/cv-parser/education/:id', () => {
    let educationId: number;

    beforeEach(async () => {
      // Create test education entry
      const result = await db.insert(cvEducationData).values({
        userId: testUserId,
        university: 'Test University',
        degree: 'Bachelor',
        major: 'Computer Science',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-01-01'),
      }).returning();
      
      educationId = result[0].id;
    });

    it('should update education entry successfully', async () => {
      const updateData = {
        university: 'Updated University',
        degree: 'Master',
        major: 'Data Science',
        startDate: '2021-01-01',
        endDate: '2023-01-01',
        gpa: '3.8',
        honors: 'Cum Laude'
      };

      const response = await request(app)
        .put(`/api/cv-parser/education/${educationId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.university).toBe('Updated University');
      expect(response.body.data.degree).toBe('Master');
      expect(response.body.data.gpa).toBe('3.8');
    });

    it('should return 404 for non-existent education entry', async () => {
      const response = await request(app)
        .put('/api/cv-parser/education/99999')
        .set('Cookie', authCookie)
        .send({
          university: 'Test',
          degree: 'Test',
          major: 'Test'
        })
        .expect(404);

      expect(response.body.error).toBe('Education entry not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/cv-parser/education/${educationId}`)
        .send({
          university: 'Test',
          degree: 'Test',
          major: 'Test'
        })
        .expect(401);
    });
  });

  describe('PUT /api/cv-parser/work-experience/:id', () => {
    let workId: number;

    beforeEach(async () => {
      // Create test work experience entry
      const result = await db.insert(cvWorkExperienceData).values({
        userId: testUserId,
        organization: 'Test Company',
        position: 'Software Engineer',
        location: 'New York, NY',
        startDate: new Date('2022-01-01'),
        endDate: new Date('2024-01-01'),
        isCurrent: false,
      }).returning();
      
      workId = result[0].id;
    });

    it('should update work experience entry successfully', async () => {
      const updateData = {
        organization: 'Updated Company',
        position: 'Senior Engineer',
        location: 'San Francisco, CA',
        startDate: '2021-01-01',
        endDate: null,
        isCurrent: true,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/cv-parser/work-experience/${workId}`)
        .set('Cookie', authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.organization).toBe('Updated Company');
      expect(response.body.data.isCurrent).toBe(true);
    });

    it('should return 404 for non-existent work entry', async () => {
      const response = await request(app)
        .put('/api/cv-parser/work-experience/99999')
        .set('Cookie', authCookie)
        .send({
          organization: 'Test',
          position: 'Test'
        })
        .expect(404);

      expect(response.body.error).toBe('Work experience entry not found');
    });
  });

  describe('DELETE /api/cv-parser/education/:id', () => {
    let educationId: number;

    beforeEach(async () => {
      const result = await db.insert(cvEducationData).values({
        userId: testUserId,
        university: 'Test University',
        degree: 'Bachelor',
        major: 'Computer Science',
      }).returning();
      
      educationId = result[0].id;
    });

    it('should delete education entry successfully', async () => {
      const response = await request(app)
        .delete(`/api/cv-parser/education/${educationId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Education entry deleted');

      // Verify entry is deleted
      const entries = await db.query.cvEducationData.findMany({
        where: eq(cvEducationData.id, educationId)
      });
      expect(entries).toHaveLength(0);
    });

    it('should return 404 for non-existent entry', async () => {
      await request(app)
        .delete('/api/cv-parser/education/99999')
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  describe('DELETE /api/cv-parser/work-experience/:id', () => {
    let workId: number;

    beforeEach(async () => {
      const result = await db.insert(cvWorkExperienceData).values({
        userId: testUserId,
        organization: 'Test Company',
        position: 'Software Engineer',
      }).returning();
      
      workId = result[0].id;
    });

    it('should delete work experience entry successfully', async () => {
      const response = await request(app)
        .delete(`/api/cv-parser/work-experience/${workId}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Work experience entry deleted');

      // Verify entry is deleted
      const entries = await db.query.cvWorkExperienceData.findMany({
        where: eq(cvWorkExperienceData.id, workId)
      });
      expect(entries).toHaveLength(0);
    });
  });
});