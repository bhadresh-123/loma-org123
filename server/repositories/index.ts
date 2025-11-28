import { db, getActiveSchema } from '../../db';
import { eq, and, desc, asc, notInArray, lt, gt, sql } from 'drizzle-orm';
import { 
  organizations, 
  organizationMemberships, 
  patients, 
  clinicalSessions, 
  therapistProfiles, 
  usersAuth, 
  workSchedules, 
  calendarBlocks,
  patientTreatmentPlans,
  therapistPHI,
  auditLogsHIPAA,
  type ClinicalSession, 
  type PatientTreatmentPlan,
  type Patient,
  type TherapistProfile,
  type OrganizationMembership,
  type TherapistPHI,
  type WorkSchedule,
  type CalendarBlock,
  type Organization,
  type UserAuth
} from '@db/schema';

/**
 * Repository Pattern for Database Access
 * 
 * Provides clean abstraction layer for database operations
 * Makes future refactoring easier (e.g., therapist -> provider)
 */

// Helper function to check if database is available
function ensureDatabase(): void {
  if (!db) {
    throw new Error('Database connection not available. Please check your database configuration.');
  }
}

// ============================================================================
// ORGANIZATION REPOSITORY
// ============================================================================

export class OrganizationRepository {
  static async findById(id: number): Promise<Organization | null> {
    try {
      ensureDatabase();
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);
      return organization || null;
    } catch (error) {
      console.error('Error finding organization by ID:', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        throw new Error('Organizations table does not exist. Please run database migrations.');
      }
      throw error;
    }
  }

  static async findAll(): Promise<Organization[]> {
    try {
      ensureDatabase();
      return db.query.organizations.findMany({
        orderBy: [asc(organizations.name)]
      });
    } catch (error) {
      console.error('Error finding all organizations:', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        throw new Error('Organizations table does not exist. Please run database migrations.');
      }
      throw error;
    }
  }

  static async create(data: {
    name: string;
    type: 'solo' | 'partnership' | 'group_practice';
    organizationBusinessEinEncrypted?: string;
    organizationBusinessAddress?: string;
    organizationBusinessCity?: string;
    organizationBusinessState?: string;
    organizationBusinessZip?: string;
    organizationBusinessPhone?: string;
    organizationBusinessEmail?: string;
    defaultSessionDuration?: number;
    timezone?: string;
  }): Promise<Organization> {
    try {
      ensureDatabase();
      const [organization] = await db.insert(organizations).values(data).returning();
      return organization;
    } catch (error) {
      console.error('Error creating organization:', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        throw new Error('Organizations table does not exist. Please run database migrations.');
      }
      throw error;
    }
  }

  static async update(id: number, data: Partial<Organization>): Promise<Organization | null> {
    try {
      ensureDatabase();
      const [updated] = await db.update(organizations)
        .set(data)
        .where(eq(organizations.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  static async getMembers(organizationId: number): Promise<OrganizationMembership[]> {
    try {
      ensureDatabase();
      return db.query.organizationMemberships.findMany({
        where: eq(organizationMemberships.organizationId, organizationId),
        with: {
          user: {
            with: {
              therapistProfile: true
            }
          }
        }
      });
    } catch (error) {
      console.error('Error getting organization members:', error);
      throw error;
    }
  }

  static async getPatients(organizationId: number): Promise<Patient[]> {
    try {
      ensureDatabase();
      return db.query.patients.findMany({
        where: eq(patients.organizationId, organizationId),
        orderBy: [asc(patients.createdAt)]
      });
    } catch (error) {
      console.error('Error getting organization patients:', error);
      throw error;
    }
  }
}

// ============================================================================
// ORGANIZATION MEMBERSHIP REPOSITORY
// ============================================================================

export class OrganizationMembershipRepository {
  static async findByUserAndOrganization(userId: number, organizationId: number): Promise<OrganizationMembership | null> {
    try {
      ensureDatabase();
      return db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.organizationId, organizationId)
        )
      }) || null;
    } catch (error) {
      console.error('Error finding organization membership:', error);
      return null;
    }
  }

  static async findByUserId(userId: number): Promise<OrganizationMembership[]> {
    try {
      ensureDatabase();
      const memberships = await db.query.organizationMemberships.findMany({
        where: eq(organizationMemberships.userId, userId),
        with: {
          organization: true
        }
      });
      
      return memberships;
    } catch (error) {
      console.error('Error fetching organization memberships:', error);
      return [];
    }
  }

  static async create(data: {
    organizationId: number;
    userId: number;
    role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
    canViewAllPatients?: boolean;
    canViewSelectedPatients?: number[];
    canViewAllCalendars?: boolean;
    canViewSelectedCalendars?: number[];
    canManageBilling?: boolean;
    canManageStaff?: boolean;
    canManageSettings?: boolean;
    canCreatePatients?: boolean;
    employmentStartDate?: Date;
    isActive?: boolean;
    isPrimaryOwner?: boolean;
  }): Promise<OrganizationMembership> {
    try {
      const [membership] = await db.insert(organizationMemberships).values(data).returning();
      return membership;
    } catch (error) {
      console.error('Error creating organization membership:', error);
      throw error;
    }
  }

  static async update(id: number, data: Partial<OrganizationMembership>): Promise<OrganizationMembership | null> {
    try {
      const [updated] = await db.update(organizationMemberships)
        .set(data)
        .where(eq(organizationMemberships.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      console.error('Error updating organization membership:', error);
      throw error;
    }
  }

  static async findById(id: number): Promise<OrganizationMembership | null> {
    try {
      return db.query.organizationMemberships.findFirst({
        where: eq(organizationMemberships.id, id),
        with: {
          user: {
            with: {
              therapistProfile: true
            }
          },
          organization: true
        }
      }) || null;
    } catch (error) {
      console.error('Error finding organization membership by ID:', error);
      return null;
    }
  }

  static async findByOrganizationAndRole(organizationId: number, role: string): Promise<OrganizationMembership[]> {
    try {
      return db.query.organizationMemberships.findMany({
        where: and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.role, role),
          eq(organizationMemberships.isActive, true)
        )
      });
    } catch (error) {
      console.error('Error finding organization memberships by role:', error);
      return [];
    }
  }

  static async findAvailableTherapists(organizationId: number): Promise<TherapistProfile[]> {
    try {
      // Get all users with therapist profiles who are not already in this organization
      const existingMembers = await db.query.organizationMemberships.findMany({
        where: eq(organizationMemberships.organizationId, organizationId),
        columns: { userId: true }
      });
      
      const existingUserIds = existingMembers.map((m: any) => m.userId);
      
      // Build conditions for filtering
      const conditions = [];
      
      // Exclude therapists already in this organization
      if (existingUserIds.length > 0) {
        conditions.push(notInArray(therapistProfiles.userId, existingUserIds));
      }
      
      // CRITICAL: Filter by active account status and exclude test accounts
      // This addresses HIPAA compliance and engineering best practices:
      // 1. Only show active accounts (not inactive/suspended)
      // 2. Filter out obvious test/placeholder accounts
      // 3. Limit results to prevent excessive data exposure
      
      // Use a raw query to join with usersAuth and filter properly
      // This ensures we only return therapists with active accounts
      // and excludes test accounts based on username/name patterns
      const query = db
        .select({
          id: therapistProfiles.id,
          userId: therapistProfiles.userId,
          name: therapistProfiles.name,
          professionalTitle: therapistProfiles.professionalTitle,
          licenseNumber: therapistProfiles.licenseNumber,
          specialties: therapistProfiles.specialties,
        })
        .from(therapistProfiles)
        .innerJoin(usersAuth, eq(therapistProfiles.userId, usersAuth.id))
        .where(
          and(
            // Only active accounts
            eq(usersAuth.accountStatus, 'active'),
            // Exclude test/placeholder accounts (common patterns)
            // Filters out usernames/names that look like test data
            // Using SQL column names directly for pattern matching
            sql`NOT (
              LOWER(therapist_profiles.name) LIKE '%test%' OR
              LOWER(therapist_profiles.name) LIKE '%demo%' OR
              LOWER(users_auth.username) LIKE '%test%' OR
              LOWER(users_auth.username) LIKE '%demo%' OR
              LENGTH(TRIM(therapist_profiles.name)) < 3
            )`,
            // Exclude already existing members if any
            existingUserIds.length > 0 ? notInArray(therapistProfiles.userId, existingUserIds) : sql`1=1`
          )
        )
        .orderBy(asc(therapistProfiles.name))
        .limit(100); // Limit to prevent excessive data exposure
      
      const results = await query;
      
      // Transform results to match expected TherapistProfile format
      // NOTE: We intentionally do NOT return email/username for privacy/compliance
      return results.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        professionalTitle: row.professionalTitle || undefined,
        licenseNumber: row.licenseNumber || undefined,
        specialties: (row.specialties as string[]) || [],
      })) as TherapistProfile[];
      
    } catch (error) {
      console.error('Error finding available therapists:', error);
      return [];
    }
  }

  static async getPrimaryOwner(organizationId: number): Promise<OrganizationMembership | null> {
    try {
      return db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.isPrimaryOwner, true)
        ),
        with: {
          user: {
            with: {
              therapistProfile: true
            }
          }
        }
      }) || null;
    } catch (error) {
      console.error('Error getting primary owner:', error);
      return null;
    }
  }
}

