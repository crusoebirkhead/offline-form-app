# Task 6.2: Implement Auth0 Login Flow

**Phase:** 6 — Auth0 Integration
**Status:** Not Started
**Depends on:** 6.1, 3.1

---

## Description

Wire the Auth0 SDK into the Login screen to perform the full authentication flow: login, token storage, and session restoration.

## Scope

- In `LoginScreen.tsx`, call `auth0.webAuth.authorize()` when the user taps "Sign In"
- On successful auth:
  - Extract `accessToken`, `idToken`, and `refreshToken` from the response
  - Store tokens in `expo-secure-store` with keys like `auth_access_token`, `auth_refresh_token`
  - Navigate to HomeScreen
- On failure: display the error message inline
- Implement `getStoredToken(): Promise<string | null>` in `auth0.ts`:
  - Reads the access token from secure store
  - Checks if expired (decode JWT and compare `exp` claim)
  - If expired but refresh token exists, attempt silent refresh
  - Return valid token or null
- Implement `logout()` in `auth0.ts`:
  - Call `auth0.webAuth.clearSession()`
  - Remove tokens from secure store
  - Navigate back to LoginScreen

## Acceptance Criteria

- [ ] Tapping "Sign In" opens the Auth0 Universal Login
- [ ] On success, tokens are stored in `expo-secure-store`
- [ ] On success, the app navigates to HomeScreen
- [ ] `getStoredToken()` returns a valid token or null
- [ ] Expired tokens trigger a silent refresh via the refresh token
- [ ] `logout()` clears the session and tokens
- [ ] Login works on both iOS and Android
