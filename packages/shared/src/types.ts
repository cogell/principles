/**
 * Status of a principle in its lifecycle
 */
export type PrincipleStatus = 'draft' | 'active' | 'deprecated';

/**
 * Confidence level indicating how proven a principle is
 */
export type ConfidenceLevel = 'emerging' | 'practiced' | 'proven';

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
  is_seed: boolean;
  seed_expires_at: string | null;
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
  is_seed: boolean;
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
}

/**
 * Fields in a Yjs principle document
 */
export type PrincipleField =
  | 'name'
  | 'status'
  | 'confidence'
  | 'domains'
  | 'is_seed'
  | 'seed_expires_at'
  | 'context'
  | 'tension'
  | 'therefore'
  | 'in_practice';
