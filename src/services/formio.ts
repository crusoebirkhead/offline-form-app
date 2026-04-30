import * as Crypto from 'expo-crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FORMIO_BASE_URL = process.env.EXPO_PUBLIC_FORMIO_BASE_URL ?? 'http://localhost:3001';

const FORMIO_API_KEY = process.env.EXPO_PUBLIC_FORMIO_API_KEY ?? '';

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
// Known form paths (derived from bundled seed schemas)
// ---------------------------------------------------------------------------

const KNOWN_FORM_PATHS: readonly string[] = [
  'assessment/standard',
  'visit/hha-report',
  'service/pca-log',
];

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch a single form schema from the Form.io server.
 * Returns null on any network or server error.
 */
export async function fetchFormSchema(formPath: string): Promise<FetchSchemaResult | null> {
  let response: Response;

  try {
    response = await fetch(`${FORMIO_BASE_URL}/${formPath}`, {
      method: 'GET',
      headers: {
        'x-token': FORMIO_API_KEY,
        Accept: 'application/json',
      },
      signal: withTimeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

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

    // Use ETag if the server provides one, otherwise hash the content
    const etag = response.headers.get('etag');
    const version = etag ?? (await contentHash(JSON.stringify(body)));

    return { schema: { ...schema, version }, version };
  } catch {
    return null;
  }
}

/**
 * Return the list of form paths that should be synced.
 * Uses the bundled list of known form paths.
 */
export async function fetchAllFormPaths(): Promise<string[]> {
  return [...KNOWN_FORM_PATHS];
}
