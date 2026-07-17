# Form.io Theme — Design Spec (source of truth)

Derived from Figma node `13761-38536` ("Section Container", Gryphon UI / Case Management).
Visual reference: `scripts/verify/design-ref/form-design-reference.png` (734×2898).

This spec is the CONTRACT. All rewrite agents build against these tokens and the
component anatomy below. The rendering target is Form.io v5 inside a react-native
WebView (`assets/webview/form-shell.html`). Bootstrap CSS is NOT loaded — the stock
`formio.form.min.css` is intentionally empty. **All visual styling comes from
`formio-theme.css`, which we are rewriting from scratch.**

Fonts available offline (already in `assets/webview/assets/fonts/`): Inter
Regular/Medium/SemiBold/Bold (woff2) + bootstrap-icons (woff/woff2). Use Inter.

---

## 1. Design Tokens

### Color
| Token | Value | Usage |
|-------|-------|-------|
| `--fio-bg` | `#FFFFFF` | Section + form background |
| `--fio-text` | `#32383F` | Input values, section titles |
| `--fio-label` | `#6F757C` | Field labels, question labels, supporting text, placeholder |
| `--fio-primary` | `#1894E1` | Buttons/links, number steppers, focused border, radio-selected |
| `--fio-border` | `#DADCDE` | Input borders, table borders, indent rules |
| `--fio-divider` | `#F5F9FC` | Hairline divider between questions / under section header |
| `--fio-primary-outline` | `rgba(33,150,243,0.5)` | Outlined pill button border |
| `--fio-error` | `#DC2626` | Validation error text/border (not in Figma frame; standard red) |

### Typography (all Inter)
| Token / role | Weight | Size | Line-height | Used for |
|--------------|--------|------|-------------|----------|
| Section title (h6) | 700 | 15px | 1.2 | "General Health" |
| Question label | 500 | 13px | 1.3 | "Height", "O2 Saturation" (label ABOVE a group) |
| Floating label | 500 | 10px | 1.4 | "ft", "Rest %", "Respiration" (label IN the border notch) |
| Input text | 500 | 14px | 1.5 | field values |
| Radio/option label | 600 | 14px | 1.5 | "Yes" / "No" |
| Checkbox pill label | 600 | 10px | 1.4 | "SR", "N/A" |
| Supporting text | 500 | 10px | 1.4 | "Select all that apply" |
| Button label | 600 | 13px | 1.3 | "Upload Media" |

### Spacing / geometry
| Token | Value |
|-------|-------|
| `--fio-radius` | `12px` (fields, sections, buttons use pill `96px`) |
| Field height (single-line) | `56px` |
| Field inner padding | `4px 16px` (state-layer) |
| Question vertical gap | `16px` between questions inside a form |
| Question bottom padding + divider | `20px` bottom pad, then `1px` `--fio-divider` bottom border |
| Section header | height `56px`, padding `16px 12px`, `1px` `--fio-divider` bottom border |
| Form body padding | `16px 12px 20px` |
| Indented sub-question | left padding `12px` + `1px` solid `--fio-border` LEFT rule |
| Border width | `1px` everywhere |

---

## 2. THE floating-label notch (critical — shared mechanism)

Every text-like field (textfield, number, textarea, select) uses a Material-style
**outlined field whose label sits inside a gap ("notch") in the top border.** In the
Figma this is built from three pieces, but in CSS we reproduce it with ONE technique.

Target visual (see reference image):
- Rounded 12px border, `1px --fio-border`.
- Label (`--fio-label`, 10px) overlaps the top border line, ~16px from the left edge,
  vertically centered on the border so the border appears "cut" behind the text.
- The field background (white) shows behind the label so the border line is hidden
  where the label sits.
- When the field is empty AND unfocused, the label drops to the vertical center of the
  field at input-text size/position (acts as placeholder). On focus OR when filled, it
  floats up into the notch.
- Focused: border → `--fio-primary`, label → `--fio-primary`.

