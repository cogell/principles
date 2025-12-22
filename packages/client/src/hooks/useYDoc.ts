import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import YPartyKitProvider from 'y-partykit/provider';
import { createRoomId, extractName, getPresenceColor } from '@principles/shared';
import type { AwarenessState } from '@principles/shared';
import { env } from '@/lib/env';
import { useUser } from '@/contexts/UserContext';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type PresenceEntry = AwarenessState & { clientId: number };

const SESSION_STORAGE_KEY = 'principles.presence.sessionId';

const getSessionId = () => {
  if (typeof window === 'undefined') {
    return `server-${Math.random().toString(36).slice(2, 10)}`;
  }
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `sess-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
};

const dedupePresence = (entries: PresenceEntry[]) => {
  const deduped = new Map<string, PresenceEntry>();
  for (const entry of entries) {
    const key = entry.sessionId ?? `${entry.user.email}-${entry.clientId}`;
    const existing = deduped.get(key);
    if (!existing || (entry.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      deduped.set(key, entry);
    }
  }
  return Array.from(deduped.values());
};

export function useYDoc(slug: string, id: string) {
  const { user } = useUser();
  const roomId = useMemo(() => createRoomId(slug, id), [slug, id]);
  const doc = useMemo(() => new Y.Doc(), [roomId]);
  const providerRef = useRef<YPartyKitProvider | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);
  const userEmail = user?.email || 'anonymous';

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [synced, setSynced] = useState(false);
  const [presence, setPresence] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    setStatus('connecting');
    setSynced(false);
    setPresence([]);

    const provider = new YPartyKitProvider(env.partyHost, roomId, doc, {
      party: env.partyName,
    });
    providerRef.current = provider;

    const indexedDb = new IndexeddbPersistence(roomId, doc);

    const onStatus = (event: { status: ConnectionStatus }) => {
      setStatus(event.status);
    };

    const onSync = () => {
      setSynced(true);
    };

    const updatePresence = () => {
      const entries = Array.from(provider.awareness.getStates().entries())
        .map(([clientId, state]) => ({ clientId, ...(state as AwarenessState) }))
        .filter((entry) => entry.user?.email);
      setPresence(dedupePresence(entries));
    };

    provider.on('status', onStatus);
    provider.on('sync', onSync);
    provider.awareness.on('change', updatePresence);

    const updatedAt = Date.now();
    provider.awareness.setLocalState({
      user: {
        email: userEmail,
        name: extractName(userEmail),
        color: getPresenceColor(userEmail),
      },
      cursor: null,
      sessionId,
      updatedAt,
    } satisfies AwarenessState);

    updatePresence();

    return () => {
      provider.awareness.off('change', updatePresence);
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.destroy();
      indexedDb.destroy();
      doc.destroy();
    };
  }, [doc, roomId, userEmail, sessionId]);

  const setCursor = useCallback((cursor: AwarenessState['cursor']) => {
    const provider = providerRef.current;
    if (!provider) return;
    const current = provider.awareness.getLocalState() as AwarenessState | null;
    if (!current) return;
    provider.awareness.setLocalState({ ...current, cursor, updatedAt: Date.now() });
  }, []);

  return {
    doc,
    status,
    synced,
    presence,
    setCursor,
  };
}
