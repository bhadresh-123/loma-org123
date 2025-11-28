# HIPAA Schema Refactor Migration Notes

## Overview

This document details the changes made during the HIPAA schema refactor migration, including what changed, why it changed, and how to work with the new schema.

## What Changed

### 1. Table Renames

| Old Table | New Table | Reason |
|-----------|-----------|---------|
| `clients_hipaa` | `patients` | Healthcare-specific terminology |
| `sessions_hipaa` | `clinical_sessions` | More descriptive name |
| `treatment_plans_hipaa` | `patient_treatment_plans` | Clearer relationship |

### 2. New Tables Added

| Table | Purpose |
|-------|---------|
| `organizations` | Practice/business management |
| `organization_memberships` | User-organization relationships with roles |

### 3. Field Renames

#### Therapist PHI Fields
| Old Field | New Field | Reason |
|-----------|-----------|---------|
| `personalAddressEncrypted` | `therapist_home_address_encrypted` | Clear prefix |
| `personalPhoneEncrypted` | `therapist_personal_phone_encrypted` | Clear prefix |
| `personalEmailEncrypted` | `therapist_personal_email_encrypted` | Clear prefix |
| `ssnEncrypted` | `therapist_ssn_encrypted` | Clear prefix |
| `dateOfBirthEncrypted` | `therapist_dob_encrypted` | Clear prefix |
| `birthCityEncrypted` | `therapist_birth_city_encrypted` | Clear prefix |
| `birthStateEncrypted` | `therapist_birth_state_encrypted` | Clear prefix |
| `birthCountryEncrypted` | `therapist_birth_country_encrypted` | Clear prefix |
| `workPermitVisaEncrypted` | `therapist_work_permit_visa_encrypted` | Clear prefix |
| `emergencyContactEncrypted` | `therapist_emergency_contact_name_encrypted` | Clear prefix |
| `emergencyPhoneEncrypted` | `therapist_emergency_contact_phone_encrypted` | Clear prefix |

#### Patient PHI Fields
| Old Field | New Field | Reason |
|-----------|-----------|---------|
| `emailEncrypted` | `patient_contact_email_encrypted` | Clear prefix |
| `phoneEncrypted` | `patient_contact_phone_encrypted` | Clear prefix |
| `addressEncrypted` | `patient_home_address_encrypted` | Clear prefix |
| `cityEncrypted` | `patient_home_city_encrypted` | Clear prefix |
| `stateEncrypted` | `patient_home_state_encrypted` | Clear prefix |
| `zipCodeEncrypted` | `patient_home_zip_encrypted` | Clear prefix |
| `dateOfBirthEncrypted` | `patient_dob_encrypted` | Clear prefix |
| `genderEncrypted` | `patient_gender_encrypted` | Clear prefix |
| `raceEncrypted` | `patient_race_encrypted` | Clear prefix |
| `ethnicityEncrypted` | `patient_ethnicity_encrypted` | Clear prefix |
| `pronounsEncrypted` | `patient_pronouns_encrypted` | Clear prefix |
| `hometownEncrypted` | `patient_hometown_encrypted` | Clear prefix |
| `notesEncrypted` | `patient_clinical_notes_encrypted` | Clear prefix |
| `diagnosisCodesEncrypted` | `patient_diagnosis_codes_encrypted` | Clear prefix |
| `primaryDiagnosisCodeEncrypted` | `patient_primary_diagnosis_encrypted` | Clear prefix |
| `secondaryDiagnosisCodeEncrypted` | `patient_secondary_diagnosis_encrypted` | Clear prefix |
| `treatmentHistoryEncrypted` | `patient_treatment_history_encrypted` | Clear prefix |
| `referringPhysicianEncrypted` | `patient_referring_physician_encrypted` | Clear prefix |
| `referringPhysicianNpiEncrypted` | `patient_referring_physician_npi_encrypted` | Clear prefix |
| `insuranceInfoEncrypted` | `patient_insurance_info_encrypted` | Clear prefix |
| `authorizationInfoEncrypted` | `patient_authorization_info_encrypted` | Clear prefix |
| `priorAuthNumberEncrypted` | `patient_prior_auth_number_encrypted` | Clear prefix |
| `memberIdEncrypted` | `patient_member_id_encrypted` | Clear prefix |
| `groupNumberEncrypted` | `patient_group_number_encrypted` | Clear prefix |
| `primaryInsuredNameEncrypted` | `patient_primary_insured_name_encrypted` | Clear prefix |

