import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { neon } from "@neondatabase/serverless";

/**
 * HIPAA Test Setup
 * 
 * Sets up test environment for HIPAA compliance tests
 */

let testDb: any;

beforeAll(async () => {
  // Set up test database connection
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/loma_test';
  testDb = neon(DATABASE_URL);
  
  // Validate test encryption key is set
  // Never hardcode encryption keys - they should come from .env.test or CI/CD secrets
  if (!process.env.PHI_ENCRYPTION_KEY) {
    throw new Error('PHI_ENCRYPTION_KEY environment variable must be set for HIPAA tests');
  }
  
  // Enable HIPAA features for testing
  process.env.ENABLE_HIPAA_ROUTES = 'true';
  process.env.ENABLE_HIPAA_ENCRYPTION = 'true';
  process.env.ENABLE_HIPAA_AUDIT_LOGGING = 'true';
  
  console.log('🔐 HIPAA test environment initialized');
});

afterAll(async () => {
  // Clean up test database
  if (testDb) {
    try {
      // Drop test tables if they exist
      await testDb`DROP TABLE IF EXISTS audit_logs_hipaa CASCADE`;
      await testDb`DROP TABLE IF EXISTS sessions_hipaa CASCADE`;
      await testDb`DROP TABLE IF EXISTS clients_hipaa CASCADE`;
      await testDb`DROP TABLE IF EXISTS therapist_phi CASCADE`;
      await testDb`DROP TABLE IF EXISTS therapist_profiles CASCADE`;
      await testDb`DROP TABLE IF EXISTS users_auth CASCADE`;
      
      console.log('🧹 HIPAA test environment cleaned up');
    } catch (error) {
      console.error('Error cleaning up test environment:', error);
    }
  }
});

beforeEach(async () => {
  // Set up fresh test data for each test
  try {
    // Create test tables
    await testDb`
      CREATE TABLE IF NOT EXISTS users_auth (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        account_status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await testDb`
      CREATE TABLE IF NOT EXISTS therapist_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        title TEXT,
        license_number TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await testDb`
      CREATE TABLE IF NOT EXISTS therapist_phi (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
        ssn_encrypted TEXT,
        personal_email_encrypted TEXT,
        personal_phone_encrypted TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await testDb`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL,
        primary_therapist_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        patient_contact_email_encrypted TEXT,
        patient_contact_phone_encrypted TEXT,
        patient_clinical_notes_encrypted TEXT,
        patient_contact_email_search_hash TEXT,
        patient_contact_phone_search_hash TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        deleted BOOLEAN DEFAULT false
      )
    `;
    
    await testDb`
      CREATE TABLE IF NOT EXISTS clinical_sessions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        therapist_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        session_clinical_notes_encrypted TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await testDb`
      CREATE TABLE IF NOT EXISTS audit_logs_hipaa (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users_auth(id),
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id INTEGER,
        fields_accessed JSONB,
        phi_fields_count INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Insert test data
    await testDb`
      INSERT INTO users_auth (username, password, email) 
      VALUES ('test_therapist', 'hashed_password', 'therapist@test.com')
      ON CONFLICT (username) DO NOTHING
    `;
    
  } catch (error) {
    console.error('Error setting up test data:', error);
  }
});

afterEach(async () => {
  // Clean up test data after each test
  try {
    await testDb`DELETE FROM audit_logs_hipaa`;
    await testDb`DELETE FROM sessions_hipaa`;
    await testDb`DELETE FROM clients_hipaa`;
    await testDb`DELETE FROM therapist_phi`;
    await testDb`DELETE FROM therapist_profiles`;
    await testDb`DELETE FROM users_auth WHERE username = 'test_therapist'`;
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

// Export test database for use in tests
export { testDb };