**Chosen implementation** (keep it robust — this is why the old theme was fragile):
- Wrapper `position: relative`, the `<label>` is `position: absolute`.
- Floated state (focused or filled): `top: 0; transform: translateY(-50%);
  left: 12px; padding: 0 4px; background: var(--fio-bg); font-size: 10px;`
  — the white background + horizontal padding IS the notch (masks the border).
- Resting state (empty + blurred): label sits at input baseline
  (`top: 50%; transform: translateY(-50%); font-size: 14px; color: --fio-label;`).
- Trigger uses `:focus-within` and the placeholder-shown trick already wired in
  `form-shell.html` (it injects `placeholder=" "` on every `.form-control`), so
  `.form-control:not(:placeholder-shown) ~ label` = filled. Keep relying on that
  injected placeholder — do NOT invent a new mechanism.
- Inputs need `padding-top` room so the resting label and floated notch don't overlap
  the text. Text sits at 14px; give inputs enough top padding to clear the notch.

Agent A owns this base mechanism; Agents B/C extend it per-component (textarea anchors
the label to the top, select adds the chevron, number adds steppers).

---

## 3. Component anatomy (per the reference image, top → bottom)

1. **Section header** — bold 15px title left; right side has small outlined checkbox
   "pills" (`SR`, `N/A`: 18px square checkbox + 10px semibold gray label) and a
   text/pill "Upload Media" button (blue, leading image icon). 1px divider under.

2. **Split field ("Height" = ft | in)** — question label "Height" above (13px gray).
   Two number fields joined into one rounded 12px outer border: left field radius
   `12px 0 0 12px`, right `0 12px 12px 0`, shared middle divider, `-1px` gap so borders
   collapse. Each has its own floating label ("ft"/"in") and up/down steppers.

3. **Number field ("Rest %", "Active %", "Oxygen (L/min)")** — standard outlined field,
   floating label, blue up/down stepper arrows stacked at the right (~14px column).
   Native spinner hidden; custom Material triangles.

4. **Select / dropdown ("Respiration", "Postural Asymmetries")** — outlined field,
   floating label, single `arrow_drop_down` chevron (gray) at right. Optional supporting
   text below in 10px gray ("Select all that apply"). Rendered by choices.js in Form.io.

5. **Indented sub-question** — when a field is a follow-up (e.g. "Oxygen (L/min)",
   "Why?"), it is indented with a vertical `1px --fio-border` rule on the left + 12px
   left padding.

6. **Textarea ("Please describe", "Additional Info")** — multi-line outlined field,
   label floats to TOP-left (not vertically centered). Taller (min ~130px for empty
   "Additional Info"). Same notch treatment.

7. **Radio (inline "Yes / No")** — horizontal row, gap 8px. Unselected = hollow gray
   circle; selected = blue ring with filled blue center dot. Label 14px semibold dark.
   (Question label "Was the member seen out of bed?" above, 13px gray.)

8. **Buttons ("Upload Media")** — pill (`border-radius: 96px`). Outlined variant:
   `1px --fio-primary-outline` border, blue 13px semibold label, leading icon, padding
   ~12px. Header variant is borderless (text + icon only).

---

## 4. Rules of engagement for agents

- **No Bootstrap.** Don't assume any base CSS. Style Form.io's emitted DOM directly.
- **Own only your selectors.** Write into your assigned section file
  (`scripts/verify/partials/section-N-*.css`). Do NOT redefine `:root` (Agent A owns it).
- **Reference real selectors** from `selector-inventory.md` (Form.io DOM structure).
- **Keep floating labels** — reuse the mechanism in §2, don't reinvent per field.
- **Mobile-first**: the WebView is a phone-width viewport. Fields are full-width.
- **Match the reference image** pixel-intent, not the old theme. The old
  `formio-theme.css` is being fully replaced; use it only to learn which selectors
  exist, never copy its rules.
- Every color/size must map to a token above. If something isn't in the spec, match the
  reference image and note the assumption in a CSS comment.
