# Task 06: Create API Gateway with Auth0 JWT Authorizer

**Type:** Manual (Infrastructure)
**Phase:** 1 — API Layer
**Dependencies:** Task 01

## Description

Create an HTTP API in API Gateway v2 with a built-in JWT authorizer that validates Auth0 access tokens. API Gateway handles all JWT validation (signature, expiry, audience, issuer) before the request reaches the Lambda — the Lambda never sees unauthenticated traffic.

## Scope

- Create HTTP API (API Gateway v2 — not REST API v1)
- Configure JWT authorizer pointing to Auth0
- Define routes for schema endpoints
- Configure CORS (defense-in-depth)
- Set up throttling

## Steps

1. **Create HTTP API:**
   - **Name:** `periscope-formio-proxy`
   - **Protocol:** HTTP
   - **Stage:** `$default` with auto-deploy enabled

2. **Create JWT Authorizer:**
   - **Name:** `auth0-jwt`
   - **Identity source:** `$request.header.Authorization`
   - **Issuer URL:** `https://periscope365-dev.us.auth0.com/`  
     (trailing slash required — must match the `iss` claim in Auth0 tokens)
   - **Audience:** The audience identifier from Task 01 (e.g., `https://api.periscope365.com/formio`)

3. **Create Routes** (all with the JWT authorizer attached):

   | Method | Path                   | Lambda Target         | Purpose                            |
   | ------ | ---------------------- | --------------------- | ---------------------------------- |
   | `GET`  | `/schemas`             | `formio-proxy-lambda` | Batch fetch all schemas with ETags |
   | `GET`  | `/schemas/{formPath+}` | `formio-proxy-lambda` | Fetch single schema by path        |

4. **Configure CORS** (on the API level):
   - **Allow Origins:** `*`
   - **Allow Methods:** `GET, OPTIONS`
   - **Allow Headers:** `Authorization, Content-Type`
   - **Max Age:** `86400`

5. **Configure Throttling** (on the stage):
   - **Rate limit:** 100 requests/second (burst)
   - **Steady-state:** 50 requests/second
   - Per-route overrides if needed

6. **Custom Domain** (optional but recommended):
   - Map `formio-api.periscope365.com` to the API
   - Provision an ACM certificate
   - Create Route 53 alias record

## Acceptance Criteria

- [x] HTTP API `periscope-formio-proxy` exists and is deployed
- [x] JWT authorizer is configured with correct Auth0 issuer and audience
- [x] `GET /schemas` and `GET /schemas/{formPath+}` routes exist and require authorization
- [x] Calling any route without a token returns `401 Unauthorized`
- [x] Calling with an expired token returns `401`
- [x] Calling with a valid Auth0 token (correct audience) returns `200` (once Lambda is deployed)
- [x] Calling with a valid token for a _different_ audience returns `401`
- [x] Throttling is configured
- [x] API endpoint URL is documented (e.g., `https://<api-id>.execute-api.<region>.amazonaws.com`)
