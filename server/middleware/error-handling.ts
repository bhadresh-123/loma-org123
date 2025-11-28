/**
 * Error Handling Middleware - Consolidated
 * 
 * Single source of truth for all error handling:
 * - Error sanitization for production
 * - Request ID generation and tracking
 * - Error boundary setup
 * - Global error handler
 * - Production-safe error messages
 * 
 * Consolidates: error-sanitization.ts, profile-error-handler.ts, security.ts (errorHandler)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import crypto from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SanitizedError {
  error: string;
  message: string;
  timestamp: string;
  requestId?: string;
  correlationId?: string;
  details?: any;
}

// ============================================================================
// PRODUCTION-SAFE ERROR MESSAGES
// ============================================================================

const PRODUCTION_ERROR_MESSAGES: Record<string, string> = {
  // Database errors
  'DATABASE_CONNECTION_ERROR': 'Service temporarily unavailable. Please try again later.',
  'DATABASE_QUERY_ERROR': 'Unable to process request. Please try again.',
  'DATABASE_CONSTRAINT_ERROR': 'Invalid data provided. Please check your input.',
  
  // Authentication errors
  'AUTHENTICATION_FAILED': 'Authentication required. Please log in.',
  'AUTHORIZATION_DENIED': 'Access denied. Insufficient permissions.',
  'SESSION_EXPIRED': 'Session expired. Please log in again.',
  'INVALID_TOKEN': 'Invalid authentication token.',
  'TOKEN_EXPIRED': 'Authentication token expired. Please log in again.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Invalid input data provided.',
  'REQUIRED_FIELD_MISSING': 'Required field is missing.',
  'INVALID_FORMAT': 'Invalid data format.',
  'VALUE_TOO_LONG': 'Input value is too long.',
  'VALUE_OUT_OF_RANGE': 'Input value is out of acceptable range.',
  
  // File upload errors
  'FILE_TOO_LARGE': 'File size exceeds limit.',
  'INVALID_FILE_TYPE': 'File type not supported.',
  'MALWARE_DETECTED': 'File failed security scan.',
  'UPLOAD_FAILED': 'File upload failed.',
  
  // Rate limiting
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please slow down.',
  
  // HIPAA/PHI errors
  'HIPAA_ENCRYPTION_FAILED': 'Failed to process sensitive data securely.',
  'PHI_SECURITY_CONTEXT_FAILED': 'Unable to establish secure context for protected health information.',
  'HIPAA_MIDDLEWARE_ERROR': 'Failed to process protected health information.',
  
  // Generic errors
  'INTERNAL_ERROR': 'An unexpected error occurred.',
  'SERVER_ERROR': 'Internal server error.',
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable.',
  'NOT_FOUND': 'Requested resource not found.',
  'CONFLICT': 'Resource conflict detected.',
  'BAD_REQUEST': 'Invalid request.',
  'FORBIDDEN': 'Access forbidden.'
};

// ============================================================================
// SENSITIVE PATTERN DETECTION
// ============================================================================

/**
 * Patterns that should be redacted from error messages in production
 */
const SENSITIVE_PATTERNS = [
  // Database connection strings
  /postgres:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  /mysql:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  /mongodb:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  /postgresql:\/\/[^@]+@[^\/]+\/[^\s]+/gi,
  
  // API keys and tokens
  /sk-[A-Za-z0-9]{20,}/g,  // Stripe secret keys
  /pk_[A-Za-z0-9]{20,}/g,  // Stripe public keys
  /sk-ant-[A-Za-z0-9\-_]{20,}/g, // Anthropic keys
  /[A-Za-z0-9]{32,}/g,     // Long alphanumeric strings (potential keys)
  /[A-Za-z0-9]{40}/g,      // SHA-1 hashes
  
  // File paths
  /\/[A-Za-z0-9\/\-_\.]+\.(log|conf|env|key|pem|crt)/gi,
  /\/Users\/[^\/\s]+/g,
  /\/home\/[^\/\s]+/g,
  /C:\\Users\\[^\\\s]+/g,
  
  // Stack traces (keep generic info, remove sensitive details)
  /at\s+[A-Za-z0-9\/\-_\.]+:\d+:\d+/g,
  
  // SQL queries
  /SELECT\s+.*FROM\s+[A-Za-z0-9_]+/gi,
  /INSERT\s+INTO\s+[A-Za-z0-9_]+/gi,
  /UPDATE\s+[A-Za-z0-9_]+\s+SET/gi,
  /DELETE\s+FROM\s+[A-Za-z0-9_]+/gi,
  
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // SSN
  /\b\d{3}-\d{2}-\d{4}\b/g
];

