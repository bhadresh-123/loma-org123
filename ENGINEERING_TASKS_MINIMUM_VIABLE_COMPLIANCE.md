# Engineering Tasks: Minimum Viable HIPAA Compliance
## Sprint Goal: Achieve 85% HIPAA Compliance in 3 Days

**Priority:** 🔴 CRITICAL  
**Timeline:** 3 days (24 working hours)  
**Team Size:** 1-2 engineers  
**Prerequisites:** Access to production environment variables, vendor dashboards

---

## Sprint Overview

| Metric | Target |
|--------|--------|
| Current Compliance | 72% |
| Target Compliance | 85% |
| Tasks | 9 critical fixes |
| Total Hours | 22 hours |
| OCR Fine Risk Reduction | $400K → $50K |

---

## Task 1: Wire PHI Audit Middleware to All Routes

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 6 hours  
**HIPAA Requirement:** § 164.312(b) - Audit Controls  
**OCR Fine Avoidance:** $100,000

### Problem Statement
Audit logging middleware exists (`server/middleware/audit-logging.ts`) but is NOT wired to any PHI routes. This means NO PHI access is being logged, which is a hard HIPAA violation.

### Implementation Steps

#### 1.1 Update Patients Routes
**File:** `server/routes/patients.ts`

**Current Code (Line ~85-140):**
```typescript
// GET /api/patients/:id - Get single patient
router.get('/:id', authenticateToken, async (req, res) => {
  // ... handler code
});

// PUT /api/patients/:id - Update patient
router.put('/:id', authenticateToken, async (req, res) => {
  // ... handler code
});

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
  // ... handler code
});
```

**Updated Code:**
```typescript
import { auditMiddleware } from '../middleware/audit-logging';

// GET /api/patients/:id - Get single patient
router.get('/:id', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { 
    trackFields: true,
    requireAuthorization: true 
  }),
  async (req, res) => {
    // ... handler code
  }
);

// PUT /api/patients/:id - Update patient
router.put('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('UPDATE', 'PATIENT', { 
    trackFields: true,
    requireAuthorization: true 
  }),
  async (req, res) => {
    // ... handler code
  }
);

// DELETE /api/patients/:id - Delete patient
router.delete('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('DELETE', 'PATIENT', { 
    trackFields: true,
    requireAuthorization: true 
  }),
  async (req, res) => {
    // ... handler code
  }
);

// POST /api/patients - Create patient
router.post('/',
  authenticateToken,
  auditMiddleware.auditPHIAccess('CREATE', 'PATIENT', { 
    trackFields: true,
    requireAuthorization: true 
  }),
  async (req, res) => {
    // ... handler code
  }
);

// GET /api/patients - List patients
router.get('/',
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'PATIENT', { 
    trackFields: true,
    requireAuthorization: true 
  }),
  async (req, res) => {
    // ... handler code
  }
);
```

#### 1.2 Update Clinical Sessions Routes
**File:** `server/routes/clinical-sessions.ts`

**Add to all routes:**
```typescript
import { auditMiddleware } from '../middleware/audit-logging';

// GET /api/clinical-sessions/:id
router.get('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'CLINICAL_SESSION', { trackFields: true }),
  handler
);

// PUT /api/clinical-sessions/:id
router.put('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('UPDATE', 'CLINICAL_SESSION', { trackFields: true }),
  handler
);

// POST /api/clinical-sessions
router.post('/',
  authenticateToken,
  auditMiddleware.auditPHIAccess('CREATE', 'CLINICAL_SESSION', { trackFields: true }),
  handler
);

// DELETE /api/clinical-sessions/:id
router.delete('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('DELETE', 'CLINICAL_SESSION', { trackFields: true }),
  handler
);
```

#### 1.3 Update Treatment Plans Routes
**File:** `server/routes/patient-treatment-plans.ts`

**Add to all routes:**
```typescript
import { auditMiddleware } from '../middleware/audit-logging';

// All CRUD operations
router.get('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'TREATMENT_PLAN', { trackFields: true }),
  handler
);

router.put('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('UPDATE', 'TREATMENT_PLAN', { trackFields: true }),
  handler
);

router.post('/',
  authenticateToken,
  auditMiddleware.auditPHIAccess('CREATE', 'TREATMENT_PLAN', { trackFields: true }),
  handler
);

router.delete('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('DELETE', 'TREATMENT_PLAN', { trackFields: true }),
  handler
);
```

#### 1.4 Update Documents Routes
**File:** `server/routes/documents.ts`

**Add to all routes:**
```typescript
import { auditMiddleware } from '../middleware/audit-logging';

// Document routes
router.get('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true }),
  handler
);

router.put('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('UPDATE', 'DOCUMENT', { trackFields: true }),
  handler
);

router.post('/',
  authenticateToken,
  auditMiddleware.auditPHIAccess('CREATE', 'DOCUMENT', { trackFields: true }),
  handler
);

router.delete('/:id',
  authenticateToken,
  auditMiddleware.auditPHIAccess('DELETE', 'DOCUMENT', { trackFields: true }),
  handler
);
```

### Testing Criteria

#### Test 1: Verify Audit Logs Are Created
```bash
# 1. Start the server
npm run dev

# 2. Make a patient GET request
curl -X GET http://localhost:5000/api/patients/1 \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 3. Check database for audit log
psql $DATABASE_URL -c "
  SELECT 
    id, 
    user_id, 
    action, 
    resource_type, 
    resource_id,
    fields_accessed,
    phi_fields_count,
    created_at 
  FROM audit_logs_hipaa 
  WHERE resource_type = 'PATIENT' 
  ORDER BY created_at DESC 
  LIMIT 1;
"

# Expected Output:
# action: 'READ'
# resource_type: 'PATIENT'
# resource_id: 1
# phi_fields_count: > 0
# fields_accessed: array of field names
```

#### Test 2: Verify All PHI Routes Are Audited
```bash
# Run this script to verify all routes
cat > test-audit-coverage.sh << 'EOF'
#!/bin/bash

echo "Testing audit log coverage for PHI routes..."

# Test patients
echo "✓ Testing GET /api/patients/1"
curl -s -X GET http://localhost:5000/api/patients/1 -H "Cookie: auth_token=$TOKEN" > /dev/null

echo "✓ Testing PUT /api/patients/1"
curl -s -X PUT http://localhost:5000/api/patients/1 -H "Cookie: auth_token=$TOKEN" -d '{}' > /dev/null

# Test clinical sessions
echo "✓ Testing GET /api/clinical-sessions/1"
curl -s -X GET http://localhost:5000/api/clinical-sessions/1 -H "Cookie: auth_token=$TOKEN" > /dev/null

# Test treatment plans
echo "✓ Testing GET /api/patient-treatment-plans/1"
curl -s -X GET http://localhost:5000/api/patient-treatment-plans/1 -H "Cookie: auth_token=$TOKEN" > /dev/null

# Test documents
echo "✓ Testing GET /api/documents/1"
curl -s -X GET http://localhost:5000/api/documents/1 -H "Cookie: auth_token=$TOKEN" > /dev/null

# Check audit logs
AUDIT_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM audit_logs_hipaa WHERE created_at > NOW() - INTERVAL '5 minutes';")

echo ""
echo "Audit logs created: $AUDIT_COUNT"
echo "Expected: 5 (one per request)"

if [ "$AUDIT_COUNT" -ge 5 ]; then
  echo "✅ PASS: All routes are being audited"
  exit 0
else
  echo "❌ FAIL: Missing audit logs"
  exit 1
fi
EOF

chmod +x test-audit-coverage.sh
./test-audit-coverage.sh
```

#### Test 3: Verify PHI Field Tracking
```typescript
// Create test file: server/tests/audit-phi-fields.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('PHI Audit Tracking', () => {
  it('should track PHI fields accessed in patient GET', async () => {
    const response = await request(app)
      .get('/api/patients/1')
      .set('Cookie', 'auth_token=TEST_TOKEN')
      .expect(200);

    // Check database for audit log
    const auditLog = await db
      .select()
      .from(auditLogsHIPAA)
      .where(eq(auditLogsHIPAA.resourceType, 'PATIENT'))
      .orderBy(desc(auditLogsHIPAA.createdAt))
      .limit(1);

    expect(auditLog).toBeDefined();
    expect(auditLog.action).toBe('READ');
    expect(auditLog.fieldsAccessed).toBeInstanceOf(Array);
    expect(auditLog.phiFieldsCount).toBeGreaterThan(0);
  });
});
```

