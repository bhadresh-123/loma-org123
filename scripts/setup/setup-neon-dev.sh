#!/bin/bash

# PostgreSQL Development Setup Helper
# This script helps you set up the correct DATABASE_URL for your Neon staging database

echo "🔧 PostgreSQL Development Setup Helper"
echo "====================================="
echo ""

echo "📋 To get your Neon database connection string:"
echo "1. Go to https://console.neon.tech/"
echo "2. Select your project: br-empty-water-adl92ix0"
echo "3. Go to 'Connection Details' or 'Dashboard'"
echo "4. Copy the connection string (it should look like):"
echo "   postgresql://username:password@hostname/database?sslmode=require"
echo ""

echo "🔍 Current Neon project ID: br-empty-water-adl92ix0"
echo ""

# Prompt for the connection string
echo "Please paste your Neon connection string below:"
read -p "DATABASE_URL: " neon_url

if [ -z "$neon_url" ]; then
    echo "❌ No connection string provided"
    exit 1
fi

# Validate the connection string format
if [[ $neon_url == postgresql://* ]]; then
    echo "✅ Connection string format looks correct"
else
    echo "❌ Connection string should start with 'postgresql://'"
    exit 1
fi

# Test the connection
echo ""
echo "🔍 Testing database connection..."
if psql "$neon_url" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
    
    # Create a development environment file
    echo "🔐 Generating secure PHI encryption key..."
    PHI_KEY=$(openssl rand -hex 32)
    
    cat > .env.development << EOF
# Development Environment Configuration
# Using Neon PostgreSQL staging database
# ⚠️  DO NOT COMMIT THIS FILE TO GIT ⚠️

DATABASE_URL=$neon_url
NODE_ENV=development
SESSION_SECRET=dev-session-secret-$(openssl rand -hex 16)
PHI_ENCRYPTION_KEY=$PHI_KEY
USE_HIPAA_SCHEMA=false
ENABLE_HIPAA_ROUTES=false
ENABLE_HIPAA_ENCRYPTION=false
ENABLE_HIPAA_AUDIT_LOGGING=false

# Optional settings
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key_here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
REDIS_URL=redis://localhost:6379
EOF

    echo "✅ Created .env.development file"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Run: source .env.development"
    echo "2. Run: psql \$DATABASE_URL -f add-organization-fields-to-clients.sql"
    echo "3. Run: npm run dev"
    echo ""
    echo "🎉 PostgreSQL development environment is ready!"
    
else
    echo "❌ Database connection failed!"
    echo "Please check your connection string and try again"
    exit 1
fi
