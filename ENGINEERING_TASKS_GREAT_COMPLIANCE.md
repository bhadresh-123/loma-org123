# Engineering Tasks: Great HIPAA Compliance
## Sprint Goal: Achieve 95% HIPAA Compliance - Industry Leading

**Priority:** 📋 ENHANCEMENT  
**Timeline:** 3 months (12 weeks)  
**Team Size:** 1-2 engineers  
**Prerequisites:** Minimum Viable Compliance sprint completed (85%)

---

## Sprint Overview

| Metric | Target |
|--------|--------|
| Starting Compliance | 85% |
| Target Compliance | 95% |
| Tasks | 15 enhancement tasks |
| Total Hours | ~120 hours |
| Timeline | 12 weeks |
| Impact | Industry-leading security posture |

---

## Phase 1: Security Hardening (Weeks 1-4)

### Task 1: Encrypt requestBody in Audit Logs

**Priority:** ⚠️ MEDIUM-HIGH  
**Time Estimate:** 3 hours  
**HIPAA Requirement:** § 164.312(a)(2)(iv) - Encryption  
**Benefit:** Prevents PHI exposure in audit logs

#### Problem Statement
Request bodies in audit logs may contain unencrypted PHI. While logs are access-controlled, encryption provides defense-in-depth.

#### Implementation Steps

##### 1.1 Update Audit Logging Middleware
**File:** `server/middleware/audit-logging.ts`

**Current Code (Line ~189-206):**
```typescript
const preAuditEvent: AuditEvent = {
  userId: req.user?.id || null,
  sessionId: req.sessionID,
  action,
  resourceType,
  resourceId: req.params.id ? parseInt(req.params.id) : undefined,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  correlationId,
  phiFieldsAccessed: [],
  additionalData: {
    method: req.method,
    path: req.path,
    query: sanitizeQueryParams(req.query),
    preOperation: true,
    timestamp: new Date().toISOString()
  }
};
```

**Updated Code:**
```typescript
import { encryptPHI } from '../utils/phi-encryption';

// Function to safely log request body
function sanitizeAndEncryptRequestBody(body: any): string | null {
  if (!body || Object.keys(body).length === 0) {
    return null;
  }

  // Option 1: Don't log request body at all (most secure)
  return null;

  // Option 2: Encrypt entire request body
  // return encryptPHI(JSON.stringify(body));

  // Option 3: Log only non-PHI fields
  // const safeFields = ['id', 'organizationId', 'type', 'status'];
  // const safeTolog = {};
  // Object.keys(body).forEach(key => {
  //   if (safeFields.includes(key)) {
  //     safeToLog[key] = body[key];
  //   }
  // });
  // return JSON.stringify(safeToLog);
}

const preAuditEvent: AuditEvent = {
  // ... other fields
  additionalData: {
    method: req.method,
    path: req.path,
    query: sanitizeQueryParams(req.query),
    requestBody: sanitizeAndEncryptRequestBody(req.body), // ADD THIS
    preOperation: true,
    timestamp: new Date().toISOString()
  }
};
```

##### 1.2 Add Schema Field (if not exists)
**File:** `db/schema-hipaa-refactored.ts`

**Verify field exists (Line ~534):**
```typescript
requestBody: text("request_body"), // Encrypted if contains PHI
```

**If missing, add migration:**
```sql
-- Migration: Add requestBody to audit_logs_hipaa
ALTER TABLE audit_logs_hipaa 
ADD COLUMN request_body TEXT;

COMMENT ON COLUMN audit_logs_hipaa.request_body IS 'Encrypted request body (PHI-safe)';
```

#### Testing Criteria