### Acceptance Criteria
- [ ] All patient routes (GET, POST, PUT, DELETE) have audit middleware
- [ ] All clinical session routes have audit middleware
- [ ] All treatment plan routes have audit middleware
- [ ] All document routes have audit middleware
- [ ] Test script shows 100% audit coverage
- [ ] Database shows audit logs for all PHI access
- [ ] `fieldsAccessed` array populated with PHI field names
- [ ] `phiFieldsCount` > 0 for PHI access
- [ ] No console errors when accessing PHI routes
- [ ] Audit logs include correlation IDs for request tracing

---

## Task 2: Apply HIPAA Cache Control Headers Globally

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 1 hour  
**HIPAA Requirement:** § 164.312(e)(1) - Transmission Security  
**OCR Fine Avoidance:** $25,000

### Problem Statement
HIPAA cache control headers are defined in `phi-protection.ts` but NOT applied to API routes. This allows PHI to be cached by browsers, proxies, and CDNs.

### Implementation Steps

**File:** `server/index.ts`

**Current Code (Line ~99-102):**
```typescript
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});
```

**Updated Code:**
```typescript
import { phiProtectionMiddleware } from './middleware/phi-protection';

app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Add HIPAA cache control headers to ALL API responses
app.use('/api', phiProtectionMiddleware.hipaaHeaders);
```

### Testing Criteria

#### Test 1: Verify Headers in Response
```bash
# Test any API endpoint
curl -I http://localhost:5000/api/patients/1 \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Expected Headers:
# Cache-Control: no-store, no-cache, must-revalidate, private
# Pragma: no-cache
# Expires: 0
# X-HIPAA-Compliant: true
# X-PHI-Protected: true
```

#### Test 2: Automated Header Validation
```typescript
// Create test: server/tests/hipaa-headers.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('HIPAA Cache Control Headers', () => {
  it('should include HIPAA cache headers on all API routes', async () => {
    const response = await request(app)
      .get('/api/patients')
      .set('Cookie', 'auth_token=TEST_TOKEN');

    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['cache-control']).toContain('no-cache');
    expect(response.headers['pragma']).toBe('no-cache');
    expect(response.headers['expires']).toBe('0');
    expect(response.headers['x-hipaa-compliant']).toBe('true');
  });

  it('should include headers on all PHI endpoints', async () => {
    const endpoints = [
      '/api/patients/1',
      '/api/clinical-sessions/1',
      '/api/patient-treatment-plans/1',
      '/api/documents/1'
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .get(endpoint)
        .set('Cookie', 'auth_token=TEST_TOKEN');

      expect(response.headers['cache-control']).toContain('no-store');
    }
  });
});
```

### Acceptance Criteria
- [ ] All `/api/*` routes return `Cache-Control: no-store, no-cache, must-revalidate, private`
- [ ] All `/api/*` routes return `Pragma: no-cache`
- [ ] All `/api/*` routes return `Expires: 0`
- [ ] All `/api/*` routes return `X-HIPAA-Compliant: true`
- [ ] All `/api/*` routes return `X-PHI-Protected: true`
- [ ] Header tests pass for all PHI endpoints
- [ ] Browser DevTools Network tab shows "Disable cache" for API responses

---

## Task 3: Enable CSRF Protection

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 2 hours  
**HIPAA Requirement:** § 164.312(a)(1) - Access Control  
**OCR Fine Avoidance:** $50,000

### Problem Statement
CSRF protection middleware exists but is not enabled. Cookie-based authentication without CSRF protection allows cross-site request forgery attacks.

### Implementation Steps

#### 3.1 Enable CSRF Middleware
**File:** `server/index.ts`

**Add after cookie parser (Line ~59):**
```typescript
import { coreSecurityMiddleware } from './middleware/core-security';

app.use(cookieParser());

// Generate CSRF token for all sessions
app.use(coreSecurityMiddleware.generateCSRFToken);

// Protect all API routes with CSRF validation (except GET requests)
app.use('/api', coreSecurityMiddleware.csrfProtection);
```

#### 3.2 Update CSRF Middleware to Skip GET Requests
**File:** `server/middleware/core-security.ts`

**Update `csrfProtection` function (Line ~257):**
```typescript
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS requests (read-only)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for health check and webhook endpoints
  if (req.path === '/health' || req.path === '/stripe/webhook') {
    return next();
  }

  // Check for CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = (req.session as any)?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token'
    });
  }

  next();
}
```

#### 3.3 Add CSRF Token Endpoint
**File:** `server/routes/auth.ts`

```typescript
// GET /api/auth/csrf - Get CSRF token
router.get('/csrf', (req, res) => {
  const csrfToken = (req.session as any)?.csrfToken;
  
  if (!csrfToken) {
    return res.status(500).json({ 
      error: 'CSRF token not generated' 
    });
  }

  res.json({ csrfToken });
});
```

#### 3.4 Update Frontend to Include CSRF Token
**File:** `client/src/lib/api.ts`

```typescript
// Fetch CSRF token on app load
let csrfToken: string | null = null;

export async function initializeCSRF() {
  try {
    const response = await fetch('/api/auth/csrf', {
      credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
}

// Update apiRequest to include CSRF token
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for state-changing requests
  if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`/api${endpoint}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // ... rest of function
}
```

**File:** `client/src/main.tsx`

```typescript
import { initializeCSRF } from './lib/api';

// Initialize CSRF before rendering app
initializeCSRF().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
```

### Testing Criteria

#### Test 1: Verify CSRF Token Generation
```bash
# Get CSRF token
curl -c cookies.txt http://localhost:5000/api/auth/csrf

# Expected response:
# { "csrfToken": "abc123..." }
```

#### Test 2: Verify CSRF Protection on POST
```bash
# Try POST without CSRF token (should fail)
curl -X POST http://localhost:5000/api/patients \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient"}'

# Expected: 403 Forbidden
# { "error": "CSRF_TOKEN_INVALID" }

# Try POST with CSRF token (should succeed)
curl -X POST http://localhost:5000/api/patients \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123..." \
  -d '{"name":"Test Patient"}'

# Expected: 201 Created
```

#### Test 3: Verify GET Requests Don't Require CSRF
```bash
# GET should work without CSRF token
curl -X GET http://localhost:5000/api/patients/1 \
  -b cookies.txt

# Expected: 200 OK (no CSRF token needed)
```

#### Test 4: Automated CSRF Tests
```typescript
// Create test: server/tests/csrf-protection.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('CSRF Protection', () => {
  it('should generate CSRF token', async () => {
    const response = await request(app)
      .get('/api/auth/csrf')
      .expect(200);

    expect(response.body.csrfToken).toBeDefined();
    expect(response.body.csrfToken).toHaveLength(64); // SHA-256 hex
  });

  it('should reject POST without CSRF token', async () => {
    const response = await request(app)
      .post('/api/patients')
      .send({ name: 'Test Patient' })
      .expect(403);

    expect(response.body.error).toBe('CSRF_TOKEN_INVALID');
  });

  it('should allow POST with valid CSRF token', async () => {
    const agent = request.agent(app);
    
    // Get CSRF token
    const csrfResponse = await agent.get('/api/auth/csrf');
    const csrfToken = csrfResponse.body.csrfToken;

    // Make POST with CSRF token
    const response = await agent
      .post('/api/patients')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Test Patient' });

    expect(response.status).not.toBe(403);
  });

  it('should allow GET without CSRF token', async () => {
    await request(app)
      .get('/api/patients/1')
      .expect(200);
  });
});
```

### Acceptance Criteria
- [ ] CSRF token generated for all sessions
- [ ] `/api/auth/csrf` endpoint returns token
- [ ] POST/PUT/DELETE requests require CSRF token
- [ ] GET/HEAD/OPTIONS requests don't require CSRF token
- [ ] Frontend includes CSRF token in all state-changing requests
- [ ] CSRF tests pass
- [ ] Health check and webhook endpoints exempt from CSRF
- [ ] 403 error returned for invalid/missing CSRF token

---

## Task 4: Document BAA Status for All Vendors

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 4 hours  
**HIPAA Requirement:** § 164.308(b)(1) - Business Associate Contracts  
**OCR Fine Avoidance:** $250,000

### Problem Statement
No documentation exists for Business Associate Agreements (BAAs) with third-party vendors. HIPAA requires written BAAs with all vendors that handle PHI.

### Implementation Steps

#### 4.1 Create BAA Documentation
**Create File:** `docs/compliance/BUSINESS_ASSOCIATE_AGREEMENTS.md`

```markdown
# Business Associate Agreement Status

Last Updated: [DATE]  
Responsible: [COMPLIANCE OFFICER NAME]  
Next Review: [DATE + 90 DAYS]

## BAA Status Matrix

