import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { CachedFormSchema } from '../types';
import { initDatabase } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

export async function upsertSchema(
  schema: Omit<CachedFormSchema, 'id'>,
): Promise<CachedFormSchema> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<CachedFormSchema>(
    'SELECT * FROM form_schemas WHERE form_path = ?',
    [schema.form_path],
  );

  const id = existing ? existing.id : Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO form_schemas (id, form_path, title, json_schema, version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(form_path) DO UPDATE SET
       title = excluded.title,
       json_schema = excluded.json_schema,
       version = excluded.version,
       updated_at = excluded.updated_at`,
    [id, schema.form_path, schema.title, schema.json_schema, schema.version, now],
  );

  return {
    id,
    form_path: schema.form_path,
    title: schema.title,
    json_schema: schema.json_schema,
    version: schema.version,
    updated_at: now,
  };
}

export async function getSchemaByPath(formPath: string): Promise<CachedFormSchema | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CachedFormSchema>(
    'SELECT * FROM form_schemas WHERE form_path = ?',
    [formPath],
  );
  return row ? { ...row } : null;
}

export async function getAllSchemas(): Promise<CachedFormSchema[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CachedFormSchema>('SELECT * FROM form_schemas ORDER BY title');
  return rows.map((row) => ({ ...row }));
}