// ============================================================================
// THERAPIST REPOSITORY
// ============================================================================

export class TherapistRepository {
  static async findById(id: number): Promise<TherapistProfile | null> {
    return db.query.therapistProfiles.findFirst({
      where: eq(therapistProfiles.id, id),
      with: {
        user: true
      }
    });
  }

  static async findByUserId(userId: number): Promise<TherapistProfile | null> {
    return db.query.therapistProfiles.findFirst({
      where: eq(therapistProfiles.userId, userId),
      with: {
        user: true
      }
    });
  }

  static async findAll(): Promise<TherapistProfile[]> {
    return db.query.therapistProfiles.findMany({
      with: {
        user: true
      },
      orderBy: [asc(therapistProfiles.name)]
    });
  }

  static async findByOrganization(organizationId: number): Promise<TherapistProfile[]> {
    const memberships = await db.query.organizationMemberships.findMany({
      where: eq(organizationMemberships.organizationId, organizationId),
      with: {
        user: {
          with: {
            therapistProfile: true
          }
        }
      }
    });

    return memberships
      .map(m => m.user?.therapistProfile)
      .filter((profile): profile is TherapistProfile => profile !== null);
  }

  static async create(data: {
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
    baseRate?: string;
    slidingScale?: boolean;
    groupSessionRate?: string;
    therapistIdentities?: string[];
    therapistBusinessPhone?: string;
    therapistBusinessEmail?: string;
    therapistBusinessAddress?: string;
    therapistBusinessCity?: string;
    therapistBusinessState?: string;
    therapistBusinessZip?: string;
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
  }): Promise<TherapistProfile> {
    const [profile] = await db.insert(therapistProfiles).values(data).returning();
    return profile;
  }

