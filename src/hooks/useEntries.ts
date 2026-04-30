import { useCallback, useEffect, useState } from 'react';
import { getEntries } from '../db';
import type { Entry } from '../types';

interface UseEntriesResult {
  readonly entries: readonly Entry[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

export function useEntries(): UseEntriesResult {
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const rows = await getEntries();
      setEntries(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load entries';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, error, refresh };
}
