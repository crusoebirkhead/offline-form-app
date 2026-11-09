# Task 11: Update Offline App Environment Configuration

**Type:** Code
**Phase:** 3 — Offline App Changes
**Dependencies:** Task 01 (Auth0 audience), Task 06 (API Gateway URL)

## Description

Update the offline app's environment variables and build configuration to point to the new Lambda proxy and use the correct Auth0 audience. Remove the Form.io API key from the configuration since it is now server-side only.

## Scope

- Update `.env` and `.env.example`
- Update `app.config.ts` to remove API key references
- Update Auth0 audience to the new API resource

## Implementation Details

### `.env` changes

```env
# Auth0 — update audience to the new API resource (Task 01)
AUTH0_DOMAIN=periscope365-dev.us.auth0.com
AUTH0_CLIENT_ID=cR6UolzJBooTJ1jdmspywTAUjlBLKRPq
AUTH0_AUDIENCE=https://api.periscope365.com/formio

# Form.io proxy — point to Lambda API Gateway (Task 06)
EXPO_PUBLIC_FORMIO_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com

# Remove these lines:
# EXPO_PUBLIC_FORMIO_API_KEY=...   ← DELETE (now server-side in Secrets Manager)
```

### `.env.example` changes

```env
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_AUDIENCE=

EXPO_PUBLIC_PERISCOPE_BASE_URL=
EXPO_PUBLIC_FORMIO_BASE_URL=

# EXPO_PUBLIC_FORMIO_API_KEY is intentionally absent — the API key
# lives in AWS Secrets Manager and is never exposed to the client.
```

### `app.config.ts` changes

Remove `FORMIO_API_KEY` from the `extra` block:

```typescript
extra: {
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  // FORMIO_API_KEY removed — no longer client-side
}
```

### `src/auth/auth0.ts` changes

Verify the `audience` parameter in `authorize()` and `refreshToken()` calls uses the value from `Constants.expoConfig?.extra?.AUTH0_AUDIENCE`. It already does — no code change needed, just confirm.

## Acceptance Criteria

- [ ] `.env` contains `EXPO_PUBLIC_FORMIO_BASE_URL` pointing to the API Gateway URL
- [ ] `.env` contains updated `AUTH0_AUDIENCE` matching the API resource from Task 01
- [ ] `EXPO_PUBLIC_FORMIO_API_KEY` does not appear in `.env`, `.env.example`, or `app.config.ts`
- [ ] `.env.example` documents all required variables with a comment explaining the absent API key
- [ ] `app.config.ts` no longer references `FORMIO_API_KEY` in the `extra` block
- [ ] Auth0 login flow requests tokens scoped to the new audience
- [ ] App builds successfully with `npx expo prebuild` after config changes
- [ ] `grep -r "FORMIO_API_KEY" src/` returns no results
