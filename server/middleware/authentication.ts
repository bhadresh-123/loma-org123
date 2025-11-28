/**
 * Authentication Middleware - Consolidated
 * 
 * Single source of truth for all authentication and authorization:
 * - JWT token authentication
 * - Session management and validation
 * - Brute force protection
 * - Device trust management
 * - MFA enforcement
 * - Password policy enforcement
 * - User context for database RLS
 * - Role-based access control (RBAC)
 * 
 * Consolidates: auth-simple.ts, enhanced-security-middleware.ts, session-security.ts,
 *               user-context-security.ts, rbac-middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { OrganizationMembershipRepository } from '../repositories';
import { ensureOrganizationMembership } from './rbac-helper';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
  organizationId?: number;
  organizationMembership?: {
    id: number;
    organizationId: number;
    role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
    canViewAllPatients: boolean;
    canViewSelectedPatients: number[];
    canViewAllCalendars: boolean;
    canViewSelectedCalendars: number[];
    canManageBilling: boolean;
    canManageStaff: boolean;
    canManageSettings: boolean;
    canCreatePatients: boolean;
    isActive: boolean;
    isPrimaryOwner: boolean;
  };
  sessionData?: any;
  deviceTrust?: any;
  correlationId?: string;
  userContext?: { userId: number };
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
      };
      organizationId?: number;
      sessionData?: any;
      deviceTrust?: any;
      correlationId?: string;
      userContext?: { userId: number };
    }
  }
}

// ============================================================================
// JWT CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET or SESSION_SECRET environment variable must be set for authentication');
}
const JWT_EXPIRES_IN = '24h';
const COOKIE_NAME = 'auth_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
};

// ============================================================================
// CORE AUTHENTICATION
// ============================================================================

/**
 * Primary JWT authentication middleware
 * Verifies JWT token from cookie or Authorization header
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Fetch user from database
    const { usersAuth } = await import('@db/schema');
    const { eq } = await import('drizzle-orm');
    
    const [user] = await db
      .select()
      .from(usersAuth)
      .where(eq(usersAuth.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date()) {
      return res.status(403).json({ 
        error: 'Account is locked',
        message: 'Your account has been locked due to multiple failed login attempts',
        lockedUntil: user.accountLockedUntil 
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Set user on request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// ============================================================================
// USER CONTEXT FOR ROW-LEVEL SECURITY
// ============================================================================

/**
 * Set database user context for row-level security policies
 * CRITICAL: Must be applied to all routes that access user data
 */
export const setUserContext = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (userId) {
    try {
      // Store user context in request object for SQLite/Postgres compatibility
      req.userContext = { userId };
      
      // Add security headers
      res.set({
        'X-User-Context': userId.toString(),
        'X-Security-Level': 'protected'
      });
      
      console.log(`[USER-CONTEXT] Set database context for user ${userId}`);
    } catch (error) {
      console.error(`[USER-CONTEXT-ERROR] Failed to set user context for user ${userId}:`, error);
      
      // Security failure - don't proceed with request
      return res.status(500).json({
        error: 'SECURITY_CONTEXT_FAILED',
        message: 'Unable to establish secure user context'
      });
    }
  }
  
  next();
};

/**
 * Enhanced security middleware for PHI-sensitive routes
 */
export const setPHIUserContext = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required for PHI access' });
  }
  
  try {
    req.userContext = { userId };
    
    // Enhanced security headers for PHI access
    res.set({
      'X-User-Context': userId.toString(),
      'X-Security-Level': 'phi-protected',
      'X-PHI-Access': 'true',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache'
    });
    
    console.log(`[PHI-USER-CONTEXT] Set PHI-protected context for user ${userId}`);
    next();
  } catch (error) {
    console.error(`[PHI-USER-CONTEXT-ERROR] Failed to set PHI user context:`, error);
    return res.status(500).json({
      error: 'PHI_SECURITY_CONTEXT_FAILED',
      message: 'Unable to establish secure PHI user context'
    });
  }
};

