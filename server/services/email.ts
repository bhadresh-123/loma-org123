import nodemailer from 'nodemailer';
import { log } from '../vite';

// Email service configuration
let transporter: nodemailer.Transporter;
let transporterVerified = false;
let transporterVerificationAttempted = false;

// Initialize email transporter with proper error handling
export async function initEmailTransporter() {
  try {
    // Create a test account if no email credentials are provided
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      log('No email credentials found, creating test account...');
      
      try {
        const testAccount = await nodemailer.createTestAccount();
        log('Created test email account:', testAccount.user);
        
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
          debug: true,
          connectionTimeout: 10000, // 10 seconds
          greetingTimeout: 5000,   // 5 seconds
          socketTimeout: 10000,    // 10 seconds
          pool: false,             // Disable connection pooling for test accounts
        });
        
        log('Using test email account for transporter');
      } catch (testAccountError) {
        log('Failed to create Ethereal test account, using console-only mode:', testAccountError);
        
        // Create a mock transporter that logs emails instead of sending them
        transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
        
        log('Using console-only email mode (emails will be logged, not sent)');
      }
    } else {
      // Use provided email credentials
      log('Using provided email credentials');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        debug: true,
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 5000,   // 5 seconds
        socketTimeout: 15000,    // 15 seconds
        pool: true,              // Enable connection pooling for production
        maxConnections: 5,       // Limit concurrent connections
        maxMessages: 100,        // Limit messages per connection
        tls: {
          rejectUnauthorized: true
        }
      });

      log('Email transporter configured with account:', process.env.EMAIL_USER);
    }

    // Verify connection configuration with timeout protection
    if (!transporterVerificationAttempted) {
      transporterVerificationAttempted = true;
      log('Verifying email connection...');
      
      try {
        // Use Promise.race to add a timeout to the verification
        const verificationPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Verification timeout')), 10000)
        );
        
        const verified = await Promise.race([verificationPromise, timeoutPromise]);
        transporterVerified = verified as boolean;
        log(`Email server connection verified successfully: ${verified ? 'Yes' : 'No'}`);
      } catch (verifyError) {
        transporterVerified = false;
        log('Email connection verification failed:', verifyError);
        
        if (verifyError instanceof Error) {
          if (verifyError.message.includes('timeout') || verifyError.message.includes('ETIMEDOUT') || verifyError.message.includes('Verification timeout')) {
            log('Connection timeout detected - this may be due to network issues or SMTP server unavailability');
            log('Will retry verification on next email send attempt');
          } else if (verifyError.message.includes('ECONNREFUSED')) {
            log('Connection refused - SMTP server may be down or port blocked');
          } else if (verifyError.message.includes('ENOTFOUND')) {
            log('SMTP host not found - check DNS resolution');
          }
        }
        // Don't fail initialization for verification errors, just log them
        log('Continuing with email transporter despite verification failure');
      }
    } else {
      log('Email transporter verification already attempted, skipping');
    }
    
    return true;
  } catch (error) {
    log('Error initializing email transporter:', error);
    if (error instanceof Error) {
      log('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return false;
  }
}

// Helper function to safely send emails with retry logic
async function safeSendEmail(mailOptions: any, retryCount = 0): Promise<boolean> {
  try {
    // Make sure we have a transporter configured
    if (!transporter) {
      log('Email transporter not initialized, initializing now...');
      await initEmailTransporter();
      
      if (!transporter) {
        log('Failed to initialize email transporter, cannot send email');
        return false;
      }
    }

    // If verification failed previously, try to re-verify with timeout
    if (!transporterVerified && retryCount === 0) {
      log('Attempting to re-verify email connection...');
      try {
        const verificationPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Re-verification timeout')), 5000)
        );
        
        const verified = await Promise.race([verificationPromise, timeoutPromise]);
        transporterVerified = verified as boolean;
        log(`Email re-verification result: ${verified ? 'Success' : 'Failed'}`);
      } catch (reVerifyError) {
        log('Email re-verification failed:', reVerifyError);
        transporterVerified = false;
      }
    }

    // Send email with timeout protection
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Send email timeout')), 15000)
    );
    
    const result = await Promise.race([sendPromise, timeoutPromise]);
    
    if (result && typeof result === 'object' && 'messageId' in result) {
      log('Email sent successfully:', result.messageId);
      return true;
    }
    
    return false;
  } catch (error) {
    log('Error sending email:', error);
    
    // Retry logic for transient errors
    if (retryCount < 2 && error instanceof Error) {
      if (error.message.includes('timeout') || 
          error.message.includes('ETIMEDOUT') || 
          error.message.includes('ECONNRESET') ||
          error.message.includes('ENOTFOUND')) {
        log(`Retrying email send (attempt ${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return safeSendEmail(mailOptions, retryCount + 1);
      }
    }
    
    return false;
  }
}

// Helper function for formatting currency
function formatCurrency(value: any): string {
  try {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  } catch (error) {
    log(`Error formatting currency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return `$${value}`;
  }
}

export interface SendInvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  amount: number | string;
  dueDate: Date;
  paymentUrl: string;
  clientName: string;
}

// Main invoice email sending function that handles both custom and test accounts
export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  paymentUrl,
  clientName,
}: SendInvoiceEmailParams): Promise<any> {
  try {
    log('Starting invoice email process:', {
      to,
      invoiceNumber,
      amount,
      paymentUrl: paymentUrl ? '(url provided)' : '(missing)',
      clientName
    });

    // Parameter validation
    if (!to || !invoiceNumber || amount === undefined || !paymentUrl || !clientName) {
      log('Missing required parameters for invoice email');
      return false;
    }

    // Format values for display
    const formattedAmount = formatCurrency(amount);
    const formattedDate = dueDate instanceof Date 
      ? dueDate.toLocaleDateString() 
      : new Date(dueDate).toLocaleDateString();

    // Create email content with proper styling
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #4a4a4a; text-align: center;">Invoice Notification</h2>
        <p>Hello ${clientName},</p>
        <p>A new invoice has been created for your therapy services.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Due:</strong> ${formattedAmount}</p>
          <p><strong>Due Date:</strong> ${formattedDate}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View and Pay Invoice
          </a>
        </div>
        
        <p>If you have any questions about this invoice, please contact us.</p>
        <p>Thank you,<br>Your Therapy Practice</p>
      </div>
    `;

    // Prepare email sending options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'therapy@pracgenius.com',
      to,
      subject: `Invoice ${invoiceNumber} - Payment Due`,
      html: emailContent,
    };

    // Send the email using safeSendEmail with retry logic
    log('Sending invoice email to:', to);
    const success = await safeSendEmail(mailOptions);
    
    if (success) {
      log('Invoice email sent successfully');
      return true;
    } else {
      log('Failed to send invoice email after retries');
      return false;
    }
  } catch (error) {
    log('Error in sendInvoiceEmail:', error);
    return false;
  }
}

// Payment confirmation email function
export async function sendPaymentConfirmationEmail({
  to,
  invoiceNumber,
  amount,
  clientName,
}: {
  to: string;
  invoiceNumber: string;
  amount: number | string;
  clientName: string;
}): Promise<any> {
  try {
    const formattedAmount = formatCurrency(amount);

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #4a4a4a; text-align: center;">Payment Confirmation</h2>
        <p>Hello ${clientName},</p>
        <p>Thank you for your payment. This email confirms that we have received your payment for invoice ${invoiceNumber}.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
          <p><strong>Status:</strong> Paid</p>
        </div>
        
        <p>Thank you for your business!</p>
        <p>Regards,<br>Your Therapy Practice</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'therapy@pracgenius.com',
      to,
      subject: `Payment Confirmation - Invoice ${invoiceNumber}`,
      html: emailContent,
    };

    log('Sending payment confirmation email to:', to);
    const success = await safeSendEmail(mailOptions);
    
    if (success) {
      log('Payment confirmation email sent successfully');
      return true;
    } else {
      log('Failed to send payment confirmation email after retries');
      return false;
    }
  } catch (error) {
    log('Error in sendPaymentConfirmationEmail:', error);
    return false;
  }
}

/**
 * Send organization invite email to therapist
 */
export async function sendOrganizationInviteEmail({
  to,
  organizationName,
  inviteToken,
  inviterName,
}: {
  to: string;
  organizationName: string;
  inviteToken: string;
  inviterName: string;
}): Promise<boolean> {
  try {
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #4a4a4a; text-align: center;">Invitation to Join ${organizationName}</h2>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a team member.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0;">Click the button below to accept the invitation and join the practice.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">This invitation will expire in 7 days.</p>
        <p style="color: #666; font-size: 12px;">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'therapy@pracgenius.com',
      to,
      subject: `Invitation to Join ${organizationName}`,
      html: emailContent,
    };

    log('Sending organization invite email to:', to);
    const success = await safeSendEmail(mailOptions);
    
    if (success) {
      log('Organization invite email sent successfully');
      return true;
    } else {
      log('Failed to send organization invite email');
      return false;
    }
  } catch (error) {
    log('Error in sendOrganizationInviteEmail:', error);
    return false;
  }
}
