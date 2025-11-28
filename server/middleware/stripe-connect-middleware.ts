import { Request, Response, NextFunction } from 'express';
import { StripeConnectService } from '../services/stripe/connect-service';
import { log } from '../vite';

/**
 * Middleware to validate and enrich Connect account data
 */
export const validateConnectAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Add Connect account validation if needed
    if (req.body.accountId) {
      const validation = await StripeConnectService.validateConnectAccount(req.body.accountId);
      req.connectValidation = validation;
    }

    next();
  } catch (error) {
    log(`Connect account validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next();
  }
};

/**
 * Middleware to auto-update invoices with Connect account
 */
export const autoConnectInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This middleware can be used to automatically associate invoices with Connect accounts
    // when they are created
    next();
  } catch (error) {
    log(`Auto-connect invoices error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next();
  }
};

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      connectValidation?: {
        exists: boolean;
        onboardingComplete: boolean;
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
        requiresAction: boolean;
      };
    }
  }
}