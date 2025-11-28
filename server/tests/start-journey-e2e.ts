import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from "@db";
import { usersTable, practitionerProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { log } from '../vite';
import supertest from 'supertest';
import { app } from '../index';

const request = supertest(app);

describe('StartJourney E2E Tests', () => {
  let testUser: Record<string, unknown>;
  let testProfile: Record<string, unknown>;

  const testData = {
    // Step 1: Personal Details
    personalDetails: {
      firstName: "Test",
      lastName: "Therapist",
      email: "test.therapist@example.com",
      phone: "555-0123"
    },
    // Step 2: Practice Details
    practiceDetails: {
      licenseType: "lmft",
      licenseNumber: "MFT12345",
      isProvisional: false,
      licensedStates: ["CA", "NY"],
      practiceFormat: "hybrid"
    },
    // Step 3: Incorporation Details
    incorporationDetails: {
      businessStructure: "llc",
      businessName: "Test Therapy Practice LLC",
      incorporationState: "CA"
    }
  };

  beforeAll(async () => {
    log('Setting up StartJourney E2E test environment...');
    
    try {
      // Create test user
      const [user] = await db.insert(usersTable).values({
        email: testData.personalDetails.email,
        name: `${testData.personalDetails.firstName} ${testData.personalDetails.lastName}`,
        role: 'practitioner'
      }).returning();
      
      testUser = user;
      log('Created test user:', testUser);

    } catch (error) {
      log('Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    log('Cleaning up test data...');
    try {
      if (testProfile?.id) {
        await db.delete(practitionerProfiles)
          .where(eq(practitionerProfiles.id, testProfile.id));
      }
      if (testUser?.id) {
        await db.delete(usersTable)
          .where(eq(usersTable.id, testUser.id));
      }
      log('Test data cleaned up successfully');
    } catch (error) {
      log('Error cleaning up test data:', error);
    }
  });

  describe('Form Submission Flow', () => {
    it('should handle personal details submission', async () => {
      log('Testing personal details submission...');
      
      const response = await request
        .post('/api/onboarding/personal-details')
        .send(testData.personalDetails);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      log('Personal details submission response:', response.body);
    });

    it('should handle practice details submission', async () => {
      log('Testing practice details submission...');
      
      const response = await request
        .post('/api/onboarding/practice-details')
        .send(testData.practiceDetails);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      log('Practice details submission response:', response.body);
    });

    it('should handle incorporation details submission', async () => {
      log('Testing incorporation details submission...');
      
      const response = await request
        .post('/api/onboarding/incorporation-details')
        .send(testData.incorporationDetails);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      log('Incorporation details submission response:', response.body);
    });

    it('should create practitioner profile after complete submission', async () => {
      log('Verifying practitioner profile creation...');
      
      const response = await request
        .get(`/api/practitioners/${testUser.id}/profile`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: `${testData.personalDetails.firstName} ${testData.personalDetails.lastName}`,
        email: testData.personalDetails.email,
        licenseType: testData.practiceDetails.licenseType,
        businessStructure: testData.incorporationDetails.businessStructure
      });
      
      testProfile = response.body;
      log('Practitioner profile verified:', testProfile);
    });
  });

  describe('Form Validation', () => {
    it('should reject invalid personal details', async () => {
      log('Testing invalid personal details validation...');
      
      const response = await request
        .post('/api/onboarding/personal-details')
        .send({
          firstName: "",
          lastName: "",
          email: "invalid-email",
          phone: "123"
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      
      log('Validation response:', response.body);
    });

    it('should reject invalid license information', async () => {
      log('Testing invalid license information validation...');
      
      const response = await request
        .post('/api/onboarding/practice-details')
        .send({
          licenseType: "",
          licenseNumber: "",
          licensedStates: [],
          practiceFormat: "invalid"
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      
      log('Validation response:', response.body);
    });
  });

  describe('Progress Tracking', () => {
    it('should track form completion progress', async () => {
      log('Testing progress tracking...');
      
      const response = await request
        .get(`/api/onboarding/progress/${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('completedSteps');
      expect(response.body).toHaveProperty('currentStep');
      
      log('Progress tracking response:', response.body);
    });
  });
});
