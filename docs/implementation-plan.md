# Implementation Plan: Offline-First React Native Form.io App

**Date:** 2026-04-24
**Status:** Approved
**Platforms:** iOS + Android (Expo managed workflow)

---

## Requirements

Build a bare-bones React Native mobile application that allows field users to complete Form.io assessment forms without internet connectivity.

1. **Render Form.io forms offline** — JSON schemas stored locally, rendered without a server
2. **Save form submissions locally** — "Save" button persists data to on-device storage
3. **View/edit saved entries** — list of saved assessments, tap to continue or edit
4. **New Assessment flow** — "New Assessment" button -> select form type -> begin filling
5. **Send to Periscope Portal** — when online, push saved JSON to the legacy CodeIgniter/FileMaker system via a bulk endpoint (Option B)
6. **Auth0 protection** — login gate (offline auth strategy TBD later)
7. **Schema sync** — when online, pull latest Form.io JSON schemas from the hosted Docker container

---

## Context: Existing Systems

### gryphon-central-tenant (New-Gen NextJS App)

- **Framework:** Next.js 14 with App Router
- **Form.io SDK:** `@formio/js@^5.3.1` loaded via dynamic `import("@formio/js")`
- **Form.io Docker:** Community edition, proxied through `/api/formio/*` -> `FORMIO_BASE_URL`
- **Form Assembly:** Config-driven (`config.json`) matching by `clientId`, `state`, `requestType` with wildcard fallback
- **32 assessment sections** defined in config with ordering
- **Schema fixtures:** JSON files in `app/utils/formAssembler/sections/*.json`
- **Draft auto-save:** Debounced 5s via `form.on("change")`, POST/PUT to Form.io `/submission` endpoint
- **Auth:** Auth0 via `@auth0/nextjs-auth0@^3.2.0`
- **Styling:** Custom `formio-theme.css` (1557 lines) with design tokens

**Key files on feature/formio-poc branch:**

| Purpose | Path |
|---------|------|
| Form Renderer | `app/admin/assessments/components/FormioRenderer.tsx` |
| Form Section Wrapper | `app/admin/assessments/components/FormioSection.tsx` |
| Form Assembler Service | `app/utils/formAssembler.ts` |
| Form Assembler Config | `app/utils/formAssembler/config.json` |
| Section Fixtures | `app/utils/formAssembler/sections/*.json` |
| Form.io Proxy | `app/api/formio/[...path]/route.ts` |
| Types | `app/types/formAssembler.d.ts` |
| CSS Theme | `app/formio-theme.css` |
| Env Config | `.env.local.example` |

### periscope365-legacy (CodeIgniter 3 App)

- **Framework:** CodeIgniter 3 (PHP 7.4+/8.0+)
- **Database:** FileMaker Server (REST API via `Fm_rest` library)
- **Form data:** Stored as JSON blob in `data_json` field on `cwp_request_detail` layout
- **30+ form sections** each with dedicated controller (`/form/{section}/store`)
- **Submission:** `POST /pvt/assessment/store` -> `Request_model->complete()` -> FileMaker script `web__submit_request`
- **Auth:** Session-based with optional TOTP 2FA
- **User roles:** Therapist, Health Plan, Tech Support, Consultant, Reviewer

**Assessment statuses:** Assigned -> Scheduled -> Assessed -> Submitted -> Completed (also On-Hold, Cancelled)

**Request record structure:**

```
id, assessment_id, data_json, id_patient, id_therapist,
id_payer, web_status, date_assessed, legacy flag
```

---

## Architecture Decision: Form.io Rendering in React Native

Form.io's `@formio/js` SDK is browser-only (DOM-dependent). Three options evaluated:

| Approach | Pros | Cons |
|----------|------|------|
| A. Full WebView app | Reuses `@formio/js` + CSS; full feature parity | Heavy; less native feel |
| B. Custom native renderer | Fully native UX; better performance | Enormous effort for 30+ component types; maintenance burden |
| **C. Hybrid (selected)** | Native nav/lists + WebView for forms only | WebView-RN bridge needed |

**Decision: Option C (Hybrid).** Native UI for navigation, entry list, and sync. WebView exclusively for form rendering where Form.io's JS SDK handles all conditional logic, validation, and component rendering.

---

## Project Structure

