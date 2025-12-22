# Slim MVP: Collaborative Principles Editor

## Goal
Collaborative, offline-capable principle editor using Yjs + PartyKit on Cloudflare.

## Architecture Overview

```
Browser (React SPA)
    ↓ WebSocket
PartyKit (Durable Object)
    ↓ HTTP (internal calls)
CF Worker (REST API) ←→ D1 (metadata) + R2 (Yjs docs)
    ↑
Cloudflare Access (auth via cookie)
```

> **Key decision:** PartyKit accesses D1 and R2 via HTTP calls to the API worker (not direct bindings). This keeps the same pattern in dev and prod, simplifies deployment, and maintains a single source of truth for data access logic.

## Tech Stack
- **Frontend**: Vite + React + shadcn/ui + react-router
- **Realtime**: PartyKit (y-partyserver) + Yjs
- **Backend**: Cloudflare Workers (Hono)
- **Storage**: R2 (Yjs docs), D1 (metadata)
- **Auth**: Cloudflare Access (email header; all authenticated users can view/edit everything)
- **Offline**: y-indexeddb

---

## Data Model

### D1 Schema (metadata only)
```sql
CREATE TABLE principles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  is_seed INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,              -- soft delete
  version INTEGER DEFAULT 1
);

-- Allow slug reuse after soft delete (unique among active rows only)
CREATE UNIQUE INDEX idx_principles_slug_active
  ON principles(slug)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_principles_slug ON principles(slug);
CREATE INDEX idx_principles_deleted ON principles(deleted_at);
```

> **Note:** Content lives in Yjs/R2. D1 is the metadata index for listing/routing and soft-delete filtering. PartyKit mirrors key metadata from Yjs → D1 on save, and seeds new Yjs docs from D1 when R2 is missing. Full-text search deferred to later phase.

### Room Naming Convention

PartyKit rooms use `{slug}-{id}` format (e.g., `my-principle-abc123xyz`) to prevent collisions when slugs are reused after soft delete. The client receives both `slug` and `id` from the API and constructs the room name.

> **Why not slug alone?** Slugs can be reused after soft delete. If User A is editing "foo" when it's deleted, and User B creates a new "Foo" (same slug), User A's Yjs changes could pollute the new principle's R2 doc. Using `{slug}-{id}` makes each principle's room globally unique.

### Yjs Document (content in R2)
```
name: Y.Text                    -- Evocative, memorable name (mirrored to D1)
status: Y.Text                  -- draft | active | deprecated
confidence: Y.Text              -- emerging | practiced | proven
domains: Y.Array<string>        -- e.g., ['engineering', 'strategy']
is_seed: Y.Text                 -- 'true' | 'false' (mirrored to D1, string for Yjs compat)

# Core content (markdown)
context: Y.Text
tension: Y.Text
therefore: Y.Text
in_practice: Y.Text
```

> **Deferred fields:** `mantra`, `decision_test`, `when_missing`, `when_to_ignore`, `origin_story` will be added in a later phase. Mantra and Decision Test are present in both principle and seed templates but kept out of MVP to minimize scope.

---

## File Structure (pnpm monorepo)

