# AI Development Protocol - Quick Reference

## 🎯 The Complete Workflow

```
1. Task → 2. Code & Test → 3. Branch → 4. PR → 5. CI Pass → 6. Merge → 7. Deploy → 8. Verify
```

## 📋 Checklist for Every Task

```
□ Understand requirements
□ Create branch (feat-*, fix-*, etc.)
□ Write code + tests
□ Run tests locally (all pass)
□ Run linter (no errors)
□ If PHI involved: Run HIPAA tests (npm run test:hipaa)
□ Commit with clear message
□ Push branch
□ Create PR with description
□ Monitor CI checks (including HIPAA compliance)
□ Fix any failures
□ Merge when all green (HIPAA check must pass)
□ Verify deployment
□ Confirm production works
```

## ⚡ Quick Commands

### Start New Feature
```bash
git checkout -b feat-description
# ... make changes ...
npm test
npm run lint
git add .
git commit -m "feat: description"
git push -u origin feat-description
gh pr create --title "[Feature] Description" --body "Details here"
```

### Check Status
```bash
gh pr status          # PR status
gh pr checks          # CI checks
gh run list --limit 5 # Recent workflows
```

### HIPAA Compliance (if PHI involved)
```bash
npm run test:hipaa          # Run HIPAA tests
npm run test:hipaa:coverage # Check coverage
```

### Merge & Deploy
```bash
gh pr merge --squash --delete-branch
gh run watch  # Watch deployment
```

## 🔑 Required Permissions

- `git_write` - For git operations
- `network` - For GitHub/Render API

## 🔗 Key Links

- **Repo:** https://github.com/Loma-Health/loma-org
- **Render:** https://dashboard.render.com/web/srv-d3e6dovdiees73fqml80
- **Full Protocol:** [AI_DEVELOPMENT_PROTOCOL.md](./AI_DEVELOPMENT_PROTOCOL.md)

## ⚠️ Remember

- ❌ Never commit to main directly
- ✅ Always write tests
- ✅ Always run tests before PR
- ✅ **If PHI involved: Run HIPAA tests** (`npm run test:hipaa`)
- ✅ Always verify deployment
- ❌ Never commit secrets
- ❌ Never expose PHI (use `_encrypted` suffix)
- ✅ Always use descriptive messages

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Tests fail | Fix code, re-run tests, push fix |
| CI fails | Check logs, fix issue, push update |
| HIPAA check fails | Run `npm run test:hipaa`, fix PHI encryption/logging |
| Merge conflicts | Pull main, resolve, test, commit |
| Deploy fails | Check Render logs, fix, push new commit |
| Permission denied | Request `git_write` or `network` permission |

---

**See full documentation:** [AI_DEVELOPMENT_PROTOCOL.md](./AI_DEVELOPMENT_PROTOCOL.md)

