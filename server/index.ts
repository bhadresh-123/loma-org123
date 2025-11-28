#!/usr/bin/env node

/**
 * Cold Start Optimization Script
 * 
 * Creates optimized server startup configuration for Render
 * 
 * Note: Environment should be loaded in start.ts before this file is imported
 */

import express, { type Request, Response, NextFunction } from "express";
import { getEnvironmentConfig } from './utils/environment';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuthRoutes } from "./auth-simple";
import cookieParser from "cookie-parser";
import { eq, sql } from "drizzle-orm";

// Consolidated middleware imports
import { coreSecurityMiddleware } from "./middleware/core-security";
import { authMiddleware } from "./middleware/authentication";
import { phiProtectionMiddleware } from "./middleware/phi-protection";
import { auditMiddleware } from "./middleware/audit-logging";
import { errorHandlingMiddleware } from "./middleware/error-handling";
import { aiMonitor } from "./services/AIServiceMonitor";

const app = express();

// Enable trust proxy for Render/proxies (MUST be before rate limiting)
app.set('trust proxy', true);

// OPTIMIZATION 1: Lazy load heavy dependencies
let scheduledTasksInitialized = false;
let emailTransporterInitialized = false;

// Build info logging (once at startup)
try {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const file = path.resolve(process.cwd(), '.build-info.json');
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    const info = JSON.parse(raw);
    log(`Build commit ${info.commit} @ ${info.buildTime}`);
  } else if (process.env.GIT_COMMIT) {
    log(`Build commit ${process.env.GIT_COMMIT}`);
  }
} catch {
  // ignore logging errors
}

// CONSOLIDATED MIDDLEWARE STACK - No duplicates, clear ownership
// 1. Error handling & request tracking
app.use(auditMiddleware.requestIdMiddleware);

// 2. Core security (HTTPS, headers, input sanitization)
app.use(coreSecurityMiddleware.enforceHTTPS);
app.use(coreSecurityMiddleware.helmetSecurityHeaders()); // Helmet provides comprehensive security headers
app.use(coreSecurityMiddleware.preventSQLInjection);
app.use(coreSecurityMiddleware.preventXSS);
app.use(coreSecurityMiddleware.requestSizeLimit);
app.use(cookieParser());

// 3. PHI protection for all requests (anonymizes PHI in AI requests)
app.use(phiProtectionMiddleware.protectAIRequests);

// 4. Security logging
app.use(auditMiddleware.securityLoggingMiddleware);

// 5. Rate limiting (applied to specific routes)
app.use('/api/auth/login', coreSecurityMiddleware.rateLimits.auth);
app.use('/api/auth/register', coreSecurityMiddleware.rateLimits.auth);
app.use('/api/auth/logout', coreSecurityMiddleware.rateLimits.auth);
app.use('/api', coreSecurityMiddleware.rateLimits.api);

// OPTIMIZATION 3: Defer heavy middleware until needed
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use((req, res, next) => {
  if (req.path !== '/api/stripe/webhook') {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    (req as Request & { rawBody?: unknown }).rawBody = req.body;
    next();
  }
});

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// OPTIMIZATION 4: Setup auth with minimal overhead
setupAuthRoutes(app);

// 6. User context middleware for database RLS
app.use('/api', (req, res, next) => {
  if (req.path === '/stripe/webhook') {
    next();
  } else {
    authMiddleware.setUserContext(req, res, next);
  }
});

