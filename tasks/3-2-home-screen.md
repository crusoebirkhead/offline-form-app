# Task 3.2: Build Home Screen with Entry List

**Phase:** 3 — Screens & Navigation
**Status:** Not Started
**Depends on:** 0.3, 1.3

---

## Description

Create the Home screen — the main hub of the app. It shows a list of saved entries and a prominent "New Assessment" button.

## Scope

- Create `src/app/HomeScreen.tsx`
- Create `src/components/entry-list/EntryList.tsx` — a scrollable list of entries from SQLite
- Create `src/components/entry-list/EntryCard.tsx` — a card for each entry showing:
  - Form title (e.g., "General Information")
  - Status badge: Draft (yellow), Completed (green), Sent (gray)
  - Last modified timestamp (relative, e.g., "2 hours ago")
- Create `src/components/sync-status/SyncBanner.tsx` — a small banner at the top showing:
  - Online/offline indicator
  - Last schema sync timestamp
- Add a "New Assessment" button (floating action button or header button) that navigates to FormTypePicker
- Tapping an entry card navigates to FormScreen with that entry's data
- Create `src/hooks/useEntries.ts` — hook that loads entries from SQLite and re-fetches on focus

## Acceptance Criteria

- [ ] Home screen shows a scrollable list of all saved entries
- [ ] Entries are sorted by most recently updated first
- [ ] Each entry card displays form title, status badge, and relative timestamp
- [ ] "New Assessment" button is visible and navigates to the form type picker
- [ ] Tapping an entry card navigates to FormScreen with the entry ID
- [ ] Empty state is handled (message like "No saved assessments" when list is empty)
- [ ] Sync banner shows current online/offline status
- [ ] Entry list refreshes when navigating back from FormScreen