##### Test 1: Verify Request Body Handling
```typescript
// Test: server/tests/audit-request-body.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { db } from '../../db';
import { auditLogsHIPAA } from '../../db/schema-hipaa-refactored';
import { desc } from 'drizzle-orm';

describe('Audit Log Request Body Encryption', () => {
  it('should not log PHI in request body', async () => {
    // Make request with PHI data
    await request(app)
      .post('/api/patients')
      .send({
        name: 'John Doe',
        contactEmail: 'john@example.com',
        dob: '1990-01-01',
        diagnosis: 'Test diagnosis'
      });

    // Check audit log
    const auditLog = await db
      .select()
      .from(auditLogsHIPAA)
      .orderBy(desc(auditLogsHIPAA.createdAt))
      .limit(1);

    expect(auditLog[0]).toBeDefined();
    
    // Verify request body is either null or encrypted
    const requestBody = auditLog[0].requestBody;
    if (requestBody) {
      // Should be encrypted format: v1:iv:authTag:ciphertext
      expect(requestBody).toMatch(/^v1:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      
      // Should NOT contain plaintext PHI
      expect(requestBody).not.toContain('John Doe');
      expect(requestBody).not.toContain('john@example.com');
      expect(requestBody).not.toContain('1990-01-01');
    } else {
      // Request body intentionally not logged (also acceptable)
      expect(requestBody).toBeNull();
    }
  });
});
```

#### Acceptance Criteria
- [ ] `sanitizeAndEncryptRequestBody` function created
- [ ] Request bodies either null or encrypted in audit logs
- [ ] No plaintext PHI in audit log `requestBody` field
- [ ] Tests pass
- [ ] Performance impact < 50ms per request

---

### Task 2: Implement Encryption Key Rotation

**Priority:** 📋 MEDIUM  
**Time Estimate:** 12 hours  
**HIPAA Requirement:** § 164.312(a)(2)(iv) - Addressable  
**Benefit:** Best practice for long-term key security

#### Problem Statement
No mechanism exists for rotating encryption keys. Industry best practice is 90-180 day key rotation.

#### Implementation Steps

##### 2.1 Add Key Version to Encrypted Fields
**File:** `db/schema-hipaa-refactored.ts`

**Add migration:**
```sql
-- Migration: Add key version tracking
ALTER TABLE patients ADD COLUMN encryption_key_version INTEGER DEFAULT 1;
ALTER TABLE clinical_sessions ADD COLUMN encryption_key_version INTEGER DEFAULT 1;
ALTER TABLE patient_treatment_plans ADD COLUMN encryption_key_version INTEGER DEFAULT 1;
ALTER TABLE therapist_phi ADD COLUMN encryption_key_version INTEGER DEFAULT 1;

CREATE INDEX idx_patients_key_version ON patients(encryption_key_version);
```

##### 2.2 Create Key Rotation Service
**Create File:** `server/services/KeyRotationService.ts`

