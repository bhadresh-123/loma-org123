import { Router } from 'express';
import { db } from '@db';
import { getActiveSchema } from '@db';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateToken } from '../auth-simple';
import { auditMiddleware } from '../middleware/audit-logging';

const router = Router();

/**
 * CMS-1500 Claims Routes
 * 
 * Note: Currently, CMS-1500 claims are generated on the fly from clinical sessions
 * rather than stored in a separate table. This is a temporary solution until
 * a proper claims table is created.
 */

// Get all CMS-1500 claims for the authenticated user
router.get('/', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!db) {
      return res.json([]); // Return empty array if db not available
    }

    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      return res.json([]); // Return empty array if table not available
    }

    const sessionsTable = schema.clinicalSessions;

    // Fetch clinical sessions that can be billed to insurance using direct query
    const sessions: any[] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.therapistId, userId))
      .orderBy(desc(sessionsTable.date));

    // Transform sessions into CMS-1500 claim format
    // Note: Without patient data, we'll return all sessions and let frontend filter
    const claims = sessions.map((session: any) => {
        // Generate claim number if not exists
        const claimNumber = `CMS-${session.id}-${Date.now().toString().slice(-6)}`;
        
      return {
        id: session.id,
        claimNumber,
        patientId: session.patientId,
        client: {
          id: session.patientId,
          name: 'Patient', // Will be populated by frontend
          billingType: 'insurance',
        },
        dateOfService: session.date,
        chargeAmount: '150.00', // Default amount, should come from session or patient settings
        cptCode: session.cptCode || '90834',
        status: session.isPaid ? 'paid' : 'draft',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    });

    res.json(claims);
  } catch (error) {
    console.error('Error fetching CMS-1500 claims:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single CMS-1500 claim
router.get('/:id', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!db) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const schema = getActiveSchema();
    if (!schema.clinicalSessions) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const sessionsTable = schema.clinicalSessions;

    const [session]: any[] = await db
      .select()
      .from(sessionsTable)
      .where(and(
        eq(sessionsTable.id, parseInt(req.params.id)),
        eq(sessionsTable.therapistId, userId)
      ))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claimNumber = `CMS-${session.id}-${Date.now().toString().slice(-6)}`;
    
    const claim = {
      id: session.id,
      claimNumber,
      patientId: session.patientId,
      client: {
        id: session.patientId,
        name: 'Patient', // Will be populated by frontend
        billingType: 'insurance',
      },
      dateOfService: session.date,
      chargeAmount: '150.00',
      cptCode: session.cptCode || '90834',
      status: session.isPaid ? 'paid' : 'draft',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    res.json(claim);
  } catch (error) {
    console.error('Error fetching CMS-1500 claim:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new CMS-1500 claim
router.post('/', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('CREATE', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try{
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const schema = getActiveSchema();
    if (!schema.clinicalSessions || !schema.patients) {
      return res.status(500).json({ error: 'Required tables not available' });
    }

    const sessionsTable = schema.clinicalSessions;
    const patientsTable = schema.patients;

    const {
      patientId,
      sessionId,
      dateOfService,
      chargeAmount,
      cptCode,
      primaryDiagnosisCode,
      placeOfService,
    } = req.body;

    if (!patientId || !dateOfService) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify patient exists and has insurance billing type
    const [patient]: any[] = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.id, parseInt(patientId)))
      .limit(1);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (patient.billingType !== 'insurance') {
      return res.status(400).json({ 
        error: 'Patient must have insurance billing type for CMS-1500 claims' 
      });
    }

    let session;
    
    if (sessionId) {
      // Use existing session
      const [existingSession]: any[] = await db
        .select()
        .from(sessionsTable)
        .where(and(
          eq(sessionsTable.id, parseInt(sessionId)),
          eq(sessionsTable.therapistId, userId)
        ))
        .limit(1);
      
      session = existingSession;

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Update session with CPT code if provided
      if (cptCode && !session.cptCode) {
        await db.update(sessionsTable)
          .set({ cptCode })
          .where(eq(sessionsTable.id, session.id));
      }
    } else {
      // Create a new session for this claim
      // Get organization from patient
      const [newSession] = await db.insert(sessionsTable).values({
        organizationId: patient.organizationId,
        patientId: parseInt(patientId),
        therapistId: userId,
        date: new Date(dateOfService),
        cptCode: cptCode || '90834',
        status: 'completed',
        type: 'individual',
        duration: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      session = newSession;
    }

    // Generate claim number
    const claimNumber = `CMS-${session.id}-${Date.now().toString().slice(-6)}`;

    const claim = {
      id: session.id,
      claimNumber,
      patientId: parseInt(patientId),
      sessionId: session.id,
      client: {
        id: patient.id,
        name: patient.name,
        billingType: 'insurance',
      },
      dateOfService: session.date,
      chargeAmount: chargeAmount || '150.00',
      cptCode: session.cptCode || cptCode || '90834',
      primaryDiagnosisCode: primaryDiagnosisCode || 'F41.1',
      placeOfService: placeOfService || '11',
      status: 'draft',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    res.status(201).json(claim);
  } catch (error) {
    console.error('Error creating CMS-1500 claim:', error);
    res.status(500).json({ 
      error: 'Failed to create claim',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate CMS-1500 claim data
router.get('/:id/validation', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // For now, return a basic validation response
    // This should be replaced with actual validation logic
    res.json({
      isValid: true,
      missingFields: [],
      recommendations: [],
    });
  } catch (error) {
    console.error('Error validating CMS-1500 claim:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate PDF for CMS-1500 claim
router.get('/:id/pdf', 
  authenticateToken,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // For now, return a placeholder response
    // This should be replaced with actual PDF generation
    res.status(501).json({ 
      error: 'PDF generation not yet implemented',
      message: 'CMS-1500 PDF generation is coming soon'
    });
  } catch (error) {
    console.error('Error generating CMS-1500 PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

