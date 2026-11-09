# Task 12: Update Sync Service to Use Batch Endpoint

**Type:** Code
**Phase:** 3 — Offline App Changes
**Dependencies:** Task 10

## Description

Update `src/services/sync.ts` to use the new `fetchAllSchemas()` batch endpoint instead of iterating over hardcoded form paths with individual fetches. This reduces sync from N network requests to 1, and the sync service no longer needs to maintain a list of known form paths — the server provides them.

## Scope

- Replace per-path fetch loop with single batch call
- Update ETag comparison logic to use per-schema ETags from the batch response
- Preserve offline-first behavior (seed schemas still work when offline)
- Update `useSync` hook if its interface changes

## Implementation Details

**File:** `src/services/sync.ts`

**Current flow (replace):**
```
for each hardcoded formPath:
  fetch single schema
  compare with local version
  upsert if changed
```

**New flow:**
```
1. Check network reachability (existing logic — keep)
2. Call fetchAllSchemas()
3. If null (offline, 401, error) → return { synced: false, reason }
4. For each schema in response:
   a. Get local version from SQLite (by formPath)
   b. Compare response etag with local version field
   c. If different: upsert into form_schemas table with new etag as version
5. Return { synced: true, updated: [...paths that changed] }
```

**Schema path discovery:**
The batch endpoint returns all available schemas from the Form.io server. New schemas added in Form.io will automatically appear in the offline app on next sync — no code change needed to add new form types.

**Handling removed schemas:**
If a schema exists locally but is not in the batch response, do NOT delete it. The form may have been removed from the server but the user may have in-progress entries using it. Add a `deprecated` flag or log a warning instead.

**File:** `src/db/schemas.ts`

May need a new function:
```typescript
export async function getAllLocalSchemas(db: SQLiteDatabase): Promise<CachedFormSchema[]>
```

## Acceptance Criteria

- [ ] `syncSchemas()` makes exactly 1 network request (to `/schemas`)
- [ ] Hardcoded form paths array is removed from sync.ts
- [ ] New schemas from the server are automatically discovered and stored locally
- [ ] Existing schemas are only updated when their ETag changes
- [ ] Schemas that exist locally but not in the server response are NOT deleted
- [ ] If `fetchAllSchemas()` returns null, sync returns `{ synced: false }` with a reason
- [ ] Seed schemas (from `src/db/seed.ts`) are unaffected — they still load on first launch
- [ ] `useSync` hook still exposes `triggerSync()` and `syncStatus` with the same interface
- [ ] TypeScript compiles without errors
- [ ] If batch endpoint returns partial failures (some schemas errored), successful ones are still synced
