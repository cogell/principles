import type { Domain } from './types.js';

/**
 * Available domains for principles (hardcoded for MVP)
 */
export const DOMAINS: readonly Domain[] = [
  'proposals',
  'ui/ux',
  'process',
  'communications',
  'engineering',
  'strategy',
] as const;

/**
 * Colors for presence indicators (user avatars/cursors)
 */
export const PRESENCE_COLORS = [
  '#E57373',
  '#64B5F6',
  '#81C784',
  '#FFD54F',
  '#BA68C8',
  '#4DB6AC',
  '#FF8A65',
  '#A1887F',
] as const;

/**
 * Get a consistent color for a user based on their email
 */
export function getPresenceColor(email: string): string {
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

/**
 * Extract display name from email address
 */
export function extractName(email: string): string {
  return email.split('@')[0];
}
