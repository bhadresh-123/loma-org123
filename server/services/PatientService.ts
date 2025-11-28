import { PatientRepository, OrganizationMembershipRepository, ClinicalSessionRepository, PatientTreatmentPlanRepository } from '../repositories';
import { encryptPHI, decryptPHI, createSearchHash } from '../utils/phi-encryption';
import { AuditLogRepository } from '../repositories';

/**
 * Patient Service
 * 
 * Handles patient management with HIPAA compliance and organization-aware access control
 */

export class PatientService {
  /**
   * Get all patients for a therapist (with access control)
   */
  static async getPatientsForTherapist(therapistId: number, requestingUserId: number): Promise<any[]> {
    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(requestingUserId);
    
    if (memberships.length === 0) {
      return [];
    }

    const allPatients: any[] = [];

    for (const membership of memberships) {
      if (membership.canViewAllPatients) {
        // Business owner - can see all patients in organization
        const orgPatients = await PatientRepository.findByOrganization(membership.organizationId);
        allPatients.push(...orgPatients);
      } else if (membership.canViewSelectedPatients && membership.canViewSelectedPatients.includes(therapistId)) {
        // Admin - can see selected therapist's patients
        const therapistPatients = await PatientRepository.findByTherapist(therapistId);
        allPatients.push(...therapistPatients);
      } else if (membership.role === 'therapist' && therapistId === requestingUserId) {
        // Therapist - can only see their own patients
        const ownPatients = await PatientRepository.findByTherapist(therapistId);
        allPatients.push(...ownPatients);
      }
    }

    // Decrypt PHI for each patient
    const decryptedPatients = allPatients.map(patient => this.decryptPatientPHI(patient));

    // Log PHI access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'PHI_ACCESS',
      resourceType: 'PATIENT',
      fieldsAccessed: Object.keys(decryptedPatients[0] || {}).filter(key => key.includes('Encrypted')),
      phiFieldsCount: Object.keys(decryptedPatients[0] || {}).filter(key => key.includes('Encrypted')).length,
      securityLevel: 'phi-protected',
      riskScore: 40,
      hipaaCompliant: true,
    });

    return decryptedPatients;
  }

  /**
   * Get specific patient (with access control)
   */
  static async getPatient(patientId: number, requestingUserId: number): Promise<any | null> {
    const patient = await PatientRepository.findById(patientId);
    
    if (!patient) {
      return null;
    }

    // Check access permissions
    const canAccess = await this.canUserAccessPatient(requestingUserId, patient);
    
    if (!canAccess) {
      throw new Error('Insufficient permissions to access patient');
    }

    const decryptedPatient = this.decryptPatientPHI(patient);

    // Log PHI access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'PHI_ACCESS',
      resourceType: 'PATIENT',
      resourceId: patientId,
      fieldsAccessed: Object.keys(decryptedPatient).filter(key => key.includes('Encrypted')),
      phiFieldsCount: Object.keys(decryptedPatient).filter(key => key.includes('Encrypted')).length,
      securityLevel: 'phi-protected',
      riskScore: 50,
      hipaaCompliant: true,
    });

    return decryptedPatient;
  }

  /**
   * Create new patient
   */
  static async createPatient(data: {
    organizationId: number;
    primaryTherapistId: number;
    assignedTherapistIds?: number[];
    name: string;
    status?: string;
    type?: string;
    contactEmail?: string;
    contactPhone?: string;
    homeAddress?: string;
    homeCity?: string;
    homeState?: string;
    homeZip?: string;
    dob?: string;
    gender?: string;
    race?: string;
    ethnicity?: string;
    pronouns?: string;
    hometown?: string;
    clinicalNotes?: string;
    diagnosisCodes?: string;
    primaryDiagnosis?: string;
    secondaryDiagnosis?: string;
    tertiaryDiagnosis?: string;
    medicalHistory?: string;
    treatmentHistory?: string;
    referringPhysician?: string;
    referringPhysicianNpi?: string;
    insuranceProvider?: string;
    insuranceInfo?: string;
    memberId?: string;
    groupNumber?: string;
    primaryInsuredName?: string;
    primaryInsuredDob?: string;
    authorizationInfo?: string;
    priorAuthNumber?: string;
    billingType?: string;
    sessionCost?: number;
    noShowFee?: number;
    copayAmount?: number;
    deductibleAmount?: number;
    defaultCptCode?: string;
    placeOfService?: string;
    authorizationRequired?: boolean;
    photoFilename?: string;
    photoOriginalName?: string;
    photoMimeType?: string;
    stripeCustomerId?: string;
  }, requestingUserId: number): Promise<any> {
    console.log('=== PatientService.createPatient START ===');
    console.log('Requesting user ID:', requestingUserId);
    
    // Encrypt all PHI fields - only include fields that exist in the database
    const encryptedData: any = {
      organizationId: data.organizationId,
      primaryTherapistId: data.primaryTherapistId,
      assignedTherapistIds: data.assignedTherapistIds || [],
      name: data.name,
      patientNameSearchHash: data.name ? createSearchHash(data.name) : null,
      status: data.status || 'active',
      type: data.type || 'individual',
      
      // Non-PHI fields
      billingType: data.billingType || 'private_pay',
      sessionCost: data.sessionCost,
      noShowFee: data.noShowFee,
      copayAmount: data.copayAmount,
      deductibleAmount: data.deductibleAmount,
      defaultCptCode: data.defaultCptCode,
      placeOfService: data.placeOfService || '11',
      authorizationRequired: data.authorizationRequired || false,
      stripeCustomerId: data.stripeCustomerId,
    };

    // Add encrypted PHI fields only if they have values
    if (data.contactEmail) {
      encryptedData.patientContactEmailEncrypted = encryptPHI(data.contactEmail);
      encryptedData.patientContactEmailSearchHash = createSearchHash(data.contactEmail);
    }
    if (data.contactPhone) {
      encryptedData.patientContactPhoneEncrypted = encryptPHI(data.contactPhone);
      encryptedData.patientContactPhoneSearchHash = createSearchHash(data.contactPhone);
    }
    if (data.homeAddress) encryptedData.patientHomeAddressEncrypted = encryptPHI(data.homeAddress);
    if (data.homeCity) encryptedData.patientHomeCityEncrypted = encryptPHI(data.homeCity);
    if (data.homeState) encryptedData.patientHomeStateEncrypted = encryptPHI(data.homeState);
    if (data.homeZip) encryptedData.patientHomeZipEncrypted = encryptPHI(data.homeZip);
    if (data.dob) encryptedData.patientDobEncrypted = encryptPHI(data.dob);
    if (data.gender) encryptedData.patientGenderEncrypted = encryptPHI(data.gender);
    if (data.race) encryptedData.patientRaceEncrypted = encryptPHI(data.race);
    if (data.ethnicity) encryptedData.patientEthnicityEncrypted = encryptPHI(data.ethnicity);
    if (data.pronouns) encryptedData.patientPronounsEncrypted = encryptPHI(data.pronouns);
    if (data.hometown) encryptedData.patientHometownEncrypted = encryptPHI(data.hometown);
    if (data.clinicalNotes) encryptedData.patientClinicalNotesEncrypted = encryptPHI(data.clinicalNotes);
    if (data.diagnosisCodes) encryptedData.patientDiagnosisCodesEncrypted = encryptPHI(data.diagnosisCodes);
    if (data.primaryDiagnosis) encryptedData.patientPrimaryDiagnosisEncrypted = encryptPHI(data.primaryDiagnosis);
    if (data.secondaryDiagnosis) encryptedData.patientSecondaryDiagnosisEncrypted = encryptPHI(data.secondaryDiagnosis);
    if (data.tertiaryDiagnosis) encryptedData.patientTertiaryDiagnosisEncrypted = encryptPHI(data.tertiaryDiagnosis);
    if (data.medicalHistory) encryptedData.patientMedicalHistoryEncrypted = encryptPHI(data.medicalHistory);
    if (data.treatmentHistory) encryptedData.patientTreatmentHistoryEncrypted = encryptPHI(data.treatmentHistory);
    if (data.referringPhysician) encryptedData.patientReferringPhysicianEncrypted = encryptPHI(data.referringPhysician);
    if (data.referringPhysicianNpi) encryptedData.patientReferringPhysicianNpiEncrypted = encryptPHI(data.referringPhysicianNpi);
    if (data.insuranceProvider) encryptedData.patientInsuranceProviderEncrypted = encryptPHI(data.insuranceProvider);
    if (data.insuranceInfo) encryptedData.patientInsuranceInfoEncrypted = encryptPHI(data.insuranceInfo);
    if (data.memberId) encryptedData.patientMemberIdEncrypted = encryptPHI(data.memberId);
    if (data.groupNumber) encryptedData.patientGroupNumberEncrypted = encryptPHI(data.groupNumber);
    if (data.primaryInsuredName) encryptedData.patientPrimaryInsuredNameEncrypted = encryptPHI(data.primaryInsuredName);
    if (data.primaryInsuredDob) encryptedData.patientPrimaryInsuredDobEncrypted = encryptPHI(data.primaryInsuredDob);
    if (data.authorizationInfo) encryptedData.patientAuthorizationInfoEncrypted = encryptPHI(data.authorizationInfo);
    if (data.priorAuthNumber) encryptedData.patientPriorAuthNumberEncrypted = encryptPHI(data.priorAuthNumber);
    
    // Add file fields if provided
    if (data.photoFilename) encryptedData.patientPhotoFilename = data.photoFilename;
    if (data.photoOriginalName) encryptedData.patientPhotoOriginalName = data.photoOriginalName;
    if (data.photoMimeType) encryptedData.patientPhotoMimeType = data.photoMimeType;

    console.log('About to call PatientRepository.create...');
    
    const patient = await PatientRepository.create(encryptedData);
    
    console.log('Patient created, ID:', patient?.id);
    console.log('=== PatientService.createPatient END ===');

    // Log patient creation
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'CREATE',
      resourceType: 'PATIENT',
      resourceId: patient.id,
      fieldsAccessed: Object.keys(data).filter(key => 
        ['contactEmail', 'contactPhone', 'homeAddress', 'dob', 'gender', 'race', 'clinicalNotes', 'diagnosisCodes'].includes(key)
      ),
      phiFieldsCount: Object.keys(data).filter(key => 
        ['contactEmail', 'contactPhone', 'homeAddress', 'dob', 'gender', 'race', 'clinicalNotes', 'diagnosisCodes'].includes(key)
      ).length,
      securityLevel: 'phi-protected',
      riskScore: 60,
      hipaaCompliant: true,
    });

    return patient;
  }

  /**
   * Update patient
   */
  static async updatePatient(patientId: number, data: any, requestingUserId: number): Promise<any> {
    // Check access permissions
    const patient = await PatientRepository.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const canAccess = await this.canUserAccessPatient(requestingUserId, patient);
    if (!canAccess) {
      throw new Error('Insufficient permissions to update patient');
    }

    // Encrypt PHI fields if provided
    const encryptedData: any = { ...data };
    
    // Update name search hash if name is being updated
    if (data.name !== undefined) {
      encryptedData.patientNameSearchHash = data.name ? createSearchHash(data.name) : null;
    }
    
    const phiFields = [
      'contactEmail', 'contactPhone', 'homeAddress', 'homeCity', 'homeState', 'homeZip',
      'dob', 'gender', 'race', 'ethnicity', 'pronouns', 'hometown',
      'clinicalNotes', 'diagnosisCodes', 'primaryDiagnosis', 'secondaryDiagnosis', 'tertiaryDiagnosis',
      'medicalHistory', 'treatmentHistory', 'referringPhysician', 'referringPhysicianNpi',
      'insuranceProvider', 'insuranceInfo', 'memberId', 'groupNumber', 'primaryInsuredName',
      'primaryInsuredDob', 'authorizationInfo', 'priorAuthNumber'
    ];

    for (const field of phiFields) {
      if (data[field] !== undefined) {
        const encryptedFieldName = `patient${field.charAt(0).toUpperCase() + field.slice(1)}Encrypted`;
        encryptedData[encryptedFieldName] = data[field] ? encryptPHI(data[field]) : null;
        
        // Update search hashes for contact fields
        if (field === 'contactEmail' || field === 'contactPhone') {
          const searchHashFieldName = `patient${field.charAt(0).toUpperCase() + field.slice(1)}SearchHash`;
          encryptedData[searchHashFieldName] = data[field] ? createSearchHash(data[field]) : null;
        }
        
        delete encryptedData[field];
      }
    }

    const updatedPatient = await PatientRepository.update(patientId, encryptedData);

    // Log patient update
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'UPDATE',
      resourceType: 'PATIENT',
      resourceId: patientId,
      fieldsAccessed: Object.keys(data).filter(key => phiFields.includes(key)),
      phiFieldsCount: Object.keys(data).filter(key => phiFields.includes(key)).length,
      securityLevel: 'phi-protected',
      riskScore: 50,
      hipaaCompliant: true,
    });

    return updatedPatient;
  }

  /**
   * Soft delete patient (HIPAA 7-year retention)
   */
  static async deletePatient(patientId: number, requestingUserId: number): Promise<any> {
    const patient = await PatientRepository.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const canAccess = await this.canUserAccessPatient(requestingUserId, patient);
    if (!canAccess) {
      throw new Error('Insufficient permissions to delete patient');
    }

    const deletedPatient = await PatientRepository.softDelete(patientId);

    // Log patient deletion
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'DELETE',
      resourceType: 'PATIENT',
      resourceId: patientId,
      securityLevel: 'phi-protected',
      riskScore: 70,
      hipaaCompliant: true,
    });

    return deletedPatient;
  }

  /**
   * Search patients by email or phone
   */
  static async searchPatients(searchTerm: string, requestingUserId: number): Promise<any[]> {
    const searchHash = createSearchHash(searchTerm);
    
    // Return empty if search hash couldn't be created
    if (!searchHash) {
      return [];
    }
    
    // Try email search first
    let patient = await PatientRepository.findByEmailHash(searchHash);
    
    // If not found, try phone search
    if (!patient) {
      patient = await PatientRepository.findByPhoneHash(searchHash);
    }

    if (!patient) {
      return [];
    }

    // Check access permissions
    const canAccess = await this.canUserAccessPatient(requestingUserId, patient);
    if (!canAccess) {
      return [];
    }

    const decryptedPatient = this.decryptPatientPHI(patient);

    // Log search access
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'PHI_ACCESS',
      resourceType: 'PATIENT',
      resourceId: patient.id,
      fieldsAccessed: ['patientContactEmailEncrypted', 'patientContactPhoneEncrypted'],
      phiFieldsCount: 2,
      securityLevel: 'phi-protected',
      riskScore: 40,
      hipaaCompliant: true,
    });

    return [decryptedPatient];
  }

  /**
   * Check if user can access patient
   */
  private static async canUserAccessPatient(userId: number, patient: any): Promise<boolean> {
    const memberships = await OrganizationMembershipRepository.findByUserId(userId);
    
    for (const membership of memberships) {
      if (membership.organizationId === patient.organizationId) {
        if (membership.canViewAllPatients) {
          return true; // Business owner
        }
        
        if (membership.canViewSelectedPatients && membership.canViewSelectedPatients.includes(patient.primaryTherapistId)) {
          return true; // Admin with selected access
        }
        
        if (membership.role === 'therapist' && patient.primaryTherapistId === userId) {
          return true; // Own patients
        }
      }
    }
    
    return false;
  }

  /**
   * Decrypt patient PHI for display
   */
  private static decryptPatientPHI(patient: any): any {
    const decryptedPatient = { ...patient };
    
    // Decrypt all encrypted fields
    const encryptedFields = [
      'patientContactEmailEncrypted', 'patientContactPhoneEncrypted', 'patientHomeAddressEncrypted',
      'patientHomeCityEncrypted', 'patientHomeStateEncrypted', 'patientHomeZipEncrypted',
      'patientDobEncrypted', 'patientGenderEncrypted', 'patientRaceEncrypted', 'patientEthnicityEncrypted',
      'patientPronounsEncrypted', 'patientHometownEncrypted', 'patientClinicalNotesEncrypted',
      'patientDiagnosisCodesEncrypted', 'patientPrimaryDiagnosisEncrypted', 'patientSecondaryDiagnosisEncrypted',
      'patientTertiaryDiagnosisEncrypted', 'patientMedicalHistoryEncrypted', 'patientTreatmentHistoryEncrypted',
      'patientReferringPhysicianEncrypted', 'patientReferringPhysicianNpiEncrypted',
      'patientInsuranceProviderEncrypted', 'patientInsuranceInfoEncrypted', 'patientMemberIdEncrypted',
      'patientGroupNumberEncrypted', 'patientPrimaryInsuredNameEncrypted', 'patientPrimaryInsuredDobEncrypted',
      'patientAuthorizationInfoEncrypted', 'patientPriorAuthNumberEncrypted'
    ];

    for (const field of encryptedFields) {
      if (patient[field]) {
        const decryptedFieldName = field.replace('Encrypted', '');
        decryptedPatient[decryptedFieldName] = decryptPHI(patient[field]);
      }
    }

    // Compute age from DOB with HIPAA Safe Harbor rules
    // Ages >89 must be displayed as "90+" per HIPAA de-identification requirements
    if (patient.patientDobEncrypted) {
      const dobString = decryptPHI(patient.patientDobEncrypted);
      if (dobString) {
        try {
          const dob = new Date(dobString);
          const today = new Date();
          
          // Check if date is valid
          if (isNaN(dob.getTime())) {
            console.error('Error computing age from DOB: Invalid date format');
            decryptedPatient.patientAge = null;
          } else {
            let age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            
            // Adjust age if birthday hasn't occurred yet this year
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
              age--;
            }
            
            // Apply HIPAA Safe Harbor rule: ages >89 displayed as "90+"
            decryptedPatient.patientAge = age > 89 ? '90+' : age;
          }
        } catch (error) {
          console.error('Error computing age from DOB:', error);
          decryptedPatient.patientAge = null;
        }
      }
    }

    return decryptedPatient;
  }
}
