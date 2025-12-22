/**
 * Domain categories for principles
 */
export type Domain =
  | 'proposals'
  | 'ui/ux'
  | 'process'
  | 'communications'
  | 'engineering'
  | 'strategy';

/**
 * Principle metadata stored in D1
 */
export interface PrincipleMetadata {
  id: string;
  slug: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

/**
 * Principle data for API responses (subset of metadata)
 */
export interface PrincipleListItem {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Awareness state for collaborative presence
 */
export interface AwarenessState {
  user: {
    email: string;
    name: string;
    color: string;
  };
  cursor: {
    field: string | null;
    position: number;
  } | null;
  sessionId?: string;
  updatedAt?: number;
}

/**
 * Fields in a Yjs principle document
 */
export type PrincipleField =
  | 'name'
  | 'domains'
  | 'context'
  | 'tension'
  | 'therefore'
  | 'in_practice';
