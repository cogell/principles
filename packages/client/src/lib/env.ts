const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
const partyHostRaw = import.meta.env.VITE_PARTY_HOST || 'localhost:1999';
const partyHost = partyHostRaw.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/$/, '');
const partyName = import.meta.env.VITE_PARTY_NAME || 'principle';
const devUserEmail = import.meta.env.VITE_DEV_USER_EMAIL || '';

export const env = {
  apiUrl,
  partyHost,
  partyName,
  devUserEmail,
  isDev: import.meta.env.DEV,
};