### 4. New Fields Added

#### Therapist PHI
- `therapist_home_city_encrypted`
- `therapist_home_state_encrypted`
- `therapist_home_zip_encrypted`
- `therapist_emergency_contact_relationship_encrypted`

#### Therapist Profiles
- `stripe_connect_account_id`
- `stripe_connect_onboarding_complete`
- `stripe_connect_charges_enabled`
- `stripe_connect_payouts_enabled`
- `stripe_connect_details_submitted`
- `stripe_connect_card_issuing_enabled`

#### Patients
- `organization_id` (required)
- `assigned_therapist_ids` (JSONB array)
- `patient_tertiary_diagnosis_encrypted`
- `patient_medical_history_encrypted`
- `patient_insurance_provider_encrypted`
- `patient_primary_insured_dob_encrypted`

#### Clinical Sessions
- `organization_id` (required)
- `session_subjective_notes_encrypted`
- `session_objective_notes_encrypted`
- `session_assessment_notes_encrypted`
- `session_plan_notes_encrypted`
- `session_treatment_goals_encrypted`
- `session_progress_notes_encrypted`
- `session_interventions_encrypted`

#### Treatment Plans
- `organization_id` (required)
- `treatment_plan_goals_encrypted`
- `treatment_plan_objectives_encrypted`
- `treatment_plan_interventions_encrypted`
- `treatment_plan_progress_notes_encrypted`
- `treatment_plan_diagnosis_encrypted`
- `treatment_plan_assessment_encrypted`

## Why These Changes Were Made

### 1. Naming Clarity
- **Problem**: Ambiguous field names like `personalAddressEncrypted` vs `addressEncrypted`
- **Solution**: Clear prefixes (`therapist_`, `patient_`) distinguish between data types
- **Benefit**: Easier for developers to understand data context

### 2. Healthcare Terminology
- **Problem**: Generic terms like `clients` could be confusing in healthcare context
- **Solution**: Industry-standard terms (`patients`, `clinical_sessions`)
- **Benefit**: Clearer for healthcare professionals and compliance

### 3. Multi-Therapist Support
- **Problem**: Flat data structure didn't support practice hierarchies
- **Solution**: Organization layer with role-based access control
- **Benefit**: Supports solo practices, partnerships, and group practices

### 4. HIPAA Compliance
- **Problem**: Data ownership unclear for multi-therapist practices
- **Solution**: Organization-level data ownership with 7-year retention
- **Benefit**: Meets HIPAA requirements for data retention

### 5. Enhanced Clinical Documentation
- **Problem**: Limited clinical note structure
- **Solution**: SOAP format fields and comprehensive treatment planning
- **Benefit**: Better clinical documentation and treatment tracking

## How to Work with the New Schema

### 1. API Changes

#### Old API Calls
```typescript
// Old client API
GET /api/clients
POST /api/clients
PUT /api/clients/:id

// Old session API
GET /api/sessions
POST /api/sessions
PUT /api/sessions/:id
```

#### New API Calls
```typescript
// New patient API
GET /api/patients
POST /api/patients
PUT /api/patients/:id

// New clinical session API
GET /api/clinical-sessions
POST /api/clinical-sessions
PUT /api/clinical-sessions/:id

// New organization API
GET /api/organizations
POST /api/organizations
PUT /api/organizations/:id
```

### 2. Field Mapping

#### Creating Patients
```typescript
// Old way
const patient = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
  notes: 'Patient notes'
};

// New way
const patient = {
  name: 'John Doe',
  contactEmail: 'john@example.com',
  contactPhone: '555-1234',
  clinicalNotes: 'Patient notes',
  organizationId: 1,
  primaryTherapistId: 123
};
```