```
src/
├── app/                    # Navigation & screens
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx       # Entry list + "New Assessment" button
│   ├── FormScreen.tsx       # WebView form renderer
│   └── navigation.tsx
├── components/
│   ├── entry-list/
│   │   ├── EntryCard.tsx
│   │   └── EntryList.tsx
│   ├── form-picker/
│   │   └── FormTypePicker.tsx
│   └── sync-status/
│       └── SyncBanner.tsx
├── db/
│   ├── schema.ts            # SQLite table definitions
│   ├── entries.ts           # CRUD for saved form entries
│   └── schemas.ts           # CRUD for cached Form.io schemas
├── services/
│   ├── sync.ts              # Schema sync + submission push
│   ├── formio.ts            # Form.io API client
│   └── periscope.ts         # Legacy API client
├── hooks/
│   ├── useNetworkStatus.ts
│   ├── useEntries.ts
│   └── useFormSchemas.ts
├── webview/
│   ├── form-shell.html      # HTML shell loaded in WebView
│   └── formio-theme.css     # Ported from gryphon-central-tenant
├── auth/
│   └── auth0.ts             # Auth0 configuration
└── types/
    ├── entry.ts
    └── formSchema.ts
```

---

## Data Models

### Entry (saved form submission)

```typescript
interface Entry {
  id: string;              // UUID
  formType: string;        // e.g., "general-information"
  formTitle: string;       // e.g., "General Information"
  dataJson: string;        // Stringified Form.io submission data
  status: 'draft' | 'completed' | 'sent';
  createdAt: string;       // ISO 8601 timestamp, e.g. "2026-04-24T14:30:00.000Z"
  updatedAt: string;       // ISO 8601 timestamp
  sentAt: string | null;   // ISO 8601 timestamp or null
}
```

### CachedFormSchema

```typescript
interface CachedFormSchema {
  id: string;
  formPath: string;        // e.g., "general-information"
  title: string;
  jsonSchema: string;      // Full Form.io form JSON (components, layout, etc.)
  version: string;         // ETag or hash for sync diffing
  updatedAt: string;       // ISO 8601 timestamp
}
```

### WebView Bridge Protocol

```typescript
// RN -> WebView messages
type InjectMessage =
  | { type: 'LOAD_FORM'; schema: object; submission?: object }
  | { type: 'GET_SUBMISSION' };

// WebView -> RN messages
type BridgeMessage =
  | { type: 'FORM_READY' }
  | { type: 'FORM_CHANGE'; data: object }
  | { type: 'FORM_SUBMIT'; data: object }
  | { type: 'SUBMISSION_DATA'; data: object }
  | { type: 'VALIDATION_ERROR'; errors: object[] };
```

---

## Implementation Phases

### Phase 0: Project Scaffolding (Low complexity)

| Step | Detail |
|------|--------|
| 0.1 | Initialize Expo project with TypeScript (`npx create-expo-app --template blank-typescript`) |
| 0.2 | Install core dependencies: `react-native-webview`, `expo-sqlite`, `expo-file-system`, `expo-secure-store`, `@react-navigation/native` + `@react-navigation/native-stack`, `react-native-auth0` |
| 0.3 | Set up project structure (feature-based) |
| 0.4 | Configure TypeScript paths and ESLint |

### Phase 1: Local Database & Data Model (Medium complexity)

| Step | Detail |
|------|--------|
| 1.1 | Define SQLite schema for `form_schemas` table |
| 1.2 | Define SQLite schema for `entries` table |
| 1.3 | Build CRUD for entries: `createEntry`, `updateEntry`, `getEntries`, `getEntryById`, `deleteEntry` |
| 1.4 | Build CRUD for schemas: `upsertSchema`, `getSchemaByPath`, `getAllSchemas` |
| 1.5 | Seed initial Form.io JSON schemas by bundling fixture JSONs from gryphon-central-tenant |

### Phase 2: WebView Form Renderer (High complexity)

| Step | Detail |
|------|--------|
| 2.1 | Create `form-shell.html` — minimal HTML page that loads `@formio/js` from bundled assets (no CDN) |
| 2.2 | Port `formio-theme.css` from the POC branch into WebView assets |
| 2.3 | Implement RN -> WebView bridge: `postMessage` to inject form schema JSON + existing submission data |
| 2.4 | Implement WebView -> RN bridge: `onMessage` to capture form change and submit events |
| 2.5 | Handle "Save" button — captures current form state via bridge, persists to SQLite |
| 2.6 | Handle form validation — Form.io's built-in validation in WebView, surface errors natively |

**Key concern:** Bundling `@formio/js` for offline use. The WebView HTML must load the JS library from local assets, not a CDN. Bundle `formio.full.min.js` as an Expo asset.

### Phase 3: Screens & Navigation (Medium complexity)

