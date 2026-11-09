# Task 13: End-to-End Integration Testing

**Type:** Manual + Code
**Phase:** 4 — Validation
**Dependencies:** All previous tasks

## Description

Validate the entire flow from the offline app through API Gateway and Lambda to the Form.io Docker container. This covers the happy path, error scenarios, and offline resilience. Tests should be run against the dev environment before promoting to staging/production.

## Scope

- Auth0 token acquisition from the offline app
- API Gateway JWT validation
- Lambda → Form.io connectivity
- Schema sync in the offline app
- Offline fallback behavior
- Security boundary verification

## Test Cases

### Auth Flow

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Valid login | Log in to offline app via Auth0 | Access token stored in SecureStore, scoped to new audience |
| 2 | Token in request | Trigger schema sync | Network request to API Gateway includes `Authorization: Bearer <token>` |
| 3 | Token refresh | Wait for token expiry, trigger sync | App silently refreshes token and retries |
| 4 | Expired token (no refresh) | Delete refresh token from SecureStore, let access token expire, trigger sync | App shows login screen (session expired banner) |

### API Gateway

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5 | No token | `curl https://<api>/schemas` | 401 Unauthorized |
| 6 | Invalid token | `curl -H "Authorization: Bearer garbage" https://<api>/schemas` | 401 Unauthorized |
| 7 | Wrong audience | Get a valid Auth0 token for a different audience, send it | 401 Unauthorized |
| 8 | Valid token | `curl -H "Authorization: Bearer <valid>" https://<api>/schemas` | 200 with schema list |
| 9 | Rate limiting | Send 200 requests in quick succession | Some return 429 Too Many Requests |

### Lambda → Form.io

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10 | Single schema | `GET /schemas/molina-hha-oh` | 200 with Molina HHA OH schema JSON |
| 11 | Batch schemas | `GET /schemas` | 200 with all schemas, count > 0 |
| 12 | Non-existent schema | `GET /schemas/does-not-exist` | 404 with JSON error |
| 13 | ETag caching | Send request, get ETag, resend with `If-None-Match` | 304 Not Modified |
| 14 | Stale ETag | Modify schema in Form.io, send old ETag | 200 with updated schema |
| 15 | Form.io down | Stop Form.io container, send request | 502 with JSON error |

### Offline App Sync

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 16 | First launch sync | Install app, log in, check HomeScreen | Seed schemas loaded, sync attempted, schemas updated from server |
| 17 | Offline launch | Enable airplane mode, launch app | Seed schemas available, sync skipped with reason "offline" |
| 18 | Offline → online | Start offline, open form, go online, trigger sync | Schemas update in background, existing form entry unaffected |
| 19 | New schema discovery | Add a new form in Form.io, trigger sync | New schema appears in app's form picker |
| 20 | Schema update | Modify a form field in Form.io, trigger sync | Local schema updates, ETag changes |

### Security Boundary

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 21 | API key not in app | Search app bundle for Form.io API key string | Not found |
| 22 | Lambda logs clean | Check CloudWatch logs after requests | No API keys or secrets logged |
| 23 | Network inspection | Use Charles Proxy / mitmproxy on device | Only Auth0 token visible, no Form.io API key in transit |
| 24 | Lambda SG restriction | From Lambda, attempt to reach other ports on VPS | Connection refused (only 3001 allowed) |

## Acceptance Criteria

- [ ] All 24 test cases pass
- [ ] Auth flow works end-to-end: login → token → API Gateway → Lambda → Form.io → SQLite → WebView render
- [ ] Offline-first behavior is preserved: app is usable without network
- [ ] No secrets are exposed to the client or logged server-side
- [ ] Cold start latency is documented (should be < 2s including Secrets Manager fetch)
- [ ] Schema sync completes in < 5s on a reasonable connection
- [ ] Results documented with screenshots/logs for each test case
