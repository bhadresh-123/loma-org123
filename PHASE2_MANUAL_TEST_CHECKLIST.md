# Phase 2 Manual Testing Checklist

## 🎯 Objective
Verify that the Clinical Sessions API returns **clean property names** (without "Encrypted" suffix) for decrypted PHI fields.

---

## ✅ Pre-Test Setup

**Status:** Dev server should be running on http://localhost:5000

```bash
# If not running, start it:
npm run dev

# Server should start successfully with these logs:
# ✓ Connected to PostgreSQL database
# ✓ Server running on port 5000
```

---

## 🧪 Test Suite

### Test 1: List All Sessions (GET)

**Endpoint:** `GET http://localhost:5000/api/clinical-sessions`

**Using Browser (Easiest):**
1. Open http://localhost:5000
2. Login with your credentials
3. Navigate to Sessions page
4. Open browser DevTools (F12)
5. Go to Network tab
6. Refresh the page
7. Find the request to `/api/clinical-sessions`
8. Click on it and view the Response

**Using curl:**
```bash
# First, login to get session cookie
curl -c cookies.txt -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-email@example.com","password":"yourpassword"}'

# Then get sessions
curl -b cookies.txt http://localhost:5000/api/clinical-sessions
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patientId": 5,
      "organizationId": 1,
      "therapistId": 2,
      "date": "2025-01-20T10:00:00.000Z",
      "duration": 60,
      "type": "individual",
      "status": "scheduled",
      
      // ✅ THESE SHOULD EXIST (clean names):
      "sessionClinicalNotes": "Patient reported improved mood...",
      "sessionSubjectiveNotes": "Client states feeling better...",
      "sessionObjectiveNotes": "Observed good eye contact...",
      "sessionAssessmentNotes": "Making progress on treatment goals...",
      "sessionPlanNotes": "Continue current interventions...",
      "sessionTreatmentGoals": "Reduce anxiety symptoms...",
      "sessionProgressNotes": "Completed homework assignments...",
      "sessionInterventions": "Cognitive restructuring...",
      
      // ❌ THESE SHOULD NOT EXIST (encrypted names):
      // "sessionClinicalNotesEncrypted": "...",
      // "sessionSubjectiveNotesEncrypted": "...",
      // etc.
    }
  ]
}
```

**✅ Pass Criteria:**
- [ ] Response has `sessionClinicalNotes` (clean name)
- [ ] Response does NOT have `sessionClinicalNotesEncrypted`
- [ ] All 8 note fields use clean names (no "Encrypted" suffix)
- [ ] Values are decrypted (readable text, not encrypted gibberish)

**❌ Fail Indicators:**
- Response has `sessionClinicalNotesEncrypted` instead of `sessionClinicalNotes`
- Values look like encrypted data (e.g., base64 strings)
- Property names still have "Encrypted" suffix

---

### Test 2: Get Single Session (GET)

**Endpoint:** `GET http://localhost:5000/api/clinical-sessions/:id`

**Using Browser:**
1. From the Sessions page, click on a specific session
2. Watch the Network tab for the API call
3. Inspect the response

**Using curl:**
```bash
curl -b cookies.txt http://localhost:5000/api/clinical-sessions/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "patientId": 5,
    "sessionClinicalNotes": "Decrypted clinical notes...",
    "sessionSubjectiveNotes": "Decrypted subjective notes...",
    // ... other clean property names
  }
}
```

**✅ Pass Criteria:**
- [ ] Single session uses clean property names
- [ ] No "Encrypted" suffix in property names
- [ ] Values are decrypted and readable

---

### Test 3: Create New Session (POST)

**Endpoint:** `POST http://localhost:5000/api/clinical-sessions`

**Using Browser:**
1. Go to Sessions page
2. Click "Schedule Session" or "Add Session"
3. Fill out the form including notes
4. Submit
5. Watch Network tab for the response

**Using curl:**
```bash
curl -b cookies.txt -X POST http://localhost:5000/api/clinical-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 5,
    "organizationId": 1,
    "therapistId": 2,
    "date": "2025-01-25T14:00:00.000Z",
    "duration": 60,
    "type": "individual",
    "sessionClinicalNotesEncrypted": "Test clinical notes",
    "sessionSubjectiveNotesEncrypted": "Patient reported..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "patientId": 5,
    "sessionClinicalNotes": "Test clinical notes",
    "sessionSubjectiveNotes": "Patient reported...",
    // Clean property names in response
  }
}
```

**✅ Pass Criteria:**
- [ ] Response has clean property names
- [ ] Created session returns decrypted values
- [ ] No "Encrypted" suffix in response

---

### Test 4: Update Session (PUT)

**Endpoint:** `PUT http://localhost:5000/api/clinical-sessions/:id`

