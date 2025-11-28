#!/bin/bash

# Post-Migration Verification Script
# Tests that all migrations were applied correctly and endpoints are working

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://loma-hipaa-dev.onrender.com}"
API_URL="${BASE_URL}/api"

echo "🧪 Post-Migration Verification Tests"
echo "=================================="
echo "Base URL: $BASE_URL"
echo ""

# Track test results
PASSED=0
FAILED=0

# Function to run a test
test_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

# Test 1: Health Endpoint
echo "1️⃣  Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    test_pass "Health endpoint returns ok"
    if echo "$HEALTH_RESPONSE" | grep -q '"database":{"connected":true'; then
        test_pass "Database connection is healthy"
    else
        test_fail "Database connection issue detected"
    fi
else
    test_fail "Health endpoint failed"
    echo "   Response: $HEALTH_RESPONSE"
fi
echo ""

# Test 2: Check Database Schema (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
    echo "2️⃣  Testing Database Schema..."
    
    # Check if patient_name_search_hash column exists
    COLUMN_CHECK=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='patients' AND column_name='patient_name_search_hash';" 2>/dev/null || echo "0")
    if [ "$COLUMN_CHECK" -gt 0 ]; then
        test_pass "patient_name_search_hash column exists"
    else
        test_fail "patient_name_search_hash column is missing"
    fi
    
    # Check if tasks table exists
    TABLE_CHECK=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tasks';" 2>/dev/null || echo "0")
    if [ "$TABLE_CHECK" -gt 0 ]; then
        test_pass "tasks table exists"
    else
        test_fail "tasks table is missing"
    fi
    
    # Check if medical_codes table exists
    MEDICAL_CODES_CHECK=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='medical_codes';" 2>/dev/null || echo "0")
    if [ "$MEDICAL_CODES_CHECK" -gt 0 ]; then
        test_pass "medical_codes table exists"
    else
        test_warn "medical_codes table is missing (may not be critical)"
    fi
    
    # Check if documents table exists
    DOCUMENTS_CHECK=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='documents';" 2>/dev/null || echo "0")
    if [ "$DOCUMENTS_CHECK" -gt 0 ]; then
        test_pass "documents table exists"
    else
        test_warn "documents table is missing (may not be critical)"
    fi
else
    echo "2️⃣  Skipping database schema checks (DATABASE_URL not set)"
fi
echo ""

# Test 3: API Endpoints (unauthorized should return 401/403, not 500)
echo "3️⃣  Testing API Endpoints..."

# Patients endpoint - should return auth error, not 500
PATIENTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/patients")
HTTP_CODE=$(echo "$PATIENTS_RESPONSE" | tail -n1)
BODY=$(echo "$PATIENTS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    test_pass "Patients endpoint returns auth error (401/403), not 500"
elif [ "$HTTP_CODE" = "500" ]; then
    test_fail "Patients endpoint still returning 500 error"
    echo "   Response: $BODY"
else
    test_warn "Patients endpoint returned unexpected status: $HTTP_CODE"
fi

# Clinical sessions endpoint
SESSIONS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/clinical-sessions")
SESSIONS_CODE=$(echo "$SESSIONS_RESPONSE" | tail -n1)
if [ "$SESSIONS_CODE" = "401" ] || [ "$SESSIONS_CODE" = "403" ]; then
    test_pass "Clinical sessions endpoint returns auth error, not 500"
elif [ "$SESSIONS_CODE" = "500" ]; then
    test_fail "Clinical sessions endpoint returning 500 error▋
else
    test_warn "Clinical sessions endpoint returned: $SESSIONS_CODE"
fi
echo ""

# Test 4: Frontend Loading
echo "4️⃣  Testing Frontend..."
FRONT probing=$(curl -s -w "\n%{http_code}" "$BASE_URL/" | tail -n1)
if [ "$FRONTEND_CODE" = "200" ] || [ "$FRONTEND_CODE" = "304" ]; then
    test_pass "Frontend loads successfully (HTTP $FRONTEND_CODE)"
else
    test_warn "Frontend returned HTTP $FRONTEND_CODE"
fi
echo ""

# Test 5: Critical API Routes Exist
echo "5️⃣  Testing API Route Availability..."
ROUTES=(
    "/api/patients"
    "/api/clinical-sessions"
    "/api/health"
)

for route in "${ROUTES[@]}"; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$route" | tail -n1)
    if [ "$RESPONSE" != "404" ] && [ "$RESPONSE" != "000" ]; then
        test_pass "Route $route responds (HTTP $RESPONSE)"
    else
        test_fail "Route $route not available (HTTP $RESPONSE)"
    fi
done
echo ""

# Summary
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
    echo ""
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    exit 0
fi

