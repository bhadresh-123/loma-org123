# Access Control Matrix

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Compliance:** HIPAA 1.4.4 - Information Access Management  
**Owner:** Security Team

---

## Executive Summary

This document defines the role-based access control (RBAC) matrix for the Loma Mental Health platform. It details which roles have access to which resources and operations, ensuring compliance with HIPAA's minimum necessary standard (§164.502(b)).

---

## Role Definitions

### 1. Business Owner (`business_owner`)
**Description:** Primary owner of the practice/organization with full administrative access.  
**HIPAA Access Level:** Administrative  
**Count per Organization:** Exactly 1 (isPrimaryOwner flag)  
**MFA Required:** ✅ Yes (14+ char password, special char required)

**Characteristics:**
- Full access to all organization data and settings
- Can manage all staff members
- Can manage billing and payments
- Can view and edit all patient records
- Can manage organization settings

### 2. Admin (`admin`)
**Description:** Administrative staff with elevated privileges but not full owner rights.  
**HIPAA Access Level:** Administrative  
**Count per Organization:** Unlimited  
**MFA Required:** ✅ Yes (14+ char password, special char required)

**Characteristics:**
- Configurable patient access (canViewAllPatients or selected patients)
- Can view all calendars
- Can manage selected staff (if granted)
- Cannot delete organization
- Cannot change business owner

### 3. Therapist (`therapist`)
**Description:** Licensed clinical staff providing direct patient care.  
**HIPAA Access Level:** Limited (own patients only)  
**Count per Organization:** Unlimited  
**MFA Required:** Recommended (12+ char password)

**Characteristics:**
- Access to own patients only
- Can create and manage clinical sessions
- Can write clinical notes and treatment plans
- Access to own calendar only
- Cannot access other therapists' patients (unless explicitly shared)

### 4. Contractor (1099) (`contractor_1099`)
**Description:** Independent contractor providing clinical services.  
**HIPAA Access Level:** Limited (own patients only)  
**Count per Organization:** Unlimited  
**MFA Required:** Recommended (12+ char password)

**Characteristics:**
- Same as therapist for clinical work
- Separate billing/payment tracking (1099 vs W-2)
- Time-limited access (employmentStartDate/employmentEndDate)
- Can be made inactive after contract ends

---

## Permission Matrix

### Patient Data Access

| Role | View All Patients | View Selected Patients | View Own Patients | Edit Patient Data | Delete Patients |
|------|-------------------|------------------------|-------------------|-------------------|-----------------|
| business_owner | ✅ Always | N/A | ✅ | ✅ | ✅ |
| admin | ⚙️ Configurable | ⚙️ Configurable | ✅ | ⚙️ Based on view | ❌ |
| therapist | ❌ | ❌ | ✅ (primary/assigned) | ✅ Own only | ❌ |
| contractor_1099 | ❌ | ❌ | ✅ (primary/assigned) | ✅ Own only | ❌ |

**Database Fields:**
- `canViewAllPatients` (boolean) - For business_owner (always true) and admin (configurable)
- `canViewSelectedPatients` (jsonb array) - List of therapist user IDs whose patients this user can view
- `primaryTherapistId` - Determines patient ownership

**Code Reference:** `server/repositories/patient-repository.ts`

### Clinical Sessions Access

| Role | View All Sessions | View Selected Sessions | View Own Sessions | Create/Edit Sessions | Delete Sessions |
|------|-------------------|------------------------|-------------------|---------------------|-----------------|
| business_owner | ✅ | N/A | ✅ | ✅ | ✅ |
| admin | ⚙️ Via patient access | ⚙️ Via patient access | ✅ | ⚙️ Via patient access | ❌ |
| therapist | ❌ | ❌ | ✅ Own patients | ✅ Own patients | ❌ |
| contractor_1099 | ❌ | ❌ | ✅ Own patients | ✅ Own patients | ❌ |

**Access Rule:** Session access follows patient access. If you can view the patient, you can view their sessions.

**Code Reference:** `server/routes/clinical-sessions.ts`

### Treatment Plans Access

| Role | View All Plans | View Selected Plans | View Own Plans | Create/Edit Plans | Delete Plans |
|------|----------------|---------------------|----------------|-------------------|--------------|
| business_owner | ✅ | N/A | ✅ | ✅ | ✅ |
| admin | ⚙️ Via patient access | ⚙️ Via patient access | ✅ | ⚙️ Via patient access | ❌ |
| therapist | ❌ | ❌ | ✅ Own patients | ✅ Own patients | ❌ |
| contractor_1099 | ❌ | ❌ | ✅ Own patients | ✅ Own patients | ❌ |

**Code Reference:** `server/routes/patient-treatment-plans.ts`

### Calendar Access

| Role | View All Calendars | View Selected Calendars | View Own Calendar | Edit Schedules | Block Time Off |
|------|-------------------|------------------------|-------------------|----------------|----------------|
| business_owner | ✅ Always | N/A | ✅ | ✅ All | ✅ All |
| admin | ⚙️ Configurable | ⚙️ Configurable | ✅ | ⚙️ Based on view | ✅ Own |
| therapist | ❌ | ❌ | ✅ | ✅ Own | ✅ Own |
| contractor_1099 | ❌ | ❌ | ✅ | ✅ Own | ✅ Own |

