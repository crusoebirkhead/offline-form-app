import { useCallback, useEffect, useState } from 'react';
import type { CachedFormSchema } from '../types';
import { getAllSchemas } from '../db/schemas';

interface UseFormSchemasResult {
  schemas: CachedFormSchema[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFormSchemas(): UseFormSchemasResult {
  const [schemas, setSchemas] = useState<CachedFormSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const rows = await getAllSchemas();
      setSchemas(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load form schemas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { schemas, loading, error, refresh };
}
