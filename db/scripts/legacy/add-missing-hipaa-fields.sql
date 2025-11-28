-- ============================================================================
-- ADD MISSING FIELDS TO HIPAA TABLES
-- ============================================================================
-- This script adds the 7 missing fields that are used in API responses
-- Run this BEFORE dropping legacy tables to maintain API compatibility
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add missing fields to therapist_profiles table
-- ============================================================================

-- Add professional details fields (API response fields)
ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS biography TEXT;

ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;

ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS qualifications TEXT;

ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS private_pay_rate DECIMAL(10,2);

-- ============================================================================
-- STEP 2: Add missing fields to therapist_phi table
-- ============================================================================

-- Add encrypted demographic fields (API response fields)
ALTER TABLE therapist_phi 
ADD COLUMN IF NOT EXISTS therapist_gender_encrypted TEXT;

ALTER TABLE therapist_phi 
ADD COLUMN IF NOT EXISTS therapist_race_encrypted TEXT;

-- ============================================================================
-- STEP 3: Add missing field to patients table
-- ============================================================================

-- Add age field (API response field)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS patient_age INTEGER;

-- ============================================================================
-- STEP 4: Verify all fields were added successfully
-- ============================================================================

-- Check therapist_profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'therapist_profiles'
AND column_name IN ('biography', 'years_of_experience', 'qualifications', 'private_pay_rate')
ORDER BY column_name;

-- Check therapist_phi table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'therapist_phi'
AND column_name IN ('therapist_gender_encrypted', 'therapist_race_encrypted')
ORDER BY column_name;

-- Check patients table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'patients'
AND column_name = 'patient_age'
ORDER BY column_name;

COMMIT;

-- ============================================================================
-- COMPLETE - All 7 missing fields added to HIPAA tables
-- ============================================================================
-- Fields added:
-- 1. therapist_profiles.biography
-- 2. therapist_profiles.years_of_experience  
-- 3. therapist_profiles.qualifications
-- 4. therapist_profiles.private_pay_rate
-- 5. therapist_phi.therapist_gender_encrypted
-- 6. therapist_phi.therapist_race_encrypted
-- 7. patients.patient_age
-- ============================================================================
