# [FE] FORM-3: Fix descender clipping (g/y/q/p/j) in field labels

## Overview

Field name labels that contain lowercase letters with descenders (e.g. the "g" in "Bathing Description", "Bathing Assistance Level") are visibly clipped at the bottom of the letter. This happens both while the label is unfloated (sitting inside the empty field, e.g. "Bathing Description", "Bathing Assistance Level", "Days per week") — affects any field label containing g/y/q/p/j.

Reference: Screenshot `Screenshot 2026-07-13 at 7.09.58 PM.png` (Desktop) — shows three stacked fields ("Bathing Description" textarea, "Bathing Assistance Level" select, "Days per week" select), each with a hand-drawn arrow labeled "#3" pointing at the clipped descender on the "g" in "Bathing". Not checked into the repo; description verified directly against the image.

## Root Cause (hypothesis — verify before fixing)

`assets/webview/formio-theme.css`, floating-label rules (~line 254 onward, shared by textfield/textarea/number/email/phoneNumber/currency/url/datetime, and the parallel select rule ~line 501):
- The label sets `line-height: 1;` (~line 282) and `overflow: hidden;` (~line 284) with a fixed-height container.
- `line-height: 1` on most fonts (including Inter, per `--fio-font-family` ~line 65) does not reserve enough box height below the baseline for descenders — the glyph's descender can extend past the line box, and combined with `overflow: hidden` on the label element, the descender gets visually cut off.
- This affects both the unfloated state (base `font-size: var(--fio-font-base)` = 16px, ~line 268) and the floated state (`font-size: var(--fio-font-xs)` = 10px, ~line 308) since both inherit `line-height: 1` from the shared base rule.
- The textarea label override (~line 445-447) uses a plain `transform: translateY(16px)` without changing `line-height`, so it likely has the same issue.

Confirm this diagnosis (or find the actual cause — e.g. it could also be `--fio-input-height` vertical-centering math combined with the label's absolute positioning, not line-height alone) by inspecting a clipped label in devtools (check computed `line-height`, `height`, `overflow` on the label element and its bounding box vs. the glyph's actual rendered extent) before making changes.

## Atomic Subtasks

- [x] 3.a: Reproduce with `molina-hha-oh.json` or `pca-service-log.json` (search both for field labels containing g/y/q/p/j — e.g. "Bathing", "Toileting/Bowel", "Dressing") via `expo start --web`, and inspect the clipped label in devtools to confirm the exact CSS property causing the clip (line-height, overflow, fixed height, or a combination)
- [x] 3.b: Fix the label CSS so descenders render fully in the **unfloated** state (label at base 16px font-size) across textfield, textarea, number, email, phoneNumber, currency, url, datetime, and select components
- [x] 3.c: Fix the label CSS so descenders render fully in the **floated** state (label at 10px font-size, translated up) for the same component list
- [x] 3.d: Re-check the textarea-specific label override (~line 445-447) separately since it uses its own `transform` value and may need its own adjustment
- [x] 3.e: Confirm the fix doesn't reintroduce the vertical-centering misalignment that the existing `padding-top`/`padding-bottom` comment block (~line 377-383) was written to solve — re-read that comment before touching shared spacing values

## Acceptance Criteria

- Labels containing g/y/q/p/j render with the full descender visible, with no visible clipping, in both floated and unfloated states
- No regression to vertical centering of label text within the 56px input height, or to the existing floating-label `:has()` trigger behavior
- Fix applies consistently across all affected component types (text, textarea, number, email, phone, currency, url, datetime, select), not just textarea

## Test / Verification

CSS glyph-clipping is not practically assertable via jsdom (no real font metrics/rendering). Verification is manual: load a schema containing labels with descenders (e.g. `molina-hha-oh.json`, `pca-service-log.json` — search for "Bathing", "Toileting", "Dressing", or similar) via `expo start --web` or the iOS simulator, zoom into the label text for both floated and unfloated states, and confirm no clipping. Document this manual verification method explicitly in the Completion Summary's "Tests" line.

## Dependencies

None. Independent of FORM-1 and FORM-2, but touches the same CSS file — commit those first if working sequentially to reduce merge friction.

## Completion Summary

- **Status**: Done
- **Completed**: 2026-07-13
- **What changed**: Changed floating-label `line-height` from `1` to `1.3` in `assets/webview/formio-theme.css` for textfield/textarea/number/email/phoneNumber/currency/url/datetime and select labels so descenders (g/y/q/p/j) fit inside the `overflow: hidden` line box; adjusted the textarea-specific label transform from `translateY(16px)` to `translateY(12px)` to preserve the original top-aligned label position with the taller line box.
- **Tests**: No automated test — verified via a standalone Playwright-driven browser test page loading a schema with descender labels (Bathing Description, Bathing Assistance Level, Days per week, Toileting/Bowel Description, Dressing Assistance Level, Member age, Phone number) and visually inspecting unfloated and floated states; screenshots saved to `/var/folders/rq/zp6f0fc14b9b81sgh3tnqs380000gp/T/opencode/repro/form3-*.png` — PASSING
- **Notes**: Computed devtools metrics confirmed the root cause: labels had `line-height: 16px` (=`line-height: 1`) and `overflow: hidden`, clipping descenders; after the fix unfloated labels report `line-height: 20.8px` and floated labels `line-height: 13px`, with no visible clipping and no regression to input vertical centering.
