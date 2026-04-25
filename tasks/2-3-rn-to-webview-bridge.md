# Task 2.3: Implement RN to WebView Bridge

**Phase:** 2 — WebView Form Renderer
**Status:** Not Started
**Depends on:** 2.1

---

## Description

Build the React Native side of the bridge that sends messages into the WebView. This is how the app injects form schemas and existing submission data into the Form.io renderer.

## Scope

- Create a `FormWebView` component in `src/components/form-webview/FormWebView.tsx`
- Use `react-native-webview` with a ref to call `webViewRef.current.injectJavaScript()`
- Implement outbound message functions:
  - `loadForm(schema: object, submission?: object)` — serializes and posts a `LOAD_FORM` message to the WebView
  - `getSubmission()` — posts a `GET_SUBMISSION` request and awaits the response via a promise/callback pattern
- Load `form-shell.html` as the WebView source from local assets
- Disable all external navigation in the WebView (forms should not navigate away)

## Acceptance Criteria

- [ ] `FormWebView` component renders a WebView with the local HTML shell
- [ ] `loadForm()` successfully injects a Form.io schema and the form renders in the WebView
- [ ] `loadForm()` with an existing submission pre-fills the form fields
- [ ] `getSubmission()` returns the current form data as a JavaScript object
- [ ] WebView does not allow navigation to external URLs
- [ ] Component exposes methods via `forwardRef` + `useImperativeHandle` or a callback-based API
