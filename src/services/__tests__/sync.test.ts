// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((_algo: string, content: string) =>
    Promise.resolve(`sha256-${content.length}`),
  ),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('expo-sqlite', () => {
  const mockDb = {
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    execAsync: jest.fn(),
  };
  return {
    openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
    __mockDb: mockDb,
  };
});

jest.mock('../formio', () => ({
  fetchAllFormPaths: jest.fn(),
  fetchFormSchema: jest.fn(),
}));

jest.mock('../../db/schemas', () => ({
  getSchemaByPath: jest.fn(),
  upsertSchema: jest.fn(),
}));

import * as Network from 'expo-network';
import { fetchAllFormPaths, fetchFormSchema } from '../formio';
import { getSchemaByPath, upsertSchema } from '../../db/schemas';
import type { CachedFormSchema } from '../../types';

const mockNetwork = Network.getNetworkStateAsync as jest.Mock;
const mockFetchPaths = fetchAllFormPaths as jest.Mock;
const mockFetchSchema = fetchFormSchema as jest.Mock;
const mockGetSchemaByPath = getSchemaByPath as jest.Mock;
const mockUpsertSchema = upsertSchema as jest.Mock;

// Import after mocks are set up
import { syncSchemas, getLastSyncTimestamp } from '../sync';

// Access the mock db for metadata tests
const SQLite = jest.requireMock('expo-sqlite') as { __mockDb: Record<string, jest.Mock> };
const mockDb = SQLite.__mockDb;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// syncSchemas — offline
// ---------------------------------------------------------------------------

