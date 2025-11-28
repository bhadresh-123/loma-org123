# Stripe Onboarding Redirect Troubleshooting Guide

## Issue: 503 Error After Stripe Onboarding

If you're seeing a 503 "Service Unavailable" error when Stripe redirects you back to the business banking page after onboarding, follow these steps:

## Quick Fixes

### 1. Check Render Deployment Status

The "This service has been suspended by its owner" message indicates a Render-specific issue:

1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Check if your `loma-org` service is:
   - ⚠️ **Suspended** - Reactivate it
   - ⚠️ **Failed to deploy** - Check build logs
   - ⚠️ **Sleeping** (free tier) - Wake it up by visiting the URL
   - ⚠️ **Out of credits** - Add payment method

### 2. Verify BASE_URL Environment Variable

The redirect URLs use the `BASE_URL` environment variable. Ensure it's set correctly:

1. Go to Render Dashboard → Your Service → Environment
2. Verify `BASE_URL` is set to: `https://loma-org.onrender.com`
3. If missing or incorrect, add/update it and redeploy

### 3. Check Stripe Dashboard

The URL showing `successreturn` instead of `success=true` suggests an old onboarding session:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to Connect → Accounts
3. Find your test account
4. Delete it if it's using old/incorrect URLs
5. Create a new onboarding session from your app

### 4. Clear Browser Cache & Retry

Old Stripe sessions might be cached:

1. Clear your browser cache
2. Log out and log back into your app
3. Start the business banking setup again

## How the Redirect Works

When you complete Stripe onboarding, Stripe redirects to:
```
https://loma-org.onrender.com/business-banking?success=true
```

This URL is constructed from:
- `process.env.BASE_URL` (production) or `http://localhost:3000` (development)
- Plus `/business-banking?success=true`

## Debugging Steps

### 1. Check Server Logs

After deploying the latest changes, you'll see logs like:
```
🔗 Creating account link with BASE_URL: https://loma-org.onrender.com
🔗 Refresh URL: https://loma-org.onrender.com/business-banking?refresh=true
🔗 Return URL: https://loma-org.onrender.com/business-banking?success=true
```

Check these in your Render logs to verify the URLs are correct.

### 2. Test the Health Endpoint

Visit: `https://loma-org.onrender.com/health`

If this returns a 503 or error, your service is not running properly.

### 3. Check API Endpoint

Visit: `https://loma-org.onrender.com/api/status`

This should return build information if the service is running.

## Environment Variables Checklist

Ensure these are set in your Render dashboard:

- ✅ `BASE_URL=https://loma-org.onrender.com`
- ✅ `DATABASE_URL=postgresql://...` (your connection string)
- ✅ `STRIPE_SECRET_KEY=sk_...` (your Stripe key)
- ✅ `PHI_ENCRYPTION_KEY=...` (64 character key)
- ✅ `SESSION_SECRET=...` (64 character secret)
- ✅ `USE_HIPAA_SCHEMA=true`
- ✅ `NODE_ENV=production`

## Common Issues

### Issue: "This service has been suspended"
**Solution**: Your Render service is suspended. Check billing/account status in Render dashboard.

### Issue: Old URL with `successreturn`
**Solution**: Delete the Stripe Connect account and create a new one after deploying these fixes.

### Issue: URLs point to localhost
**Solution**: `BASE_URL` environment variable is not set in production. Add it to Render.

### Issue: 503 only on redirect, site works otherwise
**Solution**: The service might be sleeping (free tier). Upgrade to paid tier or keep it warm with uptime monitoring.

## Next Steps After Fixing

1. **Deploy this fix** to Render (it will use the updated code with logging)
2. **Check Render logs** to see the actual URLs being generated
3. **Delete any existing Stripe Connect accounts** in your Stripe Dashboard
4. **Start fresh** - Create a new business banking account in your app
5. **Complete onboarding** - The redirect should now work correctly

## Need More Help?

1. Check Render logs for errors: Dashboard → Logs
2. Check Stripe logs: Stripe Dashboard → Developers → Logs
3. Test locally first with ngrok to verify the flow works

