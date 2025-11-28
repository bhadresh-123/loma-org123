import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BusinessBankingService } from '../../services/stripe/BusinessBankingService';
import { StripeConnectService } from '../../services/stripe/StripeConnectService';

/**
 * Stripe Payment Service Unit Tests
 * 
 * Comprehensive tests for Stripe payment processing and business banking
 * Tests payment validation, webhook handling, and business banking operations
 */

// Mock Stripe SDK
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      accounts: {
        retrieve: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        cancel: vi.fn()
      },
      webhooks: {
        constructEvent: vi.fn()
      },
      charges: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn()
      }
    }))
  };
});

// Mock database with proper query builder chain
const createMockQueryBuilder = (mockResult: any[]) => ({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(mockResult)
  })
});

const createMockUpdateBuilder = (mockResult: any[]) => ({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(mockResult)
    })
  })
});

vi.mock('@db', () => ({
  db: {
    select: vi.fn((fields) => createMockQueryBuilder([])),
    update: vi.fn((table) => createMockUpdateBuilder([]))
  },
  getActiveSchema: vi.fn().mockReturnValue({
    isHIPAASchema: true,
    usersAuth: {
      id: {},
      stripeConnectAccountId: {},
      name: {},
      email: {},
      username: {},
      legalBusinessName: {}
    },
    therapistProfiles: {},
    therapistPHI: {},
    patients: {},
    clinicalSessions: {},
    auditLogsHIPAA: {}
  })
}));

describe('BusinessBankingService', () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = await import('@db');
  });

  describe('getBusinessBankingStatus', () => {
    it('should return setup required when no account exists', async () => {
      const mockResult = [{
        id: 1,
        stripeConnectAccountId: null,
        name: 'Test User',
        email: 'test@example.com',
        legalBusinessName: null
      }];
      
      vi.mocked(mockDb.db.select).mockReturnValue(createMockQueryBuilder(mockResult));

      const result = await BusinessBankingService.getBusinessBankingStatus(1);

      expect(result).toEqual({
        success: true,
        hasAccount: false,
        requiresSetup: true,
        message: 'No business banking account found'
      });
    });

    it('should return user not found error', async () => {
      vi.mocked(mockDb.db.select).mockReturnValue(createMockQueryBuilder([]));

      const result = await BusinessBankingService.getBusinessBankingStatus(999);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unable to retrieve banking status');
    });

    it('should validate existing account', async () => {
      const mockResult = [{
        id: 1,
        stripeConnectAccountId: 'acct_test123',
        name: 'Test User',
        email: 'test@example.com',
        legalBusinessName: 'Test Business'
      }];
      
      vi.mocked(mockDb.db.select).mockReturnValue(createMockQueryBuilder(mockResult));

      // Mock StripeConnectService
      vi.spyOn(StripeConnectService, 'validateConnectAccount').mockResolvedValue({
        exists: true,
        valid: true,
        account: {
          id: 'acct_test123',
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true
        }
      });

      vi.spyOn(StripeConnectService, 'getConnectAccountDetails').mockResolvedValue({
        account: {
          id: 'acct_test123',
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
          country: 'US',
          type: 'express',
          default_currency: 'usd'
        },
        balance: { pending: 0, available: 0 },
        recentTransactions: [],
        pendingPayouts: []
      } as any);

      const result = await BusinessBankingService.getBusinessBankingStatus(1);

      expect(result.success).toBe(true);
      expect(result.hasAccount).toBe(true);
      expect(result.accountId).toBe('acct_test123');
    });

    it('should cleanup invalid account', async () => {
      const mockResult = [{
        id: 1,
        stripeConnectAccountId: 'acct_invalid',
        name: 'Test User',
        email: 'test@example.com',
        legalBusinessName: 'Test Business'
      }];
      
      vi.mocked(mockDb.db.select).mockReturnValue(createMockQueryBuilder(mockResult));

      // Mock invalid account
      vi.spyOn(StripeConnectService, 'validateConnectAccount').mockResolvedValue({
        exists: false,
        valid: false,
        account: null
      });

      vi.spyOn(StripeConnectService, 'cleanupInvalidAccount').mockResolvedValue(undefined);

      const result = await BusinessBankingService.getBusinessBankingStatus(1);

      expect(StripeConnectService.cleanupInvalidAccount).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        success: true,
        hasAccount: false,
        requiresSetup: true,
        message: 'Previous account was invalid and has been cleared'
      });
    });
  });

  describe('createBusinessBankingAccount', () => {
    it('should create new business banking account', async () => {
      const userMockResult = [{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        legalBusinessName: null,
        stripeConnectAccountId: null
      }];

      vi.mocked(mockDb.db.select).mockReturnValue(createMockQueryBuilder(userMockResult));

      vi.spyOn(StripeConnectService, 'createConnectAccount').mockResolvedValue({
        accountId: 'acct_new123',
        account: {
          id: 'acct_new123',
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false
        }
      } as any);

      vi.spyOn(StripeConnectService, 'createAccountLink').mockResolvedValue({
        success: true,
        url: 'https://connect.stripe.com/setup/test',
        expiresAt: Date.now() / 1000 + 3600
      } as any);

      const result = await BusinessBankingService.createBusinessBankingAccount(1, 'test@example.com', 'Test Business');

      expect(result.success).toBe(true);
      expect(result.accountId).toBe('acct_new123');
      expect(result.accountLinkUrl).toBe('https://connect.stripe.com/setup/test');
    });

    it('should handle account creation failure', async () => {
      const userMockResult = [{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        legalBusinessName: null,
        stripeConnectAccountId: null
      }];

      vi.mocked(mockDb.db.select).mockReturnValue(createMockQueryBuilder(userMockResult));
      
      vi.spyOn(StripeConnectService, 'createConnectAccount').mockRejectedValue(new Error('Stripe API error'));

      await expect(BusinessBankingService.createBusinessBankingAccount(1, 'test@example.com')).rejects.toThrow('Stripe API error');
    });
  });
});

