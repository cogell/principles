import { Hono } from 'hono';
import { cors } from 'hono/cors';
import principles from './routes/principles.js';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  AUTH_BYPASS?: string;
  DEV_USER_EMAIL?: string;
}

export interface Variables {
  userEmail: string;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS middleware
app.use('*', cors({
  origin: (origin) => origin, // Allow all origins in dev, configure for prod
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'CF-Access-Authenticated-User-Email', 'X-User-Email'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Mount routes
app.route('/api/principles', principles);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
