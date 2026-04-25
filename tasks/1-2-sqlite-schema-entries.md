# Task 1.2: Define SQLite Schema for entries Table

**Phase:** 1 — Local Database & Data Model
**Status:** Not Started
**Depends on:** 1.1

---

## Description

Create the SQLite table that stores locally saved form submissions (entries). Each entry represents one user-filled form that can be drafted, completed, or sent.

## Scope

- Add to `src/db/schema.ts` the `entries` table creation:

```sql
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  form_type TEXT NOT NULL,
  form_title TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed', 'sent')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT
);
```

- Add an index on `status` for filtered listing
- Add an index on `updated_at` for sort-by-recent

## Acceptance Criteria

- [ ] `initDatabase()` creates both `form_schemas` and `entries` tables
- [ ] `entries` table enforces the status CHECK constraint
- [ ] Indexes exist on `status` and `updated_at`
- [ ] Table columns match the `Entry` type from the implementation plan
- [ ] Existing data is preserved on re-launch (CREATE IF NOT EXISTS)
