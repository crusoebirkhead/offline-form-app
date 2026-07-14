# [FE] FORM-5: Fix radio-group label detaching from its field after a layout reflow

## Overview

The user reports that a radio-button group's question label ("did not move with the radio button field") became visually detached from its Yes/No options — implying the label and the actual radio inputs ended up out of sync after some layout change, rather than moving together as one unit.

Reference: reported alongside `Simulator Screenshot - iPhone 16e - 2026-07-13 at 23.18.13.png` (Desktop, "CareSource PCA NV" form, "Translator Required?" Yes/No group near the bottom of the visible frame). **Important: this specific screenshot does NOT visibly show the detachment** — "Translator Required?" and its Yes/No options appear correctly paired in this static frame. This means the bug is very likely state- or interaction-dependent (e.g. only appears after scrolling, after a preceding conditional field's visibility changes and the page reflows, or after typing a value that triggers a `calculateValue`/conditional recompute elsewhere in the form) rather than present on initial static render. Do not assume the "Translator Required?" field is necessarily the exact instance affected — reproduce the general failure mode across the form, not just that one field.

## Root Cause (hypothesis — verify by reproducing interactively, not from a static screenshot)

`assets/webview/formio-theme.css` and `assets/webview/form-shell.html`:
- Radio-group labels use the shared block-flow rule `.col-form-label, .formio-component > label` (~line 166), which FORM-1 (`6af3297`) added `padding-left: var(--fio-px)` to. That's a horizontal change and shouldn't by itself cause a label to become vertically detached from its own field.
- More likely candidates given the "did not move with the field" phrasing (a positional/reflow bug, not a static styling bug):
  - FORM-2's change (`35ed7c4`) made previously-space-occupying hidden fields (`.formio-component-hidden`) fully collapse via `display: none`. If a hidden/conditional field sits *between* a radio group's `<label>` and its `.form-radio` options in the DOM (unusual, but verify), or if collapsing a field elsewhere on the page changes total scroll height while something else (e.g. a cached measurement, a CSS `position: sticky`/`absolute` label, or a `MutationObserver`-driven placeholder injection in `form-shell.html`'s `injectPlaceholders()`) doesn't re-run/re-measure after the collapse, a stale visual offset could result.
  - Check whether any radio-group label or its options wrapper (`.form-radio`) has `position: absolute`/`position: sticky` anywhere in the cascade (including inherited from a more generic selector) that could cause it to not reflow with normal document flow when preceding content changes height.
- Confirm this diagnosis (or find the actual cause) by reproducing live: load a schema with a radio group preceded by a conditional/hidden field, toggle the condition, and watch whether the radio label and its options move together or drift apart. Use browser devtools / Playwright to capture the label's and the `.form-radio` options' bounding boxes before and after the toggle.

## Atomic Subtasks

- [x] 5.a: Identify a bundled schema with a radio group positioned after a conditional/hidden field (check `molina-hha-oh.json`, which has 13 `conditional` blocks — cross-reference with its `radio`-type fields) or construct a minimal synthetic repro schema if none exists locally
- [x] 5.b: Render it via `expo start --web` or the Playwright harness, toggle the preceding condition (or fill/clear whatever triggers the relevant reflow), and measure the radio label's and radio options' bounding boxes before and after — confirm whether they move together (expected) or apart (the bug)
- [x] 5.c: If reproduced, identify the exact CSS/JS causing the detachment and fix it, preserving the FORM-1/FORM-2 conventions already established in the same file (N/A — bug was not reproduced)
- [x] 5.d: If NOT reproducible after a reasonable, documented effort (try several trigger scenarios: conditional toggle, scroll, window resize, value entry elsewhere in the form), say so explicitly and clearly in the Completion Summary rather than inventing a speculative fix — this task's symptom was reported secondhand from a single non-reproducing screenshot, so a genuine "could not reproduce" outcome is an acceptable, honest result. Do not mark subtasks complete or move the file to `done/` on a fix you couldn't verify actually addresses the reported symptom.

## Acceptance Criteria

- A radio group's label and its Yes/No (or other) options move together as a single unit through any layout reflow (conditional field toggling, scrolling, resize)
- No regression to FORM-1's label alignment or FORM-2's hidden-field collapsing behavior

## Test / Verification

Playwright-based before/after bounding-box comparison across a reflow-triggering interaction (same technique as FORM-2's investigation). If no reproduction is possible, document the specific scenarios tried and their results in the Completion Summary instead of a test.

## Dependencies

Builds on FORM-1 (`6af3297`) and FORM-2 (`35ed7c4`) — read both commits' diffs before investigating, since this bug appeared only after they landed.

## Completion Summary

- **Status**: Done
- **Completed**: 2026-07-13
- **What changed**: No code change — the reported radio-label detachment could not be reproduced. Added Playwright reproduction scripts (`scripts/verify/FORM-5-radio-detachment.mjs` and `FORM-5-radio-detachment-molina.mjs`) that measure the gap between a radio group's label and its `.form-radio` options across conditional toggles, scroll, resize, and value entry.
- **Tests**: Playwright-based bounding-box probes for a synthetic schema and for `molina-hha-oh.json` (radio after conditional datagrid). In all scenarios the label and options moved together with a stable 16 px gap; both label and options are `position: static`. Results saved to `scripts/verify/output/FORM-5-radio-detachment.json` and `FORM-5-radio-detachment-molina.json`. PASSING (no bug found).
- **Notes**: Tried conditional field toggle, scroll, viewport resize, and typing into an auto-expanding textarea elsewhere in the form. No absolute/sticky positioning was found on radio labels or options. The symptom in the single non-reproducing screenshot may have been a transient Form.io render/state issue not present in the current CSS/JS.
