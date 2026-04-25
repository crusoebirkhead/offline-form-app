# Task 3.4: Build Form Screen

**Phase:** 3 — Screens & Navigation
**Status:** Not Started
**Depends on:** 2.5, 3.3

---

## Description

Create the Form screen that hosts the WebView form renderer and provides the native toolbar with Save and Send actions. This is where users spend most of their time filling out assessments.

## Scope

- Create `src/app/FormScreen.tsx`
- Receive `entryId` as a navigation parameter
- On mount:
  1. Load the entry from SQLite via `getEntryById(entryId)`
  2. Load the form schema from SQLite via `getSchemaByPath(entry.formType)`
  3. Render the `FormWebView` component and call `loadForm(schema, existingSubmission)`
- Native toolbar with:
  - "Save" button — triggers the save flow from Task 2.5
  - "Send to Periscope Portal" button — triggers the send flow (disabled if offline or status is already "sent")
  - Back button — prompts "Save before leaving?" if there are unsaved changes
- Display the form title in the screen header
- Show a loading state while the form initializes in the WebView

## Acceptance Criteria

- [ ] Form screen loads the correct entry and schema based on the navigation parameter
- [ ] WebView renders the Form.io form with the schema
- [ ] Existing submission data is pre-filled when opening a previously saved entry
- [ ] "Save" button persists current data to SQLite
- [ ] "Send to Periscope Portal" button is present (functionality wired in Phase 4)
- [ ] Back navigation prompts to save if data has changed since last save
- [ ] Loading state is shown while the WebView initializes
- [ ] Screen works on both iOS and Android
