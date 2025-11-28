# Phase 2 Migration Tracking: Database Schema Future Work

## Overview

Phase 2 of the PHI Security Remediation focused on fixing the **service layer response model** to return clean property names (without "Encrypted" suffix) for decrypted PHI fields.

**Important:** Phase 2 does **NOT** include database migrations. All database schema work is tracked here for future implementation (likely Phase 3).

---

## ✅ Phase 2 Completed Work (October 2025)

### Service Layer Changes
- ✅ Fixed `ClinicalSessionService.getUserSessions()` - returns clean property names
- ✅ Fixed `ClinicalSessionService.getSession()` - returns clean property names
- ✅ Fixed `ClinicalSessionService.createSession()` - returns clean property names
- ✅ Fixed `ClinicalSessionService.updateSession()` - returns clean property names
- ✅ Fixed `ClinicalSessionService.getPatientSessions()` - returns clean property names
- ✅ Created comprehensive unit tests
- ✅ Created integration test framework
- ✅ Updated API documentation

### Response Model Changes
**Before (Incorrect):**
```json
{
  "id": 1,
  "sessionClinicalNotesEncrypted": "Decrypted clinical notes"
}
```

**After (Correct):**
```json
{
  "id": 1,
  "sessionClinicalNotes": "Decrypted clinical notes"
}
```

