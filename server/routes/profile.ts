import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { db, getActiveSchema } from '../../db';
import { eq } from 'drizzle-orm';
import { usersAuth, therapistProfiles, therapistPHI, organizationMemberships, organizations } from '@db/schema';
import { encryptPHI, decryptPHI } from '../utils/phi-encryption';
import { HIPAAAuditService } from '../services/ClinicalService';

const router = Router();

/**
 * Clean Profile API Routes
 * 
 * Provides a simplified profile interface for the frontend
 * using HIPAA-compliant schema only
 */

// GET /api/profile-clean - Get user profile data
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Profile route called for user:', req.user?.id);
    const userId = req.user!.id;
    const schema = getActiveSchema();
    
    let profileData: Record<string, unknown> = {};
    
    // HIPAA schema: Get data from usersAuth and therapistProfiles
    const [user] = await db
      .select()
      .from(usersAuth)
      .where(eq(usersAuth.id, userId))
      .limit(1);
    
    const [therapistProfile] = await db
      .select()
      .from(therapistProfiles)
      .where(eq(therapistProfiles.userId, userId))
      .limit(1);
    
    console.log('Therapist profile found:', therapistProfile);
    
    // Get therapist PHI data (encrypted fields like SSN, DOB)
    const [therapistPhi] = await db
      .select()
      .from(therapistPHI)
      .where(eq(therapistPHI.userId, userId))
      .limit(1);
    
    // Get organization membership data for practice name
    let organizationMembership = null;
    try {
      console.log('Fetching organization membership for user:', userId);
      
      // First get the membership
      const [membership] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, userId))
        .limit(1);
      
      console.log('Membership found:', membership);
      
      if (membership) {
        // Then get the organization
        const [organization] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, membership.organizationId))
          .limit(1);
        
        console.log('Organization found:', organization);
        
        organizationMembership = {
          ...membership,
          organization: organization
        };
      }
      
      console.log('Final organization membership:', organizationMembership);
    } catch (error) {
      console.warn('Could not fetch organization membership:', error.message);
    }
    
    profileData = {
      id: user?.id,
      username: user?.username,
      email: user?.email,
      name: therapistProfile?.name,
      title: therapistProfile?.professionalTitle,
      license: therapistProfile?.licenseNumber,
      specialties: therapistProfile?.specialties,
      phone: therapistProfile?.therapistBusinessPhone,
      address: therapistProfile?.therapistBusinessAddress,
      city: therapistProfile?.therapistBusinessCity,
      state: therapistProfile?.therapistBusinessState,
      zipcode: therapistProfile?.therapistBusinessZip,
      biography: therapistProfile?.biography,
      yearsOfExperience: therapistProfile?.yearsOfExperience,
      qualifications: therapistProfile?.qualifications,
      languages: therapistProfile?.languages,
      sessionFormat: therapistProfile?.sessionFormat,
      baseRate: therapistProfile?.baseRate,
      slidingScale: therapistProfile?.slidingScale,
      therapistIdentities: therapistProfile?.therapistIdentities,
      stripeConnectAccountId: therapistProfile?.stripeConnectAccountId,
      cvParsedForCredentialing: therapistProfile?.cvParsedForCredentialing,
      defaultNoteFormat: therapistProfile?.defaultNoteFormat || 'SOAP',
      sessionDuration: therapistProfile?.sessionDuration || 50,
      timeZone: therapistProfile?.timeZone || 'America/New_York',
      // Credential fields (non-PHI)
      npiNumber: therapistProfile?.npiNumber || null,
      taxonomyCode: therapistProfile?.taxonomyCode || null,
      // Decrypted PHI fields (frontend expects "Encrypted" suffix for consistency)
      ssnEncrypted: therapistPhi?.therapistSsnEncrypted ? decryptPHI(therapistPhi.therapistSsnEncrypted) : null,
      dateOfBirthEncrypted: therapistPhi?.therapistDobEncrypted ? decryptPHI(therapistPhi.therapistDobEncrypted) : null,
      birthCityEncrypted: therapistPhi?.therapistBirthCityEncrypted ? decryptPHI(therapistPhi.therapistBirthCityEncrypted) : null,
      birthStateEncrypted: therapistPhi?.therapistBirthStateEncrypted ? decryptPHI(therapistPhi.therapistBirthStateEncrypted) : null,
      birthCountryEncrypted: therapistPhi?.therapistBirthCountryEncrypted ? decryptPHI(therapistPhi.therapistBirthCountryEncrypted) : null,
      // Include practice name from organization
      practiceName: organizationMembership?.organization?.name || '',
      // Include organization data for frontend
      organizationId: organizationMembership?.organizationId || null,
      organizationMembershipId: organizationMembership?.id || null,
      organizationMembership: organizationMembership ? {
        ...organizationMembership,
        organization: organizationMembership.organization
      } : null,
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      error: 'PROFILE_FETCH_FAILED',
      message: 'Failed to fetch profile data'
    });
  }
});

