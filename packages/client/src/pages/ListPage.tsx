import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrincipleList } from '@/components/PrincipleList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrinciples } from '@/hooks/usePrinciples';

export default function ListPage() {
  const navigate = useNavigate();
  const { items, state, error, create } = usePrinciples();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await create(name.trim());
      setName('');
      navigate(`/${result.slug}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create principle');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card/85 p-6 shadow-card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-foreground">Principles in motion</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with a rough idea, nurture it together, and keep the signal visible as it evolves.
            </p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name your next principle"
            />
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'New principle'}
            </Button>
          </div>
        </div>
        {createError ? <p className="mt-3 text-sm text-red-600">{createError}</p> : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground">Latest updates</h3>
        </div>
        {state === 'loading' ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Loading principles...
          </div>
        ) : state === 'error' ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-red-600">
            {error || 'Failed to load principles'}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No principles yet. Create the first one to get started.
          </div>
        ) : (
          <PrincipleList items={items} />
        )}
      </section>
    </div>
  );
}
