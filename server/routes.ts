import { Router, type Express } from 'express';
import { Server } from 'http';
import { authenticateToken } from './auth-simple';
import { db, getActiveSchema } from '../db';
import { eq } from 'drizzle-orm';
import { usersAuth, therapistProfiles, organizationMemberships } from '@db/schema';

// Core HIPAA-compliant routes
import organizationRoutes from './routes/organizations';
import patientRoutes from './routes/patients';
import therapistRoutes from './routes/therapists';
import clinicalSessionsRoutes from './routes/clinical-sessions';
import patientTreatmentPlansRoutes from './routes/patient-treatment-plans';
import tasksRoutes from './routes/tasks';
import workSchedulesRoutes from './routes/work-schedules';
import calendarBlocksRoutes from './routes/calendar-blocks';
import meetingsRoutes from './routes/meetings';
import aiAssistantRoutes from './routes/ai-assistant';
import medicalCodesRoutes from './routes/medical-codes';
import assessmentsRoutes from './routes/assessments';
import documentsRoutes from './routes/documents';
import invoicesRoutes from './routes/invoices';
import cms1500ClaimsRoutes from './routes/cms1500-claims';

// Essential integrations
import stripeRoutes from './routes/stripe';
import connectRoutes from './routes/connect';
import stripeIssuingRoutes from './routes/stripe-issuing';
import updateConnectCapabilitiesRoutes from './routes/update-connect-capabilities';

// Additional routes
import authRoutes from './routes/auth';
import mfaRoutes from './routes/mfa';
import profileCleanRoutes from './routes/profile';
import notificationsRoutes, { notificationSettingsRouter } from './routes/notifications';
import cvParserRoutes from './routes/cv-parser';
import cacheAdminRoutes from './routes/cache-admin';
import statusRoutes from './routes/status';
import dbDiagnosticRoutes from './routes/db-diagnostic';
import experimentsCaqhRoutes from './routes/experiments-caqh';

