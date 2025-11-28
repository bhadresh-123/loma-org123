import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Environment Configuration Loader
 * Automatically loads the correct environment file based on NODE_ENV
 */
export function loadEnvironmentConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Define possible environment file paths
  const envFiles = [
    `.env.${nodeEnv}`,           // .env.development, .env.production
    `env.${nodeEnv}`,            // env.development, env.production
    '.env.local',                // Local overrides
    '.env'                       // Default fallback
  ];

  // Try to load environment files in order of priority
  for (const envFile of envFiles) {
    const envPath = join(process.cwd(), envFile);
    if (existsSync(envPath)) {
      console.log(`🔧 Loading environment from: ${envFile}`);
      config({ path: envPath });
      break;
    }
  }

  // Validate required environment variables
  validateEnvironmentVariables();
}

/**
 * Validate that all required environment variables are set
 */
function validateEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'NODE_ENV',
    'SESSION_SECRET',
    'PHI_ENCRYPTION_KEY'
  ];

  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please check your environment configuration file');
    process.exit(1);
  }

  // Log environment info (without sensitive data)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${getDatabaseInfo()}`);
  console.log(`🔐 HIPAA Schema: ${process.env.USE_HIPAA_SCHEMA === 'true' ? 'Enabled' : 'Disabled'}`);
}

/**
 * Get database information without exposing credentials
 */
function getDatabaseInfo(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return 'Not configured';
  
  try {
    const url = new URL(dbUrl);
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    isProduction,
    isDevelopment,
    databaseUrl: process.env.DATABASE_URL!,
    nodeEnv: process.env.NODE_ENV!,
    sessionSecret: process.env.SESSION_SECRET!,
    phiEncryptionKey: process.env.PHI_ENCRYPTION_KEY!,
    // Default to HIPAA schema in development unless explicitly disabled
    useHipaaSchema: process.env.USE_HIPAA_SCHEMA
      ? process.env.USE_HIPAA_SCHEMA === 'true'
      : isDevelopment ? true : false,
    enableHipaaRoutes: process.env.ENABLE_HIPAA_ROUTES
      ? process.env.ENABLE_HIPAA_ROUTES === 'true'
      : isDevelopment ? true : false,
    enableHipaaEncryption: process.env.ENABLE_HIPAA_ENCRYPTION
      ? process.env.ENABLE_HIPAA_ENCRYPTION === 'true'
      : isDevelopment ? true : false,
    enableHipaaAuditLogging: process.env.ENABLE_HIPAA_AUDIT_LOGGING
      ? process.env.ENABLE_HIPAA_AUDIT_LOGGING === 'true'
      : isDevelopment ? true : false,
    baseUrl: process.env.BASE_URL || (isProduction ? 'https://loma-org.onrender.com' : 'http://localhost:5000'),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    redisUrl: process.env.REDIS_URL,
    hipaaAuditRetentionDays: parseInt(process.env.HIPAA_AUDIT_RETENTION_DAYS || '2555'),
    hipaaEncryptionAlgorithm: process.env.HIPAA_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    hipaaSessionTimeoutMinutes: parseInt(process.env.HIPAA_SESSION_TIMEOUT_MINUTES || '30')
  };
}