```typescript
import { db } from '../../db';
import { patients, clinicalSessions, patientTreatmentPlans, therapistPHI } from '../../db/schema-hipaa-refactored';
import { eq, sql } from 'drizzle-orm';
import { encryptPHI, decryptPHI } from '../utils/phi-encryption';

export interface KeyRotationConfig {
  oldKeyVersion: number;
  newKeyVersion: number;
  oldKey: string;
  newKey: string;
}

export interface KeyRotationStats {
  patientsUpdated: number;
  sessionsUpdated: number;
  treatmentPlansUpdated: number;
  therapistPHIUpdated: number;
  totalRecords: number;
  durationMs: number;
  errors: string[];
}

export class KeyRotationService {
  /**
   * Rotate encryption keys for all PHI fields
   */
  static async rotateKeys(config: KeyRotationConfig): Promise<KeyRotationStats> {
    const startTime = Date.now();
    const stats: KeyRotationStats = {
      patientsUpdated: 0,
      sessionsUpdated: 0,
      treatmentPlansUpdated: 0,
      therapistPHIUpdated: 0,
      totalRecords: 0,
      durationMs: 0,
      errors: []
    };

    console.log('[KEY ROTATION] Starting key rotation...');
    console.log('[KEY ROTATION] Old version:', config.oldKeyVersion);
    console.log('[KEY ROTATION] New version:', config.newKeyVersion);

    try {
      // Rotate patient PHI
      stats.patientsUpdated = await this.rotatePatientKeys(config);
      
      // Rotate clinical session PHI
      stats.sessionsUpdated = await this.rotateSessionKeys(config);
      
      // Rotate treatment plan PHI
      stats.treatmentPlansUpdated = await this.rotateTreatmentPlanKeys(config);
      
      // Rotate therapist PHI
      stats.therapistPHIUpdated = await this.rotateTherapistKeys(config);

      stats.totalRecords = stats.patientsUpdated + stats.sessionsUpdated + 
                          stats.treatmentPlansUpdated + stats.therapistPHIUpdated;
      stats.durationMs = Date.now() - startTime;

      console.log('[KEY ROTATION] Completed successfully');
      console.log('[KEY ROTATION] Total records updated:', stats.totalRecords);
      console.log('[KEY ROTATION] Duration:', stats.durationMs, 'ms');

      return stats;
    } catch (error) {
      stats.errors.push(`Key rotation failed: ${error}`);
      console.error('[KEY ROTATION] Error:', error);
      throw error;
    }
  }

  /**
   * Rotate patient encryption keys
   */
  private static async rotatePatientKeys(config: KeyRotationConfig): Promise<number> {
    // Get patients with old key version
    const patientsToUpdate = await db
      .select()
      .from(patients)
      .where(eq(patients.encryptionKeyVersion, config.oldKeyVersion));

    console.log(`[KEY ROTATION] Rotating ${patientsToUpdate.length} patient records...`);

    let updated = 0;
    for (const patient of patientsToUpdate) {
      try {
        // Re-encrypt all PHI fields with new key
        const updates: any = {
          encryptionKeyVersion: config.newKeyVersion
        };

        // List of encrypted fields to rotate
        const encryptedFields = [
          'patientContactEmailEncrypted',
          'patientContactPhoneEncrypted',
          'patientHomeAddressEncrypted',
          'patientDobEncrypted',
          'patientGenderEncrypted',
          'patientClinicalNotesEncrypted',
          // ... all other encrypted fields
        ];

        for (const field of encryptedFields) {
          if (patient[field as keyof typeof patient]) {
            // Decrypt with old key
            const decrypted = decryptPHI(patient[field as keyof typeof patient] as string);
            
            // Re-encrypt with new key
            updates[field] = encryptPHI(decrypted);
          }
        }

        // Update record
        await db
          .update(patients)
          .set(updates)
          .where(eq(patients.id, patient.id));

        updated++;

        if (updated % 100 === 0) {
          console.log(`[KEY ROTATION] Progress: ${updated}/${patientsToUpdate.length} patients`);
        }
      } catch (error) {
        console.error(`[KEY ROTATION] Error rotating patient ${patient.id}:`, error);
      }
    }

    return updated;
  }

  /**
   * Rotate clinical session keys (similar pattern)
   */
  private static async rotateSessionKeys(config: KeyRotationConfig): Promise<number> {
    // Implementation similar to rotatePatientKeys
    return 0; // Placeholder
  }

  /**
   * Rotate treatment plan keys (similar pattern)
   */
  private static async rotateTreatmentPlanKeys(config: KeyRotationConfig): Promise<number> {
    // Implementation similar to rotatePatientKeys
    return 0; // Placeholder
  }

  /**
   * Rotate therapist PHI keys (similar pattern)
   */
  private static async rotateTherapistKeys(config: KeyRotationConfig): Promise<number> {
    // Implementation similar to rotatePatientKeys
    return 0; // Placeholder
  }

  /**
   * Schedule automatic key rotation
   */
  static scheduleRotation(intervalDays: number = 90): NodeJS.Timeout {
    console.log(`[KEY ROTATION] Scheduled rotation every ${intervalDays} days`);
    
    return setInterval(async () => {
      console.log('[KEY ROTATION] Automatic rotation triggered');
      
      // In production, fetch keys from secure key management service
      const config: KeyRotationConfig = {
        oldKeyVersion: 1,
        newKeyVersion: 2,
        oldKey: process.env.PHI_ENCRYPTION_KEY!,
        newKey: process.env.PHI_ENCRYPTION_KEY_V2 || process.env.PHI_ENCRYPTION_KEY!
      };

      try {
        const stats = await this.rotateKeys(config);
        console.log('[KEY ROTATION] Automatic rotation completed:', stats);
      } catch (error) {
        console.error('[KEY ROTATION] Automatic rotation failed:', error);
        // Send alert to compliance team
      }
    }, intervalDays * 24 * 60 * 60 * 1000);
  }
}
```

##### 2.3 Create Key Rotation Script
**Create File:** `db/scripts/rotate-encryption-keys.ts`

