#!/bin/bash

# Complete Secure Development Environment Setup
# Sets up all necessary environment variables securely for local development

echo "🔐 Complete Secure Development Setup"
echo "===================================="
echo ""
echo "This will set up all environment variables needed for local development."
echo "All values are stored in memory only - not on disk."
echo ""

# Database URL (using a local development database)
export DATABASE_URL="postgresql://username:password@localhost:5432/loma_dev"
echo "✅ Database URL set (using local development database)"

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

echo ""
echo "🤖 AI Integration Setup"
echo "======================"
echo ""

# Function to securely read API key
read_api_key() {
    local service_name=$1
    local key_pattern=$2
    
    echo -n "Enter your $service_name API key (or press Enter to skip): "
    read -s api_key
    echo ""
    
    if [ -z "$api_key" ]; then
        echo "⚠️  Skipping $service_name"
        return 1
    fi
    
    # Basic validation
    if [[ $api_key =~ $key_pattern ]]; then
        echo "✅ Valid $service_name key format"
        echo "$api_key"
    else
        echo "❌ Invalid $service_name key format"
        echo "Expected pattern: $key_pattern"
        return 1
    fi
}

# OpenAI API Key
echo "1. OpenAI API Key (starts with 'sk-', 51 characters total)"
openai_key=$(read_api_key "OpenAI" "^sk-[a-zA-Z0-9]{48}$")
if [ $? -eq 0 ]; then
    export OPENAI_API_KEY="$openai_key"
    echo "✅ OpenAI API key set for this session"
fi

echo ""

# Anthropic API Key  
echo "2. Anthropic API Key (starts with 'sk-ant-', 39 characters total)"
anthropic_key=$(read_api_key "Anthropic" "^sk-ant-[a-zA-Z0-9]{32}$")
if [ $? -eq 0 ]; then
    export ANTHROPIC_API_KEY="$anthropic_key"
    echo "✅ Anthropic API key set for this session"
fi

echo ""

# Hugging Face API Key
echo "3. Hugging Face API Key (starts with 'hf_', 37 characters total)"
hf_key=$(read_api_key "Hugging Face" "^hf_[a-zA-Z0-9]{34}$")
if [ $? -eq 0 ]; then
    export HUGGINGFACE_API_KEY="$hf_key"
    echo "✅ Hugging Face API key set for this session"
fi

echo ""
echo "🎉 Complete Setup Finished!"
echo "=========================="
echo ""
echo "All environment variables are set for this terminal session only."
echo "They will be lost when you close this terminal (this is secure!)."
echo ""
echo "Available services:"
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "  ✅ OpenAI"
fi
if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "  ✅ Anthropic"  
fi
if [ ! -z "$HUGGINGFACE_API_KEY" ]; then
    echo "  ✅ Hugging Face"
fi
echo ""
echo "Environment status:"
echo "  ✅ Database URL configured"
echo "  ✅ Session secret generated"
echo "  ✅ PHI encryption key generated"
echo "  ✅ HIPAA features enabled"
echo ""
echo "🚀 You can now run: npm run dev"
echo "🔒 All secrets are secure and not stored on disk"
echo ""
echo "To test AI integration:"
echo "1. Start the server: npm run dev"
echo "2. Open the Clinical Admin chat"
echo "3. Send a message - it should work without errors!"