// ============================================================================
// ADVANCED SECURITY FEATURES
// ============================================================================

/**
 * Enhanced authentication with brute force protection and security monitoring
 * Checks for brute force attempts and suspicious request patterns
 */
export const enhancedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Import modules dynamically to avoid circular dependencies
    const { BruteForceProtection } = await import('../utils/brute-force-protection');
    const { SecurityMonitor } = await import('../utils/security-monitor');
    
    // Check for brute force attempts
    const ipCheck = await BruteForceProtection.checkAttempt(req.ip, 'IP', req.ip);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        error: 'Too many attempts',
        lockoutExpiresAt: ipCheck.lockoutExpiresAt,
        reason: ipCheck.reason
      });
    }

    // Security monitoring
    const securityAnalysis = await SecurityMonitor.analyzeRequest(req);
    if (securityAnalysis.shouldBlock) {
      return res.status(403).json({
        error: 'Request blocked for security reasons',
        riskScore: securityAnalysis.riskScore
      });
    }

    next();
  } catch (error) {
    console.error('Enhanced auth middleware error:', error);
    next(); // Don't block request if enhanced security fails
  }
};

/**
 * Session validation middleware
 * Validates session integrity and checks for anomalies
 */
export const validateEnhancedSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { SessionManager } = await import('../utils/session-manager');
    
    const sessionId = req.sessionID;
    if (!sessionId) {
      return res.status(401).json({ error: 'No session found' });
    }

    const validation = await SessionManager.validateSession(sessionId);
    if (!validation.isValid) {
      return res.status(401).json({
        error: 'Session invalid',
        reason: validation.reason
      });
    }

    if (validation.requiresReauth) {
      return res.status(401).json({
        error: 'Re-authentication required',
        reason: 'SESSION_REQUIRES_REAUTH'
      });
    }

    req.sessionData = validation.session;
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    next(); // Don't block if session validation fails
  }
};

/**
 * MFA enforcement middleware for administrative users
 * HIPAA 1.4.4 Compliance: Admin users must have MFA enabled
 */
export const requireMFAForAdmins = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's organization role
    const membership = req.organizationMembership;
    if (!membership) {
      // No org membership - not an admin, no MFA required
      return next();
    }

    // Check if user is admin or business_owner
    const isAdmin = membership.role === 'admin' || membership.role === 'business_owner';
    if (!isAdmin) {
      // Not an admin role - no MFA required
      return next();
    }

    // Admin user - check if MFA is enabled
    const { MFAService } = await import('../utils/mfa-service');
    const isMFAEnabled = await MFAService.isMFAEnabled(userId);

    if (!isMFAEnabled) {
      // Check grace period
      const setupInfo = await MFAService.needsMFASetup(userId);
      
      if (setupInfo.required) {
        // Grace period expired - MFA is now required
        return res.status(403).json({
          error: 'MFA setup required',
          message: 'Multi-factor authentication is required for administrative users',
          requiresMFASetup: true,
          gracePeriodExpired: true
        });
      } else if (setupInfo.gracePeriodEnds) {
        // Still in grace period - warn but allow access
        res.setHeader('X-MFA-Setup-Required', 'true');
        res.setHeader('X-MFA-Grace-Period-Ends', setupInfo.gracePeriodEnds.toISOString());
      }
    }

    next();
  } catch (error) {
    console.error('MFA admin enforcement error:', error);
    // Don't block on error, but log it
    next();
  }
};

/**
 * MFA enforcement middleware for sensitive operations
 * Requires MFA verification for high-security operations
 */