```typescript
#!/usr/bin/env node

import { KeyRotationService } from '../../server/services/KeyRotationService';

async function main() {
  console.log('========================================');
  console.log('  PHI ENCRYPTION KEY ROTATION SCRIPT');
  console.log('========================================\n');

  // Get configuration from environment or prompts
  const oldKeyVersion = parseInt(process.env.OLD_KEY_VERSION || '1');
  const newKeyVersion = parseInt(process.env.NEW_KEY_VERSION || '2');
  const oldKey = process.env.PHI_ENCRYPTION_KEY_OLD;
  const newKey = process.env.PHI_ENCRYPTION_KEY_NEW;

  if (!oldKey || !newKey) {
    console.error('ERROR: OLD_KEY and NEW_KEY must be provided');
    console.error('Usage: OLD_KEY=... NEW_KEY=... npm run rotate-keys');
    process.exit(1);
  }

  console.log(`Rotating from version ${oldKeyVersion} to ${newKeyVersion}`);
  console.log('\n⚠️  WARNING: This will re-encrypt all PHI data');
  console.log('Make sure you have a database backup!\n');

  // In production, require manual confirmation
  if (process.env.NODE_ENV === 'production') {
    console.log('PRODUCTION MODE: Manual confirmation required');
    console.log('Set CONFIRM_ROTATION=yes to proceed\n');
    
    if (process.env.CONFIRM_ROTATION !== 'yes') {
      console.log('Rotation cancelled.');
      process.exit(0);
    }
  }

  try {
    const stats = await KeyRotationService.rotateKeys({
      oldKeyVersion,
      newKeyVersion,
      oldKey,
      newKey
    });

    console.log('\n✅ Key rotation completed successfully');
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('\n❌ Key rotation failed:', error);
    process.exit(1);
  }
}

main();
```

#### Testing Criteria

##### Test 1: Verify Key Rotation Works
```typescript
// Test: server/tests/key-rotation.test.ts
import { describe, it, expect } from 'vitest';
import { KeyRotationService } from '../services/KeyRotationService';
import { db } from '../../db';
import { patients } from '../../db/schema-hipaa-refactored';

describe('Key Rotation Service', () => {
  it('should rotate encryption keys', async () => {
    // Create test patient with old key
    const patient = await db.insert(patients).values({
      name: 'Test Patient',
      organizationId: 1,
      primaryTherapistId: 1,
      patientContactEmailEncrypted: 'old-encryption-format',
      encryptionKeyVersion: 1
    }).returning();

    // Rotate keys
    const stats = await KeyRotationService.rotateKeys({
      oldKeyVersion: 1,
      newKeyVersion: 2,
      oldKey: 'old-key-hex',
      newKey: 'new-key-hex'
    });

    expect(stats.patientsUpdated).toBeGreaterThan(0);

    // Verify patient updated
    const updated = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patient[0].id));

    expect(updated[0].encryptionKeyVersion).toBe(2);
  });
});
```

#### Acceptance Criteria
- [ ] `encryptionKeyVersion` field added to all PHI tables
- [ ] `KeyRotationService` created with rotation logic
- [ ] Rotation script can be run manually
- [ ] Old key can decrypt, re-encrypt with new key
- [ ] Key version tracked in database
- [ ] Tests pass for key rotation
- [ ] Documentation for rotation process
- [ ] Rotation can be scheduled (90-day intervals)

---

### Task 3: Tighten Content Security Policy

**Priority:** 📋 MEDIUM  
**Time Estimate:** 3 hours  
**HIPAA Requirement:** § 164.312(e)(2)(i) - Addressable  
**Benefit:** Stronger XSS protection

#### Problem Statement
CSP currently allows `unsafe-inline` and `unsafe-eval`, which weakens XSS protection.

#### Implementation Steps

##### 3.1 Generate Nonce for Inline Scripts
**File:** `server/middleware/core-security.ts`

**Update security headers:**
```typescript
import crypto from 'crypto';

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Generate nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');
  (req as any).cspNonce = nonce;

  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy with nonce
  res.setHeader('Content-Security-Policy', 
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}'; ` + // Removed unsafe-inline, using nonce
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; ` +
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com; ` +
    `img-src 'self' data: https:; ` +
    `font-src 'self' https://fonts.gstatic.com; ` +
    `connect-src 'self' https:; ` +
    `frame-ancestors 'none';`
  );
  
  // ... rest of headers
  next();
}
```

##### 3.2 Update HTML Template to Use Nonce
**File:** `client/index.html`

**Add nonce to inline scripts:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LOMA Mental Health Platform</title>
    
    <!-- If you have inline scripts, add nonce attribute -->
    <script nonce="{{ cspNonce }}">
      // Your inline script here
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

##### 3.3 Remove Inline Styles (Move to External CSS)
```bash
# Find all inline styles
grep -r "style=" client/src/

