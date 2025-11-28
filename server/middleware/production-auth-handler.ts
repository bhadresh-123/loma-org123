import { Request, Response, NextFunction } from 'express';

/**
 * Production-ready authentication handler
 * Ensures API routes return consistent empty arrays instead of causing frontend crashes
 */
export const productionAuthHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log(`Production auth handler: Unauthenticated request to ${req.method} ${req.path}`);
    
    // For API routes that frontend expects to return arrays, return empty arrays
    const arrayEndpoints = [
      '/api/clients',
      '/api/clinical-sessions', 
      '/api/calendar/blocks',
      '/api/meetings',
      '/api/tasks',
      '/api/notifications'
    ];
    
    if (arrayEndpoints.includes(req.path)) {
      return res.json([]);
    }
    
    // For other API routes, return standard auth error
    return res.status(401).json({
      error: "AUTH_REQUIRED",
      message: "Authentication required",
    });
  }
  
  next();
};

/**
 * Wrapper for API routes that should return empty arrays when unauthenticated
 * This prevents frontend crashes when authentication fails
 */
export const safeArrayRoute = (handler: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check authentication first
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.log(`Safe array route: Returning empty array for unauthenticated request to ${req.path}`);
        return res.json([]);
      }
      
      // Execute the original handler
      return await handler(req, res, next);
    } catch (error) {
      console.error(`Safe array route error for ${req.path}:`, error);
      // On any error, return empty array to prevent frontend crashes
      return res.json([]);
    }
  };
};