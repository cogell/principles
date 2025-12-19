# Principles Garden - MVP Specification

## Overview

**Principles Garden** is an internal web application for the Empire team to create, explore, and manage organizational principles. It combines structured CRUD operations with an LLM sidekick to make principle creation intuitive and principles discoverable via API.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React + shadcn/ui |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Auth | Cloudflare Access (email-based) |
| API | REST |
| LLM | Claude API + OpenAI (configurable per-user) |

---

## MVP Scope

**Phase 1 (MVP):** CRUD + LLM Sidekick
**Phase 2:** Graph visualization (view + navigate)
**Phase 3:** Advanced features (webhooks, integrations)

---

## User Roles & Auth

- **Auth Method:** Cloudflare Access handles authentication
- **User Identity:** Email from `CF-Access-Authenticated-User-Email` header
- **Permissions:** All authenticated users have full CRUD access (internal team)
- **Audit Trail:** All changes tracked with user email + timestamp

---

## Data Model

### Principle

```typescript
interface Principle {
  id: string;                      // UUID
  name: string;                    // Evocative, memorable name
  slug: string;                    // URL-friendly identifier
  confidence: 'emerging' | 'practiced' | 'proven';

  // Core content (markdown)
  context: string;                 // When to reach for this
  tension: string;                 // What tradeoff it navigates
  therefore: string;               // The principle itself
  in_practice: string;             // 1-3 concrete examples

  // Optional content (markdown)
  when_missing?: string;           // Failure modes
  when_to_ignore?: string;         // Scope limitations
  origin_story?: string;           // Where it came from

  // Lifecycle
  is_seed: boolean;                // True = 30-day seed
  seed_expires_at?: string;        // ISO timestamp

  // Metadata
  created_by: string;              // email
  created_at: string;              // ISO timestamp
  updated_by: string;              // email
  updated_at: string;              // ISO timestamp
  version: number;                 // Increments on each edit
}
```

### Domain

```typescript
interface Domain {
  id: string;                      // UUID
  tag: string;                     // e.g., 'engineering', 'ui/ux'
  scope: string;                   // Description of what it covers
  created_at: string;
  updated_at: string;
}
```

### PrincipleDomain (join table)

```typescript
interface PrincipleDomain {
  principle_id: string;
  domain_id: string;
}
```

### PrincipleConnection

```typescript
interface PrincipleConnection {
  id: string;
  source_id: string;               // Principle making the connection
  target_id: string;               // Principle being connected to
  type: 'supports' | 'enabled_by' | 'tensions_with';
  created_by: string;
  created_at: string;
}
```

### PrincipleVersion (git-style diffs)

```typescript
interface PrincipleVersion {
  id: string;
  principle_id: string;
  version: number;
  diff: string;                    // JSON diff from previous version
  change_description: string;      // Human-readable changelog entry
  author: string;                  // email
  created_at: string;
}
```

---

## Database Schema (D1 SQLite)

```sql
-- Principles
CREATE TABLE principles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  confidence TEXT CHECK(confidence IN ('emerging', 'practiced', 'proven')) NOT NULL,
  context TEXT NOT NULL,
  tension TEXT NOT NULL,
  therefore TEXT NOT NULL,
  in_practice TEXT NOT NULL,
  when_missing TEXT,
  when_to_ignore TEXT,
  origin_story TEXT,
  is_seed INTEGER NOT NULL DEFAULT 0,
  seed_expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Domains
CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  tag TEXT UNIQUE NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Principle-Domain join
CREATE TABLE principle_domains (
  principle_id TEXT REFERENCES principles(id) ON DELETE CASCADE,
  domain_id TEXT REFERENCES domains(id) ON DELETE CASCADE,
  PRIMARY KEY (principle_id, domain_id)
);

-- Connections between principles
CREATE TABLE principle_connections (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES principles(id) ON DELETE CASCADE,
  target_id TEXT REFERENCES principles(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('supports', 'enabled_by', 'tensions_with')) NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Version history (git-style diffs)
CREATE TABLE principle_versions (
  id TEXT PRIMARY KEY,
  principle_id TEXT REFERENCES principles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  diff TEXT NOT NULL,
  change_description TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_principles_slug ON principles(slug);
CREATE INDEX idx_principles_confidence ON principles(confidence);
CREATE INDEX idx_principles_is_seed ON principles(is_seed);
CREATE INDEX idx_principle_versions_principle ON principle_versions(principle_id);
```