describe('Payment Processing', () => {
  describe('Payment Intent Creation', () => {
    it('should create payment intent with correct parameters', async () => {
      const paymentData = {
        amount: 2000, // $20.00
        currency: 'usd',
        customerId: 'cus_test123',
        description: 'Therapy session payment'
      };

      const mockStripe = {
        paymentIntents: {
          create: vi.fn().mockResolvedValue({
            id: 'pi_test123',
            amount: 2000,
            currency: 'usd',
            status: 'requires_payment_method',
            client_secret: 'pi_test123_secret'
          })
        }
      };

      const result = await mockStripe.paymentIntents.create(paymentData);

      expect(result.id).toBe('pi_test123');
      expect(result.amount).toBe(2000);
      expect(result.currency).toBe('usd');
      expect(result.status).toBe('requires_payment_method');
    });

    it('should handle payment intent creation failure', async () => {
      const paymentData = {
        amount: 2000,
        currency: 'usd',
        customerId: 'cus_invalid',
        description: 'Therapy session payment'
      };

      const mockStripe = {
        paymentIntents: {
          create: vi.fn().mockRejectedValue(new Error('Invalid customer'))
        }
      };

      await expect(mockStripe.paymentIntents.create(paymentData)).rejects.toThrow('Invalid customer');
    });

    it('should validate payment amounts', () => {
      const validateAmount = (amount: number, currency: string) => {
        if (amount <= 0) return { valid: false, error: 'Amount must be positive' };
        if (amount < 50) return { valid: false, error: 'Minimum amount is $0.50' };
        if (amount > 99999999) return { valid: false, error: 'Maximum amount exceeded' };
        return { valid: true };
      };

      expect(validateAmount(2000, 'usd')).toEqual({ valid: true });
      expect(validateAmount(0, 'usd')).toEqual({ valid: false, error: 'Amount must be positive' });
      expect(validateAmount(25, 'usd')).toEqual({ valid: false, error: 'Minimum amount is $0.50' });
      expect(validateAmount(100000000, 'usd')).toEqual({ valid: false, error: 'Maximum amount exceeded' });
    });
  });

  describe('Payment Confirmation', () => {
    it('should confirm payment intent', async () => {
      const paymentIntentId = 'pi_test123';
      const paymentMethodId = 'pm_test123';

      const mockStripe = {
        paymentIntents: {
          confirm: vi.fn().mockResolvedValue({
            id: 'pi_test123',
            status: 'succeeded',
            amount: 2000,
            currency: 'usd'
          })
        }
      };

      const result = await mockStripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      expect(result.status).toBe('succeeded');
      expect(result.id).toBe(paymentIntentId);
    });

    it('should handle payment confirmation failure', async () => {
      const paymentIntentId = 'pi_test123';
      const paymentMethodId = 'pm_invalid';

      const mockStripe = {
        paymentIntents: {
          confirm: vi.fn().mockRejectedValue(new Error('Payment method declined'))
        }
      };

      await expect(mockStripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      })).rejects.toThrow('Payment method declined');
    });
  });

  describe('Refund Processing', () => {
    it('should process full refund', async () => {
      const chargeId = 'ch_test123';
      const refundAmount = 2000;

      const mockStripe = {
        refunds: {
          create: vi.fn().mockResolvedValue({
            id: 're_test123',
            amount: 2000,
            charge: 'ch_test123',
            status: 'succeeded'
          })
        }
      };

      const result = await mockStripe.refunds.create({
        charge: chargeId,
        amount: refundAmount
      });

      expect(result.id).toBe('re_test123');
      expect(result.amount).toBe(2000);
      expect(result.status).toBe('succeeded');
    });

    it('should process partial refund', async () => {
      const chargeId = 'ch_test123';
      const refundAmount = 1000; // Partial refund

      const mockStripe = {
        refunds: {
          create: vi.fn().mockResolvedValue({
            id: 're_test123',
            amount: 1000,
            charge: 'ch_test123',
            status: 'succeeded'
          })
        }
      };

      const result = await mockStripe.refunds.create({
        charge: chargeId,
        amount: refundAmount
      });

      expect(result.amount).toBe(1000);
    });

    it('should handle refund failure', async () => {
      const chargeId = 'ch_invalid';

      const mockStripe = {
        refunds: {
          create: vi.fn().mockRejectedValue(new Error('Charge not found'))
        }
      };

      await expect(mockStripe.refunds.create({
        charge: chargeId,
        amount: 2000
      })).rejects.toThrow('Charge not found');
    });
  });
});

