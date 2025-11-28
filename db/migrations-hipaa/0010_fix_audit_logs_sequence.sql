-- Migration: Fix audit_logs_hipaa id column sequence
-- This ensures the id column has a proper auto-increment sequence

-- Step 1: Ensure the sequence exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename = 'audit_logs_hipaa_id_seq'
    ) THEN
        -- Create sequence if it doesn't exist
        CREATE SEQUENCE audit_logs_hipaa_id_seq;
        RAISE NOTICE 'Created sequence audit_logs_hipaa_id_seq';
    ELSE
        RAISE NOTICE 'Sequence audit_logs_hipaa_id_seq already exists';
    END IF;
END $$;

-- Step 2: Set the sequence value to max(id) + 1
SELECT setval(
    'audit_logs_hipaa_id_seq', 
    COALESCE((SELECT MAX(id) FROM audit_logs_hipaa), 0) + 1,
    false
);

-- Step 3: Set the default value for the id column
ALTER TABLE audit_logs_hipaa 
ALTER COLUMN id SET DEFAULT nextval('audit_logs_hipaa_id_seq');

-- Step 4: Ensure the sequence is owned by the table column
ALTER SEQUENCE audit_logs_hipaa_id_seq OWNED BY audit_logs_hipaa.id;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Current sequence value: %', currval('audit_logs_hipaa_id_seq');
    RAISE NOTICE 'Migration completed successfully';
END $$;

