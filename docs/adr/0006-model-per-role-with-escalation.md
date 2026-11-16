# 6. A model per Role, with Escalation

Status: proposed (2026-11-16).

## Context

Most of a company's work (reading, searching, filling in metadata) doesn't need the strongest model.
Tools that route by task difficulty, like
[claude-model-router](https://jdogresorg.github.io/claude-model-router/), try the cheapest capable
model and step up on failure. AgentsRoom sets a model per Role. Orca leaves it to the person.

## Decision

- **Each Role has a default model**, set by its Template and editable on the Team page.
- **The Boss may raise or lower it for one Task**, and must say why in one line, shown on the Task and
  the dashboard.
- **Escalation:** if a Task fails (the Peep says it can't, or the Boss's review rejects it), it is tried
  once more on the Role's `escalate_to` model. Never more than once automatically.
- **The Boss uses Opus only to plan and to review**, not to sit in a session all day.

## Consequences

- Savings depend on good defaults. The dashboard shows Escalations per Role so a bad default shows up.
- "Failed" needs a clear meaning per Task; the Boss's review is the judge in v1.
