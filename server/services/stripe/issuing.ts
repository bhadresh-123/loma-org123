import { stripe, updateCardholderTermsAcceptance } from './config';
import { log } from '../../vite';
import { db, isDatabaseAvailable } from '@db';
import { eq, desc } from 'drizzle-orm';
import { getActiveSchema } from '@db';
import { StripeConnectService } from './StripeConnectService';

/**
 * Create a new card cardholder record in Stripe
 * Uses Connect account if available, falls back to platform account
 */
export async function createCardHolder(params: {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  metadata?: Record<string, string>;
  firstName?: string;
  lastName?: string;
}) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    const { 
      userId, 
      name, 
      email, 
      phone, 
      metadata = {},
      // Use provided first/last name or split the full name if not provided
      firstName = name.split(' ')[0],
      lastName = name.split(' ').slice(1).join(' ') || 'User'
    } = params;
    
    // Get user's Connect account for issuing (if available)
    const connectService = new StripeConnectService();
    const connectAccount = await connectService.getConnectAccount(userId);
    
    const cardholderData = {
      name,
      email,
      phone_number: phone,
      type: 'individual' as const,
      individual: {
        first_name: firstName,
        last_name: lastName,
        // Add required fields for test mode activation
        dob: {
          day: 1,
          month: 1,
          year: 1990
        },
        // Include terms acceptance during creation
        card_issuing: {
          user_terms_acceptance: {
            date: Math.floor(Date.now() / 1000),
            ip: '127.0.0.1',
            user_agent: 'LOMA Mental Health Platform/1.0'
          }
        }
      },
      billing: {
        address: {
          line1: '123 Main St', // These would come from user profile in a real implementation
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94111',
          country: 'US',
        },
      },
      metadata: {
        userId: userId.toString(),
        connectAccountId: connectAccount?.stripeConnectAccountId || 'platform',
        ...metadata
      }
    };
    
    let cardholder;
    let issuingAccount = 'platform';
    
    // Try Connect account first if available and has issuing capability
    if (connectAccount?.stripeConnectAccountId) {
      try {
        log(`Attempting cardholder creation on Connect account: ${connectAccount.stripeConnectAccountId}`);
        
        // Check if Connect account has issuing capability
        const account = await stripe.accounts.retrieve(connectAccount.stripeConnectAccountId);
        
        if (account.capabilities?.card_issuing === 'active') {
          cardholder = await stripe.issuing.cardholders.create(cardholderData, {
            stripeAccount: connectAccount.stripeConnectAccountId
          });
          issuingAccount = 'connect';
          log(`✅ Cardholder created on Connect account: ${cardholder.id}`);
        } else {
          log(`Connect account lacks card_issuing capability, using platform account`);
          cardholder = await stripe.issuing.cardholders.create(cardholderData);
        }
      } catch (connectError) {
        log(`Connect account cardholder creation failed: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
        log(`Falling back to platform account`);
        cardholder = await stripe.issuing.cardholders.create(cardholderData);
      }
    } else {
      // No Connect account, use platform account
      log(`No Connect account found for user ${userId}, using platform account`);
      cardholder = await stripe.issuing.cardholders.create(cardholderData);
    }
    
    // Add issuing account info to metadata
    cardholder.metadata = {
      ...cardholder.metadata,
      issuingAccount
    };
    
    log(`Created cardholder for user ${userId} on ${issuingAccount} account: ${cardholder.id}`);
    return cardholder;
  } catch (error) {
    log(`Error creating cardholder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Create a new virtual card
 */
export async function createVirtualCard(params: {
  userId: number;
  cardholderName: string;
  cardholderEmail: string;
  cardholderPhone?: string;
  currency?: string;
  cardLimit?: number;
  metadata?: Record<string, string>;
}) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    const { 
      userId, 
      cardholderName, 
      cardholderEmail, 
      cardholderPhone, 
      currency = 'usd',
      cardLimit,
      metadata = {} 
    } = params;
    
    // Platform-level issuing - no Connect account required
    // Cards are issued directly on the platform account
    
    // Extract first name and last name from cardholder name
    const nameParts = cardholderName.split(' ');
    const firstName = nameParts[0] || 'Default';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    
    // Create a cardholder for this card if not provided
    const cardholder = await createCardHolder({
      userId,
      name: cardholderName,
      email: cardholderEmail,
      phone: cardholderPhone,
      firstName,
      lastName,
      metadata
    });
    
    // Create card request params
    const cardParams: any = {
      cardholder: cardholder.id,
      currency,
      type: 'virtual',
      metadata: {
        userId: userId.toString(),
        ...metadata
      }
    };
    
    // Add spending controls if a limit is provided
    if (cardLimit) {
      cardParams.spending_controls = {
        spending_limits: [
          {
            amount: Math.round(cardLimit * 100), // Stripe expects amount in cents
            interval: 'all_time'
          }
        ]
      };
    }
    
    // Create the card on the same account as the cardholder
    const stripeAccount = cardholder.metadata?.issuingAccount === 'connect' 
      ? cardholder.metadata?.connectAccountId 
      : undefined;
    
    const card = await stripe.issuing.cards.create(cardParams, stripeAccount ? {
      stripeAccount
    } : undefined);
    
    // After creating the card, automatically activate it
    try {
      log(`Activating virtual card: ${card.id} on ${stripeAccount ? 'Connect' : 'platform'} account`);
      const activatedCard = await stripe.issuing.cards.update(card.id, {
        status: 'active'
      }, stripeAccount ? { stripeAccount } : undefined);
      log(`Successfully activated virtual card: ${card.id}, status: ${activatedCard.status}`);
      
      // Update card object with activated status
      card.status = activatedCard.status;
    } catch (activationError) {
      log(`Warning: Could not activate card: ${activationError instanceof Error ? activationError.message : 'Unknown error'}`);
      // Continue anyway - card can be activated later
    }
    
    // Store the card in our database with default values for required fields
    let dbCard;
    if (!isDatabaseAvailable()) {
      log('Warning: Database not available, card created in Stripe but not stored locally');
      // Return a mock database card object for consistency
      dbCard = [{
        id: 0,
        userId,
        stripeCardId: card.id,
        cardholderName,
        type: 'virtual',
        status: card.status,
        cardLimit: cardLimit ? cardLimit.toString() : null,
        currency,
        last4: card.last4 || '0000',
        brand: card.brand || 'unknown',
        expMonth: card.exp_month || 12,
        expYear: card.exp_year || 2030,
        metadata: { ...metadata },
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    } else {
      dbCard = await db.insert(issuedCards).values({
        userId,
        stripeCardId: card.id,
        cardholderName,
        type: 'virtual',
        status: card.status,
        cardLimit: cardLimit ? cardLimit.toString() : null,
        currency,
        // Add default values for required fields that might not be available yet
        last4: card.last4 || '0000',  // Default last4 if not available
        brand: card.brand || 'unknown', // Default brand if not available
        expMonth: card.exp_month || 12, // Default exp month if not available
        expYear: card.exp_year || 2030, // Default exp year if not available
        metadata: {
          ...metadata
        }
      }).returning();
    }
    
    log(`Created virtual card for user ${userId}: ${card.id}`);
    return { card, dbCard: dbCard[0] };
  } catch (error) {
    log(`Error creating virtual card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Create a new physical card
 */
export async function createPhysicalCard(params: {
  userId: number;
  cardholderName: string;
  cardholderEmail: string;
  cardholderPhone?: string;
  currency?: string;
  cardLimit?: number;
  metadata?: Record<string, string>;
}) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    const { 
      userId, 
      cardholderName, 
      cardholderEmail, 
      cardholderPhone, 
      currency = 'usd',
      cardLimit,
      metadata = {} 
    } = params;
    
    // Platform-level issuing - no Connect account required
    // Cards are issued directly on the platform account
    
    // Extract first name and last name from cardholder name
    const nameParts = cardholderName.split(' ');
    const firstName = nameParts[0] || 'Default';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    
    // Create a cardholder for this card if not provided
    const cardholder = await createCardHolder({
      userId,
      name: cardholderName,
      email: cardholderEmail,
      phone: cardholderPhone,
      firstName,
      lastName,
      metadata
    });
    
    // Create card request params
    const cardParams: any = {
      cardholder: cardholder.id,
      currency,
      type: 'physical',
      shipping: {
        name: cardholderName,
        service: 'standard',
        address: {
          line1: '123 Main St', // These would come from user profile in a real implementation
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94111',
          country: 'US',
        },
      },
      metadata: {
        userId: userId.toString(),
        ...metadata
      }
    };
    
    // Add spending controls if a limit is provided
    if (cardLimit) {
      cardParams.spending_controls = {
        spending_limits: [
          {
            amount: Math.round(cardLimit * 100), // Stripe expects amount in cents
            interval: 'all_time'
          }
        ]
      };
    }
    
    // Create the card on the same account as the cardholder
    const stripeAccount = cardholder.metadata?.issuingAccount === 'connect' 
      ? cardholder.metadata?.connectAccountId 
      : undefined;
    
    const card = await stripe.issuing.cards.create(cardParams, stripeAccount ? {
      stripeAccount
    } : undefined);
    
    // After creating the card, automatically activate it
    try {
      log(`Activating physical card: ${card.id} on ${stripeAccount ? 'Connect' : 'platform'} account`);
      const activatedCard = await stripe.issuing.cards.update(card.id, {
        status: 'active'
      }, stripeAccount ? { stripeAccount } : undefined);
      log(`Successfully activated physical card: ${card.id}, status: ${activatedCard.status}`);
      
      // Update card object with activated status
      card.status = activatedCard.status;
    } catch (activationError) {
      log(`Warning: Could not activate card: ${activationError instanceof Error ? activationError.message : 'Unknown error'}`);
      // Continue anyway - card can be activated later
    }
    
    // Store the card in our database with default values for required fields
    let dbCard;
    if (!isDatabaseAvailable()) {
      log('Warning: Database not available, card created in Stripe but not stored locally');
      // Return a mock database card object for consistency
      dbCard = [{
        id: 0,
        userId,
        stripeCardId: card.id,
        cardholderName,
        type: 'physical',
        status: card.status,
        cardLimit: cardLimit ? cardLimit.toString() : null,
        currency,
        last4: card.last4 || '0000',
        brand: card.brand || 'unknown',
        expMonth: card.exp_month || 12,
        expYear: card.exp_year || 2030,
        metadata: { ...metadata },
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    } else {
      dbCard = await db.insert(issuedCards).values({
        userId,
        stripeCardId: card.id,
        cardholderName,
        type: 'physical',
        status: card.status,
        cardLimit: cardLimit ? cardLimit.toString() : null,
        currency,
        // Add default values for required fields that might not be available yet
        last4: card.last4 || '0000',  // Default last4 if not available
        brand: card.brand || 'unknown', // Default brand if not available
        expMonth: card.exp_month || 12, // Default exp month if not available
        expYear: card.exp_year || 2030, // Default exp year if not available
        metadata: {
          ...metadata
        }
      }).returning();
    }
    
    log(`Created physical card for user ${userId}: ${card.id}`);
    return { card, dbCard: dbCard[0] };
  } catch (error) {
    log(`Error creating physical card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Get all cards for a user
 */
export async function getUserCards(userId: number) {
  try {
    // Check if Stripe is configured before making any API calls
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    // Check if the issuedCards table exists in the schema
    // @ts-ignore - checking for optional table
    if (!db.query?.issuedCards) {
      log(`Cards tables not available in schema, returning empty array for user ${userId}`);
      return [];
    }

    // First check if the tables exist by trying a simple query
    try {
      // @ts-ignore - we checked it exists above
      await db.query.issuedCards.findFirst({
        where: (issuedCards: any, { eq }: any) => eq(issuedCards.userId, userId),
        limit: 1
      });
    } catch (error) {
      // If tables don't exist, return empty array
      if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        log(`Cards tables not found in database, returning empty array for user ${userId}`);
        return [];
      }
      throw error;
    }

    // Get cards from our database with their transactions
    // @ts-ignore - we checked it exists above
    const dbCards = await db.query.issuedCards.findMany({
      where: (issuedCards: any, { eq }: any) => eq(issuedCards.userId, userId),
      // @ts-ignore
      orderBy: (issuedCards: any, { desc }: any) => [desc(issuedCards.createdAt)],
      with: {
        transactions: {
          // @ts-ignore
          orderBy: (cardTransactions: any, { desc }: any) => [desc(cardTransactions.createdAt)],
          limit: 10
        }
      }
    });
    
    if (dbCards.length === 0) {
      return dbCards;
    }
    
    // Update cards with latest info from Stripe (platform account)
    // Note: This code will only execute if issuedCards table exists (checked at function start)
    // @ts-ignore - Type errors are expected since issuedCards may not exist in schema yet
    const updatedCards = await Promise.all(dbCards.map(async (dbCard: any) => {
      try {
        // Retrieve card from platform account
        if (!stripe) {
          return dbCard; // Skip Stripe update if not configured
        }
        const stripeCard = await stripe.issuing.cards.retrieve(dbCard.stripeCardId);
        
        // Update our database record if status or other details changed
        if (stripeCard.status !== dbCard.status || 
            stripeCard.last4 !== dbCard.last4 || 
            stripeCard.brand !== dbCard.brand ||
            stripeCard.exp_month !== dbCard.expMonth ||
            stripeCard.exp_year !== dbCard.expYear) {
          
          // Skip database update since tables don't exist yet
          // TODO: Once issuedCards table is added to schema, uncomment this
          /*
          await db.update(issuedCards)
            .set({
              status: stripeCard.status,
              last4: stripeCard.last4,
              brand: stripeCard.brand,
              expMonth: stripeCard.exp_month,
              expYear: stripeCard.exp_year,
              updatedAt: new Date()
            })
            .where(eq(issuedCards.id, dbCard.id));
          */
          
          // Update the dbCard object with new values while preserving transactions
          dbCard.status = stripeCard.status;
          dbCard.last4 = stripeCard.last4;
          dbCard.brand = stripeCard.brand;
          dbCard.expMonth = stripeCard.exp_month;
          dbCard.expYear = stripeCard.exp_year;
          
          return dbCard;
        }
        
        return dbCard;
      } catch (error) {
        // Check for Stripe Issuing not enabled errors - re-throw so route handler can catch it
        if (error instanceof Error && (
          error.message.includes('not set up to use Issuing') ||
          error.message.includes('card_issuing can only be requested') ||
          error.message.includes('Your account cannot currently make live charges') ||
          error.message.includes('No such issuing')
        )) {
          // Re-throw with a specific error message that the route handler can catch
          throw new Error('not set up to use Issuing');
        }
        log(`Error retrieving card ${dbCard.stripeCardId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return dbCard;
      }
    }));
    
    return updatedCards;
  } catch (error) {
    // Re-throw STRIPE_NOT_CONFIGURED errors so route handler can catch them
    if (error instanceof Error && error.message === 'STRIPE_NOT_CONFIGURED') {
      throw error;
    }
    // Check for Stripe Issuing not enabled errors
    if (error instanceof Error && (
      error.message.includes('not set up to use Issuing') ||
      error.message.includes('card_issuing can only be requested') ||
      error.message.includes('Your account cannot currently make live charges') ||
      error.message.includes('No such issuing')
    )) {
      throw new Error('not set up to use Issuing');
    }
    log(`Error fetching cards for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Get a specific card with its transactions
 */
export async function getCardWithTransactions(cardId: number, userId: number) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    // Check if the issuedCards table exists in the schema
    // @ts-ignore - checking for optional table
    if (!db.query?.issuedCards) {
      log(`Cards tables not available in schema for card ${cardId}`);
      throw new Error('Card management not available - database tables not initialized');
    }

    // First check if the tables exist
    try {
      // @ts-ignore - we checked it exists above
      await db.query.issuedCards.findFirst({
        where: (issuedCards: any, { eq }: any) => eq(issuedCards.id, cardId),
        limit: 1
      });
    } catch (error) {
      // If tables don't exist, throw appropriate error
      if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        log(`Cards tables not found for card ${cardId}`);
        throw new Error('Card management not available - database tables not initialized');
      }
      throw error;
    }

    // Get the card from our database
    // @ts-ignore - we checked it exists above
    const dbCard = await db.query.issuedCards.findFirst({
      where: (issuedCards: any, { eq }: any) => eq(issuedCards.id, cardId),
      with: {
        transactions: {
          // @ts-ignore
          orderBy: (cardTransactions: any, { desc }: any) => [desc(cardTransactions.createdAt)]
        }
      }
    });
    
    if (!dbCard || dbCard.userId !== userId) {
      log(`Card not found or access denied: ${cardId} for user ${userId}`);
      throw new Error('Card not found or access denied');
    }
    
    try {
      // Get the latest card details from Stripe platform account
      const stripeCard = await stripe.issuing.cards.retrieve(dbCard.stripeCardId);
      
      // Update our database record if status or other details changed
      if (stripeCard.status !== dbCard.status || 
          stripeCard.last4 !== dbCard.last4 || 
          stripeCard.brand !== dbCard.brand ||
          stripeCard.exp_month !== dbCard.expMonth ||
          stripeCard.exp_year !== dbCard.expYear) {
        
        const [updatedCard] = await db.update(issuedCards)
          .set({
            status: stripeCard.status,
            last4: stripeCard.last4,
            brand: stripeCard.brand,
            expMonth: stripeCard.exp_month,
            expYear: stripeCard.exp_year,
            updatedAt: new Date()
          })
          .where(eq(issuedCards.id, dbCard.id))
          .returning();
        
        // Replace the dbCard with updated info
        Object.assign(dbCard, updatedCard);
      }
      
      // Fetch transactions from Stripe that might not be in our database yet
      const transactions = await stripe.issuing.transactions.list({
        card: dbCard.stripeCardId,
        limit: 10
      });
      
      // Add any missing transactions to our database
      const existingTransactionIds = new Set(
        dbCard.transactions.map(t => t.stripeTransactionId)
      );
      
      const newTransactions = [];
      
      for (const transaction of transactions.data) {
        if (!existingTransactionIds.has(transaction.id)) {
          // Create transaction with fields that match actual database structure
          const newTransaction = await db.insert(cardTransactions).values({
            cardId: dbCard.id,
            userId: dbCard.userId, // Add user ID explicitly
            stripeTransactionId: transaction.id,
            amount: (transaction.amount / 100).toString(), // Convert from cents
            currency: transaction.currency,
            description: transaction.merchant_data?.name || 'Unknown Merchant',
            type: transaction.type || 'unknown',
            metadata: {
              merchantName: transaction.merchant_data?.name || null,
              merchantCategory: transaction.merchant_data?.category || null,
              timestamp: new Date(transaction.created * 1000).toISOString(),
              processingDate: transaction.network_data?.processing_date || null
            }
          }).returning();
          
          newTransactions.push(newTransaction[0]);
        }
      }
      
      // Combine existing and new transactions
      dbCard.transactions = [...newTransactions, ...dbCard.transactions];
      
      return dbCard;
    } catch (error) {
      log(`Error retrieving card details from Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return dbCard;
    }
  } catch (error) {
    log(`Error fetching card with transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Update card status (e.g., activate, deactivate, cancel)
 */
export async function updateCardStatus(params: {
  userId: number;
  cardId: number;
  status: 'active' | 'inactive' | 'canceled';
}) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    // Check if the issuedCards table exists in the schema
    // @ts-ignore - checking for optional table
    if (!db.query?.issuedCards) {
      log(`Cards tables not available in schema`);
      throw new Error('Card management not available - database tables not initialized');
    }

    const { userId, cardId, status } = params;
    
    // Get the card from our database
    // @ts-ignore - we checked it exists above
    const dbCard = await db.query.issuedCards.findFirst({
      where: (issuedCards: any, { eq }: any) => eq(issuedCards.id, cardId)
    });
    
    if (!dbCard || dbCard.userId !== userId) {
      log(`Card not found or access denied: ${cardId} for user ${userId}`);
      throw new Error('Card not found or access denied');
    }
    
    // Map our status to Stripe's status
    const stripeStatus = status === 'active' ? 'active' : 'inactive';
    
    // Update card in Stripe platform account
    const stripeCard = await stripe.issuing.cards.update(dbCard.stripeCardId, {
      status: stripeStatus
    });
    
    // Update our database
    const [updatedCard] = await db.update(issuedCards)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(issuedCards.id, cardId))
      .returning();
    
    log(`Updated card status for ${dbCard.stripeCardId} to ${status}`);
    return updatedCard;
  } catch (error) {
    log(`Error updating card status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Get card details (including sensitive information like numbers)
 * This would be used to display the full card details to authorized users
 */
export async function getCardDetails(params: {
  userId: number;
  cardId: number;
}) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    // Check if the issuedCards table exists in the schema
    // @ts-ignore - checking for optional table
    if (!db.query?.issuedCards) {
      log(`Cards tables not available in schema`);
      throw new Error('Card management not available - database tables not initialized');
    }

    const { userId, cardId } = params;
    
    // Get the card from our database
    // @ts-ignore - we checked it exists above
    const dbCard = await db.query.issuedCards.findFirst({
      where: (issuedCards: any, { eq }: any) => eq(issuedCards.id, cardId)
    });
    
    if (!dbCard || dbCard.userId !== userId) {
      log(`Card not found or access denied: ${cardId} for user ${userId}`);
      throw new Error('Card not found or access denied');
    }
    
    // For virtual cards, get the card number
    if (dbCard.type === 'virtual') {
      // Retrieve basic card info from platform account
      const cardDetails = await stripe.issuing.cards.retrieve(dbCard.stripeCardId);
      
      return {
        ...dbCard,
        details: {
          // In a real implementation, we'd retrieve these fields after properly expanding them
          // For this prototype, we'll return placeholders
          number: "•••• •••• •••• " + (dbCard.last4 || "0000"),
          cvc: "•••",
          expMonth: dbCard.expMonth || 12,
          expYear: dbCard.expYear || 2030
        }
      };
    }
    
    // For physical cards, we can't get the full number
    return dbCard;
  } catch (error) {
    log(`Error fetching card details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}