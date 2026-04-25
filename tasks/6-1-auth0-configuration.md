# Task 6.1: Configure Auth0 for React Native

**Phase:** 6 — Auth0 Integration
**Status:** Not Started
**Depends on:** 0.2

---

## Description

Set up the Auth0 SDK for React Native and configure it to work with the existing Auth0 tenant used by gryphon-central-tenant.

## Scope

- Create `src/auth/auth0.ts`
- Initialize `react-native-auth0` with the Auth0 domain and client ID
- Create a configuration file or use environment variables for:
  - `AUTH0_DOMAIN`
  - `AUTH0_CLIENT_ID`
  - `AUTH0_AUDIENCE` (if API access is needed for Periscope Portal calls)
- Configure the native platform settings:
  - **iOS:** Add the Auth0 callback URL scheme in `Info.plist`
  - **Android:** Add the Auth0 callback URL scheme in `AndroidManifest.xml` / `build.gradle`
- Register the mobile app's callback URLs in the Auth0 dashboard (document the required URLs)

## Acceptance Criteria

- [ ] `auth0.ts` exports a configured Auth0 client instance
- [ ] Auth0 domain and client ID are configurable (not hardcoded)
- [ ] iOS callback URL scheme is configured in the Expo/native config
- [ ] Android callback URL scheme is configured in the Expo/native config
- [ ] Documentation exists for what needs to be set in the Auth0 dashboard
- [ ] Auth0 client can be imported and used from any screen
