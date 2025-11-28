# LOMA Mental Health Platform

A comprehensive mental health practice management platform designed for therapists and mental health professionals. LOMA streamlines administrative tasks, enhances client care, and ensures HIPAA compliance while providing powerful business insights.

## 🤖 AI-Assisted Development

This project follows a standardized AI development protocol for consistent, high-quality development workflows.

**Quick Start:**
```bash
# Verify your setup
./scripts/verify-ai-setup.sh
```

**Protocol Overview:**
```
Task → Implementation → Testing → Branch → PR → CI/CD → Merge → Deploy → Verify
```

**Key Resources:**
- 📖 [Full AI Development Protocol](docs/AI_DEVELOPMENT_PROTOCOL.md) - Complete workflow guide
- ⚡ [Quick Reference](docs/AI_PROTOCOL_QUICK_REFERENCE.md) - Command cheatsheet
- 📋 [`.cursorrules`](.cursorrules) - Cursor AI configuration

**When working with AI assistants (Cursor, etc.):**
1. All development follows the complete workflow (code → test → PR → merge → deploy)
2. AI will automatically create branches, write tests, and manage PRs
3. Changes are only merged after all CI checks pass
4. Deployments to Render are automatically triggered on merge to `main`

**Configuration:**
- Repository: `Loma-Health/loma-org`
- Deploy Platform: Render
- CI/CD: GitHub Actions
- Auto-deploy: On merge to `main`

## 🏗️ Domain Model

LOMA is built around a multi-tenant healthcare architecture with four core layers:

### 1. **Authentication & Authorization Layer**
- **`users_auth`**: Minimal authentication data (username, password, MFA settings)
- **`organizations`**: Practice/business entities (solo, partnership, group practice)
- **`organization_memberships`**: Role-based access control (business_owner, admin, therapist, contractor_1099)

### 2. **Healthcare Provider Layer**
- **`therapist_profiles`**: Professional information (licenses, NPI, specialties, business contact)
- **`therapist_phi`**: Encrypted personal PHI (SSN, DOB, personal addresses, emergency contacts)
- **Stripe Connect**: Each therapist has their own payment processing account with card issuing capabilities

### 3. **Patient Care Layer**
- **`patients`**: Comprehensive patient records with encrypted PHI
  - Demographics (DOB, gender, race, contact info)
  - Clinical data (diagnoses, medical history, treatment history)
  - Insurance information (provider, member ID, authorization)
- **`clinical_sessions`**: Therapy session tracking with encrypted clinical notes
  - SOAP note format support (Subjective, Objective, Assessment, Plan)
  - CPT coding for billing
  - Session status tracking (scheduled, completed, no_show, cancelled)
- **`patient_treatment_plans`**: Treatment plan management with versioning
  - Goals, objectives, interventions (all encrypted)
  - Progress tracking and review scheduling

### 4. **Operational & Compliance Layer**
- **Documents**: `document_templates` and `documents` for intake forms, consents, HIPAA notices
- **Scheduling**: `calendar_blocks`, `work_schedules`, `meetings`, `meeting_types`
- **Billing**: `invoices`, `invoice_items`, `card_transactions`
- **Medical Codes**: `medical_codes`, `assessment_categories` for standardized clinical coding
- **Tasks & Notifications**: `tasks`, `notifications`, `notification_settings`
- **Audit**: `audit_logs_hipaa` - comprehensive PHI access tracking
- **Settings**: `user_settings`

### Key Design Principles
- **Multi-tenant**: Organizations can have multiple therapists, each with their own patients
- **PHI Encryption**: All Protected Health Information uses AES-256-GCM encryption with `_encrypted` suffix
- **HIPAA Compliance**: 7-year data retention, comprehensive audit logging, role-based access control
- **Soft Deletes**: Patient data is never truly deleted (HIPAA requirement)
- **Search Hashes**: Encrypted fields have corresponding `_search_hash` fields for secure querying

## 🚀 Features

### Client Management
- **Secure PHI Storage**: AES-256-GCM encryption for all Protected Health Information
- **Insurance Integration**: Automated billing and claims processing
- **Document Management**: Template-based generation with PDF support
- **Treatment Planning**: Comprehensive treatment plan tracking with versioning

### Session Management
- **Appointment Scheduling**: Timezone-aware scheduling with calendar blocks
- **Multiple Note Formats**: SOAP, DAP, BIRP note templates
- **Automated Invoicing**: Stripe integration for billing with CPT code support
- **Task Automation**: Automated reminder and follow-up tasks

### Financial Management
- **Business Banking**: Integrated Stripe Connect card issuing and expense tracking (per therapist)
- **Tax Deductible Tracking**: Automatic MCC-based categorization with manual override
- **Revenue Analytics**: Comprehensive financial insights and reporting
- **Expense Categorization**: Smart categorization for therapist business expenses

### Compliance & Security
- **HIPAA Compliance**: Full audit trail and data protection
- **Multi-layered Security**: Rate limiting, CSRF protection, security headers
- **Role-Based Access Control**: Business owner, admin, therapist, and contractor roles
- **Comprehensive Logging**: Structured audit logging for all PHI access

