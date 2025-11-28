#!/bin/bash

# Local Development Environment Setup
# This script sets up the correct environment variables for local development

echo "🔧 Setting up local development environment..."

# Set the correct database URL for local SQLite
export DATABASE_URL="file:./dev.db"

# Set the correct base URL for local development (port 5000)
export BASE_URL="http://localhost:5000"

# Set development environment
export NODE_ENV="development"

# Set session secret for local development - generate your own!
# Generate with: openssl rand -hex 32
if [ -z "$SESSION_SECRET" ]; then
    echo "⚠️  SESSION_SECRET not set. Generating random value..."
    export SESSION_SECRET=$(openssl rand -hex 32)
fi

# Set PHI encryption key for HIPAA compliance (required for server startup)
# CRITICAL: Generate with: openssl rand -hex 32
if [ -z "$PHI_ENCRYPTION_KEY" ]; then
    echo "⚠️  PHI_ENCRYPTION_KEY not set. Generating random value..."
    export PHI_ENCRYPTION_KEY=$(openssl rand -hex 32)
fi

# Optional: Set Stripe keys if you have them
# export STRIPE_SECRET_KEY="sk_test_your_stripe_test_key_here"
# export STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

echo "✅ Environment variables set:"
echo "   DATABASE_URL: $DATABASE_URL"
echo "   BASE_URL: $BASE_URL"
echo "   NODE_ENV: $NODE_ENV"
echo "   PHI_ENCRYPTION_KEY: [SET]"
echo ""
echo "🚀 You can now run: npm run dev"
