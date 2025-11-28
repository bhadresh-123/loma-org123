import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { usersAuth, therapistProfiles, organizationMemberships } from '@db/schema';
import { eq } from 'drizzle-orm';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '24h'; // 24 hours

// Only log JWT config in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔐 [JWT-CONFIG] JWT_SECRET loaded:', JWT_SECRET ? 'YES' : 'NO');
  console.log('🔐 [JWT-CONFIG] JWT_SECRET length:', JWT_SECRET?.length);
  console.log('🔐 [JWT-CONFIG] JWT_SECRET from env:', process.env.SESSION_SECRET ? 'YES' : 'NO');
}
const COOKIE_NAME = 'auth_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  path: '/'
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Simple authentication middleware
export const authenticateToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.cookies[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [JWT-MIDDLEWARE] No token provided');
      }
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Get user data from database
    const [authUser] = await db
      .select()
      .from(usersAuth)
      .where(eq(usersAuth.id, decoded.userId))
      .limit(1);

    if (!authUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get additional user data
    let therapistProfile = null;
    let organizationMembership = null;

    try {
      const [profileResult] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, authUser.id))
        .limit(1);
      therapistProfile = profileResult;
    } catch (error) {
      console.warn('Could not fetch therapist profile:', error.message);
    }

    try {
      const [membershipResult] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, authUser.id))
        .limit(1);
      organizationMembership = membershipResult;
    } catch (error) {
      console.warn('Could not fetch organization membership:', error.message);
    }

    // Build user object
    const user = {
      id: authUser.id,
      username: authUser.username,
      name: therapistProfile?.name || authUser.username,
      email: authUser.email,
      title: therapistProfile?.professionalTitle || null,
      license: therapistProfile?.licenseNumber || null,
      specialties: therapistProfile?.specialties || null,
      accountStatus: authUser.accountStatus,
      mfaEnabled: authUser.mfaEnabled,
      lastLogin: authUser.lastLogin,
      failedLoginAttempts: authUser.failedLoginAttempts,
      accountLockedUntil: authUser.accountLockedUntil,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
      organizationId: organizationMembership?.organizationId || null,
      organizationMembershipId: organizationMembership?.id || null,
      organizationMembership: organizationMembership ? {
        id: organizationMembership.id,
        organizationId: organizationMembership.organizationId,
        userId: organizationMembership.userId,
        role: organizationMembership.role,
        canViewAllPatients: organizationMembership.canViewAllPatients,
        canViewSelectedPatients: organizationMembership.canViewSelectedPatients,
        canViewAllCalendars: organizationMembership.canViewAllCalendars,
        canViewSelectedCalendars: organizationMembership.canViewSelectedCalendars,
        canManageBilling: organizationMembership.canManageBilling,
        canManageStaff: organizationMembership.canManageStaff,
        canManageSettings: organizationMembership.canManageSettings,
        canCreatePatients: organizationMembership.canCreatePatients,
        employmentStartDate: organizationMembership.employmentStartDate,
        employmentEndDate: organizationMembership.employmentEndDate,
        isActive: organizationMembership.isActive,
        isPrimaryOwner: organizationMembership.isPrimaryOwner,
        createdAt: organizationMembership.createdAt,
        updatedAt: organizationMembership.updatedAt,
        organization: organizationMembership.organization
      } : null,
    };

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Login endpoint
export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('Login attempt:', username);

    // Find user
    const [authUser] = await db
      .select()
      .from(usersAuth)
      .where(eq(usersAuth.username, username))
      .limit(1);

    if (!authUser) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, authUser.password);
    if (!passwordMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get additional user data
    let therapistProfile = null;
    let organizationMembership = null;

    try {
      const [profileResult] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, authUser.id))
        .limit(1);
      therapistProfile = profileResult;
    } catch (error) {
      console.warn('Could not fetch therapist profile:', error.message);
    }

    try {
      const [membershipResult] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, authUser.id))
        .limit(1);
      organizationMembership = membershipResult;
    } catch (error) {
      console.warn('Could not fetch organization membership:', error.message);
    }

    // Build user object
    const user = {
      id: authUser.id,
      username: authUser.username,
      name: therapistProfile?.name || authUser.username,
      email: authUser.email,
      title: therapistProfile?.professionalTitle || null,
      license: therapistProfile?.licenseNumber || null,
      specialties: therapistProfile?.specialties || null,
      accountStatus: authUser.accountStatus,
      mfaEnabled: authUser.mfaEnabled,
      lastLogin: authUser.lastLogin,
      failedLoginAttempts: authUser.failedLoginAttempts,
      accountLockedUntil: authUser.accountLockedUntil,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
      organizationId: organizationMembership?.organizationId || null,
      organizationMembershipId: organizationMembership?.id || null,
      organizationMembership: organizationMembership ? {
        id: organizationMembership.id,
        organizationId: organizationMembership.organizationId,
        userId: organizationMembership.userId,
        role: organizationMembership.role,
        canViewAllPatients: organizationMembership.canViewAllPatients,
        canViewSelectedPatients: organizationMembership.canViewSelectedPatients,
        canViewAllCalendars: organizationMembership.canViewAllCalendars,
        canViewSelectedCalendars: organizationMembership.canViewSelectedCalendars,
        canManageBilling: organizationMembership.canManageBilling,
        canManageStaff: organizationMembership.canManageStaff,
        canManageSettings: organizationMembership.canManageSettings,
        canCreatePatients: organizationMembership.canCreatePatients,
        employmentStartDate: organizationMembership.employmentStartDate,
        employmentEndDate: organizationMembership.employmentEndDate,
        isActive: organizationMembership.isActive,
        isPrimaryOwner: organizationMembership.isPrimaryOwner,
        createdAt: organizationMembership.createdAt,
        updatedAt: organizationMembership.updatedAt,
        organization: organizationMembership.organization
      } : null,
    };

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set cookie
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    console.log('Login successful for user:', user.id);

    return res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      title: user.title,
      license: user.license,
      specialties: user.specialties,
      created_at: user.createdAt,
      organizationId: user.organizationId,
      organizationMembershipId: user.organizationMembershipId
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout endpoint
export const logout = (req: express.Request, res: express.Response) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.json({ message: 'Logged out successfully' });
};