```
/
├── package.json                    # Root: workspaces config
├── pnpm-workspace.yaml
├── .npmrc
├── packages/
│   ├── shared/                     # Shared types, utils, constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts            # Principle, AwarenessState, etc.
│   │       ├── constants.ts        # Domains, confidence levels, colors
│   │       └── slug.ts             # Slug generation utils
│   │
│   ├── api/                        # Cloudflare Worker (REST API)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── wrangler.toml
│   │   ├── migrations/
│   │   │   ├── 0001_create_principles.sql
│   │   │   └── 0002_drop_seed_expires_at.sql
│   │   └── src/
│   │       ├── index.ts            # Hono router entry
│   │       ├── routes/
│   │       │   └── principles.ts   # CRUD endpoints
│   │       └── middleware/
│   │           └── auth.ts         # CF Access middleware
│   │
│   ├── partykit/                   # PartyKit server (WebSocket + Yjs)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── partykit.json
│   │   └── src/
│   │       ├── principle.ts        # YServer with R2 persistence
│   │       └── awareness.ts        # Presence helpers
│   │
│   └── client/                     # React SPA
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── pages/
│           │   ├── ListPage.tsx
│           │   └── EditorPage.tsx
│           ├── components/
│           │   ├── PrincipleList.tsx
│           │   ├── PrincipleEditor.tsx
│           │   ├── PresenceAvatars.tsx
│           │   └── PresenceCursors.tsx
│           └── hooks/
│               ├── useYDoc.ts
│               └── usePrinciples.ts
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// package.json (root)
{
  "name": "principles-garden",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:api": "pnpm --filter @principles/api dev",
    "dev:party": "pnpm --filter @principles/partykit dev",
    "dev:client": "pnpm --filter @principles/client dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck"
  }
}
```

```ini
# .npmrc
link-workspace-packages=true
prefer-workspace-packages=true
```

### Package Dependencies

| Package | Depends On | Description |
|---------|------------|-------------|
| `@principles/shared` | - | Types, constants, utils |
| `@principles/api` | `@principles/shared` | REST API on CF Workers |
| `@principles/partykit` | `@principles/shared` | WebSocket server |
| `@principles/client` | `@principles/shared` | React frontend |

---

## Implementation Phases

### Phase 0: Scaffold
- [ ] Initialize pnpm monorepo with workspace config
- [ ] Create `@principles/shared` package with types, constants
- [ ] Create `@principles/api` package with Hono + wrangler.toml (D1 + R2 bindings)
- [ ] Create `@principles/partykit` package with partykit.json
- [ ] Create `@principles/client` package with Vite + React + shadcn/ui
- [ ] Configure TypeScript project references across packages
- [ ] Install shared deps: yjs, y-partyserver, partysocket, y-indexeddb, hono

### Phase 1: D1 + REST API
- [ ] Migration: create principles table with indexes
- [ ] `GET /api/principles` - list all (exclude soft-deleted), return `id` + `slug` for room naming
- [ ] `POST /api/principles` - create (name → generate slug, created_by from header), return `{ id, slug }`
- [ ] Slug generation: handle empty names, reuse after soft delete, retry on conflict
- [ ] `GET /api/principles/:slug` - get one (404 if deleted), include `id` in response
- [ ] `DELETE /api/principles/:slug` - soft delete (set deleted_at)
- [ ] `GET /api/principles/:id/yjs` - fetch Yjs binary from R2 (for PartyKit onLoad)
- [ ] `PUT /api/principles/:id/yjs` - write Yjs binary to R2 (for PartyKit onSave)
- [ ] `GET /api/principles/:id/metadata` - get metadata for seeding new Yjs docs
- [ ] `PATCH /api/principles/:id/metadata` - update metadata from Yjs (name, is_seed, etc.)
- [ ] CF Access middleware (extract email from `CF-Access-Authenticated-User-Email`)
- [ ] Dev auth bypass for local (`DEV_USER_EMAIL` or `X-User-Email` in dev only)
- [ ] CORS middleware (allow client origin, handle preflight for internal endpoints)

### Phase 2: PartyKit + R2 Persistence
- [ ] `PrincipleParty` extends `YServer`
- [ ] HTTP client helper for calling API (with auth passthrough)
- [ ] `onLoad()` - fetch Yjs via `GET /api/principles/:id/yjs`; if missing, seed from metadata + defaults
- [ ] `onSave()` - write Yjs via `PUT /api/principles/:id/yjs`, update metadata via `PATCH`
- [ ] `onBeforeConnect()` - verify CF Access cookie + check principle exists (retry once on 404 for race condition)
- [ ] Route `/party/:roomId` for WebSocket upgrade (roomId = `{slug}-{id}`)
- [ ] Initialize default Yjs field values for new documents
- [ ] Extract principle ID from room name for API calls

