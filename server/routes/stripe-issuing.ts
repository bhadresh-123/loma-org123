import { Router, Request, Response, NextFunction } from 'express';
import { 
  createVirtualCard,
  createPhysicalCard,
  getUserCards,
  getCardWithTransactions,
  updateCardStatus,
  getCardDetails
} from '../services/stripe/issuing';
import { log } from '../vite';
import { validateStripeConfig } from '../services/stripe/config';

// Create a router
const router = Router();

// Import the actual authenticateToken middleware
import { authenticateToken } from '../auth-simple';

// Create a virtual card
router.post('/create-virtual-card', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate Stripe configuration
    const isConfigValid = await validateStripeConfig();
    if (!isConfigValid) {
      log('Stripe configuration is invalid');
      return res.status(500).json({
        success: false,
        error: 'Invalid Stripe configuration. Please check your API keys.'
      });
    }

    const userId = req.user!.id!;
    const { 
      cardholderName, 
      cardholderEmail, 
      cardholderPhone,
      currency,
      cardLimit,
      metadata
    } = req.body;

    // Validate required fields
    if (!cardholderName || !cardholderEmail) {
      return res.status(400).json({
        success: false,
        error: 'Cardholder name and email are required'
      });
    }

    // Create the virtual card
    const result = await createVirtualCard({
      userId,
      cardholderName,
      cardholderEmail,
      cardholderPhone,
      currency,
      cardLimit,
      metadata
    });

    return res.json({
      success: true,
      card: result.dbCard
    });
  } catch (error) {
    log(`Error creating virtual card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Create a physical card
router.post('/create-physical-card', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate Stripe configuration
    const isConfigValid = await validateStripeConfig();
    if (!isConfigValid) {
      log('Stripe configuration is invalid');
      return res.status(500).json({
        success: false,
        error: 'Invalid Stripe configuration. Please check your API keys.'
      });
    }

    const userId = req.user!.id!;
    const { 
      cardholderName, 
      cardholderEmail, 
      cardholderPhone,
      currency,
      cardLimit,
      metadata
    } = req.body;

    // Validate required fields
    if (!cardholderName || !cardholderEmail) {
      return res.status(400).json({
        success: false,
        error: 'Cardholder name and email are required'
      });
    }

    // Create the physical card
    const result = await createPhysicalCard({
      userId,
      cardholderName,
      cardholderEmail,
      cardholderPhone,
      currency,
      cardLimit,
      metadata
    });

    return res.json({
      success: true,
      card: result.dbCard
    });
  } catch (error) {
    log(`Error creating physical card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Get all cards for a user
router.get('/cards', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate Stripe configuration
    const isConfigValid = await validateStripeConfig();
    if (!isConfigValid) {
      log('Stripe configuration is invalid');
      return res.status(200).json({
        success: false,
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Sign up for Loma business banking to access cards',
        requiresOnboarding: true
      });
    }

    const userId = req.user!.id!;
    const cards = await getUserCards(userId);

    // Debug logging to see what data structure is being returned
    log(`Cards API response for user ${userId}:`, JSON.stringify(cards, null, 2));

    return res.json({
      success: true,
      cards
    });
  } catch (error) {
    log(`Error fetching cards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Handle Stripe not configured error
    if (error instanceof Error && error.message === 'STRIPE_NOT_CONFIGURED') {
      return res.status(200).json({
        success: false,
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Sign up for Loma business banking to access cards',
        requiresOnboarding: true
      });
    }
    
    // Special handling for Stripe Issuing not being enabled
    if (error instanceof Error && error.message.includes('not set up to use Issuing')) {
      return res.status(200).json({
        success: false,
        error: 'STRIPE_ISSUING_NOT_ENABLED',
        message: 'Sign up for Loma business banking to access cards',
        requiresOnboarding: true
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Get a specific card with its transactions
router.get('/cards/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate Stripe configuration
    const isConfigValid = await validateStripeConfig();
    if (!isConfigValid) {
      log('Stripe configuration is invalid');
      return res.status(500).json({
        success: false,
        error: 'Invalid Stripe configuration. Please check your API keys.'
      });
    }

    const userId = req.user!.id!;
    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    const card = await getCardWithTransactions(cardId, userId);

    return res.json({
      success: true,
      card
    });
  } catch (error) {
    log(`Error fetching card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Update card status
router.post('/cards/:id/update-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate Stripe configuration
    const isConfigValid = await validateStripeConfig();
    if (!isConfigValid) {
      log('Stripe configuration is invalid');
      return res.status(500).json({
        success: false,
        error: 'Invalid Stripe configuration. Please check your API keys.'
      });
    }

    const userId = req.user!.id!;
    const cardId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    if (!status || !['active', 'inactive', 'canceled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: active, inactive, canceled'
      });
    }

    const updatedCard = await updateCardStatus({
      userId,
      cardId,
      status: status as 'active' | 'inactive' | 'canceled'
    });

    return res.json({
      success: true,
      card: updatedCard
    });
  } catch (error) {
    log(`Error updating card status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Get sensitive card details (for authorized users)
router.get('/cards/:id/details', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate Stripe configuration
    const isConfigValid = await validateStripeConfig();
    if (!isConfigValid) {
      log('Stripe configuration is invalid');
      return res.status(500).json({
        success: false,
        error: 'Invalid Stripe configuration. Please check your API keys.'
      });
    }

    const userId = req.user!.id!;
    const cardId = parseInt(req.params.id);

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    const cardDetails = await getCardDetails({
      userId,
      cardId
    });

    return res.json({
      success: true,
      card: cardDetails
    });
  } catch (error) {
    log(`Error fetching card details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

export default router;