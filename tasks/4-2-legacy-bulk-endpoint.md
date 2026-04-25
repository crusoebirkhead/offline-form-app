# Task 4.2: Design Legacy Bulk Submission Endpoint

**Phase:** 4 — Send to Periscope Portal
**Status:** Not Started
**Depends on:** None (backend task, can be done in parallel)

---

## Description

Define and implement a new API endpoint on the legacy CodeIgniter application that accepts a full assessment JSON blob from the mobile app. This is a backend task on the periscope365-legacy repository.

## Scope

- Create a new controller in the legacy app: `application/controllers/api/Mobile.php`
- Implement `POST /api/mobile/assessment/submit` endpoint:
  - Accept JSON body with `data_json` (full assessment blob), `form_type`, and optional metadata
  - Validate the incoming JSON structure
  - Create or update a request record in FileMaker with the full `data_json`
  - Return a JSON response with `request_id` and status
- Add token-based authentication (Bearer token) since mobile app uses Auth0 JWTs
  - Verify the JWT signature against Auth0's JWKS endpoint
  - Extract user identity from the token
- Rate limit the endpoint to prevent abuse

**Note:** The data transition from the JSON blob into FileMaker's individual fields will be handled by a combination of legacy development and manual intervention, outside the scope of this task.

## Acceptance Criteria

- [ ] `POST /api/mobile/assessment/submit` endpoint exists on the legacy app
- [ ] Endpoint accepts a JSON body with `data_json` and `form_type`
- [ ] Endpoint validates the JWT Bearer token
- [ ] On success, a request record is created in FileMaker with the JSON blob
- [ ] Response returns `{ success: true, request_id: "..." }`
- [ ] Invalid or missing auth returns HTTP 401
- [ ] Malformed JSON returns HTTP 400 with a descriptive error
- [ ] Endpoint is rate-limited
