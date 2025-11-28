import { db, getActiveSchema } from '@db';
import { eq } from 'drizzle-orm';
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth-simple';
import { BusinessBankingService } from '../services/stripe/BusinessBankingService';
import { StripeConnectService } from '../services/stripe/StripeConnectService';
import { log } from '../vite';

const router = Router();

// Create a Connect Custom account using A+ service
router.post('/create-connect-account', authenticateToken, async (req: Request, res: Response) => {
      const schema = getActiveSchema();
  try {
    const userId = req.user!.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Extract parameters from request
    const { email, businessName } = req.body;
    
    // Use the A+ grade service for account creation
    const result = await BusinessBankingService.createBusinessBankingAccount(userId, email, businessName);
    
    return res.json(result);
    
  } catch (error) {
    log(`❌ Error in create-connect-account endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Handle Stripe not configured error gracefully
    if (error instanceof Error && error.message.includes('Stripe not configured')) {
      return res.status(200).json({
        success: false,
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured for local development. Business banking features require Stripe setup.',
        requiresStripeSetup: true,
        developmentMode: process.env.NODE_ENV === 'development'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Get Connect account information using A+ service
router.get('/get-connect-account', authenticateToken, async (req: Request, res: Response) => {
      const schema = getActiveSchema();
  try {
    const userId = req.user!.id;
    log(`🏦 Fetching business banking status for user: ${userId}`);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Use the A+ grade service for comprehensive status
    const bankingStatus = await BusinessBankingService.getBusinessBankingStatus(userId);
    
    // Return the comprehensive status
    return res.json(bankingStatus);
    
  } catch (error) {
    log(`❌ Error in get-connect-account endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      hasAccount: false,
      requiresSetup: true
    });
  }
});

// Create account link for continuing onboarding
router.post('/create-account-link', authenticateToken, async (req: Request, res: Response) => {
      const schema = getActiveSchema();
  try {
    const userId = req.user!.id;
    const { accountId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }
    
    // Create an account link using the service
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const refreshUrl = `${baseUrl}/business-banking?refresh=true`;
    const returnUrl = `${baseUrl}/business-banking?success=true`;
    
    log(`🔗 Creating account link with BASE_URL: ${baseUrl}`);
    log(`🔗 Refresh URL: ${refreshUrl}`);
    log(`🔗 Return URL: ${returnUrl}`);
    
    const accountLink = await StripeConnectService.createAccountLink(
      accountId,
      refreshUrl,
      returnUrl
    );
    
    return res.json({
      success: true,
      url: accountLink.url
    });
  } catch (error) {
    log(`Error creating account link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Get dashboard link
router.get('/dashboard-link', authenticateToken, async (req: Request, res: Response) => {
  const schema = getActiveSchema();
  try {
    const userId = req.user!.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Fetch therapist profile to get Connect account ID
    const profileResult = await db.select({
      stripeConnectAccountId: schema.therapistProfiles.stripeConnectAccountId
    }).from(schema.therapistProfiles).where(eq(schema.therapistProfiles.userId, userId));
    
    if (!profileResult || profileResult.length === 0 || !profileResult[0].stripeConnectAccountId) {
      return res.status(404).json({
        success: false,
        error: 'No Connect account found'
      });
    }
    
    // Create a login link for the Connect account using the service
    const loginLink = await StripeConnectService.createDashboardLink(profileResult[0].stripeConnectAccountId);
    
    return res.json({
      success: true,
      url: loginLink.url
    });
  } catch (error) {
    log(`Error creating dashboard link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

export default router;