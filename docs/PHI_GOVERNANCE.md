# PHI Governance Policy

## Overview

This document establishes governance policies for Protected Health Information (PHI) handling in the Loma application, ensuring HIPAA compliance while maintaining operational efficiency.

## Table of Contents

1. [Unencrypted Name Policy](#unencrypted-name-policy)
2. [Logging Restrictions](#logging-restrictions)
3. [Access Control Requirements](#access-control-requirements)
4. [Audit Trail Requirements](#audit-trail-requirements)
5. [Search and Query Guidelines](#search-and-query-guidelines)
6. [Developer Guidelines](#developer-guidelines)
7. [Compliance Checklist](#compliance-checklist)

---

## Unencrypted Name Policy

### Patient Names

**Storage**: Patient names are stored UNENCRYPTED in the `patients.name` field.

**Rationale**: 
- Balances HIPAA compliance with clinical workflow efficiency
- Enables rapid patient identification for emergency situations
- Supports efficient scheduling and administrative operations
- More sensitive PHI (DOB, contact info, diagnoses) remains encrypted

**HIPAA Permissibility**: 
Unencrypted patient names are HIPAA-compliant when accompanied by:
- Proper access controls (role-based permissions)
- Comprehensive audit logging
- Strict logging prohibitions (see below)
- Physical and technical safeguards

**Controls Required**:

1. **Access Control**: 
   - Names only accessible to authorized healthcare staff
   - Role-based access control (RBAC) enforced at application layer
   - Business owners can view all patients
   - Admins can view selected patients
   - Therapists can view only assigned patients

2. **Audit Logging**:
   - All name access logged in `audit_logs_hipaa` table
   - Log entries include: user ID, timestamp, action, IP address, session info
   - Logs retained for minimum 7 years (HIPAA requirement)

3. **Search Capability**:
   - `patientNameSearchHash` field enables secure indexed searching
   - SHA-256 hash prevents plaintext exposure in database indices
   - Hash comparison used for search queries

4. **Never Log Names**:
   - Patient names MUST NEVER appear in application logs
   - Use patient ID references in logs instead
   - Use `safe-logger.ts` utility for all patient-related logging

### Therapist Names

**Storage**: Therapist names are stored UNENCRYPTED in the `therapist_profiles.name` field.

**Rationale**:
- Therapist names are professional/business identifiers, NOT PHI under HIPAA
- Healthcare provider names are routinely disclosed in public directories, websites, insurance networks
- Essential for practice operations, marketing, and patient communication

**HIPAA Classification**: 
Therapist names are NOT considered PHI because:
- They identify healthcare providers, not patients
- Providers' names are part of normal business communications
- Public disclosure is standard practice in healthcare industry

**Public Disclosure Permitted**:
- Provider directories and practice websites
- Marketing materials and social media
- Insurance network listings
- Professional licensing databases
- Appointment confirmations and session records

**Controls Required**:
1. **Logging Prohibition**: Despite not being PHI, therapist names MUST NOT appear in logs (consistency with patient name policy)
2. **Access Control**: Names accessible to organization members and assigned patients
3. **Audit Logging**: Access logged for compliance monitoring

---

## Logging Restrictions

### Never-Log Rules for Names

**Absolute Prohibitions** - These MUST NEVER appear in application logs:

❌ **Patient names**
❌ **Therapist names** (for consistency)
❌ **Full request bodies** containing names
❌ **Full response objects** containing names
❌ **Database query results** with name fields
❌ **Error messages** including names

### Safe Logging Practices

✅ **DO use these in logs**:
- Patient IDs: `"Creating patient record, ID: 12345"`
- User IDs: `"User 789 accessed patient 12345"`
- Record counts: `"Retrieved 15 patient records"`
- Operation results: `"Patient created successfully"`
- Redacted email: `"Email sent to j***@example.com"`

### Using safe-logger.ts Utility

Always use the `safe-logger.ts` utility for PHI-related logging:

```typescript
import { safeLog, redactEmail, logRequest } from '@/utils/safe-logger';

// Safe logging with automatic PHI detection
safeLog('Patient operation', { patientId: 123, action: 'update' });

// Email redaction
console.log('Sending invoice to', redactEmail(clientEmail));

// Safe request logging
logRequest(req, 'Patient creation request');
```

**PHI Patterns Automatically Redacted**:
- Email addresses → `j***@example.com`
- Phone numbers → `(***) ***-1234`
- Social Security Numbers → `***-**-1234`
- Dates of birth → `[REDACTED-DOB]`

---

## Access Control Requirements

### Role-Based Access Control (RBAC)

**Business Owner**:
- Can view ALL patients in organization
- Can view ALL calendars
- Can manage billing, staff, and settings
- Can create and manage patients

**Admin**:
- Can view SELECTED patients (configurable list)
- Can view selected calendars
- Can create patients
- Cannot manage billing or staff (unless explicitly granted)

**Therapist**:
- Can view ONLY assigned patients
- Can view own calendar
- Can create patients (assigned to self)
- Cannot view other therapists' patients

**Contractor (1099)**:
- Same as Therapist
- Limited organization access
- May have restricted billing features

### Implementation

Access control enforced via:
1. **Database queries**: Filter by `primaryTherapistId` and `assignedTherapistIds`
2. **Middleware**: `requireAuth` and role-checking middleware
3. **Frontend guards**: Role-based component rendering
4. **API validation**: Request authorization before database access

### Example Access Check

```typescript
// In PatientService.ts
async getPatients(userId: number, membership: OrganizationMembership) {
  let query = db.select().from(patients);
  
  if (membership.canViewAllPatients) {
    // Business owner - no filter
  } else if (membership.canViewSelectedPatients?.length > 0) {
    // Admin - filter by selected therapists
    query = query.where(
      or(
        eq(patients.primaryTherapistId, sql`ANY(ARRAY[${membership.canViewSelectedPatients}])`)
      )
    );
  } else {
    // Therapist - only assigned patients
    query = query.where(eq(patients.primaryTherapistId, userId));
  }
  
  return query;
}
```

---

## Audit Trail Requirements

### What Must Be Logged

**All PHI Access**:
- Patient record views (READ)
- Patient record creation (CREATE)
- Patient record updates (UPDATE)
- Patient record deletion (DELETE)
- Clinical session access
- Treatment plan access
- Document access

### Audit Log Structure

```typescript
{
  userId: number,              // Who accessed the data
  sessionId: string,           // User's session ID
  ipAddress: string,           // Request IP address
  userAgent: string,           // Browser/client info
  action: string,              // CREATE, READ, UPDATE, DELETE, PHI_ACCESS
  resourceType: string,        // PATIENT, CLINICAL_SESSION, etc.
  resourceId: number,          // ID of accessed resource
  fieldsAccessed: string[],    // List of PHI fields accessed
  phiFieldsCount: number,      // Count of PHI fields
  requestMethod: string,       // GET, POST, PUT, DELETE
  requestPath: string,         // API endpoint
  responseStatus: number,      // HTTP status code
  responseTime: number,        // Request duration (ms)
  timestamp: Date              // When access occurred
}
```

### Retention Requirements

- **Minimum**: 7 years (HIPAA requirement)
- **Recommended**: Indefinite retention for high-value audit data
- **Implementation**: `data_retention_date` field in `audit_logs_hipaa` table

### Audit Monitoring

**Regular Reviews**:
- Weekly review of unusual access patterns
- Monthly compliance report generation
- Quarterly security audits
- Annual comprehensive HIPAA audit

**Alert Triggers**:
- Unusual access volume (>100 patient records in 1 hour)
- Access to patients outside assigned caseload
- After-hours access (configurable)
- Multiple failed authorization attempts
- Geographic anomalies (IP address changes)

---

## Search and Query Guidelines

### Encrypted Field Searching

**Problem**: Cannot search encrypted fields directly

**Solution**: Search hash fields

```typescript
// Searching by email
const emailHash = await generateSearchHash(searchEmail);
const patients = await db.select()
  .from(patients)
  .where(eq(patients.patientContactEmailSearchHash, emailHash));
```

### Name Searching

**Patient Names**:
- Use `patientNameSearchHash` for secure indexed searches
- Generate hash: `SHA-256(lowercase(trimmed_name))`
- Prevents full table scans
- Enables case-insensitive searching

```typescript
// Safe name search
const nameHash = await generateNameSearchHash(searchName);
const results = await db.select()
  .from(patients)
  .where(eq(patients.patientNameSearchHash, nameHash));
```

**Important**: 
- Search hashes enable finding records without decryption
- Do NOT log search terms (they may contain names)
- Do log search patterns (e.g., "Name search performed")

### Query Performance

**Indexed Fields**:
- `patientNameSearchHash` - indexed for fast name lookup
- `patientContactEmailSearchHash` - indexed for email lookup
- `patientContactPhoneSearchHash` - indexed for phone lookup

**Best Practices**:
- Always use search hashes for encrypted fields
- Add `LIMIT` clauses to large queries
- Use pagination for result sets
- Cache frequently accessed non-PHI data

---

## Developer Guidelines

### Code Review Checklist

Before submitting code that touches PHI:

- [ ] No names in `console.log()` statements
- [ ] No full request bodies logged
- [ ] No full database records logged
- [ ] Using `safe-logger.ts` for all logging
- [ ] Access control checks implemented
- [ ] Audit logging included
- [ ] Search hashes used for encrypted fields
- [ ] Sensitive errors handled without exposing PHI
- [ ] TypeScript types enforce PHI field naming conventions

### Common Mistakes to Avoid

❌ **Logging entire objects**:
```typescript
// WRONG
console.log('Patient data:', patient);

// RIGHT
console.log('Patient record accessed, ID:', patient.id);
```

❌ **Logging request bodies**:
```typescript
// WRONG
console.log('Request body:', req.body);

// RIGHT
console.log('Patient creation request, userId:', userId);
```

❌ **Exposing names in error messages**:
```typescript
// WRONG
throw new Error(`Patient ${patient.name} not found`);

// RIGHT
throw new Error(`Patient with ID ${patientId} not found`);
```

❌ **Returning encrypted fields to frontend**:
```typescript
// WRONG - encrypted fields in response
return session;

// RIGHT - decrypt and remove encrypted fields
return {
  ...session,
  sessionClinicalNotes: decrypted.sessionClinicalNotes,
  sessionClinicalNotesEncrypted: undefined // Remove encrypted field
};
```

### Testing PHI Security

**Unit Tests**:
- Test `safe-logger.ts` redaction functions
- Test access control logic
- Test search hash generation
- Test decryption/encryption utilities

**Integration Tests**:
- Verify no PHI in application logs
- Verify audit logs created for PHI access
- Verify unauthorized access blocked
- Verify encrypted fields not in API responses

**Manual Testing**:
- Check server logs after patient creation
- Verify email redaction in invoice logs
- Confirm audit log entries created
- Test role-based access restrictions

---

## Compliance Checklist

### Development Phase

- [ ] Schema includes governance policy comments for name fields
- [ ] `safe-logger.ts` utility implemented and used
- [ ] All PHI access includes audit logging
- [ ] Role-based access control implemented
- [ ] Search hashes generated for name fields
- [ ] Frontend components handle decrypted data correctly
- [ ] No PHI in console.log statements
- [ ] Error handling doesn't expose PHI
- [ ] Unit tests for PHI security utilities
- [ ] Integration tests for logging and access control

### Pre-Deployment

- [ ] Code review completed (PHI security focus)
- [ ] All tests passing (unit + integration)
- [ ] Manual testing checklist completed
- [ ] Linter passing (no console.log in production code)
- [ ] TypeScript compilation successful
- [ ] Database migrations tested
- [ ] Documentation updated

### Production Operations

- [ ] Audit logs being generated correctly
- [ ] Log retention policy implemented (7+ years)
- [ ] Regular audit log reviews scheduled
- [ ] Alert monitoring configured
- [ ] Backup and disaster recovery tested
- [ ] Incident response plan documented
- [ ] HIPAA compliance training completed
- [ ] Annual security audit scheduled

### Ongoing Maintenance

- [ ] Weekly log review for anomalies
- [ ] Monthly compliance reports generated
- [ ] Quarterly security audits conducted
- [ ] Annual comprehensive HIPAA audit
- [ ] Team training on PHI policies (new hires + annual refresh)
- [ ] Policy updates as regulations evolve

---

## Quick Reference

### DO's ✅

- Store patient/therapist names unencrypted (with controls)
- Log patient IDs, never names
- Use `safe-logger.ts` for all PHI-related logging
- Implement RBAC for all PHI access
- Create audit log entries for all PHI operations
- Use search hashes for encrypted field queries
- Redact emails in logs: `j***@example.com`
- Handle errors without exposing PHI
- Test PHI security in every release

### DON'Ts ❌

- Never log names (patient or therapist)
- Never log full request/response bodies with PHI
- Never return encrypted fields to frontend
- Never allow access without authorization check
- Never skip audit logging for PHI access
- Never expose PHI in error messages
- Never search encrypted fields directly
- Never store PHI in unencrypted fields (except names)
- Never disable audit logging (even in development)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-30 | System | Initial PHI Governance Policy |

---

## References

- [HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/index.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [HIPAA Safe Harbor Method](https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html)
- [Loma Schema Documentation](../db/schema-hipaa-refactored.ts)
- [Loma Safe Logger Utility](../server/utils/safe-logger.ts)
- [Loma Audit Logging System](../server/middleware/audit-logger.ts)

---

## Contact

For questions about PHI governance policies, contact:
- **Security Team**: security@loma.health
- **Compliance Officer**: compliance@loma.health
- **Development Lead**: dev@loma.health

