# Production Troubleshooting Guide

This guide helps diagnose and fix production issues, particularly the clinical session creation error.

## Quick Diagnosis

### 1. Check Health Endpoint

Visit your production health endpoint to get detailed system status:

```bash
curl https://loma-hipaa-dev.onrender.com/health
```

Expected healthy response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T...",
  "uptime": 1234.56,
  "environment": "production",
  "database": {
    "connected": true,
    "schemaValid": true,
    "errors": [],
    "warnings": []
  },
  "encryption": {
    "configured": true,
    "valid": true
  },
  "config": {
    "databaseUrl": "configured",
    "sessionSecret": "configured",
    "phiEncryptionKey": "configured",
    "useHipaaSchema": true
  }
}
```

### 2. Check Server Logs

View recent logs in Render dashboard:
1. Go to https://dashboard.render.com
2. Select your service
3. Click "Logs" tab
4. Look for error messages with tags like:
   - `[Clinical Session Creation]`
   - `[ClinicalSessionService]`
   - `[ClinicalSessionRepository]`

## Common Errors and Solutions

### Error: CLINICAL_SESSION_CREATE_FAILED

Generic error - check logs for specific cause.

**Diagnostic Steps:**
1. Check `/health` endpoint for system status
2. Review server logs for detailed error messages
3. Verify environment variables are set correctly
4. Check database schema is up to date

### Error: DATABASE_SCHEMA_ERROR

**Cause:** Database table `clinical_sessions` does not exist or has wrong structure.

**Solution:**
```bash
# Run database migrations
npm run db:hipaa:push

# Or manually on Render:
# 1. Go to Render dashboard
# 2. Shell tab
# 3. Run: npm run db:hipaa:push
```

### Error: ENCRYPTION_ERROR

**Cause:** PHI_ENCRYPTION_KEY is missing or invalid.

**Solution:**
1. Generate a valid encryption key (64 hex characters = 32 bytes):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Set in Render environment variables:
   - Key: `PHI_ENCRYPTION_KEY`
   - Value: (paste the generated 64-character hex string)

3. Redeploy the service

**Important:** Once you set an encryption key, you cannot change it without re-encrypting all existing data. Store it securely!

### Error: NO_ORGANIZATION

**Cause:** User account is not associated with any organization.

**Solution:**
```sql
-- Connect to your database and run:
INSERT INTO organization_memberships (organization_id, user_id, role, is_active)
VALUES (1, <user_id>, 'therapist', true);
```

Replace `<user_id>` with the actual user ID from the error logs.

### Error: PATIENT_NOT_FOUND

**Cause:** Patient ID doesn't exist or doesn't belong to user's organization.

**Solution:**
1. Verify patient exists:
   ```sql
   SELECT id, name, organization_id FROM patients WHERE id = <patient_id>;
   ```

2. Check user's organization:
   ```sql
   SELECT organization_id FROM organization_memberships WHERE user_id = <user_id>;
   ```

3. Ensure they match

### Error: ORGANIZATION_FETCH_FAILED

**Cause:** Database connection issue or organization_memberships table problem.

**Solution:**
1. Check database connection in `/health` endpoint
2. Verify organization_memberships table exists:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'organization_memberships';
   ```
3. Run migrations if table is missing

## Environment Variables Checklist

All production deployments must have these environment variables set:

### Required (Server will not start without these)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SESSION_SECRET` - 64-character random string
- [ ] `PHI_ENCRYPTION_KEY` - 64 hex characters (32 bytes)
- [ ] `NODE_ENV` - Set to "production"

### Required for HIPAA Features
- [ ] `USE_HIPAA_SCHEMA` - Set to "true"
- [ ] `ENABLE_HIPAA_ROUTES` - Set to "true"
- [ ] `ENABLE_HIPAA_ENCRYPTION` - Set to "true"
- [ ] `ENABLE_HIPAA_AUDIT_LOGGING` - Set to "true"

### Optional but Recommended
- [ ] `STRIPE_SECRET_KEY` - For payment processing
- [ ] `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- [ ] `EMAIL_USER` - For email notifications
- [ ] `EMAIL_PASS` - Email service password
- [ ] `ANTHROPIC_API_KEY` - For AI features

## Setting Environment Variables in Render

1. Go to https://dashboard.render.com
2. Select your service (e.g., "loma-platform")
3. Click "Environment" tab
4. Click "Add Environment Variable"
5. Enter key and value
6. Click "Save Changes"
7. Wait for automatic redeploy (or trigger manual deploy)

## Verifying the Fix

After making changes, verify the system is working:

### 1. Check Health Endpoint
```bash
curl https://loma-hipaa-dev.onrender.com/health
```

Should return status "ok" with no errors.

### 2. Check Startup Logs
Look for these success messages:
```
✅ Environment variables validated
✅ Database schema validated
✅ All startup validations passed!
```

### 3. Test Session Creation
Make a POST request to create a session:
```bash
curl -X POST https://loma-hipaa-dev.onrender.com/api/clinical-sessions \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=YOUR_SESSION_ID" \
  -d '{
    "patientId": 1,
    "date": "2025-10-29T10:00:00Z",
    "type": "individual",
    "status": "scheduled",
    "duration": 50
  }'
```

Expected success response:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "patientId": 1,
    "date": "2025-10-29T10:00:00.000Z",
    ...
  },
  "message": "Clinical session created successfully"
}
```

## Database Migrations

### Checking Migration Status

```bash
# On Render shell or local development:
npm run db:hipaa:status
```

### Running Migrations

```bash
# Push schema to database (development/production)
npm run db:hipaa:push

# Generate new migration (development only)
npm run db:hipaa:generate

# Apply migrations (alternative method)
npm run db:hipaa:migrate
```

### Manual Migration Check

Connect to your database and verify tables exist:

```sql
-- Check if clinical_sessions table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clinical_sessions'
ORDER BY ordinal_position;

-- Expected columns:
-- id, organization_id, patient_id, therapist_id, date, duration,
-- type, status, session_clinical_notes_encrypted, 
-- session_subjective_notes_encrypted, session_objective_notes_encrypted,
-- session_assessment_notes_encrypted, session_plan_notes_encrypted,
-- session_treatment_goals_encrypted, session_progress_notes_encrypted,
-- session_interventions_encrypted, is_intake, session_format,
-- cpt_code, add_on_cpt_codes, authorization_required,
-- authorization_number, is_paid, payment_id, created_at, updated_at
```

## Getting Additional Help

If you still experience issues after following this guide:

1. **Collect Diagnostic Information:**
   - Health endpoint response
   - Recent error logs (last 100 lines)
   - Environment variable names (not values!)
   - Database connection string format (redacted)

2. **Check Related Documentation:**
   - [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - [HIPAA_COMPLIANCE.md](./HIPAA_COMPLIANCE.md)
   - [API_REFERENCE.md](./API_REFERENCE.md)

3. **Contact Support:**
   Include all diagnostic information from step 1.

## Prevention

To prevent future issues:

1. **Always run startup validation** - Already integrated in server start
2. **Monitor health endpoint** - Set up alerts for status != "ok"
3. **Regular database backups** - Schedule daily backups in Render
4. **Test migrations in staging** - Before applying to production
5. **Document environment changes** - Keep track of config changes

## Rollback Procedure

If you need to rollback a deployment:

1. In Render dashboard, go to "Events" tab
2. Find the last working deployment
3. Click "Rollback to this version"
4. Wait for redeployment

**Important:** Rollback does not revert database changes. If you ran migrations, you may need to manually revert them.

