# Render Integration Guide

This guide covers the integration between your application and Render for automated deployments and production log access.

## 1. Automated Deployments on PR Merge

### Setup

1. **Get your Render Deploy Hook URL**:
   - Go to your Render Dashboard: https://dashboard.render.com
   - Select your service (loma-platform)
   - Go to Settings → Deploy Hook
   - Copy the Deploy Hook URL

2. **Add GitHub Secret**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: Paste the Deploy Hook URL from Render

3. **The workflow is now active**:
   - The workflow file `.github/workflows/render-deploy.yml` will automatically trigger deployments when:
     - PRs are merged to `main` branch
     - Direct pushes are made to `main` branch
   - You can also manually trigger deployments via GitHub Actions UI

### How It Works

When a PR is merged to main:

1. GitHub Actions workflow runs
2. Fetches commit information (SHA, message, author)
3. Triggers Render deployment via Deploy Hook
4. Waits for deployment to initialize
5. Reports success/failure

### Manual Deployment

You can manually trigger a deployment:

```bash
# Via GitHub UI: Actions → Deploy to Render on PR Merge → Run workflow

# Or trigger via Render Dashboard
# Dashboard → Service → Manual Deploy
```

## 2. Production Log Access in Cursor

### Setup Render MCP

The Render MCP is already configured in your project. To use it:

1. **Authenticate Render MCP**:
   - Get your Render API key from: https://dashboard.render.com/u/settings/api-keys
   - Configure it in your Cursor MCP settings

2. **Set Service ID**:
   ```bash
   # Add to your .env file
   RENDER_SERVICE_ID=your-service-id-here
   ```

   To find your service ID:
   - Go to Render Dashboard
   - Select your service
   - The ID is in the URL: `https://dashboard.render.com/web/srv-XXXXX`

### Using Log Access in Cursor

You can now ask Cursor to check production logs directly. Examples:

**View Recent Logs**:
```
Show me the production logs from the last hour
```

**Find Errors**:
```
Show me error logs from production in the last 24 hours
```

**Search for Issues**:
```
Search production logs for "database connection" errors
```

**Check Specific HTTP Errors**:
```
Show me all 500 errors from the last 6 hours
```

**Analyze Request Logs**:
```
Show me the recent API request logs with response times
```

### Render MCP Tools Available

The following Render MCP tools are available for debugging:

- **`mcp_Render_list_logs`**: Fetch logs with advanced filtering
  - Filter by: time range, log level, text search, HTTP status, log type
  - Supports pagination for large result sets

- **`mcp_Render_list_log_label_values`**: Discover available filter values
  - Find what hosts, methods, status codes are in your logs

- **`mcp_Render_get_service`**: Get service details and status

- **`mcp_Render_get_metrics`**: Get performance metrics
  - CPU usage, memory usage, request counts, response times

- **`mcp_Render_list_deploys`**: View deployment history

- **`mcp_Render_get_deploy`**: Get specific deployment details

### Helper Script

A helper script is available for reference:

```bash
# Show usage
tsx scripts/render/check-logs.ts --help

# Get last hour of error logs
tsx scripts/render/check-logs.ts --level error --time 60

# Search for specific text
tsx scripts/render/check-logs.ts --search "database connection"

# Get 500 errors from last 24 hours
tsx scripts/render/check-logs.ts --status 500 --time 1440
```

**Note**: The script is primarily for documentation purposes. In Cursor, just ask naturally and the AI will use the Render MCP tools directly.

## 3. Workflow Integration

### Deployment Workflow

```
PR Created → Tests Run → PR Approved → PR Merged to main
                                            ↓
                                    GitHub Actions Triggered
                                            ↓
                                    Render Deploy Hook Called
                                            ↓
                                    Render Builds & Deploys
                                            ↓
                                    Health Check Passes
                                            ↓
                                    🚀 Live on Production
```

### Debugging Workflow

```
Issue Reported → Ask Cursor to Check Logs → Render MCP Fetches Logs
                                                     ↓
                            AI Analyzes Logs & Identifies Issue
                                                     ↓
                                    Fix Applied → Test → Deploy
```

## 4. Best Practices

### Deployment

1. **Always test locally first**: Run `npm run build` and `npm start` locally
2. **Check health endpoint**: Ensure `/api/health` responds correctly
3. **Monitor first deployment**: Watch logs during first deploy after setup
4. **Review build logs**: If deployment fails, check build logs in Render Dashboard

### Log Analysis

1. **Start broad, then narrow**: Begin with recent logs, then filter by error level
2. **Use time ranges wisely**: Last hour for recent issues, 24h for patterns
3. **Search strategically**: Look for error messages, stack traces, specific endpoints
4. **Correlate with metrics**: Check CPU/memory metrics when investigating performance issues

### Security

1. **Never commit secrets**: Use GitHub Secrets for `RENDER_DEPLOY_HOOK_URL`
2. **Rotate API keys**: Regularly rotate your Render API key
3. **Limit access**: Only give deploy hook URL to trusted CI/CD systems
4. **Monitor deployments**: Set up Slack/Discord notifications for deploys

## 5. Troubleshooting

### Deployment Not Triggering

**Check**:
- [ ] GitHub Secret `RENDER_DEPLOY_HOOK_URL` is set correctly
- [ ] Workflow file exists at `.github/workflows/render-deploy.yml`
- [ ] Push was to `main` branch
- [ ] GitHub Actions are enabled for repository

**Fix**:
```bash
# Verify workflow exists
ls -la .github/workflows/render-deploy.yml

# Check GitHub Actions tab for error details
# GitHub → Actions → Deploy to Render on PR Merge
```

### Cannot Access Logs in Cursor

**Check**:
- [ ] Render MCP is authenticated in Cursor
- [ ] Service ID is correct in `.env` file
- [ ] API key has correct permissions
- [ ] Workspace is selected in Render MCP

**Fix**:
```bash
# Test Render MCP connection
# In Cursor: "List my Render services"

# Verify service ID
# Render Dashboard → Service → URL contains srv-XXXXX
```

### Logs Not Showing Recent Data

**Check**:
- [ ] Time range is correct (UTC timezone)
- [ ] Service is actually running (not crashed)
- [ ] Log filters aren't too restrictive

**Fix**:
```
# In Cursor: "Show me ALL logs from the last 5 minutes"
# This removes filters and gives you everything
```

## 6. Environment Variables Reference

```bash
# Required for automated deployments
RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-xxxxx?key=xxxxx

# Required for log access in Cursor
RENDER_SERVICE_ID=srv-xxxxx

# Render API Key (configured in Cursor MCP settings)
RENDER_API_KEY=rnd_xxxxx
```

## 7. Next Steps

After setup:

1. ✅ Merge a test PR to verify automated deployment works
2. ✅ Ask Cursor to check production logs to verify MCP connection
3. ✅ Review deployment notifications in GitHub Actions
4. ✅ Set up Render → Slack integration (optional)
5. ✅ Configure alerting for deployment failures (optional)

## 8. Additional Resources

- [Render Deploy Hooks Documentation](https://render.com/docs/deploy-hooks)
- [Render API Documentation](https://api-docs.render.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render MCP Documentation](https://github.com/render-examples/render-mcp)

## Support

If you encounter issues:

1. Check Render Dashboard for deployment status
2. Review GitHub Actions logs for CI/CD issues
3. Ask Cursor to check production logs for application issues
4. Contact Render Support: https://render.com/support

