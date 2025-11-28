import { TherapistRepository, TherapistPHIRepository, OrganizationMembershipRepository } from '../repositories';
import { encryptPHI, decryptPHI, createSearchHash } from '../utils/phi-encryption';
import { AuditLogRepository } from '../repositories';

/**
 * Therapist Service
 * 
 * Handles therapist management with HIPAA compliance and organization-aware access control
 */

export class TherapistService {
  /**
   * Get therapist profile by user ID
   */
  static async getTherapistProfile(userId: number, requestingUserId: number): Promise<any | null> {
    const therapist = await TherapistRepository.findByUserId(userId);
    
    if (!therapist) {
      return null;
    }

    // Check if requesting user can access this therapist's data
    const canAccess = await this.canUserAccessTherapist(requestingUserId, therapist);
    
    if (!canAccess) {
      throw new Error('Insufficient permissions to access therapist profile');
    }

    // Log access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'READ',
      resourceType: 'THERAPIST_PROFILE',
      resourceId: therapist.id,
      securityLevel: 'standard',
      riskScore: 10,
      hipaaCompliant: true,
    });

    return therapist;
  }

  /**
   * Get therapist PHI by user ID
   */
  static async getTherapistPHI(userId: number, requestingUserId: number): Promise<any | null> {
    const therapistPHI = await TherapistPHIRepository.findByUserId(userId);
    
    if (!therapistPHI) {
      return null;
    }

    // Check if requesting user can access this therapist's PHI
    const canAccess = await this.canUserAccessTherapistPHI(requestingUserId, userId);
    
    if (!canAccess) {
      throw new Error('Insufficient permissions to access therapist PHI');
    }

    // Decrypt PHI
    const decryptedPHI = this.decryptTherapistPHI(therapistPHI);

    // Log PHI access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'PHI_ACCESS',
      resourceType: 'THERAPIST_PHI',
      resourceId: therapistPHI.id,
      fieldsAccessed: Object.keys(decryptedPHI).filter(key => key.includes('Encrypted')),
      phiFieldsCount: Object.keys(decryptedPHI).filter(key => key.includes('Encrypted')).length,
      securityLevel: 'phi-protected',
      riskScore: 50,
      hipaaCompliant: true,
    });

    return decryptedPHI;
  }

  /**
   * Create therapist profile
   */
  static async createTherapistProfile(data: {
    userId: number;
    name: string;
    professionalTitle?: string;
    licenseNumber?: string;
    licenseState?: string;
    licenseExpirationDate?: Date;
    npiNumber?: string;
    taxonomyCode?: string;
    specialties?: string[];
    languages?: string[];
    sessionFormat?: string;
    baseRate?: number;
    slidingScale?: boolean;
    groupSessionRate?: number;
    therapistIdentities?: string[];
    businessPhone?: string;
    businessEmail?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessZip?: string;
    cvFilename?: string;
    cvOriginalName?: string;
    cvMimeType?: string;
    cvParsedForCredentialing?: boolean;
    defaultNoteFormat?: string;
    sessionDuration?: number;
    timeZone?: string;
    isInsuranceProvider?: boolean;
    acceptedProviders?: string[];
    stripeConnectAccountId?: string;
    stripeConnectOnboardingComplete?: boolean;
    stripeConnectChargesEnabled?: boolean;
    stripeConnectPayoutsEnabled?: boolean;
    stripeConnectDetailsSubmitted?: boolean;
    stripeConnectCardIssuingEnabled?: boolean;
  }, requestingUserId: number): Promise<any> {
    const profile = await TherapistRepository.create(data);

    // Log profile creation
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'CREATE',
      resourceType: 'THERAPIST_PROFILE',
      resourceId: profile.id,
      securityLevel: 'standard',
      riskScore: 20,
      hipaaCompliant: true,
    });

    return profile;
  }

  /**
   * Update therapist profile
   */
  static async updateTherapistProfile(profileId: number, data: any, requestingUserId: number): Promise<any> {
    const updatedProfile = await TherapistRepository.update(profileId, data);

    if (updatedProfile) {
      // Log profile update
      await AuditLogRepository.create({
        userId: requestingUserId,
        action: 'UPDATE',
        resourceType: 'THERAPIST_PROFILE',
        resourceId: profileId,
        securityLevel: 'standard',
        riskScore: 20,
        hipaaCompliant: true,
      });
    }

    return updatedProfile;
  }

  /**
   * Create therapist PHI
   */
  static async createTherapistPHI(data: {
    userId: number;
    ssn?: string;
    dob?: string;
    homeAddress?: string;
    homeCity?: string;
    homeState?: string;
    homeZip?: string;
    personalPhone?: string;
    personalEmail?: string;
    birthCity?: string;
    birthState?: string;
    birthCountry?: string;
    isUsCitizen?: boolean;
    workPermitVisa?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
  }, requestingUserId: number): Promise<any> {
    // Encrypt all PHI fields
    const encryptedData = {
      userId: data.userId,
      therapistSsnEncrypted: data.ssn ? encryptPHI(data.ssn) : null,
      therapistDobEncrypted: data.dob ? encryptPHI(data.dob) : null,
      therapistHomeAddressEncrypted: data.homeAddress ? encryptPHI(data.homeAddress) : null,
      therapistHomeCityEncrypted: data.homeCity ? encryptPHI(data.homeCity) : null,
      therapistHomeStateEncrypted: data.homeState ? encryptPHI(data.homeState) : null,
      therapistHomeZipEncrypted: data.homeZip ? encryptPHI(data.homeZip) : null,
      therapistPersonalPhoneEncrypted: data.personalPhone ? encryptPHI(data.personalPhone) : null,
      therapistPersonalEmailEncrypted: data.personalEmail ? encryptPHI(data.personalEmail) : null,
      therapistBirthCityEncrypted: data.birthCity ? encryptPHI(data.birthCity) : null,
      therapistBirthStateEncrypted: data.birthState ? encryptPHI(data.birthState) : null,
      therapistBirthCountryEncrypted: data.birthCountry ? encryptPHI(data.birthCountry) : null,
      therapistIsUsCitizen: data.isUsCitizen,
      therapistWorkPermitVisaEncrypted: data.workPermitVisa ? encryptPHI(data.workPermitVisa) : null,
      therapistEmergencyContactNameEncrypted: data.emergencyContactName ? encryptPHI(data.emergencyContactName) : null,
      therapistEmergencyContactPhoneEncrypted: data.emergencyContactPhone ? encryptPHI(data.emergencyContactPhone) : null,
      therapistEmergencyContactRelationshipEncrypted: data.emergencyContactRelationship ? encryptPHI(data.emergencyContactRelationship) : null,
      
      // Search hashes
      therapistPersonalPhoneSearchHash: data.personalPhone ? createSearchHash(data.personalPhone) : null,
      therapistPersonalEmailSearchHash: data.personalEmail ? createSearchHash(data.personalEmail) : null,
    };

    const phi = await TherapistPHIRepository.create(encryptedData);

    // Log PHI creation
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'CREATE',
      resourceType: 'THERAPIST_PHI',
      resourceId: phi.id,
      fieldsAccessed: Object.keys(data).filter(key => 
        ['ssn', 'dob', 'homeAddress', 'personalPhone', 'personalEmail', 'birthCity', 'emergencyContactName'].includes(key)
      ),
      phiFieldsCount: Object.keys(data).filter(key => 
        ['ssn', 'dob', 'homeAddress', 'personalPhone', 'personalEmail', 'birthCity', 'emergencyContactName'].includes(key)
      ).length,
      securityLevel: 'phi-protected',
      riskScore: 60,
      hipaaCompliant: true,
    });

    return phi;
  }

  /**
   * Update therapist PHI
   */
  static async updateTherapistPHI(userId: number, data: any, requestingUserId: number): Promise<any> {
    // Check if requesting user can update this therapist's PHI
    const canAccess = await this.canUserAccessTherapistPHI(requestingUserId, userId);
    
    if (!canAccess) {
      throw new Error('Insufficient permissions to update therapist PHI');
    }

    // Encrypt PHI fields if provided
    const encryptedData: any = {};
    const phiFields = [
      'ssn', 'dob', 'homeAddress', 'homeCity', 'homeState', 'homeZip',
      'personalPhone', 'personalEmail', 'birthCity', 'birthState', 'birthCountry',
      'workPermitVisa', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship'
    ];

    for (const field of phiFields) {
      if (data[field] !== undefined) {
        const encryptedFieldName = `therapist${field.charAt(0).toUpperCase() + field.slice(1)}Encrypted`;
        encryptedData[encryptedFieldName] = data[field] ? encryptPHI(data[field]) : null;
        
        // Update search hashes for contact fields
        if (field === 'personalPhone' || field === 'personalEmail') {
          const searchHashFieldName = `therapist${field.charAt(0).toUpperCase() + field.slice(1)}SearchHash`;
          encryptedData[searchHashFieldName] = data[field] ? createSearchHash(data[field]) : null;
        }
      }
    }

    // Handle non-encrypted fields
    if (data.isUsCitizen !== undefined) {
      encryptedData.therapistIsUsCitizen = data.isUsCitizen;
    }

    const updatedPHI = await TherapistPHIRepository.update(userId, encryptedData);

    // Log PHI update
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'UPDATE',
      resourceType: 'THERAPIST_PHI',
      resourceId: updatedPHI?.id,
      fieldsAccessed: Object.keys(data).filter(key => phiFields.includes(key)),
      phiFieldsCount: Object.keys(data).filter(key => phiFields.includes(key)).length,
      securityLevel: 'phi-protected',
      riskScore: 50,
      hipaaCompliant: true,
    });

    return updatedPHI;
  }

  /**
   * Get all therapists in organization
   */
  static async getTherapistsInOrganization(organizationId: number, requestingUserId: number): Promise<any[]> {
    // Check if requesting user can view organization therapists
    const membership = await OrganizationMembershipRepository.findByUserAndOrganization(requestingUserId, organizationId);
    
    if (!membership || (!membership.canViewAllPatients && !membership.canManageStaff)) {
      throw new Error('Insufficient permissions to view organization therapists');
    }

    const therapists = await TherapistRepository.findByOrganization(organizationId);

    // Log access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'READ',
      resourceType: 'THERAPIST_PROFILE',
      securityLevel: 'standard',
      riskScore: 20,
      hipaaCompliant: true,
    });

    return therapists;
  }

  /**
   * Check if user can access therapist data
   */
  private static async canUserAccessTherapist(requestingUserId: number, therapist: any): Promise<boolean> {
    // Users can always access their own profile
    if (therapist.userId === requestingUserId) {
      return true;
    }

    // Check organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    for (const membership of memberships) {
      // Business owners can view all therapists in their organization
      if (membership.canViewAllPatients) {
        return true;
      }
      
      // Admins can view selected therapists
      if (membership.canViewSelectedPatients && membership.canViewSelectedPatients.includes(therapist.userId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if user can access therapist PHI
   */
  private static async canUserAccessTherapistPHI(requestingUserId: number, therapistUserId: number): Promise<boolean> {
    // Users can always access their own PHI
    if (therapistUserId === requestingUserId) {
      return true;
    }

    // Check organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    for (const membership of memberships) {
      // Business owners can view all therapist PHI in their organization
      if (membership.canViewAllPatients) {
        return true;
      }
      
      // Admins can view selected therapist PHI
      if (membership.canViewSelectedPatients && membership.canViewSelectedPatients.includes(therapistUserId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Decrypt therapist PHI for display
   */
  private static decryptTherapistPHI(phi: any): any {
    const decryptedPHI = { ...phi };
    
    // Decrypt all encrypted fields
    const encryptedFields = [
      'therapistSsnEncrypted', 'therapistDobEncrypted', 'therapistHomeAddressEncrypted',
      'therapistHomeCityEncrypted', 'therapistHomeStateEncrypted', 'therapistHomeZipEncrypted',
      'therapistPersonalPhoneEncrypted', 'therapistPersonalEmailEncrypted',
      'therapistBirthCityEncrypted', 'therapistBirthStateEncrypted', 'therapistBirthCountryEncrypted',
      'therapistWorkPermitVisaEncrypted', 'therapistEmergencyContactNameEncrypted',
      'therapistEmergencyContactPhoneEncrypted', 'therapistEmergencyContactRelationshipEncrypted'
    ];

    for (const field of encryptedFields) {
      if (phi[field]) {
        const decryptedFieldName = field.replace('Encrypted', '');
        decryptedPHI[decryptedFieldName] = decryptPHI(phi[field]);
      }
    }

    return decryptedPHI;
  }
}
