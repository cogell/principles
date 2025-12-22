# Principle Template Usage Notes

## Naming Principles

Alexander's pattern names are evocative and memorable: "Light on Two Sides of Every Room," "Intimacy Gradient," "A Place to Wait." Aim for names that:
- Can be dropped into conversation ("this feels like it violates [Name]")
- Hint at the insight without explaining it
- Avoid jargon where possible

**Weak:** "Stakeholder Alignment Process"
**Stronger:** "Everyone in the Room"

## On Status

- **Draft:** Being written or reviewed, not yet ready for use
- **Active:** Ready for application, actively maintained
- **Deprecated:** No longer recommended; kept for historical reference

## On Confidence Levels

Confidence is evidence-based, not aspirational. Use these criteria:

| Level | Symbol | Criteria |
|-------|--------|----------|
| Emerging | ○ | 1 example or strong rationale |
| Practiced | ◐ | 3+ examples across teams/projects |
| Proven | ● | Repeatedly predictive + survived a hard tradeoff + clear upside |

Principles can move backwards—sometimes context changes or we learn we over-generalized. The Evidence section should justify the current confidence level.

## On Mantras

The mantra is the principle's "marketing copy"—a single sentence someone can deploy in a meeting. The format "Prefer X over Y when Z" works well because it:
- Names both sides of the tension
- Specifies when it applies
- Is easy to remember and repeat

**Example:** "Prefer shipping over polishing when the risk is reversible."

## On Context vs Tension

These sections work together but serve different purposes:

| Section | Focus | Question it answers |
|---------|-------|---------------------|
| Context | Situation | "When does this apply?" |
| Tension | Forces | "What tradeoff does this navigate?" |

**Context** describes the trigger—the smell or situation where you recognize this principle is relevant.

**Tension** names the competing forces. If you can't name two valid sides, you might have a preference, not a principle.

**Common mistake:** Writing the tradeoff in both sections. Context should describe the *moment*, Tension should describe the *forces*.

## On Decision Tests

A good decision test is runnable in 30 seconds mid-debate. Two formats work well:

**If/Then:** "If the change is reversible and we have monitoring, ship it. Unless it touches payments."

**Checklist:** A 3-5 item list where all items must be true for the principle to apply.

The test makes principles actionable, not just philosophical.

## On Examples

**Hypothetical examples are allowed** to unblock principle creation—but must be replaced with real Empire examples within 30 days.

Mark hypothetical examples with 🔮 so reviewers know they're placeholders.

The goal: at least one real example per principle. More examples = higher confidence.

## On Misuse & Counterexample

This section prevents principles from becoming weapons. It forces authors to consider:
- When people hide behind this principle to avoid hard work
- Situations where the opposite action is correct
- How zealots might over-apply it

If you can't imagine a misuse, you probably don't understand the principle's boundaries yet.

## On Exceptions & Escalation

Principles should bend, not break. The exceptions section gives explicit permission to deviate when circumstances warrant. The escalation path clarifies who can approve a deviation.

Without this, teams either ignore principles when inconvenient (undermining the system) or follow them rigidly (undermining outcomes).

## On Connections

Connections turn a list of principles into a system—but they're **optional on first draft**.

Don't let connections block principle creation. Add them as you discover relationships. Over time, the connection graph reveals which principles are foundational (many things depend on them) and which are tactical.

## On Stewardship

Principles rot without gardeners. The steward isn't an approver—they're responsible for:
- Keeping examples current
- Updating confidence based on new evidence
- Triggering reviews at the stated cadence
- Proposing deprecation when appropriate

## Domain Tags

Maintained shortlist. Propose additions sparingly—tags are for filtering, not precision.

| Tag | Scope |
|-----|-------|
| `proposals` | Client-facing scoping, SOWs, pitches |
| `ui/ux` | Interface and experience design |
| `process` | Internal workflows, rituals, coordination |
| `communications` | Writing, presentations, stakeholder updates |
| `engineering` | Code, architecture, technical decisions |
| `strategy` | High-level direction, prioritization, positioning |

The most valuable principles often span multiple domains. Tag broadly rather than narrowly.

**Future candidates** (add only when retrieval genuinely suffers without them): `security`, `sales`, `ops/reliability`, `people`

## Lifecycle

**Seed → Draft → Active → Deprecated**

- Seeds get 30 days to become full principles or get pruned
- Draft principles need review before going Active
- Confidence levels can move in either direction as context changes
- Deprecated principles are kept for history but marked clearly