### Breaking Changes
- API response property names changed for clinical sessions
- Database schema remains unchanged
- Frontend impact: NONE (frontend doesn't use individual note fields)

---

## 🔮 Future Work: Database Migrations (Phase 3+)

### 1. Remove Computed Fields

#### `patients.patientAge` (Priority: P1)

**Current State:**
- Column exists in database: `patient_age INTEGER`
- Should be computed from `patientDobEncrypted` instead
- HIPAA Safe Harbor: Ages >89 should display as "90+"

**Migration Required:**
```sql
-- File: db/migrations-hipaa/0008_remove_patient_age.sql
ALTER TABLE patients DROP COLUMN IF EXISTS patient_age;
```

**Service Layer Update:**
```typescript
// In PatientService.decryptPatientPHI()
// Add age computation from DOB:
const dob = decryptPHI(patient.patientDobEncrypted);
if (dob) {
  const age = calculateAge(dob);
  patient.patientAge = age > 89 ? '90+' : age;
}
```

**Impact:**
- Non-breaking: Age will be computed on-the-fly
- Improves data integrity (single source of truth)
- Complies with HIPAA Safe Harbor rule

**Estimated Effort:** 2-3 hours

---

### 2. Add Search Hash Fields

#### `patients.patientNameSearchHash` (Priority: P2)

**Current State:**
- Name is stored unencrypted (by design for UI/UX)
- No search hash exists for name field
- Email and phone have search hashes already

**Migration Required:**
```sql
-- File: db/migrations-hipaa/0009_add_name_search_hash.sql
ALTER TABLE patients 
ADD COLUMN patient_name_search_hash TEXT;

-- Generate hashes for existing records
UPDATE patients
SET patient_name_search_hash = md5(lower(trim(name)))
WHERE name IS NOT NULL;
```

**Service Layer Update:**
```typescript
// In PatientService.createPatient()
if (data.name) {
  encryptedData.patientNameSearchHash = createSearchHash(data.name);
}

// In PatientService.updatePatient()
if (data.name !== undefined) {
  encryptedData.patientNameSearchHash = data.name ? createSearchHash(data.name) : null;
}
```

**Use Case:**
- Fast patient lookup by name
- Enables efficient search indexing
- Maintains consistency with email/phone patterns

**Estimated Effort:** 2-3 hours

---

### 3. Schema Documentation Updates

#### Add Governance Policy Comments (Priority: P1)

**Files to Update:**
- `db/schema-hipaa-refactored.ts`

**Example:**
```typescript
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  
  /**
   * GOVERNANCE POLICY: Patient Name
   * 
   * Decision: Store unencrypted for UI/UX reasons
   * Rationale:
   * - Displayed in every UI component (lists, headers, navigation)
   * - Performance: Avoid decryption on every page load
   * - HIPAA Compliance: Name alone is not PHI without other identifiers
   * 
   * Protection Requirements:
   * - NEVER log patient names in plain text
   * - Access control via organization membership
   * - All access audited via audit_logs_hipaa
   * - TLS encryption in transit
   * - Database encryption at rest
   * 
   * Search Strategy:
   * - Use patient_name_search_hash for efficient lookups
   * - Hash function: MD5(lowercase(trim(name)))
   */
  name: varchar("name", { length: 255 }).notNull(),
  
  patientNameSearchHash: text("patient_name_search_hash"),
  // ... rest of schema
});
```

**Create Documentation File:**
- `docs/PHI_GOVERNANCE.md` - Comprehensive governance guide

**Estimated Effort:** 1-2 hours

---

## 📋 Migration Execution Checklist

When ready to execute database migrations (Phase 3):

### Pre-Migration
- [ ] Backup production database
- [ ] Test migration in development environment
- [ ] Test migration in staging environment
- [ ] Verify rollback procedure
- [ ] Schedule low-traffic maintenance window

### Migration Steps
```bash
# 1. Backup
pg_dump $DATABASE_URL > backup_phase3_$(date +%Y%m%d).sql

# 2. Run migrations
npm run migrate:all

# 3. Verify migration
psql $DATABASE_URL -c "\d patients"
# Check that patient_age is removed
# Check that patient_name_search_hash exists

# 4. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM patients WHERE patient_name_search_hash IS NULL AND name IS NOT NULL"
# Should return 0

# 5. Deploy application code
git push origin main

# 6. Monitor logs
# Check Render dashboard for first 15 minutes
```

### Post-Migration
- [ ] Verify patient age displays correctly (including "90+")
- [ ] Verify name search works correctly
- [ ] Check application logs for errors
- [ ] Verify patient creation/update works
- [ ] Monitor database performance

### Rollback Plan
```bash
# If issues occur:
# 1. Revert application code
git revert HEAD
git push origin main

# 2. Restore database backup
psql $DATABASE_URL < backup_phase3_$(date +%Y%m%d).sql
```

---

## 🎯 Success Criteria for Phase 3

### Functionality
- ✅ Patient age computed correctly from DOB
- ✅ Ages >89 display as "90+"
- ✅ Name search works efficiently via hash
- ✅ All CRUD operations work correctly

### Performance
- ✅ No degradation in list/search queries
- ✅ Age computation adds <10ms overhead per patient
- ✅ Name search hash generation adds <5ms per operation

### Compliance
- ✅ All schema changes documented
- ✅ Governance policies clearly stated
- ✅ Audit logging continues to function
- ✅ PHI protection maintained

---

## 📊 Migration Priority Matrix

| Migration | Priority | Complexity | Risk | Estimated Effort |
|-----------|----------|------------|------|------------------|
| Remove `patientAge` | P1 | Low | Low | 2-3 hours |
| Add `patientNameSearchHash` | P2 | Medium | Low | 2-3 hours |
| Schema documentation | P1 | Low | None | 1-2 hours |
| **Total** | - | - | - | **5-8 hours** |

---

## 📝 Notes

### Why No Migrations in Phase 2?

Phase 2 focused exclusively on fixing the **service layer response model** because:

1. **Separation of Concerns**: Response model fixes are independent of database schema
2. **Lower Risk**: Service layer changes can be rolled back instantly (git revert)
3. **No Data Loss**: Database remains unchanged
4. **Faster Delivery**: Can deploy response model fixes immediately
5. **Better Testing**: Can test service layer changes without database migrations

### Database Migration Philosophy

Database migrations should be:
- **Planned**: Thoroughly tested in dev/staging
- **Reversible**: Clear rollback procedures
- **Documented**: Every change justified and documented
- **Scheduled**: Run during low-traffic windows
- **Monitored**: Watch closely post-deployment

---

## 🔗 Related Documents

- [`phi-security-remediation.plan.md`](/phi-security-remediation.plan.md) - Overall remediation plan
- [`API_REFERENCE.md`](/API_REFERENCE.md) - API documentation with Phase 2 changes
- [`PHASE1_COMPLETION_REPORT.md`](/PHASE1_COMPLETION_REPORT.md) - Phase 1 logging fixes
- `db/migrations-hipaa/` - Migration files directory

---

## 📅 Timeline

- **Phase 1**: October 2025 - Logging fixes ✅
- **Phase 2**: October 2025 - Response model corrections ✅
- **Phase 3**: TBD - Database migrations 🔮
- **Phase 4**: TBD - Documentation updates 🔮

---

## ✅ Phase 2 Completion Status

**Status:** COMPLETE ✅  
**Date Completed:** October 29, 2025  
**Tests Passing:** 10/10 ✅  
**TypeScript Compilation:** Success ✅  
**API Documentation:** Updated ✅  
**Breaking Changes:** Documented ✅  
**Frontend Impact:** None (verified) ✅

