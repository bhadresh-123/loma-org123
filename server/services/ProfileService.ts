import { db, getActiveSchema } from '@db';
import { eq } from 'drizzle-orm';
import { PHIEncryptionService, TherapistService } from './ClinicalService';

/**
 * Profile Service with HIPAA Compliance
 * 
 * Handles therapist profile data with proper PHI separation and encryption
 * This is the consolidated profile service that replaces all legacy implementations
 */
export class ProfileService {
  /**
   * Get complete user profile with decrypted PHI fields
   */
  static async getProfile(userId: number) {
    try {
      console.log(`[PROFILE-SERVICE] Getting profile for user ${userId} with HIPAA schema`);
      
      // Use only HIPAA schema
      return await TherapistService.getProfile(userId);
    } catch (error) {
      console.error(`[PROFILE-SERVICE] Error getting profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update user profile with PHI encryption
   */
  static async updateProfile(userId: number, profileData: any) {
    try {
      console.log(`[PROFILE-SERVICE] Updating profile for user ${userId} with HIPAA schema`);
      
      // Use only HIPAA schema
      return await TherapistService.updateProfile(userId, profileData);
    } catch (error) {
      console.error(`[PROFILE-SERVICE] Error updating profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create new profile with PHI encryption
   */
  static async createProfile(userId: number, profileData: any) {
    try {
      console.log(`[PROFILE-SERVICE] Creating profile for user ${userId} with HIPAA schema`);
      
      // Use only HIPAA schema
      const schema = getActiveSchema();
      const profileData_separated = this.separateProfileData(profileData);
      
      // Create therapist profile (non-PHI)
      const [profile] = await db.insert(schema.therapistProfiles).values({
        userId,
        ...profileData_separated.profile,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Create therapist PHI (encrypted)
      if (Object.keys(profileData_separated.phi).length > 0) {
        const encryptedPHI = PHIEncryptionService.encryptTherapistPHI(profileData_separated.phi);
        
        await db.insert(schema.therapistPHI).values({
          userId,
          ...encryptedPHI,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      console.log(`[PROFILE-SERVICE] Created HIPAA profile for user ${userId}`);
      return profile;
    } catch (error) {
      console.error(`[PROFILE-SERVICE] Error creating profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Separate profile data into business and PHI components
   */
  private static separateProfileData(profileData: any) {
    const phiFields = [
      'ssn',
      'dateOfBirth',
      'personalAddress',
      'personalPhone',
      'personalEmail',
      'birthCity',
      'birthState',
      'birthCountry',
      'workPermitVisa',
      'emergencyContact',
      'emergencyPhone'
    ];

    const profile: any = {};
    const phi: any = {};

    Object.entries(profileData).forEach(([key, value]) => {
      if (phiFields.includes(key)) {
        phi[key] = value;
      } else {
        profile[key] = value;
      }
    });

    return { profile, phi };
  }

  /**
   * Check if profile exists
   */
  static async profileExists(userId: number): Promise<boolean> {
    try {
      // Use only HIPAA schema
      const schema = getActiveSchema();
      const profile = await db.query.therapistProfiles.findFirst({
        where: eq(schema.therapistProfiles.userId, userId)
      });
      return !!profile;
    } catch (error) {
      console.error(`[PROFILE-SERVICE] Error checking profile existence for user ${userId}:`, error);
      return false;
    }
  }
}

