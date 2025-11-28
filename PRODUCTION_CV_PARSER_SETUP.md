# CV Parser Production Setup Guide

## Overview
The CV parser requires both system-level PDF tools and the Anthropic API key to work in production.

## ✅ What's Already Configured

### 1. Build Script Updated
The `render-build.sh` script now installs the required PDF processing tools:
- `poppler-utils` - Provides `pdftotext` and `pdftoppm` for PDF text extraction
- `ghostscript` - Provides `gs` for PDF processing
- `tesseract-ocr` - Provides OCR fallback for image-based PDFs

These tools will be automatically installed during the Render build process.

### 2. Environment Variable Placeholder
The `render.yaml` already includes `ANTHROPIC_API_KEY` in the environment variables list.

## ⚠️ Required Actions for Production

### 1. Set the Anthropic API Key in Render Dashboard

**Steps:**
1. Go to your Render dashboard: https://dashboard.render.com/
2. Select your `loma-platform` service
3. Go to **Environment** tab
4. Find `ANTHROPIC_API_KEY` or add it if missing
5. Set the value to your production Anthropic API key (starts with `sk-ant-...`)
6. Click **Save**

**Get an API Key:**
- Go to https://console.anthropic.com/
- Create an API key
- Make sure it's a **production** key (not a test key)
- Consider setting usage limits to prevent unexpected costs

### 2. Deploy the Updated Build Script

After updating `render-build.sh`, you need to redeploy:

**Option A: Git Push (Recommended)**
```bash
git add render-build.sh
git commit -m "Add PDF tools for CV parser production support"
git push origin main
```
Render will automatically detect the change and rebuild.

**Option B: Manual Deploy**
1. Go to Render dashboard
2. Select your service
3. Click **Manual Deploy** → **Deploy latest commit**

### 3. Verify the Deployment

After deployment completes:

1. **Check build logs** for successful installation:
   ```
   ✅ System dependencies installed successfully
   ```

2. **Test CV upload** in production:
   - Navigate to your production URL
   - Go to the CV Parser page
   - Upload a test CV (PDF or DOCX)
   - Click "Parse CV for Credentialing"

## Expected Behavior

### ✅ Success Scenario
- Upload PDF or DOCX CV
- See "Parsing CV..." loading state
- Get confirmation: "CV parsed successfully for credentialing"
- See extracted education and work experience data

### ❌ Potential Issues & Solutions

#### 1. "Anthropic API key is not configured"
**Solution:** Set the API key in Render dashboard (see step 1 above)

#### 2. "Unable to extract text from PDF"
**Causes:**
- Image-based PDF (scanned document)
- Corrupted PDF file
- Unsupported PDF format

**Solutions:**
- Try converting to DOCX format
- Use a text-based PDF (not scanned)
- OCR will attempt to process image-based PDFs but may not be 100% accurate

#### 3. "AI parsing failed"
**Causes:**
- Invalid API key
- API rate limits exceeded
- Network connectivity issues
- Insufficient API credits

**Solutions:**
- Check API key is valid and has credits
- Check Anthropic console for rate limits
- Verify network connectivity from Render

## Cost Considerations

### Anthropic API Costs
- **Claude Sonnet 4** (current model): ~$3 per million input tokens
- **Typical CV**: 1,000-3,000 tokens
- **Cost per CV parse**: ~$0.003-$0.01 per CV

### Recommendations
1. Set usage limits in Anthropic console
2. Monitor API usage in production
3. Consider implementing rate limiting for CV uploads if needed

## Testing in Production

### Test Cases
1. **Text-based PDF**: Standard PDF with selectable text
2. **DOCX file**: Microsoft Word document
3. **Large file**: Test the 10MB file size limit
4. **Invalid file**: Test error handling with non-PDF/DOCX files

### Expected Processing Time
- Text-based PDF: 5-15 seconds
- Image-based PDF (OCR): 20-60 seconds
- DOCX: 5-10 seconds

## Monitoring

### Logs to Watch
```bash
# In Render dashboard, check logs for:
- "Parsing CV file: [filename]"
- "Extracted text length: [X] characters"
- "AI parsing successful: [X] education entries, [X] work entries"
```

### Error Logs
```bash
# Common error patterns:
- "Error extracting text from file"
- "AI parsing failed"
- "Failed to parse CV"
```

## Rollback Plan

If CV parser causes issues in production:

1. **Quick Fix**: Set `ANTHROPIC_API_KEY` to empty in Render dashboard
   - This will cause CV parsing to fail gracefully
   - Users will see clear error message
   - Rest of the application continues to work

2. **Full Rollback**: 
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## Security Notes

✅ **Already Implemented:**
- File size limits (10MB)
- File type validation (PDF, DOC, DOCX only)
- Path traversal protection (`validateAndNormalizePath`)
- Automatic file cleanup after processing
- CORS protection
- Authentication required (`authenticateToken`)

## Summary Checklist

Before deploying to production:

- [ ] Set `ANTHROPIC_API_KEY` in Render dashboard
- [ ] Commit and push updated `render-build.sh`
- [ ] Wait for successful deployment
- [ ] Check build logs for PDF tools installation
- [ ] Test CV upload with sample file
- [ ] Monitor API usage and costs
- [ ] Set up alerts for API errors (optional)

## Additional Resources

- Anthropic Console: https://console.anthropic.com/
- Anthropic Pricing: https://www.anthropic.com/pricing
- Render Dashboard: https://dashboard.render.com/
- API Documentation: https://docs.anthropic.com/

---

**Note:** The CV parser is an optional feature. If you choose not to configure the Anthropic API key, users will simply see an error message when attempting to parse CVs, but all other functionality will continue to work normally.

