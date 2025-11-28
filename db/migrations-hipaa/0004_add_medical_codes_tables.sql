-- Migration: Add medical codes and assessment categories tables
-- Created: 2025-10-26
-- Purpose: Support CPT code billing and assessment category management

-- Add medical codes table
CREATE TABLE IF NOT EXISTS medical_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  code_type TEXT NOT NULL,
  category TEXT,
  duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  effective_date TIMESTAMP,
  termination_date TIMESTAMP,
  created_by INTEGER REFERENCES users_auth(id),
  updated_by INTEGER REFERENCES users_auth(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add assessment categories table
CREATE TABLE IF NOT EXISTS assessment_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users_auth(id),
  updated_by INTEGER REFERENCES users_auth(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_medical_codes_code ON medical_codes(code);
CREATE INDEX IF NOT EXISTS idx_medical_codes_type ON medical_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_medical_codes_category ON medical_codes(category);
CREATE INDEX IF NOT EXISTS idx_medical_codes_active ON medical_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_categories_active ON assessment_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_categories_sort ON assessment_categories(sort_order);

-- Add comments for documentation
COMMENT ON TABLE medical_codes IS 'Reference table for medical billing codes (CPT, ICD-10, HCPCS)';
COMMENT ON TABLE assessment_categories IS 'Reference table for assessment category types';
COMMENT ON COLUMN medical_codes.code IS 'The actual billing code (e.g., 90834, 90837)';
COMMENT ON COLUMN medical_codes.code_type IS 'Type of code: cpt, icd10, or hcpcs';
COMMENT ON COLUMN medical_codes.category IS 'Session category: individual, family, group, assessment, or addon';
COMMENT ON COLUMN medical_codes.duration IS 'Typical session duration in minutes for this code';

