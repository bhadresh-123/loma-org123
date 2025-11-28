# How to Run Migrations in Production

## Option 1: Render Shell (Recommended) ⭐

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Select your service** (e.g., "loma-platform" or "loma-hipaa-dev")
3. **Click the "Shell" tab** in the sidebar
4. **Wait for the shell to connect** (may take a few seconds)
5. **Run the migration command**:
   ```bash
   npm run migrate:all
   ```

   This will:
   - Check which migrations are needed
   - Run them safely (idempotent)
   - Verify all tables/columns exist
   - Show a summary of what was done

6. **Check the output** - You should see success messages like:
   ```
   ✅ Migration 0002: Fix schema mismatches
   ✅ Migration 0004: Add medical codes tables
   ...
   📊 Migration Summary: 5 successful, 0 failed
   ```

## Option 2: Run Locally (Alternative)

If you have the production `DATABASE_URL`:

1. **Set the production database URL**:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

2. **Run migrations**:
   ```bash
   npm run migrate:all
   ```

3. **Verify results** - Check the output to confirm all migrations succeeded

## Option 3: Redeploy (Automatic)

The `pre-start.sh` script should run migrations automatically on deploy, but since migrations are missing, it's better to run them manually first.

After running migrations via Option 1 or 2, you can then:
- Push a new commit or
- Trigger a manual deploy in Render

This will ensure everything is synced.

## What Gets Run

The `migrate:all` script will run these migrations in order:
1. **0002_fix_schema_mismatches.sql** - Adds patient_name_search_hash ⚠️ CRITICAL
2. **0004_add_medical_codes_tables.sql** - Medical codes
3. **0005_add_documents_tables.sql** - Document templates
4. **0006_add_cv_parser_tables.sql** - CV parser tables
5. **0007_add_tasks_table.sql** - Tasks table
6. **0008_remove_patient_age.sql** - Verifies patient_name_search_hash exists

All migrations are **idempotent** (safe to run multiple times) and will skip already-applied changes.

## Verification

After running migrations, verify the fix by:

1. **Check the patients endpoint**:
   ```bash
   curl https://loma-hipaa-dev.onrender.com/api/patients
   ```
   Should return patients (not a 500 error)

2. **Check the health endpoint**:
   ```bash
   curl https://loma-hipaa-dev.onrender.com/health
   ```
   Should show all systems healthy

## Troubleshooting

If migrations fail:
- Check the error message in the shell output
- Verify `DATABASE_URL` is correct (Option 2)
- Check Render logs for more details
- The migrations use `IF NOT EXISTS` so partial runs won't break things

