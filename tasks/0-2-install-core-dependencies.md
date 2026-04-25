# Task 0.2: Install Core Dependencies

**Phase:** 0 — Project Scaffolding
**Status:** Not Started
**Depends on:** 0.1

---

## Description

Install all third-party packages required across the application. Group installs by concern to keep the dependency tree clear.

## Scope

Install the following packages:

**Navigation:**
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `react-native-screens`
- `react-native-safe-area-context`

**WebView:**
- `react-native-webview`

**Local storage:**
- `expo-sqlite`
- `expo-file-system`
- `expo-secure-store`

**Networking:**
- `expo-network` (for connectivity detection)

**Auth:**
- `react-native-auth0`

**Utilities:**
- `uuid` (or `expo-crypto` for UUID generation)

## Acceptance Criteria

- [ ] All packages install without peer dependency conflicts
- [ ] `npx expo start` still launches cleanly after installation
- [ ] `package.json` lists all dependencies above
- [ ] TypeScript can import each package without type errors (install `@types/*` where needed)