### Phase 3: React Editor
- [ ] `useYDoc(slug, id)` hook - PartySocket + provider setup with room = `{slug}-{id}`
- [ ] `PrincipleEditor` - form fields bound to Y.Text/Y.Array
- [ ] `PresenceAvatars` - show connected users via awareness
- [ ] `PresenceCursors` - show live field focus + cursor position per user
- [ ] `ListPage` - fetch from REST, link to editor
- [ ] `EditorPage` - route `/:slug`

### Phase 4: Offline + Polish
- [ ] y-indexeddb for local persistence
- [ ] Connection status indicator
- [ ] Loading/error states
- [ ] Deploy to Cloudflare (cloud-prem)

---

## Key Implementation Details

### PartyKit with HTTP Proxy to API

PartyKit calls the API worker for all D1/R2 operations. This keeps data access logic centralized and works identically in dev and prod.

```typescript
// packages/partykit/src/principle.ts
import * as Y from 'yjs';

export class PrincipleParty extends YServer {
  static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 };

  // Extract principle ID from room name (format: {slug}-{id})
  private get principleId(): string {
    const parts = this.name.split('-');
    return parts[parts.length - 1]; // ID is always the last segment
  }

  private get apiBase(): string {
    return this.env.API_URL || 'http://localhost:8787';
  }

  // Forward auth headers from the original request (stored during onBeforeConnect)
  private authHeaders: Headers | null = null;

  private async api(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: {
        ...Object.fromEntries(this.authHeaders?.entries() ?? []),
        ...(options.headers || {}),
      },
    });
  }

  async onLoad() {
    const id = this.principleId;

    // Try to fetch existing Yjs doc from R2 via API
    const res = await this.api(`/api/principles/${id}/yjs`);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 0) {
        Y.applyUpdate(this.document, new Uint8Array(buffer));
        this.initializeDefaults();
        return;
      }
    }

    // No existing doc - seed from metadata
    const metaRes = await this.api(`/api/principles/${id}/metadata`);
    const meta = metaRes.ok ? await metaRes.json() : null;
    this.initializeDefaults(meta);
  }

  private initializeDefaults(meta?: { name?: string; is_seed?: boolean } | null) {
    const doc = this.document;
    if (!doc.getText('name').length && meta?.name) doc.getText('name').insert(0, meta.name);
    if (!doc.getText('status').length) doc.getText('status').insert(0, 'draft');
    if (!doc.getText('confidence').length) doc.getText('confidence').insert(0, 'emerging');
    doc.getArray('domains');
    if (!doc.getText('is_seed').length) doc.getText('is_seed').insert(0, meta?.is_seed ? 'true' : 'false');
    doc.getText('context');
    doc.getText('tension');
    doc.getText('therefore');
    doc.getText('in_practice');
  }

  async onSave() {
    const id = this.principleId;

    // Write Yjs doc to R2 via API
    const yjsRes = await this.api(`/api/principles/${id}/yjs`, {
      method: 'PUT',
      body: Y.encodeStateAsUpdate(this.document),
      headers: { 'Content-Type': 'application/octet-stream' },
    });

    if (!yjsRes.ok) {
      // R2 write failed - will retry on next save
      console.error('Yjs write failed:', yjsRes.status);
      return;
    }

    // Update metadata (best-effort)
    const name = this.document.getText('name').toString().trim();
    const isSeed = this.document.getText('is_seed').toString() === 'true';

    await this.api(`/api/principles/${id}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify({ name: name || '(untitled)', is_seed: isSeed }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(e => console.error('Metadata update failed (non-fatal):', e));
  }

  async onBeforeConnect(request: Request) {
    // Store auth headers for later API calls
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

    return null; // Allow connection
  }
}
```

> **Auth note:** CF Access authentication works via cookies on WebSocket upgrade requests. The `CF-Access-Authenticated-User-Email` header is set by Cloudflare Access after validating the cookie. This is the assumed behavior - verify in staging before production deploy.

### Client Y.Doc Hook
```typescript
// hooks/useYDoc.ts
function useYDoc(slug: string, id: string) {
  const [doc] = useState(() => new Y.Doc());
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Room name uses {slug}-{id} format for uniqueness
  const roomId = `${slug}-${id}`;

  useEffect(() => {
    const socket = new PartySocket({
      host: import.meta.env.VITE_PARTY_HOST,
      room: roomId,
    });

    socket.addEventListener('error', (e) => setError(new Error('Connection failed')));

    const provider = new YPartyKitProvider(socket, doc);
    provider.on('sync', () => setSynced(true));

    // Offline persistence
    const idb = new IndexeddbPersistence(roomId, doc);

    return () => {
      provider.destroy();
      idb.destroy();
    };
  }, [roomId]);

  return { doc, synced, error };
}
```

### Slug Generation
```typescript
// packages/shared/src/slug.ts
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');      // Trim leading/trailing hyphens
}

