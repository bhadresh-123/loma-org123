# Backup Procedures

**Version:** 1.0  
**Date:** November 4, 2025  
**HIPAA Section:** 1.4.7 - Administrative Safeguards: Contingency Plan  
**Purpose:** Operational procedures for backup and restore operations

---

## Table of Contents

1. [Automated Backups](#automated-backups)
2. [Manual Backups](#manual-backups)
3. [Backup Verification](#backup-verification)
4. [Restore Procedures](#restore-procedures)
5. [Troubleshooting](#troubleshooting)

---

## Automated Backups

### Daily Database Backups

**Schedule:** Every day at 2 AM UTC  
**Automation:** GitHub Actions workflow  
**Retention:** 30 days (automatic cleanup)

#### What Gets Backed Up

- ✅ All PostgreSQL database tables
- ✅ User accounts and authentication data
- ✅ Patient records (encrypted PHI)
- ✅ Clinical sessions and notes (encrypted)
- ✅ Treatment plans (encrypted)
- ✅ Organization and membership data
- ✅ Document metadata and templates
- ✅ Audit logs

#### Backup Process

1. **Extraction:** Full database dump using `pg_dump`
2. **Compression:** Gzip compression (~70% size reduction)
3. **Encryption:** AES-256-GCM with PHI_ENCRYPTION_KEY
4. **Upload:** Store in Cloudflare R2 (backups bucket)
5. **Cleanup:** Delete backups older than 30 days

#### Monitoring Automated Backups

**Check Last Backup:**
```bash
# List all backups
npm run restore:db -- --list

# Should show daily backups with timestamps
```

**GitHub Actions Status:**
- Visit: https://github.com/[your-repo]/actions/workflows/database-backup.yml
- Check for green checkmarks (successful backups)
- Red X indicates failure (investigate immediately)

**Backup Failure Alerts:**
- GitHub Issues automatically created on failure
- Check email notifications
- Review workflow logs for error details

---

## Manual Backups

### When to Create Manual Backups

Create a manual backup before:
- Major application updates or migrations
- Database schema changes
- Bulk data imports or modifications
- Testing new features that modify data
- Suspected security incidents

### How to Create a Manual Backup

**Command:**
```bash
npm run backup:db
```

**Expected Output:**
```
🚀 Starting automated database backup
📅 Timestamp: 2025-11-04T15-30-00-000Z
───────────────────────────────────────
📦 Creating database backup with pg_dump...
✅ Database backup created: backup-2025-11-04T15-30-00-000Z.sql
  Size: 125.50 MB

🗜️  Compressing backup...
✅ Backup compressed: backup-2025-11-04T15-30-00-000Z.sql.gz
  Size: 35.25 MB (72.0% reduction)

🔒 Encrypting backup...
✅ Backup encrypted: backup-2025-11-04T15-30-00-000Z.sql.gz.encrypted
  Size: 35.28 MB

☁️  Uploading backup to Cloudflare R2...
✅ Backup uploaded to R2: database-backups/2025-11-04T15-30-00-000Z/...
───────────────────────────────────────
✅ Backup completed successfully!
───────────────────────────────────────
📦 Backup key: database-backups/2025-11-04T15-30-00-000Z/backup-2025-11-04T15-30-00-000Z.sql.gz.encrypted
📊 Final size: 35.28 MB
⏱️  Duration: 45.23 seconds
🗓️  Retention: 30 days
───────────────────────────────────────
```

**Save the backup key** - you'll need it for restore operations.

### Manual Backup from Production

**Using Render Shell:**

1. Open Render dashboard: https://dashboard.render.com
2. Select your service (`loma-platform`)
3. Click **Shell** tab
4. Run backup command:
   ```bash
   npm run backup:db
   ```
5. Copy the backup key from output
6. Save backup key securely (password manager)

**Using Local Machine** (with production credentials):

1. Set production environment variables:
   ```bash
   export DATABASE_URL="[production-database-url]"
   export CLOUDFLARE_R2_ACCOUNT_ID="[your-account-id]"
   export CLOUDFLARE_R2_ACCESS_KEY_ID="[your-access-key]"
   export CLOUDFLARE_R2_SECRET_ACCESS_KEY="[your-secret-key]"
   export PHI_ENCRYPTION_KEY="[your-64-char-encryption-key]"
   ```

2. Run backup:
   ```bash
   npm run backup:db
   ```

---

## Backup Verification

### Automated Verification

**Monthly Test:** Runs on the 1st of each month

**Command:**
```bash
npm run test:backup
```

**What It Tests:**
1. ✅ R2 connection and authentication
2. ✅ Database connection
3. ✅ Encryption key validation
4. ✅ Backup listing and metadata
5. ✅ Backup creation (optional)
6. ✅ Restore to test database (if configured)

**Expected Output:**
```
🧪 HIPAA 1.4.7 Backup & Restore Test Suite
═══════════════════════════════════════

1️⃣  Testing Cloudflare R2 Configuration...
  ✅ R2 Configuration (1.23s)

2️⃣  Testing Database Connection...
  ✅ Database Connection (0.85s)

3️⃣  Testing Encryption Key...
  ✅ Encryption Key Validation (0.02s)

4️⃣  Testing Backup Listing...
  ✅ List Backups in R2 (2.15s)

═══════════════════════════════════════
📊 TEST SUMMARY
═══════════════════════════════════════
✅ R2 Configuration (1.23s)
✅ Database Connection (0.85s)
✅ Encryption Key Validation (0.02s)
✅ List Backups in R2 (2.15s)
───────────────────────────────────────
Total: 4 tests
Passed: 4
Failed: 0
Duration: 4.25s
═══════════════════════════════════════

✅ All tests passed! Backup and restore system is operational.
   HIPAA 1.4.7 Compliance: Contingency Plan - VERIFIED ✓
```

### Manual Verification

**Check Backup Exists:**
```bash
# List all backups
npm run restore:db -- --list
```

**Check Backup Size:**
- Typical database backup: 30-50 MB (compressed + encrypted)
- If significantly smaller: investigate potential issues
- If zero bytes: backup failed, check logs

**Check Backup Frequency:**
- Should see daily backups
- Gaps indicate failures, investigate GitHub Actions logs

---

## Restore Procedures

### List Available Backups

```bash
npm run restore:db -- --list
```

Output:
```
📋 Available backups in Cloudflare R2:

────────────────────────────────────────────────────────────────────────────────
Backup Key                                         Date                    Size
────────────────────────────────────────────────────────────────────────────────
database-backups/.../backup-2025-11-04...encrypted 11/4/2025, 2:00:00 AM  35.28 MB
database-backups/.../backup-2025-11-03...encrypted 11/3/2025, 2:00:00 AM  34.95 MB
database-backups/.../backup-2025-11-02...encrypted 11/2/2025, 2:00:00 AM  34.82 MB
────────────────────────────────────────────────────────────────────────────────

Total: 30 backup(s)
```

### Restore Latest Backup

**⚠️  WARNING: This will OVERWRITE the target database!**

```bash
# Restore to current DATABASE_URL
npm run restore:db -- --latest
```

### Restore Specific Backup

```bash
# Use backup key from list command
npm run restore:db -- "database-backups/2025-11-04T02-00-00-000Z/backup-2025-11-04T02-00-00-000Z.sql.gz.encrypted"
```

### Restore to Test Database

**Recommended before restoring to production**

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test:password@localhost:5432/test_db"

# Restore to test database
npm run restore:db -- --latest --target=$TEST_DATABASE_URL
```

### Restore Process Steps

The restore script automatically:

1. **Downloads** backup from R2
2. **Decrypts** using PHI_ENCRYPTION_KEY
3. **Decompresses** gzip file
4. **Restores** to PostgreSQL using `psql`
5. **Verifies** restoration (checks tables exist)
6. **Cleans up** temporary files

**Expected Duration:** 5-15 minutes (depends on database size)

---

## Troubleshooting

### Backup Failed

**Error: "R2 is not configured"**

**Solution:**
```bash
# Check environment variables are set
echo $CLOUDFLARE_R2_ACCOUNT_ID
echo $CLOUDFLARE_R2_ACCESS_KEY_ID
# (SECRET should be set but not echoed)

# If missing, set them:
export CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key"
export CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-key"
```

**Error: "pg_dump failed"**

**Solution:**
```bash
# Install PostgreSQL client
# Ubuntu/Debian:
sudo apt-get install postgresql-client

# macOS:
brew install postgresql

# Verify connection manually:
psql $DATABASE_URL -c "SELECT 1;"
```

**Error: "PHI_ENCRYPTION_KEY must be 64 hex characters"**

**Solution:**
```bash
# Generate new key (ONLY if starting fresh - cannot decrypt existing data with new key)
openssl rand -hex 32

# Set the key:
export PHI_ENCRYPTION_KEY="your-64-character-hex-string"
```

### Restore Failed

**Error: "Backup not found in R2"**

**Solution:**
```bash
# List available backups
npm run restore:db -- --list

# Use exact backup key from list
```

**Error: "Decryption failed"**

**Solution:**
- Verify PHI_ENCRYPTION_KEY is correct
- Key must match the key used during backup
- Cannot restore backup with different encryption key

**Error: "Database restore failed"**

**Solution:**
```bash
# Check target database exists and is accessible
psql $DATABASE_URL -c "SELECT 1;"

# Check database is empty (or you're okay overwriting)
# Restore will run DROP TABLE IF EXISTS commands
```

### GitHub Actions Workflow Failed

**Check Workflow Logs:**
1. Visit: https://github.com/[your-repo]/actions
2. Click on failed workflow run
3. Expand failed step
4. Check error message

**Common Issues:**
- **Secrets not set:** Add secrets in repo Settings → Secrets → Actions
- **Network timeout:** Re-run workflow
- **R2 rate limit:** Wait 1 hour, then re-run

**Required Secrets:**
- `DATABASE_URL`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `PHI_ENCRYPTION_KEY`

---

## File Storage Backups

### Current State

**Files are automatically backed up** to Cloudflare R2 in real-time:
- Uploaded files → Encrypted → Stored in R2
- No separate backup process needed
- R2 provides multi-region replication

### Migrating Existing Files

If you have files in local `uploads/` directory:

```bash
# Dry run (see what would be migrated)
npm run migrate:files-to-r2 -- --dry-run

# Actual migration
npm run migrate:files-to-r2

# With deletion of local files after upload
npm run migrate:files-to-r2 -- --delete
```

---

## Best Practices

### Do's ✅

- ✅ Test backups monthly
- ✅ Verify automated backups are running daily
- ✅ Keep encryption keys secure and backed up separately
- ✅ Document all restore operations
- ✅ Practice restore procedures quarterly
- ✅ Create manual backup before major changes
- ✅ Monitor GitHub Actions for backup failures

### Don'ts ❌

- ❌ Don't delete backups manually from R2
- ❌ Don't change encryption key without re-encrypting all data
- ❌ Don't restore to production without testing first
- ❌ Don't share encryption keys or R2 credentials
- ❌ Don't skip backup verification
- ❌ Don't ignore backup failure alerts

---

## Backup Retention Policy

### Database Backups

**Retention:** 30 days (automatic cleanup)

**Rationale:**
- HIPAA requires ability to recover from recent incidents
- 30 days provides adequate recovery window
- Balances compliance with storage costs
- Historical data remains in primary database (7-year retention)

### File Backups

**Retention:** Indefinite (no automatic deletion)

**Rationale:**
- Patient documents must be retained per HIPAA (7 years minimum)
- R2 free tier covers expected usage
- No cost pressure to delete files
- Manual deletion only with documented justification

---

## Compliance Notes

### HIPAA Requirements Met

✅ **§164.308(a)(7)(i)** - Contingency Plan  
✅ **§164.308(a)(7)(ii)(A)** - Data Backup Plan  
✅ **§164.308(a)(7)(ii)(B)** - Disaster Recovery Plan  
✅ **§164.308(a)(7)(ii)(C)** - Emergency Mode Operation Plan  

### Audit Trail

All backup and restore operations are logged:
- GitHub Actions workflow logs (backup creation)
- Application logs (file uploads/downloads)
- Audit logs in database (PHI access)

### Evidence for Audits

- Backup schedule: `.github/workflows/database-backup.yml`
- Backup scripts: `scripts/backup/`
- Documentation: This file + `DISASTER_RECOVERY_PLAN.md`
- Test results: Run `npm run test:backup` and save output

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-04 | HIPAA Compliance Team | Initial version |

---

**Document Classification:** Operational Procedures  
**HIPAA Section:** 1.4.7 - Contingency Plan  
**Review Frequency:** Quarterly  
**Next Review Date:** February 1, 2026

