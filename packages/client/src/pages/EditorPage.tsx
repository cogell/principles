import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PrincipleMetadata } from '@principles/shared';
import { PrincipleEditor } from '@/components/PrincipleEditor';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function EditorPage() {
  const { slug } = useParams();
  const [metadata, setMetadata] = useState<PrincipleMetadata | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    const load = async () => {
      setState('loading');
      setError(null);

      try {
        const res = await apiFetch(`/api/principles/${slug}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Principle not found' : `Failed to load (${res.status})`);
        }
        const data = (await res.json()) as PrincipleMetadata;
        if (!cancelled) {
          setMetadata(data);
          setState('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load principle');
          setState('error');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/">
          <Button variant="outline" size="sm">
            Back to list
          </Button>
        </Link>
      </div>

      {state === 'loading' ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Loading principle...
        </div>
      ) : state === 'error' ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-red-600">
          {error || 'Failed to load principle'}
        </div>
      ) : metadata ? (
        <PrincipleEditor metadata={metadata} />
      ) : null}
    </div>
  );
}
