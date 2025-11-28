/**
 * Safe Logger Utility
 * 
 * Provides PHI-safe logging functions that automatically redact sensitive information
 * to maintain HIPAA compliance and prevent PHI leaks in application logs.
 */

/**
 * PHI Pattern Detection
 * Patterns for detecting common PHI data types
 */
const PHI_PATTERNS = {
  // Email: user@domain.com
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone: (123) 456-7890, 123-456-7890, 1234567890
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // SSN: 123-45-6789, 123456789
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  
  // Date of Birth patterns: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
  dob: /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

/**
 * Redact email addresses for logging
 * Example: john.doe@example.com -> j***@example.com
 */
export function redactEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[no-email]';
  
  const parts = email.split('@');
  if (parts.length !== 2) return '[invalid-email]';
  
  const username = parts[0];
  const domain = parts[1];
  
  if (username.length <= 1) {
    return `*@${domain}`;
  }
  
  return `${username.charAt(0)}***@${domain}`;
}

/**
 * Redact phone numbers for logging
 * Example: (555) 123-4567 -> ***-***-4567
 */
export function redactPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '[no-phone]';
  
  // Keep only last 4 digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  
  return `***-***-${digits.slice(-4)}`;
}

/**
 * Redact SSN for logging
 * Example: 123-45-6789 -> ***-**-6789
 */
export function redactSSN(ssn: string): string {
  if (!ssn || typeof ssn !== 'string') return '[no-ssn]';
  
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) return '***-**-***';
  
  return `***-**-${digits.slice(-4)}`;
}

/**
 * Redact date of birth for logging
 * Example: 01/15/1985 becomes [REDACTED-DOB]
 */
export function redactDOB(dob: string): string {
  return '[REDACTED-DOB]';
}

/**
 * Redact a string containing potential PHI
 * Automatically detects and redacts emails, phones, SSNs, DOBs, credit cards
 */
export function redactPHI(text: string): string {
  if (!text || typeof text !== 'string') return String(text);
  
  let redacted = text;
  
  // Redact emails
  redacted = redacted.replace(PHI_PATTERNS.email, (match) => redactEmail(match));
  
  // Redact phones
  redacted = redacted.replace(PHI_PATTERNS.phone, (match) => redactPhone(match));
  
  // Redact SSNs
  redacted = redacted.replace(PHI_PATTERNS.ssn, (match) => redactSSN(match));
  
  // Redact DOBs
  redacted = redacted.replace(PHI_PATTERNS.dob, (match) => redactDOB(match));
  
  // Redact credit card numbers
  redacted = redacted.replace(PHI_PATTERNS.creditCard, '****-****-****-****');
  
  return redacted;
}

/**
 * Redact PHI from objects (deep)
 * Detects and redacts PHI patterns in object values
 */
export function redactPHIFromObject(obj: any, depth = 0): any {
  if (depth > 10) return '[max-depth-exceeded]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactPHI(obj);
  }
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactPHIFromObject(item, depth + 1));
  }
  
  const redacted: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Don't log encrypted fields at all
      if (key.toLowerCase().includes('encrypted')) {
        redacted[key] = '[encrypted-field]';
      } else if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
        redacted[key] = '[redacted-credential]';
      } else {
        redacted[key] = redactPHIFromObject(obj[key], depth + 1);
      }
    }
  }
  
  return redacted;
}

/**
 * Safe logging function that automatically redacts PHI
 * Use this instead of console.log for any user data
 */
export function safeLog(message: string, data?: any): void {
  if (data === undefined) {
    console.log(redactPHI(message));
  } else {
    const redactedData = redactPHIFromObject(data);
    console.log(redactPHI(message), redactedData);
  }
}

/**
 * Safe request logging
 * Logs request information without exposing PHI
 */
export function logRequest(req: any, action: string): void {
  const userId = req.user?.id || 'anonymous';
  const method = req.method;
  const path = req.path;
  
  console.log(`[${action}] ${method} ${path} - User: ${userId}`);
}

/**
 * Log with context but without PHI
 * Use for logging operations with minimal safe context
 */
export function logOperation(operation: string, resourceType: string, resourceId?: number | string): void {
  if (resourceId !== undefined) {
    console.log(`${operation} ${resourceType}, ID: ${resourceId}`);
  } else {
    console.log(`${operation} ${resourceType}`);
  }
}

/**
 * Log error without PHI
 * Logs error message but redacts any potential PHI in the message
 */
export function logError(context: string, error: any): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error in ${context}:`, redactPHI(errorMessage));
  
  // In development, log stack trace (should not contain PHI)
  if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
}

