import { stripe } from './config';
import { log } from '../../vite';
import { db, getActiveSchema } from "@db";
import { eq } from "drizzle-orm";

export class StripeConnectService {
  
  /**
   * Creates a Stripe Connect account for a user
   */
  static async createConnectAccount(userId: number, email: string, businessName: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
      }

      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: businessName,
        },
        metadata: {
          userId: userId.toString(),
        },
      });

      // Store the account ID in the database
      const schema = getActiveSchema();
      await db.update(schema.users)
        .set({ stripeConnectAccountId: account.id })
        .where(eq(schema.users.id, userId));

      log(`Created and stored Connect account for user ${userId}: ${account.id}`);
      return account;
    } catch (error) {
      log(`Error creating Connect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Retrieves Connect account details with balance and transactions
   */
  static async getConnectAccountDetails(accountId: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
      }

      // Validate accountId first
      if (!accountId || accountId === null || accountId === undefined || accountId.trim() === '') {
        throw new Error('Account ID is null or empty');
      }
      
      // Get account details
      const account = await stripe.accounts.retrieve(accountId);
      
      // Get balance
      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId,
      });
      
      // Get recent transactions
      const transactions = await stripe.balanceTransactions.list(
        { limit: 10 },
        { stripeAccount: accountId }
      );
      
      // Get pending payouts
      const payouts = await stripe.payouts.list(
        { limit: 10 },
        { stripeAccount: accountId }
      );
      
      return {
        account,
        balance: {
          available: balance.available.reduce((sum, bal) => sum + bal.amount, 0),
          pending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0),
          lastUpdated: new Date().toISOString()
        },
        recentTransactions: transactions.data,
        pendingPayouts: payouts.data.filter(payout => payout.status === 'pending')
      };
    } catch (error) {
      log(`Error retrieving Connect account details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Creates an account link for onboarding
   */
  static async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
        collect: 'eventually_due',
      });

      return accountLink;
    } catch (error) {
      log(`Error creating account link: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Creates a dashboard login link
   */
  static async createDashboardLink(accountId: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
      }

      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return loginLink;
    } catch (error) {
      log(`Error creating dashboard link: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Updates invoice to route payments to Connect account
   */
  static async updateInvoiceForConnectAccount(invoiceId: string, connectAccountId: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY required');
      }

      // Update the invoice to include transfer data
      const invoice = await stripe.invoices.update(invoiceId, {
        transfer_data: {
          destination: connectAccountId,
        },
      });

      // Update our database record
      await db.update(invoices)
        .set({ stripeConnectAccountId: connectAccountId })
        .where(eq(invoices.stripeInvoiceId, invoiceId));

      log(`Updated invoice ${invoiceId} to route payments to Connect account ${connectAccountId}`);
      return invoice;
    } catch (error) {
      log(`Error updating invoice for Connect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Validates Connect account status
   */
  static async validateConnectAccount(accountId: string) {
    try {
      if (!stripe) {
        return { 
          exists: false,
          error: 'Stripe not configured' 
        };
      }

      // Check for null/undefined/empty accountId first
      if (!accountId || accountId === null || accountId === undefined || 
          (typeof accountId === 'string' && accountId.trim() === '')) {
        log('Connect account validation failed: accountId is null/undefined/empty');
        return {
          exists: false,
          error: 'Account ID is null or empty'
        };
      }
      
      const account = await stripe.accounts.retrieve(accountId);
      
      return {
        exists: true,
        account: account,
        onboardingComplete: account.details_submitted && account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requiresAction: !account.details_submitted || !account.payouts_enabled
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('No such account')) {
        return {
          exists: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          requiresAction: true
        };
      }
      log(`Connect account validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}