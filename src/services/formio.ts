import * as Crypto from 'expo-crypto';
import { getStoredToken } from '../auth/auth0';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FORMIO_BASE_URL =
  process.env.EXPO_PUBLIC_FORMIO_BASE_URL ??
  'https://l2ioi2xnkg.execute-api.us-west-2.amazonaws.com';

const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormSchemaResponse {
  title: string;
  path: string;
  display: string;
  components: unknown[];
  version: string;
  [key: string]: unknown;
}

export interface FetchSchemaResult {
  schema: FormSchemaResponse;
  version: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function contentHash(content: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await getStoredToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a single form schema from the Lambda proxy.
 * Returns null on any network, auth, or server error.
 */
export async function fetchFormSchema(formPath: string): Promise<FetchSchemaResult | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  let response: Response;
  try {
    response = await fetch(`${FORMIO_BASE_URL}/schemas/${formPath}`, {
      method: 'GET',
      headers,
      signal: withTimeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  try {
    const body = (await response.json()) as Record<string, unknown>;

    const schema: FormSchemaResponse = {
      ...body,
      title: (body.title as string) ?? '',
      path: (body.path as string) ?? formPath,
      display: (body.display as string) ?? 'form',
      components: (body.components as unknown[]) ?? [],
      version: '',
    };

    const etag = response.headers.get('etag');
    const version = etag ?? (await contentHash(JSON.stringify(body)));

    return { schema: { ...schema, version }, version };
  } catch {
    return null;
  }
}

/**
 * Fetch all available form paths from the Lambda batch endpoint.
 * Falls back to an empty array on failure.
 */
export async function fetchAllFormPaths(): Promise<string[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  let response: Response;
  try {
    response = await fetch(`${FORMIO_BASE_URL}/schemas`, {
      method: 'GET',
      headers,
      signal: withTimeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  try {
    const data = (await response.json()) as { schemas?: { formPath?: string }[] };
    return (data.schemas ?? []).map((s) => s.formPath).filter(Boolean) as string[];
  } catch {
    return [];
  }
}
