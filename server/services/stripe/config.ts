import Stripe from 'stripe';
import { log } from '../../vite';

// Make Stripe optional for deployment
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any, // Type assertion to avoid version mismatch errors
      typescript: true,
    });
    console.log('✅ Stripe configured successfully');
  } catch (error) {
    console.warn('⚠️ Stripe configuration failed:', error);
    stripe = null;
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not set - Stripe features disabled');
}

export { stripe };

// Function to update a cardholder's terms acceptance via an update request
// This is needed because our current version needs a specific format for accepting terms
export async function updateCardholderTermsAcceptance(cardHolderId: string, connectAccountId?: string): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
  }
  
  try {
    // Fixed argument format for Stripe API - use proper options parameter structure
    const updateParams = {
      individual: {
        card_issuing: {
          user_terms_acceptance: {
            date: Math.floor(Date.now() / 1000),
            ip: '127.0.0.1',
            user_agent: 'LOMA Mental Health Platform/1.0'
          }
        }
      }
    };
    
    // Correct way to pass options to Stripe API
    if (connectAccountId) {
      await stripe.issuing.cardholders.update(cardHolderId, updateParams, {
        stripeAccount: connectAccountId
      });
    } else {
      await stripe.issuing.cardholders.update(cardHolderId, updateParams);
    }
    
    log(`Updated cardholder terms acceptance: ${cardHolderId}`);
  } catch (error) {
    log(`Error updating cardholder terms acceptance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Validate Stripe configuration on startup
export async function validateStripeConfig() {
  if (!stripe) {
    console.warn('⚠️ Stripe not configured - skipping validation');
    return false;
  }
  
  try {
    const account = await stripe.accounts.retrieve();
    log(`Stripe configured for account: ${account.id}`);
    return true;
  } catch (error) {
    log(`Stripe configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}