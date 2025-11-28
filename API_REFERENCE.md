# LOMA Mental Health Platform - API Reference

## 🎯 **API Overview**

The LOMA API provides HIPAA-compliant endpoints for mental health practice management. All PHI (Protected Health Information) is encrypted and all access is audited.

## 🔐 **Authentication**

All API endpoints (except public ones) require authentication via session cookies.

```bash
# Login
POST /api/login
{
  "username": "therapist@example.com",
  "password": "securepassword"
}

# Get current user
GET /api/user

# Logout
POST /api/logout
```

## 🏥 **Core HIPAA Endpoints**

### **Organizations**
```bash
# List organizations
GET /api/organizations

# Get organization details
GET /api/organizations/:id

# Create organization
POST /api/organizations
{
  "name": "My Practice",
  "type": "solo"
}

# Update organization
PUT /api/organizations/:id
```

### **Patients**
```bash
# List patients
GET /api/patients

# Get patient details
GET /api/patients/:id

# Create patient
POST /api/patients
{
  "patientFirstName": "John",
  "patientLastName": "Doe",
  "patientContactEmailEncrypted": "encrypted_email",
  "patientContactPhoneEncrypted": "encrypted_phone"
}

# Update patient
PUT /api/patients/:id
```

### **Clinical Sessions**

**⚠️ BREAKING CHANGE (Phase 2 - October 2025):**  
Session API responses now use clean property names for decrypted PHI fields:
- ✅ `sessionClinicalNotes` (decrypted value)
- ❌ ~~`sessionClinicalNotesEncrypted`~~ (no longer in response)

Database columns still use `*Encrypted` suffix, but API responses use clean names.

```bash
# List sessions
GET /api/clinical-sessions
# Returns array of session objects with decrypted PHI using clean property names

# Response format:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patientId": 1,
      "organizationId": 1,
      "date": "2025-01-20",
      "duration": 60,
      "type": "individual",
      "status": "scheduled",
      // Decrypted PHI fields (clean names):
      "sessionClinicalNotes": "Decrypted clinical notes",
      "sessionSubjectiveNotes": "Patient reported...",
      "sessionObjectiveNotes": "Observed behavior...",
      "sessionAssessmentNotes": "Clinical assessment...",
      "sessionPlanNotes": "Treatment plan...",
      "sessionTreatmentGoals": "Goals for therapy",
      "sessionProgressNotes": "Progress update",
      "sessionInterventions": "Interventions used"
    }
  ]
}

# Get session details
GET /api/clinical-sessions/:id
# Returns single session with same structure as above

# Create session
POST /api/clinical-sessions
{
  "patientId": 1,
  "organizationId": 1,
  "therapistId": 1,
  "date": "2025-01-20",
  "duration": 60,
  "type": "individual",
  // Submit plain text - will be encrypted server-side
  "sessionClinicalNotesEncrypted": "Clinical notes text",
  "sessionSubjectiveNotesEncrypted": "Subjective notes"
}
# Returns created session with clean property names (see response format above)

# Update session
PUT /api/clinical-sessions/:id
{
  "sessionClinicalNotesEncrypted": "Updated clinical notes"
}
# Returns updated session with clean property names
```

**Property Name Mapping (Response Format):**
| Database Column | API Response Property |
|----------------|----------------------|
| `sessionClinicalNotesEncrypted` | `sessionClinicalNotes` |
| `sessionSubjectiveNotesEncrypted` | `sessionSubjectiveNotes` |
| `sessionObjectiveNotesEncrypted` | `sessionObjectiveNotes` |
| `sessionAssessmentNotesEncrypted` | `sessionAssessmentNotes` |
| `sessionPlanNotesEncrypted` | `sessionPlanNotes` |
| `sessionTreatmentGoalsEncrypted` | `sessionTreatmentGoals` |
| `sessionProgressNotesEncrypted` | `sessionProgressNotes` |
| `sessionInterventionsEncrypted` | `sessionInterventions` |

