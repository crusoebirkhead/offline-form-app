# Task 2.2: Port Form.io Theme CSS

**Phase:** 2 — WebView Form Renderer
**Status:** Not Started
**Depends on:** 2.1

---

## Description

Port the custom Form.io theme CSS from the gryphon-central-tenant POC branch into the mobile app's WebView assets. This ensures forms look consistent with the web application.

## Scope

- Copy `gryphon-central-tenant/app/formio-theme.css` (1557 lines) to `src/webview/formio-theme.css`
- Review and adjust any web-specific styles that don't work in a mobile WebView context:
  - Remove or adjust hover-only states that have no mobile equivalent
  - Verify touch targets meet 44px minimum for mobile
  - Adjust any viewport-dependent `clamp()` or `vw` units for mobile screen sizes
  - Ensure font sizes are legible on small screens
- Reference the CSS from `form-shell.html`

## Acceptance Criteria

- [ ] `formio-theme.css` exists at `src/webview/formio-theme.css`
- [ ] CSS is loaded by `form-shell.html` without external network requests
- [ ] Form inputs render with the custom theme (floating labels, 56px input height, 12px radius)
- [ ] Touch targets are at least 44px on all interactive elements
- [ ] Forms are visually usable on a 320px-wide screen
- [ ] No broken styles or unsupported CSS features in iOS Safari WebView or Android WebView
