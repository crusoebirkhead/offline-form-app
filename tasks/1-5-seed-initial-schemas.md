# Task 1.5: Seed Initial Form.io Schemas

**Phase:** 1 — Local Database & Data Model
**Status:** Not Started
**Depends on:** 1.4

---

## Description

Bundle the Form.io JSON schema fixtures from gryphon-central-tenant as app assets so the app has working forms on first launch without needing an internet connection.

## Scope

- Copy the fixture JSON files from `gryphon-central-tenant/app/utils/formAssembler/sections/*.json` into `src/assets/seed-schemas/`
- Create a `src/db/seed.ts` module that reads each bundled JSON file and calls `upsertSchema()` to populate the `form_schemas` table
- Run seeding on first app launch (check a `seeded` flag in SQLite or AsyncStorage to avoid re-seeding on subsequent launches)
- Include the form assembler `config.json` as an asset to map form paths to titles and ordering

## Acceptance Criteria

- [ ] Seed schema JSON files are bundled as Expo assets in `src/assets/seed-schemas/`
- [ ] `seedSchemas()` populates the `form_schemas` table from bundled files
- [ ] Seeding runs only once on first launch; subsequent launches skip it
- [ ] After seeding, `getAllSchemas()` returns all bundled form types
- [ ] Each seeded schema has a `version` value derived from file content hash
