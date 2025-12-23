import type * as Party from 'partykit/server';
import { onConnect, unstable_getYDoc, type YPartyKitOptions } from 'y-partykit';
import * as Y from 'yjs';
import { extractIdFromRoomId } from '@principles/shared';

interface Env {
  API_URL?: string;
  AUTH_BYPASS?: string;
  DEV_USER_EMAIL?: string;
  // Shared secret for authenticating API calls
  INTERNAL_API_SECRET?: string;
  // CF Access Service Token (to bypass CF Access proxy)
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

/**
 * PartyKit server for collaborative principle editing via Yjs
 */
export default class PrincipleParty implements Party.Server {
  private authHeaders: Headers | null = null;

  constructor(public room: Party.Room) {}

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
    const url = `${this.apiBase}${path}`;
    const headers = new Headers(options.headers);
    // Add CF Access Service Token to bypass CF Access proxy
    if (this.env.CF_ACCESS_CLIENT_ID && this.env.CF_ACCESS_CLIENT_SECRET) {
      headers.set('CF-Access-Client-Id', this.env.CF_ACCESS_CLIENT_ID);
      headers.set('CF-Access-Client-Secret', this.env.CF_ACCESS_CLIENT_SECRET);
    }
    // Add internal secret for Worker-level auth
    if (this.env.INTERNAL_API_SECRET) {
      headers.set('X-Internal-Secret', this.env.INTERNAL_API_SECRET);
    }
    // Copy auth headers if set (for user identity)
    if (this.authHeaders) {
      this.authHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }
    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Build the initial Yjs doc state for new rooms or first connect.
   */
  private async loadDocument(): Promise<Y.Doc> {
    const id = this.principleId;
    const doc = new Y.Doc();

    // Try to fetch existing Yjs doc from R2 via API
    try {
      const res = await this.api(`/api/principles/${id}/yjs`);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) {
          Y.applyUpdate(doc, new Uint8Array(buffer));
          this.initializeDefaults(doc);
          return doc;
        }
      }
    } catch (e) {
      console.error('Failed to load Yjs doc:', e);
    }

    // No existing doc - seed from metadata
    try {
      const metaRes = await this.api(`/api/principles/${id}/metadata`);
      const meta = metaRes.ok ? await metaRes.json() : null;
      this.initializeDefaults(doc, meta);
    } catch (e) {
      console.error('Failed to load metadata:', e);
      this.initializeDefaults(doc);
    }

    return doc;
  }

  private get yDocOptions(): YPartyKitOptions {
    return {
      load: async () => this.loadDocument(),
      callback: {
        handler: async (doc) => {
          await this.persistDocument(doc);
        },
        debounceWait: 2000,
        debounceMaxWait: 10000,
      },
    };
  }

  private initializeDefaults(
    doc: Y.Doc,
    meta?: { name?: string } | null
  ) {
    if (!doc.getText('name').length && meta?.name) doc.getText('name').insert(0, meta.name);
    doc.getArray('domains');
    doc.getText('context');
    doc.getText('tension');
    doc.getText('therefore');
    doc.getText('in_practice');
  }

  /**
   * Called periodically to persist changes
   */
  private async persistDocument(doc: Y.Doc): Promise<void> {
    const id = this.principleId;

    // Write Yjs doc to R2 via API
    try {
      const update = Y.encodeStateAsUpdate(doc);
      const yjsRes = await this.api(`/api/principles/${id}/yjs`, {
        method: 'PUT',
        body: update.buffer as ArrayBuffer,
        headers: { 'Content-Type': 'application/octet-stream' },
      });

      if (!yjsRes.ok) {
        console.error('Yjs write failed:', yjsRes.status);
      }
    } catch (e) {
      console.error('Yjs write failed:', e);
    }

    // Update metadata (best-effort)
    const name = doc.getText('name').toString().trim();

    try {
      const res = await this.api(`/api/principles/${id}/metadata`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name || '(untitled)' }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        console.error('Metadata update failed:', res.status);
      }
    } catch (e) {
      console.error('Metadata update failed (non-fatal):', e);
    }
  }

  /**
   * Handle incoming WebSocket connections
   */
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): Promise<void> {
    // Extract user email from query params (passed by client) or headers
    const url = new URL(ctx.request.url);
    const emailFromParams = url.searchParams.get('email');
    const cfEmail = ctx.request.headers.get('CF-Access-Authenticated-User-Email');

    // Store auth headers for API calls
    this.authHeaders = new Headers();
    const userEmail = cfEmail || emailFromParams;
    if (userEmail) {
      this.authHeaders.set('X-User-Email', userEmail);
    }

    // Use y-partykit's onConnect for Yjs sync
    return onConnect(conn, this.room, {
      ...this.yDocOptions,
    });
  }

  async onClose(): Promise<void> {
    try {
      const doc = await unstable_getYDoc(this.room, this.yDocOptions);
      await this.persistDocument(doc);
    } catch (e) {
      console.error('Failed to persist on close:', e);
    }
  }

  /**
   * Validate connection before allowing it
   */
  async onRequest(request: Party.Request): Promise<Response> {
    // Extract user email from query params (passed by client) or headers
    const url = new URL(request.url);
    const emailFromParams = url.searchParams.get('email');
    const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');

    // Store auth headers for API calls
    this.authHeaders = new Headers();
    const userEmail = cfEmail || emailFromParams;
    if (userEmail) {
      this.authHeaders.set('X-User-Email', userEmail);
    }

    // Verify authentication
    const email = userEmail ?? (this.env.AUTH_BYPASS === 'true' ? this.env.DEV_USER_EMAIL : null);
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
