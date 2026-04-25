# Task 2.4: Implement WebView to RN Bridge

**Phase:** 2 — WebView Form Renderer
**Status:** Not Started
**Depends on:** 2.3

---

## Description

Build the inbound message handler in the `FormWebView` component that receives events from the WebView (form changes, submissions, validation errors) and exposes them to the React Native layer.

## Scope

- Implement the `onMessage` handler on the `<WebView>` component
- Parse incoming JSON messages and dispatch by `type`:
  - `FORM_READY` — resolve any pending "form loaded" promise; notify parent component
  - `FORM_CHANGE` — forward changed `data` object to parent via callback prop
  - `FORM_SUBMIT` — forward submitted `data` object to parent via callback prop
  - `SUBMISSION_DATA` — resolve the pending `getSubmission()` promise with the data
  - `VALIDATION_ERROR` — forward `errors` array to parent via callback prop
- Define the `FormWebViewProps` interface with callback props:
  - `onFormReady?: () => void`
  - `onFormChange?: (data: object) => void`
  - `onFormSubmit?: (data: object) => void`
  - `onValidationError?: (errors: object[]) => void`

## Acceptance Criteria

- [ ] `onMessage` handler parses all five message types without crashing on malformed input
- [ ] `onFormReady` fires once after a form is successfully loaded
- [ ] `onFormChange` fires on every field change with the full form data object
- [ ] `onFormSubmit` fires when the user triggers form submission in the WebView
- [ ] `onValidationError` fires with an array of validation error objects
- [ ] Malformed or unknown message types are logged and silently ignored
