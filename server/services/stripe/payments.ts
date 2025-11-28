import { stripe } from './config';
import { db } from '@db';
import { getActiveSchema } from '@db';
import { log } from '../../vite';
import { eq } from 'drizzle-orm';

interface CreatePaymentParams {
  amount: number;
  currency?: string;
  patientId: number;
  userId: number;
  metadata?: Record<string, any>;
}

export async function createPaymentIntent({
  amount,
  currency = 'usd',
  patientId,
  userId,
  metadata = {}
}: CreatePaymentIntentParams) {
  try {
    const schema = getActiveSchema();
    
    // Check if payments table exists in current schema
    if (!schema.payments) {
      log('Payments table not available in HIPAA schema - skipping local payment record');
      
      // Create Stripe PaymentIntent directly
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          patientId: patientId.toString(),
          userId: userId.toString(),
          ...metadata
        }
      });
      
      log(`Created payment intent: ${paymentIntent.id} (no local record)`);
      return { paymentIntent, payment: null };
    }

    // First create local payment record in 'pending' state
    const [payment] = await db
      .insert(schema.payments)
      .values({
        userId,
        patientId,
        amount: amount.toString(),
        currency,
        status: 'pending',
        metadata,
        paymentMethod: 'card', // Add required field
      })
      .returning();

    log(`Created pending payment record: ${payment.id}`);

    // Then create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        paymentId: payment.id.toString(),
        patientId: patientId.toString(),
        userId: userId.toString(),
        ...metadata
      }
    });

    // Update payment record with Stripe ID
    await db
      .update(schema.payments)
      .set({
        stripePaymentIntentId: paymentIntent.id,
      })
      .where(eq(schema.payments.id, payment.id));

    log(`Created payment intent: ${paymentIntent.id} for payment: ${payment.id}`);
    return { paymentIntent, payment };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error creating payment intent: ${errorMessage}`);
    throw error;
  }
}

export async function createCheckoutSession({
  invoiceId,
  patientId,
  userId,
  successUrl,
  cancelUrl
}: CreateCheckoutSessionParams) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoiceId: invoiceId.toString(),
        patientId: patientId.toString(),
        userId: userId.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${invoiceId}`,
            },
            unit_amount: 2000, // $20.00
          },
          quantity: 1,
        },
      ],
    });

    return { sessionId: session.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error creating checkout session: ${errorMessage}`);
    throw error;
  }
}

export async function updatePaymentStatus(paymentIntentId: string, status: string) {
    const schema = getActiveSchema();
    const schema = getActiveSchema();
    const schema = getActiveSchema();
    const schema = getActiveSchema();
  try {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, paymentIntentId));

    if (!payment) {
      throw new Error(`No payment found for PaymentIntent: ${paymentIntentId}`);
    }

    await db
      .update(payments)
      .set({ status, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));

    log(`Updated payment ${payment.id} status to ${status}`);
    return payment;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error updating payment status: ${errorMessage}`);
    throw error;
  }
}