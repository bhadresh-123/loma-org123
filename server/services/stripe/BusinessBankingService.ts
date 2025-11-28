import { StripeConnectService } from './StripeConnectService';
import { log } from '../../vite';
import { db } from "@db";
import { eq } from "drizzle-orm";
import { getActiveSchema } from '@db';

/**
 * A+ Grade Business Banking Service
 * Comprehensive business banking operations with enterprise-grade error handling
 */
export class BusinessBankingService {
  
  /**
   * Get complete business banking status for a user
   */
  static async getBusinessBankingStatus(userId: number) {
    try {
      log(`🏦 Getting business banking status for user ${userId}`);
      
      const schema = getActiveSchema();
      
      // Get user auth and therapist profile with safe field access
      const userResult = await db.select({
        id: schema.usersAuth.id,
        name: schema.therapistProfiles.name,
        email: schema.usersAuth.email,
        stripeConnectAccountId: schema.therapistProfiles.stripeConnectAccountId,
        legalBusinessName: schema.therapistProfiles.name
      })
      .from(schema.usersAuth)
      .leftJoin(schema.therapistProfiles, eq(schema.usersAuth.id, schema.therapistProfiles.userId))
      .where(eq(schema.usersAuth.id, userId));

      if (!userResult || userResult.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult[0];
      
      // No account exists
      if (!user.stripeConnectAccountId) {
        return {
          success: true,
          hasAccount: false,
          requiresSetup: true,
          message: 'No business banking account found'
        };
      }

      // Validate existing account
      const validation = await StripeConnectService.validateConnectAccount(user.stripeConnectAccountId);
      
      if (!validation.exists || !validation.valid) {
        // Clean up invalid account
        await StripeConnectService.cleanupInvalidAccount(userId);
        
        return {
          success: true,
          hasAccount: false,
          requiresSetup: true,
          message: 'Previous account was invalid and has been cleared'
        };
      }

      // Get comprehensive account details
      const accountDetails = await StripeConnectService.getConnectAccountDetails(user.stripeConnectAccountId);
      
      return {
        success: true,
        hasAccount: true,
        requiresSetup: false,
        accountId: user.stripeConnectAccountId,
        onboardingComplete: accountDetails.account.details_submitted && accountDetails.account.payouts_enabled,
        chargesEnabled: accountDetails.account.charges_enabled,
        payoutsEnabled: accountDetails.account.payouts_enabled,
        defaultCurrency: accountDetails.account.default_currency || 'usd',
        balance: accountDetails.balance,
        recentTransactions: accountDetails.recentTransactions,
        pendingPayouts: accountDetails.pendingPayouts,
        accountStatus: {
          detailsSubmitted: accountDetails.account.details_submitted,
          payoutsEnabled: accountDetails.account.payouts_enabled,
          chargesEnabled: accountDetails.account.charges_enabled
        }
      };
      
    } catch (error) {
      log(`❌ Error getting business banking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return safe fallback state
      return {
        success: false,
        hasAccount: false,
        requiresSetup: true,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Unable to retrieve banking status - please try again'
      };
    }
  }

  /**
   * Create new business banking account with comprehensive setup
   */
  static async createBusinessBankingAccount(userId: number, email?: string, businessName?: string) {
    try {
      log(`🏦 Creating business banking account for user ${userId}`);
      
      // Get user information
      const schema = getActiveSchema();
      const userResult = await db.select({
        id: schema.usersAuth.id,
        name: schema.therapistProfiles.name,
        email: schema.usersAuth.email,
        username: schema.usersAuth.username,
        legalBusinessName: schema.therapistProfiles.name,
        stripeConnectAccountId: schema.therapistProfiles.stripeConnectAccountId
      })
      .from(schema.usersAuth)
      .leftJoin(schema.therapistProfiles, eq(schema.usersAuth.id, schema.therapistProfiles.userId))
      .where(eq(schema.usersAuth.id, userId));

      if (!userResult || userResult.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult[0];
      
      // Check if user already has an account
      if (user.stripeConnectAccountId) {
        const validation = await StripeConnectService.validateConnectAccount(user.stripeConnectAccountId);
        
        if (validation.exists && validation.valid) {
          // Account exists and is valid, create new onboarding link
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const refreshUrl = `${baseUrl}/business-banking?refresh=true`;
          const returnUrl = `${baseUrl}/business-banking?success=true`;
          
          log(`🔗 Creating account link with BASE_URL: ${baseUrl}`);
          log(`🔗 Refresh URL: ${refreshUrl}`);
          log(`🔗 Return URL: ${returnUrl}`);
          
          const accountLink = await StripeConnectService.createAccountLink(
            user.stripeConnectAccountId,
            refreshUrl,
            returnUrl
          );
          
          return {
            success: true,
            isExisting: true,
            accountId: user.stripeConnectAccountId,
            accountLinkUrl: accountLink.url,
            message: 'Continuing with existing account'
          };
        } else {
          // Clean up invalid account
          await StripeConnectService.cleanupInvalidAccount(userId);
        }
      }

      // Create new account
      const finalEmail = email || user.email || `${user.username}@example.com`;
      const finalBusinessName = businessName || user.legalBusinessName || `${user.name}'s Practice`;
      
      const result = await StripeConnectService.createConnectAccount(userId, finalEmail, finalBusinessName);
      
      // Create onboarding link
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const refreshUrl = `${baseUrl}/business-banking?refresh=true`;
      const returnUrl = `${baseUrl}/business-banking?success=true`;
      
      log(`🔗 Creating account link for new account with BASE_URL: ${baseUrl}`);
      log(`🔗 Refresh URL: ${refreshUrl}`);
      log(`🔗 Return URL: ${returnUrl}`);
      
      const accountLink = await StripeConnectService.createAccountLink(
        result.accountId,
        refreshUrl,
        returnUrl
      );
      
      return {
        success: true,
        isExisting: false,
        accountId: result.accountId,
        accountLinkUrl: accountLink.url,
        message: 'New business banking account created successfully'
      };
      
    } catch (error) {
      log(`❌ Error creating business banking account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Re-throw Stripe not configured errors so they can be handled by the route
      if (error instanceof Error && error.message.includes('Stripe not configured')) {
        throw error;
      }
      
      throw new Error(`Failed to create business banking account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}