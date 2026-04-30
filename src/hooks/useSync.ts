import { useCallback, useEffect, useRef, useState } from 'react';
import { syncSchemas, getLastSyncTimestamp, type SyncResult } from '../services/sync';

interface SyncState {
  syncing: boolean;
  lastSyncTime: string | null;
  result: SyncResult | null;
  error: string | null;
}

interface UseSyncReturn extends SyncState {
  triggerSync: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const [state, setState] = useState<SyncState>({
    syncing: false,
    lastSyncTime: null,
    result: null,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Load persisted last-sync timestamp on mount
    getLastSyncTimestamp().then((ts) => {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, lastSyncTime: ts }));
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const triggerSync = useCallback(async () => {
    setState((prev) => ({ ...prev, syncing: true, result: null, error: null }));

    try {
      const result = await syncSchemas();

      if (!mountedRef.current) return;

      const lastSyncTime = result.synced ? new Date().toISOString() : await getLastSyncTimestamp();

      if (!mountedRef.current) return;

      setState({ syncing: false, lastSyncTime, result, error: null });
    } catch (err: unknown) {
      if (!mountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Sync failed unexpectedly';

      setState((prev) => ({
        ...prev,
        syncing: false,
        error: message,
      }));
    }
  }, []);

  return { ...state, triggerSync };
}
