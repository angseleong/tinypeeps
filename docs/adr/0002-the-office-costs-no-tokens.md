# 2. The office costs no tokens

Status: proposed (2026-11-16). Becomes accepted once a spike shows every Activity in
[office.md](../office.md#activities) from hook events alone.

## Context

The point of TinyPeeps is saving tokens. A visualizer that asked each model "what are you doing?" or
had it emit status lines for display would spend tokens on every frame of fun. Some office projects
animate characters that look busy whatever the agent does, which breaks the trust the dashboard needs.

## Decision

- **Activities come only from hook events and stream messages**, mapped by a pure function in
  `src/core`. Hooks are run by Claude Code itself, outside the model's context.
- **No prompt, Role brief or system prompt mentions the office.** Peeps don't know they are drawn.
- **A Peep looks busy only when its session is busy.** No idle animations that look like work.
- A test runs a pretend session through the Engine and fails if any model call happens that isn't part
  of a Task.

## Consequences

- Activities are only as detailed as hook events. "Drawing a logo" can't be told apart from "writing a
  README" unless the tool or file says so. Roles can rename Activities ("Editing video") to make up for
  it, without any model call.
- Adding a hook costs a small script run per event on the CEO's machine, not tokens.

## What the `hook-listener` spike found (2026-11-18, Claude Code 2.1.292)

- **Hooks never run in a lean session.** With `--safe-mode`, hooks passed through `--settings` don't
  fire either, and `--include-hook-events` adds nothing. Without `--safe-mode`
  (`--setting-sources ""` + `--settings`) every event fired, but the same one-tool Haiku session
  started at 8.2k context tokens instead of about 6.5k, since the CEO's CLAUDE.md and skills come back.
- **`stream-json` already carries what the office needs:** tool calls and their results (with
  `is_error`), subagents (`system` `task_started`, the subagent's own messages with a
  `parent_tool_use_id`, and the `tool_result` of its `Agent` call when it's done), permission
  questions (`can_use_tool`), and the end (`result`).
- **So Activities come from `stream-json` only.** No hooks, no local socket, nothing extra running
  on the CEO's computer. Revisit only if Claude Code lets a `--safe-mode` session keep `--settings`
  hooks.