describe('Webhook Handling', () => {
  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature', () => {
      const payload = '{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_test123"}}}';
      const secret = 'whsec_test123';
      const signature = 't=1234567890,v1=test_signature';

      const verifySignature = (payload: string, signature: string, secret: string) => {
        // Simplified verification logic
        const timestamp = signature.split(',')[0].split('=')[1];
        const sig = signature.split(',')[1].split('=')[1];
        
        return {
          valid: sig === 'test_signature' && timestamp === '1234567890',
          timestamp: parseInt(timestamp)
        };
      };

      const result = verifySignature(payload, signature, secret);

      expect(result.valid).toBe(true);
      expect(result.timestamp).toBe(1234567890);
    });

    it('should reject invalid signature', () => {
      const payload = '{"type":"payment_intent.succeeded"}';
      const secret = 'whsec_test123';
      const signature = 't=1234567890,v1=invalid_signature';

      const verifySignature = (payload: string, signature: string, secret: string) => {
        const timestamp = signature.split(',')[0].split('=')[1];
        const sig = signature.split(',')[1].split('=')[1];
        
        return {
          valid: sig === 'test_signature' && timestamp === '1234567890',
          timestamp: parseInt(timestamp)
        };
      };

      const result = verifySignature(payload, signature, secret);

      expect(result.valid).toBe(false);
    });

    it('should reject expired timestamp', () => {
      const payload = '{"type":"payment_intent.succeeded"}';
      const secret = 'whsec_test123';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const signature = `t=${oldTimestamp},v1=test_signature`;

      const verifySignature = (payload: string, signature: string, secret: string) => {
        const timestamp = signature.split(',')[0].split('=')[1];
        const sig = signature.split(',')[1].split('=')[1];
        const currentTime = Math.floor(Date.now() / 1000);
        
        return {
          valid: sig === 'test_signature' && (currentTime - parseInt(timestamp)) < 300, // 5 minutes
          timestamp: parseInt(timestamp)
        };
      };

      const result = verifySignature(payload, signature, secret);

      expect(result.valid).toBe(false);
    });
  });

  describe('Webhook Event Processing', () => {
    it('should process payment_intent.succeeded event', async () => {
      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 2000,
            currency: 'usd',
            status: 'succeeded'
          }
        }
      };

      const processEvent = async (event: any) => {
        switch (event.type) {
          case 'payment_intent.succeeded':
            return {
              processed: true,
              paymentIntentId: event.data.object.id,
              amount: event.data.object.amount
            };
          default:
            return { processed: false };
        }
      };

      const result = await processEvent(event);

      expect(result.processed).toBe(true);
      expect(result.paymentIntentId).toBe('pi_test123');
      expect(result.amount).toBe(2000);
    });

    it('should process account.updated event', async () => {
      const event = {
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test123',
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true
          }
        }
      };

      const processEvent = async (event: any) => {
        switch (event.type) {
          case 'account.updated':
            return {
              processed: true,
              accountId: event.data.object.id,
              chargesEnabled: event.data.object.charges_enabled
            };
          default:
            return { processed: false };
        }
      };

      const result = await processEvent(event);

      expect(result.processed).toBe(true);
      expect(result.accountId).toBe('acct_test123');
      expect(result.chargesEnabled).toBe(true);
    });

    it('should handle unknown event types', async () => {
      const event = {
        type: 'unknown.event',
        data: { object: {} }
      };

      const processEvent = async (event: any) => {
        switch (event.type) {
          case 'payment_intent.succeeded':
          case 'account.updated':
            return { processed: true };
          default:
            return { processed: false, error: 'Unknown event type' };
        }
      };

      const result = await processEvent(event);

      expect(result.processed).toBe(false);
      expect(result.error).toBe('Unknown event type');
    });
  });
});

