#!/bin/bash

# Quick Development Environment Setup
# Sets up minimal environment for testing PHI audit logging

echo "🔐 Setting up development environment for PHI audit logging testing"
echo "=================================================================="

# Database URL (using a simple in-memory SQLite for testing)
export DATABASE_URL="file:./dev.db"
echo "✅ Database URL set (SQLite for testing)"

# Environment
export NODE_ENV="development"
echo "✅ Node environment set to development"

# Session Secret (generated secure random key)
export SESSION_SECRET=$(openssl rand -hex 32)
echo "✅ Session secret generated securely"

# PHI Encryption Key (generated secure random key)
export PHI_ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "✅ PHI encryption key generated securely"

# Feature Flags
export ENABLE_HIPAA_ROUTES="true"
export ENABLE_HIPAA_ENCRYPTION="true"
export ENABLE_HIPAA_AUDIT_LOGGING="true"
echo "✅ HIPAA feature flags enabled"

# Disable rate limiting for development
export DISABLE_RATE_LIMITING="true"
echo "✅ Rate limiting disabled for development"

echo ""
echo "🎉 Environment Setup Complete!"
echo "============================="
echo ""
echo "Ready to test PHI audit logging:"
echo "1. Server will start on port 5000"
echo "2. Database logging will be active"
echo "3. File logging will be maintained as backup"
echo "4. All PHI access will be tracked"
echo ""
