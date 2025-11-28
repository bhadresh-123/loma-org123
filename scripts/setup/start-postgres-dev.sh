#!/bin/bash

# PostgreSQL Development Environment Setup
# This script sets up the development environment with Neon PostgreSQL

echo "🔧 Setting up PostgreSQL development environment..."

# Set environment variables for PostgreSQL development
# ⚠️  SECURITY WARNING: Set your own database connection string!
# Get it from: https://console.neon.tech/
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set!"
    echo "Please set your Neon database connection string:"
    echo "export DATABASE_URL='postgresql://username:password@hostname.neon.tech/database?sslmode=require'"
    exit 1
fi

export NODE_ENV="development"

# Generate secure random keys if not already set
if [ -z "$SESSION_SECRET" ]; then
    echo "🔐 Generating secure SESSION_SECRET..."
    export SESSION_SECRET=$(openssl rand -hex 32)
fi

if [ -z "$PHI_ENCRYPTION_KEY" ]; then
    echo "🔐 Generating secure PHI_ENCRYPTION_KEY..."
    export PHI_ENCRYPTION_KEY=$(openssl rand -hex 32)
fi
export USE_HIPAA_SCHEMA="false"
export ENABLE_HIPAA_ROUTES="false"
export ENABLE_HIPAA_ENCRYPTION="false"
export ENABLE_HIPAA_AUDIT_LOGGING="false"

echo "✅ Environment variables set for PostgreSQL development"
echo "📊 Database: Neon PostgreSQL (wandering-mountain-adrgaiad)"
echo "🔧 Schema: Legacy PostgreSQL schema"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
psql "$DATABASE_URL" -c "SELECT 'Connection successful' as status;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo ""
    echo "🚀 Ready to start development server with PostgreSQL!"
    echo "Run: npm run dev"
    echo ""
    echo "🎉 PostgreSQL development environment is ready!"
    echo "This eliminates all SQLite vs PostgreSQL schema mismatch issues!"
else
    echo "❌ Database connection failed!"
    echo "Please check your Neon database credentials and network access"
    exit 1
fi
