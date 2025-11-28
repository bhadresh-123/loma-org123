import { stripe } from '../services/stripe/config';
import { db } from "@db";
import { patientsTable, clinicalSessionsTable, payments, invoices, invoiceItems } from "@db/schema";
import { eq } from "drizzle-orm";
import { createWebhookHandler } from '../services/stripe/webhooks';
import type { Request, Response } from 'express';
import { log } from '../vite';

async function testPaymentFlowE2E() {
  let testRecords: {
    patientId?: number;
    sessionId?: number;
    paymentId?: number;
    invoiceId?: number;
  } = {};

  try {
    log('Starting E2E payment flow test...');

    // 1. Create a test client
    const [client] = await db.insert(patientsTable).values({
      userId: 1,
      name: "Test E2E Client",
      email: "test-e2e@example.com",
      phone: "555-0123",
      status: "active",
      billingType: "private_pay",
      sessionCost: "150.00"
    }).returning();

    testRecords.patientId = client.id;
    log('Created test client with ID:', client.id);

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: client.email || undefined,
      name: client.name,
      metadata: {
        patientId: client.id.toString(),
        test: 'true'
      }
    });

    log(`Created Stripe customer: ${stripeCustomer.id}`);

    // Update client with Stripe customer ID
    const [updatedClient] = await db
      .update(patientsTable)
      .set({ 
        stripeCustomerId: stripeCustomer.id 
      })
      .where(eq(patientsTable.id, client.id))
      .returning();

    log(`Updated client ${updatedClient.id} with Stripe ID: ${updatedClient.stripeCustomerId}`);

    // 2. Create therapy session record
    const [session] = await db.insert(clinicalSessionsTable).values({
      userId: 1,
      patientId: client.id,
      date: new Date(),
      duration: 60,
      status: 'completed',
      isPaid: false,
      notes: 'E2E Test Session'
    }).returning();

    testRecords.sessionId = session.id;
    log(`Created therapy session with ID: ${session.id}`);

    // Generate a unique Stripe payment intent ID for testing
    const testPaymentIntentId = `pi_e2e_test_${Date.now()}`;

    // 3. Create payment record
    const [payment] = await db.insert(payments).values({
      userId: 1,
      patientId: client.id,
      amount: "150.00",
      currency: "usd",
      status: "pending",
      paymentMethod: "card",
      stripePaymentIntentId: testPaymentIntentId,
      stripeCustomerId: stripeCustomer.id,
      metadata: {
        sessionId: session.id.toString(),
        test: 'true'
      }
    }).returning();

    testRecords.paymentId = payment.id;
    log(`Created payment record with ID: ${payment.id} and stripePaymentIntentId: ${payment.stripePaymentIntentId}`);

    // 4. Create invoice
    const [invoice] = await db.insert(invoices).values({
      userId: 1,
      patientId: client.id,
      paymentId: payment.id,
      invoiceNumber: `INV-E2E-${Date.now()}`,
      status: 'draft',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subtotal: "150.00",
      tax: "0",
      total: "150.00",
      notes: "E2E Test Session Invoice",
      stripeInvoiceId: `in_e2e_test_${Date.now()}`,
      stripeCustomerId: stripeCustomer.id
    }).returning();

    testRecords.invoiceId = invoice.id;
    log(`Created invoice with ID: ${invoice.id}`);

    // 5. Add invoice items
    const [invoiceItem] = await db.insert(invoiceItems).values({
      invoiceId: invoice.id,
      sessionId: session.id,
      description: "Therapy Session (60 minutes)",
      quantity: 1,
      unitPrice: "150.00",
      amount: "150.00"
    }).returning();

    log(`Created invoice item with ID: ${invoiceItem.id}`);

    // 6. Test payment success webhook
    log('Testing payment success webhook...');
    const paymentSuccessEvent = {
      id: `evt_e2e_${Math.random().toString(36).substring(7)}`,
      object: 'event',
      api_version: '2024-01-01',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: testPaymentIntentId,  // Use the same ID we created the payment record with
          object: 'payment_intent',
          status: 'succeeded',
          amount: 15000, // $150.00
          currency: 'usd',
          customer: stripeCustomer.id,
          metadata: {
            patientId: client.id.toString(),
            userId: "1",
            sessionId: session.id.toString(),
            test: 'true'
          }
        }
      },
      livemode: false,
      pending_webhooks: 0,
      request: { id: null },
      type: 'payment_intent.succeeded'
    };

    await processWebhookEvent(paymentSuccessEvent);

    // Wait briefly to ensure webhook processing completes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Verify payment status updated using the correct payment ID
    if (!testRecords.paymentId) {
      throw new Error('Payment ID not recorded');
    }

    const [updatedPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, testRecords.paymentId))
      .limit(1);

    if (!updatedPayment) {
      throw new Error('Payment record not found after webhook');
    }

    log(`Retrieved payment record ${updatedPayment.id} with status: ${updatedPayment.status}`);

    if (updatedPayment.status !== 'succeeded') {
      throw new Error(`Payment status not updated. Expected 'succeeded', got '${updatedPayment.status}'`);
    }

    log('Payment status updated successfully:', updatedPayment.status);

    // 8. Test invoice paid webhook
    log('Testing invoice paid webhook...');
    const invoicePaidEvent = {
      id: `evt_e2e_${Math.random().toString(36).substring(7)}`,
      object: 'event',
      api_version: '2024-01-01',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: invoice.stripeInvoiceId,
          object: 'invoice',
          status: 'paid',
          customer: stripeCustomer.id,
          total: 15000,
          currency: 'usd',
          hosted_invoice_url: 'https://example.com/invoice',
          metadata: {
            patientId: client.id.toString(),
            userId: "1",
            test: 'true'
          }
        }
      },
      livemode: false,
      pending_webhooks: 0,
      request: { id: null },
      type: 'invoice.paid'
    };

    await processWebhookEvent(invoicePaidEvent);

    // Wait briefly to ensure webhook processing completes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 9. Verify invoice status updated
    if (!testRecords.invoiceId) {
      throw new Error('Invoice ID not recorded');
    }

    const [updatedInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, testRecords.invoiceId))
      .limit(1);

    if (!updatedInvoice) {
      throw new Error('Invoice record not found after webhook');
    }

    log(`Retrieved invoice record ${updatedInvoice.id} with status: ${updatedInvoice.status}`);

    if (updatedInvoice.status !== 'paid') {
      throw new Error(`Invoice status not updated. Expected 'paid', got '${updatedInvoice.status}'`);
    }

    log('Invoice status updated successfully:', updatedInvoice.status);

    // 10. Verify session marked as paid
    if (!testRecords.sessionId) {
      throw new Error('Session ID not recorded');
    }

    const [updatedSession] = await db
      .select()
      .from(clinicalSessionsTable)
      .where(eq(clinicalSessionsTable.id, testRecords.sessionId))
      .limit(1);

    if (!updatedSession) {
      throw new Error('Session record not found');
    }

    log(`Retrieved session record ${updatedSession.id} with isPaid: ${updatedSession.isPaid}`);

    if (!updatedSession.isPaid) {
      throw new Error('Session not marked as paid');
    }

    log('Session marked as paid successfully');

    return {
      success: true,
      results: {
        client: updatedClient,
        session: updatedSession,
        payment: updatedPayment,
        invoice: updatedInvoice
      }
    };

  } catch (error) {
    log('E2E test failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      log('Stack trace:', error.stack);
    }
    throw error;
  } finally {
    // Clean up test records
    try {
      await cleanupTestRecords(testRecords);
      log('Test records cleaned up');
    } catch (error) {
      log('Error cleaning up test records:', error);
    }
  }
}

