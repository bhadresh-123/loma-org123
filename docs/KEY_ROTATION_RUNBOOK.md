# Key Rotation Operational Runbook

**Document Version:** 1.0  
**Last Updated:** November 18, 2025  
**Compliance:** HIPAA §164.312(a)(2)(iv) - Encryption and Decryption  
**Owner:** Security & Operations Teams  
**Review Frequency:** Quarterly

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Rotation Checklist](#pre-rotation-checklist)
3. [PHI Encryption Key Rotation (Annual)](#phi-encryption-key-rotation-annual)
4. [Session Secret Rotation (Quarterly)](#session-secret-rotation-quarterly)
5. [Emergency Key Rotation](#emergency-key-rotation)
6. [Post-Rotation Verification](#post-rotation-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Contact Information](#contact-information)

---

## Overview

This runbook provides step-by-step instructions for rotating cryptographic keys in the Loma Mental Health platform. Key rotation is a critical security control required for HIPAA compliance.

### Key Types

| Key Type | Rotation Frequency | Impact | HIPAA Required |
|----------|-------------------|--------|----------------|
| `PHI_ENCRYPTION_KEY` | Annual (365 days) | Re-encrypts all PHI data | Yes |
| `SESSION_SECRET` | Quarterly (90 days) | Invalidates all user sessions | Yes (best practice) |

### When to Use This Runbook

- **Scheduled Rotation:** Follow normal procedures during off-peak hours
- **Key Compromise:** Follow emergency procedures immediately
- **Compliance Audit:** Use as reference for demonstrating procedures
- **New Team Member:** Training reference for key management

---

## Pre-Rotation Checklist

**Complete these steps BEFORE starting any key rotation:**

### Planning

- [ ] **Schedule rotation window** (prefer off-peak hours: 2-4 AM UTC)
- [ ] **Notify stakeholders:**
  - [ ] Security team
  - [ ] Operations team
  - [ ] Compliance officer
  - [ ] CTO (for PHI key rotation)
  - [ ] Users (for session secret rotation, send 24h advance notice)
- [ ] **Review this runbook** (ensure you understand all steps)
- [ ] **Check prerequisites:**
  - [ ] Database access credentials
  - [ ] Render dashboard access
  - [ ] tsx/Node.js runtime available
  - [ ] All rotation scripts present in `server/scripts/`

### Backup

- [ ] **Create database backup:**
  ```bash
  npm run backup:database
  # Or manually:
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Verify backup integrity:**
  ```bash
  # Check backup file size (should be > 0)
  ls -lh backup_*.sql
  ```
- [ ] **Store backup securely** (encrypted, off-site)
- [ ] **Document backup location** in rotation notes

### Environment Preparation

- [ ] **Verify current key is working:**
  ```bash
  tsx server/scripts/verify-encryption.ts
  ```
- [ ] **Check system health:**
  ```bash
  # Check application status
  curl -f https://your-app.onrender.com/api/status || echo "App health check failed"
  
  # Check database connectivity
  psql $DATABASE_URL -c "SELECT 1;" || echo "Database connection failed"
  ```
- [ ] **Ensure no ongoing deployments**
- [ ] **Check for active incidents or outages**

---

## PHI Encryption Key Rotation (Annual)

### Estimated Duration: 30-60 minutes
### Impact: None (zero-downtime rotation)
### Frequency: Every 365 days (with 30-day grace period)

---

### Step 1: Generate New Encryption Key

```bash
# Generate a cryptographically secure 256-bit key
NEW_KEY=$(openssl rand -hex 32)

# Display key fingerprint (last 8 characters)
echo "New key fingerprint: ...${NEW_KEY: -8}"

# IMPORTANT: Copy this key to a secure location before proceeding
```

**⚠️ CRITICAL:** Store the `NEW_KEY` securely. You will need it for the next steps.

---

### Step 2: Validate Keys

```bash
# Set environment variables
export OLD_KEY=$PHI_ENCRYPTION_KEY  # Current production key
export NEW_KEY=<your-newly-generated-key>

# Verify both keys are valid
echo "Old key length: ${#OLD_KEY}"  # Should be 64
echo "New key length: ${#NEW_KEY}"  # Should be 64
```

**Expected Output:**
- Both keys should be exactly 64 characters
- Keys should be different from each other

---

### Step 3: Run Pre-Rotation Tests

```bash
# Verify current encryption is working
tsx server/scripts/verify-encryption.ts
```

**Expected Output:**
```
✅ VERIFICATION PASSED
   Round-trip test: ✅ PASSED
   Successful decryptions: XXX
   Failed decryptions: 0
```

**❌ If tests fail:** DO NOT PROCEED. Investigate and resolve issues first.

---

### Step 4: Execute Key Rotation

```bash
# Run rotation script
OLD_KEY=$OLD_KEY NEW_KEY=$NEW_KEY ROTATION_REASON="scheduled" \
  tsx server/scripts/rotate-encryption-key.ts
```

**What This Does:**
1. Validates both keys
2. Decrypts all PHI data with `OLD_KEY`
3. Re-encrypts all PHI data with `NEW_KEY`
4. Logs rotation to `key_rotation_history` table
5. Provides summary and next steps

**Expected Output:**
```
✅ KEY ROTATION COMPLETE
   Total records rotated: XXXX
   - Therapist PHI: XX
   - Patient records: XXX
   - Client records: XXX
   - Clinical sessions: XX
   Duration: X.XXs
```

**⏱️ Duration:** Varies by database size (typically 10-60 seconds)

---

### Step 5: Verify Rotation Success

```bash
# Test decryption with NEW_KEY
PHI_ENCRYPTION_KEY=$NEW_KEY tsx server/scripts/verify-encryption.ts
```

**Expected Output:**
```
✅ VERIFICATION PASSED
   Successful decryptions: XXX
   Failed decryptions: 0
```

**❌ If verification fails:** See [Rollback Procedures](#rollback-procedures)

---

### Step 6: Update Production Environment

1. **Open Render Dashboard:**
   - Navigate to: https://dashboard.render.com/web/srv-d3e6dovdiees73fqml80
   - Go to: Environment → Environment Variables

2. **Update PHI_ENCRYPTION_KEY:**
   ```
   Key: PHI_ENCRYPTION_KEY
   Value: <your-NEW_KEY>
   ```

3. **Save Changes** (Render will restart the application automatically)

4. **Monitor deployment:**
   ```bash
   # Watch deployment logs
   # (Use Render dashboard or Render API)
   ```

---

### Step 7: Verify Production

Wait 2-3 minutes for application to restart, then:

```bash
# 1. Check application health
curl -f https://your-app.onrender.com/api/status

# 2. Test login and PHI access through the UI
# - Log in as a test user
# - View a patient record
# - Create a clinical note
# - Verify data displays correctly
```

**✅ Success Criteria:**
- Application is running
- Users can log in
- PHI data displays correctly
- No decryption errors in logs

---

### Step 8: Cleanup

```bash
# 1. Remove old key from environment
unset OLD_KEY

# 2. Clear shell history (security measure)
history -c

# 3. Document rotation
# Add entry to key_rotation_history or internal wiki
```

---

### Step 9: Post-Rotation Documentation

Document the following:

- **Date/Time:** When rotation was performed
- **Reason:** "Scheduled annual rotation"
- **Records Rotated:** Number from script output
- **Duration:** Total time from script output
- **Performed By:** Your name/ID
- **Incidents:** Any issues encountered
- **Next Rotation Due:** Today + 365 days

**Template:**
```
PHI Key Rotation Report - [DATE]
=================================
Rotation Reason: Scheduled annual rotation
Performed By: [YOUR NAME]
Start Time: [TIMESTAMP]
End Time: [TIMESTAMP]
Duration: [DURATION]

Records Rotated:
- Therapist PHI: XX
- Patients: XXX
- Clients: XXX
- Clinical Sessions: XX
- Total: XXXX

Verification: ✅ PASSED
Incidents: None
Next Rotation Due: [DATE + 365 days]
```

---

## Session Secret Rotation (Quarterly)

### Estimated Duration: 10-15 minutes
### Impact: All users will be logged out
### Frequency: Every 90 days

---

### Step 1: User Notification

**24 Hours Before Rotation:**

Send notification to all users:

```
Subject: Scheduled Maintenance - Brief Session Logout

Dear Users,

We will be performing routine security maintenance on [DATE] at [TIME].

Impact:
- You will be automatically logged out
- Please save any work in progress
- You can log back in immediately after maintenance
- Downtime: < 5 minutes

This maintenance is part of our ongoing security enhancements.

Thank you for your understanding.

Security Team
```

---

### Step 2: Generate New Session Secret

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# Display fingerprint
echo "New secret fingerprint: ...${NEW_SECRET: -8}"

# IMPORTANT: Copy this secret securely
```

---

### Step 3: Run Rotation Script

```bash
# Run rotation preparation
NEW_SECRET=$NEW_SECRET ROTATION_REASON="scheduled" \
  tsx server/scripts/rotate-session-secret.ts
```

**What This Does:**
1. Validates new secret format
2. Counts active sessions
3. Invalidates existing sessions in database
4. Logs rotation to `key_rotation_history`
5. Provides deployment instructions

**Expected Output:**
```
✅ SESSION SECRET ROTATION PREPARED
   Active sessions affected: XX
   Old secret fingerprint: ...XXXXXXXX
   New secret fingerprint: ...YYYYYYYY
```

---

### Step 4: Update Production Environment

1. **Open Render Dashboard**

2. **Update SESSION_SECRET:**
   ```
   Key: SESSION_SECRET
   Value: <your-NEW_SECRET>
   ```

3. **Save and Deploy** (Render restarts automatically)

---

### Step 5: Verify Rotation

```bash
# 1. Wait for application to restart (2-3 minutes)

# 2. Test login
# - Open application in browser
# - Existing sessions should be invalidated
# - Log in with valid credentials
# - Verify new session works correctly

# 3. Check logs for errors
# (Use Render dashboard logs)
```

---

### Step 6: Post-Rotation Notification

Send confirmation to users:

```
Subject: Maintenance Complete - You Can Now Log In

The scheduled maintenance has been completed successfully.

You can now log back into the system with your normal credentials.

If you experience any issues logging in, please contact support.

Thank you,
Security Team
```

---

## Emergency Key Rotation

**Use this procedure if a key is compromised or suspected to be compromised.**

### Immediate Actions (Within 1 Hour)

#### Step 1: Assess Situation

**Questions to Answer:**
- Which key was compromised? (PHI_ENCRYPTION_KEY or SESSION_SECRET)
- When did the compromise occur?
- How was it discovered?
- What data may have been accessed?
- Is the key currently being exploited?

**Document Everything:** Take notes of all findings for incident report.

---

#### Step 2: Notify Stakeholders IMMEDIATELY

**Critical Contacts:**
- Security Team Lead
- CTO
- Compliance Officer
- Legal Team (if PHI data compromised)

**Initial Notification Template:**
```
Subject: URGENT - Cryptographic Key Compromise Detected

INCIDENT: Potential key compromise detected
TIME: [TIMESTAMP]
KEY TYPE: [PHI_ENCRYPTION_KEY or SESSION_SECRET]
DISCOVERY METHOD: [How it was found]
POTENTIAL IMPACT: [Brief assessment]
IMMEDIATE ACTION: Emergency key rotation in progress

Full incident report to follow.

[YOUR NAME]
```

---

#### Step 3: Emergency Rotation Procedure

**For PHI_ENCRYPTION_KEY:**

```bash
# 1. Create emergency backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Generate new key
NEW_KEY=$(openssl rand -hex 32)

# 3. Rotate immediately
OLD_KEY=$PHI_ENCRYPTION_KEY NEW_KEY=$NEW_KEY ROTATION_REASON="compromised" \
  tsx server/scripts/rotate-encryption-key.ts

# 4. Update production
# (Follow Step 6 from PHI rotation procedure)

# 5. Verify
PHI_ENCRYPTION_KEY=$NEW_KEY tsx server/scripts/verify-encryption.ts
```

**For SESSION_SECRET:**

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Rotate immediately
NEW_SECRET=$NEW_SECRET ROTATION_REASON="compromised" \
  tsx server/scripts/rotate-session-secret.ts

# 3. Update production immediately
# (Follow Step 4 from Session Secret rotation procedure)
```

**⚠️ DO NOT WAIT for scheduled rotation window. Execute immediately.**

---

#### Step 4: Assess Data Breach

**Within 4 Hours:**

- [ ] **Review audit logs** for suspicious access:
  ```sql
  SELECT * FROM audit_events 
  WHERE timestamp > '[COMPROMISE_START_TIME]'
  AND action IN ('READ', 'EXPORT')
  ORDER BY timestamp DESC;
  ```

- [ ] **Check for unauthorized access:**
  ```sql
  SELECT * FROM audit_events 
  WHERE user_id NOT IN (SELECT id FROM users_auth WHERE account_status = 'active')
  AND timestamp > '[COMPROMISE_START_TIME]';
  ```

- [ ] **Document findings:**
  - What data was accessed?
  - By whom (if identifiable)?
  - When did access occur?
  - What was the scope of access?

---

#### Step 5: HIPAA Breach Assessment

**Within 24 Hours:**

Work with Compliance Officer and Legal Team to determine:

1. **Does this constitute a breach under HIPAA?**
   - Was PHI accessed, acquired, or disclosed?
   - Was access unauthorized?
   - Did safeguards fail?

2. **Breach notification requirements (§164.404):**
   - **Individuals:** Notify within 60 days if breach affects 500+ people
   - **HHS:** Report within 60 days
   - **Media:** Notify if breach affects 500+ residents of a state

3. **Document decision:**
   - Rationale for breach determination
   - Notification plan
   - Mitigation steps

---

#### Step 6: Post-Incident Actions

**Within 1 Week:**

- [ ] **Complete incident report**
- [ ] **Update security procedures**
- [ ] **Conduct post-mortem meeting**
- [ ] **Implement preventive measures**
- [ ] **Update key rotation policy if needed**
- [ ] **Train team on lessons learned**

---

## Post-Rotation Verification

**Complete these checks after ANY key rotation:**

### Automated Verification

```bash
# Run full verification suite
tsx server/scripts/verify-encryption.ts

# Check application health
curl -f https://your-app.onrender.com/api/status

# Verify database connectivity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM key_rotation_history;"
```

### Manual Verification

- [ ] **Test user login**
  - Log in as test user
  - Verify session persists
  - Check MFA if applicable

- [ ] **Test PHI access**
  - View patient records
  - Create clinical note
  - Upload/download documents
  - Generate reports

- [ ] **Test API endpoints**
  - Test key PHI endpoints
  - Verify audit logging
  - Check rate limiting

- [ ] **Review logs**
  - Check for decryption errors
  - Verify no authentication failures
  - Confirm audit events logging

### Success Criteria

✅ **All checks must pass before declaring rotation complete:**

- [ ] Verification script passes (0 decryption failures)
- [ ] Application status: healthy
- [ ] Database connectivity: confirmed
- [ ] User login: successful
- [ ] PHI access: working correctly
- [ ] No error spikes in logs
- [ ] Rotation logged in `key_rotation_history`

---

## Rollback Procedures

**If rotation fails or causes issues, follow these steps to rollback:**

### PHI Encryption Key Rollback

```bash
# 1. Stop further operations
echo "ROLLBACK IN PROGRESS - DO NOT DEPLOY"

# 2. Restore database from backup
psql $DATABASE_URL < backup_[timestamp].sql

# 3. Verify backup restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM patients;"

# 4. Re-rotate back to OLD_KEY (if partial rotation occurred)
OLD_KEY=$NEW_KEY NEW_KEY=$OLD_KEY_BACKUP ROTATION_REASON="rollback" \
  tsx server/scripts/rotate-encryption-key.ts

# 5. Verify with old key
PHI_ENCRYPTION_KEY=$OLD_KEY_BACKUP tsx server/scripts/verify-encryption.ts

# 6. Update production to use OLD_KEY
# (Revert environment variable in Render dashboard)
```

### Session Secret Rollback

```bash
# 1. Update SESSION_SECRET back to old value in Render dashboard

# 2. Restart application

# 3. Users may need to log in again (expected behavior)
```

### When to Rollback

**Rollback immediately if:**
- Verification script fails (decryption errors > 0)
- Application fails to start after rotation
- Critical functionality is broken
- Data integrity is questionable

**Do NOT rollback if:**
- Only non-critical issues (can be patched)
- User complaints about logout (expected for session rotation)
- Minor UI glitches unrelated to encryption

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "PHI_ENCRYPTION_KEY must be 64 hex characters"

**Cause:** Invalid key format

**Solution:**
```bash
# Verify key length
echo ${#NEW_KEY}  # Should output: 64

# Verify hex format
echo $NEW_KEY | grep -E '^[a-f0-9]{64}$'  # Should match

# Regenerate if invalid
NEW_KEY=$(openssl rand -hex 32)
```

---

#### Issue: "Decryption failed: Wrong encryption key or corrupted data"

**Cause:** Using wrong key to decrypt

**Solution:**
1. Verify you're using the correct OLD_KEY (current production key)
2. Check if rotation already occurred (query `key_rotation_history`)
3. If unsure, restore from backup and start over

---

#### Issue: "Database connection failed"

**Cause:** Database unreachable or credentials invalid

**Solution:**
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check DATABASE_URL is set
echo $DATABASE_URL | grep -o "postgres://[^@]*"  # Should show postgres://user:***

# Verify database is running (check Render dashboard)
```

---

#### Issue: "Records rotated: 0" (unexpected)

**Cause:** No encrypted data found or wrong table structure

**Solution:**
1. Check if database has data: `SELECT COUNT(*) FROM patients;`
2. Verify table structure matches schema
3. Check if data is already using new key format
4. Review migration history

---

#### Issue: "Application won't start after rotation"

**Cause:** Environment variable not updated or syntax error

**Solution:**
1. Check Render logs for startup errors
2. Verify PHI_ENCRYPTION_KEY is set correctly in Render dashboard
3. Ensure no extra spaces or quotes in environment variable
4. Restart application manually if needed

---

#### Issue: "Users report 'Token expired' after session rotation"

**Cause:** Expected behavior - sessions invalidated by design

**Solution:**
- This is normal and expected
- Users just need to log in again
- If persistent: Check SESSION_SECRET is correctly updated
- Verify JWT_SECRET env var if using separate variable

---

### Getting Help

#### Self-Service

1. **Check logs:**
   - Render Dashboard → Logs
   - Look for stack traces and error messages

2. **Review documentation:**
   - `docs/KEY_ROTATION_POLICY.md`
   - `docs/ENCRYPTION_AT_REST_COMPLIANCE.md`
   - This runbook

3. **Test in development:**
   - Run scripts in dev environment first
   - Verify behavior matches expectations

#### Escalation Path

1. **Level 1:** Engineering team (non-emergency)
2. **Level 2:** Security team lead (issues with rotation)
3. **Level 3:** CTO + Compliance officer (data breach or major incident)
4. **Level 4:** Legal team (HIPAA breach confirmed)

---

## Contact Information

### Key Personnel

- **Security Team Lead:** security@loma-mental-health.com
- **CTO:** cto@loma-mental-health.com
- **Compliance Officer:** compliance@loma-mental-health.com
- **Operations Team:** ops@loma-mental-health.com

### Emergency Contacts

- **After Hours:** [Emergency Pager/Phone TBD]
- **Incident Hotline:** [TBD]
- **HIPAA Breach Hotline:** [TBD]

### External Resources

- **Render Support:** https://render.com/support
- **HIPAA Breach Notification:** https://www.hhs.gov/hipaa/for-professionals/breach-notification/
- **Encryption Best Practices:** https://csrc.nist.gov/publications

---

## Appendix: Quick Reference Commands

### Check Last Rotation Date

```sql
-- PHI key last rotation
SELECT * FROM key_rotation_history 
WHERE key_type = 'PHI_ENCRYPTION_KEY' 
ORDER BY rotated_at DESC 
LIMIT 1;

-- Session secret last rotation
SELECT * FROM key_rotation_history 
WHERE key_type = 'SESSION_SECRET' 
ORDER BY rotated_at DESC 
LIMIT 1;
```

### Check If Rotation Overdue

```sql
-- PHI key (overdue if > 365 days)
SELECT 
  key_type,
  rotated_at,
  CURRENT_DATE - rotated_at::date AS days_since_rotation,
  CASE 
    WHEN CURRENT_DATE - rotated_at::date > 365 THEN 'OVERDUE'
    WHEN CURRENT_DATE - rotated_at::date > 335 THEN 'WARNING (30 days left)'
    ELSE 'OK'
  END AS status
FROM key_rotation_history
WHERE key_type = 'PHI_ENCRYPTION_KEY'
ORDER BY rotated_at DESC
LIMIT 1;
```

### Generate Keys

```bash
# PHI encryption key (32 bytes = 64 hex chars)
openssl rand -hex 32

# Session secret (32 bytes = 64 hex chars)
openssl rand -hex 32

# Generate and display fingerprint
KEY=$(openssl rand -hex 32) && echo "Fingerprint: ...${KEY: -8}"
```

### Test Encryption

```bash
# Full verification
tsx server/scripts/verify-encryption.ts

# Quick test
tsx server/scripts/verify-encryption.ts | grep "VERIFICATION PASSED"
```

---

**Document Classification:** INTERNAL - Operations Sensitive  
**Next Review Date:** February 18, 2026 (Quarterly)  
**Version:** 1.0

---

**End of Runbook**

