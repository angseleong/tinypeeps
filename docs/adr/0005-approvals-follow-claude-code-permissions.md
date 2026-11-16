# 5. Approvals follow Claude Code's permissions

Status: proposed (2026-11-16). Becomes accepted once a spike answers a permission prompt of a
`claude -p` session from outside the terminal.

## Context

The CEO is the real boss: the Boss Peep plans, but anything important needs the CEO. Claude Code
already decides what needs permission (files outside the folder, `git push`, installs, web access, MCP
actions) and the CEO has already tuned those rules. Inventing a second rule set would disagree with it.

## Decision

- **Whatever Claude Code would ask, TinyPeeps asks**, as an Approval: the Peep walks to the CEO's desk,
  and the request shows in plain words with Allow and Deny.
- Sessions run with `--permission-prompts host` and a `--permission-prompt-tool` served by the Engine,
  and the `PermissionRequest` hook moves the Peep. The CEO's own permission settings still apply.
- **Nothing is approved automatically** unless the CEO set an allow rule in Claude Code, or turned on
  "always allow this for this Role" on that Approval.
- A session never runs with `--dangerously-skip-permissions` or `bypassPermissions`.

## Consequences

- A Peep waiting for an Approval waits; with the CEO away, work stops there. The HUD and a system
  notification say how many are waiting.
- If Claude Code changes how prompts reach a host, this breaks first. The version check from ADR 1
  covers it.
