/**
 * Core Security Middleware - Consolidated
 * 
 * Single source of truth for all core security controls:
 * - HTTPS enforcement
 * - Security headers (HSTS, CSP, X-Frame-Options, etc.)
 * - Rate limiting
 * - Input sanitization (SQL injection, XSS)
 * - CSRF protection
 * - Request size limits
 * 
 * Consolidates: security.ts, security-mitigation.ts
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import * as crypto from 'crypto';

// ============================================================================
// HTTPS ENFORCEMENT
// ============================================================================

/**
 * Enforce HTTPS in production environment
 */
export function enforceHTTPS(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.header('x-forwarded-proto') || req.protocol;
    if (proto !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
  }
  next();
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

/**
 * Primary security headers middleware
 * Sets HSTS, CSP, X-Frame-Options, and other security headers
 * 
 * This is the PRIMARY IMPLEMENTATION - single source of truth for security headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // HSTS (HTTP Strict Transport Security) - PRIMARY CONFIGURATION
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Enhanced security headers using Helmet.js with proper configuration
 * Helmet provides comprehensive security headers protection
 */
export function helmetSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https:"],
        frameAncestors: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false // Keep disabled for compatibility
  });
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Create rate limiting middleware with configurable options
 */
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  // Disable rate limiting in development
  if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITING === 'true') {
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }
  
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      });
    }
  });
};

/**
 * Pre-configured rate limit configurations
 * Granular tiers based on endpoint sensitivity and data classification
 */
export const rateLimits = {
  // Authentication endpoints (most restrictive)
  auth: createRateLimit(15 * 60 * 1000, 15, 'Too many authentication attempts'),
  
  // Critical PHI access (highly sensitive patient data)
  criticalPHI: createRateLimit(60 * 1000, 30, 'PHI access rate limit exceeded'),
  
  // Sensitive PHI operations (documents, clinical data)
  sensitivePHI: createRateLimit(60 * 1000, 60, 'Sensitive data access rate limit exceeded'),
  
  // Standard API operations
  standard: createRateLimit(60 * 1000, 100, 'API rate limit exceeded'),
  
  // Read-only operations (higher limit)
  readOnly: createRateLimit(60 * 1000, 200, 'Read rate limit exceeded'),
  
  // Admin operations
  admin: createRateLimit(60 * 1000, 50, 'Admin operation rate limit exceeded'),
  
  // File operations (uploads/downloads)
  files: createRateLimit(60 * 1000, 20, 'File operation rate limit exceeded'),
  
  // Legacy rate limits (kept for backwards compatibility)
  api: createRateLimit(15 * 60 * 1000, 100),      // 100 requests per 15 minutes (general API)
  strict: createRateLimit(60 * 1000, 10)          // 10 requests per minute (strict endpoints)
};

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * SQL injection prevention middleware
 * Checks request body, query, and params for SQL injection patterns
 */
export function preventSQLInjection(req: Request, res: Response, next: NextFunction) {
  const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)|(-{2})|(\*\/)|(%)|(\|)/gi;
  
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlInjectionPattern.test(value);
    }
    return false;
  };

  const checkObject = (obj: any): boolean => {
    for (const key in obj) {
      if (checkValue(obj[key]) || (typeof obj[key] === 'object' && obj[key] !== null && checkObject(obj[key]))) {
        return true;
      }
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Invalid characters detected in input'
    });
  }

  next();
}

/**
 * XSS prevention middleware
 * Checks for common XSS attack patterns
 */
export function preventXSS(req: Request, res: Response, next: NextFunction) {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  const checkForXSS = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return xssPatterns.some(pattern => pattern.test(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkForXSS);
    }
    return false;
  };

  if (checkForXSS(req.body) || checkForXSS(req.query) || checkForXSS(req.params)) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Suspicious input detected'
    });
  }

  next();
}

/**
 * Input sanitization helper functions
 */
export const sanitizeString = (value: any): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>"'&]/g, ''); // Basic XSS prevention
};

export const sanitizeEmail = (value: any): string => {
  if (typeof value !== 'string') return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = value.trim().toLowerCase();
  return emailRegex.test(sanitized) ? sanitized : '';
};

export const sanitizePhone = (value: any): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^\d\-\+\(\)\s]/g, '').trim();
};

export const sanitizeNumber = (value: any): number | null => {
  const num = parseInt(value);
  return isNaN(num) ? null : num;
};

// ============================================================================
// REQUEST SIZE LIMITS
// ============================================================================

/**
 * Request size limit middleware
 * Prevents oversized payloads that could cause DoS
 */
export function requestSizeLimit(req: Request, res: Response, next: NextFunction) {
  const contentLength = parseInt(req.get('content-length') || '0');
  
  if (contentLength > 50 * 1024 * 1024) { // 50MB limit
    return res.status(413).json({
      error: 'REQUEST_TOO_LARGE',
      message: 'Request size exceeds 50MB limit'
    });
  }

  next();
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * CSRF protection middleware for state-changing operations
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return next();
  }

  // Check for CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = (req.session as any)?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token'
    });
  }

  next();
}

/**
 * Generate CSRF token for session
 */
export function generateCSRFToken(req: Request, res: Response, next: NextFunction) {
  if (req.session && !(req.session as any).csrfToken) {
    (req.session as any).csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Common validation schemas
 */
export const idSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

/**
 * Pagination schema for list endpoints
 */
export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number).refine(val => val <= 100, {
    message: 'Limit cannot exceed 100'
  }),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

/**
 * Parse pagination parameters from request
 */
export const parsePagination = (req: Request) => {
  const result = paginationSchema.safeParse(req.query);
  if (!result.success) {
    return { 
      page: 1, 
      limit: 50, 
      offset: 0, 
      sortBy: undefined, 
      sortOrder: 'desc' as const 
    };
  }
  const { page, limit, sortBy, sortOrder } = result.data;
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder
  };
};

// ============================================================================
// CONSOLIDATED EXPORTS
// ============================================================================

/**
 * Core security middleware object - single namespace for all security controls
 */
export const coreSecurityMiddleware = {
  // HTTPS enforcement
  enforceHTTPS,
  
  // Security headers
  securityHeaders,
  helmetSecurityHeaders,
  
  // Rate limiting
  rateLimits,
  createRateLimit,
  
  // Input sanitization
  preventSQLInjection,
  preventXSS,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  
  // Request limits
  requestSizeLimit,
  
  // CSRF protection
  csrfProtection,
  generateCSRFToken,
  
  // Validation
  idSchema,
  paginationSchema,
  parsePagination
};

