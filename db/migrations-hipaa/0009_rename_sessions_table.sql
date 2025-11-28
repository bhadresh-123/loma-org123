-- Migration: Rename sessions_hipaa to clinical_sessions
-- File: db/migrations-hipaa/0009_rename_sessions_table.sql
-- Description: Rename sessions_hipaa table to clinical_sessions to match code expectations
-- This fixes the "null value in column id" error by ensuring the table exists with proper naming

DO $$ 
BEGIN
    -- Check if sessions_hipaa exists and clinical_sessions doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions_hipaa'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clinical_sessions'
    ) THEN
        -- Rename the table
        ALTER TABLE sessions_hipaa RENAME TO clinical_sessions;
        
        -- Rename the sequence
        ALTER SEQUENCE IF EXISTS sessions_hipaa_id_seq RENAME TO clinical_sessions_id_seq;
        
        -- Update the default value to reference the renamed sequence
        ALTER TABLE clinical_sessions 
        ALTER COLUMN id SET DEFAULT nextval('clinical_sessions_id_seq'::regclass);
        
        RAISE NOTICE 'Renamed sessions_hipaa to clinical_sessions';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clinical_sessions'
    ) THEN
        -- Table already exists with correct name
        -- Verify it has proper sequence default
        DECLARE
            default_value TEXT;
        BEGIN
            SELECT column_default INTO default_value
            FROM information_schema.columns
            WHERE table_name = 'clinical_sessions' 
              AND column_name = 'id';
            
            -- If no default or wrong default, fix it
            IF default_value IS NULL OR default_value NOT LIKE '%clinical_sessions_id_seq%' THEN
                -- Check if sequence exists
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.sequences
                    WHERE sequence_name = 'clinical_sessions_id_seq'
                ) THEN
                    -- Create sequence if missing
                    CREATE SEQUENCE clinical_sessions_id_seq;
                    
                    -- Set it to start after max existing id
                    PERFORM setval('clinical_sessions_id_seq', 
                                   COALESCE((SELECT MAX(id) FROM clinical_sessions), 0) + 1);
                END IF;
                
                -- Set the default
                ALTER TABLE clinical_sessions 
                ALTER COLUMN id SET DEFAULT nextval('clinical_sessions_id_seq'::regclass);
                
                RAISE NOTICE 'Fixed clinical_sessions id default';
            ELSE
                RAISE NOTICE 'clinical_sessions already configured correctly';
            END IF;
        END;
    ELSE
        RAISE WARNING 'No session table found - this migration requires either sessions_hipaa or clinical_sessions to exist';
    END IF;
    
    -- Add missing columns if they don't exist (for forward compatibility)
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS organization_id INTEGER;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_clinical_notes_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_subjective_notes_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_objective_notes_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_assessment_notes_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_plan_notes_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_treatment_goals_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_progress_notes_encrypted TEXT;
    ALTER TABLE clinical_sessions ADD COLUMN IF NOT EXISTS session_interventions_encrypted TEXT;
    
    -- Rename old columns if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinical_sessions' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE clinical_sessions RENAME COLUMN client_id TO patient_id;
        RAISE NOTICE 'Renamed client_id to patient_id';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinical_sessions' AND column_name = 'notes_encrypted'
    ) THEN
        ALTER TABLE clinical_sessions RENAME COLUMN notes_encrypted TO session_clinical_notes_encrypted;
        RAISE NOTICE 'Renamed notes_encrypted to session_clinical_notes_encrypted';
    END IF;
    
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clinical_sessions_organization_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinical_sessions' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE clinical_sessions 
        ADD CONSTRAINT clinical_sessions_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clinical_sessions_patient_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinical_sessions' AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE clinical_sessions 
        ADD CONSTRAINT clinical_sessions_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clinical_sessions_therapist_id_fkey'
    ) THEN
        ALTER TABLE clinical_sessions 
        ADD CONSTRAINT clinical_sessions_therapist_id_fkey 
        FOREIGN KEY (therapist_id) REFERENCES users_auth(id);
    END IF;
    
END $$;

-- Log the migration
INSERT INTO audit_logs_hipaa (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    created_at
) VALUES (
    NULL,
    'MIGRATION',
    'DATABASE_SCHEMA',
    NULL,
    'system',
    NOW()
);

-- Add comment
COMMENT ON TABLE clinical_sessions IS 'Clinical session records (renamed from sessions_hipaa) with encrypted PHI fields';

