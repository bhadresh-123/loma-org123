import type { Request, Response } from 'express';
import { stripe } from './config';
import { log } from '../../vite';
import { db } from '@db';
import { getActiveSchema } from '@db';
import { eq } from 'drizzle-orm';
import { sendPaymentConfirmationEmail } from '../email';
import { categorizeTransaction } from './mcc-categorization';

// Webhook event processors
const eventProcessors = {
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'invoice.finalized': handleInvoiceFinalized,
  'issuing_authorization.requested': handleIssuingAuthorizationRequested,
  'issuing_transaction.created': handleIssuingTransactionCreated
} as const;

type WebhookEventType = keyof typeof eventProcessors;

interface StripeWebhookRequest extends Request {
  rawBody: Buffer;
}

export function createWebhookHandler() {
  return async function handleWebhook(req: StripeWebhookRequest, res: Response) {
    const sig = req.headers['stripe-signature'];
    const isProduction = process.env.NODE_ENV === 'production';

    try {
      log(`Received webhook request in ${isProduction ? 'production' : 'development'} mode`);
      log('Headers:', JSON.stringify(req.headers));

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        log('Missing STRIPE_WEBHOOK_SECRET environment variable');
        return res.status(500).json({
          error: 'Webhook secret not configured',
          received: true,
          processed: false
        });
      }

      // In development mode, allow simulated webhooks for backfilling
      let event;
      if (!isProduction && sig === 'simulated_backfill') {
        log('Processing simulated webhook for backfill');
        const body = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        event = JSON.parse(body);
      } else {
        if (!sig) {
          log('Missing stripe-signature header');
          return res.status(400).json({
            error: 'No signature header',
            received: true,
            processed: false
          });
        }

        if (!req.rawBody) {
          log('Missing rawBody in request');
          return res.status(400).json({
            error: 'No raw body found',
            received: true,
            processed: false
          });
        }

        // Verify webhook signature and construct event
        log('Constructing Stripe event...');
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      }

      log(`Received webhook event: ${event.type} (${event.id})`);
      log('Event data:', JSON.stringify(event.data.object));

      // Send immediate acknowledgment that we received the webhook
      res.status(200).json({
        received: true,
        type: event.type,
        id: event.id,
        processing: true,
        environment: isProduction ? 'production' : 'development'
      });

      // Process the event asynchronously
      const processor = eventProcessors[event.type as WebhookEventType];
      if (processor) {
        try {
          log(`Starting asynchronous processing of ${event.type} event ${event.id}`);
          await processor(event.data.object);
          log(`Successfully processed ${event.type} event ${event.id}`);
        } catch (processingError) {
          log(`Error processing ${event.type} event: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
          if (processingError instanceof Error && processingError.stack) {
            log('Stack trace:', processingError.stack);
          }
          // Don't re-throw as we've already sent 200 OK to Stripe
        }
      } else {
        log(`Unhandled event type: ${event.type}`);
      }

    } catch (error) {
      log(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        log('Stack trace:', error.stack);
      }

      if (error instanceof stripe.errors.StripeSignatureVerificationError) {
        return res.status(400).json({
          error: 'Invalid signature',
          received: true,
          processed: false,
          environment: isProduction ? 'production' : 'development'
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        received: true,
        processed: false,
        environment: isProduction ? 'production' : 'development'
      });
    }
  };
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  try {
    log(`Processing successful payment intent: ${paymentIntent.id}`);
    log('Payment intent data:', JSON.stringify(paymentIntent));

    return await db.transaction(async (tx) => {
      // Get payment record using stripePaymentIntentId
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
        .limit(1);

      if (!payment) {
        throw new Error(`No payment found for PaymentIntent: ${paymentIntent.id}`);
      }

      log(`Found payment record ${payment.id} with status: ${payment.status}`);

      // Get client details for email notification
      const schema = getActiveSchema();
      
      if (!schema.patients) {
        log('Patients table not available in HIPAA schema - skipping client lookup');
        return;
      }

      const [client] = await tx
        .select()
        .from(schema.patients)
        .where(eq(schema.patients.id, payment.patientId))
        .limit(1);

      if (!client) {
        throw new Error(`No client found for payment: ${payment.id}`);
      }

      log(`Found client ${client.id} (${client.name}) with email: ${client.email}`);

      // Update payment status
      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status: 'succeeded',
          updatedAt: new Date(),
          stripeCustomerId: paymentIntent.customer || client.stripeCustomerId || null
        })
        .where(eq(payments.id, payment.id))
        .returning();

      log(`Updated payment ${updatedPayment.id} status to succeeded`);

      // Find and update related invoice
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.paymentId, payment.id))
        .limit(1);

      let updatedInvoice;
      if (invoice) {
        // Update invoice status to paid
        [updatedInvoice] = await tx
          .update(invoices)
          .set({
            status: 'paid',
            updatedAt: new Date()
          })
          .where(eq(invoices.id, invoice.id))
          .returning();

        log(`Updated invoice ${updatedInvoice.id} status to paid`);
      }

      // If payment has associated session, mark it as paid
      if (payment.metadata && typeof payment.metadata === 'object') {
        const sessionId = (payment.metadata as any).sessionId;
        if (sessionId) {
          const parsedSessionId = parseInt(sessionId, 10);
          if (!isNaN(parsedSessionId)) {
            if (schema.clinicalSessions) {
              await tx
                .update(schema.clinicalSessions)
                .set({
                  isPaid: true,
                  paymentId: payment.id
                })
                .where(eq(schema.clinicalSessions.id, parsedSessionId));

              log(`Marked session ${parsedSessionId} as paid`);
            } else {
              log('Clinical sessions table not available in HIPAA schema - skipping session update');
            }
          }
        }
      }

      // Send confirmation email
      if (client.email) {
        try {
          log(`Attempting to send payment confirmation email to ${client.email}`);
          const emailSent = await sendPaymentConfirmationEmail({
            to: client.email,
            amount: payment.amount,
            invoiceNumber: invoice ? invoice.invoiceNumber : `PAY-${payment.id}`,
            clientName: client.name,
          });

          log(`Payment confirmation email sent to ${client.email}: ${emailSent}`);
        } catch (emailError) {
          log(`Error sending payment confirmation email to ${client.email}:`, emailError instanceof Error ? emailError.message : 'Unknown error');
          if (emailError instanceof Error && emailError.stack) {
            log('Email error stack trace:', emailError.stack);
          }
        }
      } else {
        log(`No email address found for client ${client.id} (${client.name})`);
      }

      return { payment: updatedPayment, invoice: updatedInvoice };
    });

  } catch (error) {
    log(`Error in handlePaymentIntentSucceeded: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function handleInvoicePaid(stripeInvoice: any) {
  try {
    log(`Processing paid invoice: ${stripeInvoice.id}`);
    log('Invoice data:', stripeInvoice);

    return await db.transaction(async (tx) => {
      const schema = getActiveSchema();
      
      if (!schema.patients) {
        log('Patients table not available in HIPAA schema - skipping invoice processing');
        return;
      }

      // Get invoice and client details
      const [invoice] = await tx
        .select({
          invoice: invoices,
          client: schema.patients,
        })
        .from(invoices)
        .leftJoin(schema.patients, eq(invoices.patientId, schema.patients.id))
        .where(eq(invoices.stripeInvoiceId, stripeInvoice.id))
        .limit(1);

      if (!invoice?.invoice || !invoice?.client) {
        throw new Error(`No invoice or client found for Stripe Invoice: ${stripeInvoice.id}`);
      }

      log(`Found invoice ${invoice.invoice.id} for client ${invoice.client.name} (${invoice.client.email})`);

      // Update invoice status
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          status: 'paid',
          updatedAt: new Date(),
          stripeHostedUrl: stripeInvoice.hosted_invoice_url || invoice.invoice.stripeHostedUrl
        })
        .where(eq(invoices.id, invoice.invoice.id))
        .returning();

      log(`Updated invoice ${updatedInvoice.id} status to paid`);

      // Send confirmation email
      if (invoice.client.email) {
        try {
          log(`Attempting to send invoice payment confirmation email to ${invoice.client.email}`);
          const emailSent = await sendPaymentConfirmationEmail({
            to: invoice.client.email,
            amount: invoice.invoice.total,
            invoiceNumber: invoice.invoice.invoiceNumber,
            clientName: invoice.client.name,
          });

          log(`Invoice payment confirmation email sent to ${invoice.client.email}: ${emailSent}`);
        } catch (emailError) {
          log(`Error sending invoice payment confirmation email to ${invoice.client.email}:`, emailError instanceof Error ? emailError.message : 'Unknown error');
          if (emailError instanceof Error && emailError.stack) {
            log('Email error stack trace:', emailError.stack);
          }
        }
      } else {
        log(`No email address found for client ${invoice.client.id} (${invoice.client.name})`);
      }

      return {
        invoice: updatedInvoice,
        emailSent: invoice.client.email ? true : false
      };
    });
  } catch (error) {
    log(`Error in handleInvoicePaid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  try {
    log(`Processing failed payment intent: ${paymentIntent.id}`);

    return await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id))
        .limit(1);

      if (!payment) {
        throw new Error(`No payment found for PaymentIntent: ${paymentIntent.id}`);
      }

      // Update payment status with error details
      const [updatedPayment] = await tx
        .update(payments)
        .set({
          status: 'failed',
          updatedAt: new Date()
        })
        .where(eq(payments.id, payment.id))
        .returning();

      log(`Updated payment ${updatedPayment.id} status to failed`);
      return { payment: updatedPayment };
    });
  } catch (error) {
    log(`Error in handlePaymentIntentFailed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function handleInvoicePaymentFailed(stripeInvoice: any) {
  try {
    log(`Processing failed invoice payment: ${stripeInvoice.id}`);

    return await db.transaction(async (tx) => {
      // Update invoice status
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          status: 'payment_failed',
          updatedAt: new Date()
        })
        .where(eq(invoices.stripeInvoiceId, stripeInvoice.id))
        .returning();

      if (!updatedInvoice) {
        throw new Error(`No invoice found for Stripe Invoice: ${stripeInvoice.id}`);
      }

      log(`Updated invoice ${updatedInvoice.id} status to payment_failed`);
      return { invoice: updatedInvoice };
    });
  } catch (error) {
    log(`Error in handleInvoicePaymentFailed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function handleInvoiceFinalized(stripeInvoice: any) {
  try {
    log(`Processing finalized invoice: ${stripeInvoice.id}`);

    return await db.transaction(async (tx) => {
      // Update invoice status and hosted URL
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          status: 'finalized',
          stripeHostedUrl: stripeInvoice.hosted_invoice_url,
          updatedAt: new Date()
        })
        .where(eq(invoices.stripeInvoiceId, stripeInvoice.id))
        .returning();

      if (!updatedInvoice) {
        throw new Error(`No invoice found for Stripe Invoice: ${stripeInvoice.id}`);
      }

      log(`Updated invoice ${updatedInvoice.id} status to finalized`);
      return { invoice: updatedInvoice };
    });
  } catch (error) {
    log(`Error in handleInvoiceFinalized: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}


async function handleIssuingAuthorizationRequested(authorization: any) {
  try {
    if (!stripe) {
      log('Stripe not configured - cannot approve issuing authorization');
      return;
    }

    log(`Processing issuing authorization request: ${authorization.id}`);
    // Approve or decline based on your criteria
    // For now, we'll approve all requests
    await stripe.issuing.authorizations.approve(authorization.id, {
      metadata: {
        automated_approval: 'true'
      }
    });
    log(`Approved issuing authorization ${authorization.id}`);
  } catch (error) {
    log(`Error approving issuing authorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleIssuingTransactionCreated(transaction: any) {
  try {
    log(`Processing new issuing transaction: ${transaction.id}`);
    log('Transaction data:', JSON.stringify(transaction));

    // Look up the card in our database
    const cardId = transaction.card;
    
    if (!cardId) {
      log(`No card ID found in transaction ${transaction.id}`);
      return;
    }
    
    // Find our database card record using the Stripe card ID
    const dbCard = await db.query.issuedCards.findFirst({
      where: eq(issuedCards.stripeCardId, cardId)
    });
    
    if (!dbCard) {
      log(`No matching card found in our database for Stripe card ${cardId}`);
      return;
    }
    
    log(`Found card in database: ${dbCard.id} for user ${dbCard.userId}`);
    
    // Check if this transaction is already in our database
    const existingTransaction = await db.query.cardTransactions.findFirst({
      where: eq(cardTransactions.stripeTransactionId, transaction.id)
    });
    
    if (existingTransaction) {
      log(`Transaction ${transaction.id} already exists in our database`);
      return;
    }
    
    // Categorize the transaction
    const mccCode = transaction.merchant_data?.category;
    const category = categorizeTransaction(mccCode, transaction.merchant_data?.name);
    
    // Create transaction with fields that match actual database structure
    const newTransaction = await db.insert(cardTransactions).values({
      cardId: dbCard.id,
      userId: dbCard.userId, // Add user ID explicitly
      stripeTransactionId: transaction.id,
      amount: transaction.amount / 100, // Convert from cents to dollars
      currency: transaction.currency,
      description: transaction.merchant_data?.name || 'Unknown Merchant',
      type: transaction.type || 'unknown',
      category: category.category,
      subcategory: category.subcategory,
      taxDeductible: category.taxDeductible,
      mccCode: mccCode,
      metadata: {
        merchantName: transaction.merchant_data?.name || null,
        merchantCategory: transaction.merchant_data?.category || null,
        timestamp: new Date(transaction.created * 1000).toISOString(),
        processingDate: transaction.network_data?.processing_date || null
      }
    }).returning();
    
    log(`Created new transaction record: ${newTransaction[0].id} for card ${dbCard.id}`);
    return newTransaction[0];
  } catch (error) {
    log(`Error processing issuing transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      log('Stack trace:', error.stack);
    }
  }
}