#### Creating Sessions
```typescript
// Old way
const session = {
  clientId: 1,
  therapistId: 123,
  date: new Date(),
  notes: 'Session notes'
};

// New way
const session = {
  patientId: 1,
  therapistId: 123,
  organizationId: 1,
  date: new Date(),
  sessionClinicalNotes: 'Session notes',
  sessionSubjectiveNotes: 'Patient reports...',
  sessionObjectiveNotes: 'Observed...',
  sessionAssessmentNotes: 'Assessment...',
  sessionPlanNotes: 'Plan...'
};
```

### 3. Service Layer Changes

#### Old Service Usage
```typescript
import { ClientService } from '../services/ClientService';

const clients = await ClientService.getClientsForTherapist(therapistId);
const client = await ClientService.getClient(clientId);
```

#### New Service Usage
```typescript
import { PatientService } from '../services/PatientService';
import { OrganizationService } from '../services/OrganizationService';

const patients = await PatientService.getPatientsForTherapist(therapistId, requestingUserId);
const patient = await PatientService.getPatient(patientId, requestingUserId);
const organization = await OrganizationService.getOrganization(organizationId);
```

### 4. Database Queries

#### Old Queries
```sql
SELECT * FROM clients_hipaa WHERE therapistId = $1;
SELECT * FROM sessions_hipaa WHERE clientId = $1;
```

#### New Queries
```sql
SELECT * FROM patients WHERE primary_therapist_id = $1;
SELECT * FROM clinical_sessions WHERE patient_id = $1;
SELECT * FROM patients WHERE organization_id = $1;
```

### 5. Middleware Updates

#### Old Middleware
```typescript
app.use('/api/clients', encryptPHIFields('clients'));
app.use('/api/sessions', encryptPHIFields('sessions'));
```

#### New Middleware
```typescript
app.use('/api/patients', encryptPHIFields('patients'));
app.use('/api/clinical-sessions', encryptPHIFields('clinical_sessions'));
app.use('/api/organizations', loadOrganizationMembership);
```

## Migration Process

### 1. Pre-Migration
- Backup existing database
- Test migration script on development database
- Verify all data can be migrated

### 2. Migration Execution
```bash
# Run migration
npm run migrate-hipaa-refactor migrate

# Verify migration
npm run test-hipaa-refactor-validation
```

### 3. Post-Migration
- Update environment variables
- Test API endpoints
- Update frontend code
- Deploy to production

## Rollback Process

If migration fails or needs to be rolled back:

```bash
# Rollback migration
npm run migrate-hipaa-refactor rollback
```

This will:
- Restore old table names
- Revert field names
- Drop new tables
- Restore original schema

## Testing

### Validation Tests
Run the validation test suite to ensure migration success:

```bash
npm run test-hipaa-refactor-validation
```

Tests include:
- Table creation verification
- Data migration verification
- Encryption/decryption testing
- Search functionality testing
- Audit logging testing
- Relationship testing

### API Tests
Test all API endpoints with new schema:

```bash
npm test -- --grep "patients"
npm test -- --grep "organizations"
npm test -- --grep "clinical-sessions"
```

## Common Issues and Solutions

### 1. Field Not Found Errors
**Problem**: API returns "field not found" errors
**Solution**: Update field names in API requests to use new naming convention

### 2. Permission Denied Errors
**Problem**: Users can't access data they previously could
**Solution**: Check organization membership and role permissions

### 3. Encryption Errors
**Problem**: PHI fields not encrypting/decrypting properly
**Solution**: Verify PHI_ENCRYPTION_KEY environment variable is set

### 4. Search Not Working
**Problem**: Patient search by email/phone not working
**Solution**: Check search hash fields are populated correctly

## Support

For questions or issues with the migration:

1. Check this documentation first
2. Review the validation test results
3. Check audit logs for errors
4. Contact the development team

## Future Considerations

### Vertical Expansion
When expanding to other business verticals:

1. **Generic Terminology**: Consider `provider`/`customer` instead of `therapist`/`patient`
2. **Repository Pattern**: Use repository pattern for easier refactoring
3. **Field Mapping**: Update field mappings in middleware
4. **API Updates**: Update API endpoints and documentation

### Schema Evolution
The current schema is designed to be:
- **Extensible**: Easy to add new fields and tables
- **Maintainable**: Clear naming conventions and structure
- **Compliant**: HIPAA-compliant with proper audit trails
- **Scalable**: Supports multiple organization types and sizes