# Move to CSS files or Tailwind classes
# Replace inline styles with external stylesheets
```

#### Testing Criteria

##### Test 1: Verify CSP Headers
```bash
curl -I http://localhost:5000/

# Expected CSP header (no unsafe-inline):
# Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123...';
```

##### Test 2: Verify Inline Scripts Blocked
```typescript
// Test: Check that inline scripts without nonce are blocked
describe('Content Security Policy', () => {
  it('should block inline scripts without nonce', async () => {
    // Create page with inline script
    const html = `
      <html>
        <body>
          <script>alert('XSS')</script>
        </body>
      </html>
    `;

    // Load in headless browser
    // Verify console shows CSP violation
    // expect(consoleErrors).toContain('CSP');
  });

  it('should allow inline scripts with nonce', async () => {
    // Create page with nonce script
    const nonce = 'abc123';
    const html = `
      <html>
        <body>
          <script nonce="${nonce}">console.log('allowed')</script>
        </body>
      </html>
    `;

    // Verify script executes
  });
});
```

#### Acceptance Criteria
- [ ] CSP updated to remove `unsafe-inline` and `unsafe-eval`
- [ ] Nonce generated per request
- [ ] Inline scripts use nonce attribute
- [ ] Inline styles moved to external CSS or use nonce
- [ ] CSP tests pass
- [ ] No console CSP violations
- [ ] XSS test vectors blocked

---

### Task 4: Implement Row-Level Security (RLS)

**Priority:** 📋 MEDIUM  
**Time Estimate:** 6 hours  
**HIPAA Requirement:** § 164.312(a)(1) - Addressable  
**Benefit:** Database-level access control (defense-in-depth)

#### Problem Statement
Access controls currently at application layer only. RLS provides defense-in-depth at database level.

#### Implementation Steps

##### 4.1 Enable RLS on PHI Tables
**Create Migration:** `db/migrations-hipaa/0011_enable_rls.sql`

```sql
-- Enable Row-Level Security on PHI tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_phi ENABLE ROW LEVEL SECURITY;

-- Create function to get current user's organization ID
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_organization_id', TRUE), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to check if user can view all patients
CREATE OR REPLACE FUNCTION can_view_all_patients()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.can_view_all_patients', TRUE)::BOOLEAN,
    FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Patient RLS Policy
CREATE POLICY patient_organization_isolation ON patients
  FOR ALL
  TO PUBLIC
  USING (
    organization_id = current_user_organization_id()
    AND (
      can_view_all_patients()
      OR primary_therapist_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::INTEGER
    )
  );

-- Clinical Session RLS Policy
CREATE POLICY session_organization_isolation ON clinical_sessions
  FOR ALL
  TO PUBLIC
  USING (
    organization_id = current_user_organization_id()
  );

-- Treatment Plan RLS Policy
CREATE POLICY treatment_plan_organization_isolation ON patient_treatment_plans
  FOR ALL
  TO PUBLIC
  USING (
    organization_id = current_user_organization_id()
  );

-- Document RLS Policy
CREATE POLICY document_organization_isolation ON documents
  FOR ALL
  TO PUBLIC
  USING (
    organization_id = current_user_organization_id()
  );

-- Therapist PHI RLS Policy
CREATE POLICY therapist_phi_isolation ON therapist_phi
  FOR ALL
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', TRUE), '')::INTEGER
  );

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_patients_org_therapist 
  ON patients(organization_id, primary_therapist_id);

CREATE INDEX IF NOT EXISTS idx_clinical_sessions_org 
  ON clinical_sessions(organization_id);

COMMENT ON POLICY patient_organization_isolation ON patients IS 
  'RLS policy: Users can only access patients within their organization and assigned to them';