// packages/api/src/routes/principles.ts
import { generateSlug } from '@principles/shared';
import { nanoid } from 'nanoid';

async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base = generateSlug(name) || `principle-${nanoid(6)}`;
  let slug = base;
  let suffix = 0;

  while (true) {
    const existing = await db.prepare(
      'SELECT id FROM principles WHERE slug = ? AND deleted_at IS NULL'
    ).bind(slug).first();

    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

// On insert, retry if UNIQUE idx_principles_slug_active conflict occurs.
```

### Presence / Awareness
```typescript
// packages/shared/src/types.ts
export interface AwarenessState {
  user: {
    email: string;         // from CF-Access-Authenticated-User-Email
    name: string;          // extracted from email (before @)
    color: string;         // auto-assigned from palette
  };
  cursor: {
    field: string | null;  // which field they're editing: 'context', 'tension', etc.
    position: number;      // cursor position within that field
  } | null;
}

// packages/shared/src/constants.ts
export const PRESENCE_COLORS = [
  '#E57373', '#64B5F6', '#81C784', '#FFD54F',
  '#BA68C8', '#4DB6AC', '#FF8A65', '#A1887F'
] as const;

export function getPresenceColor(email: string): string {
  const hash = email.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

export function extractName(email: string): string {
  return email.split('@')[0];
}
```

### Presence Cursors (Client)
- Store awareness in React state and render per-field indicators.
- On focus, publish `{ cursor: { field, position } }`; on blur, set `cursor: null`.
- For text areas, update `position` on `selectionchange` or `onSelect`.
- Render: small colored caret + name badge near the active field, and an optional outline on focused field.
- Acceptance criteria:
  - User A sees User B's cursor and field label within 1s of focus.
  - Presence clears within 5s of disconnect.

### Soft Delete Flow
```typescript
// packages/api/src/routes/principles.ts
app.delete('/api/principles/:slug', async (c) => {
  const { slug } = c.req.param();
  const email = c.req.header('CF-Access-Authenticated-User-Email');

  const result = await c.env.DB.prepare(
    `UPDATE principles SET deleted_at = ? WHERE slug = ? AND deleted_at IS NULL`
  ).bind(new Date().toISOString(), slug).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Not found' }, 404);
  }

  // Note: R2 doc is retained for potential recovery
  // Slug becomes reusable because unique index excludes deleted rows
  // Active PartyKit connections should be closed or stopped on next onSave
  return c.json({ success: true });
});
```

### Error Handling Strategy

| Operation | Failure Mode | Handling |
|-----------|--------------|----------|
| API call (Yjs write) | `PUT /api/principles/:id/yjs` fails | Log error, Yjs doc remains in memory, retry on next save |
| API call (metadata) | `PATCH` fails | Log and continue - Yjs/R2 is source of truth |
| API call (connect) | `GET /api/principles/:id/metadata` returns 404 | Retry once after 100ms (race condition), then reject |
| API call (connect) | `GET` returns 5xx | Reject connection with 503, client will auto-retry |
| Deleted mid-session | API returns `deleted_at` set | `onSave()` skips persistence; client shows deleted state |
| WebSocket disconnect | Network issue | `y-indexeddb` preserves local state, auto-reconnect |
| Offline edit + deletion | Principle deleted while user offline | Changes lost on reconnect (onSave detects deletion) |

### Principle Creation Flow

```
1. User clicks "New Principle" in UI

2. Client: POST /api/principles { name: "My Principle" }

3. Worker:
   - Generate unique slug from name (fallback if empty, ignore deleted)
   - Generate UUID for id
   - Insert D1 row (id, slug, name, created_by, timestamps)
   - Return { id, slug }

4. Client: Navigate to /principles/:slug (editor page)
   - Store both slug and id (from POST response) for room naming

5. Editor: Connect WebSocket to PartyKit room `{slug}-{id}`

6. PartyKit onBeforeConnect():
   - Extract id from room name
   - Verify CF Access cookie
   - Call API to check principle exists (retry once on 404 for race condition)
   - Allow connection

7. PartyKit onLoad():
   - Call GET /api/principles/:id/yjs (doesn't exist yet, returns empty)
   - Call GET /api/principles/:id/metadata for seeding
   - Initialize default Yjs fields from metadata

8. User edits fields → Yjs syncs → onSave() writes via PUT /api/principles/:id/yjs
```

---

## Local Development

Run all dev servers from the monorepo root:

```bash
# Run all packages in parallel
pnpm dev

# Or run individually
pnpm dev:api      # Cloudflare Worker on :8787
pnpm dev:party    # PartyKit on :1999
pnpm dev:client   # Vite on :5173
```

### Dev Auth Bypass
- Gate bypass behind `NODE_ENV === 'development'` or `AUTH_BYPASS=true`
- Prefer `X-User-Email` header in dev; fallback to `DEV_USER_EMAIL`
- Apply to both API middleware and PartyKit `onBeforeConnect()`

### Package Scripts

```json
// packages/api/package.json
{
  "name": "@principles/api",
  "scripts": {
    "dev": "wrangler dev --local --persist",
    "deploy": "wrangler deploy",
    "db:migrate": "wrangler d1 migrations apply principles"
  }
}
```

```json
// packages/partykit/package.json
{
  "name": "@principles/partykit",
  "scripts": {
    "dev": "partykit dev",
    "deploy": "partykit deploy"
  }
}
```

```json
// packages/client/package.json
{
  "name": "@principles/client",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Client Environment Variables

```bash
# packages/client/.env.local (dev)
VITE_API_URL=http://localhost:8787
VITE_PARTY_HOST=localhost:1999

# packages/client/.env.production
VITE_API_URL=https://principles-api.your-domain.workers.dev
VITE_PARTY_HOST=principles-party.your-domain.partykit.dev
```

### Configuration Files

```toml
# packages/api/wrangler.toml
name = "principles-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "principles"
database_id = "local"

[[r2_buckets]]
binding = "R2"
bucket_name = "principles-docs"
```

```json
// packages/partykit/partykit.json
{
  "name": "principles-party",
  "main": "src/principle.ts",
  "compatibilityDate": "2024-01-01"
}
```

### PartyKit D1/R2 Access

PartyKit accesses D1 and R2 exclusively via HTTP calls to the API worker. This pattern is used in **both dev and production**:

- **Dev:** PartyKit calls `http://localhost:8787` (local wrangler dev server)
- **Prod:** PartyKit calls the deployed API worker URL (configured via `API_URL` env var)

This approach:
- Keeps data access logic centralized in the API
- Avoids complexity of PartyKit bindings
- Makes auth passthrough explicit
- Works identically in dev and prod

```typescript
// packages/partykit/src/principle.ts
private get apiBase(): string {
  return this.env.API_URL || 'http://localhost:8787';
}
```

```json
// packages/partykit/partykit.json (prod)
{
  "name": "principles-party",
  "main": "src/principle.ts",
  "compatibilityDate": "2024-01-01",
  "vars": {
    "API_URL": "https://principles-api.your-domain.workers.dev"
  }
}
```

---

## Offline Support Scope

MVP supports **edit-only offline** via y-indexeddb:

| Scenario | Supported | Notes |
|----------|-----------|-------|
| Edit existing principle offline | ✅ | Changes sync when reconnected |
| View cached principles offline | ✅ | Last-synced state available |
| Create new principle offline | ❌ | Requires POST to API first |
| Delete principle offline | ❌ | Requires API call |

**Behavior:**
- On disconnect: Connection indicator shows offline state, edits continue locally
- On reconnect: Yjs automatically merges local changes with server state
- Conflict resolution: Yjs CRDT handles concurrent edits automatically

**Known limitation:** If a principle is deleted while a user is editing offline, their changes will be lost on reconnect (the `onSave()` will detect deletion and skip persistence).

---

## Deferred to Later

### Content Fields
- `mantra` - One-sentence summary for meetings (in both templates)
- `decision_test` - Quick heuristic for decisions (in both templates)
- `when_missing`, `when_to_ignore`, `origin_story` - Extended principle context
- `evidence`, `misuse`, `exceptions` - Full template sections
- `steward`, `review_cadence` - Governance fields
- `changelog` - Edit history (version field exists but no UI)

### Features
- Domains CRUD (hardcode 6 for MVP)
- Connections graph (supports/enabled_by/tensions_with)
- Version history UI
- LLM sidekick
- Export functionality
- Seed lifecycle / automatic expiration handling
- Full-text search (sync content to D1 or add search index)
- Conflict visualization UI for offline merge scenarios
- Hard delete / R2 cleanup (admin function)
- Restore from soft delete
- Offline principle creation (queue POST requests)

---

## Dependencies

### @principles/shared
```json
{
  "nanoid": "^5"
}
```

### @principles/api
```json
{
  "hono": "^4",
  "@principles/shared": "workspace:*"
}
```

### @principles/partykit
```json
{
  "yjs": "^13",
  "y-partyserver": "^0.x",
  "@principles/shared": "workspace:*"
}
```

### @principles/client
```json
{
  "react": "^18",
  "react-dom": "^18",
  "react-router-dom": "^6",
  "yjs": "^13",
  "y-indexeddb": "^9",
  "partysocket": "^1",
  "@radix-ui/react-avatar": "^1",
  "@principles/shared": "workspace:*"
}
```

## Open Questions

### Resolved

1. ~~**PartyKit D1/R2 access:**~~ → Using HTTP proxy to API (same pattern dev/prod)
2. ~~**Room naming collision:**~~ → Using `{slug}-{id}` format
3. ~~**Create→connect race condition:**~~ → Retry once in `onBeforeConnect()`
4. ~~**Offline scope:**~~ → Edit-only; creation requires online

### Still Open

1. **PartyKit deployment:** Confirm `partykit deploy` is the correct command and works with Cloudflare. Test that `API_URL` env var is accessible at runtime.

2. **CF Access + WebSocket auth:** Verify that CF Access cookies are passed through WebSocket upgrade requests and that the `CF-Access-Authenticated-User-Email` header is set correctly. **Test in staging before prod deploy.**

3. **R2 pricing:** Estimate storage costs for Yjs binary docs at scale. Typical Yjs doc is ~1-10KB, but can grow with edit history.

4. **y-partyserver API:** Verify the exact class name and API surface. The plan assumes `YServer` with `onLoad()`, `onSave()`, `onBeforeConnect()` methods - confirm against current docs.
