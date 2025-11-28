#!/bin/bash

# Verify AI Development Protocol Setup
# This script checks that all required tools and configurations are in place

set -e

echo "🔍 Verifying AI Development Protocol Setup..."
echo ""

ERRORS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ERRORS=$((ERRORS + 1))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Check Git
echo "📦 Checking Git..."
if command -v git &> /dev/null; then
  check_pass "Git is installed ($(git --version))"
else
  check_fail "Git is not installed"
fi

# Check Git config
if git config user.name &> /dev/null && git config user.email &> /dev/null; then
  check_pass "Git user configured ($(git config user.name) <$(git config user.email)>)"
else
  check_fail "Git user not configured (run: git config --global user.name/email)"
fi

# Check GitHub CLI
echo ""
echo "🐙 Checking GitHub CLI..."
if command -v gh &> /dev/null; then
  check_pass "GitHub CLI is installed ($(gh --version | head -n1))"
  
  # Check authentication
  if gh auth status &> /dev/null; then
    check_pass "GitHub CLI is authenticated ($(gh api user --jq .login 2>/dev/null || echo 'unknown'))"
  else
    check_fail "GitHub CLI is not authenticated (run: gh auth login)"
  fi
else
  check_fail "GitHub CLI is not installed (run: brew install gh)"
fi

# Check remote
echo ""
echo "🔗 Checking Git Remote..."
if git remote get-url origin &> /dev/null; then
  check_pass "Git remote configured ($(git remote get-url origin))"
else
  check_fail "Git remote not configured"
fi

# Check if we're in a git repo
if git rev-parse --git-dir &> /dev/null; then
  check_pass "Inside a Git repository"
else
  check_fail "Not inside a Git repository"
fi

# Check branch
current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
if [ "$current_branch" != "unknown" ]; then
  if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
    check_warn "Currently on main branch (should create feature branch for work)"
  else
    check_pass "On feature branch: $current_branch"
  fi
fi

# Check GitHub Secret
echo ""
echo "🔐 Checking GitHub Secrets..."
if gh secret list 2>/dev/null | grep -q "RENDER_DEPLOY_HOOK_URL"; then
  check_pass "RENDER_DEPLOY_HOOK_URL secret is configured"
else
  check_warn "RENDER_DEPLOY_HOOK_URL secret not found (deployment may not work)"
fi

# Check GitHub Actions workflow
echo ""
echo "⚙️  Checking GitHub Actions..."
if [ -f ".github/workflows/render-deploy.yml" ]; then
  check_pass "Render deploy workflow exists"
else
  check_fail "Render deploy workflow not found (.github/workflows/render-deploy.yml)"
fi

# Check protocol documentation
echo ""
echo "📚 Checking Protocol Documentation..."
if [ -f ".cursorrules" ]; then
  check_pass ".cursorrules file exists"
else
  check_fail ".cursorrules file not found"
fi

if [ -f "docs/AI_DEVELOPMENT_PROTOCOL.md" ]; then
  check_pass "AI Development Protocol documentation exists"
else
  check_fail "AI Development Protocol documentation not found"
fi

# Check Render config
echo ""
echo "🚀 Checking Render Configuration..."
if [ -f "render.yaml" ]; then
  check_pass "render.yaml configuration exists"
else
  check_warn "render.yaml not found"
fi

# Check if node/npm are available
echo ""
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
  check_pass "Node.js is installed ($(node --version))"
else
  check_fail "Node.js is not installed"
fi

if command -v npm &> /dev/null; then
  check_pass "npm is installed ($(npm --version))"
else
  check_fail "npm is not installed"
fi

# Check if dependencies are installed
if [ -d "node_modules" ]; then
  check_pass "Node dependencies installed"
else
  check_warn "Node dependencies not installed (run: npm install)"
fi

# Check HIPAA compliance setup
echo ""
echo "🏥 Checking HIPAA Compliance Setup..."
if [ -f ".github/workflows/hipaa-compliance.yml" ]; then
  check_pass "HIPAA compliance workflow exists"
else
  check_fail "HIPAA compliance workflow not found (.github/workflows/hipaa-compliance.yml)"
fi

if [ -f "server/services/HIPAAService.ts" ]; then
  check_pass "HIPAA Service exists"
else
  check_warn "HIPAA Service not found (may be defined elsewhere or in tests)"
fi

if [ -f "vitest.hipaa.config.ts" ]; then
  check_pass "HIPAA test configuration exists"
else
  check_fail "HIPAA test configuration not found (vitest.hipaa.config.ts)"
fi

if [ -f "server/tests/e2e/hipaa-compliance.hipaa.test.ts" ]; then
  check_pass "HIPAA compliance tests exist"
else
  check_fail "HIPAA compliance tests not found"
fi

# Check if PHI_ENCRYPTION_KEY secret is set in GitHub
if gh secret list 2>/dev/null | grep -q "PHI_ENCRYPTION_KEY"; then
  check_pass "PHI_ENCRYPTION_KEY secret is configured"
else
  check_warn "PHI_ENCRYPTION_KEY secret not found in GitHub (required for HIPAA tests)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Ready to use AI Development Protocol.${NC}"
  echo ""
  echo "📖 Read the protocol: docs/AI_DEVELOPMENT_PROTOCOL.md"
  echo "⚡ Quick reference: docs/AI_PROTOCOL_QUICK_REFERENCE.md"
  echo "🏥 HIPAA compliance: All checks configured"
  exit 0
else
  echo -e "${RED}✗ $ERRORS error(s) found. Please fix the issues above.${NC}"
  echo ""
  echo "📖 See setup guide: docs/AI_DEVELOPMENT_PROTOCOL.md"
  exit 1
fi