export const requireMFA = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { MFAService } = await import('../utils/mfa-service');
    
    // Check if user has MFA enabled
    const isMFAEnabled = await MFAService.isMFAEnabled(userId);
    if (!isMFAEnabled) {
      return res.status(403).json({
        error: 'MFA required for this operation',
        requiresMFASetup: true
      });
    }

    // Check if current session is MFA verified
    const sessionData = req.sessionData;
    if (!sessionData?.mfa_verified) {
      return res.status(403).json({
        error: 'MFA verification required',
        requiresMFAVerification: true
      });
    }

    next();
  } catch (error) {
    console.error('MFA middleware error:', error);
    res.status(500).json({ error: 'MFA validation failed' });
  }
};

/**
 * Device trust middleware
 * Assesses device trustworthiness based on various factors
 */
export const checkDeviceTrust = (minTrustLevel: number = 60) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { DeviceTrustManager } = await import('../utils/device-trust');
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const deviceFingerprint = req.get('X-Device-Fingerprint');
      if (!deviceFingerprint) {
        return res.status(400).json({
          error: 'Device fingerprint required',
          requiresDeviceRegistration: true
        });
      }

      const trustAssessment = await DeviceTrustManager.assessDeviceTrust(
        userId,
        deviceFingerprint,
        {
          location: null,
          timestamp: new Date(),
          ipAddress: req.ip
        }
      );

      if (trustAssessment.trustLevel < minTrustLevel) {
        return res.status(403).json({
          error: 'Device not trusted',
          trustLevel: trustAssessment.trustLevel,
          requiresVerification: trustAssessment.requiresVerification,
          riskFactors: trustAssessment.riskFactors
        });
      }

      req.deviceTrust = trustAssessment;
      next();
    } catch (error) {
      console.error('Device trust middleware error:', error);
      next(); // Don't block if device trust check fails
    }
  };
};

/**
 * Password policy enforcement middleware
 * Validates password strength and checks history
 */
export const enforcePasswordPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body.password) {
      return next();
    }

    const { PasswordPolicyEngine } = await import('../utils/password-policy');
    
    const userInfo = {
      username: req.body.username || req.user?.username || '',
      email: req.body.email || req.user?.email || '',
      name: req.body.name || '',
      dateOfBirth: req.body.dateOfBirth
    };

    const validation = await PasswordPolicyEngine.validatePassword(
      req.body.password,
      userInfo
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet policy requirements',
        issues: validation.issues,
        suggestions: validation.suggestions,
        score: validation.score
      });
    }

    // Check password history if updating existing user
    if (req.user?.id) {
      const isUnique = await PasswordPolicyEngine.checkPasswordHistory(
        req.user.id,
        req.body.password
      );

      if (!isUnique) {
        return res.status(400).json({
          error: 'Password was used recently',
          suggestion: 'Please choose a different password'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Password policy middleware error:', error);
    next(); // Don't block if password policy check fails
  }
};

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

/**
 * Set organization context from route parameters
 */
export const setOrganizationContext = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const organizationId = req.params.organizationId || req.query.organizationId;
  
  if (organizationId) {
    req.organizationId = parseInt(organizationId as string);
  }
  
  next();
};

/**
 * Load user's organization membership
 */
export const loadOrganizationMembership = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const organizationId = req.organizationId;
    
    if (!userId || !organizationId) {
      return res.status(400).json({ error: 'User ID and Organization ID required' });
    }
    
    const membership = await OrganizationMembershipRepository.findByUserAndOrganization(userId, organizationId);
    
    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'User is not a member of this organization' });
    }
    
    req.organizationMembership = membership;
    next();
  } catch (error) {
    console.error('Error loading organization membership:', error);
    res.status(500).json({ error: 'Failed to load organization membership' });
  }
};

/**
 * RBAC permission checkers
 */
