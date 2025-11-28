import { pgTable, text, serial, timestamp, integer, boolean, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

/**
 * HIPAA-COMPLIANT DATABASE SCHEMA - REFACTORED
 * 
 * This schema implements healthcare-specific naming with organization hierarchy
 * and comprehensive PHI encryption and audit capabilities.
 */

// ============================================================================
// AUTHENTICATION LAYER - Minimal auth-only data
// ============================================================================

export const usersAuth = pgTable("users_auth", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  accountStatus: text("account_status").default("active"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaEnforcedAt: timestamp("mfa_enforced_at"), // When MFA was made mandatory for this user
  lastLogin: timestamp("last_login"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MFA secrets table - stores TOTP secrets
export const mfaSecrets = pgTable("mfa_secrets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull().unique(),
  secret: text("secret").notNull(), // Encrypted TOTP secret
  backupCodesHash: text("backup_codes_hash"), // Hashed backup codes
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MFA recovery codes - one-time use backup codes
export const mfaRecoveryCodes = pgTable("mfa_recovery_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  codeHash: text("code_hash").notNull(), // Hashed recovery code
  used: boolean("used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Key rotation history - tracks encryption key rotations for compliance
export const keyRotationHistory = pgTable("key_rotation_history", {
  id: serial("id").primaryKey(),
  keyType: text("key_type").notNull(), // 'PHI_ENCRYPTION_KEY', 'SESSION_SECRET', etc.
  rotatedBy: integer("rotated_by").references(() => usersAuth.id),
  rotationReason: text("rotation_reason"), // 'scheduled', 'compromised', 'manual'
  oldKeyFingerprint: text("old_key_fingerprint"), // Last 8 chars of old key for reference
  newKeyFingerprint: text("new_key_fingerprint"), // Last 8 chars of new key for reference
  recordsReencrypted: integer("records_reencrypted").default(0),
  rotationStatus: text("rotation_status").default("completed"), // 'in_progress', 'completed', 'failed'
  rotatedAt: timestamp("rotated_at").defaultNow(),
});

// ============================================================================
// ORGANIZATION LAYER - Practice/Business Management
// ============================================================================

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'solo', 'partnership', 'group_practice'
  
  // Business info (encrypted)
  organizationBusinessEinEncrypted: text("organization_business_ein_encrypted"),
  organizationBusinessAddress: text("organization_business_address"),
  organizationBusinessCity: text("organization_business_city"),
  organizationBusinessState: text("organization_business_state"),
  organizationBusinessZip: text("organization_business_zip"),
  organizationBusinessPhone: text("organization_business_phone"),
  organizationBusinessEmail: text("organization_business_email"),
  
  // Settings
  defaultSessionDuration: integer("default_session_duration").default(50),
  timezone: text("timezone").default("America/New_York"),
  
  // Status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizationMemberships = pgTable("organization_memberships", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  // Role (user's 3-tier system)
  role: text("role").notNull(), // 'business_owner', 'admin', 'therapist', 'contractor_1099'
  
  // Access control (per user's requirements)
  canViewAllPatients: boolean("can_view_all_patients").default(false),        // business_owner: true
  canViewSelectedPatients: jsonb("can_view_selected_patients").default([]),  // admin: [user_ids]
  canViewAllCalendars: boolean("can_view_all_calendars").default(false),     // business_owner: true
  canViewSelectedCalendars: jsonb("can_view_selected_calendars").default([]), // configurable
  
  // Management permissions
  canManageBilling: boolean("can_manage_billing").default(false),           // business_owner: true
  canManageStaff: boolean("can_manage_staff").default(false),               // business_owner: true
  canManageSettings: boolean("can_manage_settings").default(false),         // business_owner: true
  canCreatePatients: boolean("can_create_patients").default(true),          // all: true
  
  // Employment tracking
  employmentStartDate: timestamp("employment_start_date"),
  employmentEndDate: timestamp("employment_end_date"),  // NULL if active
  
  // Status
  isActive: boolean("is_active").default(true),
  isPrimaryOwner: boolean("is_primary_owner").default(false),  // Exactly ONE per org
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization invites for secure therapist invitations
export const organizationInvites = pgTable("organization_invites", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  invitedBy: integer("invited_by").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  // Invite details
  email: text("email").notNull(),
  role: text("role").notNull(), // 'business_owner', 'admin', 'therapist', 'contractor_1099'
  token: text("token").unique().notNull(), // Unique token for invite acceptance
  
  // Permissions that will be granted upon acceptance
  canViewAllPatients: boolean("can_view_all_patients").default(false),
  canViewSelectedPatients: jsonb("can_view_selected_patients").default([]),
  canViewAllCalendars: boolean("can_view_all_calendars").default(false),
  canViewSelectedCalendars: jsonb("can_view_selected_calendars").default([]),
  canManageBilling: boolean("can_manage_billing").default(false),
  canManageStaff: boolean("can_manage_staff").default(false),
  canManageSettings: boolean("can_manage_settings").default(false),
  canCreatePatients: boolean("can_create_patients").default(true),
  
  // Status
  status: text("status").default("pending"), // 'pending', 'accepted', 'expired', 'cancelled'
  expiresAt: timestamp("expires_at").notNull(), // Invites expire after 7 days
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: integer("accepted_by").references(() => usersAuth.id), // User who accepted (if exists)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// THERAPIST DATA LAYER - Healthcare-specific naming
// ============================================================================

// Therapist business profile (non-PHI data)
export const therapistProfiles = pgTable("therapist_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  // Professional info
  // GOVERNANCE POLICY: Therapist names are stored UNENCRYPTED
  // Therapist names are part of professional/business identity and are NOT considered PHI
  // under HIPAA guidelines. Healthcare providers' names are routinely disclosed in directories,
  // websites, and business communications as part of normal practice operations.
  //
  // 1. LOGGING PROHIBITION: Despite being unencrypted, therapist names MUST NEVER appear
  //    in application logs. Use safe-logger.ts utility and log only user IDs, never names.
  //
  // 2. ACCESS CONTROL: Names are accessible to:
  //    - Organization members (staff directory, scheduling)
  //    - Patients assigned to the therapist (appointment confirmations, session records)
  //    - All access logged in audit_logs_hipaa table
  //
  // 3. AUDIT REQUIREMENTS: Name access logged with user ID, timestamp, and context
  //
  // 4. PUBLIC DISCLOSURE: Therapist names may appear in:
  //    - Public provider directories
  //    - Marketing materials and practice websites
  //    - Insurance network listings
  //    - Professional licensing databases
  //
  // Rationale: Unencrypted therapist names support normal business operations while
  // maintaining appropriate logging and audit controls for compliance.
  name: text("name").notNull(),
  professionalTitle: text("title"),  // "LCSW", "PhD", "LMFT"
  licenseNumber: text("license_number"),
  licenseState: varchar("license_state", { length: 2 }),
  licenseExpirationDate: timestamp("license_expiration_date"),
  npiNumber: varchar("npi_number", { length: 20 }),
  taxonomyCode: varchar("taxonomy_code", { length: 20 }),
  
  // Practice details
  specialties: jsonb("specialties").default([]),
  languages: jsonb("languages").default([]),
  sessionFormat: text("session_format"),  // 'in-person', 'telehealth', 'both'
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }),
  slidingScale: boolean("sliding_scale").default(false),
  groupSessionRate: decimal("group_session_rate", { precision: 10, scale: 2 }),
  therapistIdentities: jsonb("therapist_identities").default([]),
  
  // Professional details (API response fields)
  biography: text("biography"),
  yearsOfExperience: integer("years_of_experience"),
  qualifications: text("qualifications"),
  privatePayRate: decimal("private_pay_rate", { precision: 10, scale: 2 }),
  
  // Business contact (public)
  therapistBusinessPhone: text("therapist_business_phone"),
  therapistBusinessEmail: text("therapist_business_email"),
  therapistBusinessAddress: text("therapist_business_address"),
  therapistBusinessCity: text("therapist_business_city"),
  therapistBusinessState: text("therapist_business_state"),
  therapistBusinessZip: text("therapist_business_zip"),
  
  // CV/Documents
  cvFilename: text("cv_filename"),
  cvOriginalName: text("cv_original_name"),
  cvMimeType: text("cv_mime_type"),
  cvParsedForCredentialing: boolean("cv_parsed_for_credentialing").default(false),
  
  // Settings
  defaultNoteFormat: text("default_note_format").default("SOAP"),
  sessionDuration: integer("session_duration").default(50),
  timeZone: text("time_zone").default("America/New_York"),
  isInsuranceProvider: boolean("is_insurance_provider").default(false),
  acceptedProviders: jsonb("accepted_providers").default([]),
  
  // Stripe Connect (THERAPIST-LEVEL, not org-level)
  // Each therapist has their own Connect account for payment processing
  stripeConnectAccountId: text("stripe_connect_account_id").unique(),
  stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").default(false),
  stripeConnectChargesEnabled: boolean("stripe_connect_charges_enabled").default(false),
  stripeConnectPayoutsEnabled: boolean("stripe_connect_payouts_enabled").default(false),
  stripeConnectDetailsSubmitted: boolean("stripe_connect_details_submitted").default(false),
  stripeConnectCardIssuingEnabled: boolean("stripe_connect_card_issuing_enabled").default(false),  // Can issue cards
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist PHI (encrypted sensitive data)
export const therapistPHI = pgTable("therapist_phi", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Personal identity (encrypted)
  therapistSsnEncrypted: text("therapist_ssn_encrypted"),
  therapistDobEncrypted: text("therapist_dob_encrypted"),
  therapistGenderEncrypted: text("therapist_gender_encrypted"),
  therapistRaceEncrypted: text("therapist_race_encrypted"),
  
  // Personal contact (encrypted)
  therapistHomeAddressEncrypted: text("therapist_home_address_encrypted"),
  therapistHomeCityEncrypted: text("therapist_home_city_encrypted"),
  therapistHomeStateEncrypted: text("therapist_home_state_encrypted"),
  therapistHomeZipEncrypted: text("therapist_home_zip_encrypted"),
  therapistPersonalPhoneEncrypted: text("therapist_personal_phone_encrypted"),
  therapistPersonalEmailEncrypted: text("therapist_personal_email_encrypted"),
  
  // Birth information (encrypted)
  therapistBirthCityEncrypted: text("therapist_birth_city_encrypted"),
  therapistBirthStateEncrypted: text("therapist_birth_state_encrypted"),
  therapistBirthCountryEncrypted: text("therapist_birth_country_encrypted"),
  
  // Work authorization (encrypted)
  therapistIsUsCitizen: boolean("therapist_is_us_citizen"),
  therapistWorkPermitVisaEncrypted: text("therapist_work_permit_visa_encrypted"),
  
  // Emergency contact (encrypted)
  therapistEmergencyContactNameEncrypted: text("therapist_emergency_contact_name_encrypted"),
  therapistEmergencyContactPhoneEncrypted: text("therapist_emergency_contact_phone_encrypted"),
  therapistEmergencyContactRelationshipEncrypted: text("therapist_emergency_contact_relationship_encrypted"),
  
  // Search hashes (for encrypted fields)
  therapistPersonalPhoneSearchHash: text("therapist_personal_phone_search_hash"),
  therapistPersonalEmailSearchHash: text("therapist_personal_email_search_hash"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// PATIENT DATA LAYER - Healthcare-specific naming, all PHI encrypted
// ============================================================================

// Enhanced patients table with comprehensive PHI encryption
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  
  // Organization ownership (HIPAA 7-year retention)
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "restrict" }).notNull(),
  
  // Therapist assignment
  primaryTherapistId: integer("primary_therapist_id").references(() => usersAuth.id).notNull(),
  assignedTherapistIds: jsonb("assigned_therapist_ids").default([]),  // [10, 11] - team-based care
  
  // Basic info (non-PHI)
  // GOVERNANCE POLICY: Patient names are stored UNENCRYPTED for operational efficiency
  // and staff usability. This is HIPAA-permissible under the following strict controls:
  //
  // 1. ACCESS CONTROL: Name access restricted via role-based permissions (RBAC)
  //    - Only authorized healthcare staff can view patient names
  //    - All access logged in audit_logs table (HIPAA requirement)
  //
  // 2. LOGGING PROHIBITION: Patient names MUST NEVER appear in application logs
  //    - Use safe-logger.ts utility for all logging operations
  //    - Use patient ID references in logs, never names
  //
  // 3. AUDIT REQUIREMENTS: All name access is logged with:
  //    - User ID who accessed the name
  //    - Timestamp of access
  //    - Purpose/action context
  //    - IP address and session info
  //
  // 4. SEARCH CAPABILITY: patient_name_search_hash enables secure searching
  //    without exposing plaintext names in database indices
  //
  // Rationale: Unencrypted names balance HIPAA compliance with clinical workflow
  // efficiency. More sensitive PHI (DOB, contact info, diagnoses) remains encrypted.
  name: text("name").notNull(),
  patientNameSearchHash: text("patient_name_search_hash"), // SHA-256 hash for secure searching
  status: text("status").default("active"), // 'active', 'inactive', 'discharged'
  type: text("type").default("individual"), // 'individual', 'couple', 'family', 'group'
  
  // Contact PHI (encrypted)
  patientContactEmailEncrypted: text("patient_contact_email_encrypted"),
  patientContactPhoneEncrypted: text("patient_contact_phone_encrypted"),
  patientHomeAddressEncrypted: text("patient_home_address_encrypted"),
  patientHomeCityEncrypted: text("patient_home_city_encrypted"),
  patientHomeStateEncrypted: text("patient_home_state_encrypted"),
  patientHomeZipEncrypted: text("patient_home_zip_encrypted"),
  
  // Demographics PHI (encrypted)
  // NOTE: patientAge is NOT stored - computed dynamically from patientDobEncrypted
  // This ensures age accuracy and HIPAA Safe Harbor compliance (ages >89 → "90+")
  patientDobEncrypted: text("patient_dob_encrypted"),
  patientGenderEncrypted: text("patient_gender_encrypted"),
  patientRaceEncrypted: text("patient_race_encrypted"),
  patientEthnicityEncrypted: text("patient_ethnicity_encrypted"),
  patientPronounsEncrypted: text("patient_pronouns_encrypted"),
  patientHometownEncrypted: text("patient_hometown_encrypted"),
  
  // Clinical PHI (encrypted)
  patientClinicalNotesEncrypted: text("patient_clinical_notes_encrypted"),
  patientDiagnosisCodesEncrypted: text("patient_diagnosis_codes_encrypted"),
  patientPrimaryDiagnosisEncrypted: text("patient_primary_diagnosis_encrypted"),
  patientSecondaryDiagnosisEncrypted: text("patient_secondary_diagnosis_encrypted"),
  patientTertiaryDiagnosisEncrypted: text("patient_tertiary_diagnosis_encrypted"),
  patientMedicalHistoryEncrypted: text("patient_medical_history_encrypted"),
  patientTreatmentHistoryEncrypted: text("patient_treatment_history_encrypted"),
  
  // Medical provider PHI (encrypted)
  patientReferringPhysicianEncrypted: text("patient_referring_physician_encrypted"),
  patientReferringPhysicianNpiEncrypted: text("patient_referring_physician_npi_encrypted"),
  
  // Insurance PHI (encrypted)
  patientInsuranceProviderEncrypted: text("patient_insurance_provider_encrypted"),
  patientInsuranceInfoEncrypted: text("patient_insurance_info_encrypted"),
  patientMemberIdEncrypted: text("patient_member_id_encrypted"),
  patientGroupNumberEncrypted: text("patient_group_number_encrypted"),
  patientPrimaryInsuredNameEncrypted: text("patient_primary_insured_name_encrypted"),
  patientPrimaryInsuredDobEncrypted: text("patient_primary_insured_dob_encrypted"),
  patientAuthorizationInfoEncrypted: text("patient_authorization_info_encrypted"),
  patientPriorAuthNumberEncrypted: text("patient_prior_auth_number_encrypted"),
  
  // Search hashes
  patientContactEmailSearchHash: text("patient_contact_email_search_hash"),
  patientContactPhoneSearchHash: text("patient_contact_phone_search_hash"),
  
  // Billing (non-PHI)
  billingType: text("billing_type").default("private_pay"),
  sessionCost: decimal("session_cost", { precision: 10, scale: 2 }),
  noShowFee: decimal("no_show_fee", { precision: 10, scale: 2 }),
  copayAmount: decimal("copay_amount", { precision: 10, scale: 2 }),
  deductibleAmount: decimal("deductible_amount", { precision: 10, scale: 2 }),
  defaultCptCode: text("default_cpt_code"),
  placeOfService: text("place_of_service").default("11"),  // 11=office, 02=telehealth
  authorizationRequired: boolean("authorization_required").default(false),
  
  // Files
  patientPhotoFilename: text("patient_photo_filename"),
  patientPhotoOriginalName: text("patient_photo_original_name"),
  patientPhotoMimeType: text("patient_photo_mime_type"),
  
  // Stripe
  stripeCustomerId: text("stripe_customer_id"),
  
  // Soft delete (HIPAA 7-year retention)
  deleted: boolean("deleted").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// CLINICAL SESSION LAYER - Healthcare-specific naming
// ============================================================================

// Enhanced clinical sessions table with PHI encryption
export const clinicalSessions = pgTable("clinical_sessions", {
  id: serial("id").primaryKey(),
  
  // Ownership
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "restrict" }).notNull(),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "restrict" }).notNull(),
  therapistId: integer("therapist_id").references(() => usersAuth.id).notNull(),
  
  // Session details
  date: timestamp("date").notNull(),
  duration: integer("duration").default(50),
  type: text("type").default("individual"),
  status: text("status").default("scheduled"), // 'scheduled', 'completed', 'cancelled', 'no_show'
  
  // Clinical PHI (encrypted)
  sessionClinicalNotesEncrypted: text("session_clinical_notes_encrypted"),
  sessionSubjectiveNotesEncrypted: text("session_subjective_notes_encrypted"),      // SOAP: Subjective
  sessionObjectiveNotesEncrypted: text("session_objective_notes_encrypted"),       // SOAP: Objective
  sessionAssessmentNotesEncrypted: text("session_assessment_notes_encrypted"),     // SOAP: Assessment
  sessionPlanNotesEncrypted: text("session_plan_notes_encrypted"),                 // SOAP: Plan
  sessionTreatmentGoalsEncrypted: text("session_treatment_goals_encrypted"),
  sessionProgressNotesEncrypted: text("session_progress_notes_encrypted"),
  sessionInterventionsEncrypted: text("session_interventions_encrypted"),
  
  // Session metadata
  isIntake: boolean("is_intake").default(false),
  sessionFormat: text("session_format"),  // 'in-person', 'telehealth'
  
  // Billing
  cptCode: text("cpt_code"),
  addOnCptCodes: jsonb("add_on_cpt_codes").default([]),
  authorizationRequired: boolean("authorization_required").default(false),
  authorizationNumber: text("authorization_number"),
  isPaid: boolean("is_paid").default(false),
  paymentId: text("payment_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// TREATMENT PLAN LAYER - Healthcare-specific naming
// ============================================================================

// Enhanced treatment plans with PHI encryption
export const patientTreatmentPlans = pgTable("patient_treatment_plans", {
  id: serial("id").primaryKey(),
  
  // Ownership
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "restrict" }).notNull(),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "restrict" }).notNull(),
  therapistId: integer("therapist_id").references(() => usersAuth.id).notNull(),
  
  // Plan details
  version: integer("version").notNull(),
  status: text("status").default("active"), // 'draft', 'active', 'inactive', 'archived'
  
  // Clinical PHI (encrypted)
  treatmentPlanContentEncrypted: text("treatment_plan_content_encrypted"),
  treatmentPlanGoalsEncrypted: text("treatment_plan_goals_encrypted"),
  treatmentPlanObjectivesEncrypted: text("treatment_plan_objectives_encrypted"),
  treatmentPlanInterventionsEncrypted: text("treatment_plan_interventions_encrypted"),
  treatmentPlanProgressNotesEncrypted: text("treatment_plan_progress_notes_encrypted"),
  treatmentPlanDiagnosisEncrypted: text("treatment_plan_diagnosis_encrypted"),
  treatmentPlanAssessmentEncrypted: text("treatment_plan_assessment_encrypted"),
  
  // Dates
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  reviewDate: timestamp("review_date"),
  nextReviewDate: timestamp("next_review_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// DOCUMENT MANAGEMENT TABLES
// ============================================================================

// Document templates for intake forms, consents, etc.
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  
  // Classification
  type: text("type").notNull(), // 'informed_consent', 'privacy_policy', 'hipaa_notice', 'intake_form', 'telehealth_consent'
  title: text("title").notNull(),
  content: text("content").notNull(), // Template content with placeholders like {{therapist_name}}
  category: text("category").default("intake-docs"), // 'intake-docs', 'clinical-forms', etc.
  
  // Ownership (null = system-wide template, set = organization-specific)
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Status
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  
  // Metadata
  createdBy: integer("created_by").references(() => usersAuth.id),
  updatedBy: integer("updated_by").references(() => usersAuth.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient documents (completed forms, signed consents, etc.)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  
  // Ownership
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "restrict" }).notNull(),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "restrict" }).notNull(),
  templateId: integer("template_id").references(() => documentTemplates.id, { onDelete: "set null" }),
  
  // Classification
  type: text("type").notNull(), // Same types as templates
  title: text("title").notNull(),
  
  // Content (encrypted as it contains PHI)
  contentEncrypted: text("content_encrypted"), // Encrypted document content
  fileUrl: text("file_url"), // Optional: S3/storage URL for uploaded files
  fileName: text("file_name"),
  fileMimeType: text("file_mime_type"),
  
  // Status tracking
  status: text("status").default("draft"), // 'draft', 'final', 'signed', 'archived'
  signedAt: timestamp("signed_at"),
  signedBy: text("signed_by"), // Patient name/signature
  
  // Audit
  createdBy: integer("created_by").references(() => usersAuth.id).notNull(),
  updatedBy: integer("updated_by").references(() => usersAuth.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// AUDIT AND COMPLIANCE TABLES
// ============================================================================

// Enhanced audit logs for HIPAA compliance
export const auditLogsHIPAA = pgTable("audit_logs_hipaa", {
  id: serial("id").primaryKey(),
  
  // User and session information
  userId: integer("user_id").references(() => usersAuth.id),
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Action details
  action: text("action").notNull(), // CREATE, READ, UPDATE, DELETE, PHI_ACCESS
  resourceType: text("resource_type").notNull(), // PATIENT, CLINICAL_SESSION, TREATMENT_PLAN, etc.
  resourceId: integer("resource_id"),
  
  // PHI access tracking
  fieldsAccessed: jsonb("fields_accessed"), // Array of PHI fields accessed
  phiFieldsCount: integer("phi_fields_count").default(0),
  
  // Request details
  requestMethod: text("request_method"),
  requestPath: text("request_path"),
  requestBody: text("request_body"), // Encrypted if contains PHI
  
  // Response details
  responseStatus: integer("response_status"),
  responseTime: integer("response_time"), // milliseconds
  
  // Security context
  securityLevel: text("security_level").default("standard"), // standard, phi-protected, admin
  riskScore: integer("risk_score").default(0),
  
  // Compliance tracking
  hipaaCompliant: boolean("hipaa_compliant").default(true),
  dataRetentionDate: timestamp("data_retention_date"), // 7 years from creation
  
  // Correlation and tracing
  correlationId: text("correlation_id"),
  traceId: text("trace_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersAuthRelations = relations(usersAuth, ({ one, many }) => ({
  therapistProfile: one(therapistProfiles),
  therapistPHI: one(therapistPHI),
  mfaSecret: one(mfaSecrets),
  mfaRecoveryCodes: many(mfaRecoveryCodes),
  organizationMemberships: many(organizationMemberships),
  patients: many(patients),
  clinicalSessions: many(clinicalSessions),
  patientTreatmentPlans: many(patientTreatmentPlans),
  auditLogs: many(auditLogsHIPAA),
  tasks: many(tasks),
  workSchedules: many(workSchedules),
  calendarBlocks: many(calendarBlocks),
  userSettings: one(userSettings),
  notifications: many(notifications),
  notificationSettings: one(notificationSettings),
  invoices: many(invoices),
  cardTransactions: many(cardTransactions),
  keyRotations: many(keyRotationHistory),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
  invites: many(organizationInvites),
  patients: many(patients),
  clinicalSessions: many(clinicalSessions),
  patientTreatmentPlans: many(patientTreatmentPlans),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
  user: one(usersAuth, {
    fields: [organizationMemberships.userId],
    references: [usersAuth.id],
  }),
}));

export const organizationInvitesRelations = relations(organizationInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvites.organizationId],
    references: [organizations.id],
  }),
  inviter: one(usersAuth, {
    fields: [organizationInvites.invitedBy],
    references: [usersAuth.id],
  }),
  accepter: one(usersAuth, {
    fields: [organizationInvites.acceptedBy],
    references: [usersAuth.id],
    relationName: 'acceptedBy',
  }),
}));