### Provider Credentialing
- **CAQH Autofill**: Automated provider enrollment form filling using CV data
- **Browser Automation**: Browserbase integration for secure remote browser sessions
- **CV Data Extraction**: Intelligent parsing of provider information from uploaded CVs
- **Pre-filled Registration**: Automatic form completion for CAQH self-registration
- **Feature Flag Controlled**: Experimental feature with easy enable/disable

## 🛠 Technology Stack

### Frontend
- **React** with TypeScript for robust UI development
- **Tailwind CSS** + **Radix UI** for professional design system
- **React Query** for efficient server state management
- **React Hook Form** + **Zod** for form validation
- **Vite** for fast development and building

### Backend
- **Express.js** with TypeScript for API development
- **Passport.js** for authentication (session-based)
- **PostgreSQL** with **Drizzle ORM** for data persistence
- **Redis** for session storage (production)
- **Playwright**: Browser automation for CAQH integration
- **Rate limiting** and comprehensive security middleware

### External Integrations
- **Stripe**: Payment processing, card issuing, and business banking
- **Anthropic Claude**: AI-powered CV parsing and content generation
- **Gmail SMTP**: Email notifications and communications
- **PDF Generation**: Dynamic document and report generation
- **Browserbase**: Cloud browser infrastructure for CAQH provider enrollment automation
- **Cloudflare R2**: S3-compatible object storage for PHI files and database backups
- **Neon Database**: Serverless PostgreSQL with HIPAA compliance and BAA support

## 📋 Prerequisites

- Node.js 20.x or higher
- PostgreSQL 16.x (or Neon Database account)
- Redis (for production)
- Stripe Account (for payments and card issuing)
- System libraries for native modules (see Troubleshooting below)
- Cloudflare R2 Account (optional, for file storage and backups)
- Browserbase Account (optional, for CAQH autofill feature)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Loma-Health/loma-org.git
   cd loma-org
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp env.development .env
   ```
   
   Configure the following in `.env`:
   ```env
   # Node Environment
   NODE_ENV=development
   
   # Database (Required) - Use Neon PostgreSQL or local PostgreSQL
   DATABASE_URL=postgresql://username:password@localhost:5432/loma_db
   
   # Feature Flags
   USE_HIPAA_SCHEMA=true
   ENABLE_HIPAA_ROUTES=true
   ENABLE_HIPAA_ENCRYPTION=true
   ENABLE_HIPAA_AUDIT_LOGGING=true
   
   # Session Storage (Optional for development, required for production)
   REDIS_URL=redis://localhost:6379
   SESSION_SECRET=your-super-secret-session-key-change-in-production
   
   # PHI Encryption (Required) - Must be 32 characters
   PHI_ENCRYPTION_KEY=your-32-character-encryption-key
   
   # Stripe (Required for payment features)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Email (Optional)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@yourdomain.com
   
   # AI Integration (Optional)
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   HUGGINGFACE_API_KEY=hf_...
   
   # Cloudflare R2 Storage (Optional - for file storage and backups)
   CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
   CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
   CLOUDFLARE_R2_BUCKET_FILES=loma-phi-files
   CLOUDFLARE_R2_BUCKET_BACKUPS=loma-db-backups
   
   # Browserbase (Optional - for CAQH autofill)
   BROWSERBASE_API_KEY=your-api-key
   BROWSERBASE_PROJECT_ID=your-project-id
   EXPERIMENT_CAQH_AUTOFILL=false
   
   # Application
   BASE_URL=http://localhost:5000
   
   # Render Integration (Optional - for production monitoring)
   RENDER_SERVICE_ID=your-service-id
   RENDER_WORKSPACE_ID=your-workspace-id
   
   # Security
   CSRF_SECRET=your-csrf-secret-key
   ```

### Feature Flags

Several features can be controlled via environment variables:

- **`EXPERIMENT_CAQH_AUTOFILL`**: Enable CAQH provider enrollment autofill (experimental feature)
- **`USE_HIPAA_SCHEMA`**: Use HIPAA-compliant database schema (required for production)
- **`ENABLE_HIPAA_ROUTES`**: Enable HIPAA-specific API routes
- **`ENABLE_HIPAA_ENCRYPTION`**: Enable PHI encryption (required for production)
- **`ENABLE_HIPAA_AUDIT_LOGGING`**: Enable comprehensive audit logging for all PHI access

All HIPAA-related flags should be set to `true` in production environments to ensure compliance.

4. **Set up the database**
   ```bash
   # Push the HIPAA-compliant schema to your database
   npm run db:hipaa:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

### Development Server Management

**Restart the dev server reliably:**
```bash
npm run dev:restart
```

This helper script:
- Cleanly kills existing server processes
- Clears logs
- Starts a fresh server
- Waits for health check before returning

**View live logs:**
```bash
tail -f dev.log
```

