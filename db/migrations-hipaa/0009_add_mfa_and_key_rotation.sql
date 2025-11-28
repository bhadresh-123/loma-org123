-- Migration: Add MFA and Key Rotation tables
-- Date: 2025-11-04
-- Purpose: HIPAA 1.4.4 compliance - MFA enforcement and key rotation tracking

-- Add MFA enforcement timestamp to users_auth
ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS mfa_enforced_at TIMESTAMP;

-- Create MFA secrets table
CREATE TABLE IF NOT EXISTS mfa_secrets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users_auth(id) ON DELETE CASCADE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes_hash TEXT, -- Hashed backup codes (deprecated, use mfa_recovery_codes instead)
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user_id ON mfa_secrets(user_id);

-- Create MFA recovery codes table
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- Bcrypt hashed recovery code
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recovery codes
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_used ON mfa_recovery_codes(user_id, used);

-- Create key rotation history table
CREATE TABLE IF NOT EXISTS key_rotation_history (
  id SERIAL PRIMARY KEY,
  key_type TEXT NOT NULL, -- 'PHI_ENCRYPTION_KEY', 'SESSION_SECRET', etc.
  rotated_by INTEGER REFERENCES users_auth(id),
  rotation_reason TEXT, -- 'scheduled', 'compromised', 'manual'
  old_key_fingerprint TEXT, -- Last 8 chars for reference
  new_key_fingerprint TEXT, -- Last 8 chars for reference
  records_reencrypted INTEGER DEFAULT 0,
  rotation_status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
  rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for key rotation tracking
CREATE INDEX IF NOT EXISTS idx_key_rotation_history_key_type ON key_rotation_history(key_type);
CREATE INDEX IF NOT EXISTS idx_key_rotation_history_rotated_at ON key_rotation_history(rotated_at DESC);

-- Add comments for documentation
COMMENT ON TABLE mfa_secrets IS 'Stores encrypted TOTP secrets for multi-factor authentication';
COMMENT ON TABLE mfa_recovery_codes IS 'One-time use backup codes for MFA recovery';
COMMENT ON TABLE key_rotation_history IS 'Tracks encryption key rotations for HIPAA compliance';
COMMENT ON COLUMN mfa_secrets.secret IS 'Encrypted using PHI_ENCRYPTION_KEY for additional security';
COMMENT ON COLUMN mfa_recovery_codes.code_hash IS 'Bcrypt hashed for secure storage';
COMMENT ON COLUMN key_rotation_history.records_reencrypted IS 'Number of database records re-encrypted during rotation';

