# Healthcare Schema Naming Conventions

## Overview

This document outlines the naming conventions used in the refactored HIPAA-compliant healthcare schema. The conventions prioritize clarity, consistency, and healthcare industry standards.

## Core Principles

1. **Healthcare-Specific Terminology**: Use industry-standard terms (`therapist`, `patient`, `clinical_session`)
2. **Clear Prefixes**: Distinguish between therapist and patient data with consistent prefixes
3. **Consistent Casing**: Use camelCase for TypeScript, snake_case for database columns
4. **Encrypted Field Suffixes**: All PHI fields end with `_encrypted`
5. **Search Hash Suffixes**: Searchable encrypted fields have corresponding `_search_hash` fields

## Table Naming

### Core Tables

| Purpose | Table Name | Description |
|---------|------------|-------------|
| Authentication | `users_auth` | User authentication data only |
| Organizations | `organizations` | Practice/business entities |
| Memberships | `organization_memberships` | User-organization relationships |
| Therapist Profile | `therapist_profiles` | Non-PHI therapist business data |
| Therapist PHI | `therapist_phi` | Encrypted therapist personal data |
| Patients | `patients` | Patient records with encrypted PHI |
| Clinical Sessions | `clinical_sessions` | Therapy sessions with encrypted notes |
| Treatment Plans | `patient_treatment_plans` | Treatment plans with encrypted content |
| Audit Logs | `audit_logs_hipaa` | HIPAA compliance audit trail |

## Field Naming Conventions

### Therapist Data Fields

#### Professional Profile (Non-PHI)
```typescript
// Business contact information
therapistBusinessPhone: string
therapistBusinessEmail: string
therapistBusinessAddress: string
therapistBusinessCity: string
therapistBusinessState: string
therapistBusinessZip: string

// Professional details
professionalTitle: string        // "LCSW", "PhD", "LMFT"
licenseNumber: string
licenseState: string
npiNumber: string
taxonomyCode: string
specialties: string[]
languages: string[]
sessionFormat: string           // 'in-person', 'telehealth', 'both'
baseRate: number
slidingScale: boolean
groupSessionRate: number
```

#### Personal PHI (Encrypted)
```typescript
// Personal identity
therapistSsnEncrypted: string
therapistDobEncrypted: string

// Personal contact
therapistHomeAddressEncrypted: string
therapistHomeCityEncrypted: string
therapistHomeStateEncrypted: string
therapistHomeZipEncrypted: string
therapistPersonalPhoneEncrypted: string
therapistPersonalEmailEncrypted: string

// Birth information
therapistBirthCityEncrypted: string
therapistBirthStateEncrypted: string
therapistBirthCountryEncrypted: string

// Work authorization
therapistIsUsCitizen: boolean
therapistWorkPermitVisaEncrypted: string

// Emergency contact
therapistEmergencyContactNameEncrypted: string
therapistEmergencyContactPhoneEncrypted: string
therapistEmergencyContactRelationshipEncrypted: string

// Search hashes
therapistPersonalPhoneSearchHash: string
therapistPersonalEmailSearchHash: string
```

### Patient Data Fields

#### Basic Information (Non-PHI)
```typescript
name: string
status: string                    // 'active', 'inactive', 'discharged'
type: string                      // 'individual', 'couple', 'family', 'group'
billingType: string               // 'private_pay', 'insurance', 'sliding_scale'
sessionCost: number
noShowFee: number
copayAmount: number
deductibleAmount: number
defaultCptCode: string
placeOfService: string            // '11'=office, '02'=telehealth
authorizationRequired: boolean
```

#### Contact PHI (Encrypted)
```typescript
patientContactEmailEncrypted: string
patientContactPhoneEncrypted: string
patientHomeAddressEncrypted: string
patientHomeCityEncrypted: string
patientHomeStateEncrypted: string
patientHomeZipEncrypted: string

// Search hashes
patientContactEmailSearchHash: string
patientContactPhoneSearchHash: string
```

#### Demographics PHI (Encrypted)
```typescript
patientDobEncrypted: string
patientGenderEncrypted: string
patientRaceEncrypted: string
patientEthnicityEncrypted: string
patientPronounsEncrypted: string
patientHometownEncrypted: string
```

#### Clinical PHI (Encrypted)
```typescript
patientClinicalNotesEncrypted: string
patientDiagnosisCodesEncrypted: string
patientPrimaryDiagnosisEncrypted: string
patientSecondaryDiagnosisEncrypted: string
patientTertiaryDiagnosisEncrypted: string
patientMedicalHistoryEncrypted: string
patientTreatmentHistoryEncrypted: string
```

#### Medical Provider PHI (Encrypted)
```typescript
patientReferringPhysicianEncrypted: string
patientReferringPhysicianNpiEncrypted: string
```

#### Insurance PHI (Encrypted)
```typescript
patientInsuranceProviderEncrypted: string
patientInsuranceInfoEncrypted: string
patientMemberIdEncrypted: string
patientGroupNumberEncrypted: string
patientPrimaryInsuredNameEncrypted: string
patientPrimaryInsuredDobEncrypted: string
patientAuthorizationInfoEncrypted: string
patientPriorAuthNumberEncrypted: string
```

### Clinical Session Fields

#### Session Details (Non-PHI)
```typescript
date: Date
duration: number
type: string                      // 'individual', 'couple', 'family', 'group'
status: string                    // 'scheduled', 'completed', 'cancelled', 'no_show'
isIntake: boolean
sessionFormat: string             // 'in-person', 'telehealth'
cptCode: string
addOnCptCodes: string[]
authorizationRequired: boolean
authorizationNumber: string
isPaid: boolean
paymentId: number
```

