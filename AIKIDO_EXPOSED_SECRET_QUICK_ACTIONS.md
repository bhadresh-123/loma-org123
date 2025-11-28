# 🚨 Quick Action Guide - Aikido Exposed Secret

## TL;DR - What You Need to Do RIGHT NOW

### Step 1: Check if the exposed key is currently in production 🔍

```bash
# SSH into your production server or open Render shell
echo $PHI_ENCRYPTION_KEY
```

**Does it end with `...7472`?**
- ✅ **NO** → You're safe! The old key is not in use. Just mark the Aikido alert as resolved.
- ❌ **YES** → The exposed key IS in production. Continue to Step 2 immediately.

---

## 🔥 IF THE KEY IS IN PRODUCTION (ends with 7472)

### Step 2: Rotate the key ASAP

#### A. Generate a new key
```bash
openssl rand -hex 32
```
Save this key somewhere secure (password manager, secure note).

#### B. Run the rotation script
```bash
# From your production environment (Render shell or wherever you have DB access)
OLD_KEY=d0c6a9896c3a91dc2d3baec809cf9493db4fabdb6c909ca5a391fd4f11df7472 \
NEW_KEY=<your-newly-generated-key> \
tsx server/scripts/rotate-encryption-key.ts
```

#### C. Update environment variable
In Render Dashboard (or your deployment platform):
- Go to Environment Variables
- Update `PHI_ENCRYPTION_KEY` to your new key
- Save changes (this will trigger a restart)

#### D. Verify it works
```bash
# Test that decryption still works
curl https://your-app.onrender.com/api/hipaa/health
```

---

## ✅ IF THE KEY IS NOT IN PRODUCTION

Great! The exposed key was never used or has already been rotated.

### Just do this:
1. Mark the Aikido alert as "Resolved"
2. Note in Aikido: "Key was removed from codebase on Sept 30, 2025. Not currently in use."

---

## 📋 Post-Resolution

Once the key is rotated (or confirmed not in use):

1. ✅ Mark Aikido alert as resolved
2. ✅ Document the incident in your security logs
3. ✅ Consider adding git-secrets pre-commit hooks
4. ✅ Review who has access to your repository

---

## 🆘 If Something Goes Wrong

- **Decryption fails after rotation**: Check that you used the correct old key
- **Script fails**: Verify database connection and that you have write permissions
- **Can't access production**: Contact your DevOps/deployment platform support

---

## 📞 More Information

See `AIKIDO_EXPOSED_SECRET_FIX.md` for complete details and background.










