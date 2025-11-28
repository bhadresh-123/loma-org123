#!/bin/bash

# HIPAA Schema Refactor - Post-Deployment Monitoring Script
# This script monitors the health of the HIPAA schema refactor deployment

echo "🔍 HIPAA Schema Refactor - Post-Deployment Monitoring"
echo "====================================================="

# Check database connectivity
echo "📊 Database Connectivity Check..."
if psql $DATABASE_URL -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Check schema activation
echo "🔧 Schema Activation Check..."
if [ "$USE_HIPAA_SCHEMA" = "true" ]; then
    echo "✅ USE_HIPAA_SCHEMA=true is set"
else
    echo "⚠️  USE_HIPAA_SCHEMA not set to true"
fi

# Check new tables exist
echo "📋 New Tables Check..."
ORGANIZATIONS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM organizations;" 2>/dev/null || echo "0")
PATIENTS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM patients;" 2>/dev/null || echo "0")
SESSIONS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM clinical_sessions;" 2>/dev/null || echo "0")
MEMBERSHIPS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM organization_memberships;" 2>/dev/null || echo "0")

echo "  Organizations: $ORGANIZATIONS"
echo "  Patients: $PATIENTS"
echo "  Clinical Sessions: $SESSIONS"
echo "  Organization Memberships: $MEMBERSHIPS"

if [ "$ORGANIZATIONS" -gt 0 ] && [ "$PATIENTS" -gt 0 ] && [ "$SESSIONS" -gt 0 ]; then
    echo "✅ New tables populated with data"
else
    echo "❌ New tables not properly populated"
fi

# Check backup tables exist
echo "📦 Backup Tables Check..."
BACKUP_CLIENTS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM clients_hipaa_old;" 2>/dev/null || echo "0")
BACKUP_SESSIONS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM sessions_hipaa_old;" 2>/dev/null || echo "0")

echo "  Backup Clients: $BACKUP_CLIENTS"
echo "  Backup Sessions: $BACKUP_SESSIONS"

if [ "$BACKUP_CLIENTS" -gt 0 ] && [ "$BACKUP_SESSIONS" -gt 0 ]; then
    echo "✅ Backup tables contain original data"
else
    echo "⚠️  Backup tables may not contain original data"
fi

# Test API endpoints
echo "🌐 API Endpoints Check..."
BASE_URL="http://localhost:3000"

if command -v curl >/dev/null 2>&1; then
    # Test organization endpoint
    if curl -f -s "$BASE_URL/api/organizations" >/dev/null 2>&1; then
        echo "✅ Organization API endpoint responding"
    else
        echo "❌ Organization API endpoint not responding"
    fi
    
    # Test patient endpoint
    if curl -f -s "$BASE_URL/api/patients" >/dev/null 2>&1; then
        echo "✅ Patient API endpoint responding"
    else
        echo "❌ Patient API endpoint not responding"
    fi
    
    # Test therapist endpoint
    if curl -f -s "$BASE_URL/api/therapists" >/dev/null 2>&1; then
        echo "✅ Therapist API endpoint responding"
    else
        echo "❌ Therapist API endpoint not responding"
    fi
else
    echo "⚠️  curl not available - skipping API tests"
fi

# Check application logs for errors
echo "📝 Application Logs Check..."
if [ -f "logs/app.log" ]; then
    HIPAA_ERRORS=$(grep -i "hipaa\|schema\|encryption" logs/app.log | grep -i "error" | wc -l)
    echo "  HIPAA-related errors in logs: $HIPAA_ERRORS"
    
    if [ "$HIPAA_ERRORS" -eq 0 ]; then
        echo "✅ No HIPAA-related errors in logs"
    else
        echo "⚠️  $HIPAA_ERRORS HIPAA-related errors found in logs"
    fi
else
    echo "⚠️  Application logs not found"
fi

# Performance check
echo "⚡ Performance Check..."
if command -v psql >/dev/null 2>&1; then
    QUERY_TIME=$(psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT COUNT(*) FROM patients;" 2>/dev/null | grep "Execution Time" | awk '{print $3}' || echo "N/A")
    echo "  Patient query execution time: $QUERY_TIME ms"
fi

echo ""
echo "📊 MONITORING SUMMARY"
echo "===================="
echo ""

# Overall health check
HEALTH_SCORE=0
TOTAL_CHECKS=6

if [ "$ORGANIZATIONS" -gt 0 ] && [ "$PATIENTS" -gt 0 ] && [ "$SESSIONS" -gt 0 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
fi

if [ "$BACKUP_CLIENTS" -gt 0 ] && [ "$BACKUP_SESSIONS" -gt 0 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
fi

if [ "$USE_HIPAA_SCHEMA" = "true" ]; then
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
fi

# API checks (if curl is available)
if command -v curl >/dev/null 2>&1; then
    if curl -f -s "$BASE_URL/api/organizations" >/dev/null 2>&1; then
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
    fi
    if curl -f -s "$BASE_URL/api/patients" >/dev/null 2>&1; then
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
    fi
    if curl -f -s "$BASE_URL/api/therapists" >/dev/null 2>&1; then
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
    fi
fi

HEALTH_PERCENTAGE=$((HEALTH_SCORE * 100 / TOTAL_CHECKS))

echo "Overall Health Score: $HEALTH_SCORE/$TOTAL_CHECKS ($HEALTH_PERCENTAGE%)"

if [ "$HEALTH_PERCENTAGE" -ge 80 ]; then
    echo "🎉 DEPLOYMENT HEALTHY!"
elif [ "$HEALTH_PERCENTAGE" -ge 60 ]; then
    echo "⚠️  DEPLOYMENT NEEDS ATTENTION"
else
    echo "❌ DEPLOYMENT UNHEALTHY - INVESTIGATE IMMEDIATELY"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Monitor application performance"
echo "2. Check user authentication flows"
echo "3. Verify PHI encryption is working"
echo "4. Test organization management features"
echo "5. Monitor error rates and response times"

echo ""
echo "🔄 If issues arise:"
echo "1. Check application logs for errors"
echo "2. Verify environment variables are set"
echo "3. Test database connectivity"
echo "4. Use rollback procedure if necessary"

echo ""
echo "✅ Monitoring complete!"