async function processWebhookEvent(event: any): Promise<any> {
  const payload = JSON.stringify(event);
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('Missing webhook secret');
  }

  // Generate test webhook signature
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  // Create mock request and response objects
  const mockReq = {
    headers: {
      'stripe-signature': header
    },
    rawBody: Buffer.from(payload),
    originalUrl: '/api/webhooks/stripe'
  } as unknown as Request;

  let responseData: any;
  const mockRes = {
    json: (data: any) => {
      responseData = data;
      return mockRes;
    },
    status: (code: number) => mockRes
  } as Response;

  // Process webhook
  log(`Processing webhook event: ${event.type}`);
  const webhookHandler = createWebhookHandler();
  await webhookHandler(mockReq as any, mockRes);

  return responseData;
}

async function cleanupTestRecords(records: {
  patientId?: number;
  sessionId?: number;
  paymentId?: number;
  invoiceId?: number;
}) {
  // Delete in reverse order of dependencies
  if (records.invoiceId) {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, records.invoiceId));
    await db.delete(invoices).where(eq(invoices.id, records.invoiceId));
  }

  if (records.paymentId) {
    await db.delete(payments).where(eq(payments.id, records.paymentId));
  }

  if (records.sessionId) {
    await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, records.sessionId));
  }

  if (records.patientId) {
    await db.delete(patientsTable).where(eq(patientsTable.id, records.patientId));
  }
}

// Run the test
testPaymentFlowE2E()
  .then(result => {
    log('All E2E tests completed successfully!');
    log('Test results:', result);
    process.exit(0);
  })
  .catch(error => {
    log('Test failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });