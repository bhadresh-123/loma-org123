# Key Rotation Policy

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Compliance:** HIPAA 1.4.4 - Information Access Management  
**Owner:** Security Team

---

## Executive Summary

This document defines the key rotation policy for all cryptographic keys used in the Loma Mental Health platform to maintain HIPAA compliance and security best practices. Regular key rotation minimizes the risk of key compromise and ensures data protection.

---

## Key Rotation Schedule

### Critical Keys (HIPAA-Required)

#### PHI_ENCRYPTION_KEY
- **Rotation Frequency:** Annually (365 days)
- **Priority:** CRITICAL
- **Purpose:** Encrypts patient health information (PHI) in database
- **HIPAA Requirement:** Yes (§164.312(a)(2)(iv) - Encryption and Decryption)
- **Grace Period:** 30 days warning before expiration

**Rotation Procedure:**
1. Run pre-rotation backup: `npm run backup:database`
2. Execute rotation script: `tsx server/scripts/rotate-encryption-key.ts`
3. Verify data integrity: `tsx server/scripts/verify-encryption.ts`
4. Update environment variables in Render.com dashboard
5. Log rotation in `key_rotation_history` table

**Script Location:** `server/scripts/rotate-encryption-key.ts`

#### SESSION_SECRET
- **Rotation Frequency:** Quarterly (90 days)
- **Priority:** HIGH
- **Purpose:** Signs JWT tokens for user sessions
- **Impact:** All active sessions will be invalidated on rotation
- **Notification:** Users will need to log in again

**Rotation Procedure:**
1. Generate new secret: `openssl rand -hex 32`
2. Update `SESSION_SECRET` in Render environment variables
3. Deploy application (triggers restart)
4. Notify users of session expiration
5. Log rotation event

---

### API Keys (On-Demand Rotation)

#### STRIPE_SECRET_KEY
- **Rotation Frequency:** On-demand (if compromised) or annually
- **Priority:** HIGH
- **Purpose:** Stripe payment processing
- **Compromise Protocol:**
  1. Immediately generate new key in Stripe Dashboard
  2. Update environment variable
  3. Deploy immediately
  4. Review recent transactions
  5. Report to compliance officer

#### ANTHROPIC_API_KEY / OPENAI_API_KEY
- **Rotation Frequency:** On-demand (if compromised) or semi-annually
- **Priority:** MEDIUM
- **Purpose:** AI-assisted clinical note generation
- **Rotation:** Rotate through provider dashboard + environment update

---

## Rotation Automation

### Compliance Monitor Service

A scheduled service monitors key age and sends notifications:

```typescript
// server/services/ComplianceMonitor.ts
// Runs daily at 2 AM UTC
// Checks key rotation history and sends alerts
```

**Alerts Triggered:**
- 30 days before PHI key rotation due
- 14 days before SESSION_SECRET rotation due
- 7 days before critical key expiration
- Immediate alert if key age exceeds policy

### Key Rotation History

All rotations are logged in the `key_rotation_history` table:

