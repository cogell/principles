import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { generateSlug } from '@principles/shared';
import type { Env, Variables } from '../index.js';
import { getAuthEmail, requireAuth } from '../middleware/auth.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
app.use('*', requireAuth);

/**
 * GET /api/principles - List all principles (exclude soft-deleted)
 */
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, slug, name, created_at, updated_at
     FROM principles
     WHERE deleted_at IS NULL
     ORDER BY updated_at DESC`
  ).all();

  return c.json(results);
});

/**
 * POST /api/principles - Create a new principle
 */
app.post('/', async (c) => {
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim() || '';
  const email = c.get('userEmail');

  const id = nanoid();
  const slug = await uniqueSlug(c.env.DB, name);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO principles (id, slug, name, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, slug, name || '(untitled)', email, now, now).run();

  return c.json({ id, slug }, 201);
});

/**
 * GET /api/principles/:slug - Get a single principle by slug
 */
app.get('/:slug', async (c) => {
  const { slug } = c.req.param();

  const row = await c.env.DB.prepare(
    `SELECT id, slug, name, created_by, created_at, updated_at, version
     FROM principles
     WHERE slug = ? AND deleted_at IS NULL`
  ).bind(slug).first();

  if (!row) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json(row);
});

/**
 * DELETE /api/principles/:slug - Soft delete a principle
 */
app.delete('/:slug', async (c) => {
  const { slug } = c.req.param();
  const now = new Date().toISOString();

  const result = await c.env.DB.prepare(
    `UPDATE principles SET deleted_at = ? WHERE slug = ? AND deleted_at IS NULL`
  ).bind(now, slug).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * GET /api/principles/:id/yjs - Fetch Yjs binary from R2
 */
app.get('/:id/yjs', async (c) => {
  const { id } = c.req.param();

  const obj = await c.env.R2.get(`docs/${id}.yjs`);
  if (!obj) {
    return c.body(null, 204);
  }

  return c.body(await obj.arrayBuffer(), 200, {
    'Content-Type': 'application/octet-stream',
  });
});

/**
 * PUT /api/principles/:id/yjs - Write Yjs binary to R2
 */
app.put('/:id/yjs', async (c) => {
  const { id } = c.req.param();

  // Verify principle exists and is not deleted
  const row = await c.env.DB.prepare(
    `SELECT id FROM principles WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first();

  if (!row) {
    return c.json({ error: 'Not found or deleted' }, 404);
  }

  const body = await c.req.arrayBuffer();
  await c.env.R2.put(`docs/${id}.yjs`, body);

  return c.json({ success: true });
});

/**
 * GET /api/principles/:id/metadata - Get metadata for PartyKit seeding
 */
app.get('/:id/metadata', async (c) => {
  const { id } = c.req.param();

  const row = await c.env.DB.prepare(
    `SELECT id, slug, name, deleted_at
     FROM principles
     WHERE id = ?`
  ).bind(id).first();

  if (!row) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json(row);
});

/**
 * PATCH /api/principles/:id/metadata - Update metadata from Yjs
 */
app.patch('/:id/metadata', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{
    name?: string;
  }>();

  const now = new Date().toISOString();

  const result = await c.env.DB.prepare(
    `UPDATE principles
     SET name = COALESCE(?, name),
         updated_at = ?,
         version = version + 1
     WHERE id = ? AND deleted_at IS NULL`
  ).bind(
    body.name ?? null,
    now,
    id
  ).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Not found or deleted' }, 404);
  }

  return c.json({ success: true });
});

/**
 * Generate a unique slug, handling conflicts
 */
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

export default app;