describe('syncSchemas', () => {
  it('returns early when offline', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });

    const result = await syncSchemas();

    expect(result).toEqual({ synced: false, reason: 'offline' });
    expect(mockFetchPaths).not.toHaveBeenCalled();
  });

  it('returns early when internet is not reachable', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: false,
    });

    const result = await syncSchemas();

    expect(result).toEqual({ synced: false, reason: 'offline' });
  });

  // -------------------------------------------------------------------------
  // syncSchemas — online, version comparison
  // -------------------------------------------------------------------------

  it('updates schema when remote version differs from local', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockFetchPaths.mockResolvedValueOnce(['assessment/standard']);

    const remoteSchema = {
      title: 'Standard Assessment',
      path: 'assessment/standard',
      display: 'form',
      components: [{ type: 'textfield', key: 'name' }],
      version: 'v2',
    };
    mockFetchSchema.mockResolvedValueOnce({ schema: remoteSchema, version: 'v2' });

    const localSchema: CachedFormSchema = {
      id: '1',
      form_path: 'assessment/standard',
      title: 'Standard Assessment',
      json_schema: '{}',
      version: 'v1',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    mockGetSchemaByPath.mockResolvedValueOnce(localSchema);
    mockUpsertSchema.mockResolvedValueOnce({ ...localSchema, version: 'v2' });

    const result = await syncSchemas();

    expect(result).toEqual({ synced: true, updated: 1, unchanged: 0, failed: 0 });
    expect(mockUpsertSchema).toHaveBeenCalledTimes(1);
  });

  it('skips schema when version matches', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockFetchPaths.mockResolvedValueOnce(['assessment/standard']);

    mockFetchSchema.mockResolvedValueOnce({
      schema: { title: 'Standard Assessment', path: 'assessment/standard', version: 'v1' },
      version: 'v1',
    });

    mockGetSchemaByPath.mockResolvedValueOnce({
      id: '1',
      form_path: 'assessment/standard',
      title: 'Standard Assessment',
      json_schema: '{}',
      version: 'v1',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const result = await syncSchemas();

    expect(result).toEqual({ synced: true, updated: 0, unchanged: 1, failed: 0 });
    expect(mockUpsertSchema).not.toHaveBeenCalled();
  });

  it('inserts schema when no local version exists', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockFetchPaths.mockResolvedValueOnce(['visit/hha-report']);

    const remoteSchema = {
      title: 'HHA Visit Report',
      path: 'visit/hha-report',
      display: 'form',
      components: [],
      version: 'v1',
    };
    mockFetchSchema.mockResolvedValueOnce({ schema: remoteSchema, version: 'v1' });
    mockGetSchemaByPath.mockResolvedValueOnce(null);
    mockUpsertSchema.mockResolvedValueOnce({
      id: 'new-id',
      form_path: 'visit/hha-report',
      title: 'HHA Visit Report',
      json_schema: JSON.stringify(remoteSchema),
      version: 'v1',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const result = await syncSchemas();

    expect(result).toEqual({ synced: true, updated: 1, unchanged: 0, failed: 0 });
    expect(mockUpsertSchema).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // syncSchemas — failure isolation
  // -------------------------------------------------------------------------

  it('counts failed fetches without aborting the sync', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockFetchPaths.mockResolvedValueOnce(['assessment/standard', 'visit/hha-report']);

    // First schema fetch fails
    mockFetchSchema.mockResolvedValueOnce(null);

    // Second succeeds and is new
    const remoteSchema = {
      title: 'HHA Visit Report',
      path: 'visit/hha-report',
      display: 'form',
      components: [],
      version: 'v1',
    };
    mockFetchSchema.mockResolvedValueOnce({ schema: remoteSchema, version: 'v1' });
    mockGetSchemaByPath.mockResolvedValueOnce(null);
    mockUpsertSchema.mockResolvedValueOnce({
      id: 'new-id',
      ...remoteSchema,
      json_schema: JSON.stringify(remoteSchema),
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const result = await syncSchemas();

    expect(result).toEqual({ synced: true, updated: 1, unchanged: 0, failed: 1 });
  });

  it('handles multiple schemas with mixed results', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockFetchPaths.mockResolvedValueOnce([
      'assessment/standard',
      'visit/hha-report',
      'service/pca-log',
    ]);

    // Schema 1: unchanged
    mockFetchSchema.mockResolvedValueOnce({
      schema: { title: 'A', path: 'assessment/standard', version: 'v1' },
      version: 'v1',
    });
    mockGetSchemaByPath.mockResolvedValueOnce({
      id: '1',
      form_path: 'assessment/standard',
      title: 'A',
      json_schema: '{}',
      version: 'v1',
      updated_at: '',
    });

    // Schema 2: updated
    mockFetchSchema.mockResolvedValueOnce({
      schema: { title: 'B', path: 'visit/hha-report', version: 'v3' },
      version: 'v3',
    });
    mockGetSchemaByPath.mockResolvedValueOnce({
      id: '2',
      form_path: 'visit/hha-report',
      title: 'B',
      json_schema: '{}',
      version: 'v2',
      updated_at: '',
    });
    mockUpsertSchema.mockResolvedValueOnce({} as CachedFormSchema);

    // Schema 3: fetch failed
    mockFetchSchema.mockResolvedValueOnce(null);

    const result = await syncSchemas();

    expect(result).toEqual({ synced: true, updated: 1, unchanged: 1, failed: 1 });
  });

  it('persists last sync timestamp on success', async () => {
    mockNetwork.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockFetchPaths.mockResolvedValueOnce([]);

    await syncSchemas();

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('app_metadata'),
      expect.arrayContaining(['last_sync_timestamp']),
    );
  });
});

// ---------------------------------------------------------------------------
// getLastSyncTimestamp
// ---------------------------------------------------------------------------

describe('getLastSyncTimestamp', () => {
  it('returns the stored timestamp', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ value: '2026-04-25T12:00:00.000Z' });

    const result = await getLastSyncTimestamp();

    expect(result).toBe('2026-04-25T12:00:00.000Z');
  });

  it('returns null when no timestamp is stored', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null);

    const result = await getLastSyncTimestamp();

    expect(result).toBeNull();
  });
});
