# CAQH Autofill Experiment: Flow, Flags, Rollback

## Flow
- User uploads CV and parsing completes.
- CTA appears when `VITE_EXPERIMENT_CAQH_AUTOFILL=true`.
- Clicking CTA calls `POST /api/experiments/caqh/start`.
- Server checks `EXPERIMENT_CAQH_AUTOFILL` and starts a Browserbase session.
- Client opens `liveViewUrl` to the CAQH self-registration page.
- System automatically fills registration form with CV data and user can review/submit.

## Registration Flow (Current)
- Navigates to: `https://proview.caqh.org/PR/Registration/SelfRegistration`
- Fills fields from CV data:
  - Provider type (Psychologist by default)
  - Personal information (name, DOB)
  - Address information
  - Email
  - License information (state, number)
  - NPI number
  - DEA number (if available)
- User reviews pre-filled information and submits

## Feature flags
- Server: `EXPERIMENT_CAQH_AUTOFILL` (default: false)
- Client: `VITE_EXPERIMENT_CAQH_AUTOFILL` (default: false)

## Rollback
- Set both flags to `false` and redeploy. The CTA disappears and API returns 404.
- No DB/schema changes; to remove completely, delete `apps/caqh-autofill/` and `server/routes/experiments-caqh.ts` and the import/use in `server/routes.ts`.

## Promotion
- Optionally rename API to `/api/caqh/start`.
- Harden selectors and expand sections.
- Add support for different provider types beyond Psychologist.
- Consider adding encrypted per-user auth state for returning users.

