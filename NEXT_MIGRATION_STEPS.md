# Next Migration Steps

## ✅ Completed
- Migration 0007: Tasks table created

## Next: Run Migration 0002 (CRITICAL)
This adds the `patient_name_search_hash` column that's causing the 500 errors:

```bash
psql $DATABASE_URL -f db/migrations-hipaa/0002_fix_schema_mismatches.sql
```

This migration will:
- Fix data type mismatches
- Add patient_name_search_hash column ⚠️ **CRITICAL**
- Add many missing PHI columns to patients table
- Add missing columns to therapist_profiles, therapist_phi
- Add foreign key constraints
- Add performance indexes

## Then: Run Migration 0008
This removes patient_age and ensures patient_name_search_hash exists:

```bash
psql $DATABASE_URL -f db/migrations-hipaa/0008_remove_patient_age.sql
```

## Then: Verify Everything Works

1. **Check the patients endpoint works:**
   ```bash
   curl https://loma-hipaa-dev.onrender.com/api/patients
   ```
   Should return patients without 500 error

2. **Check health endpoint:**
   ```bash
   curl https://loma-hipaa-dev.onrender.com/health
   ```
   Should show all systems healthy

## Optional: Run All Remaining Migrations

After 0002 and 0008 are done, you can run:
```bash
npm run migrate:all
```

This will safely check and run any remaining migrations (0004, 0005, 0006 if needed).

