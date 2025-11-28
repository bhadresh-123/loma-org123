-- ============================================================================
-- COMPLETE DATABASE WIPE - ALL TABLES
-- ============================================================================
-- This script wipes ALL data from both legacy and HIPAA tables
-- USE WITH CAUTION - This is irreversible!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: List all tables (for verification)
-- ============================================================================
-- Run this first to see what tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- ============================================================================
-- STEP 2: Wipe ALL HIPAA Tables
-- ============================================================================

-- Wipe audit logs first (no dependencies)
TRUNCATE TABLE audit_logs_hipaa RESTART IDENTITY CASCADE;

-- Wipe patient-related data
TRUNCATE TABLE patient_treatment_plans RESTART IDENTITY CASCADE;
TRUNCATE TABLE clinical_sessions RESTART IDENTITY CASCADE;
TRUNCATE TABLE patients RESTART IDENTITY CASCADE;

-- Wipe therapist data
TRUNCATE TABLE therapist_phi RESTART IDENTITY CASCADE;
TRUNCATE TABLE therapist_profiles RESTART IDENTITY CASCADE;

-- Wipe organization data
TRUNCATE TABLE organization_memberships RESTART IDENTITY CASCADE;
TRUNCATE TABLE organizations RESTART IDENTITY CASCADE;

-- Wipe authentication data
TRUNCATE TABLE users_auth RESTART IDENTITY CASCADE;

-- ============================================================================
-- STEP 3: Wipe ALL Legacy Tables (if they exist)
-- ============================================================================

-- Wipe legacy user-related tables (only if they exist)
-- Note: These will fail silently if tables don't exist - that's OK!

-- Try to wipe legacy tables (ignore errors if they don't exist)
DO $$
BEGIN
    BEGIN
        TRUNCATE TABLE onboarding_progress RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE sessions RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE clients RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE treatment_plans RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE licenses RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE stripe_accounts RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE credentialing_documents RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
    
    BEGIN
        TRUNCATE TABLE users RESTART IDENTITY CASCADE;
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue
    END;
END $$;

-- ============================================================================
-- STEP 4: Verify Complete Wipe
-- ============================================================================

-- Count rows in all HIPAA tables (should all be 0)
SELECT 'users_auth' as table_name, COUNT(*) as row_count FROM users_auth
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'organization_memberships', COUNT(*) FROM organization_memberships
UNION ALL
SELECT 'therapist_profiles', COUNT(*) FROM therapist_profiles
UNION ALL
SELECT 'therapist_phi', COUNT(*) FROM therapist_phi
UNION ALL
SELECT 'patients', COUNT(*) FROM patients
UNION ALL
SELECT 'clinical_sessions', COUNT(*) FROM clinical_sessions
UNION ALL
SELECT 'patient_treatment_plans', COUNT(*) FROM patient_treatment_plans
UNION ALL
SELECT 'audit_logs_hipaa', COUNT(*) FROM audit_logs_hipaa
UNION ALL
SELECT 'users (legacy)', COUNT(*) FROM users WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
UNION ALL
SELECT 'clients (legacy)', COUNT(*) FROM clients WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients')
UNION ALL
SELECT 'sessions (legacy)', COUNT(*) FROM sessions WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions')
ORDER BY table_name;

COMMIT;

-- ============================================================================
-- COMPLETE - All data wiped, sequences reset, ready for fresh data!
-- ============================================================================
