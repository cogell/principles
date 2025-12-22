import { env } from '@/lib/env';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = path.startsWith('http')
    ? path
    : `${env.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(init.headers);
  if (env.isDev && env.devUserEmail) {
    headers.set('X-User-Email', env.devUserEmail);
  }

  return fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });
}