| Vendor | Service | BAA Required? | Status | Signed Date | Renewal Date | Notes |
|--------|---------|---------------|--------|-------------|--------------|-------|
| Neon Database | PostgreSQL hosting | ✅ YES | ✅ VERIFIED | [DATE] | [DATE] | [Contract #] |
| Render.com | Application hosting | ✅ YES | ✅ VERIFIED | [DATE] | [DATE] | [Contract #] |
| Anthropic | Claude AI API | ✅ YES | ✅ SIGNED | [DATE] | [DATE] | Enterprise tier |
| OpenAI | GPT-4 API | ⚠️ NO BAA | 🔴 DISABLED | N/A | N/A | No HIPAA option |
| Stripe | Payment processing | ⚠️ CONDITIONAL | ❓ REVIEW | [DATE] | [DATE] | Only if PHI in invoices |
| Email Provider | [Gmail/SendGrid] | ✅ YES | ❓ VERIFY | [DATE] | [DATE] | [Contract #] |

## Verification Checklist

### Neon Database
- [ ] Login to Neon dashboard
- [ ] Navigate to Settings → Legal
- [ ] Verify BAA is signed
- [ ] Download copy of BAA
- [ ] Store in `docs/compliance/baas/neon-baa-[DATE].pdf`
- [ ] Confirm renewal date
- [ ] Add to calendar for annual review

### Render.com
- [ ] Login to Render dashboard
- [ ] Check subscription tier (BAA only on Team/Enterprise)
- [ ] Navigate to Account → Legal Documents
- [ ] Verify BAA is signed
- [ ] Download copy of BAA
- [ ] Store in `docs/compliance/baas/render-baa-[DATE].pdf`
- [ ] Confirm renewal date

### Anthropic (Claude AI)
- [ ] Verify enterprise plan (required for BAA)
- [ ] Contact sales@anthropic.com to request BAA
- [ ] Review and sign BAA
- [ ] Store in `docs/compliance/baas/anthropic-baa-[DATE].pdf`
- [ ] Confirm PHI anonymization is still applied before API calls

### OpenAI
- [ ] ⚠️ IMMEDIATE ACTION: Disable OpenAI as AI fallback
- [ ] OpenAI does NOT offer HIPAA-compliant API
- [ ] Remove from `server/services/SecureAIService.ts`
- [ ] Update env variables to remove OPENAI_API_KEY requirement
- [ ] Document that only Anthropic should be used

### Stripe
- [ ] Review invoice descriptions and metadata
- [ ] Determine if patient names appear in invoices
- [ ] If YES: Sign Stripe BAA (available for Standard+ plans)
- [ ] If NO: Document that no PHI is sent to Stripe
- [ ] Update invoice generation to use patient IDs instead of names

### Email Provider
- [ ] Determine current email service (Gmail/SendGrid/etc.)
- [ ] Verify HIPAA compliance tier
- [ ] Sign BAA if available
- [ ] If no BAA available: Switch to HIPAA-compliant provider
- [ ] Options: Paubox, SendGrid Enterprise, Amazon SES with BAA

## Action Items

### Immediate (Week 1)
1. [ ] Verify Neon Database BAA
2. [ ] Verify Render.com BAA  
3. [ ] Contact Anthropic sales for BAA
4. [ ] Disable OpenAI integration
5. [ ] Review Stripe invoices for PHI

### Short-term (Week 2-4)
6. [ ] Sign missing BAAs
7. [ ] Store all BAA documents in `docs/compliance/baas/`
8. [ ] Create BAA renewal calendar reminders
9. [ ] Document BAA review process

### Ongoing
10. [ ] Quarterly BAA status review
11. [ ] Update matrix when vendors added
12. [ ] Annual BAA renewal verification

## Vendor Contact Information

| Vendor | Contact Method | Support Email/Phone |
|--------|---------------|---------------------|
| Neon Database | Dashboard support | support@neon.tech |
| Render.com | Dashboard support | support@render.com |
| Anthropic | Email | sales@anthropic.com |
| Stripe | Dashboard | support@stripe.com |

## BAA Renewal Process

1. **90 days before expiration:**
   - [ ] Review BAA status
   - [ ] Contact vendor if renewal needed
   - [ ] Verify service still needed

2. **60 days before expiration:**
   - [ ] Confirm renewal terms
   - [ ] Update BAA documentation

3. **30 days before expiration:**
   - [ ] Sign renewed BAA
   - [ ] Update BAA status matrix
   - [ ] Store new BAA document

4. **On expiration:**
   - [ ] Verify new BAA is active
   - [ ] Update calendar for next renewal

## PHI Data Flow to Vendors

| Vendor | PHI Received | PHI Type | Safeguards |
|--------|--------------|----------|------------|
| Neon Database | Direct storage | All PHI fields | Encrypted at rest, SSL in transit |
| Render.com | Application access | All PHI via app | HTTPS only, no direct DB access |
| Anthropic | API requests | Anonymized context | PHI anonymization before sending |
| Stripe | Invoices | Patient names (conditional) | Use patient IDs only |
| Email | Notifications | Appointment reminders | No clinical details |

## Compliance Notes

- **HIPAA Requirement:** § 164.308(b)(1)
- **OCR Guidance:** Business associates must sign BAAs before receiving PHI
- **Fine Range:** $100-$50,000 per violation
- **Documentation Required:** Signed BAAs, renewal tracking, vendor audit rights

## Audit Trail

| Date | Action | Performed By | Notes |
|------|--------|--------------|-------|
| [DATE] | Created BAA documentation | [NAME] | Initial documentation |
| [DATE] | Verified Neon BAA | [NAME] | BAA confirmed active |
| [DATE] | Disabled OpenAI | [NAME] | No HIPAA compliance available |

```

#### 4.2 Create BAA Storage Directory
```bash
mkdir -p docs/compliance/baas
touch docs/compliance/baas/.gitkeep
echo "# BAA Documents

Store signed BAA documents in this directory:
- neon-baa-[DATE].pdf
- render-baa-[DATE].pdf
- anthropic-baa-[DATE].pdf
- stripe-baa-[DATE].pdf
- email-provider-baa-[DATE].pdf

⚠️ WARNING: Add this directory to .gitignore if BAAs contain sensitive business terms.
" > docs/compliance/baas/README.md
```

#### 4.3 Disable OpenAI Integration
**File:** `server/services/SecureAIService.ts`

**Find and comment out OpenAI fallback:**
```typescript
// HIPAA COMPLIANCE: OpenAI does not offer HIPAA-compliant API
// Fallback disabled until BAA is available
/*
async generateWithFallback(prompt: string) {
  try {
    return await this.anthropicService.generate(prompt);
  } catch (error) {
    // DISABLED: OpenAI fallback
    // return await this.openaiService.generate(prompt);
    throw new Error('AI service unavailable. Only HIPAA-compliant Anthropic is enabled.');
  }
}
*/
```

### Testing Criteria

#### Test 1: Verify BAA Documentation Complete
```bash
# Check documentation exists
test -f docs/compliance/BUSINESS_ASSOCIATE_AGREEMENTS.md
echo "✅ BAA documentation exists"

# Check BAA directory exists
test -d docs/compliance/baas
echo "✅ BAA storage directory exists"

# Verify all vendors documented
grep -q "Neon Database" docs/compliance/BUSINESS_ASSOCIATE_AGREEMENTS.md
grep -q "Render.com" docs/compliance/BUSINESS_ASSOCIATE_AGREEMENTS.md
grep -q "Anthropic" docs/compliance/BUSINESS_ASSOCIATE_AGREEMENTS.md
grep -q "OpenAI" docs/compliance/BUSINESS_ASSOCIATE_AGREEMENTS.md
echo "✅ All vendors documented"
```

#### Test 2: Verify OpenAI Disabled
```bash
# Check OpenAI is not used in production
grep -r "openai" server/services/ | grep -v "// DISABLED"
# Should return no results or only commented code

# Verify env variable removed
grep "OPENAI_API_KEY" env.production
# Should be commented out or removed
```

#### Test 3: Manual Vendor Verification
```markdown
## Manual Verification Checklist

### Neon Database
- [ ] Logged into dashboard at https://console.neon.tech
- [ ] Navigated to Settings → Legal
- [ ] Found BAA document (signed: _____)
- [ ] Downloaded PDF to docs/compliance/baas/
- [ ] Updated status matrix: [VERIFIED/NOT FOUND]

### Render.com
- [ ] Logged into dashboard at https://dashboard.render.com
- [ ] Checked account tier: [FREE/STARTER/TEAM/ENTERPRISE]
- [ ] Navigated to Account Settings
- [ ] Found BAA document (signed: _____)
- [ ] Downloaded PDF to docs/compliance/baas/
- [ ] Updated status matrix: [VERIFIED/NOT FOUND]

### Anthropic
- [ ] Checked current plan at https://console.anthropic.com
- [ ] Contacted sales@anthropic.com for BAA
- [ ] Status: [PENDING/SIGNED/NOT AVAILABLE]

### Stripe
- [ ] Reviewed last 10 invoices in dashboard
- [ ] Patient names in invoices? [YES/NO]
- [ ] If YES: Signed Stripe BAA? [YES/NO]
- [ ] If NO: Documented PHI-free invoicing

### Email Provider
- [ ] Current provider: ___________
- [ ] HIPAA tier? [YES/NO]
- [ ] BAA signed? [YES/NO]
- [ ] Action needed: [SIGN BAA/SWITCH PROVIDER/NONE]
```

### Acceptance Criteria
- [ ] `BUSINESS_ASSOCIATE_AGREEMENTS.md` created with complete matrix
- [ ] All vendors listed with status (verified/pending/not required)
- [ ] `docs/compliance/baas/` directory created for BAA storage
- [ ] OpenAI integration disabled (no HIPAA compliance)
- [ ] Manual verification checklist completed
- [ ] Calendar reminders set for BAA renewals
- [ ] Vendor contact information documented
- [ ] PHI data flow to each vendor documented
- [ ] Audit trail started with initial actions

---

## Task 5: Remove localStorage Auth Token

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 1 hour  
**HIPAA Requirement:** § 164.312(a)(2)(iv) - Encryption and Decryption  
**OCR Fine Avoidance:** $25,000

### Problem Statement
Auth token stored in localStorage is vulnerable to XSS attacks. HttpOnly cookies provide better security.

### Implementation Steps

#### 5.1 Remove localStorage Usage
**File:** `client/src/pages/DocumentUpload.tsx`

**Current Code (Line ~105):**
```typescript
const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem('token')}`
};
```

**Updated Code:**
```typescript
// Remove Authorization header entirely
// Auth token will come from HttpOnly cookie automatically
const headers = {
  "Content-Type": "application/json"
};

// In fetch call, ensure credentials: 'include'
fetch('/api/documents/upload', {
  method: 'POST',
  headers,
  credentials: 'include', // Sends HttpOnly cookie
  body: JSON.stringify(data)
});
```

#### 5.2 Verify No Other localStorage Usage
```bash
# Search for any localStorage auth usage
grep -r "localStorage.getItem.*token" client/src/
grep -r "localStorage.setItem.*token" client/src/

# If found, replace with cookie-based auth
```

#### 5.3 Update File Upload Logic
**File:** `client/src/components/FileUpload.tsx` (if exists)

```typescript
// Ensure all file uploads use credentials: 'include'
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include', // Use HttpOnly cookie
    body: formData
    // DO NOT include Authorization header
  });

  return response.json();
};
```

### Testing Criteria

#### Test 1: Verify No localStorage Usage
```bash
# Should return no results:
grep -r "localStorage.*token" client/src/ | grep -v "test" | grep -v "node_modules"
```

#### Test 2: Verify File Upload Works with Cookies
```typescript
// Test file upload authentication
describe('File Upload Auth', () => {
  it('should authenticate via cookie, not localStorage', async () => {
    // Clear localStorage
    localStorage.clear();

    // Login (sets HttpOnly cookie)
    await login('testuser', 'password');

    // Upload file (should work with cookie)
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const response = await uploadFile(file);

    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
  });

  it('should fail without cookie', async () => {
    // Clear all auth
    await logout();

    // Try upload without auth
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    try {
      await uploadFile(file);
      fail('Should have thrown error');
    } catch (error) {
      expect(error.message).toContain('authenticated');
    }
  });
});
```

#### Test 3: Manual Browser Test
```markdown
## Manual Testing Steps

1. Open browser DevTools
2. Go to Application → Local Storage
3. Clear all localStorage items
4. Login to application
5. Navigate to document upload page
6. Upload a document
7. Verify:
   - [ ] Upload succeeds
   - [ ] No token in localStorage
   - [ ] Cookie 'auth_token' exists (check Application → Cookies)
   - [ ] Cookie is HttpOnly (cannot access via JS)
```

### Acceptance Criteria
- [ ] No `localStorage.getItem('token')` in codebase
- [ ] No `localStorage.setItem('token')` in codebase
- [ ] File uploads work with HttpOnly cookies only
- [ ] Search for localStorage auth usage returns no results
- [ ] Browser test confirms no localStorage token
- [ ] Auth cookie is HttpOnly and Secure in production
- [ ] All authenticated requests use `credentials: 'include'`

---

## Task 6: Create Breach Detection Service

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 4 hours  
**HIPAA Requirement:** § 164.404 - Breach Notification  
**OCR Fine Avoidance:** $100,000

### Problem Statement
No system exists to detect potential PHI breaches. HIPAA requires breach notification within 60 days of discovery.

### Implementation Steps

#### 6.1 Create Breach Detection Service
**Create File:** `server/services/BreachDetectionService.ts`

```typescript
import { db } from '../../db';
import { auditLogsHIPAA } from '../../db/schema-hipaa-refactored';
import { sql, gt, and, desc } from 'drizzle-orm';

export interface BreachAlert {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  description: string;
  affectedUsers: number[];
  affectedRecords: number;
  detectedAt: Date;
  mustNotifyBy: Date; // 60 days from detection
  evidence: any;
}

export interface BreachPattern {
  name: string;
  description: string;
  query: () => Promise<any[]>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class BreachDetectionService {
  private static readonly NOTIFICATION_DEADLINE_DAYS = 60;

  /**
   * Patterns that indicate potential breach
   */
  private static readonly BREACH_PATTERNS: BreachPattern[] = [
    {
      name: 'MASS_PHI_ACCESS',
      description: 'User accessed >100 patient records in 1 hour',
      severity: 'HIGH',
      query: async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        return await db
          .select({
            userId: auditLogsHIPAA.userId,
            count: sql<number>`COUNT(DISTINCT ${auditLogsHIPAA.resourceId})`,
            firstAccess: sql<Date>`MIN(${auditLogsHIPAA.createdAt})`,
            lastAccess: sql<Date>`MAX(${auditLogsHIPAA.createdAt})`
          })
          .from(auditLogsHIPAA)
          .where(
            and(
              gt(auditLogsHIPAA.createdAt, oneHourAgo),
              sql`${auditLogsHIPAA.resourceType} IN ('PATIENT', 'CLINICAL_SESSION', 'DOCUMENT')`
            )
          )
          .groupBy(auditLogsHIPAA.userId)
          .having(sql`COUNT(DISTINCT ${auditLogsHIPAA.resourceId}) > 100`);
      }
    },
    {
      name: 'FAILED_AUTH_SPIKE',
      description: '>10 failed login attempts in 5 minutes',
      severity: 'MEDIUM',
      query: async () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        return await db
          .select({
            ipAddress: auditLogsHIPAA.ipAddress,
            count: sql<number>`COUNT(*)`,
            firstAttempt: sql<Date>`MIN(${auditLogsHIPAA.createdAt})`
          })
          .from(auditLogsHIPAA)
          .where(
            and(
              gt(auditLogsHIPAA.createdAt, fiveMinutesAgo),
              sql`${auditLogsHIPAA.action} = 'FAILED_LOGIN'`
            )
          )
          .groupBy(auditLogsHIPAA.ipAddress)
          .having(sql`COUNT(*) > 10`);
      }
    },
    {
      name: 'AFTER_HOURS_ACCESS',
      description: 'PHI accessed outside 6 AM - 10 PM local time',
      severity: 'LOW',
      query: async () => {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 6 && hour < 22) {
          return []; // Current time is within business hours
        }

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        return await db
          .select({
            userId: auditLogsHIPAA.userId,
            resourceType: auditLogsHIPAA.resourceType,
            resourceId: auditLogsHIPAA.resourceId,
            accessTime: auditLogsHIPAA.createdAt,
            ipAddress: auditLogsHIPAA.ipAddress
          })
          .from(auditLogsHIPAA)
          .where(
            and(
              gt(auditLogsHIPAA.createdAt, thirtyMinutesAgo),
              sql`${auditLogsHIPAA.resourceType} IN ('PATIENT', 'CLINICAL_SESSION', 'DOCUMENT')`
            )
          )
          .orderBy(desc(auditLogsHIPAA.createdAt))
          .limit(100);
      }
    },
    {
      name: 'ENCRYPTION_FAILURE_SPIKE',
      description: '>5 decryption errors in 10 minutes',
      severity: 'HIGH',
      query: async () => {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        return await db
          .select({
            userId: auditLogsHIPAA.userId,
            count: sql<number>`COUNT(*)`,
            firstError: sql<Date>`MIN(${auditLogsHIPAA.createdAt})`
          })
          .from(auditLogsHIPAA)
          .where(
            and(
              gt(auditLogsHIPAA.createdAt, tenMinutesAgo),
              sql`${auditLogsHIPAA.details}::text LIKE '%decryption%failed%'`
            )
          )
          .groupBy(auditLogsHIPAA.userId)
          .having(sql`COUNT(*) > 5`);
      }
    },
    {
      name: 'GEOGRAPHIC_ANOMALY',
      description: 'User accessed from different state/country within 1 hour',
      severity: 'MEDIUM',
      query: async () => {
        // This would require IP geolocation
        // Placeholder for now
        return [];
      }
    }
  ];

  /**
   * Run all breach detection patterns
   */
  static async detectBreaches(): Promise<BreachAlert[]> {
    const alerts: BreachAlert[] = [];

    for (const pattern of this.BREACH_PATTERNS) {
      try {
        const results = await pattern.query();

        if (results.length > 0) {
          const alert: BreachAlert = {
            severity: pattern.severity,
            type: pattern.name,
            description: pattern.description,
            affectedUsers: results.map((r: any) => r.userId).filter(Boolean),
            affectedRecords: results.length,
            detectedAt: new Date(),
            mustNotifyBy: this.calculateNotificationDeadline(),
            evidence: results
          };

          alerts.push(alert);

          // Log the alert
          console.warn('[BREACH DETECTION]', {
            type: alert.type,
            severity: alert.severity,
            affectedRecords: alert.affectedRecords,
            mustNotifyBy: alert.mustNotifyBy
          });

          // Store breach alert
          await this.storeBreachAlert(alert);
        }
      } catch (error) {
        console.error(`Breach detection error for ${pattern.name}:`, error);
      }
    }

    return alerts;
  }

  /**
   * Calculate 60-day notification deadline
   */
  private static calculateNotificationDeadline(): Date {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + this.NOTIFICATION_DEADLINE_DAYS);
    return deadline;
  }

  /**
   * Store breach alert for investigation
   */
  private static async storeBreachAlert(alert: BreachAlert): Promise<void> {
    // In production, store in dedicated breach_alerts table
    // For now, log to audit system
    await db.insert(auditLogsHIPAA).values({
      userId: null,
      action: 'BREACH_DETECTED',
      resourceType: 'SYSTEM',
      resourceId: null,
      details: JSON.stringify({
        type: alert.type,
        severity: alert.severity,
        description: alert.description,
        affectedRecords: alert.affectedRecords,
        mustNotifyBy: alert.mustNotifyBy,
        evidence: alert.evidence
      }),
      securityLevel: 'phi-protected',
      riskScore: this.calculateRiskScore(alert.severity),
      hipaaCompliant: true,
      createdAt: new Date()
    });
  }

  /**
   * Calculate risk score based on severity
   */
  private static calculateRiskScore(severity: string): number {
    const scores = {
      'LOW': 40,
      'MEDIUM': 60,
      'HIGH': 80,
      'CRITICAL': 100
    };
    return scores[severity as keyof typeof scores] || 50;
  }

  /**
   * Send alerts to compliance team
   */
  static async notifyComplianceTeam(alerts: BreachAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    // In production, send email/SMS to compliance officer
    console.error('[BREACH ALERT] Compliance team notification:', {
      alertCount: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
      highAlerts: alerts.filter(a => a.severity === 'HIGH').length
    });

    // TODO: Implement email notification
    // const emailService = new EmailService();
    // await emailService.sendBreachAlert(alerts);
  }

  /**
   * Start continuous monitoring
   */
  static startMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
    console.log(`[BREACH DETECTION] Starting monitoring (every ${intervalMinutes} minutes)`);

    return setInterval(async () => {
      try {
        const alerts = await this.detectBreaches();
        
        if (alerts.length > 0) {
          await this.notifyComplianceTeam(alerts);
        }
      } catch (error) {
        console.error('[BREACH DETECTION] Monitoring error:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}
```

#### 6.2 Start Breach Monitoring on Server Startup
**File:** `server/index.ts`

**Add after server starts (around line ~750+):**
```typescript
import { BreachDetectionService } from './services/BreachDetectionService';

// Start breach detection monitoring
if (process.env.NODE_ENV === 'production') {
  BreachDetectionService.startMonitoring(5); // Check every 5 minutes
  console.log('✅ Breach detection monitoring started');
} else {
  // Less frequent in development to avoid noise
  BreachDetectionService.startMonitoring(60); // Check every hour
  console.log('✅ Breach detection monitoring started (dev mode)');
}
```

### Testing Criteria

#### Test 1: Verify Service Starts
```bash
# Start server
npm run dev

# Check logs for:
# "✅ Breach detection monitoring started"
```

#### Test 2: Test Mass Access Detection
```typescript
// Create test: server/tests/breach-detection.test.ts
import { describe, it, expect } from 'vitest';
import { BreachDetectionService } from '../services/BreachDetectionService';
import { db } from '../../db';
import { auditLogsHIPAA } from '../../db/schema-hipaa-refactored';

describe('Breach Detection Service', () => {
  it('should detect mass PHI access', async () => {
    // Create 150 audit logs in last hour
    const userId = 1;
    const logs = Array.from({ length: 150 }, (_, i) => ({
      userId,
      action: 'READ',
      resourceType: 'PATIENT',
      resourceId: i + 1,
      createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    }));

    await db.insert(auditLogsHIPAA).values(logs);

    // Run detection
    const alerts = await BreachDetectionService.detectBreaches();

    // Should detect mass access
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('MASS_PHI_ACCESS');
    expect(alerts[0].severity).toBe('HIGH');
  });

  it('should detect failed login spike', async () => {
    // Create 15 failed logins in last 5 minutes
    const ipAddress = '192.168.1.1';
    const logs = Array.from({ length: 15 }, () => ({
      userId: null,
      action: 'FAILED_LOGIN',
      resourceType: 'SYSTEM',
      ipAddress,
      createdAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
    }));

    await db.insert(auditLogsHIPAA).values(logs);

    // Run detection
    const alerts = await BreachDetectionService.detectBreaches();

    // Should detect brute force attempt
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.type === 'FAILED_AUTH_SPIKE')).toBe(true);
  });

  it('should calculate 60-day notification deadline', async () => {
    const alerts = await BreachDetectionService.detectBreaches();
    
    if (alerts.length > 0) {
      const deadline = alerts[0].mustNotifyBy;
      const now = new Date();
      const daysDifference = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDifference).toBe(60);
    }
  });
});
```

#### Test 3: Manual Trigger Test
```bash
# Create manual test script
cat > test-breach-detection.sh << 'EOF'
#!/bin/bash

echo "Testing breach detection..."

# Start server in background
npm run dev &
SERVER_PID=$!
sleep 5

# Make 120 rapid requests to trigger mass access alert
for i in {1..120}; do
  curl -s http://localhost:5000/api/patients/$i \
    -H "Cookie: auth_token=$TOKEN" > /dev/null
done

# Wait for detection cycle
sleep 10

# Check logs for breach detection
echo "Checking for breach detection logs..."
grep "BREACH DETECTION" logs/*.log

# Stop server
kill $SERVER_PID

echo "Test complete"
EOF

chmod +x test-breach-detection.sh
```

### Acceptance Criteria
- [ ] `BreachDetectionService.ts` created with all patterns
- [ ] Service starts on server startup
- [ ] Monitoring runs every 5 minutes (production) or 60 minutes (dev)
- [ ] Mass access pattern (>100 records/hour) detected
- [ ] Failed login spike (>10 attempts/5min) detected
- [ ] After-hours access logged
- [ ] Encryption failure spike detected
- [ ] Alerts stored in audit_logs_hipaa
- [ ] 60-day notification deadline calculated
- [ ] Tests pass for all detection patterns
- [ ] Console logs show monitoring activity

---

## Task 7: Create Breach Response Plan Documentation

**Priority:** 🔴 CRITICAL  
**Time Estimate:** 2 hours  
**HIPAA Requirement:** § 164.404 - Breach Notification  
**OCR Fine Avoidance:** $50,000

### Implementation Steps

#### 7.1 Create Breach Response Plan
**Create File:** `docs/compliance/BREACH_RESPONSE_PLAN.md`

```markdown
# HIPAA Breach Response Plan

**Effective Date:** [DATE]  
**Last Updated:** [DATE]  
**Next Review:** [DATE + 6 MONTHS]  
**Responsible:** [COMPLIANCE OFFICER NAME]  
**Version:** 1.0

## Table of Contents

1. [Overview](#overview)
2. [Breach Definition](#breach-definition)
3. [Response Timeline](#response-timeline)
4. [Response Team](#response-team)
5. [Detection & Assessment](#detection--assessment)
6. [Containment](#containment)
7. [Investigation](#investigation)
8. [Notification Requirements](#notification-requirements)
9. [Documentation](#documentation)
10. [Prevention](#prevention)

---

## Overview

This Breach Response Plan establishes procedures for responding to suspected or confirmed breaches of unsecured Protected Health Information (PHI) in compliance with the HIPAA Breach Notification Rule (45 CFR § 164.404).

**HIPAA Definition of Breach:**
> "Breach means the acquisition, access, use, or disclosure of protected health information in a manner not permitted under the Privacy Rule which compromises the security or privacy of the protected health information."

---

## Breach Definition

### What Constitutes a Breach?

**Reportable Breaches:**
- ✅ Unauthorized access to PHI by employee
- ✅ PHI disclosed to wrong individual
- ✅ Lost/stolen device containing unencrypted PHI
- ✅ Hacking incident exposing PHI
- ✅ PHI sent to wrong email address
- ✅ Improper disposal of PHI records
- ✅ Business associate security incident

**Exceptions (Not Breaches):**
- ❌ Unintentional access by authorized person
- ❌ Inadvertent disclosure to authorized person
- ❌ Good faith belief recipient cannot retain information
- ❌ Encrypted PHI lost (encryption key not compromised)

### Breach Risk Assessment

Use the 4-factor test to determine if breach notification is required:

1. **Nature & Extent:** What PHI was involved?
2. **Unauthorized Person:** Who accessed/received PHI?
3. **PHI Acquired/Viewed:** Was PHI actually viewed?
4. **Mitigation:** Can risk be mitigated?

**Low Risk Example:** Employee accidentally viewed 1 patient record for 2 seconds, immediately closed, no data copied.

**High Risk Example:** Laptop with 500 unencrypted patient records stolen from car.

---

## Response Timeline

### Critical Deadlines

| Timeline | Action | HIPAA Requirement |
|----------|--------|-------------------|
| **Day 0** | Discovery of breach | Start clock |
| **Day 1** | Contain breach, begin investigation | Immediate |
| **Day 5** | Complete investigation, assess scope | Within 5 days |
| **Day 10** | Notify affected individuals (if >50) | As soon as possible |
| **Day 60** | **DEADLINE**: Individual notification complete | § 164.404(b) |
| **Day 60** | **DEADLINE**: Media notice (if >500) | § 164.406(a) |
| **Day 60** | **DEADLINE**: HHS notification (if >500) | § 164.408(a) |
| **Annual** | HHS notification (if <500) | § 164.408(b) |

**⚠️ CRITICAL:** The 60-day clock starts at DISCOVERY, not when breach occurred.

---

## Response Team

### Breach Response Team

| Role | Name | Contact | Responsibilities |
|------|------|---------|------------------|
| **Breach Coordinator** | [NAME] | [EMAIL/PHONE] | Overall breach response leadership |
| **HIPAA Compliance Officer** | [NAME] | [EMAIL/PHONE] | HIPAA compliance, notification |
| **CTO/Engineering Lead** | [NAME] | [EMAIL/PHONE] | Technical investigation, containment |
| **Legal Counsel** | [NAME] | [EMAIL/PHONE] | Legal guidance, risk assessment |
| **HR Director** | [NAME] | [EMAIL/PHONE] | Employee discipline, training |
| **Communications** | [NAME] | [EMAIL/PHONE] | Patient communication, media |

### External Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| **HHS OCR** | https://ocrportal.hhs.gov | Breach reporting |
| **Cyber Insurance** | [POLICY#] [PHONE] | Insurance claim |
| **Forensics Firm** | [NAME] [PHONE] | Digital forensics |
| **PR Firm** | [NAME] [PHONE] | Media response (>500) |

---

## Detection & Assessment

### Day 0: Discovery

**How breaches are discovered:**
1. ✅ Automated breach detection system alert
2. ✅ Employee report of suspected breach
3. ✅ Patient complaint
4. ✅ Business associate notification
5. ✅ Security audit finding
6. ✅ Media report or public disclosure

**Initial Assessment (within 1 hour):**
- [ ] Document discovery date/time
- [ ] Document who discovered the breach
- [ ] Document how breach was discovered
- [ ] Convene Breach Response Team
- [ ] Initiate incident log

**Preliminary Questions:**
1. What PHI was involved?
2. How many individuals affected?
3. Is breach still ongoing?
4. What caused the breach?
5. Is containment possible?

---

## Containment

### Day 0-1: Immediate Containment Actions

**Technical Containment:**
- [ ] Disable compromised user accounts
- [ ] Revoke unauthorized access credentials
- [ ] Rotate encryption keys (if compromised)
- [ ] Block malicious IP addresses
- [ ] Isolate affected systems
- [ ] Stop unauthorized data export
- [ ] Preserve audit logs and evidence

**Physical Containment:**
- [ ] Retrieve stolen/lost devices
- [ ] Secure physical premises
- [ ] Change locks/access codes if needed
- [ ] Review CCTV footage

**Administrative Containment:**
- [ ] Notify employees not to discuss breach
- [ ] Implement communication blackout
- [ ] Suspend non-essential PHI access
- [ ] Document all containment actions

---

## Investigation

### Day 1-5: Full Investigation

**Investigation Objectives:**
1. Determine scope: How many individuals affected?
2. Identify PHI: What specific PHI was exposed?
3. Root cause: How did breach occur?
4. Acquisition: Was PHI actually viewed/copied?
5. Unauthorized recipient: Who accessed PHI?
6. Mitigation: Can risk be reduced?

**Investigation Checklist:**
- [ ] Review audit logs (last 90 days)
- [ ] Interview witnesses and involved parties
- [ ] Examine system logs and access records
- [ ] Identify all affected patient records
- [ ] Document evidence chain of custody
- [ ] Consult legal counsel on findings
- [ ] Complete 4-factor risk assessment
- [ ] Determine if notification required

**Investigation Report Must Include:**
1. Date/time of breach
2. Date/time of discovery
3. Number of individuals affected
4. Description of PHI involved
5. Description of how breach occurred
6. Description of who accessed PHI
7. Evidence PHI was acquired/viewed
8. Mitigation actions taken
9. Risk assessment conclusion
10. Recommendation: Notify or not notify?

---

## Notification Requirements

### Individual Notification (<500 Individuals)

**Timeline:** Within 60 days of discovery  
**Method:** First-class mail (or email if individual agreed)  
**Content Requirements (§ 164.404(c)):**

1. Brief description of breach
2. Description of PHI involved
3. Steps individuals should take
4. What organization is doing
5. Contact information for questions

**Template: Individual Notification Letter**

```
[DATE]

[PATIENT NAME]
[ADDRESS]

Re: Notice of Protected Health Information Breach

Dear [PATIENT NAME]:

We are writing to notify you of a breach that may have affected the security or privacy of your protected health information (PHI).

WHAT HAPPENED
[Brief description: On [DATE], we discovered that [DESCRIPTION OF BREACH]. This incident may have involved [NUMBER] individuals.]

WHAT INFORMATION WAS INVOLVED
[Description of PHI: The information involved may have included your [name, date of birth, diagnosis, treatment information, etc.].]

WHAT WE ARE DOING
[Mitigation steps: We have taken the following steps to address this breach: [LIST ACTIONS]. We have also [enhanced security measures].]

WHAT YOU CAN DO
[Recommended actions: We recommend you [monitor accounts, file police report, place fraud alert, etc.].]

FOR MORE INFORMATION
[Contact: If you have questions about this notice, please contact [NAME] at [PHONE] or [EMAIL].]

We take the privacy and security of your health information very seriously. We sincerely apologize for any inconvenience or concern this may cause.

Sincerely,

[SIGNATURE]
[NAME], [TITLE]
[ORGANIZATION NAME]
```

### Media Notification (>500 Individuals)

**Timeline:** Within 60 days of discovery  
**Method:** Prominent media outlets serving the area  
**Content:** Same as individual notification  

**Media Outlets:**
- [ ] Major local newspapers
- [ ] Local TV stations
- [ ] Organization website homepage

### HHS Notification

**Option A: >500 Individuals**
- **Timeline:** Within 60 days of discovery
- **Method:** HHS Breach Portal (https://ocrportal.hhs.gov)
- **Public:** Breach appears on HHS "Wall of Shame"

**Option B: <500 Individuals**
- **Timeline:** Within 60 days of calendar year end
- **Method:** Annual report to HHS
- **Public:** Not publicly disclosed

**HHS Breach Portal Submission:**
- [ ] Login to https://ocrportal.hhs.gov
- [ ] Select "Report a Breach"
- [ ] Complete breach report form:
  - Organization information
  - Breach discovery date
  - Breach occurrence date
  - Number of individuals affected
  - Type of breach
  - Location of breach
  - Description of breach
  - Safeguards in place

---

## Documentation

### Required Documentation

**Breach Investigation File:**
- [ ] Incident log (chronological timeline)
- [ ] Investigation report
- [ ] 4-factor risk assessment
- [ ] List of affected individuals
- [ ] Copies of all notifications sent
- [ ] Proof of mailing/delivery
- [ ] Media notification evidence
- [ ] HHS portal confirmation
- [ ] Meeting notes and decisions
- [ ] Correspondence with OCR (if any)

**Retention Period:** 7 years minimum (HIPAA requirement)

**Storage Location:** `docs/compliance/breach-investigations/[YEAR]/[CASE-NUMBER]/`

---

## Prevention

### Post-Breach Actions

**Immediate (Week 1-2):**
- [ ] Implement remediation measures
- [ ] Provide additional staff training
- [ ] Update security policies
- [ ] Enhance technical safeguards
- [ ] Discipline employees (if applicable)

**Short-term (Month 1-3):**
- [ ] Conduct security risk assessment
- [ ] Update incident response plan
- [ ] Implement additional monitoring
- [ ] Test security controls
- [ ] Review business associate agreements

**Long-term (Month 3-12):**
- [ ] Annual security training
- [ ] Quarterly security audits
- [ ] Penetration testing
- [ ] Policy reviews and updates
- [ ] Mock breach exercises

---

## Appendices

### Appendix A: Breach Severity Classification

| Severity | Individuals | PHI Sensitivity | Notification |
|----------|------------|-----------------|--------------|
| **Level 1 - Low** | 1-10 | Non-sensitive | Individual only |
| **Level 2 - Medium** | 11-499 | Moderate | Individual + HHS (annual) |
| **Level 3 - High** | 500+ | High | Individual + HHS + Media |
| **Level 4 - Critical** | 5,000+ | Very high | All + PR firm + legal |

### Appendix B: Notification Checklist

**Individual Notification:**
- [ ] List of affected individuals compiled
- [ ] Addresses verified
- [ ] Notification letters prepared
- [ ] Legal review completed
- [ ] Letters mailed via first-class mail
- [ ] Tracking numbers recorded
- [ ] Copy of letter filed

**Media Notification (if >500):**
- [ ] Press release prepared
- [ ] Media outlets identified
- [ ] Website notice posted
- [ ] Press release sent
- [ ] Media inquiries logged

**HHS Notification:**
- [ ] HHS portal account verified
- [ ] Breach report completed
- [ ] Supporting docs uploaded
- [ ] Submission confirmed
- [ ] Confirmation number saved

### Appendix C: Contact Information Template

```
BREACH RESPONSE HOTLINE: [PHONE NUMBER]
Available 24/7 for breach reports

INTERNAL REPORTING:
Email: breach-response@loma.health
Phone: [PHONE]

EXTERNAL REPORTING:
HHS OCR: https://ocrportal.hhs.gov
Phone: 1-800-368-1019

FBI CYBER DIVISION (for criminal breaches):
Phone: [LOCAL FBI OFFICE]
```

### Appendix D: Breach Report Template

```
BREACH INCIDENT REPORT

CASE NUMBER: [YEAR]-[SEQUENTIAL]
DISCOVERY DATE: [DATE] [TIME]
REPORTED BY: [NAME] [TITLE]

PRELIMINARY ASSESSMENT:
☐ Potential breach ☐ Confirmed breach ☐ Security incident (not breach)

AFFECTED INDIVIDUALS: [NUMBER]
PHI INVOLVED: [DESCRIPTION]

IMMEDIATE ACTIONS TAKEN:
- [ACTION 1]
- [ACTION 2]

NEXT STEPS:
- [STEP 1] [RESPONSIBLE] [DEADLINE]
- [STEP 2] [RESPONSIBLE] [DEADLINE]

BREACH COORDINATOR: [NAME]
INVESTIGATION LEAD: [NAME]
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | [DATE] | Initial breach response plan | [NAME] |

---

## Sign-Off

This Breach Response Plan has been reviewed and approved by:

**HIPAA Compliance Officer:** _____________________ Date: _______

**Chief Technology Officer:** _____________________ Date: _______

**Legal Counsel:** _____________________ Date: _______

**Chief Executive Officer:** _____________________ Date: _______

---

*END OF BREACH RESPONSE PLAN*
```

### Testing Criteria

#### Test 1: Documentation Complete
```bash
# Verify file exists
test -f docs/compliance/BREACH_RESPONSE_PLAN.md
echo "✅ Breach response plan exists"

# Verify all sections present
grep -q "Response Timeline" docs/compliance/BREACH_RESPONSE_PLAN.md
grep -q "Notification Requirements" docs/compliance/BREACH_RESPONSE_PLAN.md
grep -q "Individual Notification Letter" docs/compliance/BREACH_RESPONSE_PLAN.md
echo "✅ All required sections present"
```

#### Test 2: Manual Review Checklist
```markdown
## Review Checklist

- [ ] All team member names filled in
- [ ] All contact information added
- [ ] Letter templates customized with organization name
- [ ] HHS portal login credentials verified
- [ ] Media outlets list compiled
- [ ] Insurance policy information added
- [ ] Forensics firm contact added (if available)
- [ ] Legal counsel contact verified
- [ ] 60-day timeline clearly documented
- [ ] Notification thresholds (<500, >500) explained
- [ ] Evidence preservation procedures detailed
```

### Acceptance Criteria
- [ ] `BREACH_RESPONSE_PLAN.md` created with all sections
- [ ] Response timeline with 60-day deadline documented
- [ ] Individual notification letter template included
- [ ] HHS notification procedure documented
- [ ] Media notification procedure (>500) documented
- [ ] Breach response team roles defined
- [ ] Contact information template provided
- [ ] Documentation requirements specified
- [ ] 7-year retention policy stated
- [ ] All appendices included
- [ ] Sign-off section provided

---

## Task 8: Standardize Cookie Flags

**Priority:** ⚠️ HIGH  
**Time Estimate:** 1 hour  
**HIPAA Requirement:** § 164.312(e)(1) - Transmission Security  
**OCR Fine Avoidance:** $10,000

### Problem Statement
Cookie configuration inconsistent across authentication files. Some cookies missing `sameSite` flag.

### Implementation Steps

#### 8.1 Update Primary Auth Cookie Config
**File:** `server/auth-simple.ts`

**Current Code (Line ~18-25):**
```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};
```

**Updated Code (change `lax` to `strict`):**
```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const, // Changed from 'lax' to 'strict'
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};
```

#### 8.2 Update Middleware Auth Cookie Config
**File:** `server/middleware/authentication.ts`

**Current Code (Line ~81-88):**
```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};
```

**Updated Code:**
```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const, // ADD THIS
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};
```

#### 8.3 Create Shared Cookie Config
**Create File:** `server/utils/cookie-config.ts`

```typescript
/**
 * Shared cookie configuration for consistent security across application
 */

