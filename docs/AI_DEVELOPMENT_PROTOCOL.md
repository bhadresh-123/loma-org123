# AI-Assisted Development Protocol

This document establishes the standard protocol for AI-assisted development in the loma-org project.

## Overview

When working with Cursor AI or similar tools, follow this comprehensive workflow to ensure code quality, proper testing, and successful deployment.

## Complete Development Lifecycle

```
Task → Implementation → Testing → Branch → PR → CI/CD → Merge → Deploy → Verify
```

## Detailed Workflow

### Phase 1: Task Understanding & Planning

**What to do:**
1. Analyze the requirements thoroughly
2. Ask clarifying questions if anything is unclear
3. Break down complex tasks into subtasks
4. Create a todo list (for tasks with 3+ steps)

**AI Tool Usage:**
- `todo_write` - Create and manage task list
- `codebase_search` - Understand existing patterns
- `read_file` - Review relevant code

### Phase 2: Implementation

**What to do:**
1. Write clean, maintainable code
2. Follow existing code patterns and conventions
3. Add appropriate error handling
4. Include inline documentation for complex logic
5. Update type definitions as needed

**Code Standards:**
- TypeScript for type safety
- Follow ESLint/Prettier rules
- Keep functions focused and small
- Use descriptive variable and function names
- Prefer composition over inheritance

**AI Tool Usage:**
- `search_replace` or `write` - Make code changes
- `read_file` - Review context
- `grep` - Find existing patterns

### Phase 3: Testing

**What to do:**
1. Write appropriate tests:
   - Unit tests for business logic
   - Integration tests for APIs
   - E2E tests for critical flows
2. Run tests locally
3. Fix any failing tests
4. Test manually using browser tools if UI changes

**Test Coverage Requirements:**
- All new functions should have unit tests
- All new API endpoints should have integration tests
- Critical user flows should have E2E tests

**AI Tool Usage:**
- `run_terminal_cmd` - Run test suites
- `mcp_Browserbase_*` or `mcp_cursor-browser-extension_*` - Browser testing
- `read_lints` - Check for linter errors

### Phase 4: Git Workflow

**What to do:**
1. Create a feature branch with descriptive name
2. Stage and commit changes
3. Write clear commit messages
4. Push to GitHub

**Branch Naming:**
```
feat-<description>      # New features
fix-<description>       # Bug fixes
refactor-<description>  # Code refactoring
docs-<description>      # Documentation
test-<description>      # Test additions
chore-<description>     # Maintenance tasks
```

**Commit Message Format:**
```
type(scope): brief description

- Detailed change 1
- Detailed change 2
- Why these changes were needed

Closes #issue-number (if applicable)
```

**AI Tool Usage:**
- `run_terminal_cmd` with `git_write` permission:
  ```bash
  git checkout -b feat-new-feature
  git add .
  git commit -m "feat: add new feature"
  git push -u origin feat-new-feature
  ```

### Phase 5: Pull Request Creation

**What to do:**
1. Create PR using GitHub CLI
2. Write comprehensive PR description
3. Link related issues
4. Add labels and assign reviewers if needed

**PR Description Template:**
```markdown
## Description
Brief overview of what this PR does

## Changes
- Change 1
- Change 2
- Change 3

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Screenshots/Videos
(If UI changes)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
```

**AI Tool Usage:**
- `run_terminal_cmd` with `network` permission:
  ```bash
  gh pr create --title "[Feature] Add new feature" \
    --body "Description here" \
    --base main \
    --head feat-new-feature
  ```

### Phase 6: CI/CD Monitoring

**What to do:**
1. Monitor PR checks (tests, linting, type checking, HIPAA compliance)
2. If any checks fail:
   - Analyze the failure
   - Fix the issue
   - Push updates to the branch
   - Wait for checks to re-run
3. Repeat until all checks pass

**Common CI Checks:**
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests
- ✅ **HIPAA Compliance Tests** (automated on all PRs)
- ✅ ESLint
- ✅ TypeScript compilation
- ✅ Build success

**HIPAA Compliance Check:**
Every PR automatically runs a comprehensive HIPAA compliance validation:
- PHI encryption tests
- Audit logging verification
- PHI exposure scanning in code changes
- Encryption implementation validation
- Security headers check
- Coverage requirements (80% for HIPAA-related code)

The PR **cannot be merged** unless HIPAA compliance checks pass.

**AI Tool Usage:**
- `run_terminal_cmd` with `network` permission:
  ```bash
  gh pr checks
  gh pr view --web  # Open in browser to see details
  ```

### Phase 7: Merge

**What to do:**
1. Ensure all checks pass
2. Ensure PR is approved (if required)
3. Merge PR to main
4. Delete feature branch (optional)