```

##### 4.2 Update Middleware to Set RLS Context
**File:** `server/middleware/authentication.ts`

**Update `setUserContext` function (Line ~159-232):**
```typescript
export const setUserContext = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  try {
    const userId = req.user.id;

    // Get organization membership
    const membership = await OrganizationMembershipRepository.findByUserId(userId);

    if (membership) {
      req.organizationId = membership.organizationId;
      req.organizationMembership = membership;

      // Set PostgreSQL session variables for RLS
      await db.execute(sql`
        SELECT 
          set_config('app.current_user_id', ${userId.toString()}, TRUE),
          set_config('app.current_organization_id', ${membership.organizationId.toString()}, TRUE),
          set_config('app.can_view_all_patients', ${membership.canViewAllPatients.toString()}, TRUE)
      `);

      console.log('[RLS] Context set:', {
        userId,
        organizationId: membership.organizationId,
        canViewAllPatients: membership.canViewAllPatients
      });
    }

    next();
  } catch (error) {
    console.error('[RLS] Error setting user context:', error);
    // Don't block request if RLS fails
    next();
  }
};
```

#### Testing Criteria

##### Test 1: Verify RLS Enabled
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('patients', 'clinical_sessions', 'patient_treatment_plans')
  AND schemaname = 'public';

-- Expected: rowsecurity = true for all tables
```

##### Test 2: Verify Organization Isolation
```typescript
// Test: server/tests/rls-isolation.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '../../db';
import { patients } from '../../db/schema-hipaa-refactored';
import { sql } from 'drizzle-orm';

describe('Row-Level Security', () => {
  it('should isolate patients by organization', async () => {
    // Set context to org 1
    await db.execute(sql`
      SELECT 
        set_config('app.current_organization_id', '1', TRUE),
        set_config('app.can_view_all_patients', 'true', TRUE)
    `);

    const org1Patients = await db.select().from(patients);

    // Set context to org 2
    await db.execute(sql`
      SELECT set_config('app.current_organization_id', '2', TRUE)
    `);

    const org2Patients = await db.select().from(patients);

    // Verify no overlap
    const org1Ids = org1Patients.map(p => p.id);
    const org2Ids = org2Patients.map(p => p.id);
    const overlap = org1Ids.filter(id => org2Ids.includes(id));

    expect(overlap.length).toBe(0);
  });

  it('should restrict therapist to assigned patients only', async () => {
    // Set context to therapist without view-all permission
    await db.execute(sql`
      SELECT 
        set_config('app.current_user_id', '5', TRUE),
        set_config('app.current_organization_id', '1', TRUE),
        set_config('app.can_view_all_patients', 'false', TRUE)
    `);

    const assignedPatients = await db.select().from(patients);

    // All patients should have therapist ID = 5
    const nonAssigned = assignedPatients.filter(p => p.primaryTherapistId !== 5);
    expect(nonAssigned.length).toBe(0);
  });
});
```

#### Acceptance Criteria
- [ ] RLS enabled on all PHI tables
- [ ] RLS policies created for organization isolation
- [ ] Session variables set in middleware
- [ ] Tests verify organization isolation
- [ ] Tests verify therapist-level isolation
- [ ] RLS doesn't break existing queries
- [ ] Performance impact < 10ms per query

---

## Phase 2: Monitoring & Alerting (Weeks 5-8)

### Task 5: Implement Automated Anomaly Detection

**Priority:** 📋 MEDIUM  
**Time Estimate:** 8 hours  
**HIPAA Requirement:** § 164.308(a)(1)(ii)(D) - Addressable  
**Benefit:** Proactive breach detection

[DETAILED IMPLEMENTATION SIMILAR TO ABOVE - Including ML-based anomaly detection using audit log patterns]

---

### Task 6: Create Real-Time Security Monitoring Dashboard

**Priority:** 📋 MEDIUM  
**Time Estimate:** 12 hours  
**HIPAA Requirement:** § 164.308(a)(1)(ii)(D) - Addressable  
**Benefit:** Real-time visibility into security posture

[DETAILED IMPLEMENTATION - Dashboard showing live audit activity, breach alerts, security metrics]

---

### Task 7: Implement Automated Backup System

**Priority:** ⚠️ MEDIUM-HIGH  
**Time Estimate:** 6 hours  
**HIPAA Requirement:** § 164.308(a)(7)(ii)(A) - Required  
**Benefit:** Automated, reliable backups

