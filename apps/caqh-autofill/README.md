# CAQH Registration Autofill

This application helps healthcare providers register for CAQH by automatically filling the self-registration form with information extracted from their CV.

## Overview

The CAQH autofill feature uses Browserbase to create a secure browser session where providers can register for CAQH. The system automatically fills the registration form with information from the provider's parsed CV, making the registration process faster and more accurate.

## Flow

1. **User uploads CV** → CV is parsed and data is extracted
2. **User clicks "Register for CAQH"** → Browserbase session is created
3. **Browser opens registration page** → `https://proview.caqh.org/PR/Registration/SelfRegistration`
4. **System fills form** → Registration data is populated from CV
5. **User reviews and submits** → User verifies information and completes registration

## Architecture

```
┌─────────────┐
│   Client    │
│  CVParser   │
└──────┬──────┘
       │ POST /api/experiments/caqh/start
       │ with CV data
       ▼
┌─────────────────┐
│  Server Route   │
│ experiments-    │
│  caqh.ts        │
└──────┬──────────┘
       │
       ├──► startSession() → Creates Browserbase session
       │                     Navigates to registration page
       │
       └──► runAutofillOnSession() → Fills registration form
                                      (background process)

┌─────────────────────────────────────────────────────────┐
│                    Key Components                        │
├─────────────────────────────────────────────────────────┤
│ start-session.ts    → Creates & navigates Browserbase   │
│ runner.ts           → Orchestrates the autofill process │
│ cv-adapter.ts       → Converts CV data to CAQH format   │
│ caqh-registration.ts→ Fills registration form fields    │
│ mapping.ts          → TypeScript types & interfaces     │
└─────────────────────────────────────────────────────────┘
```

## Data Mapping

The CV adapter extracts the following information:

### Personal Information
- First Name, Middle Name, Last Name
- Date of Birth
- Email Address

### Address Information
- Street Address (Line 1 & 2)
- City, State, ZIP Code
- Primary Practice State

### Professional Information
- Provider Type (defaults to "Psychologist")
- NUCC Grouping (defaults to "Behavioral Health & Social Service Providers")
- NPI Number
- DEA Number (if available)
- State License Number & State

### Classification Codes

The system uses these NUCC taxonomy codes for Psychologists:

- **Psychologist**: 103T00000X
- **Clinical Psychologist**: 103TC0700X
- **Counseling Psychologist**: 103TC1900X
- **Cognitive & Behavioral**: 103TB0200X
- **Family Psychologist**: 103TF0000X
- **Group Psychologist**: 103TP2701X

## Files Modified

### Core Logic
- `apps/caqh-autofill/src/start-session.ts` - Changed navigation to registration page
- `apps/caqh-autofill/src/runner.ts` - Updated to use registration flow
- `apps/caqh-autofill/src/mapping.ts` - Added RegistrationData type
- `apps/caqh-autofill/src/cv-adapter.ts` - Enhanced to extract personal info
- `apps/caqh-autofill/src/caqh-registration.ts` - **NEW** - Registration form filler
- `apps/caqh-autofill/src/cli.ts` - Updated comments for new flow

### UI & Documentation
- `client/src/components/CVParser.tsx` - Updated UI description
- `docs/caqh/flows.md` - Updated documentation

## Environment Variables

### Required
- `BROWSERBASE_API_KEY` - Browserbase API key for session management
- `BROWSERBASE_PROJECT_ID` - Project ID for Browserbase (defaults to 'default')

### Feature Flags
- `EXPERIMENT_CAQH_AUTOFILL` - Server-side flag (default: false)
- `VITE_EXPERIMENT_CAQH_AUTOFILL` - Client-side flag (default: false)

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Set environment variables
export BROWSERBASE_API_KEY=your_api_key
export BROWSERBASE_PROJECT_ID=your_project_id

# Run with a sample CV
npm run caqh-cli -- --cv=./sample-cv.json --run
```

### Testing the Flow

1. Enable feature flags in `.env`:
   ```
   EXPERIMENT_CAQH_AUTOFILL=true
   VITE_EXPERIMENT_CAQH_AUTOFILL=true
   ```

2. Upload a CV through the UI
3. Click "Register for CAQH"
4. Watch the form auto-fill in the Live View browser
5. Review and submit the registration

## Field Mapping

| Registration Form Field | CV Data Source | Default Value |
|------------------------|----------------|---------------|
| NUCC Grouping | - | "Behavioral Health & Social Service Providers" |
| Provider Type | - | "Psychologist" |
| First Name | `personalInfo.firstName` | - |
| Middle Name | `personalInfo.middleName` | - |
| Last Name | `personalInfo.lastName` | - |
| Address Type | - | "Practice" |
| Street 1 | `personalInfo.address` | - |
| City | `personalInfo.city` | - |
| State | `personalInfo.state` | - |
| Zip Code | `personalInfo.zipCode` | - |
| Primary Practice State | `personalInfo.state` | - |
| Birth Date | `personalInfo.dateOfBirth` | - |
| Email Type | - | "Primary" |
| Email Address | `personalInfo.email` | - |
| Email Confirmation | `personalInfo.email` | - |
| NPI Number | `certifications[name=NPI].number` | - |
| DEA Number | `certifications[name=DEA].number` | - |
| License State | `licenses[0].state` | - |
| License Number | `licenses[0].number` | - |

## Error Handling

- **Missing Fields**: System logs warnings for missing fields but continues filling available data
- **Invalid Selectors**: Falls back gracefully if field selectors don't match
- **Session Timeout**: 1-hour timeout for user to review and submit
- **Network Issues**: Retries connection and logs detailed error information

## Future Enhancements

1. **Multi-Provider Support**: Add support for other provider types beyond Psychologist
2. **Subspecialty Selection**: Allow users to select subspecialty (Clinical, Counseling, etc.)
3. **Validation**: Add pre-submission validation of filled fields
4. **Session Resume**: Support resuming partially completed registrations
5. **Batch Processing**: Support registering multiple providers

## Troubleshooting

### Form not filling
- Check that CV has `personalInfo` section populated
- Verify Browserbase session is active in Live View
- Check browser console for selector errors

### Missing fields
- Ensure CV parser is extracting personal information
- Verify field names match CAQH form structure
- Check logs for warnings about missing data

### Session timeout
- Default timeout is 1 hour
- User must review and submit within this time
- Consider implementing session resume for long reviews

## Security Notes

- SSN is optional and NOT stored in CV parser
- DEA numbers are extracted only if present in CV
- All data transmitted through secure Browserbase sessions
- Live View URL is unique and expires after session
- No credentials are stored or cached

## License

This is part of the Loma Health platform and follows the project's main license.

