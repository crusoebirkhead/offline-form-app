import { createHash } from "node:crypto";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// ---------------------------------------------------------------------------
// Module-scope caches (persist across warm invocations)
// ---------------------------------------------------------------------------

const secretsClient = new SecretsManagerClient();

let cachedCredentials = null; // { apiKey, serverUrl, projectId }

const schemaCache = new Map(); // formPath -> { schema, etag, expiresAt }
const CACHE_TTL_MS =
  (parseInt(process.env.FORMIO_SCHEMA_CACHE_TTL, 10) || 300) * 1000;

// ---------------------------------------------------------------------------
// Secrets Manager (cached for Lambda instance lifetime)
// ---------------------------------------------------------------------------

async function getCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const secretName = process.env.SECRET_NAME || "periscope/formio/api-key";
  const { SecretString } = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  const parsed = JSON.parse(SecretString);
  cachedCredentials = {
    apiKey: parsed.FORMIO_API_KEY,
    serverUrl: parsed.FORMIO_SERVER_URL || process.env.FORMIO_SERVER_URL,
    projectId: parsed.FORMIO_PROJECT_ID || process.env.FORMIO_PROJECT_ID,
  };
  return cachedCredentials;
}

// ---------------------------------------------------------------------------
// ETag helper
// ---------------------------------------------------------------------------

function computeEtag(body) {
  return createHash("sha256").update(body).digest("hex");
}

// ---------------------------------------------------------------------------
// Single schema fetch (used by both endpoints)
// ---------------------------------------------------------------------------

async function fetchSingleSchema(formPath, credentials) {
  const { apiKey, serverUrl, projectId } = credentials;
  const url = `${serverUrl}/${projectId}/form?path=${encodeURIComponent(formPath)}&tags=monolith&limit=1`;

  const res = await fetch(url, {
    headers: { "x-token": apiKey },
  });

  if (res.status === 404) return { status: 404 };
  if (!res.ok) return { status: res.status, upstream: true };

  const data = await res.json();

  // Form.io returns an array when querying by path
  const schema = Array.isArray(data) ? data[0] : data;
  if (!schema) return { status: 404 };

  const body = JSON.stringify(schema);
  const etag = computeEtag(body);

  return { status: 200, schema, body, etag };
}

// ---------------------------------------------------------------------------
// Schema cache helpers
// ---------------------------------------------------------------------------

function getCached(formPath) {
  const entry = schemaCache.get(formPath);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    schemaCache.delete(formPath);
    return null;
  }
  return entry;
}