export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Standard cookie configuration for authentication
 */
export const AUTH_COOKIE_OPTIONS: CookieConfig = {
  httpOnly: true, // Prevents XSS access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // CSRF protection (strictest setting)
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};

/**
 * Cookie configuration for session tokens
 */
export const SESSION_COOKIE_OPTIONS: CookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours (HIPAA session timeout)
  path: '/'
};

/**
 * Cookie configuration for CSRF tokens
 */
export const CSRF_COOKIE_OPTIONS: CookieConfig = {
  httpOnly: false, // Must be accessible to client for CSRF header
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};
```

#### 8.4 Update All Cookie Usage
**Files to Update:**
- `server/auth-simple.ts`
- `server/middleware/authentication.ts`
- `server/routes/auth.ts` (if sets cookies)

**Replace all cookie configurations with:**
```typescript
import { AUTH_COOKIE_OPTIONS } from './utils/cookie-config';

// When setting cookie:
res.cookie('auth_token', token, AUTH_COOKIE_OPTIONS);
```

### Testing Criteria

#### Test 1: Verify Cookie Flags
```bash
# Login and check cookie flags
curl -i -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password"}'

# Expected Set-Cookie header:
# Set-Cookie: auth_token=...; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

#### Test 2: Browser DevTools Check
```markdown
## Manual Cookie Verification

1. Open browser DevTools
2. Go to Application → Cookies
3. Login to application
4. Find `auth_token` cookie
5. Verify flags:
   - [ ] HttpOnly: ✅ (checkmark present)
   - [ ] Secure: ✅ (in production)
   - [ ] SameSite: Strict
   - [ ] Path: /
   - [ ] Max-Age: 86400 (24 hours)
```

