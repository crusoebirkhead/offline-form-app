# Task 2.1: Create WebView HTML Shell

**Phase:** 2 — WebView Form Renderer
**Status:** Not Started
**Depends on:** 0.2

---

## Description

Create the minimal HTML page that will be loaded inside a React Native WebView. This shell loads the Form.io JS SDK from a locally bundled file (no CDN) and provides the JavaScript bridge interface for communicating with React Native.

## Scope

- Create `src/webview/form-shell.html`
- Download and bundle `formio.full.min.js` (from `@formio/js` npm package, ~2MB) as a local asset
- The HTML shell should:
  - Load the bundled Form.io JS file via a local `<script>` tag
  - Expose a `window.loadForm(schema, submission?)` function that calls `Formio.createForm()`
  - Expose a `window.getSubmission()` function that returns current form data
  - Listen for messages from RN via `document.addEventListener('message', ...)` and dispatch to the appropriate handler
  - Post messages back to RN via `window.ReactNativeWebView.postMessage(JSON.stringify(msg))`
- Include a `<div id="formio-container">` where the form renders
- Include a `<link>` to the bundled `formio-theme.css`

## Acceptance Criteria

- [ ] `form-shell.html` exists at `src/webview/form-shell.html`
- [ ] `formio.full.min.js` is bundled as a local asset (no network requests to CDNs)
- [ ] The HTML page renders a Form.io form when `loadForm()` is called with a valid schema
- [ ] The page sends `FORM_READY` message after successful form mount
- [ ] The page sends `FORM_CHANGE` message on every field change
- [ ] `getSubmission()` returns the current form data as a JSON object
- [ ] The page works completely offline (no external script/style/font requests)
