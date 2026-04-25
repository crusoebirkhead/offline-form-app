# Task 5.3: Wire Sync Status to UI

**Phase:** 5 — Schema Sync
**Status:** Not Started
**Depends on:** 5.2, 3.2

---

## Description

Connect the schema sync service to the UI so users can see when schemas were last synced, trigger a manual sync, and understand what happened during sync.

## Scope

- Update `SyncBanner` component (created in Task 3.2) to display:
  - Online/offline indicator (from `useNetworkStatus`)
  - Last sync timestamp (from `getLastSyncTimestamp()`)
  - A "Sync Now" button that triggers `syncSchemas()` manually
  - During sync: a spinner or progress indicator
  - After sync: brief summary (e.g., "2 forms updated" or "All forms up to date")
- Trigger `syncSchemas()` automatically on app launch via a `useEffect` in the root navigator or HomeScreen
- Show a non-blocking notification if sync fails (do not block the user from using the app)

## Acceptance Criteria

- [ ] SyncBanner shows the last sync timestamp in a human-readable format
- [ ] SyncBanner shows online/offline status
- [ ] "Sync Now" button triggers a manual sync
- [ ] Sync progress is indicated visually (spinner or progress bar)
- [ ] Sync result summary is shown briefly after completion
- [ ] Sync failure shows a non-blocking warning (does not prevent app usage)
- [ ] Auto-sync runs on app launch without blocking the HomeScreen render
