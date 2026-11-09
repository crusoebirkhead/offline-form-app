# Task 10: Update Offline App Form.io Service to Use Bearer Auth

**Type:** Code
**Phase:** 3 — Offline App Changes
**Dependencies:** Task 06 (API Gateway URL known)

## Description

Update `src/services/formio.ts` to authenticate with the Lambda proxy using the Auth0 access token (Bearer) instead of the Form.io API key (`x-token`). This aligns the Form.io service with how `src/services/periscope.ts` already authenticates.

## Scope

- Replace `x-token` header with `Authorization: Bearer` header
- Read token from SecureStore (same pattern as `periscope.ts`)
- Remove `EXPO_PUBLIC_FORMIO_API_KEY` usage
- Add a batch fetch function for the new `/schemas` endpoint
- Preserve the existing single-schema fetch as a fallback

## Implementation Details

**File:** `src/services/formio.ts`

**Current auth (remove):**
```typescript
headers: {
  'x-token': Constants.expoConfig?.extra?.FORMIO_API_KEY ?? '',
}
```

**New auth:**
```typescript
import * as SecureStore from 'expo-secure-store';

const token = await SecureStore.getItemAsync('auth_access_token');
headers: {
  'Authorization': `Bearer ${token}`,
}
```

**New function — batch fetch:**
```typescript
export async function fetchAllSchemas(): Promise<BatchSchemaResponse | null> {
  const token = await SecureStore.getItemAsync('auth_access_token');
  if (!token) return null;

  const baseUrl = Constants.expoConfig?.extra?.FORMIO_BASE_URL ?? '';
  const response = await fetch(`${baseUrl}/schemas`, {
    headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000), // longer timeout for batch
  });

  if (response.status === 401) {
    emitSessionExpired();
    return null;
  }

  if (!response.ok) return null;
  return response.json();
}
```

**Existing single-schema function** — update to use Bearer auth and keep as fallback:
```typescript
export async function fetchFormSchema(formPath: string): Promise<object | null> {
  const token = await SecureStore.getItemAsync('auth_access_token');
  if (!token) return null;

  const baseUrl = Constants.expoConfig?.extra?.FORMIO_BASE_URL ?? '';
  const response = await fetch(`${baseUrl}/schemas/${formPath}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'If-None-Match': lastKnownEtag ?? '',
    },
  });

  if (response.status === 304) return null; // no change
  if (response.status === 401) { emitSessionExpired(); return null; }
  if (!response.ok) return null;
  return response.json();
}
```

## Acceptance Criteria

- [ ] `x-token` header is no longer used anywhere in the codebase
- [ ] `EXPO_PUBLIC_FORMIO_API_KEY` is no longer referenced in `formio.ts` or `app.config.ts`
- [ ] `Authorization: Bearer <token>` is sent on all Form.io requests
- [ ] If no token is in SecureStore, functions return `null` without making a network request
- [ ] `fetchAllSchemas()` function exists and returns the batch response format
- [ ] `fetchFormSchema()` supports `If-None-Match` / 304 handling
- [ ] Both functions handle 401 by calling `emitSessionExpired()`
- [ ] TypeScript compiles without errors
- [ ] Existing seed schema fallback behavior is unaffected (no token needed for local seeds)
