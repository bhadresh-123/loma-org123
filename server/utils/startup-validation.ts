import { db, queryClient, getActiveSchema } from '../../db';
import { validateEncryption } from './phi-encryption';
import { getEnvironmentConfig } from './environment';

/**
 * Startup Validation Utility
 * 
 * Validates critical configuration and dependencies before the server starts
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnvironmentVariables(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const envConfig = getEnvironmentConfig();

  // Critical environment variables
  if (!envConfig.databaseUrl) {
    result.valid = false;
    result.errors.push('DATABASE_URL is not set');
  }

  if (!process.env.SESSION_SECRET) {
    result.valid = false;
    result.errors.push('SESSION_SECRET is not set');
  } else if (process.env.SESSION_SECRET.length < 32) {
    result.warnings.push('SESSION_SECRET is shorter than 32 characters (recommended: 64)');
  }

  if (!process.env.PHI_ENCRYPTION_KEY) {
    result.valid = false;
    result.errors.push('PHI_ENCRYPTION_KEY is not set (required for HIPAA compliance)');
  } else if (process.env.PHI_ENCRYPTION_KEY.length !== 64) {
    result.valid = false;
    result.errors.push('PHI_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }

  // Validate PHI encryption is working
  try {
    if (!validateEncryption()) {
      result.valid = false;
      result.errors.push('PHI encryption validation failed');
    }
  } catch (error: any) {
    result.valid = false;
    result.errors.push(`PHI encryption error: ${error.message}`);
  }

  // Production-specific checks
  if (envConfig.isProduction) {
    if (process.env.SESSION_SECRET?.includes('change') || 
        process.env.SESSION_SECRET?.includes('CHANGE')) {
      result.valid = false;
      result.errors.push('SESSION_SECRET contains placeholder text - must be changed for production');
    }

    if (process.env.PHI_ENCRYPTION_KEY?.includes('change') || 
        process.env.PHI_ENCRYPTION_KEY?.includes('CHANGE')) {
      result.valid = false;
      result.errors.push('PHI_ENCRYPTION_KEY contains placeholder text - must be changed for production');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      result.warnings.push('STRIPE_SECRET_KEY is not set (payment features will not work)');
    }
  }

  return result;
}

/**
 * Validate database connection and schema
 */
export async function validateDatabaseSchema(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check database connection
  if (!db) {
    result.valid = false;
    result.errors.push('Database connection is not available');
    return result;
  }

  try {
    const schema = getActiveSchema();

    // Check critical tables exist
    const requiredTables = [
      'usersAuth',
      'organizations',
      'organizationMemberships',
      'therapistProfiles',
      'patients',
      'clinicalSessions'
    ];

    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      if (!(schema as any)[tableName]) {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      result.valid = false;
      result.errors.push(`Missing required tables in schema: ${missingTables.join(', ')}`);
      result.errors.push('Please run database migrations: npm run db:hipaa:push');
    }

    // Try a simple query to verify database connectivity
    try {
      if (queryClient) {
        await queryClient`SELECT 1 as test`;
      } else {
        throw new Error('Query client is not available');
      }
    } catch (queryError: any) {
      result.valid = false;
      result.errors.push(`Database query failed: ${queryError.message}`);
    }

  } catch (error: any) {
    result.valid = false;
    result.errors.push(`Schema validation failed: ${error.message}`);
  }

  return result;
}

/**
 * Run all startup validations
 */
export async function runStartupValidation(): Promise<boolean> {
  console.log('\n🔍 Running startup validation...\n');

  // Validate environment variables
  console.log('📋 Validating environment variables...');
  const envResult = validateEnvironmentVariables();
  
  if (envResult.errors.length > 0) {
    console.error('❌ Environment validation failed:');
    envResult.errors.forEach(error => console.error(`   - ${error}`));
  } else {
    console.log('✅ Environment variables validated');
  }

  if (envResult.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    envResult.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Validate database schema
  console.log('\n📋 Validating database schema...');
  const dbResult = await validateDatabaseSchema();
  
  if (dbResult.errors.length > 0) {
    console.error('❌ Database validation failed:');
    dbResult.errors.forEach(error => console.error(`   - ${error}`));
  } else {
    console.log('✅ Database schema validated');
  }

  if (dbResult.warnings.length > 0) {
    console.warn('⚠️  Database warnings:');
    dbResult.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  const isValid = envResult.valid && dbResult.valid;

  if (isValid) {
    console.log('\n✅ All startup validations passed!\n');
  } else {
    console.error('\n❌ Startup validation failed! Server may not function correctly.\n');
    
    // In production, we should fail fast
    const envConfig = getEnvironmentConfig();
    if (envConfig.isProduction) {
      console.error('🚨 PRODUCTION: Critical validation failures detected. Server will not start.');
      console.error('Please fix the errors above and redeploy.\n');
      process.exit(1);
    } else {
      console.warn('⚠️  DEVELOPMENT: Continuing despite validation errors, but functionality may be limited.\n');
    }
  }

  return isValid;
}

/**
 * Get system status for health check endpoint
 */
export async function getSystemStatus() {
  const envConfig = getEnvironmentConfig();
  const envResult = validateEnvironmentVariables();
  const dbResult = await validateDatabaseSchema();

  return {
    environment: process.env.NODE_ENV || 'unknown',
    database: {
      connected: db !== null,
      schemaValid: dbResult.valid,
      errors: dbResult.errors,
      warnings: dbResult.warnings
    },
    encryption: {
      configured: !!process.env.PHI_ENCRYPTION_KEY,
      valid: envResult.errors.filter(e => e.includes('encryption')).length === 0
    },
    config: {
      databaseUrl: envConfig.databaseUrl ? 'configured' : 'missing',
      sessionSecret: process.env.SESSION_SECRET ? 'configured' : 'missing',
      phiEncryptionKey: process.env.PHI_ENCRYPTION_KEY ? 'configured' : 'missing',
      useHipaaSchema: envConfig.useHipaaSchema
    },
    validation: {
      environment: {
        valid: envResult.valid,
        errors: envResult.errors,
        warnings: envResult.warnings
      },
      database: {
        valid: dbResult.valid,
        errors: dbResult.errors,
        warnings: dbResult.warnings
      }
    }
  };
}

