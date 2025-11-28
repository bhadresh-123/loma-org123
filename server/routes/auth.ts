import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { loginSchema, userRegistrationSchema } from '../validation/schemas';
import { validateRequest } from '../middleware/validation';
import { db, getActiveSchema } from '../../db';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { OrganizationService } from '../services/OrganizationService';
import { auditMiddleware } from '../middleware/audit-logging';
import { usersAuth, therapistProfiles, organizations, organizationMemberships } from '@db/schema';
import { authenticateToken } from '../auth-simple';

const router = Router();

// Auth status endpoint is handled by auth-simple.ts

// Test endpoint to check database connection
router.get('/test', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const schema = getActiveSchema();
    if (!schema.usersAuth) {
      return res.status(500).json({ error: 'Schema not available' });
    }
    const users = await db.select().from(schema.usersAuth).limit(1);
    res.json({ success: true, users: users.length, schema: !!schema.usersAuth });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to try user insertion
router.post('/test-insert', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const schema = getActiveSchema();
    if (!schema.usersAuth) {
      return res.status(500).json({ error: 'Schema not available' });
    }
    console.log("Schema users:", !!schema.usersAuth);
    console.log("Schema users columns:", Object.keys(schema.usersAuth._.columns));
    
    const [newUser] = await db.insert(schema.usersAuth).values({
      username: 'test_insert_user',
      password: 'hashed_password',
      email: 'test@example.com',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    res.json({ success: true, user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// POST /api/auth/register - User registration
router.post('/register', 
  auditMiddleware.auditAuthEvent('REGISTRATION'),
  validateRequest(userRegistrationSchema),
  async (req, res) => {
  try {
    console.log("=== REGISTRATION REQUEST RECEIVED ===");
    console.log("Registration request for username:", req.body.username);
    const { username, password, name, title, license, specialties, email, practiceName } = req.body;
    
    // Check if database is available
    if (!db) {
      console.error("Database connection not available for registration");
      return res.status(500).json({
        error: "DATABASE_ERROR",
        message: "Database connection not available"
      });
    }
    
    // Validate required fields
    if (!username || !password || !name) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Username, password and name are required"
      });
    }

    // HIPAA 1.4.4 Compliance: Role-based password validation
    // Registration creates business_owner, which requires 14+ chars
    const { validatePasswordForRole } = await import('../validation/schemas');
    const passwordValidation = validatePasswordForRole(password, 'business_owner');
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: "WEAK_PASSWORD",
        message: passwordValidation.error
      });
    }

    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(usersAuth)
      .where(eq(usersAuth.username, username))
      .limit(1);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        error: "USER_EXISTS",
        message: "Username already exists"
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    let newUser: any;

    // HIPAA schema: Create user in users_auth and therapist_profiles, then create organization
    console.log("Creating auth user...");
    const insertedUsers = await db
      .insert(usersAuth)
      .values({
        username,
        password: hashedPassword,
        email: email || '',
        accountStatus: 'active',
        mfaEnforcedAt: new Date(), // HIPAA 1.4.4: Start MFA grace period for business owners
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log("Insert result:", insertedUsers);
    
    // Handle case where .returning() doesn't work properly with Neon driver
    let authUser = insertedUsers?.[0];
    
    if (!authUser || !authUser.id) {
      console.log("Warning: .returning() didn't return data, fetching user by username...");
      // Fetch the user that was just created
      const [fetchedUser] = await db
        .select()
        .from(usersAuth)
        .where(eq(usersAuth.username, username))
        .limit(1);
      
      authUser = fetchedUser;
    }

    console.log("Auth user created:", { id: authUser?.id, username: authUser?.username });
    
    if (!authUser) {
      throw new Error("Failed to create auth user");
    }
    
    if (!authUser.id) {
      throw new Error("Auth user created but ID is missing");
    }

    // Create therapist profile
    // Process specialties: convert string input to array
    let specialtiesArray: string[] = [];
    try {
      if (specialties && typeof specialties === 'string' && specialties.trim()) {
        // Split by comma and clean up each item
        specialtiesArray = specialties
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
    } catch (error: any) {
      console.error('Error processing specialties:', error);
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid specialties format",
        details: "Please enter specialties as comma-separated values"
      });
    }

    console.log("Creating therapist profile with userId:", authUser.id);
    const profileValues = {
      userId: authUser.id,
      name,
      professionalTitle: title || null,
      licenseNumber: license || null,
      specialties: specialtiesArray,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log("Profile values:", JSON.stringify(profileValues, null, 2));
    
    const insertedProfiles = await db
      .insert(therapistProfiles)
      .values(profileValues)
      .returning();
    
    // Handle case where .returning() doesn't work properly
    let profile = insertedProfiles?.[0];
    
    if (!profile || !profile.id) {
      console.log("Warning: .returning() didn't return profile data, fetching by userId...");
      const [fetchedProfile] = await db
        .select()
        .from(therapistProfiles)
        .where(eq(therapistProfiles.userId, authUser.id))
        .limit(1);
      
      profile = fetchedProfile;
    }
    
    console.log("Profile created:", { id: profile?.id, userId: profile?.userId, name: profile?.name });

      // Create solo organization for the therapist
      // Ensure practiceName is not null or empty (provide fallback)
      const orgName = practiceName?.trim() || `${name}'s Practice`;
      
      console.log("Creating organization:", orgName);
      const insertedOrgs = await db
        .insert(organizations)
        .values({
          name: orgName,
          type: 'solo',
          organizationBusinessEinEncrypted: null,
          organizationBusinessAddress: null,
          organizationBusinessCity: null,
          organizationBusinessState: null,
          organizationBusinessZip: null,
          organizationBusinessPhone: null,
          organizationBusinessEmail: email || null,
          defaultSessionDuration: 50,
          timezone: 'America/New_York',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

    // Handle case where .returning() doesn't work properly
    let organization = insertedOrgs?.[0];
    
    if (!organization || !organization.id) {
      console.log("Warning: .returning() didn't return organization data, fetching by name...");
      const [fetchedOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.name, orgName))
        .orderBy(desc(organizations.createdAt))
        .limit(1);
      
      organization = fetchedOrg;
    }

    console.log("Organization created:", { id: organization?.id, name: organization?.name });
    
    if (!organization) {
      throw new Error("Failed to create organization");
    }

    // Create organization membership with business_owner role
    console.log("Creating organization membership for user:", authUser.id, "in org:", organization.id);
    const insertedMemberships = await db
      .insert(organizationMemberships)
      .values({
        organizationId: organization.id,
        userId: authUser.id,
        role: 'business_owner',
        canViewAllPatients: true,
        canViewAllCalendars: true,
        canManageBilling: true,
        canManageStaff: true,
        canManageSettings: true,
        canCreatePatients: true,
        employmentStartDate: new Date(),
        employmentEndDate: null,
        isActive: true,
        isPrimaryOwner: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Handle case where .returning() doesn't work properly
    let membership = insertedMemberships?.[0];
    
    if (!membership || !membership.id) {
      console.log("Warning: .returning() didn't return membership data, fetching by userId and orgId...");
      const [fetchedMembership] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, authUser.id))
        .orderBy(desc(organizationMemberships.createdAt))
        .limit(1);
      
      membership = fetchedMembership;
    }

    console.log("Membership created:", { id: membership?.id, userId: membership?.userId, organizationId: membership?.organizationId });
    
    if (!membership) {
      throw new Error("Failed to create organization membership");
    }

    // Combine auth and profile data
    newUser = {
      ...authUser,
      ...profile,
      // Map profile fields to expected user fields
      name: profile?.name || authUser.username,
      title: profile?.professionalTitle,
      license: profile?.licenseNumber,
      specialties: profile?.specialties,
      organizationId: organization.id,
      organizationMembershipId: membership.id
    };

    // Create JWT token for the new user
    const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-key';
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '24h' });

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    console.log("Registration successful for:", newUser.id);
    
    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      title: newUser.title,
      license: newUser.license,
      specialties: newUser.specialties,
      email: newUser.email,
      organizationId: newUser.organizationId,
      organizationMembershipId: newUser.organizationMembershipId
    });
  } catch (error: any) {
    console.error('=== ERROR REGISTERING USER ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error stack:', error.stack);
    console.error('Registration data:', { 
      username: req.body.username, 
      name: req.body.name, 
      email: req.body.email, 
      practiceName: req.body.practiceName || 'NOT PROVIDED',
      hasPassword: !!req.body.password 
    });
    
    // Handle specific database errors
    if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
      return res.status(400).json({
        error: "USER_EXISTS",
        message: "Username already exists"
      });
    }
    
    // Handle null constraint violations with detailed field information
    if (error.message && (error.message.includes('null value') || error.message.includes('violates not-null constraint'))) {
      // Try to extract the field name from the error message
      // PostgreSQL error format: 'null value in column "field_name" violates not-null constraint'
      const fieldMatch = error.message.match(/column "([^"]+)"/);
      const fieldName = fieldMatch ? fieldMatch[1] : 'unknown';
      
      // Convert database field name to user-friendly name
      const fieldNameMap: Record<string, string> = {
        'username': 'Username',
        'password': 'Password',
        'name': 'Full Name',
        'email': 'Email',
        'organization_id': 'Practice Name',
        'user_id': 'User Account'
      };
      
      const userFriendlyField = fieldNameMap[fieldName] || fieldName;
      
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Missing required field: ${userFriendlyField}`,
        details: process.env.NODE_ENV === 'production' ? undefined : error.message,
        field: fieldName
      });
    }
    
    res.status(500).json({
      error: "SERVER_ERROR", 
      message: "Failed to register user",
      details: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

export default router;
