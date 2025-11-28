import { stripe } from './config';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { getActiveSchema } from '@db';
import { log } from '../../vite';
import { categorizeTransaction } from './mcc-categorization';

/**
 * Backfill missing card transactions from Stripe
 */
export async function backfillCardTransactions(userId: number) {
  try {
    if (!stripe) {
      throw new Error('STRIPE_NOT_CONFIGURED');
    }

    log(`Starting card transaction backfill for user ${userId}`);
    
    // Get all cards for this user
    const userCards = await db
      .select()
      .from(issuedCards)
      .where(eq(issuedCards.userId, userId));
    
    log(`Found ${userCards.length} cards for user ${userId}`);
    
    let totalProcessed = 0;
    let totalNew = 0;
    
    for (const card of userCards) {
      try {
        log(`Processing card ${card.last4} (${card.stripeCardId})`);
        
        // Get all transactions for this card from Stripe
        const transactions = await stripe.issuing.transactions.list({
          card: card.stripeCardId,
          limit: 100
        });
        
        log(`Found ${transactions.data.length} transactions for card ${card.last4}`);
        
        for (const transaction of transactions.data) {
          totalProcessed++;
          
          // Check if we already have this transaction
          const [existing] = await db
            .select()
            .from(cardTransactions)
            .where(eq(cardTransactions.stripeTransactionId, transaction.id))
            .limit(1);
          
          if (existing) {
            log(`Transaction ${transaction.id} already exists, skipping`);
            continue;
          }
          
          // Categorize the transaction
          const mccCode = transaction.merchant?.category;
          const category = categorizeTransaction(mccCode, transaction.merchant?.name);
          
          // Create new transaction record
          const newTransaction = {
            userId: card.userId,
            cardId: card.id,
            stripeTransactionId: transaction.id,
            amount: transaction.amount / 100, // Convert cents to dollars
            currency: transaction.currency,
            description: transaction.merchant?.name || 'Unknown Merchant',
            type: transaction.type,
            category: category.category,
            subcategory: category.subcategory,
            taxDeductible: category.taxDeductible,
            mccCode: mccCode,
            metadata: {
              timestamp: new Date(transaction.created * 1000).toISOString(),
              backfilled: true,
              merchantName: transaction.merchant?.name,
              merchantCategory: transaction.merchant?.category
            }
          };
          
          await db.insert(cardTransactions).values(newTransaction);
          totalNew++;
          
          log(`✓ Added transaction: ${transaction.merchant?.name || 'Unknown'} - $${Math.abs(transaction.amount) / 100}`);
        }
        
      } catch (error) {
        log(`Error processing card ${card.stripeCardId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    log(`🎉 Backfill complete for user ${userId}!`);
    log(`Total transactions processed: ${totalProcessed}`);
    log(`New transactions added: ${totalNew}`);
    log(`Existing transactions skipped: ${totalProcessed - totalNew}`);
    
    return {
      success: true,
      totalProcessed,
      totalNew,
      totalSkipped: totalProcessed - totalNew
    };
    
  } catch (error) {
    log(`Backfill failed for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}