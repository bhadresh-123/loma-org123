# Production Migration Status

Based on the migration journal and error logs, here are the migrations that need to be run in production:

## Migration Journal Status

**Migrations in journal (presumably run):**
- ✅ `0000_lonely_stingray` - Initial HIPAA schema
- ✅ `0001_add_calendar_tables` - Calendar blocks and work schedules  
- ✅ `0003_add_operational_tables` - Invoices, notifications, user_settings
- ✅ `0008_remove_patient_age` - Remove patient_age, add patient_name_search_hash

**Migrations NOT in journal (likely missing):**
- ❌ `0002_fix_schema_mismatches` - Fixes data types, adds missing columns (including patient_name_search_hash)
- ❌ `0004_add_medical_codes_tables` - Medical codes and assessment categories
- ❌ `0005_add_documents_tables` - Document templates and documents
- ❌ `0006_add_cv_parser_tables` - CV parser education and work experience
- ❌ `0007_add_tasks_table` - Tasks table

## Critical Issue

The production error shows `patient_name_search_hash` column doesn't exist. This column is added by:
- Migration `0002_fix_schema_mismatches.sql` (line 84)
- Migration `0008_remove_patient_age.sql` (line 11)

Since `0002` is not in the journal, it likely wasn't run, and `0008` may not have completed properly.

## Recommended Action

Run the comprehensive migration script:

```bash
npm run migrate:all
```

This script will:
1. Check which migrations are needed
2. Run them idempotently (safe to run multiple times)
3. Verify all critical tables and columns exist

Alternatively, run migrations individually in order:
1. `0002_fix_schema_mismatches.sql` - **CRITICAL** (adds patient_name_search_hash)
2. `0004_add_medical_codes_tables.sql`
3. `0005_add_documents_tables.sql`
4. `0006_add_cv_parser_tables.sql`
5. `0007_add_tasks_table.sql`
6. `0008_remove_patient_age.sql` - Verify it completes (adds patient_name_search_hash if not already there)

## What Each Migration Does

### 0002_fix_schema_mismatches.sql
- Fixes boolean data type issues
- Adds patient_name_search_hash column ⚠️ **CRITICAL**
- Adds many missing PHI columns to patients table
- Adds missing columns to therapist_profiles, therapist_phi
- Adds foreign key constraints
- Adds performance indexes

### 0004_add_medical_codes_tables.sql
- Creates `medical_codes` table (CPT, ICD-10, HCPCS codes)
- Creates `assessment_categories` table
- Adds indexes for performance

### 0005_add_documents_tables.sql
- Creates `document_templates` table
- Creates `documents` table (for patient documents with encrypted PHI)
- Adds indexes

### 0006_add_cv_parser_tables.sql
- Creates `cv_parser_education` table
- Creates `cv_parser_work_experience` table
- Adds indexes

### 0007_add_tasks_table.sql
- Creates `tasks` table for task management
- Adds indexes for performance

### 0008_remove_patient_age.sql
- Removes `patient_age` column (age computed from DOB instead)
- Adds `patient_name_search_hash` column (if not already added by 0002)

## Notes

- All migrations use `IF NOT EXISTS` / `IF EXISTS` clauses, making them idempotent
- Safe to run even if some columns/tables already exist
- The comprehensive script (`run-all-migrations.ts`) will skip migrations that are already complete

