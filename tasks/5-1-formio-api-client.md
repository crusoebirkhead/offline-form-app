# Task 5.1: Build Form.io API Client

**Phase:** 5 — Schema Sync
**Status:** Not Started
**Depends on:** 0.2

---

## Description

Create the HTTP client service that fetches Form.io form schemas from the hosted Docker container. This client is used by the sync service to pull the latest form definitions.

## Scope

- Create `src/services/formio.ts`
- Implement `fetchFormSchema(formPath: string): Promise<FormSchemaResponse>`:
  - GET the form definition from the Form.io server (e.g., `GET {FORMIO_BASE_URL}/{formPath}`)
  - Include the API key in request headers (`x-token`)
  - Parse the response into the form schema JSON
  - Return the schema along with a version identifier (ETag header or content hash)
- Implement `fetchAllFormPaths(): Promise<string[]>`:
  - Use the bundled `config.json` to derive the list of form paths to sync
  - Alternatively, fetch the form list from the Form.io server if an endpoint exists
- Make the base URL and API key configurable via environment/config
- Handle network errors without throwing (return null or error result)

## Acceptance Criteria

- [ ] `formio.ts` exports `fetchFormSchema` and `fetchAllFormPaths`
- [ ] `fetchFormSchema` returns the full Form.io form JSON for a given path
- [ ] API key is included in the request header
- [ ] Network errors return `null` (do not throw)
- [ ] Base URL and API key are configurable
- [ ] Response includes a version identifier for change detection
