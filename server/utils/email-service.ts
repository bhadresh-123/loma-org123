/**
 * Email Service - Security Alert Notifications
 * 
 * Sends security alert emails using nodemailer.
 * Gracefully fails if email is not configured (optional feature).
 * 
 * Environment Variables:
 * - SECURITY_ALERT_EMAIL: Email address to receive security alerts
 * - SMTP_HOST: SMTP server hostname (default: smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password/app password
 * - SMTP_FROM: From email address (default: SMTP_USER)
 */

import nodemailer from 'nodemailer';

interface SecurityAlertEmail {
  severity: string;
  incidentType: string;
  description: string;
  ipAddress?: string;
  userId?: number;
  timestamp: string;
  automatedActions: string[];
  recommendations: string[];
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private alertRecipient: string | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if email is configured
    this.alertRecipient = process.env.SECURITY_ALERT_EMAIL || null;
    const smtpUser = process.env.SMTP_USER || null;
    const smtpPass = process.env.SMTP_PASS || null;

    if (!this.alertRecipient || !smtpUser || !smtpPass) {
      console.log('[EmailService] Email alerting not configured (optional feature)');
      this.isConfigured = false;
      return;
    }

    try {
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false, // Use TLS
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      this.isConfigured = true;
      console.log('[EmailService] Email alerting configured successfully');
    } catch (error) {
      console.error('[EmailService] Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

  async sendSecurityAlert(alert: SecurityAlertEmail): Promise<void> {
    if (!this.isConfigured || !this.transporter || !this.alertRecipient) {
      // Email not configured - skip silently (this is optional)
      return;
    }

    try {
      const subject = `🚨 [${alert.severity}] Security Alert: ${alert.incidentType}`;
      
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: ${alert.severity === 'CRITICAL' ? '#dc2626' : '#ea580c'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9fafb; }
            .section { margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid ${alert.severity === 'CRITICAL' ? '#dc2626' : '#ea580c'}; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .actions, .recommendations { margin-top: 10px; }
            .actions li, .recommendations li { margin: 5px 0; }
            .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🚨 Security Alert</h1>
            <p style="margin: 5px 0 0 0;">Severity: ${alert.severity}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>Incident Details</h2>
              <p><span class="label">Type:</span><span class="value">${alert.incidentType}</span></p>
              <p><span class="label">Description:</span><span class="value">${alert.description}</span></p>
              <p><span class="label">Timestamp:</span><span class="value">${new Date(alert.timestamp).toLocaleString()}</span></p>
              ${alert.ipAddress ? `<p><span class="label">IP Address:</span><span class="value">${alert.ipAddress}</span></p>` : ''}
              ${alert.userId ? `<p><span class="label">User ID:</span><span class="value">${alert.userId}</span></p>` : ''}
            </div>
            
            ${alert.automatedActions.length > 0 ? `
              <div class="section">
                <h2>Automated Actions Taken</h2>
                <ul class="actions">
                  ${alert.automatedActions.map(action => `<li>${action}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${alert.recommendations.length > 0 ? `
              <div class="section">
                <h2>Recommendations</h2>
                <ul class="recommendations">
                  ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated security alert from Loma Platform.</p>
            <p>For more details, check the application logs and audit trail.</p>
          </div>
        </body>
        </html>
      `;

      const textBody = `
🚨 SECURITY ALERT [${alert.severity}]

Incident Type: ${alert.incidentType}
Description: ${alert.description}
Timestamp: ${new Date(alert.timestamp).toLocaleString()}
${alert.ipAddress ? `IP Address: ${alert.ipAddress}` : ''}
${alert.userId ? `User ID: ${alert.userId}` : ''}

${alert.automatedActions.length > 0 ? `
Automated Actions Taken:
${alert.automatedActions.map(action => `- ${action}`).join('\n')}
` : ''}

${alert.recommendations.length > 0 ? `
Recommendations:
${alert.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

---
This is an automated security alert from Loma Platform.
For more details, check the application logs and audit trail.
      `.trim();

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: this.alertRecipient,
        subject,
        text: textBody,
        html: htmlBody
      });

      console.log(`[EmailService] Security alert email sent to ${this.alertRecipient}`);
    } catch (error) {
      console.error('[EmailService] Failed to send security alert email:', error);
      // Don't throw - email alerting should fail gracefully
    }
  }

  async sendTestEmail(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter || !this.alertRecipient) {
      console.log('[EmailService] Email not configured - cannot send test email');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: this.alertRecipient,
        subject: 'Test Email - Loma Security Alerts',
        text: 'This is a test email to verify email alerting is working correctly.',
        html: '<p>This is a test email to verify email alerting is working correctly.</p>'
      });

      console.log('[EmailService] Test email sent successfully');
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send test email:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new EmailService();