**Merge Strategy:**
- Prefer "Squash and merge" for clean history
- Use "Rebase and merge" for important commits
- Never force push to main

**AI Tool Usage:**
- `run_terminal_cmd` with `network` permission:
  ```bash
  gh pr merge --squash --delete-branch
  ```

### Phase 8: Deployment Verification

**What to do:**
1. Verify GitHub Actions workflow triggers
2. Monitor Render deployment
3. Check deployment logs for errors
4. Verify feature works in production

**Render Deployment:**
- Service: loma-platform
- Service ID: srv-d3e6dovdiees73fqml80
- Auto-deploys on merge to main via GitHub Actions
- Workflow: `.github/workflows/render-deploy.yml`

**AI Tool Usage:**
- `run_terminal_cmd` with `network` permission:
  ```bash
  gh run list --limit 5
  gh run watch
  ```
- Check Render dashboard: https://dashboard.render.com/web/srv-d3e6dovdiees73fqml80

### Phase 9: Post-Deployment

**What to do:**
1. Verify the feature works in production
2. Monitor for any errors or issues
3. Update documentation if needed
4. Close related issues
5. Clean up old branches if needed

## Configuration

### Git Setup
```bash
User: Grant Thain
Email: grantthain@users.noreply.github.com
GitHub: grantthain
Repository: https://github.com/Loma-Health/loma-org.git
```

### Render Setup
```bash
Platform: Render
Service ID: srv-d3e6dovdiees73fqml80
Workspace ID: tea-d0h28vmuk2gs73ccvpm0
Service URL: https://loma-hipaa-dev.onrender.com
Dashboard: https://dashboard.render.com/web/srv-d3e6dovdiees73fqml80
```

### GitHub Actions
```bash
Workflow: .github/workflows/render-deploy.yml
Trigger: Push to main branch
Secret: RENDER_DEPLOY_HOOK_URL (configured)
```

## Required AI Permissions

When executing this workflow, the AI needs:

1. **`git_write`** - For git operations:
   - Creating branches
   - Committing changes
   - Pushing to remote

2. **`network`** - For API calls:
   - GitHub CLI operations (creating PRs, merging, checking status)
   - Render API calls (deployment verification)
   - Package installations if needed

## Quick Command Reference

### Git Commands
```bash
# Create and switch to branch
git checkout -b feat-new-feature

# Stage and commit
git add .
git commit -m "feat: description"

# Push branch
git push -u origin feat-new-feature

# Check status
git status
```

### GitHub CLI Commands
```bash
# Create PR
gh pr create --title "Title" --body "Description"

# Check PR status
gh pr status
gh pr checks

# View PR in browser
gh pr view --web

# Merge PR
gh pr merge --squash --delete-branch

# List recent workflow runs
gh run list --limit 5

# Watch workflow run
gh run watch
```

### Testing Commands
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Run linter
npm run lint

# Run type check
npm run type-check
```

## Error Handling

### If Tests Fail
1. Read the test output carefully
2. Fix the failing tests or code
3. Re-run tests locally
4. Commit and push fixes

### If CI Checks Fail
1. Check the GitHub Actions logs
2. Identify the specific failure
3. Fix the issue locally
4. Push the fix
5. Wait for re-run

### If Deployment Fails
1. Check Render deployment logs
2. Verify environment variables are set
3. Check for build errors
4. Fix issues and push new commit
5. Manual deploy from Render dashboard if needed

## Best Practices

### DO:
- ✅ Write tests for new code
- ✅ Run tests before creating PR
- ✅ Use descriptive commit messages
- ✅ Keep PRs focused and small
- ✅ Update documentation
- ✅ Clean up after yourself
- ✅ Verify deployments

### DON'T:
- ❌ Commit directly to main
- ❌ Merge with failing tests
- ❌ Skip testing
- ❌ Use vague commit messages
- ❌ Commit secrets or credentials
- ❌ Force push to shared branches
- ❌ Leave debugging code

## Troubleshooting

### "Permission denied" errors
- Ensure `git_write` permission is granted
- Check GitHub authentication: `gh auth status`

### "Network error" messages
- Ensure `network` permission is granted
- Check internet connectivity
- Verify API tokens are valid

### Merge conflicts
- Pull latest main: `git pull origin main`
- Resolve conflicts manually
- Test after resolving
- Commit resolution

### CI/CD not triggering
- Verify `.github/workflows/render-deploy.yml` exists
- Check GitHub Actions is enabled for repo
- Verify `RENDER_DEPLOY_HOOK_URL` secret is set

### HIPAA compliance check fails
- Run tests locally: `npm run test:hipaa`
- Check PHI fields use `_encrypted` suffix
- Verify audit logging with `HIPAAAuditService.logPHIAccess()`
- Review security-reports/HIPAA-Compliance-Checklist.md

## HIPAA Compliance Requirements

This project handles Protected Health Information (PHI) and must maintain HIPAA compliance at all times.

### Automatic Compliance Checks

Every PR automatically runs comprehensive HIPAA compliance validation via GitHub Actions:

**Workflow:** `.github/workflows/hipaa-compliance.yml`

**Checks Performed:**
1. **HIPAA Test Suite** - All HIPAA compliance tests must pass
2. **Code Coverage** - Minimum 80% coverage for HIPAA-related code
3. **PHI Exposure Scan** - Scans code changes for potential PHI leaks
4. **Encryption Validation** - Verifies PHI uses proper encryption patterns
5. **Audit Logging Check** - Ensures PHI access is logged
6. **Security Headers** - Validates security middleware configuration

### Developer Requirements

When working with PHI:

**Database Fields:**
```typescript
// ✅ CORRECT - Encrypted PHI
{
  email_encrypted: varchar('email_encrypted'),
  email_search_hash: varchar('email_search_hash'),
  phone_encrypted: varchar('phone_encrypted'),
  phone_search_hash: varchar('phone_search_hash'),
  ssn_encrypted: varchar('ssn_encrypted')
}

