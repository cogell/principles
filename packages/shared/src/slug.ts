/**
 * Generate a URL-safe slug from a principle name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create a room ID from slug and principle ID
 * Format: {slug}-{id} for uniqueness across soft deletes
 */
export function createRoomId(slug: string, id: string): string {
  return `${slug}-${id}`;
}

/**
 * Extract the principle ID from a room ID
 * Assumes ID is the last hyphen-separated segment
 */
export function extractIdFromRoomId(roomId: string): string {
  const parts = roomId.split('-');
  return parts[parts.length - 1];
}