#### Clinical PHI (Encrypted)
```typescript
sessionClinicalNotesEncrypted: string
sessionSubjectiveNotesEncrypted: string      // SOAP: Subjective
sessionObjectiveNotesEncrypted: string       // SOAP: Objective
sessionAssessmentNotesEncrypted: string      // SOAP: Assessment
sessionPlanNotesEncrypted: string            // SOAP: Plan
sessionTreatmentGoalsEncrypted: string
sessionProgressNotesEncrypted: string
sessionInterventionsEncrypted: string
```

### Treatment Plan Fields

#### Plan Details (Non-PHI)
```typescript
version: number
status: string                    // 'draft', 'active', 'inactive', 'archived'
startDate: Date
endDate: Date
reviewDate: Date
nextReviewDate: Date
```

#### Clinical PHI (Encrypted)
```typescript
treatmentPlanContentEncrypted: string
treatmentPlanGoalsEncrypted: string
treatmentPlanObjectivesEncrypted: string
treatmentPlanInterventionsEncrypted: string
treatmentPlanProgressNotesEncrypted: string
treatmentPlanDiagnosisEncrypted: string
treatmentPlanAssessmentEncrypted: string
```

## Organization Fields

### Business Information
```typescript
name: string
type: string                      // 'solo', 'partnership', 'group_practice'
organizationBusinessEinEncrypted: string
organizationBusinessAddress: string
organizationBusinessCity: string
organizationBusinessState: string
organizationBusinessZip: string
organizationBusinessPhone: string
organizationBusinessEmail: string
defaultSessionDuration: number
timezone: string
```

## Organization Membership Fields

### Role and Permissions
```typescript
role: string                      // 'business_owner', 'admin', 'therapist', 'contractor_1099'
canViewAllPatients: boolean
canViewSelectedPatients: number[] // Array of user IDs
canViewAllCalendars: boolean
canViewSelectedCalendars: number[] // Array of user IDs
canManageBilling: boolean
canManageStaff: boolean
canManageSettings: boolean
canCreatePatients: boolean
employmentStartDate: Date
employmentEndDate: Date
isActive: boolean
isPrimaryOwner: boolean
```

## Database Column Naming

### Conversion Rules

1. **camelCase → snake_case**: Convert TypeScript camelCase to database snake_case
2. **Add prefixes**: Add appropriate prefixes (`therapist_`, `patient_`, `organization_`)
3. **Add suffixes**: Add `_encrypted` or `_search_hash` suffixes as needed

### Examples

| TypeScript Field | Database Column |
|------------------|-----------------|
| `therapistPersonalPhone` | `therapist_personal_phone_encrypted` |
| `patientContactEmail` | `patient_contact_email_encrypted` |
| `patientContactEmailSearchHash` | `patient_contact_email_search_hash` |
| `organizationBusinessEin` | `organization_business_ein_encrypted` |
| `sessionClinicalNotes` | `session_clinical_notes_encrypted` |

## API Field Mapping

### Request/Response Fields

When sending data to/from the API, use the TypeScript field names (camelCase). The middleware automatically handles encryption/decryption and field mapping.

### Examples

#### Creating a Patient
```typescript
// API Request
{
  "name": "John Doe",
  "contactEmail": "john@example.com",
  "contactPhone": "555-1234",
  "dob": "1990-01-01",
  "clinicalNotes": "Patient presents with anxiety"
}

// Database Storage (after encryption)
{
  "name": "John Doe",
  "patient_contact_email_encrypted": "v1:abc123:def456:ghi789...",
  "patient_contact_phone_encrypted": "v1:xyz789:uvw456:rst123...",
  "patient_dob_encrypted": "v1:def456:ghi789:jkl012...",
  "patient_clinical_notes_encrypted": "v1:mno345:pqr678:stu901...",
  "patient_contact_email_search_hash": "a1b2c3d4e5f6...",
  "patient_contact_phone_search_hash": "f6e5d4c3b2a1..."
}
```

## Migration from Old Schema

### Field Mapping

| Old Field | New Field |
|-----------|-----------|
| `personalAddressEncrypted` | `therapist_home_address_encrypted` |
| `personalPhoneEncrypted` | `therapist_personal_phone_encrypted` |
| `personalEmailEncrypted` | `therapist_personal_email_encrypted` |
| `emailEncrypted` | `patient_contact_email_encrypted` |
| `phoneEncrypted` | `patient_contact_phone_encrypted` |
| `addressEncrypted` | `patient_home_address_encrypted` |
| `notesEncrypted` | `patient_clinical_notes_encrypted` |
| `diagnosisCodesEncrypted` | `patient_diagnosis_codes_encrypted` |

### Table Mapping

| Old Table | New Table |
|-----------|-----------|
| `clients_hipaa` | `patients` |
| `sessions_hipaa` | `clinical_sessions` |
| `treatment_plans_hipaa` | `patient_treatment_plans` |
| `therapist_phi` | `therapist_phi` (updated fields) |
| `therapist_profiles` | `therapist_profiles` (updated fields) |

## Best Practices

1. **Always use prefixes**: Distinguish between therapist and patient data
2. **Consistent encryption**: All PHI fields must be encrypted
3. **Search hashes**: Create search hashes for contact fields (email, phone)
4. **Audit logging**: Log all PHI access with field-level detail
5. **Validation**: Validate field names match conventions
6. **Documentation**: Keep this document updated with any changes

## Future Considerations

When expanding to other verticals (e.g., general business), consider:

1. **Generic prefixes**: `provider_` instead of `therapist_`
2. **Customer terminology**: `customer_` instead of `patient_`
3. **Service terminology**: `service_` instead of `clinical_session_`

The current healthcare-specific naming can be refactored later using the repository pattern for easier migration.
