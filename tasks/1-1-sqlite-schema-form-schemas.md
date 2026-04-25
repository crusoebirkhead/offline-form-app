# Task 1.1: Define SQLite Schema for form_schemas Table

**Phase:** 1 — Local Database & Data Model
**Status:** Not Started
**Depends on:** 0.2

---

## Description

Create the SQLite table that stores cached Form.io JSON schemas locally. This table enables fully offline form rendering.

## Scope

- Create `src/db/schema.ts` with a function to initialize the database and create tables
- Define the `form_schemas` table:

```sql
CREATE TABLE IF NOT EXISTS form_schemas (
  id TEXT PRIMARY KEY,
  form_path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  json_schema TEXT NOT NULL,
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- Use `expo-sqlite` to open/create the database
- Run table creation on app startup

## Acceptance Criteria

- [ ] `schema.ts` exports an `initDatabase()` function
- [ ] Calling `initDatabase()` creates the `form_schemas` table if it does not exist
- [ ] Table columns match the `CachedFormSchema` type from the implementation plan
- [ ] Database file is created in the app's document directory
- [ ] Function is idempotent — safe to call on every app launch
