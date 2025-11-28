import { Router, Request, Response } from 'express';
import { updateConnectAccountCapabilities } from '../services/stripe/update-connect-capabilities';
import { log } from '../vite';

const router = Router();

// Middleware to check if the user is authenticated
import { authenticateToken } from '../auth-simple';

// Update a specific Connect account with issuing capability
router.post('/update-account-capabilities', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }
    
    // Update the account capabilities
    const updatedAccount = await updateConnectAccountCapabilities(accountId);
    
    return res.json({
      success: true,
      account: {
        id: updatedAccount.id,
        capabilities: updatedAccount.capabilities
      }
    });
  } catch (error) {
    log(`Error updating account capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

export default router;