#### Test 3: Automated Cookie Tests
```typescript
// Create test: server/tests/cookie-security.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Cookie Security', () => {
  it('should set HttpOnly flag on auth cookie', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'test', password: 'password' });

    const setCookie = response.headers['set-cookie'][0];
    expect(setCookie).toContain('HttpOnly');
  });

  it('should set Secure flag in production', async () => {
    process.env.NODE_ENV = 'production';
    
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'test', password: 'password' });

    const setCookie = response.headers['set-cookie'][0];
    expect(setCookie).toContain('Secure');
  });

  it('should set SameSite=Strict', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'test', password: 'password' });

    const setCookie = response.headers['set-cookie'][0];
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('should set 24-hour max age', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ username: 'test', password: 'password' });

    const setCookie = response.headers['set-cookie'][0];
    expect(setCookie).toContain('Max-Age=86400');
  });
});
```

### Acceptance Criteria
- [ ] `cookie-config.ts` created with shared configurations
- [ ] All auth cookies use `httpOnly: true`
- [ ] All auth cookies use `secure: true` (in production)
- [ ] All auth cookies use `sameSite: 'strict'`
- [ ] `server/auth-simple.ts` updated to use shared config
- [ ] `server/middleware/authentication.ts` updated to use shared config
- [ ] Cookie tests pass
- [ ] Browser DevTools shows all security flags
- [ ] No cookies missing `sameSite` attribute

