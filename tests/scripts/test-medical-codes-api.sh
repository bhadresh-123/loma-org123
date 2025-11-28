#!/bin/bash
# Test Medical Codes APIs
# Run this after starting the dev server

echo "Testing Medical Codes & Assessment Categories APIs"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:5000"

echo "1. Testing GET /api/medical-codes/cpt"
echo "   (Should return 15 CPT codes)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medical-codes/cpt")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | jq '. | length')
    echo -e "   ${GREEN}✓${NC} Status: $HTTP_CODE"
    echo -e "   ${GREEN}✓${NC} Count: $COUNT CPT codes"
    echo "   Sample codes:"
    echo "$BODY" | jq -r '.[0:3] | .[] | "     - \(.code): \(.description)"'
else
    echo -e "   ${RED}✗${NC} Status: $HTTP_CODE"
    echo "   Error: $BODY"
fi

echo ""
echo "2. Testing GET /api/assessments/categories"
echo "   (Should return 12 assessment categories)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/assessments/categories")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | jq '. | length')
    echo -e "   ${GREEN}✓${NC} Status: $HTTP_CODE"
    echo -e "   ${GREEN}✓${NC} Count: $COUNT categories"
    echo "   Sample categories:"
    echo "$BODY" | jq -r '.[0:3] | .[] | "     - \(.)"'
else
    echo -e "   ${RED}✗${NC} Status: $HTTP_CODE"
    echo "   Error: $BODY"
fi

echo ""
echo "3. Testing GET /api/medical-codes/cpt/90834"
echo "   (Should return specific CPT code)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medical-codes/cpt/90834")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✓${NC} Status: $HTTP_CODE"
    echo "   Code details:"
    echo "$BODY" | jq -r '"     Code: \(.code)\n     Description: \(.description)\n     Category: \(.category)\n     Duration: \(.duration) min"'
else
    echo -e "   ${RED}✗${NC} Status: $HTTP_CODE"
    echo "   Error: $BODY"
fi

echo ""
echo "=================================================="
echo "Testing complete!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5000 in your browser"
echo "2. Open browser console (F12)"
echo "3. Navigate to Calendar page"
echo "4. Click 'Add Event' button"
echo "5. Select 'Session' tab and choose an insurance client"
echo "6. Verify CPT codes dropdown is populated"
echo "7. Verify NO 404 errors in console"

