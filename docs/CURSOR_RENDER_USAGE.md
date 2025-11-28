# Using Render Integration in Cursor

This is a quick reference guide for using the Render integration directly in Cursor.

## Setup Checklist

### 1. GitHub Actions (Automated Deployments)
- [ ] Get Render Deploy Hook URL from dashboard
- [ ] Add `RENDER_DEPLOY_HOOK_URL` to GitHub Secrets
- [ ] Verify workflow file exists: `.github/workflows/render-deploy.yml`
- [ ] Test by merging a PR to main

### 2. Render MCP (Log Access in Cursor)
- [ ] Select Render workspace in MCP
- [ ] Add `RENDER_SERVICE_ID` to your .env file
- [ ] Test by asking: "Show me Render services"

## Using Render in Cursor Chat

Once the Render MCP is authenticated, you can interact with your production environment directly through natural language:

### View Logs

**Recent logs**:
```
Show me the production logs from the last hour
```

**Error logs only**:
```
Show me error logs from the last 24 hours
```

**Search for specific issues**:
```
Search production logs for "database connection" errors
```

**HTTP errors**:
```
Show me all 500 errors from the last 6 hours
```

**Request logs**:
```
Show me the recent API request logs
```

### Check Service Status

```
What's the status of my Render service?
```

```
Show me the current deployment status
```

### View Metrics

```
Show me CPU and memory usage for the last hour
```

```
What are the response times for my API?
```

```
Show me the request count metrics
```

### Deployment History

```
Show me recent deployments
```

```
What was the last deployment status?
```

## Common Debugging Workflows

### 1. User Reports Error

```
User: "I'm getting a 500 error when trying to log in"

You: Show me all 500 errors from the last hour with path="/api/auth/login"
```

The AI will use `mcp_Render_list_logs` with appropriate filters.

### 2. Performance Issues

```
You: Show me response time metrics and CPU usage for the last 2 hours
```

The AI will use `mcp_Render_get_metrics` to pull performance data.

### 3. After Deployment Issues

```
You: Show me the latest deployment details and any errors since it went live
```

The AI will use `mcp_Render_list_deploys` and `mcp_Render_list_logs`.

### 4. Database Connection Issues

```
You: Search production logs for "database" or "connection" errors in the last 30 minutes
```

The AI will filter logs by text search and time range.

### 5. Monitoring Specific Endpoint

```
You: Show me all requests to /api/providers/verify-credentials with status codes 400-499
```

The AI will filter by path and status code range.

## Available Render MCP Tools

The AI has access to these tools when you ask questions:

| Tool | Purpose |
|------|---------|
| `mcp_Render_list_services` | List all your Render services |
| `mcp_Render_get_service` | Get details about a specific service |
| `mcp_Render_list_logs` | Fetch logs with advanced filtering |
| `mcp_Render_list_log_label_values` | Discover available log filter values |
| `mcp_Render_get_metrics` | Get CPU, memory, request metrics |
| `mcp_Render_list_deploys` | List deployment history |
| `mcp_Render_get_deploy` | Get specific deployment details |
| `mcp_Render_get_connection_string` | Get database connection strings |

## Advanced Log Filtering

The AI can filter logs by:

- **Time range**: Last N minutes/hours
- **Log level**: error, warn, info, debug
- **Text search**: Any string (supports wildcards and regex)
- **HTTP method**: GET, POST, PUT, DELETE, etc.
- **HTTP status**: 200, 404, 500, etc.
- **Path**: Specific API endpoints
- **Host**: Request host/domain
- **Instance**: Specific server instance
- **Type**: app, request, build logs

### Example Complex Query

```
Show me all POST requests to /api/* endpoints that returned 500 errors 
in the last 2 hours, and search for "database" in the logs
```

The AI will translate this to:
```json
{
  "resource": ["srv-xxxxx"],
  "startTime": "2025-11-06T10:00:00Z",
  "endTime": "2025-11-06T12:00:00Z",
  "method": ["POST"],
  "path": ["/api/*"],
  "statusCode": ["500"],
  "text": ["database"],
  "limit": 100
}
```

## Tips for Best Results

1. **Be specific about time ranges**: "last 30 minutes" vs "last 24 hours"
2. **Start broad, then narrow**: First get all errors, then filter by specific paths
3. **Mention what you're debugging**: Helps AI choose relevant filters
4. **Ask for context**: "Show logs before and after timestamp X"
5. **Combine with metrics**: "Show me logs and CPU usage during the spike"

## Example Debugging Session

```
You: We had a deployment 30 minutes ago and users are reporting slowness

AI: [Fetches deployment details and recent metrics]
    "The deployment completed successfully at 11:30 AM. I can see CPU usage 
    spiked to 95% starting at 11:35 AM. Let me check the logs..."

You: Show me error logs since the deployment

AI: [Fetches error logs from 11:30 AM onwards]
    "I found 23 errors related to database connection timeouts. They started 
    appearing 5 minutes after the deployment..."

You: What's the pattern? Which endpoints are affected?

AI: [Analyzes logs and groups by endpoint]
    "The errors are concentrated in 3 endpoints:
    - /api/providers/verify-credentials (15 errors)
    - /api/clinical/sessions (5 errors)  
    - /api/users/profile (3 errors)
    
    All are timing out when connecting to the database..."

You: Show me the database connection pool metrics

AI: [Fetches relevant metrics]
    "The connection pool is showing 95% utilization. It looks like the pool 
    size might need to be increased, or there's a connection leak..."
```

## Troubleshooting

### "No workspace selected"

Ask: "List my Render workspaces" and then "Select workspace [ID]"

### "Cannot find service"

Check your `RENDER_SERVICE_ID` in .env file and ask: "List my Render services"

### "Logs are empty"

Try:
1. Expand time range: "Show me logs from last 4 hours"
2. Remove filters: "Show me ALL logs from last 30 minutes"
3. Check service is running: "What's my service status?"

### "Rate limited"

The Render API has rate limits. If you hit them, wait a minute and try again.

## Security Notes

- Render MCP uses your API key configured in Cursor settings
- Never share your API key or deploy hook URL
- Logs may contain sensitive data - be careful when sharing screenshots
- Consider using log scrubbing for PII/PHI data in production

## Quick Commands

```bash
# Check if deploy hook is set (in terminal)
gh secret list | grep RENDER_DEPLOY_HOOK_URL

# Get service ID from Render
# Dashboard → Service → URL shows: srv-XXXXX

# Test deploy hook manually
curl -X POST "$RENDER_DEPLOY_HOOK_URL"

# View local env
cat .env | grep RENDER_SERVICE_ID
```

## Next Steps

After setting everything up:

1. ✅ Test automated deployment by merging a PR
2. ✅ Ask Cursor to show you recent logs
3. ✅ Bookmark this guide for quick reference
4. ✅ Set up monitoring/alerting in Render dashboard (optional)

## Resources

- [Full Integration Guide](./RENDER_INTEGRATION.md)
- [Render Dashboard](https://dashboard.render.com)
- [GitHub Actions](https://github.com/YOUR-ORG/YOUR-REPO/actions)