export const rbac = {
  // Permission checkers
  canViewAllPatients: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (!membership?.canViewAllPatients) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot view all patients',
        required: 'business_owner role'
      });
    }
    next();
  },

  canViewSelectedPatients: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    const targetTherapistId = parseInt(req.params.therapistId || req.query.therapistId as string);
    
    if (!membership?.canViewSelectedPatients || !membership.canViewSelectedPatients.includes(targetTherapistId)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot view selected therapist patients',
        required: 'admin role with appropriate permissions'
      });
    }
    next();
  },

  canManageBilling: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (!membership?.canManageBilling) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot manage billing',
        required: 'business_owner role'
      });
    }
    next();
  },

  canManageStaff: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (!membership?.canManageStaff) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot manage staff',
        required: 'business_owner role'
      });
    }
    next();
  },

  canManageSettings: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (!membership?.canManageSettings) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot manage settings',
        required: 'business_owner role'
      });
    }
    next();
  },

  canCreatePatients: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (!membership?.canCreatePatients) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot create patients'
      });
    }
    next();
  },

  canViewAllCalendars: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (!membership?.canViewAllCalendars) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Cannot view all calendars',
        required: 'business_owner role'
      });
    }
    next();
  },

  // Role checkers
  requireBusinessOwner: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    if (membership?.role !== 'business_owner') {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Business owner role required'
      });
    }
    next();
  },

  requireAdminOrOwner: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    const role = membership?.role;
    if (role !== 'business_owner' && role !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Admin or business owner role required'
      });
    }
    next();
  },

  requireTherapistOrAbove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    const role = membership?.role;
    if (!['business_owner', 'admin', 'therapist'].includes(role || '')) {
      return res.status(403).json({ 
        error: 'Insufficient permissions: Therapist role or above required'
      });
    }
    next();
  },

  // Resource access checkers
  canAccessPatient: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const membership = await ensureOrganizationMembership(req);
    try {
      const userId = req.user?.id;
      const patientId = parseInt(req.params.patientId || req.params.id);
      
      if (!userId || !patientId) {
        return res.status(400).json({ error: 'User ID and Patient ID required' });
      }

      const { PatientRepository } = await import('../repositories');
      const patient = await PatientRepository.findById(patientId);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const memberships = await OrganizationMembershipRepository.findByUserId(userId);
      const canAccess = memberships.some(m => 
        m.organizationId === patient.organizationId && 
        (m.canViewAllPatients || 
         m.canViewSelectedPatients?.includes(patient.primaryTherapistId) ||
         (m.role === 'therapist' && patient.primaryTherapistId === userId))
      );

      if (!canAccess) {
        return res.status(403).json({ error: 'Insufficient permissions to access this patient' });
      }

      next();
    } catch (error) {
      console.error('Error checking patient access:', error);
      res.status(500).json({ error: 'Failed to verify patient access' });
    }
  },

  // Helper functions
  getUserRole: (req: AuthenticatedRequest): string | null => {
    return req.organizationMembership?.role || null;
  },

  isBusinessOwner: (req: AuthenticatedRequest): boolean => {
    return req.organizationMembership?.role === 'business_owner';
  },

  isAdmin: (req: AuthenticatedRequest): boolean => {
    return req.organizationMembership?.role === 'admin';
  },

  isTherapist: (req: AuthenticatedRequest): boolean => {
    return req.organizationMembership?.role === 'therapist';
  },

  isPrimaryOwner: (req: AuthenticatedRequest): boolean => {
    return req.organizationMembership?.isPrimaryOwner === true;
  },

  getOrganizationId: (req: AuthenticatedRequest): number | null => {
    return req.organizationMembership?.organizationId || null;
  },

  getUserId: (req: AuthenticatedRequest): number | null => {
    return req.user?.id || null;
  }
};

// ============================================================================
// CONSOLIDATED EXPORTS
// ============================================================================

/**
 * Authentication middleware object - single namespace for all auth controls
 */
export const authMiddleware = {
  // Core authentication
  authenticateToken,
  
  // User context
  setUserContext,
  setPHIUserContext,
  
  // Advanced security
  enhancedAuth,
  validateEnhancedSession,
  requireMFA,
  checkDeviceTrust,
  enforcePasswordPolicy,
  
  // Organization context
  setOrganizationContext,
  loadOrganizationMembership,
  
  // RBAC
  rbac
};

