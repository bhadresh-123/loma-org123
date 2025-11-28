#!/bin/bash

# Dev Server Restart Script
# Reliably kills and restarts the development server

echo "🔄 Restarting development server..."

# Kill any existing tsx processes
echo "🛑 Stopping existing server..."
pkill -f "tsx server/start.ts" 2>/dev/null || true
sleep 2

# Double-check and force kill if needed
if pgrep -f "tsx server/start.ts" > /dev/null; then
  echo "⚠️  Force killing stubborn processes..."
  pkill -9 -f "tsx server/start.ts" 2>/dev/null || true
  sleep 2
fi

# Kill any processes holding ports 5000-5001
echo "🔌 Checking for processes on ports 5000-5001..."
for port in 5000 5001; do
  PID=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "   Killing process $PID on port $port"
    kill -9 $PID 2>/dev/null || true
  fi
done
sleep 1

# Clean up old log files
echo "🧹 Cleaning up old logs..."
rm -f dev.log dev.pid

# Start fresh server
echo "🚀 Starting fresh server..."
npm run dev > dev.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > dev.pid

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
  sleep 1
  if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    echo "📋 Server PID: $SERVER_PID"
    echo "📝 Logs: tail -f dev.log"
    exit 0
  fi
  echo -n "."
done

echo ""
echo "❌ Server did not start within 30 seconds"
echo "📝 Check logs: tail -f dev.log"
exit 1

