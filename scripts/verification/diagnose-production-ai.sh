#!/bin/bash

# Production AI Integration Diagnostic Script
# Tests the production AI service to identify issues

echo "🔍 Production AI Integration Diagnostic"
echo "========================================"
echo ""

# Test 1: Basic server health
echo "1. Testing server health..."
health_response=$(curl -s "https://loma-org.onrender.com/health")
if echo "$health_response" | grep -q "ok"; then
    echo "   ✅ Server is healthy"
else
    echo "   ❌ Server health check failed"
    echo "   Response: $health_response"
fi

echo ""

# Test 2: Sigie endpoint accessibility
echo "2. Testing sigie endpoint accessibility..."
sigie_response=$(curl -s "https://loma-org.onrender.com/api/sigie" -X POST -H "Content-Type: application/json" -d '{"message": "test"}')

if echo "$sigie_response" | grep -q "AUTH_REQUIRED"; then
    echo "   ✅ Sigie endpoint is accessible (requires authentication)"
elif echo "$sigie_response" | grep -q "AI service unavailable"; then
    echo "   ❌ AI service not configured - API keys missing"
elif echo "$sigie_response" | grep -q "AI service temporarily unavailable"; then
    echo "   ❌ AI service API call failed - check API keys or OpenAI service"
elif echo "$sigie_response" | grep -q "error"; then
    echo "   ⚠️  Sigie endpoint has issues"
    echo "   Response: $sigie_response"
else
    echo "   ✅ Sigie endpoint responding normally"
fi

echo ""

# Test 3: Check for specific error patterns
echo "3. Analyzing error patterns..."
if echo "$sigie_response" | grep -q "API key not configured"; then
    echo "   🔑 Issue: OpenAI API key not set in production environment"
    echo "   Solution: Check Render dashboard > Environment variables"
elif echo "$sigie_response" | grep -q "OpenAI API Error"; then
    echo "   🔑 Issue: OpenAI API key invalid or service down"
    echo "   Solution: Verify API key in Render dashboard"
elif echo "$sigie_response" | grep -q "timeout"; then
    echo "   ⏱️  Issue: API request timeout"
    echo "   Solution: Check OpenAI service status"
else
    echo "   ✅ No obvious API key issues detected"
fi

echo ""

# Test 4: Check Render environment
echo "4. Render Environment Check..."
echo "   📋 Your render.yaml shows these AI services configured:"
echo "   - ANTHROPIC_API_KEY: sync: false"
echo "   - OPENAI_API_KEY: sync: false" 
echo "   - HUGGINGFACE_API_KEY: sync: false"
echo ""
echo "   ⚠️  'sync: false' means these are set in Render dashboard, not in code"

echo ""

# Test 5: Recommendations
echo "5. Recommendations:"
echo "==================="
echo ""

if echo "$sigie_response" | grep -q "AUTH_REQUIRED"; then
    echo "✅ The AI service appears to be working correctly!"
    echo "   The 'Authentication required' response is expected."
    echo ""
    echo "🎯 To test the Clinical Admin chat:"
    echo "   1. Log into your production app"
    echo "   2. Open the Clinical Admin chat"
    echo "   3. Send a message"
    echo "   4. If you still get errors, check browser console for details"
else
    echo "❌ AI service has issues. Check the following:"
    echo ""
    echo "🔧 Render Dashboard Check:"
    echo "   1. Go to https://dashboard.render.com"
    echo "   2. Find your 'loma-platform' service"
    echo "   3. Go to Environment tab"
    echo "   4. Verify these keys are set:"
    echo "      - OPENAI_API_KEY (should start with 'sk-')"
    echo "      - ANTHROPIC_API_KEY (should start with 'sk-ant-')"
    echo "      - HUGGINGFACE_API_KEY (should start with 'hf_')"
    echo ""
    echo "🔄 If keys are missing or invalid:"
    echo "   1. Update them in Render dashboard"
    echo "   2. Redeploy the service"
    echo "   3. Test again"
fi

echo ""
echo "📞 If issues persist, check:"
echo "   - Browser console for client-side errors"
echo "   - Render service logs for server-side errors"
echo "   - OpenAI service status at https://status.openai.com"
