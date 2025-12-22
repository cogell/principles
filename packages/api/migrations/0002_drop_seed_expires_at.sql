-- Remove seed fields from principles
CREATE TABLE principles_new (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
);

INSERT INTO principles_new (
  id,
  slug,
  name,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  version
)
SELECT
  id,
  slug,
  name,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  version
FROM principles;

DROP TABLE principles;
ALTER TABLE principles_new RENAME TO principles;

CREATE UNIQUE INDEX idx_principles_slug_active
  ON principles(slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_principles_slug ON principles(slug);
CREATE INDEX idx_principles_deleted ON principles(deleted_at);
