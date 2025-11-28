import crypto from 'crypto';
import { db, getActiveSchema } from '@db';
import { eq, and, desc, asc } from 'drizzle-orm';
import { usersAuth, therapistProfiles, therapistPHI, auditLogsHIPAA } from '@db/schema';

/**
 * Enhanced PHI Encryption Service
 * 
 * Provides HIPAA-compliant encryption with key rotation support
 * Handles all HIPAA schema fields and generates search hashes
 */
export class PHIEncryptionService {
  private static encryptionKey: Buffer | null = null;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_VERSION = 'v2';

  /**
   * Initialize encryption key from environment
   */
  static initializeKey(): Buffer {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    const envKey = process.env.PHI_ENCRYPTION_KEY;
    if (!envKey) {
      throw new Error('PHI_ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    }

    if (envKey.length !== 64) {
      throw new Error('PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }

    this.encryptionKey = Buffer.from(envKey, 'hex');
    return this.encryptionKey;
  }

  /**
   * Encrypt PHI data using AES-256-GCM with versioning
   */
  static encryptPHI(plaintext: string | null): string | null {
    if (!plaintext || plaintext.trim() === '') {
      return null;
    }

    try {
      const key = this.initializeKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return `${this.KEY_VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('PHI encryption failed:', error);
      throw new Error('Failed to encrypt PHI data');
    }
  }

  /**
   * Decrypt PHI data with version handling
   */
  static decryptPHI(ciphertext: string | null): string | null {
    if (!ciphertext || ciphertext.trim() === '') {
      return null;
    }

    try {
      const key = this.initializeKey();
      const parts = ciphertext.split(':');
      
      if (parts.length !== 4) {
        throw new Error('Invalid ciphertext format');
      }

      const [version, ivHex, authTagHex, encrypted] = parts;
      
      if (version !== this.KEY_VERSION) {
        console.warn(`Encryption version mismatch: expected ${this.KEY_VERSION}, got ${version}`);
        // For now, we'll try to decrypt anyway, but in production you might want to handle key rotation
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('PHI decryption failed:', error);
      throw new Error('Failed to decrypt PHI data');
    }
  }

  /**
   * Create search hash for encrypted fields
   */
  static createSearchHash(value: string | null): string | null {
    if (!value || value.trim() === '') {
      return null;
    }

    try {
      return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
    } catch (error) {
      console.error('Search hash creation failed:', error);
      return null;
    }
  }

  /**
   * Encrypt therapist PHI fields with search hash generation
   */
  static encryptTherapistPHI(data: {
    ssn?: string;
    dateOfBirth?: string;
    personalAddress?: string;
    personalPhone?: string;
    personalEmail?: string;
    birthCity?: string;
    birthState?: string;
    birthCountry?: string;
    workPermitVisa?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  }): {
    ssnEncrypted?: string;
    dateOfBirthEncrypted?: string;
    personalAddressEncrypted?: string;
    personalPhoneEncrypted?: string;
    personalEmailEncrypted?: string;
    birthCityEncrypted?: string;
    birthStateEncrypted?: string;
    birthCountryEncrypted?: string;
    workPermitVisaEncrypted?: string;
    emergencyContactEncrypted?: string;
    emergencyPhoneEncrypted?: string;
    personalPhoneSearchHash?: string;
    personalEmailSearchHash?: string;
  } {
    const result: Record<string, string> = {};

    if (data.ssn) {
      result.ssnEncrypted = this.encryptPHI(data.ssn);
    }
    if (data.dateOfBirth) {
      result.dateOfBirthEncrypted = this.encryptPHI(data.dateOfBirth);
    }
    if (data.personalAddress) {
      result.personalAddressEncrypted = this.encryptPHI(data.personalAddress);
    }
    if (data.personalPhone) {
      result.personalPhoneEncrypted = this.encryptPHI(data.personalPhone);
      result.personalPhoneSearchHash = this.createSearchHash(data.personalPhone);
    }
    if (data.personalEmail) {
      result.personalEmailEncrypted = this.encryptPHI(data.personalEmail);
      result.personalEmailSearchHash = this.createSearchHash(data.personalEmail);
    }
    if (data.birthCity) {
      result.birthCityEncrypted = this.encryptPHI(data.birthCity);
    }
    if (data.birthState) {
      result.birthStateEncrypted = this.encryptPHI(data.birthState);
    }
    if (data.birthCountry) {
      result.birthCountryEncrypted = this.encryptPHI(data.birthCountry);
    }
    if (data.workPermitVisa) {
      result.workPermitVisaEncrypted = this.encryptPHI(data.workPermitVisa);
    }
    if (data.emergencyContact) {
      result.emergencyContactEncrypted = this.encryptPHI(data.emergencyContact);
    }
    if (data.emergencyPhone) {
      result.emergencyPhoneEncrypted = this.encryptPHI(data.emergencyPhone);
    }

    return result;
  }

  /**
   * Encrypt client PHI fields with search hash generation
   */
  static encryptClientPHI(data: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    dateOfBirth?: string;
    gender?: string;
    race?: string;
    ethnicity?: string;
    pronouns?: string;
    hometown?: string;
    notes?: string;
    diagnosisCodes?: string;
    treatmentHistory?: string;
    primaryDiagnosisCode?: string;
    secondaryDiagnosisCode?: string;
    referringPhysician?: string;
    referringPhysicianNpi?: string;
    insuranceInfo?: string;
    authorizationInfo?: string;
    priorAuthNumber?: string;
    memberId?: string;
    groupNumber?: string;
    primaryInsuredName?: string;
  }): {
    emailEncrypted?: string;
    phoneEncrypted?: string;
    addressEncrypted?: string;
    cityEncrypted?: string;
    stateEncrypted?: string;
    zipCodeEncrypted?: string;
    dateOfBirthEncrypted?: string;
    genderEncrypted?: string;
    raceEncrypted?: string;
    ethnicityEncrypted?: string;
    pronounsEncrypted?: string;
    hometownEncrypted?: string;
    notesEncrypted?: string;
    diagnosisCodesEncrypted?: string;
    treatmentHistoryEncrypted?: string;
    primaryDiagnosisCodeEncrypted?: string;
    secondaryDiagnosisCodeEncrypted?: string;
    referringPhysicianEncrypted?: string;
    referringPhysicianNpiEncrypted?: string;
    insuranceInfoEncrypted?: string;
    authorizationInfoEncrypted?: string;
    priorAuthNumberEncrypted?: string;
    memberIdEncrypted?: string;
    groupNumberEncrypted?: string;
    primaryInsuredNameEncrypted?: string;
    emailSearchHash?: string;
    phoneSearchHash?: string;
  } {
    const result: Record<string, string> = {};

    if (data.email) {
      result.emailEncrypted = this.encryptPHI(data.email);
      result.emailSearchHash = this.createSearchHash(data.email);
    }
    if (data.phone) {
      result.phoneEncrypted = this.encryptPHI(data.phone);
      result.phoneSearchHash = this.createSearchHash(data.phone);
    }
    if (data.address) {
      result.addressEncrypted = this.encryptPHI(data.address);
    }
    if (data.city) {
      result.cityEncrypted = this.encryptPHI(data.city);
    }
    if (data.state) {
      result.stateEncrypted = this.encryptPHI(data.state);
    }
    if (data.zipCode) {
      result.zipCodeEncrypted = this.encryptPHI(data.zipCode);
    }
    if (data.dateOfBirth) {
      result.dateOfBirthEncrypted = this.encryptPHI(data.dateOfBirth);
    }
    if (data.gender) {
      result.genderEncrypted = this.encryptPHI(data.gender);
    }
    if (data.race) {
      result.raceEncrypted = this.encryptPHI(data.race);
    }
    if (data.ethnicity) {
      result.ethnicityEncrypted = this.encryptPHI(data.ethnicity);
    }
    if (data.pronouns) {
      result.pronounsEncrypted = this.encryptPHI(data.pronouns);
    }
    if (data.hometown) {
      result.hometownEncrypted = this.encryptPHI(data.hometown);
    }
    if (data.notes) {
      result.notesEncrypted = this.encryptPHI(data.notes);
    }
    if (data.diagnosisCodes) {
      result.diagnosisCodesEncrypted = this.encryptPHI(data.diagnosisCodes);
    }
    if (data.treatmentHistory) {
      result.treatmentHistoryEncrypted = this.encryptPHI(data.treatmentHistory);
    }
    if (data.primaryDiagnosisCode) {
      result.primaryDiagnosisCodeEncrypted = this.encryptPHI(data.primaryDiagnosisCode);
    }
    if (data.secondaryDiagnosisCode) {
      result.secondaryDiagnosisCodeEncrypted = this.encryptPHI(data.secondaryDiagnosisCode);
    }
    if (data.referringPhysician) {
      result.referringPhysicianEncrypted = this.encryptPHI(data.referringPhysician);
    }
    if (data.referringPhysicianNpi) {
      result.referringPhysicianNpiEncrypted = this.encryptPHI(data.referringPhysicianNpi);
    }
    if (data.insuranceInfo) {
      result.insuranceInfoEncrypted = this.encryptPHI(data.insuranceInfo);
    }
    if (data.authorizationInfo) {
      result.authorizationInfoEncrypted = this.encryptPHI(data.authorizationInfo);
    }
    if (data.priorAuthNumber) {
      result.priorAuthNumberEncrypted = this.encryptPHI(data.priorAuthNumber);
    }
    if (data.memberId) {
      result.memberIdEncrypted = this.encryptPHI(data.memberId);
    }
    if (data.groupNumber) {
      result.groupNumberEncrypted = this.encryptPHI(data.groupNumber);
    }
    if (data.primaryInsuredName) {
      result.primaryInsuredNameEncrypted = this.encryptPHI(data.primaryInsuredName);
    }

    return result;
  }

  /**
   * Encrypt session PHI fields
   */
  static encryptSessionPHI(data: {
    notes?: string;
    assessments?: string;
    treatmentGoals?: string;
    progressNotes?: string;
  }): {
    notesEncrypted?: string;
    assessmentsEncrypted?: string;
    treatmentGoalsEncrypted?: string;
    progressNotesEncrypted?: string;
  } {
    const result: Record<string, string> = {};

    if (data.notes) {
      result.notesEncrypted = this.encryptPHI(data.notes);
    }
    if (data.assessments) {
      result.assessmentsEncrypted = this.encryptPHI(data.assessments);
    }
    if (data.treatmentGoals) {
      result.treatmentGoalsEncrypted = this.encryptPHI(data.treatmentGoals);
    }
    if (data.progressNotes) {
      result.progressNotesEncrypted = this.encryptPHI(data.progressNotes);
    }

    return result;
  }

  /**
   * Encrypt treatment plan PHI fields
   */
  static encryptTreatmentPlanPHI(data: {
    content?: string;
    goals?: string;
    objectives?: string;
    interventions?: string;
    progressNotes?: string;
  }): {
    contentEncrypted?: string;
    goalsEncrypted?: string;
    objectivesEncrypted?: string;
    interventionsEncrypted?: string;
    progressNotesEncrypted?: string;
  } {
    const result: Record<string, string> = {};

    if (data.content) {
      result.contentEncrypted = this.encryptPHI(data.content);
    }
    if (data.goals) {
      result.goalsEncrypted = this.encryptPHI(data.goals);
    }
    if (data.objectives) {
      result.objectivesEncrypted = this.encryptPHI(data.objectives);
    }
    if (data.interventions) {
      result.interventionsEncrypted = this.encryptPHI(data.interventions);
    }
    if (data.progressNotes) {
      result.progressNotesEncrypted = this.encryptPHI(data.progressNotes);
    }

    return result;
  }

  /**
   * Batch encrypt PHI data for migration
   */
  static batchEncryptPHI(records: Record<string, unknown>[], fieldMappings: Record<string, string>): Record<string, unknown>[] {
    return records.map(record => {
      const encryptedRecord = { ...record };
      
      Object.entries(fieldMappings).forEach(([plainField, encryptedField]) => {
        if (record[plainField]) {
          encryptedRecord[encryptedField] = this.encryptPHI(record[plainField]);
          
          // Generate search hash for email and phone fields
          if (plainField === 'email' || plainField === 'phone' || 
              plainField === 'personalEmail' || plainField === 'personalPhone') {
            const hashField = encryptedField.replace('Encrypted', 'SearchHash');
            encryptedRecord[hashField] = this.createSearchHash(record[plainField]);
          }
          
          // Remove plaintext field
          delete encryptedRecord[plainField];
        }
      });
      
      return encryptedRecord;
    });
  }
}

/**
 * HIPAA Audit Service
 * 
 * Handles comprehensive audit logging for compliance
 */
export class HIPAAAuditService {
  /**
   * Log PHI access with detailed tracking
   */
  static async logPHIAccess(params: {
    userId: number;
    action: string;
    resourceType: string;
    resourceId?: number;
    fieldsAccessed?: string[];
    requestMethod?: string;
    requestPath?: string;
    ipAddress?: string;
    userAgent?: string;
    responseStatus?: number;
    responseTime?: number;
    correlationId?: string;
  }): Promise<void> {
    try {
      const phiFieldsCount = params.fieldsAccessed?.length || 0;
      const dataRetentionDate = new Date();
      dataRetentionDate.setFullYear(dataRetentionDate.getFullYear() + 7); // 7 years retention

      await db.insert(auditLogsHIPAA).values({
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        fieldsAccessed: params.fieldsAccessed || [],
        phiFieldsCount,
        requestMethod: params.requestMethod,
        requestPath: params.requestPath,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        responseStatus: params.responseStatus,
        responseTime: params.responseTime,
        securityLevel: phiFieldsCount > 0 ? 'phi-protected' : 'standard',
        riskScore: this.calculateRiskScore(params),
        hipaaCompliant: true,
        dataRetentionDate,
        correlationId: params.correlationId,
        traceId: crypto.randomUUID(),
      });
    } catch (error) {
      console.error('Failed to log PHI access:', error);
      // Don't throw - audit logging failure shouldn't break the application
    }
  }

  /**
   * Calculate risk score for audit logging
   */
  private static calculateRiskScore(params: {
    action: string;
    fieldsAccessed?: string[];
    responseStatus?: number;
  }): number {
    let score = 0;

    // Base score by action
    const actionScores: Record<string, number> = {
      'CREATE': 10,
      'READ': 5,
      'UPDATE': 15,
      'DELETE': 20,
      'PHI_ACCESS': 25,
      'EXPORT': 30,
    };
    score += actionScores[params.action] || 5;

    // Add score for PHI fields accessed
    if (params.fieldsAccessed) {
      score += params.fieldsAccessed.length * 2;
    }

    // Add score for failed requests
    if (params.responseStatus && params.responseStatus >= 400) {
      score += 10;
    }

    return Math.min(score, 100); // Cap at 100
  }
}

/**
 * Therapist Service
 * 
 * Handles therapist data with proper PHI separation
 */
export class TherapistService {
  /**
   * Get complete therapist profile with decrypted PHI
   */
  static async getProfile(userId: number): Promise<{
    auth: Record<string, unknown>;
    profile: Record<string, unknown> | null;
    phi: Record<string, unknown> | null;
  }> {
    try {
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.usersAuth || !schema.therapistProfiles || !schema.therapistPHI) {
        return { auth: null, profile: null, phi: null };
      }

      // Get authentication data
      const [auth] = await db
        .select()
        .from(usersAuth)
        .where(eq(usersAuth.id, userId))
        .limit(1);

      if (!auth) {
        throw new Error('Therapist not found');
      }

      // Get business profile
      const [profile] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, userId))
        .limit(1);

      // Get PHI data
      const [phi] = await db
        .select()
        .from(therapistPHI)
        .where(eq(therapistPHI.userId, userId))
        .limit(1);

      // Decrypt PHI fields
      const decryptedPHI = phi ? {
        ...phi,
        ssnEncrypted: PHIEncryptionService.decryptPHI(phi.ssnEncrypted),
        dateOfBirthEncrypted: PHIEncryptionService.decryptPHI(phi.dateOfBirthEncrypted),
        personalAddressEncrypted: PHIEncryptionService.decryptPHI(phi.personalAddressEncrypted),
        personalPhoneEncrypted: PHIEncryptionService.decryptPHI(phi.personalPhoneEncrypted),
        personalEmailEncrypted: PHIEncryptionService.decryptPHI(phi.personalEmailEncrypted),
        birthCityEncrypted: PHIEncryptionService.decryptPHI(phi.birthCityEncrypted),
        birthStateEncrypted: PHIEncryptionService.decryptPHI(phi.birthStateEncrypted),
        birthCountryEncrypted: PHIEncryptionService.decryptPHI(phi.birthCountryEncrypted),
        workPermitVisaEncrypted: PHIEncryptionService.decryptPHI(phi.workPermitVisaEncrypted),
        emergencyContactEncrypted: PHIEncryptionService.decryptPHI(phi.emergencyContactEncrypted),
        emergencyPhoneEncrypted: PHIEncryptionService.decryptPHI(phi.emergencyPhoneEncrypted),
      } : null;

      // Log PHI access
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'PHI_ACCESS',
        resourceType: 'THERAPIST',
        fieldsAccessed: phi ? Object.keys(phi).filter(key => key.includes('Encrypted')) : [],
      });

      return {
        auth,
        profile,
        phi: decryptedPHI,
      };
    } catch (error) {
      console.error('Error fetching therapist profile:', error);
      throw error;
    }
  }

  /**
   * Update therapist profile with PHI encryption
   */
  static async updateProfile(userId: number, data: {
    profile?: Record<string, unknown>;
    phi?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.usersAuth || !schema.therapistProfiles || !schema.therapistPHI) {
        return;
      }

      // Update business profile
      if (data.profile) {
        await db.update(schema.therapistProfiles)
          .set({
            ...data.profile,
            updatedAt: new Date(),
          })
          .where(eq(schema.therapistProfiles.userId, userId));
      }

      // Update PHI data with encryption
      if (data.phi) {
        const encryptedPHI: Record<string, string> = {};
        
        // Encrypt PHI fields
        if (data.phi.ssnEncrypted) {
          encryptedPHI.ssnEncrypted = PHIEncryptionService.encryptPHI(data.phi.ssnEncrypted);
        }
        if (data.phi.dateOfBirthEncrypted) {
          encryptedPHI.dateOfBirthEncrypted = PHIEncryptionService.encryptPHI(data.phi.dateOfBirthEncrypted);
        }
        if (data.phi.personalAddressEncrypted) {
          encryptedPHI.personalAddressEncrypted = PHIEncryptionService.encryptPHI(data.phi.personalAddressEncrypted);
        }
        if (data.phi.personalPhoneEncrypted) {
          encryptedPHI.personalPhoneEncrypted = PHIEncryptionService.encryptPHI(data.phi.personalPhoneEncrypted);
          encryptedPHI.personalPhoneSearchHash = PHIEncryptionService.createSearchHash(data.phi.personalPhoneEncrypted);
        }
        if (data.phi.personalEmailEncrypted) {
          encryptedPHI.personalEmailEncrypted = PHIEncryptionService.encryptPHI(data.phi.personalEmailEncrypted);
          encryptedPHI.personalEmailSearchHash = PHIEncryptionService.createSearchHash(data.phi.personalEmailEncrypted);
        }
        if (data.phi.birthCityEncrypted) {
          encryptedPHI.birthCityEncrypted = PHIEncryptionService.encryptPHI(data.phi.birthCityEncrypted);
        }
        if (data.phi.birthStateEncrypted) {
          encryptedPHI.birthStateEncrypted = PHIEncryptionService.encryptPHI(data.phi.birthStateEncrypted);
        }
        if (data.phi.birthCountryEncrypted) {
          encryptedPHI.birthCountryEncrypted = PHIEncryptionService.encryptPHI(data.phi.birthCountryEncrypted);
        }
        if (data.phi.workPermitVisaEncrypted) {
          encryptedPHI.workPermitVisaEncrypted = PHIEncryptionService.encryptPHI(data.phi.workPermitVisaEncrypted);
        }
        if (data.phi.emergencyContactEncrypted) {
          encryptedPHI.emergencyContactEncrypted = PHIEncryptionService.encryptPHI(data.phi.emergencyContactEncrypted);
        }
        if (data.phi.emergencyPhoneEncrypted) {
          encryptedPHI.emergencyPhoneEncrypted = PHIEncryptionService.encryptPHI(data.phi.emergencyPhoneEncrypted);
        }

        // Handle non-encrypted fields
        if (data.phi.isUsCitizen !== undefined) {
          encryptedPHI.isUsCitizen = data.phi.isUsCitizen;
        }

        await db.update(therapistPHI)
          .set({
            ...encryptedPHI,
            updatedAt: new Date(),
          })
          .where(eq(therapistPHI.userId, userId));
      }

      // Log update
      await HIPAAAuditService.logPHIAccess({
        userId,
        action: 'UPDATE',
        resourceType: 'THERAPIST',
        fieldsAccessed: data.phi ? Object.keys(data.phi) : [],
      });

    } catch (error) {
      console.error('Error updating therapist profile:', error);
      throw error;
    }
  }
}

/**
 * Patient Service
 * 
 * Handles patient PHI with comprehensive encryption
 */
export class PatientService {
  /**
   * Get all patients for a therapist with decrypted PHI
   */
  static async getPatients(therapistId: number): Promise<any[]> {
    try {
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.patients) {
        return [];
      }

      const patients = await db.select().from(schema.patients).where(
        and(
          eq(schema.patients.primaryTherapistId, therapistId),
          eq(schema.patients.status, 'active')
        )
      ).orderBy(desc(schema.patients.createdAt));

      // Decrypt PHI fields for all patients
      const decryptedPatients = patients.map(patient => this.decryptPatientPHI(patient));

      // Log PHI access
      await HIPAAAuditService.logPHIAccess({
        userId: therapistId,
        action: 'PHI_ACCESS',
        resourceType: 'CLIENT',
        fieldsAccessed: ['email', 'phone', 'notes', 'demographics'],
      });

      return decryptedPatients;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  }

  /**
   * Get a specific patient with decrypted PHI
   */
  static async getPatient(patientId: number, therapistId: number): Promise<Record<string, unknown> | null> {
    try {
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.patients) {
        return null;
      }

      const results = await db.select().from(schema.patients).where(
        and(
          eq(schema.patients.id, patientId),
          eq(schema.patients.primaryTherapistId, therapistId),
          eq(schema.patients.deleted, false)
        )
      ).limit(1);
      
      const patient = results[0] || null;

      if (!patient) {
        return null;
      }

      const decryptedPatient = this.decryptPatientPHI(patient);

      // Log PHI access
      await HIPAAAuditService.logPHIAccess({
        userId: therapistId,
        action: 'PHI_ACCESS',
        resourceType: 'PATIENT',
        resourceId: patientId,
        fieldsAccessed: Object.keys(patient).filter(key => key.includes('Encrypted')),
      });

      return decryptedPatient;
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw error;
    }
  }

  /**
   * Create a new patient with PHI encryption
   */
  static async createPatient(therapistId: number, patientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    dateOfBirth?: string;
    gender?: string;
    race?: string;
    ethnicity?: string;
    pronouns?: string;
    hometown?: string;
    notes?: string;
    diagnosisCodes?: string;
    treatmentHistory?: string;
    primaryDiagnosisCode?: string;
    secondaryDiagnosisCode?: string;
    referringPhysician?: string;
    referringPhysicianNpi?: string;
    insuranceInfo?: string;
    authorizationInfo?: string;
    priorAuthNumber?: string;
    memberId?: string;
    groupNumber?: string;
    primaryInsuredName?: string;
    status?: string;
    type?: string;
    billingType?: string;
    sessionCost?: number;
    noShowFee?: number;
    defaultCptCode?: string;
    placeOfService?: string;
    authorizationRequired?: boolean;
    copayAmount?: number;
    deductibleAmount?: number;
    stripeCustomerId?: string;
  }): Promise<any> {
    try {
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.patients) {
        console.log('Patients table not available in HIPAA schema - skipping patient creation');
        return null;
      }

      const encryptedData: Record<string, unknown> = {
        primaryTherapistId: therapistId,
        name: patientData.name,
        status: patientData.status || 'active',
        type: patientData.type || 'individual',
        billingType: patientData.billingType || 'private_pay',
        sessionCost: patientData.sessionCost,
        noShowFee: patientData.noShowFee,
        defaultCptCode: patientData.defaultCptCode,
        placeOfService: patientData.placeOfService || '11',
        authorizationRequired: patientData.authorizationRequired || false,
        copayAmount: patientData.copayAmount,
        deductibleAmount: patientData.deductibleAmount,
        stripeCustomerId: patientData.stripeCustomerId,
      };

      // Encrypt all PHI fields
      if (patientData.email) {
        encryptedData.emailEncrypted = PHIEncryptionService.encryptPHI(patientData.email);
        encryptedData.emailSearchHash = PHIEncryptionService.createSearchHash(patientData.email);
      }
      if (patientData.phone) {
        encryptedData.phoneEncrypted = PHIEncryptionService.encryptPHI(patientData.phone);
        encryptedData.phoneSearchHash = PHIEncryptionService.createSearchHash(patientData.phone);
      }
      if (patientData.address) {
        encryptedData.addressEncrypted = PHIEncryptionService.encryptPHI(patientData.address);
      }
      if (patientData.city) {
        encryptedData.cityEncrypted = PHIEncryptionService.encryptPHI(patientData.city);
      }
      if (patientData.state) {
        encryptedData.stateEncrypted = PHIEncryptionService.encryptPHI(patientData.state);
      }
      if (patientData.zipCode) {
        encryptedData.zipCodeEncrypted = PHIEncryptionService.encryptPHI(patientData.zipCode);
      }
      if (patientData.dateOfBirth) {
        encryptedData.dateOfBirthEncrypted = PHIEncryptionService.encryptPHI(patientData.dateOfBirth);
      }
      if (patientData.gender) {
        encryptedData.genderEncrypted = PHIEncryptionService.encryptPHI(patientData.gender);
      }
      if (patientData.race) {
        encryptedData.raceEncrypted = PHIEncryptionService.encryptPHI(patientData.race);
      }
      if (patientData.ethnicity) {
        encryptedData.ethnicityEncrypted = PHIEncryptionService.encryptPHI(patientData.ethnicity);
      }
      if (patientData.pronouns) {
        encryptedData.pronounsEncrypted = PHIEncryptionService.encryptPHI(patientData.pronouns);
      }
      if (patientData.hometown) {
        encryptedData.hometownEncrypted = PHIEncryptionService.encryptPHI(patientData.hometown);
      }
      if (patientData.notes) {
        encryptedData.notesEncrypted = PHIEncryptionService.encryptPHI(patientData.notes);
      }
      if (patientData.diagnosisCodes) {
        encryptedData.diagnosisCodesEncrypted = PHIEncryptionService.encryptPHI(patientData.diagnosisCodes);
      }
      if (patientData.treatmentHistory) {
        encryptedData.treatmentHistoryEncrypted = PHIEncryptionService.encryptPHI(patientData.treatmentHistory);
      }
      if (patientData.primaryDiagnosisCode) {
        encryptedData.primaryDiagnosisCodeEncrypted = PHIEncryptionService.encryptPHI(patientData.primaryDiagnosisCode);
      }
      if (patientData.secondaryDiagnosisCode) {
        encryptedData.secondaryDiagnosisCodeEncrypted = PHIEncryptionService.encryptPHI(patientData.secondaryDiagnosisCode);
      }
      if (patientData.referringPhysician) {
        encryptedData.referringPhysicianEncrypted = PHIEncryptionService.encryptPHI(patientData.referringPhysician);
      }
      if (patientData.referringPhysicianNpi) {
        encryptedData.referringPhysicianNpiEncrypted = PHIEncryptionService.encryptPHI(patientData.referringPhysicianNpi);
      }
      if (patientData.insuranceInfo) {
        encryptedData.insuranceInfoEncrypted = PHIEncryptionService.encryptPHI(patientData.insuranceInfo);
      }
      if (patientData.authorizationInfo) {
        encryptedData.authorizationInfoEncrypted = PHIEncryptionService.encryptPHI(patientData.authorizationInfo);
      }
      if (patientData.priorAuthNumber) {
        encryptedData.priorAuthNumberEncrypted = PHIEncryptionService.encryptPHI(patientData.priorAuthNumber);
      }
      if (patientData.memberId) {
        encryptedData.memberIdEncrypted = PHIEncryptionService.encryptPHI(patientData.memberId);
      }
      if (patientData.groupNumber) {
        encryptedData.groupNumberEncrypted = PHIEncryptionService.encryptPHI(patientData.groupNumber);
      }
      if (patientData.primaryInsuredName) {
        encryptedData.primaryInsuredNameEncrypted = PHIEncryptionService.encryptPHI(patientData.primaryInsuredName);
      }

      const [newPatient] = await db.insert(schema.patients).values(encryptedData).returning();

      // Log creation
      await HIPAAAuditService.logPHIAccess({
        userId: therapistId,
        action: 'CREATE',
        resourceType: 'PATIENT',
        resourceId: newPatient.id,
        fieldsAccessed: Object.keys(patientData).filter(key => 
          ['email', 'phone', 'address', 'dateOfBirth', 'gender', 'race', 'notes', 'diagnosisCodes'].includes(key)
        ),
      });

      return this.decryptPatientPHI(newPatient);
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  /**
   * Decrypt patient PHI fields
   */
  private static decryptPatientPHI(patient: Patient): Patient {
    return {
      ...patient,
      patientContactEmailEncrypted: PHIEncryptionService.decryptPHI(patient.patientContactEmailEncrypted),
      patientContactPhoneEncrypted: PHIEncryptionService.decryptPHI(patient.patientContactPhoneEncrypted),
      patientHomeAddressEncrypted: PHIEncryptionService.decryptPHI(patient.patientHomeAddressEncrypted),
      patientHomeCityEncrypted: PHIEncryptionService.decryptPHI(patient.patientHomeCityEncrypted),
      patientHomeStateEncrypted: PHIEncryptionService.decryptPHI(patient.patientHomeStateEncrypted),
      patientHomeZipEncrypted: PHIEncryptionService.decryptPHI(patient.patientHomeZipEncrypted),
      patientDobEncrypted: PHIEncryptionService.decryptPHI(patient.patientDobEncrypted),
      patientGenderEncrypted: PHIEncryptionService.decryptPHI(patient.patientGenderEncrypted),
      patientRaceEncrypted: PHIEncryptionService.decryptPHI(patient.patientRaceEncrypted),
      patientEthnicityEncrypted: PHIEncryptionService.decryptPHI(patient.patientEthnicityEncrypted),
      patientMaritalStatusEncrypted: PHIEncryptionService.decryptPHI(patient.patientMaritalStatusEncrypted),
      patientOccupationEncrypted: PHIEncryptionService.decryptPHI(patient.patientOccupationEncrypted),
      patientEmployerEncrypted: PHIEncryptionService.decryptPHI(patient.patientEmployerEncrypted),
      patientEmergencyContactNameEncrypted: PHIEncryptionService.decryptPHI(patient.patientEmergencyContactNameEncrypted),
      patientEmergencyContactPhoneEncrypted: PHIEncryptionService.decryptPHI(patient.patientEmergencyContactPhoneEncrypted),
      patientEmergencyContactRelationshipEncrypted: PHIEncryptionService.decryptPHI(patient.patientEmergencyContactRelationshipEncrypted),
      patientInsuranceProviderEncrypted: PHIEncryptionService.decryptPHI(patient.patientInsuranceProviderEncrypted),
      patientInsurancePolicyNumberEncrypted: PHIEncryptionService.decryptPHI(patient.patientInsurancePolicyNumberEncrypted),
      patientInsuranceGroupNumberEncrypted: PHIEncryptionService.decryptPHI(patient.patientInsuranceGroupNumberEncrypted),
      patientCopayAmountEncrypted: PHIEncryptionService.decryptPHI(patient.patientCopayAmountEncrypted),
      patientDeductibleAmountEncrypted: PHIEncryptionService.decryptPHI(patient.patientDeductibleAmountEncrypted),
      patientOutOfPocketMaxEncrypted: PHIEncryptionService.decryptPHI(patient.patientOutOfPocketMaxEncrypted),
      patientPrimaryCarePhysicianNameEncrypted: PHIEncryptionService.decryptPHI(patient.patientPrimaryCarePhysicianNameEncrypted),
      patientPrimaryCarePhysicianPhoneEncrypted: PHIEncryptionService.decryptPHI(patient.patientPrimaryCarePhysicianPhoneEncrypted),
      patientPrimaryCarePhysicianAddressEncrypted: PHIEncryptionService.decryptPHI(patient.patientPrimaryCarePhysicianAddressEncrypted),
      patientPsychiatristNameEncrypted: PHIEncryptionService.decryptPHI(patient.patientPsychiatristNameEncrypted),
      patientPsychiatristPhoneEncrypted: PHIEncryptionService.decryptPHI(patient.patientPsychiatristPhoneEncrypted),
      patientPsychiatristAddressEncrypted: PHIEncryptionService.decryptPHI(patient.patientPsychiatristAddressEncrypted),
      patientCurrentMedicationsEncrypted: PHIEncryptionService.decryptPHI(patient.patientCurrentMedicationsEncrypted),
      patientAllergiesEncrypted: PHIEncryptionService.decryptPHI(patient.patientAllergiesEncrypted),
      patientMedicalConditionsEncrypted: PHIEncryptionService.decryptPHI(patient.patientMedicalConditionsEncrypted),
      patientMentalHealthHistoryEncrypted: PHIEncryptionService.decryptPHI(patient.patientMentalHealthHistoryEncrypted),
      patientFamilyMentalHealthHistoryEncrypted: PHIEncryptionService.decryptPHI(patient.patientFamilyMentalHealthHistoryEncrypted),
      patientSubstanceUseHistoryEncrypted: PHIEncryptionService.decryptPHI(patient.patientSubstanceUseHistoryEncrypted),
      patientTraumaHistoryEncrypted: PHIEncryptionService.decryptPHI(patient.patientTraumaHistoryEncrypted),
      patientPresentingConcernsEncrypted: PHIEncryptionService.decryptPHI(patient.patientPresentingConcernsEncrypted),
      patientTreatmentGoalsEncrypted: PHIEncryptionService.decryptPHI(patient.patientTreatmentGoalsEncrypted),
      patientTreatmentHistoryEncrypted: PHIEncryptionService.decryptPHI(patient.patientTreatmentHistoryEncrypted),
      patientCurrentSymptomsEncrypted: PHIEncryptionService.decryptPHI(patient.patientCurrentSymptomsEncrypted),
      patientRiskAssessmentEncrypted: PHIEncryptionService.decryptPHI(patient.patientRiskAssessmentEncrypted),
      patientSafetyPlanEncrypted: PHIEncryptionService.decryptPHI(patient.patientSafetyPlanEncrypted),
      patientCrisisInterventionPlanEncrypted: PHIEncryptionService.decryptPHI(patient.patientCrisisInterventionPlanEncrypted),
      patientClinicalNotesEncrypted: PHIEncryptionService.decryptPHI(patient.patientClinicalNotesEncrypted),
    };
  }
}

/**
 * Session Service
 * 
 * Handles session data with PHI encryption
 */
export class SessionService {
  /**
   * Get clinical sessions for a therapist with decrypted PHI
   */
  static async getSessions(therapistId: number, filters?: {
    patientId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<SessionHIPAA[]> {
    try {
      const conditions = [eq(clinicalSessions.therapistId, therapistId)];
      
      if (filters?.patientId) {
        conditions.push(eq(clinicalSessions.patientId, filters.patientId));
      }
      if (filters?.startDate) {
        conditions.push(eq(clinicalSessions.date, filters.startDate));
      }
      if (filters?.status) {
        conditions.push(eq(clinicalSessions.status, filters.status));
      }

      const clinicalSessions = await db.query.clinicalSessions.findMany({
        where: and(...conditions),
        orderBy: [desc(clinicalSessions.date)]
      });

      // Decrypt PHI fields
      const decryptedSessions = clinicalSessions.map(session => ({
        ...session,
        notesEncrypted: PHIEncryptionService.decryptPHI(session.notesEncrypted),
        assessmentsEncrypted: PHIEncryptionService.decryptPHI(session.assessmentsEncrypted),
        treatmentGoalsEncrypted: PHIEncryptionService.decryptPHI(session.treatmentGoalsEncrypted),
        progressNotesEncrypted: PHIEncryptionService.decryptPHI(session.progressNotesEncrypted),
      }));

      // Log PHI access
      await HIPAAAuditService.logPHIAccess({
        userId: therapistId,
        action: 'PHI_ACCESS',
        resourceType: 'SESSION',
        fieldsAccessed: ['notes', 'assessments', 'treatmentGoals', 'progressNotes'],
      });

      return decryptedSessions;
    } catch (error) {
      console.error('Error fetching clinical sessions:', error);
      throw error;
    }
  }

  /**
   * Create a new session with PHI encryption
   */
  static async createSession(therapistId: number, sessionData: {
    patientId: number;
    date: Date;
    duration?: number;
    type?: string;
    status?: string;
    notes?: string;
    assessments?: string;
    treatmentGoals?: string;
    progressNotes?: string;
    cptCode?: string;
    addOnCptCodes?: string[];
    authorizationRequired?: boolean;
    authorizationNumber?: string;
    isIntake?: boolean;
    sessionFormat?: string;
  }): Promise<SessionHIPAA> {
    try {
      const encryptedData: Partial<SessionHIPAA> = {
        therapistId,
        patientId: sessionData.patientId,
        date: sessionData.date,
        duration: sessionData.duration || 50,
        type: sessionData.type || 'individual',
        status: sessionData.status || 'scheduled',
        cptCode: sessionData.cptCode,
        addOnCptCodes: sessionData.addOnCptCodes || [],
        authorizationRequired: sessionData.authorizationRequired || false,
        authorizationNumber: sessionData.authorizationNumber,
        isIntake: sessionData.isIntake || false,
        sessionFormat: sessionData.sessionFormat,
      };

      // Encrypt PHI fields
      if (sessionData.notes) {
        encryptedData.notesEncrypted = PHIEncryptionService.encryptPHI(sessionData.notes);
      }
      if (sessionData.assessments) {
        encryptedData.assessmentsEncrypted = PHIEncryptionService.encryptPHI(sessionData.assessments);
      }
      if (sessionData.treatmentGoals) {
        encryptedData.treatmentGoalsEncrypted = PHIEncryptionService.encryptPHI(sessionData.treatmentGoals);
      }
      if (sessionData.progressNotes) {
        encryptedData.progressNotesEncrypted = PHIEncryptionService.encryptPHI(sessionData.progressNotes);
      }

      const [newSession] = await db.insert(clinicalSessions).values(encryptedData).returning();

      // Log creation
      await HIPAAAuditService.logPHIAccess({
        userId: therapistId,
        action: 'CREATE',
        resourceType: 'SESSION',
        resourceId: newSession.id,
        fieldsAccessed: Object.keys(sessionData).filter(key => 
          ['notes', 'assessments', 'treatmentGoals', 'progressNotes'].includes(key)
        ),
      });

      return {
        ...newSession,
        notesEncrypted: PHIEncryptionService.decryptPHI(newSession.notesEncrypted),
        assessmentsEncrypted: PHIEncryptionService.decryptPHI(newSession.assessmentsEncrypted),
        treatmentGoalsEncrypted: PHIEncryptionService.decryptPHI(newSession.treatmentGoalsEncrypted),
        progressNotesEncrypted: PHIEncryptionService.decryptPHI(newSession.progressNotesEncrypted),
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }
}

/**
 * Feature Flag Service
 * 
 * Manages HIPAA feature flags for safe deployment
 */
export class FeatureFlagService {
  /**
   * Check if HIPAA routes are enabled
   */
  static isHIPAARoutesEnabled(): boolean {
    return process.env.ENABLE_HIPAA_ROUTES === 'true';
  }

  /**
   * Check if HIPAA encryption is enabled
   */
  static isHIPAAEncryptionEnabled(): boolean {
    return process.env.ENABLE_HIPAA_ENCRYPTION === 'true';
  }

  /**
   * Check if HIPAA audit logging is enabled
   */
  static isHIPAAAuditLoggingEnabled(): boolean {
    return process.env.ENABLE_HIPAA_AUDIT_LOGGING === 'true';
  }

  /**
   * Get all feature flags status
   */
  static getFeatureFlags(): Record<string, boolean> {
    return {
      hipaaRoutes: this.isHIPAARoutesEnabled(),
      hipaaEncryption: this.isHIPAAEncryptionEnabled(),
      hipaaAuditLogging: this.isHIPAAAuditLoggingEnabled(),
    };
  }
}