---

## User Interface

### 1. Dashboard / Home (`/`)

**Purpose:** Quick overview and entry points

**Elements:**
- Stats cards: Total principles, Seeds, by confidence level
- "Seeds Expiring Soon" alert (< 7 days remaining)
- Recent activity feed (last 10 changes)
- Quick action buttons: "New Principle", "New Seed", "Browse All"

### 2. Principles List (`/principles`)

**Purpose:** Browse and filter all principles

**Elements:**
- Search bar (full-text across name, context, tension, therefore)
- Filter panel:
  - Domain tags (multi-select chips)
  - Confidence level (checkboxes)
  - Type: All / Full Principles / Seeds only
- Sort: Name | Recently Updated | Confidence
- Results list:
  - Name with confidence indicator (○/◐/●)
  - Domain tags
  - Tension preview (truncated)
  - Seed badge + days remaining (if applicable)

**Actions:**
- Click row → Detail view
- "New Principle" / "New Seed" buttons

### 3. Principle Detail (`/principles/:slug`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Principle Name]                    [Edit] [Export ▾]  │
│  ◐ Practiced  |  engineering  strategy                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ## Context                                             │
│  [markdown rendered]                                    │
│                                                         │
│  ## Tension                                             │
│  [markdown rendered]                                    │
│                                                         │
│  ## Therefore                                           │
│  [markdown rendered - visually emphasized]              │
│                                                         │
│  ## In Practice                                         │
│  [markdown rendered with examples]                      │
│                                                         │
│  ▸ When This Is Missing (expandable)                   │
│  ▸ When to Ignore (expandable)                         │
│  ▸ Origin Story (expandable)                           │
│                                                         │
│  ## Connections                                         │
│  Supports: [Principle A] [Principle B]                  │
│  Enabled by: [Principle C]                              │
│  Tensions with: [Principle D]                           │
│                                                         │
│  ## Changelog                                           │
│  v3 - 2025-12-19 - Updated examples - @alice           │
│  v2 - 2025-12-10 - Clarified tension - @bob            │
│  v1 - 2025-12-01 - Created - @alice                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Export dropdown:**
- Copy as Markdown
- Download as .md file
- Copy API URL
- View raw JSON

### 4. Principle Editor (`/principles/new`, `/principles/:slug/edit`)

**Layout (2-column):**
```
┌─────────────────────────────────┬───────────────────────┐
│  Form                           │  LLM Sidekick         │
│                                 │                       │
│  Name: [________________]       │  ┌─────────────────┐  │
│                                 │  │                 │  │
│  Type: ○ Principle  ○ Seed      │  │  Chat History   │  │
│                                 │  │                 │  │
│  Confidence: [▾ Emerging]       │  │                 │  │
│                                 │  │                 │  │
│  Domains: [+ Add domain]        │  └─────────────────┘  │
│    [engineering ✕] [strategy ✕] │                       │
│                                 │  [Type a message...]  │
│  ───────────────────────────    │  [Send]               │
│                                 │                       │
│  Context                        │  Quick prompts:       │
│  [markdown editor      ]        │  • Help me name this  │
│                                 │  • Sharpen the tension│
│  Tension                        │  • Add an example     │
│  [markdown editor      ]        │  • Review my draft    │
│                                 │  • Is this a real     │
│  Therefore                      │    principle?         │
│  [markdown editor      ]        │                       │
│                                 │  ─────────────────    │
│  In Practice                    │  LLM: [▾ Claude]      │
│  [markdown editor      ]        │                       │
│                                 │                       │
│  [+ Add optional sections]      │                       │
│                                 │                       │
│  Connections                    │                       │
│  [Search principles...]         │                       │
│    Supports: [Principle A ✕]    │                       │
│    Enabled by: [+ Add]          │                       │
│    Tensions with: [+ Add]       │                       │
│                                 │                       │
│  Change description:            │                       │
│  [What changed?          ]      │                       │
│                                 │                       │
│  [Cancel]        [Save Draft]   │                       │
│                  [Publish   ]   │                       │
└─────────────────────────────────┴───────────────────────┘
```

