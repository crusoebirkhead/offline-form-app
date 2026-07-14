# [FE] FORM-4: Fix left-alignment regression on datetime/day-type fields

## Overview

After FORM-1 (commit `6af3297`, left-alignment baseline) landed, a new misalignment appeared: on the "CareSource PCA NV" form, the "Date of Birth" field's label sits noticeably further left than the labels of the plain text fields directly below it ("Prefix", "First Name", "Middle Name", "Last Name", "Suffix"), which are themselves correctly aligned to each other. This is a regression/gap relative to FORM-1's stated goal ("every field type shares one consistent left edge").

Reference: `Simulator Screenshot - iPhone 16e - 2026-07-13 at 23.18.13.png` (Desktop, iPhone 16e simulator, "CareSource PCA NV" form) — not checked into the repo; verified directly against the image. "Date of Birth"'s label sits on/near the top border with a visible border-notch (it is permanently floated, small text), while "Prefix" etc. show large unfloated placeholder-style labels sitting inside the box (fields are empty) — these are two different label *states*, but per FORM-1's baseline convention both should still start at the same left edge, and they visibly do not.

**"CareSource PCA NV" is fetched remotely via `formio-proxy-lambda/`, not bundled in `src/assets/seed-schemas/`, and may not be reachable offline.** Do not assume you can load it directly — use the local reproduction strategy in "Root Cause" below instead, and only fall back to the live schema if you have network access to confirm.

## Root Cause (two hypotheses — verify before fixing; do not assume either is correct)

1. **Different Form.io component type.** Form.io ships a component type `day` (see `node_modules/@formio/js/lib/cjs/components/day/Day.js`) that is architecturally distinct from `datetime` (`node_modules/@formio/js/lib/cjs/components/datetime/DateTime.js`) — it's commonly used specifically for "Date of Birth"-style fields. `assets/webview/formio-theme.css` has **zero rules for `.formio-component-day`** (confirmed: `grep -n "formio-component-day" assets/webview/formio-theme.css` returns nothing). If "Date of Birth" is a `day`-type component, its label gets no floating-label styling at all and falls back to Form.io's bare default positioning — explaining the offset.
2. **A `datetime` variant/wrapper not covered by FORM-1's fix.** The three datetime fields in the bundled seed schemas (`molina-hha-oh.json`'s `date` field, `pca-service-log.json`'s `serviceDate`, `standard-assessment.json`'s `assessmentDate`) have differing `widget` configs (one is `calendar`, others unset) and FORM-1 was only empirically verified against `assessmentDate`. "Date of Birth" could be a `datetime` configured differently (no calendar-icon suffix, nested inside a `.formio-component-columns` or panel with different padding, or positioned as the very first field in the form where a top-of-form padding edge case might apply) that the fix doesn't actually cover.

Confirm which of these (or something else) is the real cause by inspecting the live DOM — either by reaching the actual "CareSource PCA NV" schema if network access allows, or by constructing a minimal synthetic test schema (the same technique used successfully in FORM-2's investigation — see `git show 35ed7c4` and its log at `scripts/ralph/logs/FORM-2-*.log` for the pattern) containing a `day`-type field and a `datetime` field with no calendar widget, both alongside plain textfields, and comparing rendered label left-offsets via Playwright/devtools computed styles.

## Atomic Subtasks

- [x] 4.a: Determine whether "Date of Birth"-style fields in this app's schemas use Form.io's `day` type or a `datetime` variant — check `molina-hha-oh.json`, `pca-service-log.json`, `standard-assessment.json` for any `day`-type fields (none currently found — confirm this is still true), and if the live "CareSource PCA NV" schema is reachable, inspect it directly (`grep -A5 '"key": "dateOfBirth"' <fetched-schema>` or similar)
- [x] 4.b: If no `day`-type field exists anywhere reachable, build a minimal synthetic test schema (inline JSON, following the FORM-2 investigation's pattern) with a `day`-type component and render it via the `assets/webview/form-shell.html` + Playwright harness to see its actual rendered markup/classes
- [x] 4.c: Based on findings, add or fix the CSS so the affected component type's label shares the same left baseline (`var(--fio-px)`) established by FORM-1 — likely needs new `.formio-component-day` rules mirroring the existing `.formio-component-textfield`/`.formio-component-datetime` patterns, or a fix to how the datetime override applies in whatever specific configuration "Date of Birth" uses
- [x] 4.d: Re-verify alignment across ALL THREE bundled schemas' existing datetime fields (`date`, `serviceDate`, `assessmentDate`) plus whatever new component/config was identified, to confirm no regression to FORM-1's already-working cases

## Acceptance Criteria

- "Date of Birth" (or whichever component type/config it turns out to be) shares the same left edge as adjacent text fields, matching FORM-1's baseline convention
- No regression to the datetime fields already verified working in FORM-1 (`assessmentDate` in `standard-assessment.json`, confirmed correct via Playwright measurement at the time)
- If a `day`-type component is the culprit and gets new CSS rules, those rules follow the existing baseline convention documented in `formio-theme.css`'s Labels section comment (~line 162), not a new one-off value

## Test / Verification

Prefer a Playwright-based measurement (same technique as FORM-1/FORM-2): render the affected component type alongside a plain textfield in the same form and assert their label `left` offsets match. If the exact live schema isn't reachable, use a synthetic minimal schema fixture and say so explicitly in the Completion Summary. Screenshot before/after for a human-readable check.

## Dependencies

Builds on FORM-1 (`6af3297`) — read that commit's diff and the reasoning comments it left in `formio-theme.css` before making changes, so the baseline convention stays consistent rather than introducing a second, conflicting one.

## Completion Summary

- **Root cause confirmed:** The "Date of Birth" style field is Form.io's `day` component type. None of the bundled seed schemas currently contain a `day` field, so it had no CSS rules in `assets/webview/formio-theme.css` and fell back to the default Form.io label positioning.
- **Synthetic reproduction:** Created `scripts/verify/synthetic-day.json` with a `day` field, a `datetime` field, and plain `textfield`s, then rendered it via `scripts/verify/form-harness.html` and `scripts/verify/FORM-4-day-alignment.mjs`. Baseline measurement showed the `day` component's main label at `left: 0px` while text/datetime labels were at `left: 16px`; day sub-labels were also misaligned.
- **Fix applied:** Added `.formio-component-day` rules to `assets/webview/formio-theme.css` (mirroring the label padding convention from `.formio-component-textfield`/`.formio-component-datetime`), including flex layout for the day/month/year subfields and consistent sub-label padding.
- **Verification:** Re-ran the Playwright measurement script. Results:
  - `textfield` label: `16px`
  - `datetime` label: `16px`
  - `day` main label: `16px`
  - `day` sub-labels: `28px` (matching the text/datetime sub-label baseline)
  - Screenshots saved to `scripts/verify/output/FORM-4-before.png` and `FORM-4-after.png`.
- **Regression checks:** Ran `scripts/verify/FORM-1-regression-check.mjs` against all three bundled seed schemas; existing datetime fields retained their `16px` label offset, so no regression to FORM-1.
- **Project-wide checks:** `npm test` is currently blocked by a pre-existing Jest transform issue (`react-native-auth0` / `react-native` ESM/Flow parsing); it fails before reaching any CSS-related code. `npm run lint` also reports pre-existing errors in unrelated `src/` files. Neither failure is caused by this change, and `package.json`/`package-lock.json` dependency changes from investigation were reverted.
