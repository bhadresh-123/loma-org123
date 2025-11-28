import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { eq, desc, and } from 'drizzle-orm';
import { getActiveSchema } from '@db';


// Enhanced CV Parser Security Middleware
export const cvSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const userAgent = req.get('User-Agent') || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const correlationId = `cv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add correlation ID to request for tracking
  req.correlationId = correlationId;

  // Critical security logging for all CV operations
  console.log(`[CV-SECURITY] ${correlationId} - ${req.method} ${req.path} - User: ${userId}, IP: ${ip}`);

  // Critical security logging (simplified for immediate implementation)
  if (userId) {
    console.log(`[CV-SECURITY-AUDIT] ${correlationId} - User ${userId} accessing CV data from ${ip}`);
  }

  // Disable all caching for CV endpoints to prevent cross-user exposure
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-CV-Security': 'enabled',
    'X-Correlation-ID': correlationId
  });

  next();
};

// User isolation validation utility
export const validateUserOwnership = (dataUserId: number, requestUserId: number, correlationId: string): boolean => {
  if (dataUserId !== requestUserId) {
    console.error(`[CV-SECURITY-BREACH] ${correlationId} - Cross-user access attempt: data owner ${dataUserId}, requester ${requestUserId}`);
    return false;
  }
  return true;
};

// Data integrity checker for CV responses
export const validateCVDataIntegrity = (education: any[], workExperience: any[], userId: number, correlationId: string): boolean => {
  // Verify all education entries belong to the requesting user
  const invalidEducation = education.filter(e => e.userId !== userId);
  if (invalidEducation.length > 0) {
    console.error(`[CV-SECURITY-BREACH] ${correlationId} - Invalid education entries found:`, invalidEducation.map(e => ({ id: e.id, userId: e.userId })));
    return false;
  }

  // Verify all work experience entries belong to the requesting user
  const invalidWork = workExperience.filter(w => w.userId !== userId);
  if (invalidWork.length > 0) {
    console.error(`[CV-SECURITY-BREACH] ${correlationId} - Invalid work entries found:`, invalidWork.map(w => ({ id: w.id, userId: w.userId })));
    return false;
  }

  console.log(`[CV-SECURITY] ${correlationId} - Data integrity validated: ${education.length} education, ${workExperience.length} work entries for user ${userId}`);
  return true;
};