---

## Task 9: Add CORS Policy

**Priority:** ⚠️ HIGH  
**Time Estimate:** 1 hour  
**HIPAA Requirement:** § 164.312(e)(1) - Transmission Security  
**OCR Fine Avoidance:** $10,000

### Problem Statement
No CORS (Cross-Origin Resource Sharing) policy configured. API is potentially accessible from any origin.

### Implementation Steps

#### 9.1 Install CORS Package
```bash
npm install cors
npm install --save-dev @types/cors
```

#### 9.2 Configure CORS Middleware
**File:** `server/index.ts`

**Add after imports (Line ~26):**
```typescript
import cors from 'cors';
```

**Add after app initialization (Line ~49):**
```typescript
// CORS configuration - lock down to specific origins
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://loma-org.onrender.com',
      // Add additional production domains if needed
    ]
  : [
      'http://localhost:5000',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-Request-ID'
  ],
  maxAge: 600, // 10 minutes (how long browser caches preflight)
  optionsSuccessStatus: 200
}));

console.log('✅ CORS enabled for origins:', allowedOrigins);
```

#### 9.3 Add Environment Variable for Additional Origins
**File:** `env.production`

**Add:**
```bash
# Additional allowed CORS origins (comma-separated)
CORS_ALLOWED_ORIGINS=https://loma-org.onrender.com,https://www.loma.health
```

