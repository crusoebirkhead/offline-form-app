import * as Network from 'expo-network';
import * as SQLite from 'expo-sqlite';
import { fetchAllFormPaths, fetchFormSchema } from './formio';
import { getSchemaByPath, upsertSchema } from '../db/schemas';
import { initDatabase } from '../db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncResult =
  | { synced: false; reason: 'offline' }
  | { synced: true; updated: number; unchanged: number; failed: number };

// ---------------------------------------------------------------------------
// Database access (app_metadata table)
// ---------------------------------------------------------------------------

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare locally cached schemas with the Form.io server and pull updates.
 * Returns early when offline. Individual fetch failures do not abort the sync.
 */
export async function syncSchemas(): Promise<SyncResult> {
  const networkState = await Network.getNetworkStateAsync();

  if (!networkState.isConnected || !networkState.isInternetReachable) {
    return { synced: false, reason: 'offline' };
  }

  const formPaths = await fetchAllFormPaths();

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const formPath of formPaths) {
    try {
      const remote = await fetchFormSchema(formPath);

      if (!remote) {
        failed += 1;
        continue;
      }

      const local = await getSchemaByPath(formPath);

      if (local && local.version === remote.version) {
        unchanged += 1;
        continue;
      }

      await upsertSchema({
        form_path: remote.schema.path,
        title: remote.schema.title,
        json_schema: JSON.stringify(remote.schema),
        version: remote.version,
        updated_at: new Date().toISOString(),
      });

      updated += 1;
    } catch {
      failed += 1;
    }
  }

  // Persist last successful sync timestamp
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO app_metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ['last_sync_timestamp', now],
  );

  return { synced: true, updated, unchanged, failed };
}

/**
 * Retrieve the last successful sync timestamp, or null if never synced.
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    ['last_sync_timestamp'],
  );
  return row?.value ?? null;
}
