# Cloudflare R2 Setup Guide

**Date:** November 4, 2025  
**Purpose:** HIPAA 1.4.7 Compliance - Persistent file storage and automated backups  
**Cost:** $0 (Free tier: 10 GB storage, 10M operations/month)

---

## Overview

Cloudflare R2 provides S3-compatible object storage with no egress fees. We're using it for:
1. **Persistent file storage** for encrypted PHI documents (replacing ephemeral Render filesystem)
2. **Database backup storage** with 30-day retention

---

## Step 1: Create Cloudflare Account

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Sign up for a free account (if you don't have one)
3. Verify your email address

---

## Step 2: Create R2 Bucket

1. **Navigate to R2**:
   - In Cloudflare dashboard, click **R2** in the sidebar
   - Click **Create bucket**

2. **Bucket for PHI Files**:
   - **Name**: `loma-phi-files`
   - **Location**: Automatic (recommended)
   - Click **Create bucket**

3. **Bucket for Database Backups**:
   - Click **Create bucket** again
   - **Name**: `loma-db-backups`
   - **Location**: Automatic (recommended)
   - Click **Create bucket**

---

## Step 3: Create API Token

1. **Navigate to API Tokens**:
   - In R2 overview, click **Manage R2 API Tokens**
   - Or go to: https://dash.cloudflare.com/?to=/:account/r2/api-tokens

2. **Create Token**:
   - Click **Create API token**
   - **Token name**: `loma-platform-production`
   - **Permissions**: 
     - Object Read & Write
     - Bucket Read (optional, for listing)
   - **Buckets**: 
     - Select both `loma-phi-files` and `loma-db-backups`
   - **TTL**: Never expire (for production)
   - Click **Create API Token**

3. **Save Credentials**:
   - Copy the **Access Key ID** (starts with a long string)
   - Copy the **Secret Access Key** (starts with a long string)
   - **⚠️ IMPORTANT**: Store these securely - you won't see them again!

---

## Step 4: Get Account ID

1. In Cloudflare dashboard, click on **R2**
2. Your **Account ID** is shown in the sidebar or R2 overview
3. It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## Step 5: Configure Environment Variables

Add these to your Render environment variables:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id-here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key-here
CLOUDFLARE_R2_BUCKET_FILES=loma-phi-files
CLOUDFLARE_R2_BUCKET_BACKUPS=loma-db-backups
```

### For Render.com:
1. Go to your service: https://dashboard.render.com
2. Click on your service (loma-platform)
3. Go to **Environment** tab
4. Click **Add Environment Variable** for each variable above
5. Click **Save Changes**

---

## Step 6: Configure CORS (Optional - for direct uploads)

If you need browser-based direct uploads in the future:

1. In Cloudflare R2 bucket settings, go to **Settings** → **CORS Policy**
2. Add this policy:

```json
[
  {
    "AllowedOrigins": [
      "https://loma-org.onrender.com",
      "http://localhost:5000"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Step 7: Test Connection (After Deployment)

After deploying the code changes, test the connection:

```bash
# Check health endpoint
curl https://loma-org.onrender.com/api/health

# Look for:
# "cloudStorage": "connected"
```

---

## Free Tier Limits

**Included Free:**
- ✅ 10 GB storage
- ✅ 1 million Class A operations per month (writes, lists)
- ✅ 10 million Class B operations per month (reads)
- ✅ Zero egress fees (unlimited downloads)

**Estimated Usage:**
- PHI Files: ~2-5 GB (well within limit)
- Database Backups: ~500 MB × 30 days = 15 GB (5 GB over, ~$0.08/month)
- Operations: ~1,000 per day = 30,000/month (well within limit)

**Total Cost: $0-0.08/month**

---

## Security Features

✅ **Encryption at Rest**: All data encrypted with AES-256  
✅ **Encryption in Transit**: TLS 1.3 for all connections  
✅ **Access Control**: API tokens with bucket-level permissions  
✅ **Audit Logs**: Available in Cloudflare dashboard  
✅ **Geographic Redundancy**: Multi-region replication  

---

## Backup Retention Policy

**PHI Files**: Retained indefinitely (until manually deleted)  
**Database Backups**: 30-day rolling retention (automated cleanup)

---

## Troubleshooting

### Error: "AccessDenied"
- Check that API token has correct permissions
- Verify bucket name matches environment variable
- Ensure token is not expired

### Error: "NoSuchBucket"
- Verify bucket name is correct
- Check that bucket exists in Cloudflare dashboard
- Bucket names are case-sensitive

### Error: "SignatureDoesNotMatch"
- Check Access Key ID and Secret Access Key are correct
- Ensure no extra spaces or newlines in environment variables

---

## Migration from Local Storage

After R2 is configured, run the migration script:

```bash
# This will copy all files from uploads/ to R2
npm run migrate:files-to-r2
```

---

## Documentation References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [HIPAA Compliance Documentation](./HIPAA_COMPLIANCE.md)

---

## Next Steps

After completing this setup:
1. ✅ Environment variables configured in Render
2. ✅ Deploy updated code with CloudStorageService
3. ✅ Run migration script to move existing files
4. ✅ Verify file uploads work correctly
5. ✅ Test database backup automation

---

**Status**: Ready for implementation  
**Priority**: High (resolves data loss risk from ephemeral storage)