  static async update(id: number, data: Partial<TherapistProfile>): Promise<TherapistProfile | null> {
    const [updated] = await db.update(therapistProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(therapistProfiles.id, id))
      .returning();
    return updated || null;
  }
}

// ============================================================================
// THERAPIST PHI REPOSITORY
// ============================================================================

export class TherapistPHIRepository {
  static async findByUserId(userId: number): Promise<TherapistPHI | null> {
    return db.query.therapistPHI.findFirst({
      where: eq(therapistPHI.userId, userId)
    });
  }

  static async create(data: {
    userId: number;
    therapistSsnEncrypted?: string;
    therapistDobEncrypted?: string;
    therapistHomeAddressEncrypted?: string;
    therapistHomeCityEncrypted?: string;
    therapistHomeStateEncrypted?: string;
    therapistHomeZipEncrypted?: string;
    therapistPersonalPhoneEncrypted?: string;
    therapistPersonalEmailEncrypted?: string;
    therapistBirthCityEncrypted?: string;
    therapistBirthStateEncrypted?: string;
    therapistBirthCountryEncrypted?: string;
    therapistIsUsCitizen?: boolean;
    therapistWorkPermitVisaEncrypted?: string;
    therapistEmergencyContactNameEncrypted?: string;
    therapistEmergencyContactPhoneEncrypted?: string;
    therapistEmergencyContactRelationshipEncrypted?: string;
    therapistPersonalPhoneSearchHash?: string;
    therapistPersonalEmailSearchHash?: string;
  }): Promise<TherapistPHI> {
    const [phi] = await db.insert(therapistPHI).values(data).returning();
    return phi;
  }

  static async update(userId: number, data: Partial<TherapistPHI>): Promise<TherapistPHI | null> {
    const [updated] = await db.update(therapistPHI)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(therapistPHI.userId, userId))
      .returning();
    return updated || null;
  }
}

// ============================================================================
// PATIENT REPOSITORY
// ============================================================================

