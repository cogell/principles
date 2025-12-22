/**
 * Client Worker - serves static assets and proxies API requests
 */

interface Env {
  ASSETS: Fetcher;
  API: Fetcher; // Service binding to API worker
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy /api/* requests to the API worker via service binding
    if (url.pathname.startsWith('/api/')) {
      // Service binding calls API worker directly (bypasses public URL and CF Access)
      // All headers including CF-Access-Authenticated-User-Email are preserved
      return env.API.fetch(request);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
