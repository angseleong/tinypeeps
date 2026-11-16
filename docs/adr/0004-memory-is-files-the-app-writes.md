# 4. Memory is files the app writes

Status: proposed (2026-11-16).

## Context

Peeps need to remember yesterday's work. Resuming a long conversation (`--resume`) reloads all of it
into context, which is the most expensive way to remember. Memory plugins that summarise every session
with another model call save context but spend tokens in the background.

## Decision

- **The Engine keeps state** (Task board, who did what, file results, Usage) in `.tinypeeps/` in the
  Office folder. 0 tokens.
- **A Peep ends each Task with a Handoff Note** of at most about 150 words, as part of its last message.
  No extra model call.
- **A new session gets only what it needs:** the Company Note, its Role brief and the Handoff Notes of
  related Tasks. The start is the same each time, so most of it is read from cache.
- **No `--resume`.** Every Task is a fresh session.
- **`company.md` has a size limit.** Past it, Haiku compacts it once, and the CEO sees the diff.
- No memory plugin is required. The CEO may still enable one for a Role.

## Consequences

- A Peep forgets details its Handoff Notes didn't keep. The side panel shows the notes, so the CEO can
  correct them.
- Notes are plain Markdown the CEO can read and edit.
