import type { AwarenessState } from '@principles/shared';

type PresenceEntry = AwarenessState & { clientId: number };

type PresenceCursorsProps = {
  field: string;
  presence: PresenceEntry[];
};

export function PresenceCursors({ field, presence }: PresenceCursorsProps) {
  const active = presence.filter((entry) => entry.cursor?.field === field);

  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {active.map((entry) => (
        <span
          key={entry.clientId}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
          style={{ borderColor: entry.user.color }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.user.color }} />
          <span className="text-muted-foreground">{entry.user.name} editing</span>
        </span>
      ))}
    </div>
  );
}
