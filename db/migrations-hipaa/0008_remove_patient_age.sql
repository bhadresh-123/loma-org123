-- Migration: Remove patientAge field (computed from DOB instead)
-- Date: 2025-10-29
-- Rationale: Patient age should be computed dynamically from DOB to ensure accuracy
-- and comply with HIPAA Safe Harbor rules (ages >89 displayed as "90+")

-- Remove the patient_age column
ALTER TABLE patients DROP COLUMN IF EXISTS patient_age;

-- Add patient_name_search_hash column for secure name searching
-- This allows searching on names without exposing plaintext in search indices
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_name_search_hash TEXT;

