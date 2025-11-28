/**
 * Audit Logging Middleware - Consolidated
 * 
 * Single source of truth for audit and compliance logging:
 * - PHI access auditing
 * - Compliance monitoring
 * - Request correlation tracking
 * - HIPAA audit trails
 * 
 * Consolidates: audit-middleware.ts, compliance-monitoring.ts
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AuditAction =
  | 'PHI_ACCESS'
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'EXPORT'
  | 'PRINT';

export type ResourceType =
  | 'PATIENT'
  | 'CLINICAL_SESSION'
  | 'TREATMENT_PLAN'
  | 'THERAPIST_PHI'
  | 'DOCUMENT'
  | 'INVOICE'
  | 'USER'
  | 'SYSTEM';

interface AuditOptions {
  trackFields?: boolean;
  requireAuthorization?: boolean;
  skipForReadOnly?: boolean;
  customFields?: string[];
}

interface AuditEvent {
  userId: number | null;
  sessionId?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  phiFieldsAccessed?: string[];
  fieldsAccessed?: string[];
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
  responseTime?: number;
  securityLevel?: string;
  riskScore?: number;
  hipaaCompliant?: boolean;
  success?: boolean;
  details?: string;
  additionalData?: any;
}

// ============================================================================
// CORRELATION ID GENERATION
// ============================================================================

/**
 * Generate unique correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Add correlation ID to request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = generateCorrelationId();
  req.correlationId = correlationId;
  
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', correlationId);
  
  next();
};

// ============================================================================
// PHI FIELD EXTRACTION
// ============================================================================

/**
 * Extract PHI field names from response data
 */
export function extractPHIFields(data: any): string[] {
  const phiFields: string[] = [];
  
  const checkObject = (obj: any, prefix: string = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      // Check if field name indicates PHI
      if (key.includes('Encrypted') || 
          key.includes('PHI') || 
          key.includes('ssn') ||
          key.includes('dob') ||
          key.includes('diagnosis') ||
          key.includes('medical') ||
          key.includes('treatment')) {
        phiFields.push(fullKey);
      }
      
      // Recursively check nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkObject(obj[key], fullKey);
      }
    });
  };
  
  if (Array.isArray(data)) {
    data.forEach((item, index) => checkObject(item, `[${index}]`));
  } else {
    checkObject(data);
  }
  
  return [...new Set(phiFields)]; // Remove duplicates
}

/**
 * Extract error message from response data
 */
function extractErrorMessage(data: any): string | undefined {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    return data.error || data.message || JSON.stringify(data);
  }
  return undefined;
}

/**
 * Sanitize query parameters for logging (remove sensitive data)
 */
function sanitizeQueryParams(query: any): any {
  if (!query || typeof query !== 'object') return query;
  
  const sanitized = { ...query };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'ssn'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// ============================================================================
// AUDIT LOGGING MIDDLEWARE
// ============================================================================

/**
 * PHI access audit logging middleware
 * Logs all PHI access with comprehensive audit trail
 */
export const auditPHIAccess = (
  action: AuditAction,
  resourceType: ResourceType,
  options: AuditOptions = {}
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    const correlationId = req.correlationId || generateCorrelationId();
    
    // Add correlation ID to request
    req.correlationId = correlationId;
    
    // Pre-operation audit logging
    const preAuditEvent: AuditEvent = {
      userId: req.user?.id || null,
      sessionId: req.sessionID,
      action,
      resourceType,
      resourceId: req.params.id ? parseInt(req.params.id) : undefined,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId,
      phiFieldsAccessed: [],
      additionalData: {
        method: req.method,
        path: req.path,
        query: sanitizeQueryParams(req.query),
        preOperation: true,
        timestamp: new Date().toISOString()
      }
    };
    
    // Log pre-operation (non-blocking)
    logAuditEvent(preAuditEvent).catch(error => {
      console.error('Pre-operation audit logging failed:', error);
    });
    
    // Intercept response to log outcome
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(data) {
      setImmediate(() => logPostOperationAudit(data, true));
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      setImmediate(() => logPostOperationAudit(data, res.statusCode < 400));
      return originalSend.call(this, data);
    };
    
    const logPostOperationAudit = async (responseData: any, success: boolean) => {
      try {
        const duration = performance.now() - startTime;
        
        // Extract PHI fields if tracking enabled
        let phiFieldsAccessed: string[] = [];
        if (options.trackFields) {
          phiFieldsAccessed = extractPHIFields(responseData);
          
          if (options.customFields) {
            phiFieldsAccessed.push(...options.customFields);
          }
        }
        
        // Log to database
        const postAuditEvent: AuditEvent = {
          userId: req.user?.id || null,
          sessionId: req.sessionID,
          action,
          resourceType,
          resourceId: req.params.id ? parseInt(req.params.id) : undefined,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          correlationId,
          fieldsAccessed: phiFieldsAccessed,
          phiFieldsAccessed,
          requestMethod: req.method,
          requestPath: req.path,
          responseStatus: res.statusCode,
          responseTime: Math.round(duration),
          securityLevel: phiFieldsAccessed.length > 0 ? 'phi-protected' : 'standard',
          riskScore: calculateRiskScore(action, phiFieldsAccessed.length, success),
          hipaaCompliant: true,
          success,
          details: success ? undefined : extractErrorMessage(responseData)
        };
        
        await logAuditEvent(postAuditEvent);
      } catch (error) {
        console.error('Post-operation audit logging failed:', error);
      }
    };
    
    next();
  };
};

