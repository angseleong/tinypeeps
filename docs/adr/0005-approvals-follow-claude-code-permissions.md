# 5. Approvals follow Claude Code's permissions

Status: accepted (2026-11-17). The spike answered a `claude -p` permission prompt from outside the
terminal ([below](#what-we-found-2026-11-17-claude-code-21292)).

## Context

The CEO is the real boss: the Manager Peep plans, but anything important needs the CEO. Claude Code
already decides what needs permission (files outside the folder, `git push`, installs, web access, MCP
actions) and the CEO has already tuned those rules. Inventing a second rule set would disagree with it.

## Decision

- **Whatever Claude Code would ask, TinyPeeps asks**, as an Approval: the Peep walks to the CEO's desk,
  and the request shows in plain words with Allow and Deny.
- Sessions run with `--input-format stream-json`, `--permission-prompts host` and
  `--permission-prompt-tool stdio`: Claude Code asks on stdout and the Engine answers on stdin. The
  question itself moves the Peep, so no `PermissionRequest` hook is needed. The CEO's own permission
  settings still apply.
- **Nothing is approved automatically** unless the CEO set an allow rule in Claude Code, or turned on
  "always allow this for this Role" on that Approval.
- A session never runs with `--dangerously-skip-permissions` or `bypassPermissions`.

## Consequences

- A Peep waiting for an Approval waits; with the CEO away, work stops there. The HUD and a system
  notification say how many are waiting.
- If Claude Code changes how prompts reach a host, this breaks first. The version check from ADR 1
  covers it.

## What we found (2026-11-17, Claude Code 2.1.292)

- `--permission-prompts host` alone denies everything in `-p`: nobody is listening. With
  `--permission-prompt-tool stdio` and `--input-format stream-json`, each question arrives as a
  `control_request` with `subtype: "can_use_tool"`, the tool name and its input, and waits.
- The answer is a `control_response` on stdin: `{behavior: "allow", updatedInput}` or
  `{behavior: "deny", message}`. A denied Peep is told the message and goes on without the tool.
- "Always allow for this Role" writes an `--allowedTools` rule into the Role file (`Bash(<exact
  command>)` for a shell command, the tool's name otherwise); the next session isn't asked.
- The task goes in as the first stream-json message; stdin is closed after the result, so a session
  still does one Task (ADR 4).
- Checked against real Claude Code by driving the Engine directly: denied, allowed always, and asked
  nothing the next time. Not yet clicked through in the real window.