### **Treatment Plans**
```bash
# List treatment plans
GET /api/patient-treatment-plans

# Get treatment plan details
GET /api/patient-treatment-plans/:id

# Create treatment plan
POST /api/patient-treatment-plans
{
  "patientId": 1,
  "treatmentPlanContentEncrypted": "encrypted_content",
  "goals": ["Goal 1", "Goal 2"]
}

# Update treatment plan
PUT /api/patient-treatment-plans/:id
```

### **Therapists**
```bash
# List therapists
GET /api/therapists

# Get therapist details
GET /api/therapists/:id

# Update therapist profile
PUT /api/therapists/:id
```

## 💳 **Stripe Integration**

### **Payment Processing**
```bash
# Get Stripe Connect account
GET /api/connect/get-connect-account

# Create payment intent
POST /api/stripe/create-payment-intent
{
  "amount": 10000,
  "currency": "usd",
  "patientId": 1
}

# Handle webhook
POST /api/stripe/webhook
```

### **Business Banking**
```bash
# Get card details
GET /api/stripe-issuing/cards

# Create card
POST /api/stripe-issuing/cards
{
  "type": "virtual",
  "currency": "usd"
}
```

## 👤 **User Profile Management**

```bash
# Get user profile
GET /api/user/profile

# Update user profile
PUT /api/user/profile
{
  "name": "Dr. Jane Smith",
  "title": "Licensed Clinical Psychologist",
  "license": "LCP-12345",
  "practiceDetails": {
    "address": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "biography": "Experienced therapist...",
    "yearsOfExperience": 10,
    "qualifications": "PhD in Psychology",
    "specialties": ["Anxiety", "Depression"]
  },
  "credentialing": {
    "npiNumber": "1234567890",
    "taxonomyCode": "103T00000X",
    "einNumber": "12-3456789"
  },
  "lomaSettings": {
    "defaultNoteFormat": "SOAP",
    "sessionDuration": 50,
    "timeZone": "America/Chicago"
  },
  "insurance": {
    "acceptedProviders": ["Aetna", "Blue Cross"],
    "isInsuranceProvider": true,
    "privatePayRate": 150.00
  }
}
```

## 🔍 **AI Integration**

### **Sigie Assistant**
```bash
# Chat with AI assistant
POST /api/sigie
{
  "message": "Help me create a treatment plan for anxiety",
  "context": "patient_id_123"
}

# Execute AI action
POST /api/sigie/action
{
  "action": "create_treatment_plan",
  "parameters": {
    "patientId": 1,
    "diagnosis": "Generalized Anxiety Disorder"
  }
}
```

## 📊 **Response Formats**

### **Success Response**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "createdAt": "2025-01-20T10:00:00Z"
  }
}
```

### **Error Response**
```json
{
  "error": "Validation failed",
  "message": "Patient name is required",
  "code": "VALIDATION_ERROR"
}
```

## 🔒 **Security Headers**

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## 📝 **Rate Limiting**

- **Authentication endpoints**: 5 requests per minute
- **API endpoints**: 100 requests per minute
- **File uploads**: 10 requests per minute

## 🏥 **HIPAA Compliance**

- All PHI is encrypted using AES-256-GCM
- All PHI access is logged in `audit_logs_hipaa`
- Session management with secure cookies
- CSRF protection on all state-changing operations

## 🚀 **Getting Started**

1. **Authenticate** using `/api/login`
2. **Create organization** using `/api/organizations`
3. **Add patients** using `/api/patients`
4. **Create sessions** using `/api/clinical-sessions`
5. **Set up Stripe** using `/api/connect`

## 📚 **Additional Resources**

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete development setup
- **[HIPAA Compliance](./HIPAA_COMPLIANCE.md)** - Compliance requirements
- **[AI Integration](./AI_INTEGRATION.md)** - AI features documentation
