const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockExecAsync = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
    execAsync: mockExecAsync,
  }),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((_algo: string, content: string) =>
    Promise.resolve(`hash-of-${content.length}`),
  ),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

import { seedSchemas } from '../seed';
import { upsertSchema } from '../schemas';

jest.mock('../schemas', () => ({
  upsertSchema: jest.fn().mockResolvedValue({}),
}));

const mockUpsertSchema = upsertSchema as jest.MockedFunction<typeof upsertSchema>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('seedSchemas', () => {
  it('seeds all bundled schemas on first launch', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await seedSchemas();

    expect(mockUpsertSchema).toHaveBeenCalledTimes(3);

    const titles = mockUpsertSchema.mock.calls.map((call) => call[0].title);
    expect(titles).toContain('Standard Assessment');
    expect(titles).toContain('Molina HHA OH');
    expect(titles).toContain('PCA Service Log');
  });

  it('sets form_path from the JSON path field', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await seedSchemas();

    const paths = mockUpsertSchema.mock.calls.map((call) => call[0].form_path);
    expect(paths).toContain('assessment/standard');
    expect(paths).toContain('molina-hha-oh');
    expect(paths).toContain('service/pca');
  });

  it('derives version from a SHA-256 content hash', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await seedSchemas();

    mockUpsertSchema.mock.calls.forEach((call) => {
      expect(call[0].version).toMatch(/^hash-of-\d+$/);
    });
  });

  it('stores the full JSON as json_schema string', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await seedSchemas();

    mockUpsertSchema.mock.calls.forEach((call) => {
      const parsed = JSON.parse(call[0].json_schema);
      expect(parsed).toHaveProperty('components');
      expect(parsed).toHaveProperty('title');
    });
  });

  it('marks seeding complete in app_metadata', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await seedSchemas();

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO app_metadata'),
      expect.arrayContaining(['schemas_seed_version']),
    );
  });

  it('skips seeding when already seeded', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      key: 'schemas_seed_version',
      value: '2',
    });

    await seedSchemas();

    expect(mockUpsertSchema).not.toHaveBeenCalled();
  });

  it('checks the schemas_seeded flag in app_metadata', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await seedSchemas();

    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('app_metadata'),
      expect.arrayContaining(['schemas_seed_version']),
    );
  });
});
