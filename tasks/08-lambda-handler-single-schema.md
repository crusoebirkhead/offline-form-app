# Task 08: Implement Lambda Handler — Single Schema Endpoint

**Type:** Code
**Phase:** 2 — Lambda Implementation
**Dependencies:** Task 07

## Description

Implement the Lambda handler for `GET /schemas/{formPath+}` that proxies a single form schema request to the Form.io Docker container. The handler retrieves the Form.io API key from Secrets Manager (cached for the Lambda instance lifetime), fetches the schema from the Form.io server, and returns it with an ETag for client-side caching.

## Scope

- Secrets Manager client with in-memory caching
- Form.io upstream fetch with error handling
- ETag generation (SHA-256 of response body)
- Conditional response (304 Not Modified) when client sends `If-None-Match`
- In-memory schema cache (TTL from environment variable)
- Structured error responses

## Implementation Details

**File:** `formio-proxy-lambda/index.mjs`

**Request flow:**
```
API Gateway (JWT validated) → Lambda
  1. Read formPath from pathParameters
  2. Check in-memory cache (keyed by formPath)
  3. If cache miss or expired:
     a. Get Form.io credentials from Secrets Manager (cached per instance)
     b. Fetch schema: GET {serverUrl}/{projectId}/form/{formPath}
        with header: Authorization: Bearer {apiKey}
     c. Validate response is valid JSON
     d. Compute ETag: SHA-256 hex of response body
     e. Store in cache with TTL
  4. If client sent If-None-Match matching ETag → return 304
  5. Otherwise return 200 with schema JSON + ETag header
```

**Error responses:**
```json
{ "error": "Missing form path" }           → 400
{ "error": "Schema not found" }            → 404 (if upstream returns 404)
{ "error": "Upstream server error" }       → 502 (if upstream unreachable or 5xx)
{ "error": "Internal server error" }       → 500 (unexpected failures)
```

**Headers returned:**
- `Content-Type: application/json`
- `ETag: "<sha256-hex>"`
- `Cache-Control: private, max-age=300`

**Important:** The `event.requestContext.authorizer.jwt.claims` object contains the decoded Auth0 token claims. Log `claims.sub` for audit trail but do not use it for authorization logic in this phase.

## Acceptance Criteria

- [ ] `GET /schemas/molina-hha-oh` returns the form schema JSON with status 200
- [ ] Response includes an `ETag` header
- [ ] Sending `If-None-Match` with a matching ETag returns 304 with no body
- [ ] Sending `If-None-Match` with a stale ETag returns 200 with the updated schema
- [ ] Requesting a non-existent form path returns 404 with a JSON error
- [ ] If the Form.io container is unreachable, returns 502 with a JSON error
- [ ] Secrets Manager is called only once per Lambda cold start (cached in module scope)
- [ ] Subsequent requests within the cache TTL do not call the Form.io container
- [ ] The authenticated user's `sub` claim is logged in CloudWatch for each request
- [ ] No sensitive data (API key, secret values) appears in logs