// Auth status endpoint
export const authStatus = async (req: express.Request, res: express.Response) => {
  try {
    // Check if there's a JWT token
    const token = req.cookies[COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({
        isAuthenticated: false,
        userId: null
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Get user data from database
    const [authUser] = await db
      .select()
      .from(usersAuth)
      .where(eq(usersAuth.id, decoded.userId))
      .limit(1);

    if (!authUser) {
      return res.json({
        isAuthenticated: false,
        userId: null
      });
    }

    // Get additional user data
    let therapistProfile = null;
    let organizationMembership = null;

    try {
      const [profile] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, authUser.id))
        .limit(1);
      therapistProfile = profile;
    } catch (error) {
      console.log('No therapist profile found for user:', authUser.id);
    }

    try {
      const [membership] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, authUser.id))
        .limit(1);
      organizationMembership = membership;
    } catch (error) {
      console.log('No organization membership found for user:', authUser.id);
    }

    const user = {
      ...authUser,
      therapistProfile,
      organizationMembership
    };

    res.json({
      isAuthenticated: true,
      userId: user.id,
      user: user
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.json({
      isAuthenticated: false,
      userId: null
    });
  }
};

// Test endpoint for debugging
export const testAuth = async (req: express.Request, res: express.Response) => {
  try {
    const userCount = await db.select().from(usersAuth);
    res.json({
      message: 'Auth system working',
      userCount: userCount.length,
      sampleUser: userCount[0] ? {
        id: userCount[0].id,
        username: userCount[0].username
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Setup routes
export const setupAuthRoutes = (app: express.Application) => {
  // Login endpoint
  app.post('/api/login', login);
  
  // Logout endpoint (support both paths for compatibility)
  app.post('/api/logout', logout);
  app.post('/api/auth/logout', logout);
  
  // Auth status endpoint (no auth required - just checks if user is logged in)
  app.get('/api/auth/status', authStatus);
  
  // Test endpoint
  app.get('/api/auth-test', testAuth);
  
  // Debug endpoints
  app.get('/api/debug-jwt', (req, res) => {
    res.json({
      cookies: req.cookies,
      authHeader: req.headers.authorization,
      cookieName: COOKIE_NAME,
      jwtSecret: JWT_SECRET ? 'LOADED' : 'MISSING',
      jwtSecretLength: JWT_SECRET?.length
    });
  });
  
  app.get('/api/test-jwt', authenticateToken, (req, res) => {
    res.json({ 
      message: 'JWT middleware working!', 
      user: req.user 
    });
  });
};