**Seed Mode (simplified):**
- Only: Name, Tension (1 line), Therefore (1 line), Trigger
- Expiration countdown shown
- "Promote to Full Principle" button

### 5. Domains Management (`/domains`)

**Purpose:** CRUD for domain tags

**Layout:**
- Table: Tag | Scope | Principles Count | Actions
- Inline edit for scope
- Add new domain (modal)
- Delete with confirmation (warns if principles use it)

### 6. Version History (`/principles/:slug/history`)

**Purpose:** View and compare versions

**Elements:**
- Version list with diffs
- Side-by-side comparison view
- Restore to previous version

---

## LLM Sidekick

### Configuration

Users can select their preferred LLM:
- Claude (Anthropic) - default
- GPT-4 (OpenAI)

Stored as user preference in localStorage.

### System Prompt (shared context)

```
You are a principles coach helping craft organizational principles.

You have access to:
- The current principle being edited
- All existing principles in the system
- The principle template structure

A good principle:
- Has genuine tension (if there's no tradeoff, it's just a preference)
- Is concrete enough to act on, abstract enough to apply across contexts
- Has an evocative, memorable name
- Includes real examples from practice

Help users:
- Articulate tensions they're sensing
- Generate evocative names (like Christopher Alexander's patterns)
- Provide concrete examples
- Distinguish real principles from preferences or one-off decisions
- Find connections to existing principles
```

### Capabilities

| Action | Description |
|--------|-------------|
| Draft assistance | Help articulate context, tension, therefore |
| Naming | Suggest evocative, memorable names |
| Examples | Generate in-practice examples |
| Review | Critique: is this a real principle? |
| Discovery | "What principles relate to [topic]?" |
| Comparison | "How does this differ from [principle]?" |
| Connections | Suggest related principles to link |

### UI Behavior

- Collapsible panel (right side of editor)
- Chat persists during editing session
- Quick prompt buttons for common actions
- "Insert" button on suggestions to add to form fields
- LLM selector dropdown at bottom of panel

---

## REST API

### Authentication

All requests require valid Cloudflare Access token. User email extracted from headers.

### Endpoints

```
# Principles
GET    /api/principles                    # List (with filters)
GET    /api/principles/:slug              # Get one
POST   /api/principles                    # Create
PUT    /api/principles/:slug              # Update
DELETE /api/principles/:slug              # Delete

# Query params for list:
#   domain=engineering,strategy (comma-separated)
#   confidence=emerging,practiced,proven
#   is_seed=true|false
#   search=keyword
#   sort=name|updated_at|confidence
#   order=asc|desc
#   page=1
#   per_page=20

# Domains
GET    /api/domains                       # List all
POST   /api/domains                       # Create
PUT    /api/domains/:tag                  # Update
DELETE /api/domains/:tag                  # Delete

# Connections
GET    /api/principles/:slug/connections  # Get connections
POST   /api/principles/:slug/connections  # Add connection
DELETE /api/connections/:id               # Remove connection

# Versions
GET    /api/principles/:slug/versions     # List versions
GET    /api/principles/:slug/versions/:v  # Get specific version

# Export
GET    /api/principles/:slug/markdown     # Single as markdown
GET    /api/export/all                    # Bulk export (zip)
GET    /api/export/all?format=json        # Bulk as JSON
```

