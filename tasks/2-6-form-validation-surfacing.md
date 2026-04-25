# Task 2.6: Surface Form Validation Errors

**Phase:** 2 — WebView Form Renderer
**Status:** Not Started
**Depends on:** 2.4

---

## Description

Form.io's built-in validation runs inside the WebView. This task surfaces those validation results to the native layer so the app can show appropriate feedback and control whether the entry status can be set to "completed."

## Scope

- In `form-shell.html`, hook into Form.io's validation lifecycle:
  - After `form.checkValidity()`, send a `VALIDATION_ERROR` message with the errors array (or empty array if valid)
  - Trigger validation check when the user attempts to mark the form as complete
- In the native layer:
  - Receive validation errors via the `onValidationError` callback
  - Display a summary banner or alert listing the number of errors (e.g., "3 required fields are incomplete")
  - Prevent status change to "completed" if validation errors exist
  - Allow saving as "draft" regardless of validation state

## Acceptance Criteria

- [ ] Form.io validation errors are forwarded to the native layer via the bridge
- [ ] A native UI element displays the count or summary of validation errors
- [ ] Users cannot mark an entry as "completed" when required fields are missing
- [ ] Users can always save as "draft" regardless of validation state
- [ ] When all validation errors are resolved, the error summary disappears
- [ ] Validation runs on demand (not constantly) to avoid performance issues