**Using Browser:**
1. Click "Add Note" or "Edit" on a session
2. Update the notes
3. Save
4. Watch Network tab for response

**Using curl:**
```bash
curl -b cookies.txt -X PUT http://localhost:5000/api/clinical-sessions/1 \
  -H "Content-Type: application/json" \
  -d '{
    "sessionClinicalNotesEncrypted": "Updated clinical notes"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sessionClinicalNotes": "Updated clinical notes",
    // Clean property name in response
  }
}
```

**✅ Pass Criteria:**
- [ ] Response uses clean property names
- [ ] Updated values are returned decrypted

---

### Test 5: Patient's Sessions (GET)

**Endpoint:** `GET http://localhost:5000/api/patients/:patientId/sessions`

**Using Browser:**
1. Navigate to a patient's detail page
2. View their session history
3. Check Network tab for API call

**✅ Pass Criteria:**
- [ ] Patient's sessions use clean property names
- [ ] All sessions in the list have clean names

---

## 🔍 Quick Visual Test (Non-Technical)

**For someone non-technical:**

1. Open http://localhost:5000 in your browser
2. Login
3. Go to "Sessions" page
4. Click on any session to view details
5. **Look for:**
   - ✅ Session notes display correctly
   - ✅ All text is readable (not encrypted gibberish)
   - ✅ No errors in console (press F12 to check)
   - ✅ Sessions page loads normally
   - ✅ Can create new sessions
   - ✅ Can edit session notes

**If all the above work, Phase 2 is working correctly!**

---

## 📊 Test Results Template

Copy and fill this out:

```
PHASE 2 MANUAL TEST RESULTS
Date: _______________
Tester: _______________

Test 1: List Sessions (GET)
- Clean property names present: [ ] YES  [ ] NO
- Encrypted property names absent: [ ] YES  [ ] NO
- Values are decrypted: [ ] YES  [ ] NO
Status: [ ] PASS  [ ] FAIL

Test 2: Get Single Session (GET)
- Clean property names present: [ ] YES  [ ] NO
- Encrypted property names absent: [ ] YES  [ ] NO
Status: [ ] PASS  [ ] FAIL

Test 3: Create Session (POST)
- Response uses clean names: [ ] YES  [ ] NO
Status: [ ] PASS  [ ] FAIL

Test 4: Update Session (PUT)
- Response uses clean names: [ ] YES  [ ] NO
Status: [ ] PASS  [ ] FAIL

Test 5: Patient's Sessions (GET)
- Clean property names present: [ ] YES  [ ] NO
Status: [ ] PASS  [ ] FAIL

Visual Test (Non-Technical)
- Sessions display correctly: [ ] YES  [ ] NO
- No console errors: [ ] YES  [ ] NO
- Can create/edit sessions: [ ] YES  [ ] NO
Status: [ ] PASS  [ ] FAIL

OVERALL RESULT: [ ] ALL PASS  [ ] SOME FAILURES
```

---

## 🐛 Troubleshooting

### Issue: Property names still have "Encrypted" suffix

**Cause:** Service changes not loaded  
**Fix:**
```bash
# Restart the dev server
npm run dev
```

### Issue: Values look encrypted (gibberish)

**Cause:** Decryption not working  
**Fix:** Check that PHI_ENCRYPTION_KEY is set in .env

### Issue: 401 Unauthorized

**Cause:** Not logged in  
**Fix:** Login first through the UI or get session cookie

### Issue: Sessions not loading

**Cause:** Database connection issue  
**Fix:** Check DATABASE_URL in .env is correct

---

## ✅ Success Criteria Summary

**Phase 2 is successful if:**

1. ✅ All API responses use clean property names (`sessionClinicalNotes`)
2. ✅ No API responses have encrypted property names (`sessionClinicalNotesEncrypted`)
3. ✅ All values are properly decrypted (readable text)
4. ✅ Frontend continues to work without errors
5. ✅ Sessions can be created, read, updated normally

**If all 5 criteria are met, Phase 2 deployment is ready! 🎉**

---

## 📝 Next Steps After Testing

**If tests PASS:**
- [ ] Document test results in PHASE2_COMPLETION_REPORT.md
- [ ] Proceed to staging deployment
- [ ] Schedule production deployment

**If tests FAIL:**
- [ ] Document the failure
- [ ] Review service layer code
- [ ] Check for TypeScript/linting errors
- [ ] Re-run unit tests
- [ ] Fix issues and retest

---

## 🔗 Related Documents

- [PHASE2_COMPLETION_REPORT.md](./PHASE2_COMPLETION_REPORT.md) - Full completion report
- [API_REFERENCE.md](./API_REFERENCE.md) - API documentation with response formats
- [Unit Tests](./server/tests/unit/clinical-session-service.test.ts) - Automated tests