// PUT /api/profile-clean - Update user profile data
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const schema = getActiveSchema();
    const updateData = req.body;
    
    // HIPAA schema: Update therapistProfiles table
    const updateFields: Record<string, unknown> = {};
    
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.title) updateFields.professionalTitle = updateData.title;
    if (updateData.license) updateFields.licenseNumber = updateData.license;
    if (updateData.specialties) updateFields.specialties = updateData.specialties;
    if (updateData.phone) updateFields.therapistBusinessPhone = updateData.phone;
    if (updateData.address) updateFields.therapistBusinessAddress = updateData.address;
    if (updateData.city) updateFields.therapistBusinessCity = updateData.city;
    if (updateData.state) updateFields.therapistBusinessState = updateData.state;
    if (updateData.zipcode) updateFields.therapistBusinessZip = updateData.zipcode;
    if (updateData.biography) updateFields.biography = updateData.biography;
    if (updateData.yearsOfExperience) updateFields.yearsOfExperience = updateData.yearsOfExperience;
    if (updateData.qualifications) updateFields.qualifications = updateData.qualifications;
    if (updateData.languages) updateFields.languages = updateData.languages;
    if (updateData.sessionFormat) updateFields.sessionFormat = updateData.sessionFormat;
    if (updateData.baseRate) updateFields.baseRate = updateData.baseRate;
    if (updateData.slidingScale) updateFields.slidingScale = updateData.slidingScale;
    if (updateData.therapistIdentities) updateFields.therapistIdentities = updateData.therapistIdentities;
    if (updateData.defaultNoteFormat) updateFields.defaultNoteFormat = updateData.defaultNoteFormat;
    if (updateData.sessionDuration) updateFields.sessionDuration = updateData.sessionDuration;
    if (updateData.timeZone) updateFields.timeZone = updateData.timeZone;
    
    // Credential fields (non-PHI - stored in therapist_profiles)
    if (updateData.npiNumber !== undefined) updateFields.npiNumber = updateData.npiNumber;
    if (updateData.taxonomyCode !== undefined) updateFields.taxonomyCode = updateData.taxonomyCode;
    
    // Handle practice name update (stored in organization table)
    if (updateData.practiceName) {
      // Get user's organization membership
      const organizationMembership = await db.query.organizationMemberships.findFirst({
        where: eq(organizationMemberships.userId, userId),
        with: {
          organization: true
        }
      });

      if (organizationMembership?.organization) {
        // Update organization name
        await db
          .update(schema.organizations)
          .set({
            name: updateData.practiceName,
            updatedAt: new Date()
          })
          .where(eq(schema.organizations.id, organizationMembership.organization.id));
      }
    }
    
    updateFields.updatedAt = new Date();
    
    await db.update(schema.therapistProfiles)
      .set(updateFields)
      .where(eq(schema.therapistProfiles.userId, userId));
    
    // Handle PHI fields (SSN, DOB) - requires encryption and separate table update
    const phiFieldsToUpdate: Record<string, any> = {};
    const phiFieldsAccessed: string[] = [];
    
    if (updateData.ssnEncrypted !== undefined) {
      phiFieldsToUpdate.therapistSsnEncrypted = updateData.ssnEncrypted 
        ? encryptPHI(updateData.ssnEncrypted) 
        : null;
      phiFieldsAccessed.push('ssn');
      console.log('[Profile] SSN field updated for user', userId);
    }
    
    if (updateData.dateOfBirthEncrypted !== undefined) {
      phiFieldsToUpdate.therapistDobEncrypted = updateData.dateOfBirthEncrypted 
        ? encryptPHI(updateData.dateOfBirthEncrypted) 
        : null;
      phiFieldsAccessed.push('dateOfBirth');
      console.log('[Profile] Date of Birth field updated for user', userId);
    }
    
    if (updateData.birthCityEncrypted !== undefined) {
      phiFieldsToUpdate.therapistBirthCityEncrypted = updateData.birthCityEncrypted 
        ? encryptPHI(updateData.birthCityEncrypted) 
        : null;
      phiFieldsAccessed.push('birthCity');
      console.log('[Profile] Birth City field updated for user', userId);
    }
    
    if (updateData.birthStateEncrypted !== undefined) {
      phiFieldsToUpdate.therapistBirthStateEncrypted = updateData.birthStateEncrypted 
        ? encryptPHI(updateData.birthStateEncrypted) 
        : null;
      phiFieldsAccessed.push('birthState');
      console.log('[Profile] Birth State field updated for user', userId);
    }
    
    if (updateData.birthCountryEncrypted !== undefined) {
      phiFieldsToUpdate.therapistBirthCountryEncrypted = updateData.birthCountryEncrypted 
        ? encryptPHI(updateData.birthCountryEncrypted) 
        : null;
      phiFieldsAccessed.push('birthCountry');
      console.log('[Profile] Birth Country field updated for user', userId);
    }
    
    // If PHI fields were provided, upsert to therapist_phi table
    if (Object.keys(phiFieldsToUpdate).length > 0) {
      phiFieldsToUpdate.updatedAt = new Date();
      
      // Check if therapist_phi record exists
      const existingPhi = await db
        .select()
        .from(therapistPHI)
        .where(eq(therapistPHI.userId, userId))
        .limit(1);
      
      if (existingPhi.length > 0) {
        // Update existing record
        await db.update(therapistPHI)
          .set(phiFieldsToUpdate)
          .where(eq(therapistPHI.userId, userId));
        console.log('[Profile] Updated existing therapist_phi record for user', userId);
      } else {
        // Create new record
        await db.insert(therapistPHI)
          .values({
            userId,
            ...phiFieldsToUpdate,
            createdAt: new Date(),
          });
        console.log('[Profile] Created new therapist_phi record for user', userId);
      }
      
      // Audit log for PHI access (HIPAA compliance)
      try {
        await HIPAAAuditService.logPHIAccess({
          userId,
          action: 'UPDATE',
          resourceType: 'THERAPIST_PHI',
          resourceId: userId,
          fieldsAccessed: phiFieldsAccessed,
          phiFieldsCount: phiFieldsAccessed.length,
          securityLevel: 'phi-protected',
          riskScore: 50,
          hipaaCompliant: true,
        });
        console.log('[Profile] PHI update logged to audit trail');
      } catch (auditError) {
        console.error('[Profile] Failed to log PHI update to audit trail:', auditError);
        // Don't fail the request if audit logging fails
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      error: 'PROFILE_UPDATE_FAILED',
      message: 'Failed to update profile data'
    });
  }
});

export default router;