export function registerRoutes(app: Express): Server {
  const apiRouter = Router();

  // Main user endpoint for authentication system
  apiRouter.get('/user', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const [user] = await db
        .select()
        .from(usersAuth)
        .where(eq(usersAuth.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get therapist profile
      let therapistProfile = null;
      try {
        const [profile] = await db
          .select()
          .from(therapistProfiles)
          .where(eq(therapistProfiles.userId, userId))
          .limit(1);
        therapistProfile = profile;
      } catch (error) {
        // Profile not found - this is OK
      }

      // Get organization membership with organization data
      let organizationMembership = null;
      try {
        organizationMembership = await db.query.organizationMemberships.findFirst({
          where: eq(organizationMemberships.userId, userId),
          with: {
            organization: true
          }
        });
      } catch (error) {
        // Organization membership not found - this is OK
      }

      // Build complete user object with organization data
      const completeUser = {
        ...user,
        name: therapistProfile?.name || user.username,
        title: therapistProfile?.professionalTitle || null,
        license: therapistProfile?.licenseNumber || null,
        specialties: therapistProfile?.specialties || null,
        organizationId: organizationMembership?.organizationId || null,
        organizationMembershipId: organizationMembership?.id || null,
        organizationMembership: organizationMembership ? {
          ...organizationMembership,
          organization: organizationMembership.organization
        } : null
      };

      res.json(completeUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User profile endpoint - Redirected to consolidated profile-clean endpoint
  apiRouter.get('/user/profile', authenticateToken, async (req, res) => {
    // Redirect to the consolidated profile endpoint
    res.redirect('/api/profile');
  });

  // User profile update endpoint - Redirected to consolidated profile-clean endpoint
  apiRouter.put('/user/profile', authenticateToken, async (req, res) => {
    // Redirect to the consolidated profile endpoint
    res.redirect(307, '/api/profile'); // 307 preserves the PUT method
  });

  // User info endpoint for SessionNotes component
  apiRouter.get('/user-info', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const schema = getActiveSchema();
      let user: any = null;
      
      // Use only HIPAA schema
      const [userAuth] = await db
        .select()
        .from(usersAuth)
        .where(eq(usersAuth.id, userId))
        .limit(1);
      user = userAuth;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Authentication routes (must be first, no auth required)
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/mfa', mfaRoutes); // MFA routes for HIPAA 1.4.4 compliance
  // Build/health status
  apiRouter.use('/status', statusRoutes);
  // Database diagnostics (no auth for debugging production issues)
  apiRouter.use('/db-diagnostic', dbDiagnosticRoutes);
  // Experiments (feature-flag gated)
  apiRouter.use('/experiments/caqh', experimentsCaqhRoutes);

  // Core HIPAA-compliant routes
  apiRouter.use('/organizations', authenticateToken, organizationRoutes);
  apiRouter.use('/patients', authenticateToken, patientRoutes);
  apiRouter.use('/therapists', authenticateToken, therapistRoutes);
  apiRouter.use('/clinical-sessions', authenticateToken, clinicalSessionsRoutes);
  apiRouter.use('/patient-treatment-plans', authenticateToken, patientTreatmentPlansRoutes);

  // Task management
  apiRouter.use('/tasks', authenticateToken, tasksRoutes);
  
  // Task categories - simple endpoint for now
  apiRouter.get('/task-categories', authenticateToken, (req, res) => {
    const categories = [
      {
        id: 1,
        name: 'Clinical',
        color: '#3b82f6',
        isDefault: true
      },
      {
        id: 2,
        name: 'Administrative',
        color: '#8b5cf6',
        isDefault: true
      },
      {
        id: 3,
        name: 'Follow-up',
        color: '#10b981',
        isDefault: true
      },
      {
        id: 4,
        name: 'Documentation',
        color: '#f59e0b',
        isDefault: true
      },
      {
        id: 5,
        name: 'Billing',
        color: '#ef4444',
        isDefault: true
      }
    ];
    res.json(categories);
  });

  // Work schedules
  apiRouter.use('/work-schedules', authenticateToken, workSchedulesRoutes);

  // Calendar blocks
  apiRouter.use('/calendar/blocks', authenticateToken, calendarBlocksRoutes);

  // Meetings
  apiRouter.use('/meetings', authenticateToken, meetingsRoutes);

  // AI assistant
  apiRouter.use('/ai-assistant', authenticateToken, aiAssistantRoutes);

  // Medical codes and assessments
  apiRouter.use('/medical-codes', medicalCodesRoutes);
  apiRouter.use('/assessments', assessmentsRoutes);
  
  // Document management
  apiRouter.use('/documents', authenticateToken, documentsRoutes);
  apiRouter.use('/document-templates', authenticateToken, documentsRoutes);

  // Billing routes
  apiRouter.use('/invoices', authenticateToken, invoicesRoutes);
  apiRouter.use('/cms1500-claims', authenticateToken, cms1500ClaimsRoutes);
  apiRouter.use('/cms1500-validation', authenticateToken, cms1500ClaimsRoutes);
  apiRouter.use('/cms1500-pdf', authenticateToken, cms1500ClaimsRoutes);

  // Essential integrations
  apiRouter.use('/stripe', stripeRoutes); // Stripe webhook must be public (no auth required)
  apiRouter.use('/connect', authenticateToken, connectRoutes);
  apiRouter.use('/stripe-issuing', authenticateToken, stripeIssuingRoutes);
  apiRouter.use('/stripe-connect-capabilities', authenticateToken, updateConnectCapabilitiesRoutes);

  // Profile management - using profile-clean as the single source of truth
  apiRouter.use('/profile', profileCleanRoutes); // Remove authenticateToken from here
  apiRouter.use('/profile-clean', profileCleanRoutes);
  
  // CV Parser for credentialing
  apiRouter.use('/cv-parser', cvParserRoutes);
  
  // Notifications
  apiRouter.use('/notifications', authenticateToken, notificationsRoutes);
  apiRouter.use('/notification-settings', notificationSettingsRouter);
  
  // Cache administration (business_owner only)
  apiRouter.use('/admin/cache', cacheAdminRoutes);

  // Mount the API router
  app.use('/api', apiRouter);

  // Create and return the HTTP server
  return new Server(app);
}