export const therapistProfilesRelations = relations(therapistProfiles, ({ one }) => ({
  user: one(usersAuth, {
    fields: [therapistProfiles.userId],
    references: [usersAuth.id],
  }),
}));

export const therapistPHIRelations = relations(therapistPHI, ({ one }) => ({
  user: one(usersAuth, {
    fields: [therapistPHI.userId],
    references: [usersAuth.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.organizationId],
    references: [organizations.id],
  }),
  primaryTherapist: one(usersAuth, {
    fields: [patients.primaryTherapistId],
    references: [usersAuth.id],
  }),
  clinicalSessions: many(clinicalSessions),
  patientTreatmentPlans: many(patientTreatmentPlans),
}));

export const clinicalSessionsRelations = relations(clinicalSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [clinicalSessions.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [clinicalSessions.patientId],
    references: [patients.id],
  }),
  therapist: one(usersAuth, {
    fields: [clinicalSessions.therapistId],
    references: [usersAuth.id],
  }),
}));

export const patientTreatmentPlansRelations = relations(patientTreatmentPlans, ({ one }) => ({
  organization: one(organizations, {
    fields: [patientTreatmentPlans.organizationId],
    references: [organizations.id],
  }),
  patient: one(patients, {
    fields: [patientTreatmentPlans.patientId],
    references: [patients.id],
  }),
  therapist: one(usersAuth, {
    fields: [patientTreatmentPlans.therapistId],
    references: [usersAuth.id],
  }),
}));

