import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { initDatabase } from './schema';
import { upsertSchema } from './schemas';

import standardAssessment from '../assets/seed-schemas/standard-assessment.json';
import molinaHhaOh from '../assets/seed-schemas/molina-hha-oh.json';
import pcaServiceLog from '../assets/seed-schemas/pca-service-log.json';

interface SeedSchema {
  readonly title: string;
  readonly path: string;
  readonly display: string;
  readonly components: readonly unknown[];
}

const SEED_SCHEMAS: readonly SeedSchema[] = [standardAssessment, molinaHhaOh, pcaServiceLog];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

const SEED_VERSION = '2';

async function isSeeded(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ key: string; value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    ['schemas_seed_version'],
  );
  return row?.value === SEED_VERSION;
}

async function markSeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)', [
    'schemas_seed_version',
    SEED_VERSION,
  ]);
}

async function contentHash(content: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
}

const DEPRECATED_FORM_PATHS = ['visit/hha'] as const;

async function removeDeprecatedSchemas(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const path of DEPRECATED_FORM_PATHS) {
    await db.runAsync('DELETE FROM form_schemas WHERE form_path = ?', [path]);
  }
}

export async function seedSchemas(): Promise<void> {
  const db = await getDb();

  await removeDeprecatedSchemas(db);

  if (await isSeeded(db)) {
    return;
  }

  for (const schema of SEED_SCHEMAS) {
    const jsonString = JSON.stringify(schema);
    const version = await contentHash(jsonString);

    await upsertSchema({
      form_path: schema.path,
      title: schema.title,
      json_schema: jsonString,
      version,
      updated_at: new Date().toISOString(),
    });
  }

  await markSeeded(db);
}
