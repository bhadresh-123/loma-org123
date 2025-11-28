import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { db } from '../../db';
import { therapistProfiles, therapistPHI } from '@db/schema';
import { eq } from 'drizzle-orm';

// Session status tracking
const sessionStatus = new Map<string, {
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  startedAt: Date;
  lastUpdate: Date;
  error?: string;
}>();

export function updateSessionStatus(
  sessionId: string, 
  status: 'pending' | 'running' | 'completed' | 'failed',
  message: string,
  error?: string
) {
  const existing = sessionStatus.get(sessionId);
  sessionStatus.set(sessionId, {
    status,
    message,
    startedAt: existing?.startedAt || new Date(),
    lastUpdate: new Date(),
    error
  });
  console.log(`[CAQH Status] ${sessionId}: ${status} - ${message}`, error ? `Error: ${error}` : '');
}

// Lazy import to avoid bundling when flag is off
async function startSession() {
  const mod = await import('../../apps/caqh-autofill/src/start-session.js');
  return mod.startBrowserbaseSession();
}
async function runOnSession(sessionId: string, cvData: any) {
  const mod = await import('../../apps/caqh-autofill/src/runner.js');
  return mod.runAutofillOnSession(sessionId, cvData);
}

const router = Router();

router.post('/start', authenticateToken, async (req, res) => {
  try {
    if (process.env.EXPERIMENT_CAQH_AUTOFILL !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }

    const { user } = req as any;
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const { cvData } = req.body;
    
    if (!cvData) {
      return res.status(400).json({ error: 'Missing CV data' });
    }

    console.log('[CAQH] Starting session for user', user.id, 'with', cvData.education?.length || 0, 'education entries and', cvData.workExperience?.length || 0, 'work entries');

    if (!db) {
      console.error('[CAQH] Database not initialized');
      return res.status(500).json({ error: 'Database not available' });
    }

    // Fetch therapist profile to get personal information
    console.log('[CAQH] Fetching therapist profile for personal information');
    const [therapistProfile] = await db
      .select()
      .from(therapistProfiles)
      .where(eq(therapistProfiles.userId, user.id))
      .limit(1);

    if (!therapistProfile) {
      console.warn('[CAQH] Therapist profile not found, proceeding with CV data only');
    }

    // Combine therapist profile with CV data
    // Note: DOB is encrypted in therapistPHI and would require decryption service
    // For demo purposes, we'll use hardcoded demo data to ensure all required fields are filled
    
    // Use demo data as fallbacks for missing fields
    const demoData = {
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@lomademo.com',
      phone: '(555) 123-4567',
      address: '123 Main Street, Suite 200',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      dateOfBirth: '01/15/1985', // Demo DOB in MM/DD/YYYY format
      npiNumber: '1234567890',
      licenseNumber: 'PSY12345',
      licenseState: 'CA',
    };
    
    const enrichedCvData = {
      ...cvData,
      personalInfo: {
        name: therapistProfile?.name || demoData.name,
        email: therapistProfile?.therapistBusinessEmail || demoData.email,
        phone: therapistProfile?.therapistBusinessPhone || demoData.phone,
        address: therapistProfile?.therapistBusinessAddress || demoData.address,
        city: therapistProfile?.therapistBusinessCity || demoData.city,
        state: therapistProfile?.therapistBusinessState || demoData.state,
        zipCode: therapistProfile?.therapistBusinessZip || demoData.zipCode,
        dateOfBirth: demoData.dateOfBirth, // Use demo DOB (encrypted PHI not accessible)
      },
      licenses: [{
        state: therapistProfile?.licenseState || demoData.licenseState,
        number: therapistProfile?.licenseNumber || demoData.licenseNumber,
        type: 'Professional License',
      }],
      certifications: [
        {
          name: 'NPI',
          number: therapistProfile?.npiNumber || demoData.npiNumber,
        },
        therapistProfile?.taxonomyCode ? {
          name: 'Taxonomy Code',
          number: therapistProfile.taxonomyCode,
        } : null,
      ].filter(Boolean),
    };

    console.log('[CAQH] Enriched CV data with therapist profile information');

    // Create Browserbase session and navigate to registration page
    const session = await startSession();
    
    console.log('[CAQH] Session created', session.sessionId, 'Live View:', session.liveViewUrl);

    // Initialize status tracking
    updateSessionStatus(session.sessionId, 'pending', 'Session created, starting autofill...');

    // Start background autofill process (fire-and-forget)
    // This will fill the registration form with the enriched data
    runOnSession(session.sessionId, enrichedCvData)
      .then(() => {
        console.log('[CAQH] Autofill completed successfully for session', session.sessionId);
        updateSessionStatus(session.sessionId, 'completed', 'Form autofill completed successfully');
      })
      .catch((err) => {
        console.error('[CAQH] Autofill failed for session', session.sessionId, err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        updateSessionStatus(session.sessionId, 'failed', 'Autofill process failed', errorMsg);
      });

    return res.json({ 
      liveViewUrl: session.liveViewUrl, 
      sessionId: session.sessionId 
    });
  } catch (err) {
    console.error('[CAQH] start error', err);
    // Return detailed error message for debugging
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('[CAQH] Error details:', { message: errorMessage, stack: errorStack });
    return res.status(500).json({ 
      error: 'Failed to start CAQH session', 
      details: errorMessage 
    });
  }
});

// Status endpoint to check autofill progress
router.get('/status/:sessionId', authenticateToken, async (req, res) => {
  try {
    if (process.env.EXPERIMENT_CAQH_AUTOFILL !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }

    const { sessionId } = req.params;
    const status = sessionStatus.get(sessionId);

    if (!status) {
      return res.json({
        status: 'unknown',
        message: 'No status information found for this session. It may not have started yet.',
        sessionId
      });
    }

    return res.json({
      sessionId,
      ...status,
      timeElapsed: Date.now() - status.startedAt.getTime(),
      timeSinceLastUpdate: Date.now() - status.lastUpdate.getTime()
    });
  } catch (err) {
    console.error('[CAQH Status] Error fetching status:', err);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Cleanup old sessions (older than 2 hours)
setInterval(() => {
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  for (const [sessionId, status] of Array.from(sessionStatus.entries())) {
    if (status.startedAt.getTime() < twoHoursAgo) {
      sessionStatus.delete(sessionId);
      console.log(`[CAQH Status] Cleaned up old session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

export default router;

