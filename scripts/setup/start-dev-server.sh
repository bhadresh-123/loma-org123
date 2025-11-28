#!/bin/bash

# Kill any existing server processes
pkill -f "tsx server/index.ts" 2>/dev/null || true

# Set environment variables for local development
export DATABASE_URL="file:./dev.db"
export NODE_ENV="development"

# Generate secure random keys if not already set
if [ -z "$PHI_ENCRYPTION_KEY" ]; then
    echo "🔐 Generating secure PHI_ENCRYPTION_KEY..."
    export PHI_ENCRYPTION_KEY=$(openssl rand -hex 32)
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "🔐 Generating secure SESSION_SECRET..."
    export SESSION_SECRET=$(openssl rand -hex 32)
fi
# Don't use HIPAA schema for SQLite local dev
# export USE_HIPAA_SCHEMA="true"

# Start server in background
echo "🚀 Starting development server..."
npx tsx server/index.ts &

# Get the process ID
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server started successfully on port 5000"
    echo "📱 Open http://localhost:5000 in your browser"
    echo "🛑 To stop server: kill $SERVER_PID"
    echo "📊 Server PID: $SERVER_PID"
else
    echo "❌ Server failed to start"
    exit 1
fi
