# Manual Testing Checklist - Profile Credential Persistence Fix

## Pre-Testing Setup

1. **Ensure you're testing on the correct branch:**
   ```bash
   git status  # Should show: On branch fix-profile-credential-persistence
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open browser to:** http://localhost:5000 (or your dev URL)

---

## Test 1: Fresh Entry - All Credential Fields

**Objective:** Verify that newly entered credential data persists after page refresh

### Steps:
1. [ ] Login to the application
2. [ ] Navigate to Profile page
3. [ ] Scroll to Credentialing section
4. [ ] Enter the following test data:
   - **SSN:** 123-45-6789
   - **Date of Birth:** 01/15/1985
   - **NPI Number:** 1234567890
   - **Taxonomy Code:** 103T00000X
5. [ ] Click "Save" or "Update Profile" button
6. [ ] Wait for success message (e.g., "Profile updated successfully")
7. [ ] Perform hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
8. [ ] Scroll back to Credentialing section

### Expected Result:
- ✅ SSN field displays: 123-45-6789
- ✅ Date of Birth field displays: 01/15/1985
- ✅ NPI Number field displays: 1234567890
- ✅ Taxonomy Code field displays: 103T00000X
- ✅ No fields are empty
- ✅ All values match what was entered

### If Test Fails:
- Check browser console for errors (F12 → Console tab)
- Check network tab (F12 → Network tab) for API responses
- Verify API response includes `ssnEncrypted`, `dateOfBirthEncrypted`, `npiNumber`, `taxonomyCode`

---

## Test 2: Update Existing Values

**Objective:** Verify that credential field updates persist correctly

### Steps:
1. [ ] Starting from Test 1 (fields already populated)
2. [ ] Change SSN to: 987-65-4321
3. [ ] Change NPI to: 9876543210
4. [ ] Click "Save"
5. [ ] Wait for success message
6. [ ] Hard refresh page (Cmd+Shift+R)

### Expected Result:
- ✅ SSN field displays NEW value: 987-65-4321
- ✅ NPI field displays NEW value: 9876543210
- ✅ DOB and Taxonomy remain unchanged from Test 1
- ✅ No data loss on refresh

---

## Test 3: Clear Field (Set to Empty)

**Objective:** Verify that clearing a field persists

### Steps:
1. [ ] Navigate to Profile → Credentialing
2. [ ] Clear the NPI Number field (delete all text)
3. [ ] Click "Save"
4. [ ] Wait for success message
5. [ ] Hard refresh page

### Expected Result:
- ✅ NPI Number field is empty
- ✅ Other fields (SSN, DOB, Taxonomy) remain populated
- ✅ Empty state persists after refresh

---

## Test 4: Birth Location Fields

**Objective:** Verify birth location fields persist (if implemented in UI)

### Steps:
1. [ ] Navigate to Profile → Credentialing
2. [ ] If Birth City, Birth State, Birth Country fields exist:
   - Enter Birth City: San Francisco
   - Enter Birth State: California
   - Enter Birth Country: United States
3. [ ] Click "Save"
4. [ ] Hard refresh page

### Expected Result:
- ✅ All birth location fields display entered values
- ✅ No data loss on refresh

**Note:** If these fields don't exist in UI yet, skip this test.

---

## Test 5: CAQH Autofill Integration

**Objective:** Verify CAQH form pre-fills with saved credential data

### Steps:
1. [ ] Ensure profile has all credential fields populated (from Test 1)
2. [ ] Navigate to CAQH page/feature
3. [ ] Look for "Fill from Profile" or "Autofill" button
4. [ ] Click the autofill button

### Expected Result:
- ✅ CAQH form fields auto-populate with profile data:
  - SSN matches profile
  - DOB matches profile
  - NPI matches profile
  - Taxonomy matches profile
- ✅ No manual re-entry required

**Note:** This was the original bug report trigger - CAQH autofill was broken.

---

## Test 6: Multiple Save/Refresh Cycles

**Objective:** Verify data persistence is reliable across multiple operations

### Steps:
1. [ ] Enter credential data
2. [ ] Save
3. [ ] Refresh page → Verify data present
4. [ ] Update one field
5. [ ] Save
6. [ ] Refresh page → Verify update persisted
7. [ ] Navigate to another page (e.g., Dashboard)
8. [ ] Navigate back to Profile
9. [ ] Verify all credential data still present

### Expected Result:
- ✅ Data persists through all navigation and refresh cycles
- ✅ No intermittent data loss
- ✅ Consistent behavior

---

## Test 7: Browser Console Check

**Objective:** Ensure no JavaScript errors and verify API calls

### Steps:
1. [ ] Open browser DevTools (F12)
2. [ ] Go to Console tab
3. [ ] Clear console
4. [ ] Navigate to Profile page
5. [ ] Enter credential data
6. [ ] Click Save
7. [ ] Watch console for errors

### Expected Result:
- ✅ No red error messages in console
- ✅ May see green success logs like: `[Profile] SSN field updated for user X`
- ✅ No 500 or 400 errors

### Steps (Network Tab):
1. [ ] Open DevTools → Network tab
2. [ ] Filter by "Fetch/XHR"
3. [ ] Click Save on profile
4. [ ] Find the PUT request to `/api/profile`
5. [ ] Click on it → Preview/Response tab
6. [ ] Verify response looks correct

### Expected Result:
- ✅ Status Code: 200 OK
- ✅ Response includes success message
- ✅ No error payload

---

## Test 8: Direct Database Verification (Optional - Dev Only)

**Objective:** Verify data is actually encrypted in database

### Steps (requires database access):
1. [ ] After saving SSN "123-45-6789" in profile
2. [ ] Query database:
   ```sql
   SELECT therapist_ssn_encrypted 
   FROM therapist_phi 
   WHERE user_id = [your_test_user_id];
   ```
3. [ ] Examine the value

### Expected Result:
- ✅ Value starts with `v1:` (version prefix)
- ✅ Value is NOT plaintext "123-45-6789"
- ✅ Value looks like: `v1:abc123...` (long encrypted string)
- ✅ Confirms encryption is working

---

## Test 9: Different Browsers (Cross-Browser Check)

**Objective:** Ensure fix works across browsers

### Browsers to Test:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge (if on Windows)

### For Each Browser:
1. [ ] Login
2. [ ] Enter credential data
3. [ ] Save
4. [ ] Hard refresh
5. [ ] Verify data persists

### Expected Result:
- ✅ Consistent behavior across all browsers
- ✅ No browser-specific issues

---

## Test 10: Field Validation (Error Handling)

**Objective:** Verify validation still works correctly

### Steps:
1. [ ] Try entering invalid NPI: "123" (too short)
2. [ ] Try entering invalid SSN format
3. [ ] Click Save

### Expected Result:
- ✅ Validation errors display appropriately
- ✅ Form doesn't submit invalid data
- ✅ Error messages are helpful

---

## Success Criteria Summary

**All tests must pass for fix to be considered successful:**

1. ✅ SSN persists after page refresh
2. ✅ DOB persists after page refresh
3. ✅ NPI persists after page refresh
4. ✅ Taxonomy Code persists after page refresh
5. ✅ Birth location fields persist (if in UI)
6. ✅ CAQH autofill works correctly
7. ✅ Updates to fields persist
8. ✅ Clearing fields persists
9. ✅ No JavaScript console errors
10. ✅ Data encrypted in database (SSN, DOB)
11. ✅ Works across multiple browsers
12. ✅ Multiple save/refresh cycles work reliably

---

## Regression Testing

**Verify existing profile features still work:**

- [ ] Basic info (name, title, license) still saves
- [ ] Contact info (phone, email, address) still saves
- [ ] Practice details still save
- [ ] Other profile sections unaffected

---

## If Any Test Fails

1. **Document the failure:**
   - Which test failed?
   - What was the expected vs actual result?
   - Screenshot or screen recording if possible

2. **Check browser console:**
   - Any JavaScript errors?
   - Any failed network requests?

3. **Check server logs:**
   ```bash
   npm run logs:render  # Production
   # Or check terminal output in dev mode
   ```

4. **Verify you're on correct branch:**
   ```bash
   git branch  # Should show fix-profile-credential-persistence
   ```

5. **Report findings to development team**

---

## Testing Complete ✅

Once all tests pass, document:
- ✅ Date/time tested
- ✅ Environment (dev/staging/production)
- ✅ Browser(s) tested
- ✅ All tests passed
- ✅ No regressions observed

**Tester Signature:** _________________________  
**Date:** _________________________

---

## Notes Section

Use this space to document any observations, edge cases, or issues encountered:

```
[Add notes here]
```

