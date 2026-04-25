# Task 3.5: Wire Up Stack Navigation

**Phase:** 3 — Screens & Navigation
**Status:** Not Started
**Depends on:** 3.1, 3.2, 3.3, 3.4

---

## Description

Connect all screens into a cohesive navigation flow using React Navigation's native stack navigator.

## Scope

- Create `src/app/navigation.tsx`
- Define the stack navigator with the following screens:
  - `Login` — `LoginScreen` (initial route when unauthenticated)
  - `Home` — `HomeScreen` (initial route when authenticated)
  - `FormTypePicker` — `FormTypePicker` (presented as modal or pushed screen)
  - `Form` — `FormScreen` (receives `entryId` param)
- Define the navigation param types:

```typescript
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  FormTypePicker: undefined;
  Form: { entryId: string };
};
```

- Implement auth-gated routing: show Login stack if no valid token, Home stack if authenticated
- Create `src/hooks/useNetworkStatus.ts` — hook using `expo-network` to track connectivity, used by SyncBanner and Send button

## Acceptance Criteria

- [ ] App launches to LoginScreen when no cached auth token exists
- [ ] App launches to HomeScreen when a valid auth token is cached
- [ ] "New Assessment" on HomeScreen navigates to FormTypePicker
- [ ] Selecting a form type in FormTypePicker navigates to FormScreen with the entry ID
- [ ] Back navigation works correctly on all screens
- [ ] Navigation param types are fully typed (no `any` casts)
- [ ] `useNetworkStatus` returns current online/offline state and updates on change
