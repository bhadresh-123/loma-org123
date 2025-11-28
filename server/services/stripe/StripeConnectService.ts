import { stripe } from './config';
import { log } from '../../vite';
import { db, getActiveSchema } from "@db";
import { eq } from "drizzle-orm";

/**
 * Enterprise-grade Stripe Connect Service
 * Single source of truth for all Connect operations
 */
export class StripeConnectService {
  
  /**
   * Get user's Connect account ID from database
   * Replacement for legacy getUserConnectAccount function
   */
  static async getUserConnectAccountId(userId: number): Promise<string | null> {
    try {
      const schema = getActiveSchema();
      const profileResult = await db.select({
        stripeConnectAccountId: schema.therapistProfiles.stripeConnectAccountId
      }).from(schema.therapistProfiles).where(eq(schema.therapistProfiles.userId, userId));

      if (!profileResult || profileResult.length === 0) {
        return null;
      }

      return profileResult[0].stripeConnectAccountId;
    } catch (error) {
      log(`Error getting Connect account for user ${userId}: ${error}`);
      return null;
    }
  }
  
  /**
   * Creates a Connect Custom account with comprehensive error handling
   */
  static async createConnectAccount(userId: number, email: string, businessName?: string) {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY environment variable is required for business banking features');
      }

      // Validate input parameters
      if (!userId || !email) {
        throw new Error('User ID and email are required');
      }

      // Get user information to fill business details
      const schema = getActiveSchema();
      const userResult = await db.select({
        id: schema.usersAuth.id,
        name: schema.therapistProfiles.name,
        email: schema.usersAuth.email
      })
      .from(schema.usersAuth)
      .leftJoin(schema.therapistProfiles, eq(schema.usersAuth.id, schema.therapistProfiles.userId))
      .where(eq(schema.usersAuth.id, userId));

      if (!userResult || userResult.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult[0];
      const finalBusinessName = businessName || 
                               user.name || 
                               'Mental Health Practice';

      // Create Stripe Connect account
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
          name: finalBusinessName,
        },
        metadata: {
          userId: userId.toString(),
          createdAt: new Date().toISOString()
        },
      });

      // Store account ID in database with error handling
      // First ensure therapist profile exists
      const existingProfile = await db.select({
        id: schema.therapistProfiles.id
      }).from(schema.therapistProfiles).where(eq(schema.therapistProfiles.userId, userId));

      if (existingProfile && existingProfile.length > 0) {
        await db.update(schema.therapistProfiles)
          .set({ stripeConnectAccountId: account.id })
          .where(eq(schema.therapistProfiles.userId, userId));
      } else {
        // Create therapist profile if it doesn't exist
        await db.insert(schema.therapistProfiles).values({
          userId: userId,
          name: user.name || 'Therapist',
          stripeConnectAccountId: account.id
        });
      }

      log(`✅ Created Connect account for user ${userId}: ${account.id}`);
      return {
        success: true,
        account: account,
        accountId: account.id
      };
    } catch (error) {
      log(`❌ Error creating Connect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to create Connect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves comprehensive Connect account details
   */
  static async getConnectAccountDetails(accountId: string) {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY environment variable is required');
      }

      // Input validation
      if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
        throw new Error('Valid account ID is required');
      }

      const cleanAccountId = accountId.trim();
      
      // Parallel API calls for better performance
      const [account, balance, transactions, payouts] = await Promise.all([
        stripe.accounts.retrieve(cleanAccountId),
        stripe.balance.retrieve({ stripeAccount: cleanAccountId }).catch(() => ({ available: [], pending: [] })),
        stripe.balanceTransactions.list({ limit: 10 }, { stripeAccount: cleanAccountId }).catch(() => ({ data: [] })),
        stripe.payouts.list({ limit: 10 }, { stripeAccount: cleanAccountId }).catch(() => ({ data: [] }))
      ]);
      
      // Log the raw balance data to debug the issue
      log(`🔍 Raw Stripe balance data: ${JSON.stringify(balance)}`);
      
      return {
        success: true,
        account,
        balance: {
          // Use exact Stripe fields without reinterpretation
          available: balance.available?.reduce((sum, bal) => sum + bal.amount, 0) || 0,
          pending: balance.pending?.reduce((sum, bal) => sum + bal.amount, 0) || 0,
          lastUpdated: new Date().toISOString()
        },
        recentTransactions: transactions.data || [],
        pendingPayouts: payouts.data?.filter(payout => payout.status === 'pending') || []
      };
    } catch (error) {
      log(`❌ Error retrieving Connect account details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to retrieve account details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates account onboarding link with smart continuation
   */
  static async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY environment variable is required');
      }

      if (!accountId || !refreshUrl || !returnUrl) {
        throw new Error('Account ID, refresh URL, and return URL are required');
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
        collect: 'eventually_due',
      });

      log(`✅ Created account link for ${accountId}`);
      return {
        success: true,
        url: accountLink.url,
        expiresAt: accountLink.expires_at
      };
    } catch (error) {
      log(`❌ Error creating account link: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to create account link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates dashboard access link
   */
  static async createDashboardLink(accountId: string) {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        throw new Error('Stripe not configured - STRIPE_SECRET_KEY environment variable is required');
      }

      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const loginLink = await stripe.accounts.createLoginLink(accountId);
      
      log(`✅ Created dashboard link for ${accountId}`);
      return {
        success: true,
        url: loginLink.url
      };
    } catch (error) {
      log(`❌ Error creating dashboard link: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to create dashboard link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates Connect account with comprehensive checks
   */
  static async validateConnectAccount(accountId: string) {
    try {
      // Check if Stripe is configured
      if (!stripe) {
        return {
          exists: false,
          valid: false,
          error: 'Stripe not configured'
        };
      }

      // Input validation
      if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
        return {
          exists: false,
          valid: false,
          error: 'Account ID is required'
        };
      }

      const account = await stripe.accounts.retrieve(accountId.trim());
      
      return {
        exists: true,
        valid: true,
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
          valid: false,
          error: 'Account not found'
        };
      }
      
      log(`❌ Connect account validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        exists: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Clean up invalid account references
   */
  static async cleanupInvalidAccount(userId: number) {
    try {
      const schema = getActiveSchema();
      await db.update(schema.therapistProfiles)
        .set({ stripeConnectAccountId: null })
        .where(eq(schema.therapistProfiles.userId, userId));
      
      log(`🧹 Cleaned up invalid Connect account for user ${userId}`);
      return { success: true };
    } catch (error) {
      log(`❌ Error cleaning up invalid account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}