// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((_algo: string, content: string) =>
    Promise.resolve(`sha256-${content.length}`),
  ),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const mockFetch = jest.fn() as jest.Mock;
(globalThis as Record<string, unknown>).fetch = mockFetch;

import { fetchFormSchema, fetchAllFormPaths } from '../formio';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// fetchFormSchema
// ---------------------------------------------------------------------------

describe('fetchFormSchema', () => {
  const fakeBody = {
    title: 'Standard Assessment',
    path: 'assessment/standard',
    display: 'form',
    components: [{ type: 'textfield', key: 'name' }],
  };

  function okResponse(body: object, headers?: Record<string, string>): Response {
    const headersObj = new Headers(headers);
    return {
      ok: true,
      status: 200,
      headers: headersObj,
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }

  it('returns schema and version when server responds with 200', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(fakeBody));

    const result = await fetchFormSchema('assessment/standard');

    expect(result).not.toBeNull();
    expect(result!.schema.title).toBe('Standard Assessment');
    expect(result!.schema.path).toBe('assessment/standard');
    expect(result!.schema.components).toEqual([{ type: 'textfield', key: 'name' }]);
    expect(result!.version).toBeTruthy();
  });

  it('includes x-token header in the request', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(fakeBody));

    await fetchFormSchema('assessment/standard');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-token']).toBeDefined();
  });

  it('uses ETag as version when present', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(fakeBody, { etag: '"v42"' }));

    const result = await fetchFormSchema('assessment/standard');

    expect(result!.version).toBe('"v42"');
    expect(result!.schema.version).toBe('"v42"');
  });

  it('falls back to content hash when no ETag', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(fakeBody));

    const result = await fetchFormSchema('assessment/standard');

    expect(result!.version).toMatch(/^sha256-/);
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await fetchFormSchema('assessment/standard');

    expect(result).toBeNull();
  });

  it('returns null on non-ok response (e.g. 404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as unknown as Response);

    const result = await fetchFormSchema('unknown/path');

    expect(result).toBeNull();
  });

  it('returns null when response body is not valid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as unknown as Response);

    const result = await fetchFormSchema('assessment/standard');

    expect(result).toBeNull();
  });

  it('constructs URL from base URL and form path', async () => {
    mockFetch.mockResolvedValueOnce(okResponse(fakeBody));

    await fetchFormSchema('visit/hha-report');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/visit/hha-report');
  });
});

// ---------------------------------------------------------------------------
// fetchAllFormPaths
// ---------------------------------------------------------------------------

describe('fetchAllFormPaths', () => {
  it('returns the known form paths', async () => {
    const paths = await fetchAllFormPaths();

    expect(paths).toEqual(['assessment/standard', 'visit/hha-report', 'service/pca-log']);
  });

  it('returns a new array each call (immutability)', async () => {
    const first = await fetchAllFormPaths();
    const second = await fetchAllFormPaths();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});
