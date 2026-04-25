# Task 6.3: Implement Auth Guard on Navigation

**Phase:** 6 — Auth0 Integration
**Status:** Not Started
**Depends on:** 6.2, 3.5

---

## Description

Protect all app screens behind an authentication check. Unauthenticated users should only see the Login screen. Authenticated users should bypass Login automatically.

## Scope

- In `navigation.tsx`, add an auth state check on app launch:
  1. Call `getStoredToken()` to check for a valid cached token
  2. If valid token exists, set initial route to `Home`
  3. If no valid token, set initial route to `Login`
- Show a splash/loading screen while the token check is in progress (avoid a flash of Login screen)
- If a token expires mid-session (e.g., API call returns 401), redirect to Login with a message
- Add a "Sign Out" option accessible from HomeScreen (e.g., in header or settings)

## Acceptance Criteria

- [ ] App shows a loading screen during the initial auth check
- [ ] Authenticated users land on HomeScreen without seeing Login
- [ ] Unauthenticated users land on LoginScreen
- [ ] Expired token mid-session redirects to Login with an explanatory message
- [ ] "Sign Out" button calls `logout()` and returns to LoginScreen
- [ ] Auth state transitions are smooth (no flicker between screens)