**Manually stop the server:**
```bash
pkill -f "tsx server/start.ts"
```

### Quick Setup Script
Alternatively, use the provided setup script:
```bash
./scripts/setup/setup-dev-quick.sh
```

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── lib/           # Utility functions
│   │   └── hooks/         # Custom React hooks
├── server/                 # Backend Express application
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic services
│   └── utils/             # Server utilities
├── db/                    # Database schema and migrations
├── docs/                  # Documentation
└── tests/                 # Test files
```

## 🔐 Security Features

- **PHI Encryption**: All Protected Health Information encrypted at rest
- **Audit Logging**: Comprehensive audit trail for compliance
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Headers**: Security-first HTTP headers
- **Device Trust**: Trusted device management for enhanced security

## 🏥 HIPAA Compliance

This platform is designed with HIPAA compliance in mind:
- All PHI is encrypted using AES-256-GCM encryption
- Comprehensive audit logging of all data access
- Secure user authentication and session management
- Regular security assessments and updates
- Business Associate Agreement (BAA) support with hosting providers

## 📊 Business Intelligence

- **Financial Analytics**: Revenue tracking and expense analysis
- **Tax Optimization**: Automated tax deductible expense categorization
- **Practice Insights**: Session analytics and client engagement metrics
- **Customizable Reports**: Export capabilities for accounting and compliance

## 🚀 Deployment

The application is optimized for deployment on:
- **Render** (recommended, with `render.yaml` configuration included)
- **Google Cloud Run**
- **AWS ECS**
- **Heroku**
- Any containerized hosting platform

See the [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions and the [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) for pre-deployment verification.

Environment-specific configurations are managed through environment variables.

## 📚 Documentation

Comprehensive documentation is available for developers:

### Core Documentation
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete developer onboarding and architecture overview
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation with examples
- **[HIPAA Compliance](./HIPAA_COMPLIANCE.md)** - HIPAA compliance guide and PHI encryption details
- **[AI Integration](./AI_INTEGRATION.md)** - AI features and validation system documentation
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### Additional Resources
- **[How to Restart Dev App](./HOW_TO_RESTART_DEV_APP.md)** - Troubleshooting development environment
- **[Architecture Documentation](./docs/architecture/)** - Architecture improvements and naming conventions
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification steps
- **[CAQH Integration](./docs/caqh/)** - CAQH autofill setup and data dictionary

### Quick Links
- **Database Schema**: See `db/schema-hipaa-refactored.ts` for the complete data model
- **Setup Scripts**: Check `scripts/setup/` for automated setup helpers
- **Verification Scripts**: Check `scripts/verification/` for testing deployments

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following TypeScript and React best practices
4. Ensure HIPAA compliance for any PHI-related changes
5. Add tests for new functionality
6. Update documentation as needed
7. Submit a pull request with a clear description

### Coding Standards
- **TypeScript**: Use strict typing, avoid `any` types
- **PHI Handling**: Always encrypt PHI fields, use `_encrypted` suffix
- **Naming**: Follow healthcare-specific naming conventions (see `docs/architecture/NAMING_CONVENTIONS.md`)
- **Security**: Never log PHI, always use audit logging for PHI access
- **Testing**: Write tests for business logic, especially security-critical paths

### Testing
```bash
npm run test              # Run unit tests
npm run test:hipaa        # Run HIPAA compliance tests
npm run test:coverage     # Run with coverage
npm run test:e2e          # Run end-to-end tests
```

## 📄 License

This project is licensed under the MIT License.

## 🔧 Troubleshooting

### CV Parser / Canvas Installation Issues

The CV parser feature uses native modules (`canvas`) for OCR fallback. If you encounter errors like "Unable to extract text from PDF" or canvas build failures, install the required system dependencies:

**macOS (Homebrew):**
```bash
brew install cairo pango libpng jpeg giflib librsvg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config
```

**Other Linux:**
Install the equivalent packages for Cairo, Pango, libjpeg, libgif, and librsvg for your distribution.

After installing system dependencies, reinstall npm packages:
```bash
npm install --include=optional
```

**Production (Render):**
The `render-build.sh` script automatically installs these dependencies during deployment. Ensure your `render.yaml` uses: `bash render-build.sh && npm install --include=optional && npm run build`

### Common PDF Parsing Issues

1. **"Unable to extract text from PDF"** - Check server logs for detailed extraction method failures
2. **Canvas build failures** - Install system dependencies listed above
3. **Image-based PDFs fail** - Requires OCR fallback (canvas + tesseract.js), ensure dependencies are installed
4. **Text-based PDFs should work** - Uses pdf-parse library, no system dependencies required

## 🆘 Support

For technical support or questions, please create an issue in this repository or refer to the documentation.

## 📈 Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced AI-powered insights
- [ ] Multi-practice management
- [ ] Telehealth integration
- [ ] Advanced reporting dashboards

---

**Note**: This platform handles Protected Health Information (PHI). Ensure proper security measures and compliance with HIPAA regulations when deploying to production.
