-- Principles metadata table
CREATE TABLE principles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  is_seed INTEGER NOT NULL DEFAULT 0,
  seed_expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
);

-- Allow slug reuse after soft delete (unique among active rows only)
CREATE UNIQUE INDEX idx_principles_slug_active
  ON principles(slug)
  WHERE deleted_at IS NULL;

-- For lookups by slug
CREATE INDEX idx_principles_slug ON principles(slug);

-- For filtering deleted items
CREATE INDEX idx_principles_deleted ON principles(deleted_at);
