import { useCallback, useEffect, useState } from 'react';
import type { PrincipleListItem } from '@principles/shared';
import { apiFetch } from '@/lib/api';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type CreateResult = {
  id: string;
  slug: string;
};

export function usePrinciples() {
  const [items, setItems] = useState<PrincipleListItem[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const res = await apiFetch('/api/principles');
      if (!res.ok) {
        throw new Error(`Failed to load principles (${res.status})`);
      }
      const data = (await res.json()) as PrincipleListItem[];
      setItems(data);
      setState('success');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load principles');
    }
  }, []);

  const create = useCallback(async (name: string): Promise<CreateResult> => {
    const res = await apiFetch('/api/principles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create (${res.status})`);
    }

    const payload = (await res.json()) as CreateResult;
    await refresh();
    return payload;
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, state, error, refresh, create };
}
