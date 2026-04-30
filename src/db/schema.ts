import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'periscope.db';

const CREATE_FORM_SCHEMAS_TABLE = `
  CREATE TABLE IF NOT EXISTS form_schemas (
    id TEXT PRIMARY KEY,
    form_path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    json_schema TEXT NOT NULL,
    version TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const CREATE_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    form_type TEXT NOT NULL,
    form_title TEXT NOT NULL,
    data_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed', 'sent')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sent_at TEXT
  );
`;

const CREATE_APP_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const CREATE_ENTRIES_STATUS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_entries_status ON entries (status);
`;

const CREATE_ENTRIES_UPDATED_AT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries (updated_at);
`;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(CREATE_FORM_SCHEMAS_TABLE);
  await db.execAsync(CREATE_ENTRIES_TABLE);
  await db.execAsync(CREATE_APP_METADATA_TABLE);
  await db.execAsync(CREATE_ENTRIES_STATUS_INDEX);
  await db.execAsync(CREATE_ENTRIES_UPDATED_AT_INDEX);
  return db;
}