export const auditLogsHIPAARelations = relations(auditLogsHIPAA, ({ one }) => ({
  user: one(usersAuth, {
    fields: [auditLogsHIPAA.userId],
    references: [usersAuth.id],
  }),
}));

export const mfaSecretsRelations = relations(mfaSecrets, ({ one }) => ({
  user: one(usersAuth, {
    fields: [mfaSecrets.userId],
    references: [usersAuth.id],
  }),
}));

export const mfaRecoveryCodesRelations = relations(mfaRecoveryCodes, ({ one }) => ({
  user: one(usersAuth, {
    fields: [mfaRecoveryCodes.userId],
    references: [usersAuth.id],
  }),
}));

export const keyRotationHistoryRelations = relations(keyRotationHistory, ({ one }) => ({
  rotatedByUser: one(usersAuth, {
    fields: [keyRotationHistory.rotatedBy],
    references: [usersAuth.id],
  }),
}));

// ============================================================================
// TASKS TABLE - Task Management
// ============================================================================

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  createdByUserId: integer("created_by_user_id").notNull().references(() => usersAuth.id),
  assignedToUserId: integer("assigned_to_user_id").references(() => usersAuth.id),
  patientId: integer("patient_id").references(() => patients.id),
  sessionId: integer("session_id").references(() => clinicalSessions.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending").$type<"pending" | "in_progress" | "completed" | "cancelled">(),
  priority: text("priority").default("medium").$type<"low" | "medium" | "high" | "urgent">(),
  type: text("type").default("general"),
  categoryId: integer("category_id"),
  clientId: integer("client_id"),
  isAutomated: boolean("is_automated").default(false),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(usersAuth, {
    fields: [tasks.createdByUserId],
    references: [usersAuth.id],
  }),
  assignedTo: one(usersAuth, {
    fields: [tasks.assignedToUserId],
    references: [usersAuth.id],
  }),
  patient: one(patients, {
    fields: [tasks.patientId],
    references: [patients.id],
  }),
}));

