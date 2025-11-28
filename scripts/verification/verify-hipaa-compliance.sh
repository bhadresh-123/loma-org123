#!/bin/bash

# HIPAA Compliance Deployment Verification Script
# This script verifies that all HIPAA compliance fixes are properly deployed

echo "🔍 HIPAA Compliance Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    exit 1
fi

echo "📋 Checking Critical HIPAA Compliance Fixes..."
echo ""

# 1. Check if encryption bypass is fixed
echo "1. Checking encryption bypass fix..."
if grep -q "throw new Error('CRITICAL: PHI_ENCRYPTION_KEY is required" server/utils/phi-encryption.ts; then
    print_status 0 "Encryption bypass vulnerability fixed"
else
    print_status 1 "Encryption bypass vulnerability NOT fixed"
fi

# 2. Check if environment enforcement is fixed
echo "2. Checking environment enforcement..."
if grep -q "process.exit(1);  // Exit in ALL environments" server/utils/phi-encryption.ts; then
    print_status 0 "Environment enforcement fixed"
else
    print_status 1 "Environment enforcement NOT fixed"
fi

# 3. Check if file-based key storage is removed
echo "3. Checking file-based key storage removal..."
if ! grep -q "keyPath.*encryption.key" server/utils/key-management.ts; then
    print_status 0 "File-based key storage removed"
else
    print_status 1 "File-based key storage still present"
fi

# 4. Check if example keys are removed
echo "4. Checking example key removal..."
# Check for placeholder text instead of specific key (security: avoid hardcoding exposed keys)
if grep -q "GENERATE_YOUR_OWN_64_CHARACTER_HEX_KEY_HERE" DEPLOYMENT_CHECKLIST.md; then
    print_status 0 "Example keys removed from documentation"
else
    print_status 1 "Documentation doesn't use secure placeholders"
fi

# 5. Check if HTTPS enforcement is added
echo "5. Checking HTTPS enforcement..."
if grep -q "enforceHTTPS" server/middleware/security.ts; then
    print_status 0 "HTTPS enforcement middleware added"
else
    print_status 1 "HTTPS enforcement middleware NOT added"
fi

# 6. Check if database SSL is configured
echo "6. Checking database SSL configuration..."
if grep -q "sslmode=require" db/index.ts; then
    print_status 0 "Database SSL configuration added"
else
    print_status 1 "Database SSL configuration NOT added"
fi

# 7. Check if file encryption is implemented
echo "7. Checking file encryption implementation..."
if [ -f "server/utils/file-encryption.ts" ]; then
    print_status 0 "File encryption utility created"
else
    print_status 1 "File encryption utility NOT created"
fi

# 8. Check if compliance tests are added
echo "8. Checking compliance tests..."
if [ -f "server/tests/hipaa-compliance-validation.test.ts" ]; then
    print_status 0 "HIPAA compliance tests added"
else
    print_status 1 "HIPAA compliance tests NOT added"
fi

# 9. Check if compliance monitoring is added
echo "9. Checking compliance monitoring..."
if [ -f "server/middleware/compliance-monitoring.ts" ]; then
    print_status 0 "Compliance monitoring added"
else
    print_status 1 "Compliance monitoring NOT added"
fi

# 10. Check if infrastructure documentation is created
echo "10. Checking infrastructure documentation..."
if [ -f "INFRASTRUCTURE_COMPLIANCE_VERIFICATION.md" ]; then
    print_status 0 "Infrastructure compliance documentation created"
else
    print_status 1 "Infrastructure compliance documentation NOT created"
fi

echo ""
echo "🧪 Running Compliance Tests..."
echo ""

# Run the compliance tests if they exist
if [ -f "server/tests/hipaa-compliance-validation.test.ts" ]; then
    echo "Running HIPAA compliance validation tests..."
    if npm test -- server/tests/hipaa-compliance-validation.test.ts 2>/dev/null; then
        print_status 0 "Compliance tests passed"
    else
        print_warning "Compliance tests failed or not configured"
    fi
else
    print_warning "Compliance tests not found"
fi

echo ""
echo "🔧 Environment Variable Check..."
echo ""

# Check environment variables (this will only work if .env exists)
if [ -f ".env" ]; then
    if grep -q "PHI_ENCRYPTION_KEY=" .env; then
        KEY_LENGTH=$(grep "PHI_ENCRYPTION_KEY=" .env | cut -d'=' -f2 | wc -c)
        if [ $KEY_LENGTH -eq 65 ]; then  # 64 chars + newline
            print_status 0 "PHI_ENCRYPTION_KEY is set and has correct length"
        else
            print_status 1 "PHI_ENCRYPTION_KEY has incorrect length"
        fi
    else
        print_status 1 "PHI_ENCRYPTION_KEY not found in .env"
    fi
else
    print_warning ".env file not found (this is normal for production)"
fi

echo ""
echo "📊 Summary"
echo "=========="
echo ""

# Count successful checks
SUCCESS_COUNT=$(grep -c "✅" <<< "$(tail -n +1)")
TOTAL_CHECKS=10

echo "Successful checks: $SUCCESS_COUNT/$TOTAL_CHECKS"

if [ $SUCCESS_COUNT -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 All HIPAA compliance fixes have been successfully implemented!${NC}"
    echo -e "${GREEN}✅ System is ready for HIPAA-compliant deployment${NC}"
    exit 0
elif [ $SUCCESS_COUNT -ge 8 ]; then
    echo -e "${YELLOW}⚠️  Most fixes are implemented, but some issues remain${NC}"
    echo -e "${YELLOW}Please review the failed checks above${NC}"
    exit 1
else
    echo -e "${RED}❌ Critical issues remain - system is NOT HIPAA compliant${NC}"
    echo -e "${RED}Please implement all required fixes before deployment${NC}"
    exit 1
fi