/**
 * Sanitize error message by removing sensitive information
 */
export function sanitizeErrorMessage(message: string, isProduction: boolean = true): string {
  if (!isProduction) {
    return message; // Return original in development
  }
  
  let sanitized = message;
  
  // Remove sensitive patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Remove stack trace details
  sanitized = sanitized.replace(/at\s+.*/g, '');
  
  // Remove file paths
  sanitized = sanitized.replace(/\/[A-Za-z0-9\/\-_\.]+/g, '/[PATH]');
  
  // Remove long numbers (could be IDs or timestamps)
  sanitized = sanitized.replace(/\b\d{10,}\b/g, '[ID]');
  
  return sanitized.trim();
}

/**
 * Create production-safe error response
 */
export function createSanitizedError(
  errorType: string,
  originalError?: Error,
  requestId?: string,
  correlationId?: string,
  isProduction: boolean = true
): SanitizedError {
  const timestamp = new Date().toISOString();
  
  // Get production-safe message
  const message = PRODUCTION_ERROR_MESSAGES[errorType] || PRODUCTION_ERROR_MESSAGES.INTERNAL_ERROR;
  
  const sanitizedError: SanitizedError = {
    error: errorType,
    message,
    timestamp,
    requestId,
    correlationId
  };
  
  // Add sanitized details in development only
  if (!isProduction && originalError) {
    sanitizedError.details = {
      originalMessage: originalError.message,
      stack: originalError.stack
    };
  }
  
  return sanitizedError;
}

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Request ID middleware - adds unique ID to every request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = generateRequestId();
  (req as any).requestId = requestId;
  
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