// ============================================================================
// WORK SCHEDULE LAYER - User availability management
// ============================================================================

export const workSchedules = pgTable("work_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  startTime: text("start_time").notNull(), // HH:MM format (e.g., "09:00")
  endTime: text("end_time").notNull(), // HH:MM format (e.g., "17:00")
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workSchedulesRelations = relations(workSchedules, ({ one }) => ({
  user: one(usersAuth, {
    fields: [workSchedules.userId],
    references: [usersAuth.id],
  }),
  organization: one(organizations, {
    fields: [workSchedules.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================================================
// CALENDAR BLOCK LAYER - Time off and blocked periods
// ============================================================================

export const calendarBlocks = pgTable("calendar_blocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  blockType: text("block_type").notNull(), // 'vacation', 'sick', 'admin', 'personal', 'other'
  reason: text("reason"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: jsonb("recurring_pattern"), // { frequency: 'weekly'|'monthly', interval: 1, daysOfWeek: [1,3,5] }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarBlocksRelations = relations(calendarBlocks, ({ one }) => ({
  user: one(usersAuth, {
    fields: [calendarBlocks.userId],
    references: [usersAuth.id],
  }),
  organization: one(organizations, {
    fields: [calendarBlocks.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================================================
// OPERATIONAL TABLES - Settings, Notifications, Tasks
// ============================================================================

// User settings for automation preferences
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Task automation settings
  autoCreateSessionNoteTasks: boolean("auto_create_session_note_tasks").default(true),
  autoCreateIntakeDocumentTasks: boolean("auto_create_intake_document_tasks").default(true),
  autoCreateInvoiceTasks: boolean("auto_create_invoice_tasks").default(true),
  autoResolveCompletedTasks: boolean("auto_resolve_completed_tasks").default(true),
  
  // Notification preferences
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
  smsNotificationsEnabled: boolean("sms_notifications_enabled").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications for users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  title: text("title").notNull(),
  message: text("message"),
  type: text("type").notNull(), // 'info', 'task_automation', 'session_reminder', etc.
  
  // Entity linking
  entityId: integer("entity_id"),
  entityType: text("entity_type"), // 'task', 'session', 'patient', etc.
  
  // Status
  isRead: boolean("is_read").default(false),
  isAutomated: boolean("is_automated").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification settings for users
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Notification preferences by type
  sessionReminder: boolean("session_reminder").default(true),
  taskAutomation: boolean("task_automation").default(true),
  taskCompleted: boolean("task_completed").default(true),
  documentUploaded: boolean("document_uploaded").default(true),
  invoiceGenerated: boolean("invoice_generated").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices for billing
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  patientId: integer("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  
  // Invoice details
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status").notNull(), // 'draft', 'sent', 'paid', 'overdue'
  dueDate: timestamp("due_date"),
  
  // Financial details
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  
  // Stripe integration
  stripeInvoiceId: text("stripe_invoice_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeHostedUrl: text("stripe_hosted_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice items for detailed billing
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  sessionId: integer("session_id").references(() => clinicalSessions.id, { onDelete: "set null" }),
  
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Card transactions for Stripe integration
export const cardTransactions = pgTable("card_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  // Transaction details
  stripeTransactionId: text("stripe_transaction_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("usd"),
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  
  // Card details
  last4: text("last4"),
  brand: text("brand"),
  
  // Metadata
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for all operational tables
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(usersAuth, {
    fields: [userSettings.userId],
    references: [usersAuth.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(usersAuth, {
    fields: [notifications.userId],
    references: [usersAuth.id],
  }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(usersAuth, {
    fields: [notificationSettings.userId],
    references: [usersAuth.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(usersAuth, {
    fields: [invoices.userId],
    references: [usersAuth.id],
  }),
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  invoiceItems: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  session: one(clinicalSessions, {
    fields: [invoiceItems.sessionId],
    references: [clinicalSessions.id],
  }),
}));

export const cardTransactionsRelations = relations(cardTransactions, ({ one }) => ({
  user: one(usersAuth, {
    fields: [cardTransactions.userId],
    references: [usersAuth.id],
  }),
}));

// ============================================================================
// MEETINGS - Non-clinical meetings and appointments
// ============================================================================

export const meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  color: text("color").notNull(), // Hex color code
  isDefault: boolean("is_default").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  typeId: integer("type_id").references(() => meetingTypes.id, { onDelete: "set null" }),
  
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// CV PARSER - Credentialing data extracted from CVs
// ============================================================================

export const cvParserEducation = pgTable("cv_parser_education", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  university: text("university").notNull(),
  degree: text("degree").notNull(),
  major: text("major").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  graduationDate: timestamp("graduation_date"),
  gpa: text("gpa"),
  honors: text("honors"),
  isVerified: boolean("is_verified").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cvParserWorkExperience = pgTable("cv_parser_work_experience", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersAuth.id, { onDelete: "cascade" }).notNull(),
  
  organization: text("organization").notNull(),
  position: text("position").notNull(),
  location: text("location"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isCurrent: boolean("is_current").default(false),
  description: text("description"),
  responsibilities: jsonb("responsibilities"),
  achievements: jsonb("achievements"),
  isVerified: boolean("is_verified").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cvParserEducationRelations = relations(cvParserEducation, ({ one }) => ({
  user: one(usersAuth, {
    fields: [cvParserEducation.userId],
    references: [usersAuth.id],
  }),
}));

export const cvParserWorkExperienceRelations = relations(cvParserWorkExperience, ({ one }) => ({
  user: one(usersAuth, {
    fields: [cvParserWorkExperience.userId],
    references: [usersAuth.id],
  }),
}));

// ============================================================================
// SCHEMAS AND TYPES
// ============================================================================

// Organization schemas
export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// Organization membership schemas
export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships);
export const selectOrganizationMembershipSchema = createSelectSchema(organizationMemberships);
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type NewOrganizationMembership = typeof organizationMemberships.$inferInsert;

// Organization invite schemas
export const insertOrganizationInviteSchema = createInsertSchema(organizationInvites);
export const selectOrganizationInviteSchema = createSelectSchema(organizationInvites);
export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type NewOrganizationInvite = typeof organizationInvites.$inferInsert;

// User auth schemas
export const insertUserAuthSchema = createInsertSchema(usersAuth);
export const selectUserAuthSchema = createSelectSchema(usersAuth);
export type UserAuth = typeof usersAuth.$inferSelect;
export type NewUserAuth = typeof usersAuth.$inferInsert;

// Therapist profile schemas
export const insertTherapistProfileSchema = createInsertSchema(therapistProfiles);
export const selectTherapistProfileSchema = createSelectSchema(therapistProfiles);
export type TherapistProfile = typeof therapistProfiles.$inferSelect;
export type NewTherapistProfile = typeof therapistProfiles.$inferInsert;

// Therapist PHI schemas
export const insertTherapistPHISchema = createInsertSchema(therapistPHI);
export const selectTherapistPHISchema = createSelectSchema(therapistPHI);
export type TherapistPHI = typeof therapistPHI.$inferSelect;
export type NewTherapistPHI = typeof therapistPHI.$inferInsert;

// Patient schemas
export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

// Clinical session schemas
export const insertClinicalSessionSchema = createInsertSchema(clinicalSessions);
export const selectClinicalSessionSchema = createSelectSchema(clinicalSessions);
export type ClinicalSession = typeof clinicalSessions.$inferSelect;
export type NewClinicalSession = typeof clinicalSessions.$inferInsert;

// Treatment plan schemas
export const insertPatientTreatmentPlanSchema = createInsertSchema(patientTreatmentPlans);
export const selectPatientTreatmentPlanSchema = createSelectSchema(patientTreatmentPlans);
export type PatientTreatmentPlan = typeof patientTreatmentPlans.$inferSelect;
export type NewPatientTreatmentPlan = typeof patientTreatmentPlans.$inferInsert;

// Tasks schemas
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

// Work schedule schemas
export const insertWorkScheduleSchema = createInsertSchema(workSchedules);
export const selectWorkScheduleSchema = createSelectSchema(workSchedules);
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type NewWorkSchedule = typeof workSchedules.$inferInsert;

// Calendar block schemas
export const insertCalendarBlockSchema = createInsertSchema(calendarBlocks);
export const selectCalendarBlockSchema = createSelectSchema(calendarBlocks);
export type CalendarBlock = typeof calendarBlocks.$inferSelect;
export type NewCalendarBlock = typeof calendarBlocks.$inferInsert;

// Audit log schemas
export const insertAuditLogHIPAASchema = createInsertSchema(auditLogsHIPAA);
export const selectAuditLogHIPAASchema = createSelectSchema(auditLogsHIPAA);
export type AuditLogHIPAA = typeof auditLogsHIPAA.$inferSelect;
export type NewAuditLogHIPAA = typeof auditLogsHIPAA.$inferInsert;

// User settings schemas
export const insertUserSettingsSchema = createInsertSchema(userSettings);
export const selectUserSettingsSchema = createSelectSchema(userSettings);
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// Notifications schemas
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Notification settings schemas
export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings);
export const selectNotificationSettingsSchema = createSelectSchema(notificationSettings);
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type NewNotificationSettings = typeof notificationSettings.$inferInsert;

// Invoices schemas
export const insertInvoiceSchema = createInsertSchema(invoices);
export const selectInvoiceSchema = createSelectSchema(invoices);
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// Invoice items schemas
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);
export const selectInvoiceItemSchema = createSelectSchema(invoiceItems);
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

// Card transactions schemas
export const insertCardTransactionSchema = createInsertSchema(cardTransactions);
export const selectCardTransactionSchema = createSelectSchema(cardTransactions);
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;

// Meeting types schemas
export const insertMeetingTypeSchema = createInsertSchema(meetingTypes);
export const selectMeetingTypeSchema = createSelectSchema(meetingTypes);
export type MeetingType = typeof meetingTypes.$inferSelect;
export type NewMeetingType = typeof meetingTypes.$inferInsert;

// Meetings schemas
export const insertMeetingSchema = createInsertSchema(meetings);
export const selectMeetingSchema = createSelectSchema(meetings);
export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

// CV Parser Education schemas
export const insertCVParserEducationSchema = createInsertSchema(cvParserEducation);
export const selectCVParserEducationSchema = createSelectSchema(cvParserEducation);
export type CVParserEducation = typeof cvParserEducation.$inferSelect;
export type NewCVParserEducation = typeof cvParserEducation.$inferInsert;

// CV Parser Work Experience schemas
export const insertCVParserWorkExperienceSchema = createInsertSchema(cvParserWorkExperience);
export const selectCVParserWorkExperienceSchema = createSelectSchema(cvParserWorkExperience);
export type CVParserWorkExperience = typeof cvParserWorkExperience.$inferSelect;
export type NewCVParserWorkExperience = typeof cvParserWorkExperience.$inferInsert;

// MFA secrets schemas
export const insertMFASecretSchema = createInsertSchema(mfaSecrets);
export const selectMFASecretSchema = createSelectSchema(mfaSecrets);
export type MFASecret = typeof mfaSecrets.$inferSelect;
export type NewMFASecret = typeof mfaSecrets.$inferInsert;

// MFA recovery codes schemas
export const insertMFARecoveryCodeSchema = createInsertSchema(mfaRecoveryCodes);
export const selectMFARecoveryCodeSchema = createSelectSchema(mfaRecoveryCodes);
export type MFARecoveryCode = typeof mfaRecoveryCodes.$inferSelect;
export type NewMFARecoveryCode = typeof mfaRecoveryCodes.$inferInsert;

// Key rotation history schemas
export const insertKeyRotationHistorySchema = createInsertSchema(keyRotationHistory);
export const selectKeyRotationHistorySchema = createSelectSchema(keyRotationHistory);
export type KeyRotationHistory = typeof keyRotationHistory.$inferSelect;
export type NewKeyRotationHistory = typeof keyRotationHistory.$inferInsert;

// ============================================================================
// MEDICAL CODES & REFERENCE DATA - Billing codes and assessment categories
// ============================================================================

// Medical Codes table - CPT billing codes (shared reference data)
export const medicalCodes = pgTable("medical_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  codeType: text("code_type").notNull(), // 'cpt', 'icd10', 'hcpcs'
  category: text("category"), // 'individual', 'family', 'group', 'assessment', 'addon'
  duration: integer("duration"), // typical duration in minutes
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date"),
  terminationDate: timestamp("termination_date"),
  
  // Audit fields for compliance
  createdBy: integer("created_by").references(() => usersAuth.id),
  updatedBy: integer("updated_by").references(() => usersAuth.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assessment Categories table (shared reference data)
export const assessmentCategories = pgTable("assessment_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  // Audit fields for compliance
  createdBy: integer("created_by").references(() => usersAuth.id),
  updatedBy: integer("updated_by").references(() => usersAuth.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical codes schemas
export const insertMedicalCodeSchema = createInsertSchema(medicalCodes);
export const selectMedicalCodeSchema = createSelectSchema(medicalCodes);
export type MedicalCode = typeof medicalCodes.$inferSelect;
export type NewMedicalCode = typeof medicalCodes.$inferInsert;

// Assessment categories schemas
export const insertAssessmentCategorySchema = createInsertSchema(assessmentCategories);
export const selectAssessmentCategorySchema = createSelectSchema(assessmentCategories);
export type AssessmentCategory = typeof assessmentCategories.$inferSelect;
export type NewAssessmentCategory = typeof assessmentCategories.$inferInsert;
