#!/bin/bash

# Production AI Integration Test for HIPAA Dev Environment
# Tests OpenAI and Anthropic integration on https://loma-hipaa-dev.onrender.com

echo "🤖 Production AI Integration Test"
echo "=================================="
echo ""
echo "Testing: https://loma-hipaa-dev.onrender.com"
echo ""

# Test 1: Server Health Check
echo "1. Server Health Check..."
health_response=$(curl -s "https://loma-hipaa-dev.onrender.com/api/health")
if echo "$health_response" | grep -q "ok"; then
    echo "   ✅ Server is healthy"
    echo "   Response: $(echo $health_response | jq -r '.status // "unknown"')"
else
    echo "   ❌ Server health check failed"
    echo "   Response: $health_response"
    exit 1
fi

echo ""

# Test 2: HIPAA Status Check
echo "2. HIPAA Compliance Status..."
hipaa_response=$(curl -s "https://loma-hipaa-dev.onrender.com/api/hipaa/status")
if echo "$hipaa_response" | grep -q "hipaaCompliant.*true"; then
    echo "   ✅ HIPAA compliance active"
    compliance_score=$(echo $hipaa_response | jq -r '.complianceScore // "unknown"')
    echo "   Compliance Score: $compliance_score%"
else
    echo "   ⚠️  HIPAA compliance status unclear"
    echo "   Response: $hipaa_response"
fi

echo ""

# Test 3: Sigie Endpoint Test (without auth)
echo "3. Sigie Endpoint Accessibility..."
sigie_response=$(curl -s "https://loma-hipaa-dev.onrender.com/api/sigie" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}')

if echo "$sigie_response" | grep -q "AUTH_REQUIRED"; then
    echo "   ✅ Sigie endpoint is accessible (requires authentication)"
elif echo "$sigie_response" | grep -q "AI service unavailable"; then
    echo "   ❌ AI service not configured - API keys missing"
    echo "   This is likely the cause of the 'I encountered an error' message"
elif echo "$sigie_response" | grep -q "AI service temporarily unavailable"; then
    echo "   ❌ AI service API call failed - check API keys or service status"
    echo "   This is likely the cause of the 'I encountered an error' message"
elif echo "$sigie_response" | grep -q "error"; then
    echo "   ⚠️  Sigie endpoint has issues"
    echo "   Response: $sigie_response"
else
    echo "   ✅ Sigie endpoint responding normally"
fi

echo ""

# Test 4: Check for specific error patterns
echo "4. Error Pattern Analysis..."
if echo "$sigie_response" | grep -q "API key not configured"; then
    echo "   🔑 Issue: OpenAI API key not set in production environment"
    echo "   Solution: Add OPENAI_API_KEY to Render dashboard > Environment variables"
elif echo "$sigie_response" | grep -q "OpenAI API Error"; then
    echo "   🔑 Issue: OpenAI API key invalid or service down"
    echo "   Solution: Verify API key in Render dashboard"
elif echo "$sigie_response" | grep -q "timeout"; then
    echo "   ⏱️  Issue: API timeout"
    echo "   Solution: Check OpenAI service status"
elif echo "$sigie_response" | grep -q "quota"; then
    echo "   💳 Issue: API quota exceeded"
    echo "   Solution: Check OpenAI billing/usage"
fi

echo ""

# Test 5: Test with demo authentication
echo "5. Testing with Demo Authentication..."
echo "   Attempting login with demo credentials..."

# Create a session and test sigie with authentication
session_response=$(curl -s -c cookies.txt "https://loma-hipaa-dev.onrender.com/api/login" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"username": "demo_therapist", "password": "demo"}')

if echo "$session_response" | grep -q "demo_therapist"; then
    echo "   ✅ Demo login successful"
    
    # Test sigie with authentication
    authenticated_sigie_response=$(curl -s -b cookies.txt "https://loma-hipaa-dev.onrender.com/api/sigie" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"message": "Hello, can you help me?"}')
    
    if echo "$authenticated_sigie_response" | grep -q "AI service unavailable"; then
        echo "   ❌ AI service not configured even with authentication"
        echo "   This confirms the issue is missing API keys"
    elif echo "$authenticated_sigie_response" | grep -q "AI service temporarily unavailable"; then
        echo "   ❌ AI service API call failed with authentication"
        echo "   This confirms the issue is API key problems"
    elif echo "$authenticated_sigie_response" | grep -q "message"; then
        echo "   ✅ AI service working with authentication"
        echo "   Response preview: $(echo $authenticated_sigie_response | jq -r '.message // "unknown"' | head -c 50)..."
    else
        echo "   ⚠️  Unexpected response with authentication"
        echo "   Response: $authenticated_sigie_response"
    fi
    
    # Clean up cookies
    rm -f cookies.txt
else
    echo "   ⚠️  Demo login failed - this is normal if demo account doesn't exist"
    echo "   Response: $session_response"
fi

echo ""

# Summary and Recommendations
echo "🎯 DIAGNOSIS SUMMARY"
echo "===================="
echo ""

if echo "$sigie_response" | grep -q "AI service unavailable"; then
    echo "❌ PROBLEM IDENTIFIED: Missing AI API Keys"
    echo ""
    echo "The 'I'm sorry, I encountered an error' message is caused by:"
    echo "   Missing OPENAI_API_KEY in the production environment"
    echo ""
    echo "🛠️  SOLUTION:"
    echo "1. Go to https://dashboard.render.com"
    echo "2. Find your 'loma-hipaa-dev' service"
    echo "3. Go to Environment tab"
    echo "4. Add these environment variables:"
    echo ""
    echo "   OPENAI_API_KEY=sk-your-actual-openai-key-here"
    echo "   ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here"
    echo ""
    echo "5. Save and redeploy the service"
    echo "6. Test the Clinical Admin chat again"
elif echo "$sigie_response" | grep -q "AI service temporarily unavailable"; then
    echo "❌ PROBLEM IDENTIFIED: AI API Key Issues"
    echo ""
    echo "The 'I'm sorry, I encountered an error' message is caused by:"
    echo "   Invalid or expired API keys, or OpenAI service issues"
    echo ""
    echo "🛠️  SOLUTION:"
    echo "1. Check your API keys in Render dashboard"
    echo "2. Verify keys are valid and have sufficient quota"
    echo "3. Test keys manually:"
    echo "   curl -H 'Authorization: Bearer YOUR_KEY' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"model\": \"gpt-3.5-turbo\", \"messages\": [{\"role\": \"user\", \"content\": \"hello\"}]}' \\"
    echo "        https://api.openai.com/v1/chat/completions"
else
    echo "✅ AI Integration appears to be working correctly"
    echo "   The error might be intermittent or related to authentication"
fi

echo ""
echo "📋 NEXT STEPS:"
echo "1. Check Render dashboard logs for detailed error messages"
echo "2. Verify API keys are set and valid"
echo "3. Test the Clinical Admin chat after fixing API keys"
echo "4. If issues persist, check OpenAI service status"
