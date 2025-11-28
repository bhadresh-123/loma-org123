# Sigie Scheduling - Debugging Added

## Changes Made

### 1. **Improved Intent Detection Pattern Matching**
- Made regex patterns case-insensitive (`[A-Za-z]` instead of `[A-Z][a-z]`)
- Updated patterns to better match "schedule [name] on [date]" format
- Added non-greedy matching to avoid capturing too much text

### 2. **More Lenient Action Return Logic**
- Now returns action even if not all details are present
- Allows partial actions to be confirmed by user
- Better handling of edge cases

### 3. **Comprehensive Logging Added**

#### Server-Side Logs (`/server/routes/ai-assistant.ts`):
- `[Intent Detection] Analyzing message:` - Shows the user's message
- `[Intent Detection] Context clients:` - Shows available client names
- `[Intent Detection] Is scheduling request:` - Whether scheduling keywords were detected
- `[Intent Detection] Extracted client name:` - The name extracted from message
- `[Intent Detection] Looking for client:` - The name being searched for
- `[Intent Detection] Found matching client:` - If a match was found with ID
- `[Intent Detection] Final action parameters:` - Complete action object
- `[Intent Detection] Returning complete action` - Action with all required fields
- `[Intent Detection] Returning partial action` - Action missing some fields
- `[AI Assistant] Intent detection result:` - Summary of detection
- `[AI Assistant] Including action in response:` - Action being sent to client

#### Client-Side Logs (`/client/src/components/SigieAssistant.tsx`):
- `[Sigie] Sending context with clients:` - Shows client data being sent
- `[Sigie] Response received:` - Shows if response has action
- `[Sigie] Setting pending action:` - When action state is set
- `[Sigie] No action in response` - When no action detected
- `[Sigie] pendingAction changed:` - When pendingAction state changes
- `[Sigie] Should show confirmation dialog now` - When dialog should appear

## How to Debug

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Open terminal logs** for the server
3. **Try scheduling**: "schedule [ClientName] on 11/11 at 11am"
4. **Check logs in order:**

### Expected Log Flow:

**Client Side:**
```
[Sigie] Sending context with clients: [{id: 1, name: "gfds"}]
```

**Server Side:**
```
[Intent Detection] Analyzing message: schedule gfds on 11/11 at 11 am
[Intent Detection] Context clients: ["gfds"]
[Intent Detection] Is scheduling request: true
[Intent Detection] Extracted client name: gfds
[Intent Detection] Looking for client: gfds
[Intent Detection] Found matching client: gfds ID: 1
[Intent Detection] Final action parameters: {patientId: 1, clientName: "gfds", date: "11/11/2025", time: "11 am"}
[Intent Detection] Returning complete action
[AI Assistant] Intent detection result: {userMessage: "...", detectedAction: "schedule_session", hasPatientId: "yes", clientName: "gfds"}
[AI Assistant] Including action in response: {action: "schedule_session", parameters: {...}}
```

**Client Side:**
```
[Sigie] Response received: {hasMessage: true, hasAction: true, action: {...}}
[Sigie] Setting pending action: {action: "schedule_session", parameters: {...}}
[Sigie] pendingAction changed: {action: "schedule_session", parameters: {...}}
[Sigie] Should show confirmation dialog now
```

## What to Look For

### If Action Not Detected:
- Check: Is `[Intent Detection] Is scheduling request: false`?
  - **Problem**: Scheduling keywords not found
  - **Solution**: Add more keywords to detection

- Check: Is `[Intent Detection] Extracted client name: null`?
  - **Problem**: Regex pattern not matching the name format
  - **Solution**: Adjust regex patterns

### If Client Not Found:
- Check: Does`[Intent Detection] Context clients:` include the client?
  - **Problem**: Client data not being passed
  - **Solution**: Check client query on frontend

- Check: Is `[Intent Detection] No matching client found`?
  - **Problem**: Name matching logic failing
  - **Solution**: Check case-sensitivity or name format

### If Dialog Not Showing:
- Check: Is `[Sigie] Response received: {hasAction: true}`?
  - **No**: Action not being returned from server
  - **Yes**: Continue checking...

- Check: Is `[Sigie] Setting pending action` logged?
  - **No**: Action object not structured correctly
  - **Yes**: Check if dialog component is rendering

- Check browser console for React errors
  - Dialog component may be failing to render

## Common Issues

### Issue: "No matching client found"
**Cause**: Client name in message doesn't match any client in database
**Fix**: Make sure client exists and name is spelled correctly

### Issue: "Not enough info to return action"
**Cause**: Missing date, time, or client name
**Fix**: Include all details in message: "schedule [name] on [date] at [time]"

### Issue: "Dialog doesn't appear"
**Cause**: Action object is malformed or missing required fields
**Fix**: Check server logs for action structure

## Next Steps

If debugging shows:
1. **Action detected but not sent**: Check server response formatting
2. **Action sent but not received**: Check client response parsing
3. **Action received but dialog not showing**: Check React component state and rendering
4. **Dialog showing but action not executing**: Check `/api/ai-assistant/action` endpoint

## Test Command

Try this exact command with a known client:
```
schedule [YourClientName] on 11/15 at 2pm
```

Watch both browser console and server logs for the complete flow.

