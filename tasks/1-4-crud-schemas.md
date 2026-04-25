# Task 1.4: Build CRUD Functions for Form Schemas

**Phase:** 1 — Local Database & Data Model
**Status:** Not Started
**Depends on:** 1.1

---

## Description

Implement the data access layer for cached Form.io schemas. These functions manage the local schema cache that enables offline form rendering.

## Scope

Create `src/db/schemas.ts` with the following functions:

- `upsertSchema(schema: Omit<CachedFormSchema, 'id'>): Promise<CachedFormSchema>` — inserts or replaces a schema by `form_path`, sets `updated_at`
- `getSchemaByPath(formPath: string): Promise<CachedFormSchema | null>` — returns a single schema or null
- `getAllSchemas(): Promise<CachedFormSchema[]>` — returns all cached schemas ordered by title

All functions return immutable results.

## Acceptance Criteria

- [ ] All three functions are exported from `src/db/schemas.ts`
- [ ] `upsertSchema` inserts a new row when `form_path` does not exist
- [ ] `upsertSchema` updates `json_schema`, `version`, and `updated_at` when `form_path` already exists
- [ ] `getSchemaByPath` returns `null` for an unknown path (does not throw)
- [ ] `getAllSchemas` returns an empty array when no schemas are cached
- [ ] Unit tests cover insert, update-on-conflict, and empty-state scenarios