function setCache(formPath, schema, body, etag) {
  schemaCache.set(formPath, {
    schema,
    body,
    etag,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ---------------------------------------------------------------------------
// Route: GET /schemas/{formPath+}
// ---------------------------------------------------------------------------

async function handleSingleSchema(event) {
  const formPath = event.pathParameters?.proxy || event.pathParameters?.formPath;
  if (!formPath) {
    return respond(400, { error: "Missing form path" });
  }

  const cached = getCached(formPath);
  if (cached) {
    if (clientEtagMatches(event, cached.etag)) {
      return respond(304);
    }
    return respondWithSchema(cached.body, cached.etag);
  }

  let credentials;
  try {
    credentials = await getCredentials();
  } catch (err) {
    console.error("Secrets Manager error:", err.name);
    return respond(500, { error: "Internal server error" });
  }

  const result = await fetchSingleSchema(formPath, credentials).catch(
    (err) => {
      console.error("Upstream fetch error:", err.message);
      return { status: 502, upstream: true };
    }
  );

  if (result.status === 404) return respond(404, { error: "Schema not found" });
  if (result.upstream) return respond(502, { error: "Upstream server error" });
  if (result.status !== 200) return respond(502, { error: "Upstream server error" });

  setCache(formPath, result.schema, result.body, result.etag);

  if (clientEtagMatches(event, result.etag)) {
    return respond(304);
  }

  return respondWithSchema(result.body, result.etag);
}

// ---------------------------------------------------------------------------
// Route: GET /schemas
// ---------------------------------------------------------------------------

async function handleBatchSchemas(event) {
  let credentials;
  try {
    credentials = await getCredentials();
  } catch (err) {
    console.error("Secrets Manager error:", err.name);
    return respond(500, { error: "Internal server error" });
  }

  const { apiKey, serverUrl, projectId } = credentials;

  // Fetch form list
  let forms;
  try {
    const listUrl = `${serverUrl}/${projectId}/form?type=form&tags=monolith&limit=100`;
    const res = await fetch(listUrl, {
      headers: { "x-token": apiKey },
    });
    if (!res.ok) {
      console.error("Form list fetch failed:", res.status);
      return respond(502, { error: "Upstream server error" });
    }
    forms = await res.json();
  } catch (err) {
    console.error("Form list fetch error:", err.message);
    return respond(502, { error: "Upstream server error" });
  }

  if (!Array.isArray(forms) || forms.length === 0) {
    const body = JSON.stringify({ schemas: [], count: 0 });
    const etag = computeEtag(body);
    return respond(200, null, body, etag);
  }

  // Fetch each schema in parallel, tolerating individual failures
  const results = await Promise.allSettled(
    forms.map(async (form) => {
      const formPath = form.path;
      if (!formPath) return null;

      const cached = getCached(formPath);
      if (cached) {
        return {
          formPath,
          title: form.title || formPath,
          etag: cached.etag,
          schema: cached.schema,
        };
      }

      const result = await fetchSingleSchema(formPath, credentials);
      if (result.status === 200) {
        setCache(formPath, result.schema, result.body, result.etag);
        return {
          formPath,
          title: form.title || formPath,
          etag: result.etag,
          schema: result.schema,
        };
      }

      throw new Error(`Failed to fetch ${formPath}: ${result.status}`);
    })
  );

  const schemas = [];
  const errors = [];

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      schemas.push(r.value);
    } else if (r.status === "rejected") {
      errors.push(r.reason.message);
    }
  }

  // Composite ETag from sorted per-schema etags
  const compositeInput = schemas
    .map((s) => s.etag)
    .sort()
    .join("");
  const compositeEtag = computeEtag(compositeInput);

  if (clientEtagMatches(event, compositeEtag)) {
    return respond(304);
  }

  const payload = {
    schemas,
    count: schemas.length,
    fetchedAt: new Date().toISOString(),
  };
  if (errors.length > 0) payload.errors = errors;

  const body = JSON.stringify(payload);
  return respond(200, null, body, compositeEtag);
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function clientEtagMatches(event, etag) {
  const ifNoneMatch =
    event.headers?.["if-none-match"] || event.headers?.["If-None-Match"];
  return ifNoneMatch === `"${etag}"` || ifNoneMatch === etag;
}

function respondWithSchema(body, etag) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: `"${etag}"`,
      "Cache-Control": "private, max-age=300",
    },
    body,
  };
}

function respond(statusCode, jsonObj, rawBody, etag) {
  if (statusCode === 304) {
    return { statusCode: 304, body: "" };
  }

  const body = rawBody || JSON.stringify(jsonObj);
  const headers = { "Content-Type": "application/json" };
  if (etag) {
    headers.ETag = `"${etag}"`;
    headers["Cache-Control"] = "private, max-age=300";
  }

  return { statusCode, headers, body };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handler(event) {
  // Log caller for audit trail (never log secrets)
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path;
  console.log(JSON.stringify({ action: "request", sub, method, path }));

  try {
    // Route: GET /schemas/{formPath+}
    if (event.pathParameters?.proxy || event.pathParameters?.formPath) {
      return await handleSingleSchema(event);
    }

    // Route: GET /schemas (batch)
    if (path === "/schemas" || path === "/schemas/") {
      return await handleBatchSchemas(event);
    }

    return respond(404, { error: "Not found" });
  } catch (err) {
    console.error("Unhandled error:", err);
    return respond(500, { error: "Internal server error" });
  }
}