#### 9.4 Update CORS Config to Use Env Variable
**File:** `server/index.ts`

**Update CORS configuration:**
```typescript
// CORS configuration - lock down to specific origins
const envOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://loma-org.onrender.com',
      ...envOrigins
    ]
  : [
      'http://localhost:5000',
      'http://localhost:5173',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173'
    ];

// ... rest of CORS config
```

### Testing Criteria

#### Test 1: Verify CORS Headers
```bash
# Test from allowed origin
curl -i -X OPTIONS http://localhost:5000/api/patients \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"

# Expected headers:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
# Access-Control-Allow-Credentials: true
```

#### Test 2: Verify Blocked Origins
```bash
# Test from disallowed origin
curl -i -X OPTIONS http://localhost:5000/api/patients \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: GET"

# Expected: No Access-Control-Allow-Origin header
# OR CORS error in response
```

#### Test 3: Automated CORS Tests
```typescript
// Create test: server/tests/cors-policy.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('CORS Policy', () => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000'
  ];

  const blockedOrigins = [
    'https://evil.com',
    'https://malicious.org',
    'http://phishing.net'
  ];

  it('should allow requests from allowed origins', async () => {
    for (const origin of allowedOrigins) {
      const response = await request(app)
        .options('/api/patients')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  it('should block requests from unauthorized origins', async () => {
    for (const origin of blockedOrigins) {
      const response = await request(app)
        .get('/api/patients')
        .set('Origin', origin);

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('CORS');
    }
  });

  it('should allow credentials', async () => {
    const response = await request(app)
      .options('/api/patients')
      .set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should expose correlation ID headers', async () => {
    const response = await request(app)
      .options('/api/patients')
      .set('Origin', 'http://localhost:5173');

    const exposedHeaders = response.headers['access-control-expose-headers'];
    expect(exposedHeaders).toContain('X-Correlation-ID');
  });

  it('should allow required methods', async () => {
    const response = await request(app)
      .options('/api/patients')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    const allowedMethods = response.headers['access-control-allow-methods'];
    expect(allowedMethods).toContain('GET');
    expect(allowedMethods).toContain('POST');
    expect(allowedMethods).toContain('PUT');
    expect(allowedMethods).toContain('DELETE');
  });
});
```

