import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { DOMAINS, formatRelativeTime, type PrincipleField, type PrincipleMetadata } from '@principles/shared';
import * as Y from 'yjs';
import { PresenceAvatars } from '@/components/PresenceAvatars';
import { PresenceCursors } from '@/components/PresenceCursors';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useYDoc } from '@/hooks/useYDoc';
import { env } from '@/lib/env';

type PrincipleEditorProps = {
  metadata: PrincipleMetadata;
};

function useYText(doc: Y.Doc, field: PrincipleField) {
  const text = useMemo(() => doc.getText(field), [doc, field]);
  const [value, setValue] = useState(() => text.toString());

  useEffect(() => {
    const update = () => {
      setValue(text.toString());
    };

    update();
    text.observe(update);
    return () => text.unobserve(update);
  }, [text]);

  const updateValue = useCallback(
    (next: string) => {
      doc.transact(() => {
        text.delete(0, text.length);
        text.insert(0, next);
      });
    },
    [doc, text]
  );

  return [value, updateValue] as const;
}

function useYArray(doc: Y.Doc, field: 'domains') {
  const yarray = useMemo(() => doc.getArray<string>(field), [doc, field]);
  const [value, setValue] = useState(() => yarray.toArray());

  useEffect(() => {
    const update = () => {
      setValue(yarray.toArray());
    };
    update();
    yarray.observe(update);
    return () => yarray.unobserve(update);
  }, [yarray]);

  const toggle = useCallback(
    (entry: string) => {
      const next = new Set(yarray.toArray());
      if (next.has(entry)) {
        next.delete(entry);
      } else {
        next.add(entry);
      }
      doc.transact(() => {
        yarray.delete(0, yarray.length);
        yarray.insert(0, Array.from(next));
      });
    },
    [doc, yarray]
  );

  return [value, toggle] as const;
}

export function PrincipleEditor({ metadata }: PrincipleEditorProps) {
  const { doc, presence, setCursor, status, synced } = useYDoc(metadata.slug, metadata.id);

  const [name, setName] = useYText(doc, 'name');
  const [domains, toggleDomain] = useYArray(doc, 'domains');
  const [context, setContext] = useYText(doc, 'context');
  const [tension, setTension] = useYText(doc, 'tension');
  const [therefore, setTherefore] = useYText(doc, 'therefore');
  const [inPractice, setInPractice] = useYText(doc, 'in_practice');

  const localEmail = env.devUserEmail || undefined;

  const setFieldCursor = useCallback(
    (field: PrincipleField) => (event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      const position = target.selectionStart ?? 0;
      setCursor({ field, position });
    },
    [setCursor]
  );

  const clearCursor = useCallback(() => {
    setCursor(null);
  }, [setCursor]);

  const statusLabel = status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline';
  const createdLabel = formatRelativeTime(metadata.created_at) ?? '--';
  const updatedLabel = formatRelativeTime(metadata.updated_at) ?? '--';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-border bg-card/85 p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Editing principle</h2>
              <p className="text-sm text-muted-foreground">Room: {metadata.slug}</p>
            </div>
            <Badge variant={status === 'connected' ? 'accent' : 'outline'}>{statusLabel}</Badge>
          </div>
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
                <Input
                  value={name}
                  placeholder={metadata.name || '(untitled)'}
                  onChange={(event) => setName(event.target.value)}
                  onFocus={setFieldCursor('name')}
                  onBlur={clearCursor}
                  onSelect={setFieldCursor('name')}
                />
                <PresenceCursors field="name" presence={presence} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domains</label>
                <div className="flex flex-wrap gap-2">
                  {DOMAINS.map((domain) => {
                    const active = domains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border bg-card text-foreground hover:border-accent'
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-5 border-t border-border pt-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Context</label>
                <Textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  onFocus={setFieldCursor('context')}
                  onBlur={clearCursor}
                  onSelect={setFieldCursor('context')}
                  placeholder="What reality or backdrop makes this principle useful?"
                />
                <PresenceCursors field="context" presence={presence} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tension</label>
                <Textarea
                  value={tension}
                  onChange={(event) => setTension(event.target.value)}
                  onFocus={setFieldCursor('tension')}
                  onBlur={clearCursor}
                  onSelect={setFieldCursor('tension')}
                  placeholder="What tradeoff or friction does this principle resolve?"
                />
                <PresenceCursors field="tension" presence={presence} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Therefore</label>
                <Textarea
                  value={therefore}
                  onChange={(event) => setTherefore(event.target.value)}
                  onFocus={setFieldCursor('therefore')}
                  onBlur={clearCursor}
                  onSelect={setFieldCursor('therefore')}
                  placeholder="What commitment do we make because of the context and tension?"
                />
                <PresenceCursors field="therefore" presence={presence} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In practice</label>
                <Textarea
                  value={inPractice}
                  onChange={(event) => setInPractice(event.target.value)}
                  onFocus={setFieldCursor('in_practice')}
                  onBlur={clearCursor}
                  onSelect={setFieldCursor('in_practice')}
                  placeholder="How does this show up day-to-day?"
                />
                <PresenceCursors field="in_practice" presence={presence} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card">
          <h3 className="text-lg font-semibold text-foreground">Presence</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {synced ? 'Changes are syncing live.' : 'Syncing local changes...'}
          </p>
          <div className="mt-4">
            <PresenceAvatars presence={presence} localEmail={localEmail} />
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card">
          <h3 className="text-lg font-semibold text-foreground">Metadata</h3>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <dt>Created</dt>
              <dd>{createdLabel}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Updated</dt>
              <dd>{updatedLabel}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Owner</dt>
              <dd className="truncate">{metadata.created_by}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
