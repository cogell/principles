/**
 * Client Worker - serves static assets and proxies API requests
 */

interface Env {
  ASSETS: Fetcher;
  API_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy /api/* requests to the API worker
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = new URL(url.pathname + url.search, env.API_URL);

      // Forward the request to the API, preserving headers
      const apiRequest = new Request(apiUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow',
      });

      return fetch(apiRequest);
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
