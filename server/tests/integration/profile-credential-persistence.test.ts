import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { db } from '@db';
import * as hipaaSchema from "@db/schema-hipaa-refactored";
import { eq } from 'drizzle-orm';
import { decryptPHI } from '../../utils/phi-encryption';

const { usersAuth, therapistProfiles, therapistPHI } = hipaaSchema;

describe('Profile Credential Persistence Integration - CRITICAL BUG FIX', () => {
  let authCookie: string;
  let testUserId: number;
  let testUsername: string;

  beforeEach(async () => {
    // Create unique test user
    testUsername = `credtest_${Date.now()}`;
    const testUser = {
      username: testUsername,
      password: 'SecurePass123!',
      email: `${testUsername}@test.com`,
    };

    // Register user
    const registerResponse = await request(app)
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
    try {
      await db.delete(therapistPHI).where(eq(therapistPHI.userId, testUserId));
      await db.delete(therapistProfiles).where(eq(therapistProfiles.userId, testUserId));
      await db.delete(usersAuth).where(eq(usersAuth.id, testUserId));
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('SSN Field Persistence', () => {
    it('should persist and retrieve SSN correctly', async () => {
      const testSSN = '123-45-6789';

      // Save SSN
      const saveResponse = await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ ssnEncrypted: testSSN })
        .expect(200);

      // Retrieve profile
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      // Verify SSN persisted
      expect(getResponse.body.ssnEncrypted).toBe(testSSN);
    });

    it('should encrypt SSN in database', async () => {
      const testSSN = '987-65-4321';

      // Save SSN
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ ssnEncrypted: testSSN })
        .expect(200);

      // Query database directly
      const [phiRecord] = await db
        .select()
        .from(therapistPHI)
        .where(eq(therapistPHI.userId, testUserId))
        .limit(1);

      // Verify encrypted in database
      expect(phiRecord).toBeDefined();
      expect(phiRecord.therapistSsnEncrypted).not.toBe(testSSN);
      expect(phiRecord.therapistSsnEncrypted).toMatch(/^v1:/);

      // Verify decryption works
      const decrypted = decryptPHI(phiRecord.therapistSsnEncrypted);
      expect(decrypted).toBe(testSSN);
    });

    it('should handle SSN updates', async () => {
      const originalSSN = '111-11-1111';
      const updatedSSN = '222-22-2222';

      // Save original
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ ssnEncrypted: originalSSN })
        .expect(200);

      // Update
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ ssnEncrypted: updatedSSN })
        .expect(200);

      // Verify updated value
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.ssnEncrypted).toBe(updatedSSN);
    });

    it('should handle clearing SSN', async () => {
      // Save SSN
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ ssnEncrypted: '333-33-3333' })
        .expect(200);

      // Clear SSN
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ ssnEncrypted: null })
        .expect(200);

      // Verify cleared
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.ssnEncrypted).toBeNull();
    });
  });

  describe('Date of Birth Field Persistence', () => {
    it('should persist and retrieve DOB correctly', async () => {
      const testDOB = '1985-01-15';

      // Save DOB
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ dateOfBirthEncrypted: testDOB })
        .expect(200);

      // Retrieve and verify
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.dateOfBirthEncrypted).toBe(testDOB);
    });

    it('should encrypt DOB in database', async () => {
      const testDOB = '1990-12-25';

      // Save DOB
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ dateOfBirthEncrypted: testDOB })
        .expect(200);

      // Query database directly
      const [phiRecord] = await db
        .select()
        .from(therapistPHI)
        .where(eq(therapistPHI.userId, testUserId))
        .limit(1);

      // Verify encrypted
      expect(phiRecord).toBeDefined();
      expect(phiRecord.therapistDobEncrypted).not.toBe(testDOB);
      expect(phiRecord.therapistDobEncrypted).toMatch(/^v1:/);

      // Verify decryption
      const decrypted = decryptPHI(phiRecord.therapistDobEncrypted);
      expect(decrypted).toBe(testDOB);
    });
  });

  describe('NPI Number Field Persistence', () => {
    it('should persist and retrieve NPI correctly', async () => {
      const testNPI = '1234567890';

      // Save NPI
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ npiNumber: testNPI })
        .expect(200);

      // Retrieve and verify
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.npiNumber).toBe(testNPI);
    });

    it('should NOT encrypt NPI in database (public credential)', async () => {
      const testNPI = '9876543210';

      // Save NPI
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ npiNumber: testNPI })
        .expect(200);

      // Query database directly
      const [profileRecord] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, testUserId))
        .limit(1);

      // Verify stored as plaintext (NPI is public data)
      expect(profileRecord).toBeDefined();
      expect(profileRecord.npiNumber).toBe(testNPI);
    });
  });

  describe('Taxonomy Code Field Persistence', () => {
    it('should persist and retrieve Taxonomy Code correctly', async () => {
      const testTaxonomy = '103T00000X';

      // Save Taxonomy
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ taxonomyCode: testTaxonomy })
        .expect(200);

      // Retrieve and verify
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.taxonomyCode).toBe(testTaxonomy);
    });

    it('should NOT encrypt Taxonomy Code in database (public credential)', async () => {
      const testTaxonomy = '103TC0700X';

      // Save Taxonomy
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ taxonomyCode: testTaxonomy })
        .expect(200);

      // Query database directly
      const [profileRecord] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, testUserId))
        .limit(1);

      // Verify stored as plaintext
      expect(profileRecord).toBeDefined();
      expect(profileRecord.taxonomyCode).toBe(testTaxonomy);
    });
  });

  describe('Birth Location Fields Persistence', () => {
    it('should persist and retrieve birth city correctly', async () => {
      const testCity = 'San Francisco';

      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ birthCityEncrypted: testCity })
        .expect(200);

      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.birthCityEncrypted).toBe(testCity);
    });

    it('should persist and retrieve birth state correctly', async () => {
      const testState = 'California';

      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ birthStateEncrypted: testState })
        .expect(200);

      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.birthStateEncrypted).toBe(testState);
    });

    it('should persist and retrieve birth country correctly', async () => {
      const testCountry = 'United States';

      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ birthCountryEncrypted: testCountry })
        .expect(200);

      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.birthCountryEncrypted).toBe(testCountry);
    });

    it('should encrypt birth location fields in database', async () => {
      const birthData = {
        birthCityEncrypted: 'Los Angeles',
        birthStateEncrypted: 'California',
        birthCountryEncrypted: 'USA'
      };

      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(birthData)
        .expect(200);

      // Query database directly
      const [phiRecord] = await db
        .select()
        .from(therapistPHI)
        .where(eq(therapistPHI.userId, testUserId))
        .limit(1);

      // Verify all fields encrypted
      expect(phiRecord).toBeDefined();
      expect(phiRecord.therapistBirthCityEncrypted).toMatch(/^v1:/);
      expect(phiRecord.therapistBirthStateEncrypted).toMatch(/^v1:/);
      expect(phiRecord.therapistBirthCountryEncrypted).toMatch(/^v1:/);

      // Verify decryption
      expect(decryptPHI(phiRecord.therapistBirthCityEncrypted)).toBe(birthData.birthCityEncrypted);
      expect(decryptPHI(phiRecord.therapistBirthStateEncrypted)).toBe(birthData.birthStateEncrypted);
      expect(decryptPHI(phiRecord.therapistBirthCountryEncrypted)).toBe(birthData.birthCountryEncrypted);
    });
  });

  describe('All Credential Fields Together', () => {
    it('should persist all credential fields in a single request', async () => {
      const allCredentials = {
        ssnEncrypted: '555-55-5555',
        dateOfBirthEncrypted: '1988-06-15',
        birthCityEncrypted: 'Seattle',
        birthStateEncrypted: 'Washington',
        birthCountryEncrypted: 'USA',
        npiNumber: '5555555555',
        taxonomyCode: '103T00000X'
      };

      // Save all fields at once
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(allCredentials)
        .expect(200);

      // Retrieve and verify all fields
      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(getResponse.body.ssnEncrypted).toBe(allCredentials.ssnEncrypted);
      expect(getResponse.body.dateOfBirthEncrypted).toBe(allCredentials.dateOfBirthEncrypted);
      expect(getResponse.body.birthCityEncrypted).toBe(allCredentials.birthCityEncrypted);
      expect(getResponse.body.birthStateEncrypted).toBe(allCredentials.birthStateEncrypted);
      expect(getResponse.body.birthCountryEncrypted).toBe(allCredentials.birthCountryEncrypted);
      expect(getResponse.body.npiNumber).toBe(allCredentials.npiNumber);
      expect(getResponse.body.taxonomyCode).toBe(allCredentials.taxonomyCode);
    });

    it('should maintain persistence after multiple page refreshes (simulated)', async () => {
      const testData = {
        ssnEncrypted: '777-77-7777',
        dateOfBirthEncrypted: '1992-03-20',
        npiNumber: '7777777777',
        taxonomyCode: '103TC0700X'
      };

      // Save
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send(testData)
        .expect(200);

      // Simulate multiple "page refreshes" by making multiple GET requests
      for (let i = 0; i < 5; i++) {
        const getResponse = await request(app)
          .get('/api/profile')
          .set('Cookie', authCookie)
          .expect(200);

        expect(getResponse.body.ssnEncrypted).toBe(testData.ssnEncrypted);
        expect(getResponse.body.dateOfBirthEncrypted).toBe(testData.dateOfBirthEncrypted);
        expect(getResponse.body.npiNumber).toBe(testData.npiNumber);
        expect(getResponse.body.taxonomyCode).toBe(testData.taxonomyCode);
      }
    });
  });

  describe('Bug Regression Tests', () => {
    it('should NOT return fields named "ssn" or "dateOfBirth" (old bug)', async () => {
      // This test ensures we don't regress to the old field names
      await request(app)
        .put('/api/profile')
        .set('Cookie', authCookie)
        .send({ 
          ssnEncrypted: '999-99-9999',
          dateOfBirthEncrypted: '1995-12-01'
        })
        .expect(200);

      const getResponse = await request(app)
        .get('/api/profile')
        .set('Cookie', authCookie)
        .expect(200);

      // New field names should exist
      expect(getResponse.body.ssnEncrypted).toBe('999-99-9999');
      expect(getResponse.body.dateOfBirthEncrypted).toBe('1995-12-01');

      // Old field names should NOT exist
      expect(getResponse.body.ssn).toBeUndefined();
      expect(getResponse.body.dateOfBirth).toBeUndefined();
    });
  });
});