#### Test 4: Browser DevTools Check
```markdown
## Manual CORS Verification

1. Open browser DevTools Console
2. Try making request from console:
```javascript
fetch('http://localhost:5000/api/patients', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

3. Verify:
   - [ ] Request succeeds from allowed origin
   - [ ] CORS headers present in response
   - [ ] Credentials (cookies) sent

4. Try from different origin:
```javascript
// Should fail
fetch('http://localhost:5000/api/patients', {
  mode: 'cors',
  credentials: 'include'
})
.then(r => r.json())
.catch(err => console.log('Expected CORS error:', err));
```
```

### Acceptance Criteria
- [ ] `cors` package installed
- [ ] CORS middleware configured in `server/index.ts`
- [ ] Production origins limited to specific domains
- [ ] Development origins include localhost variations
- [ ] `credentials: true` enabled for cookies
- [ ] Required methods allowed (GET, POST, PUT, DELETE)
- [ ] Required headers allowed (Content-Type, Authorization, X-CSRF-Token)
- [ ] Correlation ID headers exposed
- [ ] Environment variable for additional origins
- [ ] Console log shows allowed origins on startup
- [ ] CORS tests pass
- [ ] Unauthorized origins blocked

---

## Sprint Completion Checklist

### Pre-Sprint
- [ ] Review all tasks with team
- [ ] Assign tasks to engineers
- [ ] Set up development environment
- [ ] Verify database access
- [ ] Verify vendor dashboard access

### During Sprint
- [ ] Daily standup to track progress
- [ ] Test each task after completion
- [ ] Document any issues or blockers
- [ ] Update task status in project tracker

### Post-Sprint
- [ ] All 9 tasks completed
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Deployment plan created
- [ ] Stakeholder demo scheduled

### Verification
- [ ] Run all automated tests: `npm test`
- [ ] Manual testing checklist completed
- [ ] Security scan performed
- [ ] Compliance checklist reviewed
- [ ] BAA status verified with all vendors

### Deployment
- [ ] Create deployment plan
- [ ] Schedule maintenance window
- [ ] Backup production database
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Verify all security features active
- [ ] Monitor logs for 24 hours

---

## Success Metrics

| Metric | Before | Target | Verification |
|--------|--------|--------|--------------|
| **HIPAA Compliance** | 72% | 85% | CTO audit report |
| **Audit Coverage** | 0% | 100% | All PHI routes audited |
| **Cache Headers** | 0% | 100% | All API routes have headers |
| **CSRF Protection** | ❌ | ✅ | Enabled on all routes |
| **BAA Documentation** | ❌ | ✅ | All vendors documented |
| **localStorage Auth** | ❌ | ✅ | Removed entirely |
| **Breach Detection** | ❌ | ✅ | Service running |
| **Cookie Security** | Partial | 100% | All flags consistent |
| **CORS Policy** | ❌ | ✅ | Configured and tested |
| **OCR Fine Risk** | $400K | $50K | Risk reduced 87% |

---

## Support Resources

### Documentation
- HIPAA Security Rule: https://www.hhs.gov/hipaa/for-professionals/security/
- OCR Breach Portal: https://ocrportal.hhs.gov
- NIST HIPAA Guide: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-66r2.pdf

### Code References
- Audit Middleware: `server/middleware/audit-logging.ts`
- PHI Protection: `server/middleware/phi-protection.ts`
- Core Security: `server/middleware/core-security.ts`
- Authentication: `server/middleware/authentication.ts`

### Contact
- Engineering Lead: [NAME] [EMAIL]
- HIPAA Compliance: [NAME] [EMAIL]
- Legal: [NAME] [EMAIL]

---

**Sprint Duration:** 3 days  
**Total Hours:** 22 hours  
**Compliance Increase:** 72% → 85%  
**Risk Reduction:** $350K OCR fine exposure

**Let's ship secure, compliant healthcare software!** 🚀