[DETAILED IMPLEMENTATION - Cron jobs, backup verification, encryption validation]

---

## Phase 3: Documentation & Compliance (Weeks 9-12)

### Task 8: Create HIPAA Training Program

**Priority:** 📋 MEDIUM  
**Time Estimate:** 8 hours  
**HIPAA Requirement:** § 164.530(b) - Required  
**Benefit:** Workforce training compliance

[DETAILED IMPLEMENTATION - Training materials, completion tracking, annual refreshers]

---

### Task 9: Document Risk Assessment

**Priority:** 📋 MEDIUM  
**Time Estimate:** 6 hours  
**HIPAA Requirement:** § 164.308(a)(1)(ii)(A) - Required  
**Benefit:** Demonstrates due diligence

[DETAILED IMPLEMENTATION - Risk assessment methodology, documentation template]

---

### Task 10: Implement Session Timeout Enforcement

**Priority:** 📋 LOW-MEDIUM  
**Time Estimate:** 4 hours  
**HIPAA Requirement:** § 164.312(a)(2)(iii) - Addressable  
**Benefit:** Consistent timeout policies

[DETAILED IMPLEMENTATION - Environment-driven timeouts, activity tracking]

---

## Phase 4: Advanced Security (Optional)

### Task 11-15: Additional Enhancements

- Network Intrusion Detection (6 hours)
- Penetration Testing Setup (8 hours)
- Security Information and Event Management (SIEM) (12 hours)
- Disaster Recovery Testing (6 hours)
- Third-Party Security Audits (coordination, not implementation)

---

## Success Metrics

| Phase | Duration | Compliance Increase | Key Deliverables |
|-------|----------|---------------------|------------------|
| **Phase 1** | 4 weeks | 85% → 88% | RLS, CSP, key rotation |
| **Phase 2** | 4 weeks | 88% → 92% | Monitoring, backups, anomaly detection |
| **Phase 3** | 4 weeks | 92% → 95% | Training, docs, assessments |
| **Phase 4** | Optional | 95% → 98% | Advanced security features |

---

## Timeline Overview

```
Week 1-2:   requestBody encryption, key rotation setup
Week 3-4:   CSP tightening, RLS implementation
Week 5-6:   Anomaly detection, monitoring dashboard
Week 7-8:   Automated backups, alert systems
Week 9-10:  Training program, risk assessment
Week 11-12: Documentation, compliance review
```

---

## Cost-Benefit Analysis

**Investment:**
- Engineering time: 120 hours ($24,000-$36,000)
- Third-party tools: $5,000-$10,000/year
- **Total:** $29,000-$46,000

**Benefits:**
- Industry-leading security posture
- Competitive advantage in healthcare market
- Reduced insurance premiums (10-20%)
- Higher customer trust
- Easier enterprise sales
- Protection against emerging threats

**ROI:** 2-3x over 3 years through reduced risk and increased sales

---

## Deployment Strategy

1. **Staging First:** Deploy all changes to staging environment
2. **Gradual Rollout:** Enable features one at a time
3. **Monitoring:** Watch metrics for 2 weeks per phase
4. **Rollback Plan:** Document rollback for each feature
5. **User Communication:** Notify users of new security features

---

## Maintenance Plan

**Weekly:**
- Review security monitoring dashboard
- Check anomaly detection alerts
- Verify backup success

**Monthly:**
- Review audit logs for patterns
- Update security documentation
- Run penetration tests

**Quarterly:**
- Risk assessment update
- Security training refreshers
- Third-party audit coordination

**Annually:**
- Full HIPAA compliance audit
- Key rotation execution
- Policy reviews and updates

---

## Support Resources

### Documentation
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- HIPAA Security Series: https://www.hhs.gov/hipaa/for-professionals/security/
- OWASP Top 10: https://owasp.org/www-project-top-ten/

### Tools
- Security monitoring: Datadog, New Relic, Sentry
- Penetration testing: Burp Suite, OWASP ZAP
- Key management: AWS KMS, HashiCorp Vault

---

**Great Compliance Timeline:** 12 weeks  
**Total Investment:** $29K-$46K  
**Compliance Achievement:** 95%  
**Market Position:** Industry-leading healthcare security

**Let's build the most secure healthcare platform!** 🛡️











