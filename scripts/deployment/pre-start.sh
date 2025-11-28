#!/bin/bash

# Pre-Start Deployment Script
# Runs automatically before the server starts on Render

set -e  # Exit on error

echo "🚀 Running pre-start deployment tasks..."

# Run all pending migrations
echo "📦 Running database migrations..."
npm run migrate:all || echo "⚠️  Migrations already applied or skipped"

echo "✅ Pre-start tasks completed!"

