# Task 3.3: Build Form Type Picker

**Phase:** 3 — Screens & Navigation
**Status:** Not Started
**Depends on:** 1.4, 3.2

---

## Description

Create the screen or modal where users select which form type to fill out when starting a new assessment. The list of available form types comes from the locally cached schemas.

## Scope

- Create `src/components/form-picker/FormTypePicker.tsx`
- Can be implemented as a full screen or a bottom-sheet modal — choose whichever fits the flow better
- Load available form types from `getAllSchemas()` in SQLite
- Display each form type as a tappable row with the form title
- On selection:
  1. Call `createEntry(formPath, formTitle)` to insert a new draft entry
  2. Navigate to FormScreen with the new entry ID and the selected schema
- Create `src/hooks/useFormSchemas.ts` — hook that loads cached schemas from SQLite

## Acceptance Criteria

- [ ] Picker shows all locally cached form types
- [ ] Each form type displays its title
- [ ] Tapping a form type creates a new entry in SQLite with status "draft"
- [ ] After creation, the app navigates to FormScreen with the new entry
- [ ] If no schemas are cached, an informative message is shown (e.g., "No forms available — sync required")
- [ ] Picker is dismissible without creating an entry (back button or close)
