# Task 4.1: Build Periscope API Client

**Phase:** 4 — Send to Periscope Portal
**Status:** Not Started
**Depends on:** 0.2

---

## Description

Create the HTTP client service that communicates with the legacy Periscope application to submit completed assessment data.

## Scope

- Create `src/services/periscope.ts`
- Implement `submitAssessment(payload: SubmissionPayload): Promise<SubmissionResult>`:
  - POST to the legacy bulk endpoint (e.g., `POST /api/mobile/assessment/submit`)
  - Send the full `data_json` blob along with metadata (`form_type`, `patient_id` if available)
  - Include auth token in the request header
  - Parse the response for success/failure and return a typed result
- Define types:

```typescript
interface SubmissionPayload {
  dataJson: object;
  formType: string;
}

interface SubmissionResult {
  success: boolean;
  requestId?: string;
  error?: string;
}
```

- Handle network errors, timeouts, and non-2xx responses with clear error messages
- Make the base URL configurable via environment/config (not hardcoded)

## Acceptance Criteria

- [ ] `periscope.ts` exports a `submitAssessment` function
- [ ] Function sends a POST request with the correct payload shape
- [ ] Auth token is included in the request header
- [ ] Network errors return a typed `SubmissionResult` with `success: false` and a descriptive `error`
- [ ] HTTP timeout is set (e.g., 30 seconds)
- [ ] Base URL is configurable, not hardcoded
- [ ] Function does not throw on failure — always returns a result object