app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// OPTIMIZATION 6: Simplified logging for faster startup
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") && duration > 100) { // Only log slow requests
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// OPTIMIZATION 7: Health check endpoint for Render
app.get('/health', async (req, res) => {
  try {
    const { getSystemStatus } = await import('./utils/startup-validation.js');
    const systemStatus = await getSystemStatus();
    
    const isHealthy = systemStatus.database.connected && 
                     systemStatus.database.schemaValid &&
                     systemStatus.encryption.valid;
    
    res.status(isHealthy ? 200 : 503).json({ 
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...systemStatus
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
});

// AI HEALTH MONITORING: Comprehensive AI service health checks
// Note: AI routes are registered through registerRoutes() in routes.ts

(async () => {
  try {
    // CRITICAL: Validate compliance before starting server
    if (!auditMiddleware.validateComplianceOnStartup()) {
      console.error('🚨 CRITICAL: System cannot start - HIPAA compliance validation failed');
      process.exit(1);
    }
    
    // SECURITY ENHANCEMENT: Setup error boundary
    errorHandlingMiddleware.setupErrorBoundary();
    
    // OPTIMIZATION 8: Register routes with minimal oversight
    const server = registerRoutes(app);
    
    // AUTO-MIGRATION: Ensure CV parser tables exist
    (async () => {
      try {
        const { db, queryClient } = await import('@db');
        if (db && queryClient) {
          // Check if cv_parser_education table exists
          const tableCheck = await queryClient`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'cv_parser_education'
            ) as table_exists
          `;
          
          const tableExists = tableCheck[0]?.table_exists;
          
          if (!tableExists) {
            console.log('🔧 CV parser tables not found, creating them...');
            // Create cv_parser_education table
            await queryClient`
              CREATE TABLE IF NOT EXISTS "cv_parser_education" (
                "id" SERIAL PRIMARY KEY,
                "user_id" INTEGER NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
                "university" TEXT NOT NULL,
                "degree" TEXT NOT NULL,
                "major" TEXT NOT NULL,
                "start_date" TIMESTAMP,
                "end_date" TIMESTAMP,
                "graduation_date" TIMESTAMP,
                "gpa" TEXT,
                "honors" TEXT,
                "is_verified" BOOLEAN DEFAULT false,
                "created_at" TIMESTAMP DEFAULT NOW(),
                "updated_at" TIMESTAMP DEFAULT NOW()
              )
            `;
            
            // Create cv_parser_work_experience table
            await queryClient`
              CREATE TABLE IF NOT EXISTS "cv_parser_work_experience" (
                "id" SERIAL PRIMARY KEY,
                "user_id" INTEGER NOT NULL REFERENCES "users_auth"("id") ON DELETE CASCADE,
                "organization" TEXT NOT NULL,
                "position" TEXT NOT NULL,
                "location" TEXT,
                "start_date" TIMESTAMP,
                "end_date" TIMESTAMP,
                "is_current" BOOLEAN DEFAULT false,
                "description" TEXT,
                "responsibilities" JSONB,
                "achievements" JSONB,
                "is_verified" BOOLEAN DEFAULT false,
                "created_at" TIMESTAMP DEFAULT NOW(),
                "updated_at" TIMESTAMP DEFAULT NOW()
              )
            `;
            
            // Create indexes
            await queryClient`CREATE INDEX IF NOT EXISTS "idx_cv_parser_education_user_id" ON "cv_parser_education"("user_id")`;
            await queryClient`CREATE INDEX IF NOT EXISTS "idx_cv_parser_work_experience_user_id" ON "cv_parser_work_experience"("user_id")`;
            
            console.log('✅ CV parser tables created successfully');
          }
        }
      } catch (error) {
        console.error('⚠️  CV parser migration check failed:', error);
        // Don't fail server startup if migration fails
      }
    })();
    
    // Global error handlers (must be after all routes)
    app.use(errorHandlingMiddleware.errorHandler);

    // Development-only test/diagnostic endpoints
    if (process.env.NODE_ENV === 'development') {
      log('🔧 [DEV] Registering development-only test endpoints');
      
      app.get('/api/test/schema', async (req, res) => {
      const { getActiveSchema } = await import('@db');
      const schema = getActiveSchema();
      res.json({
        useHIPAASchema: process.env.USE_HIPAA_SCHEMA,
        schemaType: schema.isHIPAASchema ? 'hipaa' : 'standard',
        availableTables: Object.keys(schema).filter(key => schema[key] !== null),
        hasOrganizations: !!schema.organizations,
        hasPatients: !!schema.patients,
        hasClinicalSessions: !!schema.clinicalSessions
      });
    });

    // Quick diagnostic endpoint for 500 errors
    app.get('/api/test/health', async (req, res) => {
      try {
        const { db, queryClient, getActiveSchema } = await import('@db');
        const schema = getActiveSchema();
        
        const health = {
          status: 'ok',
          database: 'connected',
          schema: {
            type: schema.isHIPAASchema ? 'hipaa' : 'standard',
            availableTables: Object.keys(schema).filter(key => schema[key] !== null)
          },
          tables: {
            usersAuth: !!schema.usersAuth,
            organizations: !!schema.organizations,
            organizationMemberships: !!schema.organizationMemberships,
            therapistProfiles: !!schema.therapistProfiles,
            therapistPHI: !!schema.therapistPHI,
            patients: !!schema.patients
          }
        };

        // Test basic database connectivity
        try {
          if (queryClient) {
            await queryClient`SELECT 1 as test`;
          } else {
            throw new Error('Query client is not available');
          }
          health.database = 'connected';
        } catch (error) {
          health.database = 'error';
          health.databaseError = error.message;
          health.status = 'error';
        }

        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          database: 'error',
          error: error.message
        });
      }
    });

    // Comprehensive database diagnostic endpoint
    app.get('/api/diagnostic/database', async (req, res) => {
      try {
        const { db, getActiveSchema } = await import('@db');
        const schema = getActiveSchema();
        
        if (!db) {
          return res.json({
            status: 'error',
            message: 'Database not connected',
            database: 'disconnected'
          });
        }

        // Test each HIPAA table
        const tableChecks = {};
        const tables = [
          'organizations', 
          'organizationMemberships', 
          'patients', 
          'clinicalSessions', 
          'usersAuth', 
          'therapistProfiles',
          'therapistPHI',
          'patientTreatmentPlans',
          'auditLogs'
        ];
        
        for (const tableName of tables) {
          try {
            const table = schema[tableName];
            if (table) {
              // Try to query the table
              await db.select().from(table).limit(1);
              tableChecks[tableName] = {
                status: 'EXISTS',
                defined: true,
                accessible: true
              };
            } else {
              tableChecks[tableName] = {
                status: 'NOT_DEFINED',
                defined: false,
                accessible: false
              };
            }
          } catch (error) {
            tableChecks[tableName] = {
              status: 'ERROR',
              defined: !!schema[tableName],
              accessible: false,
              error: error.message
            };
          }
        }

        // Test PHI encryption
        let encryptionStatus = 'UNKNOWN';
        try {
          const { encryptPHI } = await import('./utils/phi-encryption');
          const testEncryption = encryptPHI('test');
          encryptionStatus = testEncryption ? 'WORKING' : 'FAILED';
        } catch (error) {
          encryptionStatus = `ERROR: ${error.message}`;
        }

        res.json({
          status: 'success',
          timestamp: new Date().toISOString(),
          environment: {
            NODE_ENV: process.env.NODE_ENV,
            USE_HIPAA_SCHEMA: process.env.USE_HIPAA_SCHEMA,
            PHI_ENCRYPTION_KEY: process.env.PHI_ENCRYPTION_KEY ? 'SET' : 'MISSING',
            DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING'
          },
          schema: {
            type: schema.isHIPAASchema ? 'hipaa' : 'standard',
            isHIPAASchema: schema.isHIPAASchema,
            availableTables: Object.keys(schema).filter(key => schema[key] !== null)
          },
          database: {
            connected: true,
            type: 'postgresql'
          },
          encryption: {
            status: encryptionStatus,
            keyConfigured: !!process.env.PHI_ENCRYPTION_KEY
          },
          tableChecks
        });
      } catch (error) {
        res.json({
          status: 'error',
          message: 'Diagnostic failed',
          error: error.message,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
      }
    });

    // Test registration endpoint with detailed error logging
    app.post('/api/test/register-detailed', async (req, res) => {
      try {
        const { username, password, name, title, license, specialties, email, practiceName } = req.body;
        
        // Check database connection
        const { db, getActiveSchema } = await import('@db');
        const schema = getActiveSchema();
        
        if (!db) {
          return res.json({ error: 'Database not connected' });
        }

        // Validate required fields
        if (!username || !password || !name) {
          return res.json({
            error: 'INVALID_INPUT',
            message: 'Username, password and name are required'
          });
        }

        // Check if user already exists
        const existingUsers = await db
          .select()
          .from(schema.usersAuth)
          .where(eq(schema.usersAuth.username, username))
          .limit(1);
        
        if (existingUsers.length > 0) {
          return res.json({
            error: 'USER_EXISTS',
            message: 'Username already exists'
          });
        }

        // Hash the password
        console.log('Hashing password...');
        const { encryptPHI } = await import('./utils/phi-encryption');
        const { scrypt, randomBytes, timingSafeEqual } = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(scrypt);
        
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        const hashedPassword = `${buf.toString("hex")}.${salt}`;
        console.log('Password hashed successfully');

        let newUser: Record<string, unknown>;

        console.log('Creating auth user...');
        // HIPAA schema: Create user in users_auth and therapist_profiles, then create organization
        const [authUser] = await db
          .insert(schema.usersAuth)
          .values({
            username,
            password: hashedPassword,
            email: email || '',
            accountStatus: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('Auth user created:', authUser);

        if (!authUser) {
          throw new Error("Failed to create auth user");
        }

        console.log('Creating therapist profile...');
        // Create therapist profile
        const [profile] = await db
          .insert(schema.therapistProfiles)
          .values({
            userId: authUser.id,
            name,
            title: title || null,
            licenseNumber: license || null,
            specialties: specialties ? JSON.parse(specialties) : [],
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('Therapist profile created:', profile);

        console.log('Creating organization...');
        // Create solo organization for the therapist
        const [organization] = await db
          .insert(schema.organizations)
          .values({
            name: practiceName,
            type: 'solo',
            organizationBusinessEinEncrypted: null,
            organizationBusinessAddress: null,
            organizationBusinessCity: null,
            organizationBusinessState: null,
            organizationBusinessZip: null,
            organizationBusinessPhone: null,
            organizationBusinessEmail: email || null,
            defaultSessionDuration: 50,
            timezone: 'America/New_York',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('Organization created:', organization);

        if (!organization) {
          throw new Error("Failed to create organization");
        }

        console.log('Creating organization membership...');
        // Create organization membership with business_owner role
        const [membership] = await db
          .insert(schema.organizationMemberships)
          .values({
            organizationId: organization.id,
            userId: authUser.id,
            role: 'business_owner',
            canViewAllPatients: true,
            canViewAllCalendars: true,
            canManageBilling: true,
            canManageStaff: true,
            canManageSettings: true,
            canCreatePatients: true,
            employmentStartDate: new Date(),
            employmentEndDate: null,
            isActive: true,
            isPrimaryOwner: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('Organization membership created:', membership);

        if (!membership) {
          throw new Error("Failed to create organization membership");
        }

        // Combine auth and profile data
        newUser = {
          ...authUser,
          ...profile,
          // Map profile fields to expected user fields
          name: profile?.name || authUser.username,
          title: profile?.title,
          license: profile?.licenseNumber,
          specialties: profile?.specialties,
          organizationId: organization.id,
          organizationMembershipId: membership.id
        };

        const { password: _, ...userWithoutPassword } = newUser;
        
        console.log('=== REGISTRATION SUCCESS ===');
        res.json({
          success: true,
          message: 'Registration successful',
          user: userWithoutPassword
        });
      } catch (error) {
        console.error('=== REGISTRATION ERROR ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        res.json({
          error: 'REGISTRATION_FAILED',
          message: error.message,
          details: error.stack
        });
      }
    });

    // Test registration endpoint (public for debugging)
    app.post('/api/test/registration', async (req, res) => {
      try {
        const { username, password, name, email } = req.body;
        
        // Test database connection
        const { db } = await import('@db');
        if (!db) {
          return res.json({ error: 'Database not connected' });
        }

        // Test schema
        const { getActiveSchema } = await import('@db');
        const schema = getActiveSchema();
        
        // Test encryption
        const { encryptPHI } = await import('./utils/phi-encryption');
        const testEncryption = encryptPHI('test');
        
        res.json({
          status: 'success',
          database: 'connected',
          schema: schema.isHIPAASchema ? 'hipaa' : 'standard',
          encryption: testEncryption ? 'working' : 'failed',
          organizationTest: 'ready',
          tables: {
            organizations: !!schema.organizations,
            patients: !!schema.patients,
            clinicalSessions: !!schema.clinicalSessions
          }
        });
      } catch (error) {
        res.json({
          status: 'error',
          error: error.message,
          stack: error.stack
        });
      }
    });
    } // End development-only endpoints

    app.use('/api/*', (_req: Request, res: Response) => {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "API endpoint not found"
      });
    });

    // OPTIMIZATION 9: Setup Vite with caching
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    const PORT = parseInt(process.env.PORT || "5000");

    const startServer = (port: number) => {
      server.listen(port, "0.0.0.0", async () => {
        log(`Server running on port ${port}`);
        
        // Start compliance monitoring
        auditMiddleware.monitorComplianceStatus();
        log('✅ HIPAA compliance monitoring started');
        
        // OPTIMIZATION 10: Initialize heavy services in background
        setTimeout(async () => {
          try {
            if (!emailTransporterInitialized) {
              const { initEmailTransporter } = await import("./services/email");
              await initEmailTransporter();
              emailTransporterInitialized = true;
              log('Email transporter initialized');
            }
          } catch (error) {
            log(`Email transporter initialization failed: ${error}`);
          }
        }, 1000);

        // OPTIMIZATION 11: Initialize scheduled tasks in background
        setTimeout(() => {
          if (!scheduledTasksInitialized) {
            setupScheduledTasks();
            scheduledTasksInitialized = true;
          }
        }, 2000);
      }).on('error', (e: Error & { code?: string }) => {
        if (e.code === 'EADDRINUSE' && port === PORT) {
          log(`Port ${port} is busy, trying alternative port ${port + 1}...`);
          startServer(port + 1);
        } else {
          log(`Server startup error: ${e.message}`);
          process.exit(1);
        }
      });
    };
    
    // OPTIMIZATION 12: Lazy load scheduled tasks
    const setupScheduledTasks = async () => {
      try {
        const { 
          createSessionNoteTasksForCompletedSessions, 
          resolveCompletedSessionNoteTasks, 
          createIntakeDocumentTasks,
          createInvoiceTasksForCompletedSessions,
          resolveCompletedInvoiceTasks,
          enforceAuditLogRetention
        } = await import("./services/scheduledTasks");
        
        const { createSessionReminderNotifications } = await import("./services/sessionReminderService");
        
        // Run immediately
        await runScheduledTasks();
        
        // Then run every hour
        setInterval(() => {
          runScheduledTasks();
        }, 3600000);
        
        log('Scheduled tasks service initialized');
      } catch (error) {
        log(`Scheduled tasks initialization failed: ${error}`);
      }
    };
    
    const runScheduledTasks = async () => {
      try {
        // Scheduled tasks run for all environments
        log('Scheduled tasks enabled for PostgreSQL');
        
        log('Running scheduled tasks...');
        
        const { createSessionReminderNotifications } = await import("./services/sessionReminderService");
        const { 
          createSessionNoteTasksForCompletedSessions, 
          resolveCompletedSessionNoteTasks, 
          createIntakeDocumentTasks,
          createInvoiceTasksForCompletedSessions,
          resolveCompletedInvoiceTasks,
          enforceAuditLogRetention
        } = await import("./services/scheduledTasks");
        
        const sessionReminderResult = await createSessionReminderNotifications();
        log(`Session reminder notifications sent: ${sessionReminderResult.remindersSent || 0}`);
        
        const taskCreationResult = await createSessionNoteTasksForCompletedSessions();
        log(`Session note task creation completed: ${taskCreationResult.createdTasks} tasks created`);
        
        const intakeTaskResult = await createIntakeDocumentTasks();
        log(`Intake document task creation completed: ${intakeTaskResult.createdTasks} tasks created`);
        
        const invoiceTaskResult = await createInvoiceTasksForCompletedSessions();
        log(`Invoice task creation completed: ${invoiceTaskResult.createdTasks} tasks created`);
        
        const sessionTaskResolutionResult = await resolveCompletedSessionNoteTasks();
        log(`Session note task resolution completed: ${sessionTaskResolutionResult.completedTasks} tasks resolved`);
        
        const invoiceTaskResolutionResult = await resolveCompletedInvoiceTasks();
        log(`Invoice task creation completed: ${invoiceTaskResolutionResult.completedTasks} tasks resolved`);
        
        // Run audit retention enforcement (weekly - only run on Sundays)
        const now = new Date();
        if (now.getDay() === 0) { // Sunday
          const auditRetentionResult = await enforceAuditLogRetention();
          if (auditRetentionResult.success) {
            log(`Audit retention enforcement completed: ${auditRetentionResult.stats?.recordsDeleted || 0} records deleted`);
          } else {
            log(`Audit retention enforcement failed: ${auditRetentionResult.error}`);
          }
        }
      } catch (error) {
        log(`Error running scheduled tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    startServer(PORT);
  } catch (error) {
    log(`Server startup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();
