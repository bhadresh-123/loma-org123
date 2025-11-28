import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation middleware for request body validation
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use safeParse to avoid throwing errors
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        // Log validation errors for debugging
        console.error('Validation failed:', {
          errors: result.error.errors,
          receivedData: req.body
        });
        
        // Return validation errors in a user-friendly format
        const validationErrors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: validationErrors
        });
      }
      
      // Replace the request body with validated data
      req.body = result.data;
      
      next();
    } catch (error) {
      // This should rarely happen now that we use safeParse
      console.error('Unexpected validation middleware error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        error: 'Validation error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'production' ? undefined : errorMessage
      });
    }
  };
};

// Validation middleware for query parameters
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        console.error('Query validation failed:', {
          errors: result.error.errors,
          receivedData: req.query
        });
        
        const validationErrors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: validationErrors
        });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      console.error('Unexpected query validation middleware error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        error: 'Query validation error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'production' ? undefined : errorMessage
      });
    }
  };
};

// Validation middleware for URL parameters
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        console.error('Parameter validation failed:', {
          errors: result.error.errors,
          receivedData: req.params
        });
        
        const validationErrors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: validationErrors
        });
      }
      
      req.params = result.data;
      next();
    } catch (error) {
      console.error('Unexpected parameter validation middleware error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        error: 'Parameter validation error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'production' ? undefined : errorMessage
      });
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid().or(z.string().regex(/^\d+$/)),
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }),
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
};
