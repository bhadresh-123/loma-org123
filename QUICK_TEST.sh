#!/bin/bash
# Quick test script for Render Shell - runs without npm scripts

BASE_URL="${BASE_URL:-https://loma-hipaa-dev.onrender.com}"
API_URL="${BASE_URL}/api"

echo "🧪 Quick Post-Migration Test"
echo "============================"
echo ""

# Test 1: Health
echo "1️⃣ Health endpoint:"
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✅ Health OK"
    echo "$HEALTH" | grep -o '"database":{"connected":[^}]*}' || echo "   (checking database status...)"
else
    echo "❌ Health FAILED"
    echo "$HEALTH"
fi
echo ""

# Test 2: Patients endpoint (should be 401/403, not 500)
echo "2️⃣ Patients endpoint:"
PATIENTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/patients")
if [ "$PATIENTS_CODE" = "401" ] || [ "$PATIENTS_CODE" = "403" ]; then
    echo "✅ Returns auth error ($PATIENTS_CODE) - Good! Not 500"
elif [ "$PATIENTS_CODE" = "500" ]; then
    echo "❌ Still returning 500 error!"
    curl -s "$API_URL/patients" | head -c 200
    echo ""
else
    echo "⚠️  Status: $PATIENTS_CODE"
fi
echo ""

# Test 3: Clinical sessions endpoint
echo "3️⃣ Clinical sessions endpoint:"
SESSIONS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/clinical-sessions")
if [ "$SESSIONS_CODE" = "401" ] || [ "$SESSIONS_CODE" = "403" ]; then
    echo "✅ Returns auth error ($SESSIONS_CODE) - Good!"
elif [ "$SESSIONS_CODE" = "500" ]; then
    echo "❌ Returning 500 error!"
else
    echo "⚠️  Status: $SESSIONS_CODE"
fi
echo ""

# Test 4: Database check (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
    echo "4️⃣ Database schema check:"
    
    # Check patient_name_search_hash
    HASH_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='patients' AND column_name='patient_name_search_hash';" 2>/dev/null || echo "0")
    if [ "$HASH_EXISTS" -gt 0 ]; then
        echo "✅ patient_name_search_hash column exists"
    else
        echo "❌ patient_name_search_hash column missing!"
    fi
    
    # Check tasks table
    TASKS_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tasks';" 2>/dev/null || echo "0")
    if [ "$TASKS_EXISTS" -gt 0 ]; then
        echo "✅ tasks table exists"
    else
        echo "❌ tasks table missing!"
    fi
else
    echo "4️⃣ Skipping database checks (DATABASE_URL not set)"
fi

echo ""
echo "============================"
echo "✅ Quick test complete!"

