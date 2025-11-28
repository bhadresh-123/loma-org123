#!/bin/bash

# AI Integration Test Script
# Tests if the AI services are properly configured and working

echo "🤖 AI Integration Test"
echo "======================"
echo ""

# Check if environment variables are set
echo "Checking environment variables..."

if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "✅ OPENAI_API_KEY is set (length: ${#OPENAI_API_KEY})"
else
    echo "❌ OPENAI_API_KEY not set"
fi

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY is set (length: ${#ANTHROPIC_API_KEY})"
else
    echo "❌ ANTHROPIC_API_KEY not set"
fi

if [ ! -z "$HUGGINGFACE_API_KEY" ]; then
    echo "✅ HUGGINGFACE_API_KEY is set (length: ${#HUGGINGFACE_API_KEY})"
else
    echo "❌ HUGGINGFACE_API_KEY not set"
fi

echo ""

# Test OpenAI client initialization
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "Testing OpenAI client..."
    node -e "
    const OpenAI = require('openai');
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('✅ OpenAI client initialized successfully');
    } catch (error) {
        console.log('❌ OpenAI client failed:', error.message);
    }
    " 2>/dev/null || echo "❌ OpenAI test failed"
fi

echo ""

# Test server endpoint
echo "Testing server endpoint..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Server is running"
    
    # Test sigie endpoint (should return auth required, not AI service unavailable)
    response=$(curl -s http://localhost:5000/api/sigie -X POST -H "Content-Type: application/json" -d '{"message": "hello"}' 2>/dev/null)
    
    if echo "$response" | grep -q "AUTH_REQUIRED"; then
        echo "✅ Sigie endpoint is working (requires authentication)"
    elif echo "$response" | grep -q "AI service unavailable"; then
        echo "❌ AI service not configured properly"
    else
        echo "⚠️  Unexpected response from sigie endpoint"
    fi
else
    echo "❌ Server is not running"
    echo "   Start it with: npm run dev"
fi

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. If you haven't set up environment variables yet:"
echo "   source setup-dev.sh"
echo ""
echo "2. Start the server:"
echo "   npm run dev"
echo ""
echo "3. Test the Clinical Admin chat in your browser"
echo ""
echo "4. The chat should now work without 'I encountered an error' messages"
