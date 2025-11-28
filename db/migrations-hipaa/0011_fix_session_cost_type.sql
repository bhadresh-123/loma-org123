-- Migration: Fix session_cost column type conversion
-- File: db/migrations-hipaa/0011_fix_session_cost_type.sql
-- Description: Fix session_cost and related decimal columns that cannot be automatically cast to numeric

-- Fix session_cost column in patients table
-- Convert any existing data to numeric properly
DO $$
BEGIN
    -- Check if column exists and needs conversion
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'session_cost'
        AND data_type != 'numeric'
    ) THEN
        -- Convert to numeric using explicit casting
        ALTER TABLE patients 
        ALTER COLUMN session_cost TYPE numeric(10, 2) 
        USING CASE 
            WHEN session_cost IS NULL THEN NULL
            WHEN session_cost::text ~ '^[0-9]+\.?[0-9]*$' THEN session_cost::text::numeric(10, 2)
            ELSE 0::numeric(10, 2)
        END;
        
        RAISE NOTICE 'Converted session_cost to numeric(10, 2)';
    END IF;
END $$;

-- Fix no_show_fee column in patients table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'no_show_fee'
        AND data_type != 'numeric'
    ) THEN
        ALTER TABLE patients 
        ALTER COLUMN no_show_fee TYPE numeric(10, 2) 
        USING CASE 
            WHEN no_show_fee IS NULL THEN NULL
            WHEN no_show_fee::text ~ '^[0-9]+\.?[0-9]*$' THEN no_show_fee::text::numeric(10, 2)
            ELSE 0::numeric(10, 2)
        END;
        
        RAISE NOTICE 'Converted no_show_fee to numeric(10, 2)';
    END IF;
END $$;

-- Fix copay_amount column in patients table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'copay_amount'
        AND data_type != 'numeric'
    ) THEN
        ALTER TABLE patients 
        ALTER COLUMN copay_amount TYPE numeric(10, 2) 
        USING CASE 
            WHEN copay_amount IS NULL THEN NULL
            WHEN copay_amount::text ~ '^[0-9]+\.?[0-9]*$' THEN copay_amount::text::numeric(10, 2)
            ELSE 0::numeric(10, 2)
        END;
        
        RAISE NOTICE 'Converted copay_amount to numeric(10, 2)';
    END IF;
END $$;

-- Fix deductible_amount column in patients table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patients' 
        AND column_name = 'deductible_amount'
        AND data_type != 'numeric'
    ) THEN
        ALTER TABLE patients 
        ALTER COLUMN deductible_amount TYPE numeric(10, 2) 
        USING CASE 
            WHEN deductible_amount IS NULL THEN NULL
            WHEN deductible_amount::text ~ '^[0-9]+\.?[0-9]*$' THEN deductible_amount::text::numeric(10, 2)
            ELSE 0::numeric(10, 2)
        END;
        
        RAISE NOTICE 'Converted deductible_amount to numeric(10, 2)';
    END IF;
END $$;

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
    '/db/migrations-hipaa/0011_fix_session_cost_type.sql',
    200,
    NOW()
);

