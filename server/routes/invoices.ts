import { Router } from 'express';
import { db } from '@db';
import { getActiveSchema } from '@db';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateToken, rbac } from '../middleware/authentication';
import { rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';

const router = Router();

// Get all invoices for the authenticated user
router.get('/', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canManageBilling,
  auditMiddleware.auditPHIAccess('READ', 'INVOICE', { trackFields: true, requireAuthorization: true }),
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
    if (!schema.invoices) {
      return res.json([]); // Return empty array if table not available
    }

    // Type assertion after schema check
    const invoicesTable = schema.invoices;

    // Fetch invoices with patient data using direct query
    // Note: Using select instead of query API for better type safety with dynamic schema
    const invoices: any[] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.userId, userId))
      .orderBy(desc(invoicesTable.createdAt));

    // Transform the data to match the expected format
    // Note: We'll need to fetch patient data separately since we're not using the query API
    const transformedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      patientId: invoice.patientId,
      client: {
        id: invoice.patientId,
        name: 'Patient', // Will be populated by frontend or separate query
        billingType: 'private_pay',
      },
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      stripeInvoiceId: invoice.stripeInvoiceId,
      stripeCustomerId: invoice.stripeCustomerId,
      stripeConnectAccountId: invoice.stripeConnectAccountId,
      stripeHostedUrl: invoice.stripeHostedUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }));

    res.json(transformedInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single invoice
router.get('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canManageBilling,
  auditMiddleware.auditPHIAccess('READ', 'INVOICE', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!db) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const schema = getActiveSchema();
    if (!schema.invoices) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoicesTable = schema.invoices;
    const patientsTable = schema.patients;

    // Fetch invoice using direct query
    const [invoice]: any[] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, parseInt(req.params.id)))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Verify ownership
    if (invoice.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new invoice
router.post('/', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.canManageBilling,
  auditMiddleware.auditPHIAccess('CREATE', 'INVOICE', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const schema = getActiveSchema();
    if (!schema.invoices) {
      return res.status(500).json({ error: 'Invoices table not available' });
    }

    const invoicesTable = schema.invoices;

    const { patientId, sessionId, amount, description, serviceDate } = req.body;

    if (!patientId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create invoice
    const [invoice] = await db.insert(invoicesTable).values({
      userId,
      patientId: parseInt(patientId),
      invoiceNumber,
      status: 'pending',
      subtotal: amount.toString(),
      tax: '0',
      total: amount.toString(),
      notes: description || 'Therapy session',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Create invoice item if sessionId provided
    if (sessionId && schema.invoiceItems) {
      await db.insert(schema.invoiceItems).values({
        invoiceId: invoice.id,
        sessionId: parseInt(sessionId),
        description: description || 'Therapy session',
        quantity: 1,
        unitPrice: amount.toString(),
        amount: amount.toString(),
        createdAt: new Date(),
      });
    }

    // Fetch the complete invoice
    const [completeInvoice]: any[] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice.id))
      .limit(1);

    res.status(201).json(completeInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

