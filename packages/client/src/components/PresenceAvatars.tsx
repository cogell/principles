import * as Avatar from '@radix-ui/react-avatar';
import type { AwarenessState } from '@principles/shared';

type PresenceEntry = AwarenessState & { clientId: number };

type PresenceAvatarsProps = {
  presence: PresenceEntry[];
  localEmail?: string;
};

export function PresenceAvatars({ presence, localEmail }: PresenceAvatarsProps) {
  if (presence.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        No one else in the room yet.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {presence.map((entry) => {
        const isLocal = localEmail && entry.user.email === localEmail;
        return (
          <div key={entry.clientId} className="flex items-center gap-2">
            <Avatar.Root className="relative flex h-9 w-9 overflow-hidden rounded-full ring-2 ring-white">
              <Avatar.Fallback
                className="flex h-full w-full items-center justify-center text-xs font-semibold text-white"
                style={{ backgroundColor: entry.user.color }}
              >
                {entry.user.name.slice(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar.Root>
            <div className="text-xs">
              <div className="font-medium text-foreground">
                {entry.user.name}
                {isLocal ? ' (you)' : ''}
              </div>
              <div className="text-[11px] text-muted-foreground">{entry.user.email}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
