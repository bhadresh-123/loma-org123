import { Router } from 'express';
import { stripe } from '../services/stripe/config';
import { createAndSendInvoice } from '../services/stripe/invoices';
import { createWebhookHandler } from '../services/stripe/webhooks';
import { backfillCardTransactions } from '../services/stripe/backfill';
import { authenticateToken } from '../auth-simple';
import { log } from '../vite';
import { db, getActiveSchema } from "@db";
import { eq, and } from "drizzle-orm";

const router = Router();

// Middleware to check if Stripe is configured
const requireStripe = (req: any, res: any, next: any) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Stripe not configured', 
      message: 'STRIPE_SECRET_KEY environment variable is required for payment features' 
    });
  }
  next();
};

// Create a payment intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
      const schema = getActiveSchema();
  try {
    // This would typically interact with Stripe API
    // For now, just return a success message
    return res.json({ 
      success: true, 
      clientSecret: 'mock_client_secret',
      message: 'Payment intent creation functionality to be implemented' 
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Handle webhook events
router.post('/webhook', requireStripe, createWebhookHandler());

// Update transaction tax deductible status
router.patch('/transaction/:id/tax-deductible', authenticateToken, async (req, res) => {
      const schema = getActiveSchema();
  try {
    const userId = req.user?.id;
    const transactionId = parseInt(req.params.id);
    const { taxDeductible } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (typeof taxDeductible !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'taxDeductible must be a boolean value' 
      });
    }

    // First, verify the transaction belongs to the user
    const transaction = await db.query.cardTransactions.findFirst({
      where: and(
        eq(schema.cardTransactions.id, transactionId),
        eq(schema.cardTransactions.userId, userId)
      )
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    // Update the tax deductible status
    await db.update(schema.cardTransactions)
      .set({ taxDeductible })
      .where(and(
        eq(schema.cardTransactions.id, transactionId),
        eq(schema.cardTransactions.userId, userId)
      ));

    log(`Updated transaction ${transactionId} tax deductible status to ${taxDeductible} for user ${userId}`);

    return res.json({
      success: true,
      message: 'Tax deductible status updated successfully'
    });

  } catch (error) {
    console.error('Error updating transaction tax deductible status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update tax deductible status' 
    });
  }
});

// Backfill missing card transactions
router.post('/backfill-transactions', authenticateToken, requireStripe, async (req, res) => {
      const schema = getActiveSchema();
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const result = await backfillCardTransactions(userId);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Backfill completed successfully',
        ...result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Backfill failed',
        error: result.error
      });
    }
  } catch (error) {
    log(`Error in backfill endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get invoice details
router.get('/invoice/:id', authenticateToken, async (req, res) => {
      const schema = getActiveSchema();
  try {
    const invoiceId = req.params.id;
    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    // Check if this invoice is connected to a Stripe Connect account
    const transferData = invoice.transfer_data;
    const isConnectedToBusinessAccount = transferData && transferData.destination ? true : false;
    
    return res.json({
      ...invoice,
      businessBankingInfo: {
        connectedToBusinessAccount: isConnectedToBusinessAccount,
        connectAccountId: transferData?.destination || null
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve invoice',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get info about whether an invoice is connected to a business bank account
router.get('/invoice/:id/business-banking-info', authenticateToken, async (req, res) => {
      const schema = getActiveSchema();
  try {
    const invoiceId = req.params.id;
    
    // First check our local database
    const [localInvoice] = await db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.stripeInvoiceId, invoiceId))
      .limit(1);
    
    if (localInvoice?.stripeConnectAccountId) {
      return res.json({
        success: true,
        connectedToBusinessAccount: true,
        connectAccountId: localInvoice.stripeConnectAccountId
      });
    }
    
    // If not in database, check with Stripe directly
    const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
    const transferData = stripeInvoice.transfer_data;
    const isConnectedToBusinessAccount = transferData && transferData.destination ? true : false;
    
    return res.json({
      success: true,
      connectedToBusinessAccount: isConnectedToBusinessAccount,
      connectAccountId: transferData?.destination || null
    });
  } catch (error) {
    log(`Error checking invoice business banking info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve invoice business banking information',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create and send invoice
router.post('/create-invoice', authenticateToken, requireStripe, async (req, res) => {
      const schema = getActiveSchema();
  try {
    // Check if this is a bulk invoice request
    if (req.body.sessionsTable && Array.isArray(req.body.sessionsTable)) {
      const { sessionsTable, dueDate } = req.body;

      if (sessionsTable.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No sessionsTable provided for invoicing' 
        });
      }

      // Define session interface
      interface SessionInvoiceData {
        sessionId: number;
        patientId: number;
        amount: number;
        description: string;
        date?: string | Date;
      }

      // Get the authenticated user ID or fallback to default
      const userId = req.user?.id || 1; // Fallback to admin user if auth not implemented
      
      const invoiceResults = [];

      // Create a separate invoice for each session
      for (const session of sessionsTable) {
        try {
          // Format date for description
          const sessionDate = new Date(session.date || new Date()).toLocaleDateString();
          const description = `${session.description} (${sessionDate})`;
          
          const result = await createAndSendInvoice({
            patientId: session.patientId,
            userId,
            amount: session.amount,
            description,
            metadata: {
              sessionId: session.sessionId.toString(),
              bulkRequest: 'true'
            }
          });
          
          invoiceResults.push({
            patientId: session.patientId,
            sessionIds: [session.sessionId],
            invoice: result.invoice,
            stripeInvoice: {
              id: result.stripeInvoice.id,
              hostedUrl: result.stripeInvoice.hosted_invoice_url
            }
          });
        } catch (invoiceError) {
          log(`Error creating invoice for session ${session.sessionId}: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
          // Continue with other sessionsTable even if one fails
        }
      }

      return res.json({
        success: true,
        invoices: invoiceResults,
        message: `Created ${invoiceResults.length} invoice(s) successfully`
      });

    } else {
      // Single invoice creation
      const { patientId, amount, description } = req.body;

      if (!patientId || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: patientId, amount' 
        });
      }

      // Get the authenticated user ID or fallback to default
      const userId = req.user?.id || 1; // Fallback to admin user if auth not implemented
      
      const result = await createAndSendInvoice({
        patientId,
        userId,
        amount: parseFloat(amount),
        description: description || 'Therapy session'
      });

      // Include Connect account info in the response if applicable
      // @ts-ignore - We're adding a custom property in memory that might not be in the schema
      const hasConnectAccount = result.invoice?.stripeConnectAccountId;
      const connectInfo = hasConnectAccount 
        ? { 
            connectedToBusinessAccount: true, 
            // @ts-ignore - We're adding a custom property in memory
            connectAccountId: result.invoice.stripeConnectAccountId
          }
        : { 
            connectedToBusinessAccount: false 
          };

      return res.json({
        success: true,
        invoice: result.invoice,
        stripeInvoice: {
          id: result.stripeInvoice.id,
          hostedUrl: result.stripeInvoice.hosted_invoice_url
        },
        businessBankingInfo: connectInfo
      });
    }
  } catch (error) {
    log(`Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create invoice',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;