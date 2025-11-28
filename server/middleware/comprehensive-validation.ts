import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Enhanced sanitization functions
export const sanitizeString = (value: any): string => {
  if (typeof value !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
};

export const sanitizeEmail = (value: any): string | null => {
  if (typeof value !== 'string') return null;
  
  const sanitized = sanitizeString(value);
  return validator.isEmail(sanitized) ? sanitized.toLowerCase() : null;
};

export const sanitizePhone = (value: any): string | null => {
  if (typeof value !== 'string') return null;
  
  const sanitized = sanitizeString(value);
  // Remove all non-digit characters except + at start
  const cleaned = sanitized.replace(/[^\d+]/g, '');
  
  // Basic phone validation (7-15 digits)
  if (/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
};

export const sanitizeNumber = (value: any): number | null => {
  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isFinite(parsed) ? parsed : null;
  }
  
  return null;
};

export const sanitizeHTML = (value: any): string => {
  if (typeof value !== 'string') return '';
  
  // Use DOMPurify to sanitize HTML content
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// Common validation schemas
export const idSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number).refine(n => n > 0),
  limit: z.string().optional().default('20').transform(Number).refine(n => n > 0 && n <= 100)
});

export const emailSchema = z.string()
  .min(1, 'Email is required')
  .max(255, 'Email too long')
  .email('Invalid email format')
  .transform(sanitizeEmail)
  .refine(val => val !== null, 'Invalid email format');

export const phoneSchema = z.string()
  .optional()
  .transform(sanitizePhone)
  .refine(val => val === null || val !== null, 'Invalid phone format');

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters')
  .transform(sanitizeString);

export const addressSchema = z.string()
  .max(500, 'Address too long')
  .regex(/^[a-zA-Z0-9\s\-\.,#\/]+$/, 'Address contains invalid characters')
  .transform(sanitizeString);

export const textAreaSchema = z.string()
  .max(5000, 'Text too long')
  .transform(sanitizeHTML);

// Client validation schema
export const clientSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema,
  address: addressSchema.optional(),
  dateOfBirth: z.string().optional().refine(val => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, 'Invalid date of birth'),
  emergencyContact: z.string().max(200).optional().transform(sanitizeString),
  notes: textAreaSchema.optional()
});

// Session validation schema
export const sessionSchema = z.object({
  patientId: z.number().int().positive('Invalid client ID'),
  date: z.string().refine(val => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date format'),
  duration: z.number().int().min(15).max(480).optional(), // 15 minutes to 8 hours
  type: z.enum(['individual', 'group', 'family', 'couples', 'assessment']),
  notes: textAreaSchema.optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).optional()
});

// Task validation schema
export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').transform(sanitizeString),
  description: textAreaSchema.optional(),
  patientId: z.number().int().positive('Invalid client ID').optional(),
  sessionId: z.number().int().positive('Invalid session ID').optional(),
  dueDate: z.string().optional().refine(val => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid due date'),
  status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
});

// Profile validation schema
export const profileSchema = z.object({
  name: nameSchema,
  title: z.string().max(100).optional().transform(sanitizeString),
  license: z.string().max(50).optional().transform(sanitizeString),
  email: emailSchema,
  phone: phoneSchema,
  personalPhone: phoneSchema,
  personalEmail: emailSchema.optional(),
  address: addressSchema.optional(),
  city: z.string().max(100).optional().transform(sanitizeString),
  state: z.string().max(50).optional().transform(sanitizeString),
  zipCode: z.string().max(20).optional().transform(sanitizeString),
  npiNumber: z.string().max(20).optional().transform(sanitizeString),
  einNumber: z.string().max(20).optional().transform(sanitizeString),
  legalBusinessName: z.string().max(200).optional().transform(sanitizeString)
});

// Enhanced validation middleware factory
export function validateInput(schema: z.ZodSchema, options: {
  sanitizeBody?: boolean;
  sanitizeParams?: boolean;
  sanitizeQuery?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate: any = {};
      
      if (options.sanitizeBody !== false) {
        dataToValidate.body = req.body;
      }
      if (options.sanitizeParams !== false) {
        dataToValidate.params = req.params;
      }
      if (options.sanitizeQuery !== false) {
        dataToValidate.query = req.query;
      }

      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      // Replace request data with validated and sanitized data
      if (result.data.body) {
        req.body = result.data.body;
      }
      if (result.data.params) {
        req.params = result.data.params;
      }
      if (result.data.query) {
        req.query = result.data.query;
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: 'Internal validation error'
      });
    }
  };
}

// Rate limiting for validation attempts
export const validationRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // This would integrate with your existing rate limiting middleware
  // For now, just pass through
  next();
};

// XSS protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize all string inputs in body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// SQL injection prevention for any remaining raw queries
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|\||&)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};