**Database Fields:**
- `canViewAllCalendars` (boolean) - For business_owner (always true) and admin (configurable)
- `canViewSelectedCalendars` (jsonb array) - List of user IDs whose calendars this user can view

**Code Reference:** `server/routes/calendar-blocks.ts`, `server/routes/work-schedules.ts`

### Staff Management

| Role | View Staff | Invite Staff | Edit Staff Roles | Remove Staff | Manage Payroll |
|------|------------|--------------|------------------|--------------|----------------|
| business_owner | ✅ All | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ All | ⚙️ If canManageStaff | ⚙️ If canManageStaff | ❌ | ❌ |
| therapist | ✅ List only | ❌ | ❌ | ❌ | ❌ |
| contractor_1099 | ✅ List only | ❌ | ❌ | ❌ | ❌ |

**Database Fields:**
- `canManageStaff` (boolean) - For admin role, controls staff management access

**Code Reference:** `server/routes/organizations.ts` (invite/manage endpoints)

### Billing & Payments

| Role | View All Billing | View Own Billing | Manage Billing | Stripe Connect | Issue Cards |
|------|------------------|------------------|----------------|----------------|-------------|
| business_owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ⚙️ If canManageBilling | ✅ | ⚙️ If canManageBilling | ❌ | ❌ |
| therapist | ❌ | ✅ Own sessions | ❌ | ✅ Own account | ❌ |
| contractor_1099 | ❌ | ✅ Own sessions | ❌ | ✅ Own account | ❌ |

**Database Fields:**
- `canManageBilling` (boolean) - Controls organization-wide billing access
- `stripeConnectAccountId` - Each therapist has own Connect account for payments

**Code Reference:** `server/routes/stripe.ts`, `server/routes/connect.ts`

### Organization Settings

| Role | View Settings | Edit Settings | Delete Organization | Manage Integrations | Export Data |
|------|---------------|---------------|---------------------|---------------------|-------------|
| business_owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ⚙️ If canManageSettings | ❌ | ⚙️ If canManageSettings | ⚙️ If canManageSettings |
| therapist | ✅ Public info | ❌ | ❌ | ❌ | ❌ |
| contractor_1099 | ✅ Public info | ❌ | ❌ | ❌ | ❌ |

**Database Fields:**
- `canManageSettings` (boolean) - Controls organization settings access

**Code Reference:** `server/routes/organizations.ts`

---

## Database Schema Mapping

### Organization Memberships Table

```sql
CREATE TABLE organization_memberships (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Role
  role TEXT NOT NULL, -- 'business_owner', 'admin', 'therapist', 'contractor_1099'
  
  -- Patient Access (HIPAA minimum necessary)
  can_view_all_patients BOOLEAN DEFAULT false,
  can_view_selected_patients JSONB DEFAULT '[]', -- [therapist_user_ids]
  
  -- Calendar Access
  can_view_all_calendars BOOLEAN DEFAULT false,
  can_view_selected_calendars JSONB DEFAULT '[]', -- [user_ids]
  
  -- Management Permissions
  can_manage_billing BOOLEAN DEFAULT false,
  can_manage_staff BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_create_patients BOOLEAN DEFAULT true, -- All roles can create patients
  
  -- Employment Status
  employment_start_date TIMESTAMP,
  employment_end_date TIMESTAMP, -- NULL = currently employed
  is_active BOOLEAN DEFAULT true,
  is_primary_owner BOOLEAN DEFAULT false, -- Exactly ONE per org
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Default Permissions by Role

#### Business Owner (on registration)
```typescript
{
  role: 'business_owner',
  canViewAllPatients: true,
  canViewAllCalendars: true,
  canManageBilling: true,
  canManageStaff: true,
  canManageSettings: true,
  canCreatePatients: true,
  isPrimaryOwner: true,
  isActive: true
}
```

#### Admin (on invite)
```typescript
{
  role: 'admin',
  canViewAllPatients: false, // Configurable during invite
  canViewSelectedPatients: [], // Configurable during invite
  canViewAllCalendars: true, // Default for admin
  canManageBilling: false, // Configurable
  canManageStaff: false, // Configurable
  canManageSettings: false, // Configurable
  canCreatePatients: true,
  isPrimaryOwner: false,
  isActive: true
}
```

#### Therapist (on invite)
```typescript
{
  role: 'therapist',
  canViewAllPatients: false,
  canViewSelectedPatients: [],
  canViewAllCalendars: false,
  canManageBilling: false,
  canManageStaff: false,
  canManageSettings: false,
  canCreatePatients: true,
  isPrimaryOwner: false,
  isActive: true
}
```

#### Contractor (on invite)
```typescript
{
  role: 'contractor_1099',
  // Same as therapist
  // Plus: employment_start_date and employment_end_date tracked
}
```

---

## Access Control Enforcement

### Application-Level (RBAC Middleware)

**Location:** `server/middleware/authentication.ts`

```typescript
// Role-based checks
export const rbac = {
  canViewAllPatients: (req) => { ... },
  canManageBilling: (req) => { ... },
  canManageStaff: (req) => { ... },
  canManageSettings: (req) => { ... },
  canAccessPatient: async (req, patientId) => { ... }
};
```

**Usage Example:**
```typescript
router.get('/patients', 
  authenticateToken,
  setOrganizationContext,
  rbac.canViewAllPatients,
  async (req, res) => { ... }
);
```

### Database-Level (Query Filtering)

**Patient Queries:**
```typescript
// Therapists only see their own patients
const patients = await db
  .select()
  .from(patients)
  .where(and(
    eq(patients.organizationId, organizationId),
    eq(patients.primaryTherapistId, userId)
  ));

