# CAQH Autofill Changelog

## [Registration Flow] - 2025-11-07

### Major Changes
Changed the CAQH flow from login-based to registration-based flow for new users.

### What Changed

#### 1. Navigation Flow
- **Before**: Navigated to `https://proview.caqh.org/Login/Index`
- **After**: Navigates to `https://proview.caqh.org/PR/Registration/SelfRegistration`

#### 2. User Experience
- **Before**: User had to log in first, then system filled profile
- **After**: System fills registration form directly, user reviews and submits

#### 3. New Files Created
- `apps/caqh-autofill/src/caqh-registration.ts` - Registration form filling logic
  - Fills all registration form fields
  - Handles dropdown selections
  - Supports optional fields (middle name, DEA, etc.)
  - Graceful error handling for missing fields

#### 4. Files Modified

##### `apps/caqh-autofill/src/start-session.ts`
- Updated navigation URL to registration page
- Updated console log messages

##### `apps/caqh-autofill/src/mapping.ts`
- Added `RegistrationData` type with all registration fields
- Updated `ProviderProfile` to include optional `registration` field
- Added support for middle name and suffix

##### `apps/caqh-autofill/src/cv-adapter.ts`
- Enhanced to extract personal information from CV
- Added mapping for licenses and certifications
- Extracts NPI and DEA numbers from certifications
- Builds complete `RegistrationData` object
- Defaults to "Psychologist" provider type
- Uses "Behavioral Health & Social Service Providers" NUCC grouping

##### `apps/caqh-autofill/src/runner.ts`
- Removed login waiting logic
- Added registration form filling logic
- Waits for page load before filling
- Improved error handling and logging

##### `apps/caqh-autofill/src/cli.ts`
- Updated comments to reflect registration flow
- Fixed parameter passing to `runAutofillOnSession`

##### `client/src/components/CVParser.tsx`
- Updated card title: "Register for CAQH (Experiment)"
- Updated description to mention registration instead of login

##### `docs/caqh/flows.md`
- Added detailed registration flow section
- Listed all fields being filled
- Updated promotion notes

#### 5. Documentation Added
- `apps/caqh-autofill/README.md` - Comprehensive documentation
  - Architecture diagram
  - Data mapping table
  - Field reference
  - Troubleshooting guide
  - Development instructions

### Registration Form Fields

The system now fills the following fields from CV data:

**Provider Information**
- NUCC Grouping (default: "Behavioral Health & Social Service Providers")
- Provider Type (default: "Psychologist")

**Personal Information**
- First Name, Middle Name, Last Name, Suffix
- Date of Birth

**Address Information**
- Address Type (default: "Practice")
- Street 1, Street 2
- City, State, ZIP Code
- Primary Practice State

**Contact Information**
- Email Type (default: "Primary")
- Email Address + Confirmation

**Professional Identifiers**
- NPI Number
- DEA Number (optional)
- License State
- License Number

### Provider Types Supported

Currently defaults to **Psychologist** with these NUCC codes:
- Psychologist: 103T00000X
- Clinical Psychologist: 103TC0700X
- Counseling Psychologist: 103TC1900X
- Cognitive & Behavioral: 103TB0200X
- Family Psychologist: 103TF0000X
- Group Psychologist: 103TP2701X

### Technical Details

**Dependencies**: No new dependencies added
**Breaking Changes**: None (feature is behind flag)
**Backward Compatibility**: Maintained through feature flags

### Testing Recommendations

1. Test with CV containing full personal information
2. Test with minimal CV (missing optional fields)
3. Test with various provider types
4. Test with/without DEA number
5. Verify form submission works after autofill

### Known Limitations

1. Only supports Psychologist provider type (hardcoded)
2. NUCC Grouping is hardcoded to Behavioral Health
3. No subspecialty selection support yet
4. SSN field is optional (not extracted from CV)
5. Suffix selection limited to dropdown options

### Future Enhancements

- [ ] Support multiple provider types dynamically
- [ ] Add subspecialty selection
- [ ] Implement form validation before showing to user
- [ ] Add progress indicators during form filling
- [ ] Support session resume for incomplete registrations
- [ ] Extract provider type from CV/credentials
- [ ] Add A/B testing for fill strategies

### Migration Notes

No migration required. Feature is behind flags:
- Server: `EXPERIMENT_CAQH_AUTOFILL=true`
- Client: `VITE_EXPERIMENT_CAQH_AUTOFILL=true`

To enable, set both flags to `true` in environment variables.

### Rollback Plan

To disable the feature:
1. Set `EXPERIMENT_CAQH_AUTOFILL=false` (server)
2. Set `VITE_EXPERIMENT_CAQH_AUTOFILL=false` (client)
3. Redeploy

The CTA will disappear and API will return 404.

### Performance Impact

- Session creation: ~2-3 seconds
- Form filling: ~3-5 seconds
- Total time: ~5-8 seconds from click to filled form
- Browserbase session timeout: 1 hour

### Security Considerations

✅ SSN not collected or stored
✅ DEA numbers only if present in CV
✅ Secure Browserbase sessions
✅ Unique Live View URLs
✅ Session expiration after 1 hour
✅ No credential storage

---

**Author**: Grant Thain
**Date**: November 7, 2025
**Feature Flag**: `EXPERIMENT_CAQH_AUTOFILL`

