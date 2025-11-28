# How to Run Migration 0009

This migration fixes the critical "null value in column id" error by ensuring the `clinical_sessions` table exists with proper schema.

## Quick Start

### Get your DATABASE_URL from Render:

1. Go to Render Dashboard → Your database
2. Click "Connect" → Copy "External Database URL"

### Run the migration:

```bash
cd /Users/grant/Loma-shared/loma-org
DATABASE_URL="your-connection-string" tsx db/scripts/run-migration-0009.ts
```

## What This Does

1. Checks if `sessions_hipaa` or `clinical_sessions` exists
2. Renames `sessions_hipaa` → `clinical_sessions` (if needed)
3. Renames sequence: `sessions_hipaa_id_seq` → `clinical_sessions_id_seq`
4. Sets proper DEFAULT on id column: `nextval('clinical_sessions_id_seq')`
5. Adds missing columns for new schema
6. Adds foreign key constraints
7. Verifies everything is correct

## Expected Output

```
🔧 Starting Migration 0009: Rename sessions_hipaa to clinical_sessions
✅ Database URL found
✅ Migration file loaded
✅ Database connection established
🔍 Checking current database state...
📊 Session-related tables found:
   - sessions_hipaa
✅ Migration executed successfully!
🔍 Verifying migration results...
✅ clinical_sessions table exists
✅ id column has correct sequence default
✅ clinical_sessions_id_seq sequence exists
✅ Found 4/4 required columns
🎉 MIGRATION COMPLETED SUCCESSFULLY!
```

## If Something Goes Wrong

### Rollback the migration:

```bash
DATABASE_URL="your-connection-string" tsx db/scripts/rollback-migration-0009.ts
```

This will rename everything back to `sessions_hipaa`.

## After Migration

1. **Redeploy** your application (Render will pick up latest commit)
2. **Test** session creation - it should now work
3. **Check logs** for `[ClinicalSessionRepository] Session inserted successfully with ID:`

## Troubleshooting

### Error: "Neither sessions_hipaa nor clinical_sessions table exists"
- Your database hasn't run the initial migrations
- Run: `tsx db/scripts/run-all-migrations.ts` first

### Error: "clinical_sessions already exists"
- The migration will check and fix the id column default
- It's safe to run

### Error: "Cannot connect to database"
- Check your DATABASE_URL is correct
- Make sure you copied the full connection string including password

## Need Help?

Check the migration file directly:
```bash
cat db/migrations-hipaa/0009_rename_sessions_table.sql
```

The script is idempotent - safe to run multiple times.

