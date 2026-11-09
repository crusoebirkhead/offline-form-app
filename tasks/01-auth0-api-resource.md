# Task 01: Create Auth0 API Resource

**Type:** Manual (Infrastructure)
**Phase:** 1 — Identity Setup
**Dependencies:** None

## Description

Register a new API resource (audience) in the Auth0 tenant that represents the Form.io Lambda proxy. The offline app will request access tokens scoped to this audience, and API Gateway will validate tokens against it.

This is separate from the existing `https://periscope365-dev.us.auth0.com/api/v2/` audience currently configured in the offline app — that audience is Auth0's own Management API and should not be used for your application APIs.

## Scope

- Create a new API in Auth0 Dashboard > Applications > APIs
- Configure token settings (lifetime, signing algorithm)
- Update the offline app's `AUTH0_AUDIENCE` to use the new audience
- Optionally define permissions/scopes (e.g., `read:schemas`)

## Steps

1. Go to **Auth0 Dashboard > Applications > APIs > Create API**
2. Set:
   - **Name:** `Periscope Form.io Proxy`
   - **Identifier (Audience):** `https://api.periscope365.com/formio` (or your domain — this is a logical identifier, not a real URL)
   - **Signing Algorithm:** RS256
3. Under **Settings**:
   - **Token Expiration:** 3600 (1 hour)
   - **Token Expiration for Browser Flows:** 7200
   - **Allow Offline Access:** Enabled (allows refresh tokens)
4. Under **Permissions** (optional but recommended):
   - Add scope: `read:schemas` — "Read form schemas"
5. Under **Machine to Machine Applications**:
   - Ensure the offline app's Auth0 Application (`cR6UolzJBooTJ1jdmspywTAUjlBLKRPq`) is authorized

## Acceptance Criteria

- [x] New API resource exists in Auth0 with audience identifier set
- [x] Signing algorithm is RS256 (not HS256)
- [x] Offline Access is enabled
- [x] The offline app's existing Auth0 Application is authorized to request tokens for this audience
- [x] A test token can be obtained via Auth0's "Test" tab or by logging in from the offline app with the updated audience
- [x] The JWKS endpoint (`https://periscope365-dev.us.auth0.com/.well-known/jwks.json`) returns the RS256 public key used to sign tokens for this audience
