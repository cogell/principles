# Repository Guidelines

## Project Structure & Module Organization
- `core/`: canonical templates, domain tags, and usage notes (e.g., `principle-template.md`, `seed-template.md`).
- `personal-principles/`: personal working set of principles in `principles.md`.
- `plans/`: planning and architecture notes such as `collab-docs.md`.
- `README.md`: short project introduction.

## Build, Test, and Development Commands
This repo is Markdown-only; there are no build/test scripts checked in. Use standard tooling for editing and search (e.g., `rg "decision test"`). If you add automation, document the commands here.

## Coding Style & Naming Conventions
- Write in Markdown with clear headings and lists; keep sections aligned with the templates.
- Follow existing file naming: lowercase with hyphens (e.g., `new-principle.md`).
- Preserve the labeled sections (`Context`, `Tension`, `Therefore`, etc.) from `core/principle-template.md` when authoring principles.

## Principle Authoring Workflow
- Capture ideas quickly with `core/seed-template.md`; promote or prune seeds within ~30 days.
- Draft full principles using `core/principle-template.md` and consult `core/principle-template-usage.md` for status, confidence, and decision-test guidance.
- Tag domains using `core/domains.md` and record stewardship/review cadence when applicable.

## Testing Guidelines
No automated tests or linters are configured. Validate changes by reviewing Markdown rendering and ensuring examples/links are accurate. If you add tooling, update this section.

## Commit & Pull Request Guidelines
- Commit subjects are short and descriptive; historical sync commits use `bd sync: YYYY-MM-DD HH:MM:SS`.
- PRs should describe the intent, list key files changed, and reference related notes/plans when applicable.
- For principle edits, call out changes in status, confidence, and evidence sections.

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

**Quick reference:**
- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete work
- `bd sync` - Sync with git (run at session end)

For full workflow details: `bd prime`

<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

<!-- end-bv-agent-instructions -->