// ❌ WRONG - Unencrypted PHI
{
  email: varchar('email'),  // Exposed!
  phone: varchar('phone'),  // Exposed!
  ssn: varchar('ssn')       // Exposed!
}
```

**Encryption Service:**
```typescript
import { PHIEncryptionService } from '../services/HIPAAService';

// Encrypt before storing
const encrypted = PHIEncryptionService.encryptPHI(patientEmail);
const searchHash = PHIEncryptionService.createSearchHash(patientEmail);

// Decrypt when retrieving
const decrypted = PHIEncryptionService.decryptPHI(encrypted);
```

**Audit Logging:**
```typescript
import { HIPAAAuditService } from '../services/HIPAAService';

// Log all PHI access
await HIPAAAuditService.logPHIAccess({
  userId: req.user.id,
  action: 'PHI_ACCESS',
  resourceType: 'PATIENT',
  resourceId: patientId,
  fieldsAccessed: ['email', 'phone', 'ssn'],
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### Testing HIPAA Compliance Locally

**Run HIPAA tests:**
```bash
npm run test:hipaa
```

**Check coverage:**
```bash
npm run test:hipaa:coverage
```

**Environment variables required:**
```bash
PHI_ENCRYPTION_KEY=your-encryption-key
ENABLE_HIPAA_ROUTES=true
ENABLE_HIPAA_ENCRYPTION=true
ENABLE_HIPAA_AUDIT_LOGGING=true
```

### HIPAA Compliance Resources

- **HIPAA Service:** `server/services/HIPAAService.ts`
  - `PHIEncryptionService` - Encrypt/decrypt PHI
  - `HIPAAAuditService` - Log PHI access
  - `FeatureFlagService` - HIPAA feature flags

- **Test Suite:** `server/tests/e2e/hipaa-compliance.hipaa.test.ts`
  - Encryption/decryption tests
  - Audit logging tests
  - Search hash tests
  - Performance tests

- **Compliance Checklist:** `security-reports/HIPAA-Compliance-Checklist.md`
  - Full HIPAA compliance requirements
  - Encryption at rest verification
  - SSL/TLS requirements
  - Security headers

- **Configuration:** `vitest.hipaa.config.ts`
  - HIPAA test configuration
  - Coverage thresholds (80%)
  - Test file patterns

### PR Merge Requirements

A PR **cannot be merged** to `main` if:
- ❌ HIPAA compliance tests fail
- ❌ Code coverage below 80% for HIPAA code
- ❌ PHI exposure detected in changes
- ❌ Missing audit logging for PHI access
- ❌ Encryption patterns violated

The GitHub Actions workflow will:
- Generate a detailed HIPAA compliance report
- Comment on the PR with results
- Block merge if compliance fails
- Upload compliance report as artifact (90-day retention)

## Support

For questions or issues with this protocol:
1. Check this documentation first
2. Review related docs in `/docs` directory
3. Check GitHub Actions logs
4. Check Render dashboard logs
5. Ask the project maintainers

## Related Documentation

- [Render Integration Guide](./RENDER_INTEGRATION.md)
- [Cursor Render Usage](./CURSOR_RENDER_USAGE.md)
- [Render Setup Status](./RENDER_SETUP_STATUS.md)
- [Contributing Guidelines](../CONTRIBUTING.md) (if exists)

---

**Last Updated:** November 6, 2025  
**Maintained By:** Loma Health Development Team