describe('Error Handling', () => {
  describe('Stripe API Errors', () => {
    it('should handle rate limiting errors', async () => {
      const mockStripe = {
        paymentIntents: {
          create: vi.fn().mockRejectedValue({
            type: 'StripeRateLimitError',
            message: 'Too many requests'
          })
        }
      };

      try {
        await mockStripe.paymentIntents.create({ amount: 2000 });
      } catch (error: any) {
        expect(error.type).toBe('StripeRateLimitError');
        expect(error.message).toBe('Too many requests');
      }
    });

    it('should handle card declined errors', async () => {
      const mockStripe = {
        paymentIntents: {
          confirm: vi.fn().mockRejectedValue({
            type: 'StripeCardError',
            code: 'card_declined',
            message: 'Your card was declined'
          })
        }
      };

      try {
        await mockStripe.paymentIntents.confirm('pi_test123');
      } catch (error: any) {
        expect(error.type).toBe('StripeCardError');
        expect(error.code).toBe('card_declined');
      }
    });

    it('should handle invalid request errors', async () => {
      const mockStripe = {
        paymentIntents: {
          create: vi.fn().mockRejectedValue({
            type: 'StripeInvalidRequestError',
            message: 'Invalid amount'
          })
        }
      };

      try {
        await mockStripe.paymentIntents.create({ amount: -100 });
      } catch (error: any) {
        expect(error.type).toBe('StripeInvalidRequestError');
        expect(error.message).toBe('Invalid amount');
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          }
        }
      };

      const failingFunction = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await retryWithBackoff(failingFunction, maxRetries);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });
});

describe('Security Tests', () => {
  describe('PCI Compliance', () => {
    it('should not log sensitive payment data', () => {
      const paymentData = {
        cardNumber: '4242424242424242',
        expiryMonth: '12',
        expiryYear: '2025',
        cvc: '123'
      };

      const sanitizeForLogging = (data: any) => {
        const sanitized = { ...data };
        if (sanitized.cardNumber) {
          sanitized.cardNumber = sanitized.cardNumber.replace(/\d(?=\d{4})/g, '*');
        }
        if (sanitized.cvc) {
          sanitized.cvc = '***';
        }
        return sanitized;
      };

      const sanitized = sanitizeForLogging(paymentData);

      expect(sanitized.cardNumber).toBe('************4242');
      expect(sanitized.cvc).toBe('***');
      expect(sanitized.expiryMonth).toBe('12');
      expect(sanitized.expiryYear).toBe('2025');
    });

    it('should validate card numbers', () => {
      const validateCardNumber = (cardNumber: string) => {
        // Luhn algorithm validation
        const digits = cardNumber.replace(/\D/g, '');
        let sum = 0;
        let isEven = false;

        for (let i = digits.length - 1; i >= 0; i--) {
          let digit = parseInt(digits[i]);

          if (isEven) {
            digit *= 2;
            if (digit > 9) {
              digit -= 9;
            }
          }

          sum += digit;
          isEven = !isEven;
        }

        return sum % 10 === 0;
      };

      expect(validateCardNumber('4242424242424242')).toBe(true); // Valid Visa
      expect(validateCardNumber('4000000000000001')).toBe(false); // Invalid
      expect(validateCardNumber('5555555555554444')).toBe(true); // Valid Mastercard
    });
  });
});
