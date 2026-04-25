# Task 5.2: Build Schema Sync Service

**Phase:** 5 — Schema Sync
**Status:** Not Started
**Depends on:** 5.1, 1.4

---

## Description

Create the sync service that compares locally cached schemas with the Form.io server and pulls updates when online. This runs on app launch and can be triggered manually.

## Scope

- Create `src/services/sync.ts`
- Implement `syncSchemas(): Promise<SyncResult>`:
  1. Check network connectivity — if offline, return early with `{ synced: false, reason: 'offline' }`
  2. Get the list of form paths to sync via `fetchAllFormPaths()`
  3. For each form path:
     a. Fetch the remote schema via `fetchFormSchema(formPath)`
     b. Compare the remote version with the locally cached version
     c. If different, call `upsertSchema()` to update the local cache
  4. Return a summary: `{ synced: true, updated: number, unchanged: number, failed: number }`
- Implement `getLastSyncTimestamp(): Promise<string | null>`:
  - Store and retrieve the last successful sync timestamp in SQLite or AsyncStorage
- Run `syncSchemas()` automatically on app launch (non-blocking background task)
- Expose a manual "Sync Now" trigger for the UI

## Acceptance Criteria

- [ ] `sync.ts` exports `syncSchemas` and `getLastSyncTimestamp`
- [ ] `syncSchemas` returns early without errors when offline
- [ ] `syncSchemas` only updates schemas that have actually changed (version comparison)
- [ ] `syncSchemas` does not block the app — runs as a background task
- [ ] Failed individual schema fetches do not abort the entire sync
- [ ] Last sync timestamp is persisted and retrievable
- [ ] `SyncResult` includes counts for updated, unchanged, and failed schemas