### Response Format

```json
{
  "data": { ... },
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

### Error Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Principle not found",
    "details": {}
  }
}
```

---

## Markdown Export Format

Follows `core/principle-template.md`:

```markdown
# [Principle Name]

---

## [PRINCIPLE NAME]

**Confidence:** ◐ (○ = emerging, ◐ = practiced, ● = proven)

**Domains:** `engineering` `strategy`

---

### Context

[content]

### Tension

[content]

### Therefore

[content]

### In Practice

[content]

---

### When This Is Missing

[content if present]

### When to Ignore

[content if present]

### Origin Story

[content if present]

---

### Connections

**Supports:**
- [[Principle A]]
- [[Principle B]]

**Enabled by:**
- [[Principle C]]

**Tensions with:**
- [[Principle D]]

---

### Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-19 | Updated examples | @alice |
| 2025-12-01 | Created | @alice |
```

---

## Project Structure

```
principles-garden/
├── src/
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── layout/                 # Shell, nav, sidebar
│   │   ├── principles/             # Principle components
│   │   │   ├── PrincipleCard.tsx
│   │   │   ├── PrincipleDetail.tsx
│   │   │   ├── PrincipleEditor.tsx
│   │   │   ├── PrincipleList.tsx
│   │   │   └── ConnectionSelector.tsx
│   │   ├── domains/                # Domain components
│   │   ├── chat/                   # LLM sidekick
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── QuickPrompts.tsx
│   │   └── markdown/               # Markdown editor/renderer
│   ├── pages/
│   │   ├── index.tsx               # Dashboard
│   │   ├── principles/
│   │   │   ├── index.tsx           # List
│   │   │   ├── new.tsx             # Create
│   │   │   ├── [slug]/
│   │   │   │   ├── index.tsx       # Detail
│   │   │   │   ├── edit.tsx        # Edit
│   │   │   │   └── history.tsx     # Version history
│   │   └── domains/
│   │       └── index.tsx           # Domain management
│   ├── hooks/
│   │   ├── usePrinciples.ts
│   │   ├── useDomains.ts
│   │   ├── useChat.ts
│   │   └── useVersions.ts
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   ├── llm/
│   │   │   ├── index.ts
│   │   │   ├── claude.ts
│   │   │   └── openai.ts
│   │   ├── markdown.ts             # Export utilities
│   │   └── diff.ts                 # Version diff utilities
│   └── types/
│       └── index.ts                # TypeScript types
├── worker/
│   ├── src/
│   │   ├── index.ts                # Worker entry
│   │   ├── routes/
│   │   │   ├── principles.ts
│   │   │   ├── domains.ts
│   │   │   ├── connections.ts
│   │   │   └── export.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts             # CF Access auth
│   │   │   └── cors.ts
│   │   ├── db/
│   │   │   ├── queries.ts
│   │   │   └── migrations/
│   │   └── lib/
│   │       ├── diff.ts             # Diff generation
│   │       └── markdown.ts         # Export formatting
│   └── wrangler.toml
├── migrations/                      # D1 migrations
│   └── 0001_initial.sql
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Implementation Order

1. **Project Setup**
   - Vite + React + shadcn/ui scaffold
   - Cloudflare Worker with D1 binding
   - Basic auth middleware (CF Access)

2. **Database**
   - D1 migrations
   - Seed default domains

3. **Core CRUD**
   - Principles list + detail + edit
   - Domains management
   - Connections

4. **Version History**
   - Diff generation on save
   - Version list + comparison UI

5. **LLM Sidekick**
   - Chat panel component
   - Claude + OpenAI integration
   - Quick prompts
   - Context injection

6. **Export/API**
   - Markdown export
   - REST API cleanup
   - API documentation

7. **(Phase 2) Graph View**
   - Force-directed graph
   - Node navigation
   - Domain/confidence filtering
