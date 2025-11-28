import { stripe } from './services/stripe/config';
import { db, getActiveSchema } from "@db";
import { createAndSendInvoice } from './services/stripe/invoices';
import { log } from './vite';

async function createInvoiceForGrant() {
  try {
    console.log('Creating invoice for Grant...');

    // 1. Create a client record for Grant
    const schema = getActiveSchema();
    
    if (!schema.patients) {
      console.warn('Patients table not available in current schema');
      return;
    }

    const [client] = await db.insert(schema.patients).values({
      userId: 1, // Using admin user ID
      name: "Grant",
      email: "grant@example.com",
      phone: "555-0123",
      status: "active",
      billingType: "private_pay",
      sessionCost: "150.00"
    }).returning();

    console.log('Created client record:', client);

    // 2. Create and send invoice using our service
    const result = await createAndSendInvoice({
      patientId: client.id,
      userId: 1,
      amount: 150,
      description: "Therapy Session - Initial Consultation",
      metadata: {
        test: 'true'
      }
    });

    console.log('Invoice created successfully!');
    console.log('Stripe Invoice ID:', result.stripeInvoice.id);
    console.log('Invoice URL:', result.stripeInvoice.hosted_invoice_url);

    return result;

  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

// Run the invoice creation
createInvoiceForGrant()
  .then(result => {
    console.log('\n✅ Invoice created successfully!');
    console.log('Results:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to create invoice:', error);
    process.exit(1);
  });
