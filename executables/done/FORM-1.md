# [FE] FORM-1: Normalize left alignment across all Form.io field types

## Overview

Fields in the rendered form are inconsistently indented from the left edge depending on field type. Question labels for radio-button fields (e.g. "Is this a pediatric member?") sit at one horizontal position, while bordered text inputs below them (e.g. "Hours per week received/requested") sit at a visibly different, slightly offset horizontal position. The result is a ragged left edge running down the form instead of a single clean vertical baseline.

Reference: Screenshot `Screenshot 2026-07-13 at 7.07.46 PM.png` (Desktop, humana-hha schema, "Is this a pediatric member?" section) — not checked into the repo; description above was verified directly against the image. A hand-drawn arrow in the screenshot points at the offset text input labeled "#1".

## Root Cause (hypothesis — verify before fixing)

`assets/webview/formio-theme.css`:
- Question-style labels use the generic rule `.col-form-label, .formio-component > label` (~line 166), which renders as normal block flow starting at the `.formio-component`'s own left edge — no explicit left inset.
- Text/select-style floating labels use `.formio-component-textfield > label`, etc. (~line 254), which are absolutely positioned at `left: var(--fio-px)` (16px) relative to the component, and the input border itself has no left margin either — so the *input border* sits at the component's left edge, but the *label text* is inset 16px from it (sitting on top of the border with padding).
- These are two different alignment systems (block-flow label vs. absolutely-positioned label-on-border) that were never reconciled to a single shared left baseline across field types (radio, checkbox, select, text, textarea, datagrid).

Confirm this diagnosis (or find the actual cause) by inspecting rendered output before making changes — don't assume the hypothesis above is complete.

## Atomic Subtasks

- [x] 1.a: Load at least 2 of the 3 bundled schemas (`src/assets/seed-schemas/standard-assessment.json`, `molina-hha-oh.json`, `pca-service-log.json`) via `expo start --web` and screenshot/inspect the left edges of: radio labels, checkbox labels, text input labels+borders, select labels+borders, textarea labels+borders, datagrid field labels
- [x] 1.b: Establish a single left baseline convention in `formio-theme.css` (e.g. all labels and all input borders share the same left inset, likely `var(--fio-px)` or `0`, applied consistently) and document the decision as a comment where the convention is defined
- [x] 1.c: Update the CSS rules for whichever field type(s) deviate from that baseline (radio/checkbox question labels are the most likely offenders per the screenshot, but re-verify against 1.a rather than assuming)
- [x] 1.d: Re-check the mobile media query block (~line 1670 `@media (max-width: 600px)`) for any left-padding overrides that could reintroduce the misalignment on mobile viewport widths specifically, since the bug was captured on a phone-sized WebView
- [x] 1.e: Re-run the visual check from 1.a across all schemas and confirm every field type now shares one consistent left edge

## Acceptance Criteria

- Labels and input borders for every field type (text, number, select, radio, checkbox, textarea, datagrid, date) align to the same left edge within the form card padding
- No regression to the floating-label behavior (label still floats up on focus/fill per existing `:has()` rules)
- Fix holds at mobile viewport width (≤600px), not just desktop

## Test / Verification

No existing automated visual-regression suite exists in this repo. Prefer a jsdom test asserting the computed `left`/`padding-left` values are equal across component types if practical; otherwise, verification is manual: load `molina-hha-oh.json` and `standard-assessment.json` via `expo start --web`, screenshot the rendered form, and confirm a single straight left edge. Document whichever approach was used in the Completion Summary.

## Dependencies

None.

## Completion Summary

**Verification approach:** Created a standalone HTML inspector (`form-inspector.html`) that renders each seed schema with Form.io and a Playwright script (`inspect-form.mjs`) that measures rendered `left`/`padding-left` values for label text and input borders on desktop (1024px) and mobile (375px) viewports.

**Baseline convention chosen:** Every field label's TEXT shares the same left inset, `var(--fio-px)` (16px), measured from the component's left edge. Question-style labels (radio, checkbox, selectboxes, datagrid, etc.) achieve this via `padding-left: var(--fio-px)` on the shared label rule. Floating-label inputs (text, number, email, phone, currency, url, textarea, select, datetime) position the label element at `left: calc(var(--fio-px) - 4px + var(--fio-form-group-px, 0px))` with `padding: 0 4px`, so the label text itself starts at `var(--fio-px)` while the 4px horizontal padding creates the outlined notch.

**Changes made:**
- `assets/webview/formio-theme.css`
  - Added baseline convention comment and `padding-left: var(--fio-px)` to `.col-form-label, .formio-component > label`.
  - Updated floating-label `left` values to include `--fio-form-group-px` so mobile horizontal padding on `.formio-form-group` is accounted for.
  - Updated the datetime permanently-floated label to share the same left calculation instead of a hardcoded `44px`.
  - Added `--fio-form-group-px: 12px` inside the `@media (max-width: 600px)` block and used it for the `.formio-form-group` horizontal padding.

**Measured results (text-left offset relative to form container):**
- Desktop: all text/select/number/textarea/datagrid labels and input borders align at 17px; radio/checkbox question labels also align at 17px.
- Mobile: top-level text/select/textarea/datetime labels and input borders align at 29px; fields inside nested forms/panels align at 41px (the extra 12px is the nested `.formio-component-form` padding). Within each nesting level, labels and inputs share one edge.

**Regression checks:** Floating-label `:has()` focus/fill rules were not modified; the label still floats up and changes size/color as before. No TypeScript or test files were changed. Jest test suite was not run because the change is purely CSS and no test covers CSS; lint/typecheck would not exercise the CSS file either.
