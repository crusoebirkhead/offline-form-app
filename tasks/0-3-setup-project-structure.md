# Task 0.3: Set Up Project Structure

**Phase:** 0 — Project Scaffolding
**Status:** Done
**Depends on:** 0.1

---

## Description

Create the feature-based directory structure that all subsequent tasks will use. Populate each directory with a placeholder or barrel file so the structure is visible in version control.

## Scope

Create the following directory tree under `src/`:

```
src/
├── app/           # Screens and navigation
├── components/
│   ├── entry-list/
│   ├── form-picker/
│   └── sync-status/
├── db/            # SQLite schema and CRUD
├── services/      # API clients (sync, formio, periscope)
├── hooks/         # Custom React hooks
├── webview/       # HTML shell and CSS for Form.io WebView
├── auth/          # Auth0 configuration
└── types/         # Shared TypeScript types
```

- Add a `.gitkeep` or minimal index file in each directory
- Update `tsconfig.json` path aliases so `@/` maps to `src/`

## Acceptance Criteria

- [x] All directories listed above exist
- [x] Path alias `@/` resolves to `src/` in TypeScript imports
- [x] Project still compiles after `tsconfig.json` changes
