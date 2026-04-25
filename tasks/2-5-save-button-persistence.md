# Task 2.5: Handle Save Button and Local Persistence

**Phase:** 2 — WebView Form Renderer
**Status:** Not Started
**Depends on:** 2.4, 1.3

---

## Description

Wire the "Save" action to capture the current form state from the WebView and persist it to SQLite. This is the core offline-save flow that lets users fill forms without connectivity.

## Scope

- Add a "Save" button in the native UI layer above or below the WebView (not inside the WebView)
- On press:
  1. Call `getSubmission()` on the `FormWebView` ref to retrieve current form data
  2. Call `updateEntry(entryId, { dataJson: JSON.stringify(data) })` to persist to SQLite
  3. Show a brief success indicator (toast or inline confirmation)
- Optionally wire `onFormChange` to auto-save on a debounced interval (e.g., 30 seconds) as a safety net
- Handle save failures gracefully with a visible error message

## Acceptance Criteria

- [ ] Tapping "Save" retrieves the current form data from the WebView
- [ ] Form data is persisted to the `entries` table in SQLite
- [ ] A success indicator appears briefly after a successful save
- [ ] Reopening a saved entry pre-fills the form with the previously saved data
- [ ] Save works completely offline (no network calls)
- [ ] If the WebView bridge fails to return data, an error message is shown (not a silent failure)
