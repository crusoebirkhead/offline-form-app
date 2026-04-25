# Task 4.3: Implement Send to Periscope Portal Flow

**Phase:** 4 — Send to Periscope Portal
**Status:** Not Started
**Depends on:** 4.1, 3.4

---

## Description

Wire the "Send to Periscope Portal" button on the Form screen to the Periscope API client. This is the user-facing flow for submitting saved assessment data to the legacy system.

## Scope

- In `FormScreen.tsx`, wire the "Send to Periscope Portal" button:
  1. Check network connectivity via `useNetworkStatus`
  2. If offline, show a message: "You must be online to send to Periscope Portal"
  3. If online, save current form state first (same as Save flow)
  4. Call `submitAssessment()` from `periscope.ts` with the entry data
  5. On success: update entry status to `sent`, set `sent_at` timestamp, show success message
  6. On failure: show error message with the reason, keep status as-is
- Disable the button if entry status is already `sent`
- Show a loading spinner during the submission

## Acceptance Criteria

- [ ] "Send to Periscope Portal" button calls `submitAssessment()` when tapped
- [ ] Button is disabled when offline (with explanatory message)
- [ ] Button is disabled when entry status is already `sent`
- [ ] Current form data is saved to SQLite before sending
- [ ] On success, entry status updates to `sent` and `sent_at` is set
- [ ] On success, a confirmation message is shown
- [ ] On failure, an error message is shown with the reason
- [ ] A loading indicator is visible during the API call
- [ ] The entry list on HomeScreen reflects the updated status after navigating back
