import type { Entry } from '../../types';

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

import { createEntry, updateEntry, getEntries, getEntryById, deleteEntry } from '../entries';

beforeEach(() => {
  jest.clearAllMocks();
  uuidCounter = 0;
});

describe('createEntry', () => {
  it('inserts a draft entry and returns it', async () => {
    const entry = await createEntry('inspection', 'Site Inspection');

    expect(entry.id).toBe('test-uuid-1');
    expect(entry.form_type).toBe('inspection');
    expect(entry.form_title).toBe('Site Inspection');
    expect(entry.data_json).toBe('{}');
    expect(entry.status).toBe('draft');
    expect(entry.sent_at).toBeNull();
    expect(entry.created_at).toBe(entry.updated_at);
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['test-uuid-1', 'inspection', 'Site Inspection']),
    );
  });

  it('generates unique IDs for each call', async () => {
    const entry1 = await createEntry('type-a', 'Title A');
    const entry2 = await createEntry('type-b', 'Title B');

    expect(entry1.id).toBe('test-uuid-1');
    expect(entry2.id).toBe('test-uuid-2');
  });

  it('sets created_at and updated_at to the same ISO timestamp', async () => {
    const entry = await createEntry('form', 'Form Title');

    expect(entry.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.created_at).toBe(entry.updated_at);
  });
});

describe('updateEntry', () => {
  const existingEntry: Entry = {
    id: 'entry-1',
    form_type: 'inspection',
    form_title: 'Site Inspection',
    data_json: '{"field":"updated"}',
    status: 'completed',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-04-25T12:00:00.000Z',
    sent_at: null,
  };

  it('updates data_json and bumps updated_at', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ ...existingEntry });

    const result = await updateEntry('entry-1', {
      data_json: '{"field":"updated"}',
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain('data_json = ?');
    expect(result).toEqual(existingEntry);
  });

  it('updates status only when provided', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ ...existingEntry });

    await updateEntry('entry-1', { status: 'completed' });

    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain('status = ?');
    expect(sql).not.toContain('data_json');
  });

  it('throws when entry does not exist', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    await expect(updateEntry('nonexistent', { status: 'draft' })).rejects.toThrow(
      'Entry not found: nonexistent',
    );
  });

  it('returns a new object (immutability)', async () => {
    const dbRow = { ...existingEntry };
    mockGetFirstAsync.mockResolvedValueOnce(dbRow);

    const result = await updateEntry('entry-1', { status: 'completed' });

    expect(result).not.toBe(dbRow);
    expect(result).toEqual(dbRow);
  });
});

describe('getEntries', () => {
  const entries: Entry[] = [
    {
      id: 'e1',
      form_type: 'a',
      form_title: 'A',
      data_json: '{}',
      status: 'draft',
      created_at: '2026-04-25T10:00:00.000Z',
      updated_at: '2026-04-25T12:00:00.000Z',
      sent_at: null,
    },
    {
      id: 'e2',
      form_type: 'b',
      form_title: 'B',
      data_json: '{}',
      status: 'completed',
      created_at: '2026-04-25T09:00:00.000Z',
      updated_at: '2026-04-25T11:00:00.000Z',
      sent_at: null,
    },
  ];

  it('returns all entries ordered by updated_at DESC', async () => {
    mockGetAllAsync.mockResolvedValueOnce(entries.map((e) => ({ ...e })));

    const result = await getEntries();

    expect(result).toHaveLength(2);
    const sql = mockGetAllAsync.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY updated_at DESC');
    expect(sql).not.toContain('WHERE');
  });

  it('filters by status when provided', async () => {
    mockGetAllAsync.mockResolvedValueOnce([{ ...entries[0] }]);

    const result = await getEntries('draft');

    expect(result).toHaveLength(1);
    const sql = mockGetAllAsync.mock.calls[0][0] as string;
    expect(sql).toContain('WHERE status = ?');
    expect(mockGetAllAsync.mock.calls[0][1]).toEqual(['draft']);
  });

  it('returns empty array when no entries exist', async () => {
    mockGetAllAsync.mockResolvedValueOnce([]);

    const result = await getEntries();

    expect(result).toEqual([]);
  });

  it('returns new objects (immutability)', async () => {
    const dbRows = entries.map((e) => ({ ...e }));
    mockGetAllAsync.mockResolvedValueOnce(dbRows);

    const result = await getEntries();

    result.forEach((item, i) => {
      expect(item).not.toBe(dbRows[i]);
    });
  });
});

describe('getEntryById', () => {
  it('returns the entry when found', async () => {
    const entry: Entry = {
      id: 'e1',
      form_type: 'a',
      form_title: 'A',
      data_json: '{}',
      status: 'draft',
      created_at: '2026-04-25T10:00:00.000Z',
      updated_at: '2026-04-25T12:00:00.000Z',
      sent_at: null,
    };
    mockGetFirstAsync.mockResolvedValueOnce({ ...entry });

    const result = await getEntryById('e1');

    expect(result).toEqual(entry);
    expect(mockGetFirstAsync.mock.calls[0][1]).toEqual(['e1']);
  });

  it('returns null for a nonexistent ID', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);

    const result = await getEntryById('missing');

    expect(result).toBeNull();
  });

  it('returns a new object (immutability)', async () => {
    const dbRow: Entry = {
      id: 'e1',
      form_type: 'a',
      form_title: 'A',
      data_json: '{}',
      status: 'draft',
      created_at: '2026-04-25T10:00:00.000Z',
      updated_at: '2026-04-25T12:00:00.000Z',
      sent_at: null,
    };
    mockGetFirstAsync.mockResolvedValueOnce(dbRow);

    const result = await getEntryById('e1');

    expect(result).not.toBe(dbRow);
  });
});

describe('deleteEntry', () => {
  it('deletes the entry by ID', async () => {
    await deleteEntry('e1');

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain('DELETE FROM entries');
    expect(mockRunAsync.mock.calls[0][1]).toEqual(['e1']);
  });

  it('does not throw for a nonexistent ID', async () => {
    await expect(deleteEntry('nonexistent')).resolves.toBeUndefined();
  });
});