// Business owner sees all patients
const patients = await db
  .select()
  .from(patients)
  .where(eq(patients.organizationId, organizationId));
```

**Code Reference:** `server/repositories/patient-repository.ts`

---

## Audit Logging

All access to PHI is logged in the `audit_logs_hipaa` table:

```sql
INSERT INTO audit_logs_hipaa (
  user_id,
  action, -- 'PHI_ACCESS', 'PHI_UPDATE', etc.
  resource_type, -- 'PATIENT', 'SESSION', etc.
  resource_id,
  fields_accessed, -- ['name', 'dob', 'diagnosis']
  phi_fields_count,
  ip_address,
  user_agent,
  created_at
) VALUES (...);
```

**Audit Requirements:**
- ✅ Every patient record access logged
- ✅ Every PHI field access logged  
- ✅ User, timestamp, and resource logged
- ✅ 7-year retention (HIPAA requirement)

**Code Reference:** `server/utils/audit-system.ts`

---

## Security Controls

### MFA Enforcement (HIPAA 1.4.4)
- ✅ `business_owner`: MFA required (7-day grace period)
- ✅ `admin`: MFA required (7-day grace period)
- ⚙️ `therapist`: MFA recommended
- ⚙️ `contractor_1099`: MFA recommended

**Grace Period:** New admin users have 7 days to set up MFA before access is blocked.

**Code Reference:** `server/middleware/authentication.ts` (requireMFAForAdmins)

### Password Requirements
- `business_owner` / `admin`: 14+ chars, uppercase, lowercase, number, special char
- `therapist` / `contractor_1099`: 12+ chars, uppercase, lowercase, number

**Code Reference:** `server/validation/schemas.ts` (validatePasswordForRole)

### Session Security
- ✅ HTTP-only cookies
- ✅ Secure flag in production
- ✅ 24-hour session timeout
- ✅ Account lockout after 5 failed attempts

**Code Reference:** `server/middleware/authentication.ts`

---

## Access Request & Approval Process

### Adding New Staff Member

1. **Business Owner/Admin** initiates invite:
   - Specify role (admin/therapist/contractor)
   - Configure permissions (for admin role)
   - Set employment dates (for contractor)
   - Send invite email

2. **Invited User** accepts invite:
   - Clicks invite link (7-day expiration)
   - Creates account with password meeting role requirements
   - MFA setup required (for admin roles)

3. **Access Granted:**
   - User added to organization with specified role
   - Permissions applied per role matrix
   - Audit log entry created

**Code Reference:** `server/routes/organizations.ts` (invite endpoints)

### Removing Staff Member

1. **Business Owner** (or authorized admin):
   - Set `isActive = false` on organization membership
   - Set `employmentEndDate` to today

2. **Access Revoked:**
   - User can no longer access organization data
   - Active sessions invalidated on next request
   - Audit log entry created
   - User can still access personal profile

**Note:** Do NOT delete user records - HIPAA requires 7-year retention of access logs.

---

## Compliance Verification

### Quarterly Access Review Checklist

- [ ] Review all active organization memberships
- [ ] Verify MFA enabled for all admin roles
- [ ] Check for inactive users (employmentEndDate passed)
- [ ] Audit excessive permissions (principle of least privilege)
- [ ] Review audit logs for suspicious access patterns
- [ ] Verify patient access restrictions working correctly

### Annual Access Audit

- [ ] Complete access control matrix review
- [ ] Test each role's access restrictions
- [ ] Verify database query filters enforced
- [ ] Review and update role definitions if needed
- [ ] Train staff on access control policies
- [ ] Document any access violations and remediation

---

## Related Documentation

- **RBAC System:** `server/utils/rbac-system.ts`
- **Authentication:** `server/middleware/authentication.ts`
- **Database Schema:** `db/schema-hipaa-refactored.ts`
- **MFA Implementation:** `server/utils/mfa-service.ts`
- **Audit System:** `server/utils/audit-system.ts`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-04 | Security Team | Initial access control matrix for HIPAA 1.4.4 compliance |

---

**Document Classification:** INTERNAL - Security Sensitive  
**Next Review Date:** February 4, 2026 (Quarterly)

