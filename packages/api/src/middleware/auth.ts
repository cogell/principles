import type { Context, Next } from 'hono';
import type { Env, Variables } from '../index.js';

type AppContext = Context<{ Bindings: Env; Variables: Variables }>;

/**
 * Extract authenticated user email from CF Access or dev bypass
 */
export function getAuthEmail(c: AppContext): string | null {
  // CF Access header (production - user via browser)
  const cfEmail = c.req.header('CF-Access-Authenticated-User-Email');
  if (cfEmail) return cfEmail;

  // Internal API secret (server-to-server, e.g., PartyKit)
  // PartyKit sends this secret to authenticate API calls
  const internalSecret = c.req.header('X-Internal-Secret');
  if (internalSecret && c.env.INTERNAL_API_SECRET && internalSecret === c.env.INTERNAL_API_SECRET) {
    const forwardedEmail = c.req.header('X-User-Email');
    if (forwardedEmail) return forwardedEmail;
    // Service call without user context - use service account
    return 'service@principles.internal';
  }

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