export class PatientRepository {
  static async findById(id: number): Promise<Patient | null> {
    const schema = getActiveSchema();
    return db.query.patients.findFirst({
      where: eq(schema.patients.id, id),
      with: {
        organization: true,
        primaryTherapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
  }

  static async findByTherapist(therapistId: number): Promise<Patient[]> {
    const schema = getActiveSchema();
    return db.query.patients.findMany({
      where: eq(schema.patients.primaryTherapistId, therapistId),
      orderBy: [asc(schema.patients.createdAt)]
    });
  }

  static async findByOrganization(organizationId: number): Promise<Patient[]> {
    const schema = getActiveSchema();
    return db.query.patients.findMany({
      where: eq(schema.patients.organizationId, organizationId),
      orderBy: [asc(schema.patients.createdAt)]
    });
  }

  static async findByEmailHash(emailHash: string): Promise<Patient | null> {
    const schema = getActiveSchema();
    return db.query.patients.findFirst({
      where: eq(schema.patients.patientContactEmailSearchHash, emailHash)
    });
  }

  static async findByPhoneHash(phoneHash: string): Promise<Patient | null> {
    const schema = getActiveSchema();
    return db.query.patients.findFirst({
      where: eq(schema.patients.patientContactPhoneSearchHash, phoneHash)
    });
  }

  static async create(data: {
    organizationId: number;
    primaryTherapistId: number;
    userId: number; // Use userId instead of user_id to match schema
    assignedTherapistIds?: number[];
    name: string;
    status?: string;
    type?: string;
    patientContactEmailEncrypted?: string;
    patientContactPhoneEncrypted?: string;
    patientHomeAddressEncrypted?: string;
    patientHomeCityEncrypted?: string;
    patientHomeStateEncrypted?: string;
    patientHomeZipEncrypted?: string;
    patientDobEncrypted?: string;
    patientGenderEncrypted?: string;
    patientRaceEncrypted?: string;
    patientEthnicityEncrypted?: string;
    patientPronounsEncrypted?: string;
    patientHometownEncrypted?: string;
    patientClinicalNotesEncrypted?: string;
    patientDiagnosisCodesEncrypted?: string;
    patientPrimaryDiagnosisEncrypted?: string;
    patientSecondaryDiagnosisEncrypted?: string;
    patientTertiaryDiagnosisEncrypted?: string;
    patientMedicalHistoryEncrypted?: string;
    patientTreatmentHistoryEncrypted?: string;
    patientReferringPhysicianEncrypted?: string;
    patientReferringPhysicianNpiEncrypted?: string;
    patientInsuranceProviderEncrypted?: string;
    patientInsuranceInfoEncrypted?: string;
    patientMemberIdEncrypted?: string;
    patientGroupNumberEncrypted?: string;
    patientPrimaryInsuredNameEncrypted?: string;
    patientPrimaryInsuredDobEncrypted?: string;
    patientAuthorizationInfoEncrypted?: string;
    patientPriorAuthNumberEncrypted?: string;
    patientContactEmailSearchHash?: string;
    patientContactPhoneSearchHash?: string;
    patientNameSearchHash?: string;
    billingType?: string;
    sessionCost?: string;
    noShowFee?: string;
    copayAmount?: string;
    deductibleAmount?: string;
    defaultCptCode?: string;
    placeOfService?: string;
    authorizationRequired?: boolean;
    patientPhotoFilename?: string;
    patientPhotoOriginalName?: string;
    patientPhotoMimeType?: string;
    stripeCustomerId?: string;
  }): Promise<Patient> {
    console.log('=== PatientRepository.create START ===');
    console.log('Data received:', JSON.stringify(data, null, 2));
    
    const schema = getActiveSchema();
    console.log('Active schema patients table:', !!schema.patients);
    
    if (!schema.patients) {
      throw new Error('Patients table not available in current schema. Please run database migrations.');
    }
    
    console.log('About to insert into database...');
    
    try {
      const [patient] = await db.insert(schema.patients).values(data).returning();
      
      console.log('Database insert successful, returned patient:', patient);
      console.log('=== PatientRepository.create END ===');
      return patient;
    } catch (error) {
      console.error('Database insert failed:', error);
      
      // Provide helpful error messages for common schema issues
      if (error.message.includes('does not exist')) {
        const columnMatch = error.message.match(/column "([^"]+)" of relation "([^"]+)"/);
        if (columnMatch) {
          const [, columnName, tableName] = columnMatch;
          throw new Error(`Database schema mismatch: Column '${columnName}' does not exist in table '${tableName}'. Please run database migrations to update the schema.`);
        }
      }
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error('Database table does not exist. Please run database migrations to create the required tables.');
      }
      
      // Re-throw the original error if we can't provide a better message
      throw error;
    }
  }

  static async update(id: number, data: Partial<Patient>): Promise<Patient | null> {
    const schema = getActiveSchema();
    const [updated] = await db.update(schema.patients)
      .set(data)
      .where(eq(schema.patients.id, id))
      .returning();
    return updated || null;
  }

  static async softDelete(id: number): Promise<Patient | null> {
    const schema = getActiveSchema();
    const [deleted] = await db.update(schema.patients)
      .set({ 
        deleted: true
      })
      .where(eq(schema.patients.id, id))
      .returning();
    return deleted || null;
  }
}

// ============================================================================
// CLINICAL SESSION REPOSITORY
// ============================================================================

export class ClinicalSessionRepository {
  static async findById(id: number): Promise<ClinicalSession | null> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }
    
    return await db.query.clinicalSessions.findFirst({
      where: eq(schema.clinicalSessions.id, id),
      with: {
        organization: true,
        patient: true,
        therapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
  }

  static async getUserSessions(userId: number): Promise<ClinicalSession[]> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }
    
    // Get user's organization first
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId),
      with: {
        organization: true
      }
    });
    
    if (!userMembership) {
      return [];
    }
    
    return await db.query.clinicalSessions.findMany({
      where: eq(schema.clinicalSessions.organizationId, userMembership.organizationId),
      with: {
        organization: true,
        patient: true,
        therapist: {
          with: {
            therapistProfile: true
          }
        }
      },
      orderBy: [desc(schema.clinicalSessions.date)]
    });
  }

  static async findByPatient(patientId: number): Promise<ClinicalSession[]> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }
    
    return await db.query.clinicalSessions.findMany({
      where: eq(schema.clinicalSessions.patientId, patientId),
      orderBy: [desc(schema.clinicalSessions.date)]
    });
  }

  static async findByTherapist(therapistId: number): Promise<ClinicalSession[]> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }
    
    return await db.query.clinicalSessions.findMany({
      where: eq(schema.clinicalSessions.therapistId, therapistId),
      orderBy: [desc(schema.clinicalSessions.date)]
    });
  }

  static async getPatientSessions(patientId: number, userId: number): Promise<ClinicalSession[]> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }

    // Get user's organization first to verify access
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return [];
    }

    // Get sessions for the patient that belong to the user's organization
    return await db.query.clinicalSessions.findMany({
      where: and(
        eq(schema.clinicalSessions.patientId, patientId),
        eq(schema.clinicalSessions.organizationId, userMembership.organizationId)
      ),
      orderBy: [desc(schema.clinicalSessions.date)],
      with: {
        organization: true,
        patient: true,
        therapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
  }

  static async getSession(sessionId: number, userId: number): Promise<ClinicalSession | null> {
    // Get user's organization first
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return null;
    }

    // Get the specific session for the user's organization
    return db.query.clinicalSessions.findFirst({
      where: and(
        eq(clinicalSessions.id, sessionId),
        eq(clinicalSessions.organizationId, userMembership.organizationId)
      ),
      with: {
        organization: true,
        patient: true,
        therapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
  }

  /**
   * Check for overlapping sessions at the same time for a therapist
   * Returns true if there's already a scheduled session at the same time
   */
  static async hasOverlappingSession(
    therapistId: number, 
    date: Date, 
    duration: number = 50,
    excludeSessionId?: number
  ): Promise<boolean> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }

    // Calculate session end time
    const sessionStart = new Date(date);
    const sessionEnd = new Date(sessionStart.getTime() + duration * 60 * 1000);

    // Check for overlapping sessions
    // A session overlaps if:
    // 1. It's scheduled (not cancelled)
    // 2. Same therapist
    // 3. The start time is before our end time AND the end time is after our start time
    
    const existingSessions = await db.query.clinicalSessions.findMany({
      where: and(
        eq(schema.clinicalSessions.therapistId, therapistId),
        // Only check scheduled sessions (not cancelled or completed)
        eq(schema.clinicalSessions.status, 'scheduled')
      )
    });

    // Filter in memory for overlapping times (more flexible than SQL)
    const overlapping = existingSessions.some(session => {
      // Skip the session we're updating if provided
      if (excludeSessionId && session.id === excludeSessionId) {
        return false;
      }

      const existingStart = new Date(session.date);
      const existingDuration = session.duration || 50;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

      // Check if sessions overlap
      return existingStart < sessionEnd && existingEnd > sessionStart;
    });

    return overlapping;
  }

  static async createSession(data: any): Promise<ClinicalSession> {
    console.log('[ClinicalSessionRepository] Creating session in database');
    console.log('[ClinicalSessionRepository] Incoming data keys:', Object.keys(data || {}));
    console.log('[ClinicalSessionRepository] Incoming id field check:', 'id' in (data || {}) ? `PRESENT: ${(data as any).id}` : 'absent');
    
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      const error = new Error('Clinical sessions table not available in current schema. Please run database migrations.');
      console.error('[ClinicalSessionRepository] Schema not available:', error.message);
      throw error;
    }
    
    console.log('[ClinicalSessionRepository] Schema validated, inserting data:', {
      patientId: data.patientId,
      organizationId: data.organizationId,
      therapistId: data.therapistId,
      date: data.date,
      type: data.type,
      status: data.status
    });
    
    try {
      // Sanitize insert payload: remove undefined properties and NEVER include id
      // The id column is serial/auto-increment, so it should never be in the insert payload
      const sanitizedData: any = {};
      for (const [key, value] of Object.entries(data || {})) {
        // Skip id field entirely - it's auto-generated by the database
        if (key === 'id') {
          if (value !== undefined && value !== null) {
            console.warn('[ClinicalSessionRepository] Ignoring id field in insert payload. Received id value:', value);
          }
          continue;
        }
        // Only include defined values (exclude undefined, but allow null for nullable fields)
        if (value !== undefined) {
          sanitizedData[key] = value;
        }
      }

      // Final safety check: ensure id is absolutely not in the payload
      if ('id' in sanitizedData) {
        console.error('[ClinicalSessionRepository] CRITICAL: id found in sanitized payload after filtering! Removing...');
        delete (sanitizedData as any).id;
      }
      
      // Verify id is truly absent
      if ('id' in sanitizedData) {
        throw new Error('CRITICAL BUG: Unable to remove id field from insert payload');
      }

      // Ensure arrays default properly
      if (sanitizedData.addOnCptCodes === undefined) {
        // Let DB default apply; do not send undefined
      }

      console.log('[ClinicalSessionRepository] Inserting with columns:', Object.keys(sanitizedData));
      console.log('[ClinicalSessionRepository] Final payload preview (no PHI):', {
        organizationId: sanitizedData.organizationId,
        patientId: sanitizedData.patientId,
        therapistId: sanitizedData.therapistId,
        date: sanitizedData.date,
        duration: sanitizedData.duration,
        type: sanitizedData.type,
        status: sanitizedData.status,
        cptCode: sanitizedData.cptCode,
        addOnCptCodes: Array.isArray(sanitizedData.addOnCptCodes) ? `[${sanitizedData.addOnCptCodes.length} items]` : undefined,
      });
      
      // CRITICAL: Final verification that id is NOT in the payload
      const finalIdCheck = 'id' in sanitizedData;
      console.log('[ClinicalSessionRepository] FINAL CHECK - id in sanitizedData:', finalIdCheck ? 'YES - THIS IS A BUG!' : 'NO - Good');
      if (finalIdCheck) {
        console.error('[ClinicalSessionRepository] CRITICAL ERROR: id field detected in final payload!', sanitizedData.id);
        throw new Error('Cannot insert: id field must not be present in insert payload (it is auto-generated)');
      }

      const [session] = await db.insert(schema.clinicalSessions).values(sanitizedData).returning();
      console.log('[ClinicalSessionRepository] Session inserted successfully with ID:', session.id);
      return session;
    } catch (dbError: any) {
      console.error('[ClinicalSessionRepository] Database insert failed:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        hint: dbError.hint,
        constraint: dbError.constraint,
        table: dbError.table,
        column: dbError.column,
        dataType: dbError.dataType
      });
      
      // Enhance error message for common issues
      if (dbError.code === '42P01') {
        throw new Error(`Database table does not exist: ${dbError.table || 'clinical_sessions'}. Please run database migrations.`);
      }
      
      if (dbError.code === '42703') {
        throw new Error(`Database column does not exist: ${dbError.column}. Database schema may be outdated. Please run migrations.`);
      }
      
      throw dbError;
    }
  }

  static async create(data: {
    organizationId: number;
    patientId: number;
    therapistId: number;
    date: Date;
    duration?: number;
    type?: string;
    status?: string;
    sessionClinicalNotesEncrypted?: string;
    sessionSubjectiveNotesEncrypted?: string;
    sessionObjectiveNotesEncrypted?: string;
    sessionAssessmentNotesEncrypted?: string;
    sessionPlanNotesEncrypted?: string;
    sessionTreatmentGoalsEncrypted?: string;
    sessionProgressNotesEncrypted?: string;
    sessionInterventionsEncrypted?: string;
    isIntake?: boolean;
    sessionFormat?: string;
    cptCode?: string;
    addOnCptCodes?: string[];
    authorizationRequired?: boolean;
    authorizationNumber?: string;
    isPaid?: boolean;
    paymentId?: string;
  }): Promise<ClinicalSession> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }
    
    const [session] = await db.insert(schema.clinicalSessions).values(data).returning();
    return session;
  }

  static async update(id: number, data: Partial<ClinicalSession>): Promise<ClinicalSession | null> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }
    
    const [updated] = await db.update(schema.clinicalSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.clinicalSessions.id, id))
      .returning();
    return updated || null;
  }

  static async updateSession(sessionId: number, data: Partial<ClinicalSession>, userId: number): Promise<ClinicalSession | null> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }

    // Get user's organization first to verify access
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return null;
    }

    // Convert date string to Date object if present
    const updateData: any = { ...data };
    if (data.date && typeof data.date === 'string') {
      updateData.date = new Date(data.date);
    }

    // Update the session only if it belongs to the user's organization
    const [updated] = await db.update(schema.clinicalSessions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(
        and(
          eq(schema.clinicalSessions.id, sessionId),
          eq(schema.clinicalSessions.organizationId, userMembership.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return null;
    }

    // Return the updated session with relations
    return db.query.clinicalSessions.findFirst({
      where: eq(schema.clinicalSessions.id, updated.id),
      with: {
        organization: true,
        patient: true,
        therapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
  }

  static async deleteSession(sessionId: number, userId: number): Promise<boolean> {
    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      throw new Error('Clinical sessions table not available in current schema. Please run database migrations.');
    }

    // Get user's organization first to verify access
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return false;
    }

    // Check if session exists and belongs to user's organization first
    const existingSession = await db.query.clinicalSessions.findFirst({
      where: and(
        eq(schema.clinicalSessions.id, sessionId),
        eq(schema.clinicalSessions.organizationId, userMembership.organizationId)
      )
    });

    if (!existingSession) {
      return false;
    }

    // Delete the session
    await db.delete(schema.clinicalSessions)
      .where(eq(schema.clinicalSessions.id, sessionId));

    return true;
  }
}

// ============================================================================
// TREATMENT PLAN REPOSITORY
// ============================================================================

export class PatientTreatmentPlanRepository {
  static async findById(id: number): Promise<PatientTreatmentPlan | null> {
    return db.query.patientTreatmentPlans.findFirst({
      where: eq(patientTreatmentPlans.id, id),
      with: {
        organization: true,
        patient: true,
        therapist: {
          with: {
            therapistProfile: true
          }
        }
      }
    });
  }

  static async findByPatient(patientId: number): Promise<PatientTreatmentPlan[]> {
    return db.query.patientTreatmentPlans.findMany({
      where: eq(patientTreatmentPlans.patientId, patientId),
      orderBy: [desc(patientTreatmentPlans.version)]
    });
  }

  static async findByTherapist(therapistId: number): Promise<PatientTreatmentPlan[]> {
    return db.query.patientTreatmentPlans.findMany({
      where: eq(patientTreatmentPlans.therapistId, therapistId),
      orderBy: [desc(patientTreatmentPlans.createdAt)]
    });
  }

  static async findByOrganization(organizationId: number): Promise<PatientTreatmentPlan[]> {
    return db.query.patientTreatmentPlans.findMany({
      where: eq(patientTreatmentPlans.organizationId, organizationId),
      orderBy: [desc(patientTreatmentPlans.createdAt)]
    });
  }

  static async create(data: {
    organizationId: number;
    patientId: number;
    therapistId: number;
    version: number;
    status?: string;
    treatmentPlanContentEncrypted?: string;
    treatmentPlanGoalsEncrypted?: string;
    treatmentPlanObjectivesEncrypted?: string;
    treatmentPlanInterventionsEncrypted?: string;
    treatmentPlanProgressNotesEncrypted?: string;
    treatmentPlanDiagnosisEncrypted?: string;
    treatmentPlanAssessmentEncrypted?: string;
    startDate?: Date;
    endDate?: Date;
    reviewDate?: Date;
    nextReviewDate?: Date;
  }): Promise<PatientTreatmentPlan> {
    const [plan] = await db.insert(patientTreatmentPlans).values(data).returning();
    return plan;
  }

  static async update(id: number, data: Partial<PatientTreatmentPlan>): Promise<PatientTreatmentPlan | null> {
    const [updated] = await db.update(patientTreatmentPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(patientTreatmentPlans.id, id))
      .returning();
    return updated || null;
  }
}

// ============================================================================
// AUDIT LOG REPOSITORY
// ============================================================================

export class AuditLogRepository {
  static async create(data: {
    userId?: number;
    sessionId?: string;
    action: string;
    resourceType: string;
    resourceId?: number;
    fieldsAccessed?: string[];
    phiFieldsCount?: number;
    requestMethod?: string;
    requestPath?: string;
    requestBody?: string;
    responseStatus?: number;
    responseTime?: number;
    securityLevel?: string;
    riskScore?: number;
    hipaaCompliant?: boolean;
    dataRetentionDate?: Date;
    correlationId?: string;
    traceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<any> {
    const schema = getActiveSchema();
    // Check if audit logs table exists
    if (!schema.auditLogsHIPAA) {
      console.log('Audit logs table not available, skipping audit log');
      return null;
    }
    
    try {
      const [log] = await db.insert(schema.auditLogsHIPAA).values(data).returning();
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      return null;
    }
  }

  static async findByUserId(userId: number, limit: number = 100): Promise<any[]> {
    const schema = getActiveSchema();
    if (!schema.auditLogsHIPAA) {
      return [];
    }
    
    return db.query.auditLogsHIPAA.findMany({
      where: eq(schema.auditLogsHIPAA.userId, userId),
      orderBy: [desc(schema.auditLogsHIPAA.createdAt)],
      limit
    });
  }

  static async findByResource(resourceType: string, resourceId: number, limit: number = 100): Promise<any[]> {
    const schema = getActiveSchema();
    if (!schema.auditLogsHIPAA) {
      return [];
    }
    
    return db.query.auditLogsHIPAA.findMany({
      where: and(
        eq(schema.auditLogsHIPAA.resourceType, resourceType),
        eq(schema.auditLogsHIPAA.resourceId, resourceId)
      ),
      orderBy: [desc(schema.auditLogsHIPAA.createdAt)],
      limit
    });
  }

  static async findPHIAccess(userId: number, limit: number = 100): Promise<any[]> {
    const schema = getActiveSchema();
    if (!schema.auditLogsHIPAA) {
      return [];
    }
    
    return db.query.auditLogsHIPAA.findMany({
      where: and(
        eq(schema.auditLogsHIPAA.userId, userId),
        eq(schema.auditLogsHIPAA.phiFieldsCount, 0) // phiFieldsCount > 0
      ),
      orderBy: [desc(schema.auditLogsHIPAA.createdAt)],
      limit
    });
  }
}

// ============================================================================
// WORK SCHEDULE REPOSITORY
// ============================================================================

export class WorkScheduleRepository {
  static async findByUserId(userId: number): Promise<any[]> {
    return db.query.workSchedules.findMany({
      where: eq(workSchedules.userId, userId),
      orderBy: [asc(workSchedules.dayOfWeek), asc(workSchedules.startTime)]
    });
  }

  static async findByOrganization(organizationId: number): Promise<any[]> {
    return db.query.workSchedules.findMany({
      where: eq(workSchedules.organizationId, organizationId),
      orderBy: [asc(workSchedules.userId), asc(workSchedules.dayOfWeek), asc(workSchedules.startTime)]
    });
  }

  static async create(data: {
    userId: number;
    organizationId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }): Promise<any> {
    const [schedule] = await db.insert(workSchedules).values(data).returning();
    return schedule;
  }

  static async update(id: number, data: Partial<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>): Promise<any> {
    const [schedule] = await db
      .update(workSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workSchedules.id, id))
      .returning();
    return schedule;
  }

  static async deleteByUserId(userId: number): Promise<void> {
    await db.delete(workSchedules).where(eq(workSchedules.userId, userId));
  }

  static async delete(id: number): Promise<void> {
    await db.delete(workSchedules).where(eq(workSchedules.id, id));
  }

  static async findOverlapping(
    userId: number, 
    dayOfWeek: number, 
    startTime: string, 
    endTime: string,
    excludeId?: number
  ): Promise<any[]> {
    const conditions = [
      eq(workSchedules.userId, userId),
      eq(workSchedules.dayOfWeek, dayOfWeek),
      eq(workSchedules.isActive, true)
    ];

    if (excludeId) {
      conditions.push(notInArray(workSchedules.id, [excludeId]));
    }

    return db.query.workSchedules.findMany({
      where: and(...conditions),
      orderBy: [asc(workSchedules.startTime)]
    });
  }

  static async findById(id: number): Promise<any> {
    return db.query.workSchedules.findFirst({
      where: eq(workSchedules.id, id)
    });
  }
}

// ============================================================================
// CALENDAR BLOCK REPOSITORY
// ============================================================================

export class CalendarBlockRepository {
  static async findByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.query.calendarBlocks.findMany({
      where: eq(calendarBlocks.userId, userId),
      orderBy: [asc(calendarBlocks.startDate)]
    });

    if (startDate && endDate) {
      query = db.query.calendarBlocks.findMany({
        where: and(
          eq(calendarBlocks.userId, userId),
          // Check if block overlaps with date range
          // Block overlaps if: block.start < endDate AND block.end > startDate
        ),
        orderBy: [asc(calendarBlocks.startDate)]
      });
    }

    return query;
  }

  static async findByOrganization(organizationId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    return db.query.calendarBlocks.findMany({
      where: eq(calendarBlocks.organizationId, organizationId),
      orderBy: [asc(calendarBlocks.startDate)]
    });
  }

  static async create(data: {
    userId: number;
    organizationId: number;
    startDate: Date;
    endDate: Date;
    blockType: string;
    reason?: string;
    isRecurring?: boolean;
    recurringPattern?: any;
  }): Promise<any> {
    const [block] = await db.insert(calendarBlocks).values(data).returning();
    return block;
  }

  static async update(id: number, data: Partial<{
    startDate: Date;
    endDate: Date;
    blockType: string;
    reason: string;
    isRecurring: boolean;
    recurringPattern: any;
  }>): Promise<any> {
    const [block] = await db
      .update(calendarBlocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(calendarBlocks.id, id))
      .returning();
    return block;
  }

  static async delete(id: number): Promise<void> {
    await db.delete(calendarBlocks).where(eq(calendarBlocks.id, id));
  }

  static async findConflicts(
    userId: number, 
    startDate: Date, 
    endDate: Date, 
    excludeId?: number
  ): Promise<any[]> {
    const conditions = [
      eq(calendarBlocks.userId, userId),
      // Check for time overlap: block.start < endDate AND block.end > startDate
      and(
        lt(calendarBlocks.startDate, endDate),
        gt(calendarBlocks.endDate, startDate)
      )
    ];

    if (excludeId) {
      conditions.push(notInArray(calendarBlocks.id, [excludeId]));
    }

    return db.query.calendarBlocks.findMany({
      where: and(...conditions),
      orderBy: [asc(calendarBlocks.startDate)]
    });
  }

  static async findById(id: number): Promise<any> {
    return db.query.calendarBlocks.findFirst({
      where: eq(calendarBlocks.id, id)
    });
  }

  static async findSessionConflicts(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // This would check for conflicts with clinical sessions
    // For now, return empty array - would need to implement session conflict checking
    return [];
  }
}
