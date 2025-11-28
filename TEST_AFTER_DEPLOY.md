# Test Script After Deployment

After redeploying, run these tests to verify everything is working:

## Option 1: TypeScript Test Script (Recommended)

```bash
# From your local machine or Render Shell
BASE_URL=https://loma-hipaa-dev.onrender.com npm run test:post-migration

# Or with database checks (if you have DATABASE_URL):
DATABASE_URL=your-db-url BASE_URL=https://loma-hipaa-dev.onrender.com npm run test:post-migration
```

## Option 2: Bash Test Script

```bash
# From Render Shell or local machine
BASE_URL=https://loma-hipaa-dev.onrender.com bash scripts/verification/test-post-migration.sh

# Or with database checks:
DATABASE_URL=your-db-url BASE_URL=https://loma-hipaa-dev.onrender.com bash scripts/verification/test-post-migration.sh
```

## Option 3: Manual Quick Tests

```bash
# 1. Health check
curl https://loma-hipaa-dev.onrender.com/health

# 2. Test patients endpoint (should return auth error, not 500)
curl -i https://loma-hipaa-dev.onrender.com/api/patients

# 3. Test clinical sessions endpoint
curl -i https://loma-hipaa-dev.onrender.com/api/clinical-sessions

# 4. Check database schema (in Render Shell)
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='patients' AND column_name='patient_name_search_hash';"

# Should return:
# column_name
# --------------------------
# patient_name_search_hash
```

## What the Test Script Checks

✅ Health endpoint returns "ok"  
✅ Database connection is healthy  
✅ patient_name_search_hash column exists  
✅ tasks table exists  
✅ API endpoints return auth errors (401/403) instead of 500 errors  
✅ Frontend loads successfully  

## Expected Results

- All tests should **PASS** ✅
- Patients endpoint should return **401/403** (auth error), **NOT 500** (server error)
- Health endpoint should show database connected and schema valid

