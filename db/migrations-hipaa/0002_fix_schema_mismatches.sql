-- Migration: Fix Schema Mismatches
-- File: db/migrations-hipaa/0002_fix_schema_mismatches.sql
-- Description: Fix data type mismatches and add missing columns to align database with schema

-- Fix patients table data type issues
ALTER TABLE patients 
  ALTER COLUMN authorization_required TYPE boolean 
  USING CASE 
    WHEN authorization_required = 'true' THEN true 
    WHEN authorization_required = 'false' THEN false 
    ELSE false 
  END;

-- Fix deleted column - convert from timestamp to boolean
-- First, add a new boolean column
ALTER TABLE patients ADD COLUMN deleted_new boolean DEFAULT false;

-- Update the new column based on existing deleted_at timestamp
UPDATE patients SET deleted_new = (deleted_at IS NOT NULL);

-- Drop the old columns
ALTER TABLE patients DROP COLUMN IF EXISTS deleted;
ALTER TABLE patients DROP COLUMN IF EXISTS deleted_at;

-- Rename the new column
ALTER TABLE patients RENAME COLUMN deleted_new TO deleted;

-- Add missing columns to tasks table (if not already added)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS session_id integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type text DEFAULT 'general';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_automated boolean DEFAULT false;

-- Add missing columns to clinical_sessions table
ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS is_intake boolean DEFAULT false;
ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS authorization_required boolean DEFAULT false;

-- Add missing columns to therapist_profiles table
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS business_address text;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS business_city varchar(255);
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS business_state varchar(255);
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS business_zip_code varchar(255);
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS business_phone text;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS business_email text;
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS ein_number varchar(255);
ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS legal_business_name varchar(255);

-- Add missing columns to therapist_phi table
ALTER TABLE therapist_phi ADD COLUMN IF NOT EXISTS emergency_contact_encrypted text;
ALTER TABLE therapist_phi ADD COLUMN IF NOT EXISTS emergency_phone_encrypted text;

-- Add missing columns to patients table (comprehensive PHI fields)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_marital_status_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_occupation_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_employer_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_emergency_contact_name_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_emergency_contact_phone_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_emergency_contact_relationship_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_insurance_policy_number_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_insurance_group_number_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_copay_amount_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_deductible_amount_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_out_of_pocket_max_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_primary_care_physician_name_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_primary_care_physician_phone_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_primary_care_physician_address_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_psychiatrist_name_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_psychiatrist_phone_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_psychiatrist_address_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_current_medications_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_allergies_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_medical_conditions_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_mental_health_history_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_family_mental_health_history_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_substance_use_history_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_trauma_history_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_presenting_concerns_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_treatment_goals_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_current_symptoms_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_risk_assessment_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_safety_plan_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_crisis_intervention_plan_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_name_search_hash text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_emergency_contact_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_insurance_id_encrypted text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_medications_encrypted text;

-- Add missing columns to calendar_blocks table
ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

-- Add missing columns to work_schedules table  
ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_organization_id ON patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_primary_therapist_id ON patients(primary_therapist_id);
CREATE INDEX IF NOT EXISTS idx_patients_deleted ON patients(deleted);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_organization_id ON clinical_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_patient_id ON clinical_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_therapist_id ON clinical_sessions(therapist_id);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Tasks foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_organization_id_fkey') THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_created_by_user_id_fkey') THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES users_auth(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_assigned_to_user_id_fkey') THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES users_auth(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_patient_id_fkey') THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
    END IF;
    
    -- Clinical sessions foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinical_sessions_organization_id_fkey') THEN
        ALTER TABLE clinical_sessions ADD CONSTRAINT clinical_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinical_sessions_patient_id_fkey') THEN
        ALTER TABLE clinical_sessions ADD CONSTRAINT clinical_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clinical_sessions_therapist_id_fkey') THEN
        ALTER TABLE clinical_sessions ADD CONSTRAINT clinical_sessions_therapist_id_fkey FOREIGN KEY (therapist_id) REFERENCES users_auth(id);
    END IF;
    
    -- Patients foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'patients_organization_id_fkey') THEN
        ALTER TABLE patients ADD CONSTRAINT patients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'patients_primary_therapist_id_fkey') THEN
        ALTER TABLE patients ADD CONSTRAINT patients_primary_therapist_id_fkey FOREIGN KEY (primary_therapist_id) REFERENCES users_auth(id);
    END IF;
    
END $$;

-- Update any existing data to have proper defaults
UPDATE patients SET authorization_required = false WHERE authorization_required IS NULL;
UPDATE patients SET deleted = false WHERE deleted IS NULL;
UPDATE tasks SET is_automated = false WHERE is_automated IS NULL;
UPDATE tasks SET type = 'general' WHERE type IS NULL;
UPDATE calendar_blocks SET is_recurring = false WHERE is_recurring IS NULL;
UPDATE work_schedules SET is_active = true WHERE is_active IS NULL;

-- Add comments for documentation
COMMENT ON TABLE patients IS 'HIPAA-compliant patient records with encrypted PHI';
COMMENT ON TABLE clinical_sessions IS 'Clinical session records with encrypted notes';
COMMENT ON TABLE tasks IS 'Task management for therapists and patients';
COMMENT ON TABLE calendar_blocks IS 'Calendar availability blocks for therapists';
COMMENT ON TABLE work_schedules IS 'Work schedule definitions for therapists';

-- Log the migration
INSERT INTO audit_logs_hipaa (
    user_id,
    action,
    resource_type,
    resource_id,
    request_method,
    request_path,
    response_status,
    created_at
) VALUES (
    NULL, -- System migration
    'SCHEMA_MIGRATION',
    'DATABASE',
    NULL,
    'MIGRATION',
    '/db/migrations-hipaa/0002_fix_schema_mismatches.sql',
    200,
    NOW()
);
