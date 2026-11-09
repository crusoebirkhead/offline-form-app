# Task 09: Implement Lambda Handler — Batch Schemas Endpoint

**Type:** Code
**Phase:** 2 — Lambda Implementation
**Dependencies:** Task 08

## Description

Implement the Lambda handler for `GET /schemas` that returns all available form schemas in a single response. This reduces the number of HTTP round-trips the offline app needs during sync — instead of one request per form path, a single request retrieves everything.

The offline app's `syncSchemas()` flow currently iterates over known form paths. This batch endpoint lets it fetch all schemas at once, compare ETags locally, and only update what changed.

## Scope

- Extend the existing handler in `index.mjs` to handle the `/schemas` route
- Fetch all forms from Form.io's list endpoint
- Return a manifest with schemas and per-schema ETags
- Support `If-None-Match` on the overall response

## Implementation Details

**Request flow:**
```
GET /schemas
  1. Get Form.io credentials from Secrets Manager (cached)
  2. Fetch form list: GET {serverUrl}/{projectId}/form?type=form&limit=100
     with header: Authorization: Bearer {apiKey}
  3. For each form in the list:
     a. Check in-memory cache
     b. If miss: fetch full schema (reuse single-schema logic from Task 08)
  4. Build response manifest
  5. Compute overall ETag from sorted per-schema ETags
  6. Return 304 if client's If-None-Match matches, else 200
```

**Response format:**
```json
{
  "schemas": [
    {
      "formPath": "molina-hha-oh",
      "title": "Molina HHA OH",
      "etag": "abc123...",
      "schema": { /* full Form.io JSON schema */ }
    },
    {
      "formPath": "assessment/standard",
      "title": "Standard Assessment",
      "etag": "def456...",
      "schema": { /* ... */ }
    }
  ],
  "count": 2,
  "fetchedAt": "2026-05-05T12:00:00Z"
}
```

**Headers returned:**
- `Content-Type: application/json`
- `ETag: "<composite-sha256>"`
- `Cache-Control: private, max-age=300`

**Performance considerations:**
- Fetch forms in parallel (Promise.all) — the Form.io container handles concurrent requests
- In-memory cache means most calls after the first cold-start are instant
- The response may be large (multiple full schemas) — consider gzip compression via API Gateway response compression (enable `minimumCompressionSize: 1024` on the API)

## Acceptance Criteria

- [ ] `GET /schemas` returns a JSON array of all form schemas with their ETags
- [ ] Each schema entry includes `formPath`, `title`, `etag`, and `schema`
- [ ] Response includes a composite `ETag` header
- [ ] `If-None-Match` with matching composite ETag returns 304
- [ ] Individual schemas are fetched in parallel (verify via CloudWatch duration)
- [ ] Response is gzip-compressed when `Accept-Encoding: gzip` is sent
- [ ] If one upstream schema fetch fails, the response still includes all other schemas (partial success) with an `errors` array for the failures
- [ ] Empty form list returns `{ "schemas": [], "count": 0 }` with 200 status
- [ ] User `sub` claim is logged for the request
