# Task 6.4: Implement Offline Auth Placeholder

**Phase:** 6 — Auth0 Integration
**Status:** Not Started
**Depends on:** 6.3

---

## Description

Implement a temporary offline authentication strategy so users who have previously logged in can continue using the app when offline. The full offline auth strategy will be designed later — this task implements the interim approach.

## Scope

- In the auth guard logic (Task 6.3), add an offline branch:
  1. If offline AND a cached token exists in `expo-secure-store` (even if expired): allow access
  2. If offline AND no cached token exists: show LoginScreen with a message "Internet connection required for first sign-in"
  3. If online: use the normal Auth0 flow
- When in offline mode, show a persistent "Offline Mode" banner on HomeScreen
- Disable features that require connectivity when offline:
  - "Send to Periscope Portal" button (already handled in Task 4.3)
  - "Sync Now" button (already handled in Task 5.3)
- Log the user out if the cached token is older than a configurable threshold (e.g., 30 days) as a safety measure

## Acceptance Criteria

- [ ] Previously authenticated users can access the app when offline
- [ ] First-time users who have never logged in cannot bypass auth when offline
- [ ] "Offline Mode" banner is visible when the app is used offline
- [ ] Online-only features are visibly disabled with explanatory messages
- [ ] Cached tokens older than the configurable threshold force re-authentication when online
- [ ] Transitioning from offline to online does not disrupt the user's current work
