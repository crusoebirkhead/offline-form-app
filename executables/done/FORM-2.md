# [FE] FORM-2: Collapse spacing left behind by conditionally-hidden Form.io fields

## Overview

Some fields have an abnormally large gap between them — much larger than the form's normal field-to-field spacing. This is suspected to be caused by conditionally-hidden Form.io fields (fields whose `conditional` logic currently evaluates to hidden) still contributing layout space, even though they render nothing visible. The goal is for visible fields to remain evenly spaced regardless of how many hidden fields sit between them in the schema.

Reference: Screenshot `Screenshot 2026-07-13 at 7.09.10 PM.png` (Desktop) — shows "Does the member have formal caregiver support?" (Yes/No) followed by a large empty gap, then "Does the member have informal caregiver support?" (Yes/No), with a hand-drawn bracket labeled "#2" spanning the gap. Not checked into the repo; description verified directly against the image.

## Root Cause (hypothesis — verify before fixing)

`assets/webview/formio-theme.css`:
- `.formio-hidden { display: none !important; }` (~line 149) is meant to fully collapse hidden fields, and the sibling-margin rule `.formio-component + .formio-component:not(.formio-hidden)` (~line 154) is meant to only apply spacing between *visible* siblings.
- `molina-hha-oh.json` has 13 `conditional` blocks and 29 `calculateValue` fields — good local repro material. The Humana HHA schema in the screenshot is fetched via `formio-proxy-lambda/` rather than bundled, so may not be available offline; use `molina-hha-oh.json` as the closest reproducible equivalent unless the Humana schema is reachable in your environment.
- Investigate whether the `.formio-hidden` class is actually applied to the correct DOM node for every hidden-field shape in this schema (a field wrapped in `.formio-form-group`, `.formio-component-columns`, or a panel could have the class land on an inner node while an outer wrapper — which still participates in the flex layout via the parent's `gap: var(--fio-gap)` — remains unhidden and keeps consuming space).
- Also check for a possible render race: since `assets/webview/form-shell.html`'s `form.on("change", ...)` handler recomputes validity but conditional visibility is handled internally by Form.io — confirm there's no flash-of-visible-then-hidden that leaves residual computed height/margin from a transition or animation.

Confirm this diagnosis (or find the actual cause) by inspecting the live DOM (e.g. browser devtools computed styles on the hidden node and its ancestors) before making changes.

## Atomic Subtasks

- [x] 2.a: Load `molina-hha-oh.json` via `expo start --web`, and using browser devtools, identify a spot where a conditional field is currently hidden and inspect the DOM: does `.formio-hidden` land on the actual flex-item ancestor, or on some inner node?
- [x] 2.b: Reproduce the exact bug — find or construct a sequence of 2+ hidden fields between two visible ones and confirm the gap grows extra-large (vs. a single hidden field), which would indicate the issue is per-hidden-field, not a fixed rendering glitch
- [x] 2.c: Fix the CSS/markup so that any wrapper ancestor of a hidden component (not just the innermost node) is fully collapsed — likely needs `.formio-hidden` (or an equivalent selector) to also zero out flex `gap` contribution, or needs the hidden class applied at the correct DOM level in `form-shell.html`'s `enableDataGridLabels`/render pipeline if that's where the mismatch originates
- [x] 2.d: Verify the fix holds regardless of how many consecutive hidden fields sit between two visible ones (test with 1, 2, and 3+ consecutive hidden fields if the schema allows)

## Completion Summary

- **Status**: Done
- **Completed**: 2026-07-13
- **What changed**: Extended the hidden-field collapse rule in `assets/webview/formio-theme.css` to also target `.formio-component-hidden` (hidden-input component wrappers), and excluded those wrappers from the sibling spacing selector so hidden fields no longer consume flex/block layout space between visible fields.
- **Tests**: No automated test — verified via headless Chrome/Puppeteer using minimal schemas with 1–3 hidden inputs and a conditional radio/textfield toggle, plus `molina-hha-oh.json`; all hidden components contribute zero height and visible gaps stay uniform. PASSING.
- **Notes**: In `molina-hha-oh.json` the `.formio-hidden` class already lands on the outer flex-item wrapper for conditional fields, so conditional fields were already collapsing; the reproducible spacing bug was from `.formio-component-hidden` wrappers retaining padding/margin. The `<input type="hidden">` remains in the DOM for form submission.

## Acceptance Criteria

- Two visible fields separated by any number of currently-hidden conditional fields have the same visual gap as two visible fields with no hidden fields between them
- Toggling a conditional field from hidden → visible (e.g. answering a Yes/No that reveals a follow-up) does not leave a stale double-gap or a snapping/jumping layout artifact
- No regression to fields that are legitimately meant to have larger spacing (e.g. section/panel boundaries)

## Test / Verification

Prefer a jsdom test that renders a minimal Form.io schema fixture with 2+ conditionally-hidden fields between visible ones and asserts the hidden components contribute zero height/margin to the container. If Form.io's `:has()`-heavy CSS or its conditional evaluation isn't practical to exercise in jsdom, fall back to manual verification: load `molina-hha-oh.json` in `expo start --web`, toggle the conditions that hide/show fields, and screenshot before/after to confirm even spacing. Document whichever approach was used in the Completion Summary.

## Dependencies

None. Independent of FORM-1 and FORM-3, but touches the same CSS file — commit FORM-1 first if working sequentially to reduce merge friction.
