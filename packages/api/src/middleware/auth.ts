import type { Context, Next } from 'hono';
import type { Env, Variables } from '../index.js';

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * Extract authenticated user email from CF Access or dev bypass
 */
export function getAuthEmail(c: AppContext): string | null {
  // CF Access header (production)
  const cfEmail = c.req.header('CF-Access-Authenticated-User-Email');
  if (cfEmail) return cfEmail;

  // Dev bypass
  if (c.env.AUTH_BYPASS === 'true') {
    const devEmail = c.req.header('X-User-Email');
    if (devEmail) return devEmail;
    return c.env.DEV_USER_EMAIL ?? null;
  }

  return null;
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(c: AppContext, next: Next) {
  // Skip auth for CORS preflight requests
  if (c.req.method === 'OPTIONS') {
    return next();
  }

  const email = getAuthEmail(c);
  if (!email) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('userEmail', email);
  await next();
}