| Step | Detail |
|------|--------|
| 3.1 | **LoginScreen** — Auth0 universal login, store tokens in `expo-secure-store`. Placeholder for offline auth. |
| 3.2 | **HomeScreen** — Header with "New Assessment" button + sync status banner. Scrollable list of saved entries. |
| 3.3 | **FormTypePicker** — Modal showing available form types from cached schemas. Tapping creates Entry, navigates to FormScreen. |
| 3.4 | **FormScreen** — WebView form renderer with "Save" and "Send to Periscope Portal" toolbar buttons. |
| 3.5 | Stack navigation: `LoginScreen -> HomeScreen -> FormTypePicker -> FormScreen` |

**Entry list status indicators:**

- **Draft** (yellow) — in-progress, can continue editing
- **Completed** (green) — all required fields filled, ready to send
- **Sent** (gray) — successfully pushed to Periscope Portal

### Phase 4: "Send to Periscope Portal" Integration (Medium complexity)

**Approach: Option B — single bulk endpoint accepting entire `data_json` blob.** A combination of legacy development and manual intervention will handle the data transition to FileMaker.

| Step | Detail |
|------|--------|
| 4.1 | Build `periscope.ts` service — HTTP client for posting form JSON to legacy |
| 4.2 | Implement new bulk API endpoint on legacy CodeIgniter side that accepts full `data_json` and creates/updates request |
| 4.3 | Handle auth — add token-based authentication to the legacy endpoint (or proxy through gryphon backend) |
| 4.4 | Send flow: check connectivity -> authenticate -> POST data -> update entry status to `sent` |
| 4.5 | Failure handling: queue for retry, clear error messages |

**Legacy backend work required:**

- New controller/endpoint: `POST /api/mobile/assessment/submit`
- Accepts: `{ data_json: {...}, form_type: "...", patient_id: "..." }`
- Creates FileMaker request record with full JSON blob
- Returns: request ID + status
- Manual intervention + legacy development handles FileMaker data transition

### Phase 5: Schema Sync (Medium complexity)

| Step | Detail |
|------|--------|
| 5.1 | Build `formio.ts` service — fetches schemas from Form.io Docker via proxy pattern |
| 5.2 | On app launch (if online): compare local schema versions with server, pull updates |
| 5.3 | Store updated schemas in SQLite with version hashes |
| 5.4 | Use `config.json` from form assembler to determine which forms to sync |
| 5.5 | UI: sync status banner (last synced timestamp, update count) |

**Sync strategy:**

- First install: bundled seed schemas loaded from assets
- Each app open (if online): background sync compares ETags/modified dates
- Manual "Sync Now" button
- Never blocks the user — stale schemas are better than no schemas

### Phase 6: Auth0 Integration (Low complexity)

| Step | Detail |
|------|--------|
| 6.1 | Configure `react-native-auth0` with Auth0 domain/clientId |
| 6.2 | Login flow: Auth0 Universal Login -> store tokens in `expo-secure-store` |
| 6.3 | Protect screens behind auth check |
| 6.4 | **Offline auth (deferred):** Cache last successful login; if offline and token in secure store, allow access |

---

## Build Order

```
Phase 0 (Scaffolding)
  -> Phase 1 (Database)
    -> Phase 2 (WebView Renderer)
      -> Phase 3 (Screens & Nav)
        -> Phase 5 (Schema Sync)
          -> Phase 6 (Auth0)
            -> Phase 4 (Periscope Integration) -- last, requires backend work
```

Phase 4 is last because it requires a new endpoint on the legacy CodeIgniter side. Everything else can be built and tested independently with local data.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Form.io JS SDK in WebView performance | HIGH | Profile early; consider pre-rendering; lazy-load sections |
| Bundling `@formio/js` for offline (~2MB) | HIGH | Include built JS file as asset; test on both platforms; verify no CDN calls |
| Form.io conditional logic offline | MEDIUM | JS SDK handles this in-browser; verify no server-side evaluation needed |
| Legacy API integration for bulk submit | HIGH | Requires backend work on CodeIgniter side; plan endpoint early |
| SQLite data loss on app uninstall | MEDIUM | Document risk; consider backup-to-cloud when online |
| Auth0 token expiry while offline | MEDIUM | Deferred; use long-lived refresh tokens; grace period for offline use |
| Form schema drift (local != server) | LOW | Version tracking + sync-on-connect; seed with latest at build time |

---

## Open Items

- [ ] Auth0 offline strategy specifics (deferred per requirements)
- [ ] Legacy bulk endpoint design and implementation
- [ ] FileMaker data transition workflow for manually received submissions
- [ ] App Store / Play Store distribution strategy (or enterprise sideloading?)
- [ ] Patient/member identification in offline context (how does the mobile user specify which patient an assessment is for?)