/**
 * Global error handler middleware
 * Handles all unhandled errors and provides consistent error responses
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = (req as any).requestId || generateRequestId();
  const correlationId = (req as any).correlationId;
  
  // Log error details (always log to console/monitoring)
  console.error('[ERROR_HANDLER]', {
    requestId,
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack
  });
  
  // Handle specific error types
  
  // Zod validation errors
  if (err instanceof ZodError) {
    const sanitizedError = createSanitizedError(
      'VALIDATION_ERROR',
      err,
      requestId,
      correlationId,
      isProduction
    );
    
    if (!isProduction) {
      sanitizedError.details = {
        validationErrors: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      };
    }
    
    return res.status(400).json(sanitizedError);
  }
  
  // JWT/Authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const errorType = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    const sanitizedError = createSanitizedError(errorType, err, requestId, correlationId, isProduction);
    return res.status(401).json(sanitizedError);
  }
  
  // Authentication/Authorization errors
  if (err.name === 'UnauthorizedError' || err.message.includes('Authentication') || err.message.includes('Unauthorized')) {
    const sanitizedError = createSanitizedError('AUTHENTICATION_FAILED', err, requestId, correlationId, isProduction);
    return res.status(401).json(sanitizedError);
  }
  
  if (err.name === 'ForbiddenError' || err.message.includes('Authorization') || err.message.includes('Forbidden')) {
    const sanitizedError = createSanitizedError('AUTHORIZATION_DENIED', err, requestId, correlationId, isProduction);
    return res.status(403).json(sanitizedError);
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    const sanitizedError = createSanitizedError('VALIDATION_ERROR', err, requestId, correlationId, isProduction);
    return res.status(400).json(sanitizedError);
  }
  
  // Database errors
  if (err.code === 'ECONNREFUSED' || err.message.includes('database') || err.message.includes('connection')) {
    const sanitizedError = createSanitizedError('DATABASE_CONNECTION_ERROR', err, requestId, correlationId, isProduction);
    return res.status(503).json(sanitizedError);
  }
  
  if (err.code === '23505' || err.code === '23503' || err.message.includes('constraint')) {
    const sanitizedError = createSanitizedError('DATABASE_CONSTRAINT_ERROR', err, requestId, correlationId, isProduction);
    return res.status(409).json(sanitizedError);
  }
  
  // Rate limiting errors
  if (err.message.includes('Too many requests') || err.message.includes('rate limit')) {
    const sanitizedError = createSanitizedError('RATE_LIMIT_EXCEEDED', err, requestId, correlationId, isProduction);
    return res.status(429).json(sanitizedError);
  }
  
  // HIPAA/PHI errors
  if (err.message.includes('PHI') || err.message.includes('HIPAA') || err.message.includes('encryption')) {
    const sanitizedError = createSanitizedError('HIPAA_ENCRYPTION_FAILED', err, requestId, correlationId, isProduction);
    return res.status(500).json(sanitizedError);
  }
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const sanitizedError = createSanitizedError('FILE_TOO_LARGE', err, requestId, correlationId, isProduction);
    return res.status(413).json(sanitizedError);
  }
  
  if (err.code === 'INVALID_FILE_TYPE' || err.message.includes('file type')) {
    const sanitizedError = createSanitizedError('INVALID_FILE_TYPE', err, requestId, correlationId, isProduction);
    return res.status(400).json(sanitizedError);
  }
  
  // Generic 404 Not Found
  if (err.status === 404 || err.message.includes('not found')) {
    const sanitizedError = createSanitizedError('NOT_FOUND', err, requestId, correlationId, isProduction);
    return res.status(404).json(sanitizedError);
  }
  
  // Generic 400 Bad Request
  if (err.status === 400) {
    const sanitizedError = createSanitizedError('BAD_REQUEST', err, requestId, correlationId, isProduction);
    return res.status(400).json(sanitizedError);
  }
  
  // Default to 500 Internal Server Error
  const sanitizedError = createSanitizedError(
    'INTERNAL_ERROR',
    err,
    requestId,
    correlationId,
    isProduction
  );
  
  return res.status(500).json(sanitizedError);
};

// ============================================================================
// ERROR BOUNDARY SETUP
// ============================================================================

/**
 * Setup global error boundary for uncaught exceptions
 */
export function setupErrorBoundary(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('[UNCAUGHT_EXCEPTION]', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
    
    // In production, exit gracefully
    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down due to uncaught exception...');
      process.exit(1);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('[UNHANDLED_REJECTION]', {
      timestamp: new Date().toISOString(),
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });
    
    // In production, exit gracefully
    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down due to unhandled rejection...');
      process.exit(1);
    }
  });
  
  console.log('✅ [ERROR_BOUNDARY] Global error boundary established');
}

// ============================================================================
// 404 NOT FOUND HANDLER
// ============================================================================

/**
 * 404 Not Found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = (req as any).requestId || generateRequestId();
  const correlationId = (req as any).correlationId;
  
  console.warn('[404_NOT_FOUND]', {
    requestId,
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  const sanitizedError = createSanitizedError('NOT_FOUND', undefined, requestId, correlationId, isProduction);
  
  res.status(404).json(sanitizedError);
};

// ============================================================================
// CONSOLIDATED EXPORTS
// ============================================================================

/**
 * Error handling middleware object - single namespace for error handling
 */
export const errorHandlingMiddleware = {
  // Request tracking
  requestIdMiddleware,
  generateRequestId,
  
  // Error sanitization
  sanitizeErrorMessage,
  createSanitizedError,
  
  // Global error handler
  errorHandler,
  
  // Error boundary
  setupErrorBoundary,
  
  // 404 handler
  notFoundHandler,
  
  // Production error messages (for reference)
  PRODUCTION_ERROR_MESSAGES
};

