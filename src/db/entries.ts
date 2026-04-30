import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { Entry, EntryStatus } from '../types';
import { initDatabase } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

export async function createEntry(formType: string, formTitle: string): Promise<Entry> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO entries (id, form_type, form_title, data_json, status, created_at, updated_at)
     VALUES (?, ?, ?, '{}', 'draft', ?, ?)`,
    [id, formType, formTitle, now, now],
  );

  return {
    id,
    form_type: formType,
    form_title: formTitle,
    data_json: '{}',
    status: 'draft',
    created_at: now,
    updated_at: now,
    sent_at: null,
  };
}

export async function updateEntry(
  id: string,
  data: Partial<Pick<Entry, 'data_json' | 'status' | 'sent_at'>>,
): Promise<Entry> {
  const db = await getDb();
  const now = new Date().toISOString();

  const setClauses: string[] = ['updated_at = ?'];
  const params: SQLiteBindValue[] = [now];

  if (data.data_json !== undefined) {
    setClauses.push('data_json = ?');
    params.push(data.data_json);
  }

  if (data.status !== undefined) {
    setClauses.push('status = ?');
    params.push(data.status);
  }

  if (data.sent_at !== undefined) {
    setClauses.push('sent_at = ?');
    params.push(data.sent_at);
  }

  params.push(id);

  await db.runAsync(`UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`, params);

  const row = await db.getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', [id]);

  if (!row) {
    throw new Error(`Entry not found: ${id}`);
  }

  return { ...row };
}

export async function getEntries(statusFilter?: EntryStatus): Promise<Entry[]> {
  const db = await getDb();

  if (statusFilter) {
    const rows = await db.getAllAsync<Entry>(
      'SELECT * FROM entries WHERE status = ? ORDER BY updated_at DESC',
      [statusFilter],
    );
    return rows.map((row) => ({ ...row }));
  }

  const rows = await db.getAllAsync<Entry>('SELECT * FROM entries ORDER BY updated_at DESC');
  return rows.map((row) => ({ ...row }));
}

export async function getEntryById(id: string): Promise<Entry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Entry>('SELECT * FROM entries WHERE id = ?', [id]);
  return row ? { ...row } : null;
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
}