```sql
CREATE TABLE key_rotation_history (
  id SERIAL PRIMARY KEY,
  key_type TEXT NOT NULL,
  rotated_by INTEGER REFERENCES users_auth(id),
  rotation_reason TEXT, -- 'scheduled', 'compromised', 'manual'
  old_key_fingerprint TEXT,
  new_key_fingerprint TEXT,
  records_reencrypted INTEGER DEFAULT 0,
  rotation_status TEXT DEFAULT 'completed',
  rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Query Last Rotation:**
```sql
SELECT * FROM key_rotation_history 
WHERE key_type = 'PHI_ENCRYPTION_KEY' 
ORDER BY rotated_at DESC LIMIT 1;
```

---

## Key Compromise Protocol

### Immediate Actions (Within 1 Hour)

1. **Identify Scope**
   - Which key was compromised?
   - When did compromise occur?
   - What data was potentially accessed?

2. **Rotate Key Immediately**
   - Follow rotation procedure for affected key
   - Do NOT wait for scheduled rotation
   - Set `rotation_reason` to 'compromised'

3. **Notify Stakeholders**
   - Security team
   - Compliance officer
   - CTO/Engineering lead
   - Legal team (if PHI key compromised)

4. **Assess Impact**
   - Review audit logs for suspicious access
   - Check if PHI was accessed during compromise window
   - Document timeline of events

### Follow-Up Actions (Within 24 Hours)

1. **HIPAA Breach Assessment**
   - Determine if this constitutes a breach under HIPAA
   - Consult with compliance officer and legal team
   - Prepare breach notification if required (§164.404)

2. **Post-Mortem**
   - How did compromise occur?
   - What can prevent future compromises?
   - Update security procedures

3. **Documentation**
   - Complete incident report
   - Update key rotation history with details
   - File with compliance records

---

## Key Storage Best Practices

### Production Environment (Render.com)

**DO:**
- ✅ Store keys in Render environment variables (encrypted at rest)
- ✅ Use unique keys for each environment (dev/staging/production)
- ✅ Limit access to environment variables (admin only)
- ✅ Enable audit logging for environment variable changes

**DON'T:**
- ❌ Hardcode keys in source code
- ❌ Commit keys to git repository
- ❌ Share keys via email/Slack
- ❌ Reuse keys across environments

### Development Environment

**DO:**
- ✅ Use `.env.development` (gitignored)
- ✅ Generate unique keys for local development
- ✅ Use different keys than production
- ✅ Document key generation in `SECURITY_SETUP_GUIDE.md`

**DON'T:**
- ❌ Use production keys in development
- ❌ Commit `.env.development` to git
- ❌ Share development keys in public channels

---

## Key Generation Standards

### PHI Encryption Key
```bash
# 32-byte (256-bit) random key in hexadecimal
openssl rand -hex 32
# Output: 64 characters (256 bits)
```

### Session Secret
```bash
# 32-byte random secret for JWT signing
openssl rand -hex 32
```

### MFA Secrets
```bash
# 20-byte random secret, base32-encoded (handled by MFAService)
# Automatically generated during MFA setup
```

---

## Compliance Verification

### Quarterly Review Checklist

- [ ] Verify PHI_ENCRYPTION_KEY last rotation date (< 365 days)
- [ ] Verify SESSION_SECRET last rotation date (< 90 days)
- [ ] Review key rotation history for compliance
- [ ] Check for any missed rotations
- [ ] Verify alert system is functioning
- [ ] Test key rotation procedures in staging
- [ ] Update this document if procedures changed

### Annual Audit

- [ ] Complete full key rotation audit
- [ ] Review all key compromise incidents
- [ ] Assess rotation automation effectiveness
- [ ] Update rotation procedures based on lessons learned
- [ ] Train new team members on procedures
- [ ] Verify HIPAA compliance requirements still met

---

## Roles and Responsibilities

### Security Team
- Execute scheduled key rotations
- Monitor key age and alert compliance
- Respond to key compromise incidents
- Maintain rotation scripts and automation

### Compliance Officer
- Verify rotation policy compliance
- Conduct quarterly reviews
- Assess breach notification requirements
- Maintain audit documentation

### Engineering Team
- Develop and maintain rotation scripts
- Implement rotation automation
- Test rotation procedures in staging
- Document technical procedures

### CTO
- Approve key rotation policy
- Review post-compromise assessments
- Allocate resources for key management
- Final approval for emergency rotations

---

## Related Documentation

- **Encryption Implementation:** `docs/ENCRYPTION_AT_REST_COMPLIANCE.md`
- **Security Setup Guide:** `SECURITY_SETUP_GUIDE.md`
- **Rotation Script:** `server/scripts/rotate-encryption-key.ts`
- **HIPAA Compliance:** `security-reports/HIPAA-Compliance-Checklist.md`
- **Incident Response:** (To be created)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-04 | Security Team | Initial key rotation policy for HIPAA 1.4.4 compliance |

---

## Appendix: Quick Reference

### Check Key Ages

```bash
# Check last PHI key rotation
psql $DATABASE_URL -c "SELECT * FROM key_rotation_history WHERE key_type='PHI_ENCRYPTION_KEY' ORDER BY rotated_at DESC LIMIT 1;"

# Check if rotation is overdue
# PHI key: > 365 days = overdue
# SESSION_SECRET: > 90 days = overdue
```

### Emergency Rotation Commands

```bash
# PHI Encryption Key (requires old key)
OLD_KEY=<current_phi_key> \
NEW_KEY=$(openssl rand -hex 32) \
tsx server/scripts/rotate-encryption-key.ts

# Session Secret (just generate new)
NEW_SESSION_SECRET=$(openssl rand -hex 32)
# Update in Render dashboard and restart
```

### Contact Information

- **Security Team:** security@loma-mental-health.com
- **Compliance Officer:** compliance@loma-mental-health.com
- **CTO:** cto@loma-mental-health.com
- **Emergency Hotline:** [To be configured]

---

**Document Classification:** INTERNAL - Security Sensitive  
**Next Review Date:** February 4, 2026 (Quarterly)

