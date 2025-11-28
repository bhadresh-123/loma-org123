import { stripe } from './config';
import { log } from '../../vite';

/**
 * Updates the capabilities of an existing Stripe Connect account
 * to include the issuing capability.
 */
export async function updateConnectAccountCapabilities(accountId: string) {
  try {
    if (!stripe) {
      throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
    }

    // First retrieve the current account to check existing capabilities
    const account = await stripe.accounts.retrieve(accountId);
    
    log(`Updating capabilities for Connect account: ${accountId}`);
    
    // Update the account with the issuing capability
    // Use raw object with type assertion to avoid TypeScript errors
    // with capabilities that might not be in the current Stripe SDK type definitions
    const capabilities: any = {
      card_payments: { requested: true },
      transfers: { requested: true }
    };
    
    // Add card issuing capability (correct parameter name according to Stripe API)
    capabilities.card_issuing = { requested: true };
    
    const updatedAccount = await stripe.accounts.update(accountId, {
      capabilities: capabilities
    });
    
    log(`Updated Connect account ${accountId} with issuing capability`);
    log(`Capabilities status: ${JSON.stringify(updatedAccount.capabilities)}`);
    
    return updatedAccount;
  } catch (error) {
    log(`Error updating Connect account capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}