import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';
import * as Y from 'yjs';
import { extractIdFromRoomId } from '@principles/shared';

interface Env {
  API_URL?: string;
  AUTH_BYPASS?: string;
  DEV_USER_EMAIL?: string;
}

/**
 * PartyKit server for collaborative principle editing via Yjs
 */
export default class PrincipleParty implements Party.Server {
  private ydoc: Y.Doc;
  private authHeaders: Headers | null = null;

  constructor(public room: Party.Room) {
    this.ydoc = new Y.Doc();
  }

  get env(): Env {
    return this.room.env as Env;
  }

  /**
   * Extract principle ID from room name (format: {slug}-{id})
   */
  private get principleId(): string {
    return extractIdFromRoomId(this.room.id);
  }

  private get apiBase(): string {
    return this.env.API_URL || 'http://localhost:8787';
  }

  private async api(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    // Copy auth headers if set
    if (this.authHeaders) {
      this.authHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }
    return fetch(`${this.apiBase}${path}`, {
      ...options,
      headers,
    });
  }

  /**
   * Called when the room starts - load existing Yjs doc or initialize defaults
   */
  async onStart(): Promise<void> {
    const id = this.principleId;

    // Try to fetch existing Yjs doc from R2 via API
    try {
      const res = await this.api(`/api/principles/${id}/yjs`);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) {
          Y.applyUpdate(this.ydoc, new Uint8Array(buffer));
          this.initializeDefaults();
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load Yjs doc:', e);
    }

    // No existing doc - seed from metadata
    try {
      const metaRes = await this.api(`/api/principles/${id}/metadata`);
      const meta = metaRes.ok ? await metaRes.json() : null;
      this.initializeDefaults(meta);
    } catch (e) {
      console.error('Failed to load metadata:', e);
      this.initializeDefaults();
    }
  }

  private initializeDefaults(meta?: { name?: string; is_seed?: boolean; seed_expires_at?: string | null } | null) {
    const doc = this.ydoc;
    if (!doc.getText('name').length && meta?.name) doc.getText('name').insert(0, meta.name);
    if (!doc.getText('status').length) doc.getText('status').insert(0, 'draft');
    if (!doc.getText('confidence').length) doc.getText('confidence').insert(0, 'emerging');
    doc.getArray('domains');
    if (!doc.getText('is_seed').length) doc.getText('is_seed').insert(0, meta?.is_seed ? 'true' : 'false');
    if (!doc.getText('seed_expires_at').length && meta?.seed_expires_at) {
      doc.getText('seed_expires_at').insert(0, meta.seed_expires_at);
    }
    doc.getText('context');
    doc.getText('tension');
    doc.getText('therefore');
    doc.getText('in_practice');
  }

  /**
   * Called periodically to persist changes
   */
  private async persistDocument(): Promise<void> {
    const id = this.principleId;

    // Write Yjs doc to R2 via API
    try {
      const update = Y.encodeStateAsUpdate(this.ydoc);
      const yjsRes = await this.api(`/api/principles/${id}/yjs`, {
        method: 'PUT',
        body: update.buffer as ArrayBuffer,
        headers: { 'Content-Type': 'application/octet-stream' },
      });

      if (!yjsRes.ok) {
        console.error('Yjs write failed:', yjsRes.status);
        return;
      }
    } catch (e) {
      console.error('Yjs write failed:', e);
      return;
    }

    // Update metadata (best-effort)
    const name = this.ydoc.getText('name').toString().trim();
    const isSeed = this.ydoc.getText('is_seed').toString() === 'true';
    const seedExpiresAt = this.ydoc.getText('seed_expires_at').toString() || null;

    try {
      await this.api(`/api/principles/${id}/metadata`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name || '(untitled)', is_seed: isSeed, seed_expires_at: seedExpiresAt }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.error('Metadata update failed (non-fatal):', e);
    }
  }

  /**
   * Handle incoming WebSocket connections
   */
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): Promise<void> {
    // Store auth headers for API calls
    this.authHeaders = new Headers();
    const cfEmail = ctx.request.headers.get('CF-Access-Authenticated-User-Email');
    const devEmail = ctx.request.headers.get('X-User-Email');
    if (cfEmail) this.authHeaders.set('CF-Access-Authenticated-User-Email', cfEmail);
    if (devEmail) this.authHeaders.set('X-User-Email', devEmail);

    // Use y-partykit's onConnect for Yjs sync
    return onConnect(conn, this.room, {
      persist: { mode: 'snapshot' },
      callback: {
        handler: async () => {
          await this.persistDocument();
        },
        debounceWait: 2000,
        debounceMaxWait: 10000,
      },
    });
  }

  /**
   * Validate connection before allowing it
   */
  async onRequest(request: Party.Request): Promise<Response> {
    // Store auth headers for API calls
    this.authHeaders = new Headers();
    const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');
    const devEmail = request.headers.get('X-User-Email');
    if (cfEmail) this.authHeaders.set('CF-Access-Authenticated-User-Email', cfEmail);
    if (devEmail) this.authHeaders.set('X-User-Email', devEmail);

    // Verify authentication
    const email = cfEmail ?? (this.env.AUTH_BYPASS === 'true' ? this.env.DEV_USER_EMAIL : null);
    if (!email) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify principle exists (with retry for create→connect race condition)
    const id = this.principleId;
    let res = await this.api(`/api/principles/${id}/metadata`);

    if (res.status === 404) {
      // Retry once after 100ms - handles race condition after POST create
      await new Promise(r => setTimeout(r, 100));
      res = await this.api(`/api/principles/${id}/metadata`);
    }

    if (res.status === 404) {
      return new Response('Principle not found', { status: 404 });
    }
    if (!res.ok) {
      return new Response('API error', { status: 503 });
    }

    const meta = await res.json();
    if (meta.deleted_at) {
      return new Response('Principle deleted', { status: 410 });
    }

    return new Response('OK', { status: 200 });
  }
}
