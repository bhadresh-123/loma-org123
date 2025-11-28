
import { stripe } from './config';
import { db, getActiveSchema } from "@db";
import { invoices, invoiceItems } from '@db/schema';
import { eq } from "drizzle-orm";
import { log } from '../../vite';
import { StripeConnectService } from './StripeConnectService';
import { decryptPHI } from '../../utils/phi-encryption';
import { redactEmail } from '../../utils/safe-logger';

interface CreateInvoiceParams {
  patientId: number;
  userId: number;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}

export async function createAndSendInvoice(params: CreateInvoiceParams) {
  const { patientId, userId, amount, description, metadata = {} } = params;
  
  try {
    log(`Creating invoice: ${JSON.stringify(params)}`);
    
    const schema = getActiveSchema();
    
    // 1. Get client details including Stripe customer ID
    const [client] = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, patientId))
      .limit(1);
    
    if (!client) {
      throw new Error(`Client with ID ${patientId} not found`);
    }

    // 2. Determine invoice amount - use sessionCost for private pay if amount not provided or zero
    let invoiceAmount = amount;
    
    if (client.billingType === 'private_pay' && (!invoiceAmount || invoiceAmount === 0)) {
      if (client.sessionCost && parseFloat(client.sessionCost) > 0) {
        invoiceAmount = parseFloat(client.sessionCost);
        log(`Using client session cost: $${invoiceAmount} for private pay client ${client.id}`);
      } else {
        throw new Error(`Private pay client ${client.id} must have a valid session cost configured`);
      }
    }
    
    if (!invoiceAmount || invoiceAmount <= 0) {
      throw new Error('Invoice amount must be greater than zero');
    }
    
    // 3. Check if client has a Stripe customer ID, create one if not
    let stripeCustomerId = client.stripeCustomerId;
    
    if (!stripeCustomerId) {
      log('Client does not have a Stripe customer ID, creating one...');
      
      // Decrypt client email for Stripe customer creation
      let clientEmail = client.email;
      if (!clientEmail && client.email_encrypted) {
        try {
          clientEmail = decryptPHI(client.email_encrypted);
          log(`Decrypted client email for Stripe customer creation`);
        } catch (error) {
          log(`Failed to decrypt client email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      const stripeCustomer = await stripe.customers.create({
        email: clientEmail || undefined,
        name: client.name,
        metadata: {
          patientId: client.id.toString(),
          userId: userId.toString(),
          ...metadata
        }
      });
      
      stripeCustomerId = stripeCustomer.id;
      
      // Update client with new Stripe customer ID
      const schema = getActiveSchema();
      
      if (schema.patients) {
        await db
          .update(schema.patients)
          .set({ stripeCustomerId })
          .where(eq(schema.patients.id, patientId));
      } else {
        log('Patients table not available in HIPAA schema - skipping Stripe customer ID update');
      }
      
      log(`Created Stripe customer: ${stripeCustomerId}`);
    }
    
    // 4. Create a local invoice record
    // We'll assume our column check would fail because of the error we've seen in the logs
    // This is a safer approach than trying to query the schema
    
    // Define basic invoice data
    const invoiceData: any = {
      userId,
      patientId,
      invoiceNumber: `INV-${Date.now()}`,
      status: 'draft',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subtotal: invoiceAmount.toFixed(2),
      tax: "0",
      total: invoiceAmount.toFixed(2),
      notes: `Invoice for: ${description}`,
      stripeCustomerId
    };
    
    // 5. Check if user has a Stripe Connect account
    let stripeInvoice;
    const connectAccountId = await StripeConnectService.getUserConnectAccountId(userId);

    // IMPORTANT: Don't use the invoiceData object directly - only pick specific fields
    // Don't use spread (...) as it could include fields not in the schema
    const safeInvoiceData = {
      userId: invoiceData.userId,
      patientId: invoiceData.patientId,
      invoiceNumber: invoiceData.invoiceNumber,
      status: invoiceData.status,
      dueDate: invoiceData.dueDate,
      subtotal: invoiceData.subtotal,
      tax: invoiceData.tax,
      total: invoiceData.total,
      notes: invoiceData.notes,
      stripeCustomerId: invoiceData.stripeCustomerId
    };
    
    // Include Connect account ID if available when creating the invoice
    const [invoice] = await db.insert(invoices).values({
      ...safeInvoiceData,
      // Store Connect account ID in the database
      stripeConnectAccountId: connectAccountId || undefined
    }).returning();
    
    log(`Created local invoice: ${invoice.id}`);
    
    if (connectAccountId) {
      // If user has a Connect account, create invoice with transfer_data
      log(`User ${userId} has a Connect account (${connectAccountId}), creating invoice with transfer_data`);
      
      stripeInvoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          invoiceId: invoice.id.toString(),
          patientId: patientId.toString(),
          userId: userId.toString(),
          connectAccountId,
          ...metadata
        },
        // Set the Connect account as the destination for this invoice's payments
        transfer_data: {
          destination: connectAccountId,
        }
      });
      
      log(`Created Stripe Connect invoice: ${stripeInvoice.id} for Connect account: ${connectAccountId}`);
    } else {
      // Otherwise create a standard invoice
      log(`User ${userId} does not have a Connect account, creating standard invoice`);
      
      stripeInvoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          invoiceId: invoice.id.toString(),
          patientId: patientId.toString(),
          userId: userId.toString(),
          ...metadata
        }
      });
      
      log(`Created standard Stripe invoice: ${stripeInvoice.id}`);
    }
    
    // 6. Add invoice item to Stripe
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: stripeInvoice.id,
      amount: Math.round(invoiceAmount * 100), // Convert to cents
      currency: 'usd',
      description,
    });
    
    // 7. Update local invoice with Stripe ID
    let updatedInvoice;
    try {
      // Update the invoice with Stripe ID and Connect account ID if available
      const updateData: any = {
        stripeInvoiceId: stripeInvoice.id
      };
      
      // Add Connect account ID if available
      if (connectAccountId) {
        updateData.stripeConnectAccountId = connectAccountId;
        log(`Storing Connect account ID in database: ${connectAccountId}`);
      }
      
      const [updated] = await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, invoice.id))
        .returning();
      
      updatedInvoice = updated;
    } catch (updateError) {
      log(`Error updating invoice: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
      throw updateError;
    }
    
    // 8. Add invoice item to our database
    const [invoiceItem] = await db.insert(invoiceItems).values({
      invoiceId: invoice.id,
      description,
      quantity: 1,
      unitPrice: invoiceAmount.toFixed(2),
      amount: invoiceAmount.toFixed(2),
    }).returning();
    
    // 9. Finalize and send the invoice
    try {
      log(`Finalizing invoice: ${stripeInvoice.id}`);
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
      log(`Sending invoice: ${stripeInvoice.id}`);
      const sentInvoice = await stripe.invoices.sendInvoice(stripeInvoice.id);
      
      // Store the invoice URL in our database
      if (sentInvoice.hosted_invoice_url) {
        log(`Invoice hosted URL: ${sentInvoice.hosted_invoice_url}`);
        await db
          .update(invoices)
          .set({
            stripeHostedUrl: sentInvoice.hosted_invoice_url
          })
          .where(eq(invoices.id, invoice.id));
          
        // Also send our own email notification in case Stripe doesn't send an email in test mode
        // Find client info from the invoice's patientId
        try {
          const schema = getActiveSchema();
          
          if (!schema.patients) {
            log('Patients table not available in HIPAA schema - skipping client lookup for email notification');
            return;
          }

          const [client] = await db
            .select()
            .from(schema.patients)
            .where(eq(schema.patients.id, patientId))
            .limit(1);
            
          if (client) {
            // Decrypt client email for email notification
            let clientEmail = client.email;
            if (!clientEmail && client.email_encrypted) {
            try {
              clientEmail = decryptPHI(client.email_encrypted);
              log('Decrypted client email for Stripe customer');
              } catch (error) {
                log(`Failed to decrypt client email for notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
            
            if (clientEmail) {
              const { sendInvoiceEmail } = await import('../email');
              log(`Sending custom email notification to ${redactEmail(clientEmail)} for invoice ${invoice.invoiceNumber}`);
              
              // Send our own email notification with the Stripe hosted URL
              await sendInvoiceEmail({
                to: clientEmail,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoiceAmount,
                dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
                paymentUrl: sentInvoice.hosted_invoice_url,
                clientName: client.name
              });
              log(`Custom email notification sent for invoice ${invoice.invoiceNumber}`);
            } else {
              log(`No email address available for client ${client.id} - cannot send notification`);
            }
          }
        } catch (emailError) {
          log(`Error sending custom email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
          // Continue even if email fails - we don't want to block the invoice process
        }
      }
      
      // 10. Update invoice status
      const [finalInvoice] = await db
        .update(invoices)
        .set({
          status: 'sent'
        })
        .where(eq(invoices.id, invoice.id))
        .returning();
        
      // Use this finalized and sent invoice going forward
      stripeInvoice = sentInvoice;
    } catch (invoiceError) {
      log(`Error finalizing/sending invoice: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
      throw invoiceError;
    }
    
    // Update one more time to get the latest invoice data
    const [latestInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice.id))
      .limit(1);
      
    // Always ensure Connect account ID is included in the response
    let finalInvoiceWithConnect = latestInvoice;
    if (connectAccountId) {
      // Create a new object with the connect ID rather than modifying the DB object
      finalInvoiceWithConnect = {
        ...latestInvoice,
        // Always ensure the Connect account ID is included
        stripeConnectAccountId: connectAccountId
      };
      
      // If it's not stored in the database yet, update it for future reference
      if (!latestInvoice.stripeConnectAccountId) {
        log(`Updating invoice ${latestInvoice.id} with Connect account ID ${connectAccountId}`);
        try {
          await db
            .update(invoices)
            .set({
              stripeConnectAccountId: connectAccountId
            })
            .where(eq(invoices.id, invoice.id));
          log(`Updated invoice ${latestInvoice.id} with Connect account ID ${connectAccountId}`);
        } catch (updateError) {
          // Don't fail the invoice process if this update fails
          log(`Warning: Could not update invoice ${latestInvoice.id} with Connect account ID: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
        }
      }
    }
    
    log(`Invoice sent. URL: ${stripeInvoice.hosted_invoice_url}`);
    
    return {
      success: true,
      invoice: finalInvoiceWithConnect,
      invoiceItem,
      stripeInvoice: stripeInvoice
    };
    
  } catch (error) {
    log(`Error creating invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
