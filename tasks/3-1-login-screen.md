# Task 3.1: Build Login Screen

**Phase:** 3 — Screens & Navigation
**Status:** Not Started
**Depends on:** 0.3, 6.1

---

## Description

Create the Login screen that gates access to the app via Auth0. This is the first screen users see when opening the app without a valid session.

## Scope

- Create `src/app/LoginScreen.tsx`
- Display the app name/logo and a "Sign In" button
- On press, trigger the Auth0 Universal Login flow via `react-native-auth0`
- On successful auth, store tokens in `expo-secure-store` and navigate to HomeScreen
- On failure, display an inline error message
- If a valid cached token exists on app launch, skip this screen and go directly to HomeScreen
- Placeholder for offline auth: if offline and a cached token exists, allow access with a "You are offline" banner

## Acceptance Criteria

- [ ] Login screen renders with app branding and a "Sign In" button
- [ ] Tapping "Sign In" opens the Auth0 Universal Login
- [ ] Successful login navigates to HomeScreen
- [ ] Auth tokens are stored in `expo-secure-store`
- [ ] Failed login shows an error message without crashing
- [ ] App auto-navigates past login if a valid token is cached
- [ ] Screen works on both iOS and Android
