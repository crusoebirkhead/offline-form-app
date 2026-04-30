import type { CachedFormSchema } from '../../types';

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

let uuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    uuidCounter += 1;
    return `test-uuid-${uuidCounter}`;
  }),
}));

import { upsertSchema, getSchemaByPath, getAllSchemas } from '../schemas';

beforeEach(() => {
  jest.clearAllMocks();
  uuidCounter = 0;
});

describe('upsertSchema', () => {
  it('inserts a new schema when form_path does not exist', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    const result = await upsertSchema({
      form_path: 'project/inspection',
      title: 'Site Inspection',
      json_schema: '{"components":[]}',
      version: '1.0.0',
      updated_at: '2026-04-25T10:00:00.000Z',
    });

    expect(result.id).toBe('test-uuid-1');
    expect(result.form_path).toBe('project/inspection');
    expect(result.title).toBe('Site Inspection');
    expect(result.json_schema).toBe('{"components":[]}');
    expect(result.version).toBe('1.0.0');
    expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT');
    expect(sql).toContain('ON CONFLICT');
  });

  it('updates json_schema, version, and updated_at when form_path already exists', async () => {
    const existing: CachedFormSchema = {
      id: 'existing-id',
      form_path: 'project/inspection',
      title: 'Site Inspection',
      json_schema: '{"components":[]}',
      version: '1.0.0',
      updated_at: '2026-04-25T10:00:00.000Z',
    };
    mockGetFirstAsync.mockResolvedValueOnce({ ...existing });

    const result = await upsertSchema({
      form_path: 'project/inspection',
      title: 'Site Inspection v2',
      json_schema: '{"components":["new"]}',
      version: '2.0.0',
      updated_at: '2026-04-25T12:00:00.000Z',
    });

    expect(result.id).toBe('existing-id');
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain('ON CONFLICT(form_path)');
    expect(sql).toContain('DO UPDATE SET');
  });

  it('sets updated_at to current time', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    const result = await upsertSchema({
      form_path: 'project/daily',
      title: 'Daily Report',
      json_schema: '{}',
      version: '1.0.0',
      updated_at: '2020-01-01T00:00:00.000Z',
    });

    expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.updated_at).not.toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('getSchemaByPath', () => {
  it('returns the schema when found', async () => {
    const schema: CachedFormSchema = {
      id: 's1',
      form_path: 'project/inspection',
      title: 'Site Inspection',
      json_schema: '{"components":[]}',
      version: '1.0.0',
      updated_at: '2026-04-25T10:00:00.000Z',
    };
    mockGetFirstAsync.mockResolvedValueOnce({ ...schema });

    const result = await getSchemaByPath('project/inspection');

    expect(result).toEqual(schema);
    expect(mockGetFirstAsync.mock.calls[0][1]).toEqual(['project/inspection']);
  });

  it('returns null for an unknown path', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    const result = await getSchemaByPath('unknown/path');

    expect(result).toBeNull();
  });

  it('returns a new object (immutability)', async () => {
    const dbRow: CachedFormSchema = {
      id: 's1',
      form_path: 'project/inspection',
      title: 'Site Inspection',
      json_schema: '{"components":[]}',
      version: '1.0.0',
      updated_at: '2026-04-25T10:00:00.000Z',
    };
    mockGetFirstAsync.mockResolvedValueOnce(dbRow);

    const result = await getSchemaByPath('project/inspection');

    expect(result).not.toBe(dbRow);
    expect(result).toEqual(dbRow);
  });
});

describe('getAllSchemas', () => {
  const schemas: CachedFormSchema[] = [
    {
      id: 's1',
      form_path: 'project/daily',
      title: 'Daily Report',
      json_schema: '{}',
      version: '1.0.0',
      updated_at: '2026-04-25T10:00:00.000Z',
    },
    {
      id: 's2',
      form_path: 'project/inspection',
      title: 'Site Inspection',
      json_schema: '{}',
      version: '1.0.0',
      updated_at: '2026-04-25T11:00:00.000Z',
    },
  ];

  it('returns all schemas ordered by title', async () => {
    mockGetAllAsync.mockResolvedValueOnce(schemas.map((s) => ({ ...s })));

    const result = await getAllSchemas();

    expect(result).toHaveLength(2);
    const sql = mockGetAllAsync.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY title');
  });

  it('returns an empty array when no schemas are cached', async () => {
    mockGetAllAsync.mockResolvedValueOnce([]);

    const result = await getAllSchemas();

    expect(result).toEqual([]);
  });

  it('returns new objects (immutability)', async () => {
    const dbRows = schemas.map((s) => ({ ...s }));
    mockGetAllAsync.mockResolvedValueOnce(dbRows);

    const result = await getAllSchemas();

    result.forEach((item, i) => {
      expect(item).not.toBe(dbRows[i]);
    });
  });
});
