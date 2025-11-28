#!/bin/bash

# Development Environment Setup Script
# This script sets up PostgreSQL development environment using Neon staging database

echo "🔧 Setting up PostgreSQL development environment..."

# Set environment variables for PostgreSQL development
# ⚠️  SECURITY WARNING: This script contains old database credentials
# Please update DATABASE_URL with your own Neon database connection string
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
echo "📊 Database: Neon staging (br-empty-water-adl92ix0)"
echo "🔧 Schema: Legacy PostgreSQL schema"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    echo "Please check your Neon database credentials and network access"
    exit 1
fi

echo ""
echo "🚀 Ready to start development server with PostgreSQL!"
echo "Run: npm run dev"
echo ""