/**
 * Calculate risk score based on action and PHI access
 */
function calculateRiskScore(action: AuditAction, phiFieldCount: number, success: boolean): number {
  let score = 0;
  
  // Base score by action type
  const actionScores: Record<AuditAction, number> = {
    PHI_ACCESS: 50,
    CREATE: 30,
    READ: 20,
    UPDATE: 40,
    DELETE: 60,
    LOGIN: 10,
    LOGOUT: 5,
    FAILED_LOGIN: 70,
    EXPORT: 80,
    PRINT: 70
  };
  
  score += actionScores[action] || 20;
  
  // Increase score based on PHI fields accessed
  score += phiFieldCount * 5;
  
  // Increase score for failed operations
  if (!success) {
    score += 30;
  }
  
  return Math.min(score, 100);
}

/**
 * Log audit event to database and file
 */
async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    // Log to database
    const { logDetailedPHIAccessToDatabase } = await import('../utils/unified-audit-service');
    
    await logDetailedPHIAccessToDatabase({
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      fieldsAccessed: event.fieldsAccessed || [],
      requestMethod: event.requestMethod,
      requestPath: event.requestPath,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      details: event.details,
      sessionId: event.sessionId,
      correlationId: event.correlationId,
      responseStatus: event.responseStatus,
      responseTime: event.responseTime,
      securityLevel: event.securityLevel
    });
    
    // Also log to console for immediate visibility
    console.log('[AUDIT]', {
      timestamp: new Date().toISOString(),
      ...event
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// ============================================================================
// COMPLIANCE MONITORING
// ============================================================================

/**
 * Validate HIPAA compliance on startup
 */
export function validateComplianceOnStartup(): boolean {
  try {
    console.log('🔍 [COMPLIANCE] Validating HIPAA compliance...');
    
    // Check encryption key
    if (!process.env.PHI_ENCRYPTION_KEY) {
      console.error('❌ [COMPLIANCE] PHI_ENCRYPTION_KEY not set');
      return false;
    }
    
    if (process.env.PHI_ENCRYPTION_KEY.length !== 64) {
      console.error('❌ [COMPLIANCE] PHI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      return false;
    }
    
    // Check database connection
    if (!process.env.DATABASE_URL) {
      console.error('❌ [COMPLIANCE] DATABASE_URL not set');
      return false;
    }
    
    // Check session secret
    if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET) {
      console.error('❌ [COMPLIANCE] SESSION_SECRET or JWT_SECRET not set');
      return false;
    }
    
    console.log('✅ [COMPLIANCE] HIPAA compliance validated');
    return true;
  } catch (error) {
    console.error('❌ [COMPLIANCE] Validation failed:', error);
    return false;
  }
}

/**
 * Monitor ongoing compliance status
 */
export function monitorComplianceStatus(): void {
  // Check compliance every hour
  setInterval(() => {
    const isCompliant = validateComplianceOnStartup();
    if (!isCompliant) {
      console.error('⚠️ [COMPLIANCE] HIPAA compliance check failed');
    }
  }, 3600000); // 1 hour
  
  console.log('✅ [COMPLIANCE] Compliance monitoring started');
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

/**
 * Security event logging middleware
 * Logs security-relevant events (failed auth, suspicious patterns)
 */
export const securityLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log security-relevant events
    if (res.statusCode >= 400) {
      console.warn('[SECURITY_EVENT]', {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        correlationId: req.correlationId
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// ============================================================================
// CONSOLIDATED EXPORTS
// ============================================================================

/**
 * Audit logging middleware object - single namespace for audit controls
 */
/**
 * Audit authentication events (login, logout, registration)
 * Wraps response to log auth actions with full audit trail
 */
export const auditAuthEvent = (action: 'LOGIN' | 'LOGOUT' | 'REGISTRATION') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const correlationId = generateCorrelationId();
    
    res.json = function(data) {
      setImmediate(async () => {
        try {
          const success = res.statusCode < 400;
          const userId = action === 'LOGIN' || action === 'REGISTRATION' ? (data?.id || null) : (req.user?.id || null);
          
          // Map action to AuditAction enum
          let auditAction: AuditAction;
          if (action === 'LOGIN') auditAction = 'LOGIN';
          else if (action === 'REGISTRATION') auditAction = 'LOGIN'; // Use LOGIN for registration audit
          else auditAction = 'LOGOUT';
          
          // Log to database using the existing audit event function
          await logAuditEvent({
            userId,
            action: auditAction,
            resourceType: 'SYSTEM',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success,
            details: success ? undefined : JSON.stringify(data),
            sessionId: req.sessionID,
            correlationId
          });
        } catch (error) {
          console.error('Auth audit logging failed:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

export const auditMiddleware = {
  // Correlation tracking
  requestIdMiddleware,
  generateCorrelationId,
  
  // PHI access auditing
  auditPHIAccess,
  extractPHIFields,
  
  // Auth auditing
  auditAuthEvent,
  
  // Compliance monitoring
  validateComplianceOnStartup,
  monitorComplianceStatus,
  
  // Security logging
  securityLoggingMiddleware
};

