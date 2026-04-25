# Task 4.4: Implement Retry Queue for Failed Submissions

**Phase:** 4 — Send to Periscope Portal
**Status:** Not Started
**Depends on:** 4.3

---

## Description

Handle the case where a submission fails (network drop mid-request, server error, timeout). Failed submissions should be retryable without the user re-opening the form.

## Scope

- On the HomeScreen entry list, entries with status `completed` (not yet sent) should show a "Retry Send" action
- Tapping "Retry Send" on an entry card re-attempts the `submitAssessment()` call
- Add a "Send All" button on HomeScreen that batch-sends all `completed` entries sequentially
- Track submission attempts: if an entry fails 3+ times, surface a warning but do not block further retries
- Show per-entry feedback during batch send (progress indicator)

## Acceptance Criteria

- [ ] Entries with status `completed` show a "Retry Send" action on HomeScreen
- [ ] Tapping "Retry Send" attempts to submit that single entry
- [ ] "Send All" button attempts to submit all `completed` entries
- [ ] Each entry shows individual success/failure feedback during batch send
- [ ] Entries that fail 3+ times show a warning indicator
- [ ] Successfully sent entries update to `sent` status immediately
- [ ] Batch send stops gracefully if the device goes offline mid-batch
