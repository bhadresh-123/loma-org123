#!/bin/bash
# Secure Environment Setup Script
# Usage: source setup-env.sh

echo "Setting up secure environment variables..."
echo "Please enter your API keys (they won't be stored):"

read -s -p "OpenAI API Key: " OPENAI_API_KEY
export OPENAI_API_KEY

read -s -p "Anthropic API Key: " ANTHROPIC_API_KEY  
export ANTHROPIC_API_KEY

read -s -p "Hugging Face API Key: " HUGGINGFACE_API_KEY
export HUGGINGFACE_API_KEY

echo ""
echo "✅ Environment variables set for this session only"
echo "🔒 Keys are not stored on disk"
echo "🚀 You can now run: npm run dev"
