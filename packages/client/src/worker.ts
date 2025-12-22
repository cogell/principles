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

      // Build headers, forwarding relevant ones
      const headers = new Headers();
      for (const [key, value] of request.headers) {
        // Forward auth and content headers
        if (
          key.toLowerCase() === 'content-type' ||
          key.toLowerCase() === 'cf-access-authenticated-user-email' ||
          key.toLowerCase() === 'accept'
        ) {
          headers.set(key, value);
        }
      }

      // Forward the request to the API
      const apiResponse = await fetch(apiUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      // Return response with CORS headers (in case needed)
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: apiResponse.headers,
      });
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
