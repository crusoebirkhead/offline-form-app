# Task 1.3: Build CRUD Functions for Entries

**Phase:** 1 — Local Database & Data Model
**Status:** Not Started
**Depends on:** 1.2

---

## Description

Implement the data access layer for form entries. These functions are the only way the rest of the app reads or writes entry data — all SQLite interaction is encapsulated here.

## Scope

Create `src/db/entries.ts` with the following functions:

- `createEntry(formType: string, formTitle: string): Promise<Entry>` — inserts a new row with status `draft`, generates UUID, sets timestamps
- `updateEntry(id: string, data: Partial<Pick<Entry, 'dataJson' | 'status'>>): Promise<Entry>` — updates `data_json` and/or `status`, bumps `updated_at`
- `getEntries(statusFilter?: Entry['status']): Promise<Entry[]>` — returns all entries ordered by `updated_at` DESC, optionally filtered by status
- `getEntryById(id: string): Promise<Entry | null>` — returns a single entry or null
- `deleteEntry(id: string): Promise<void>` — removes an entry by ID

All functions return immutable results (new objects, not mutated references).

## Acceptance Criteria

- [ ] All five functions are exported from `src/db/entries.ts`
- [ ] `createEntry` generates a unique ID and sets `created_at` / `updated_at` to current ISO timestamp
- [ ] `updateEntry` only modifies the fields provided and bumps `updated_at`
- [ ] `getEntries` returns results sorted by most recently updated first
- [ ] `getEntries` with a status filter returns only matching rows
- [ ] `getEntryById` returns `null` for a nonexistent ID (does not throw)
- [ ] `deleteEntry` is a no-op for a nonexistent ID (does not throw)
- [ ] Unit tests cover each function with at least one happy-path and one edge case
