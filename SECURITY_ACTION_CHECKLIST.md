# Security Action Checklist

## Immediate Actions Required (Do Today)

### 1. Regenerate PHI Encryption Key for Production
```bash
# Generate new key
openssl rand -hex 32

# Update in your production environment (Render.com or your platform)
# Go to: Environment Variables > PHI_ENCRYPTION_KEY > Update
```

**⚠️ CRITICAL:** This key encrypts patient health information (PHI). The old key was exposed in git history.

### 2. Rotate Database Credentials

**For Production Database:**
- [ ] Go to [Neon Console](https://console.neon.tech/)
- [ ] Reset/rotate password for production database
- [ ] Update `DATABASE_URL` in production environment variables
- [ ] Test connection after rotation

**For Development Database(s):**
- [ ] Reset/rotate passwords for any dev databases that used exposed credentials
- [ ] Update your local `.env.development` file

### 3. Regenerate Session Secrets

```bash
# Generate new session secret
openssl rand -hex 32

# Update in production environment variables
# SESSION_SECRET=<new-value>
```

### 4. Update Your Local Development Environment

```bash
# 1. Copy the new template
cp .env.example .env.development

# 2. Generate your keys
PHI_KEY=$(openssl rand -hex 32)
SESSION_KEY=$(openssl rand -hex 32)

# 3. Edit .env.development and paste the generated values
# 4. Add your database URL from Neon Console

# 5. Verify it's not tracked by git
git status  # Should NOT show .env.development
```

### 5. Notify Team Members

Send this message to all developers:

```
🔒 SECURITY UPDATE: We've removed hardcoded secrets from our codebase.

ACTION REQUIRED:
1. Pull the latest changes
2. Delete your old env.development file
3. Follow SECURITY_SETUP_GUIDE.md to set up your environment
4. Generate NEW keys - don't reuse old ones

Files to read:
- SECURITY_SETUP_GUIDE.md
- .env.example
```

## Short-term Actions (This Week)

### 6. Verify Production is Secure
- [ ] Check all production environment variables are updated
- [ ] Test that application starts with new keys
- [ ] Verify encrypted PHI data is accessible (keys work)
- [ ] Check audit logs for any suspicious access

### 7. Document Key Rotation
- [ ] Document what was rotated and when
- [ ] Store backup of new PHI_ENCRYPTION_KEY in secure location (password manager, company vault)
- [ ] Update runbooks/documentation with new key generation procedures

### 8. Review Access
- [ ] Review who has access to the git repository
- [ ] Consider if repository access should be restricted
- [ ] Check if anyone outside your team had access to exposed secrets

### 9. Mark Resolved in Aikido
After completing actions 1-3:
- [ ] Log into Aikido dashboard
- [ ] Find the "Exposed Secrets" issue
- [ ] Mark as "Resolved"
- [ ] Add note: "All secrets rotated, removed from current files, gitignore updated"

## Long-term Actions (This Month)

### 10. Implement Secrets Management
Consider using:
- AWS Secrets Manager
- HashiCorp Vault
- Your hosting platform's secrets management (Render has environment groups)
- Azure Key Vault

### 11. Add Pre-commit Hooks
Install hooks to prevent future secret commits:
```bash
# Install git-secrets or similar
# Configure to scan for patterns before commit
```

### 12. Security Audit Schedule
- [ ] Set up quarterly security audits
- [ ] Document secret rotation policy (e.g., rotate PHI key annually)
- [ ] Create incident response plan for future exposures

### 13. HIPAA Compliance Review
- [ ] Review with compliance officer
- [ ] Document in HIPAA audit log
- [ ] Update breach notification procedures if needed
- [ ] Consider if this requires reporting (consult legal)

## Verification Commands

### Check No Secrets in Code
```bash
# Should return 0 results
grep -r "0123456789abcdef0123456789abcdef" . --exclude-dir=node_modules
```

### Verify Gitignore Works
```bash
# Create test file
echo "TEST=secret" > .env.development

# Check status - should NOT appear
git status

# Clean up
rm .env.development
```

### Test Key Generation Scripts
```bash
# Should generate random keys
./scripts/setup/setup-local-env.sh

# Should require DATABASE_URL
./scripts/setup/setup-postgres-dev.sh
```

## Questions to Answer

- [ ] Were the exposed keys ever used in production? 
- [ ] How long were they in git history?
- [ ] Who had access to the repository?
- [ ] Is encrypted PHI data accessible with new keys? (or do we need migration?)
- [ ] Should we inform customers/patients? (legal/compliance question)

## Resources

- `SECURITY_SETUP_GUIDE.md` - Detailed setup instructions
- `.env.example` - Environment variable template  
- `AIKIDO_SECURITY_FIX_SUMMARY.md` - Complete technical summary
- [Aikido Dashboard](https://app.aikido.dev/) - Mark issue resolved

## Status Tracking

| Action | Status | Date | Notes |
|--------|--------|------|-------|
| Regenerate PHI_ENCRYPTION_KEY | ⏳ Pending | | Production key |
| Rotate production DB password | ⏳ Pending | | Neon Console |
| Regenerate SESSION_SECRET | ⏳ Pending | | Production |
| Update local dev environment | ⏳ Pending | | Your machine |
| Notify team | ⏳ Pending | | All developers |
| Verify production secure | ⏳ Pending | | Test after rotation |
| Mark resolved in Aikido | ⏳ Pending | | After rotation |

---

**Priority Level:** 🔴 HIGH  
**Compliance Impact:** HIPAA - Patient data protection  
**Technical Risk:** Unauthorized access to encrypted PHI  
**Business Risk:** Regulatory penalties, loss of trust  

**Start with actions 1-4 immediately.**










