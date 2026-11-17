# 7. Plugins and MCP servers per Role

Status: accepted in part (2026-11-16). Tools and MCP servers per Role work; plugins per Role don't (below).

## Context

Each Peep is a Claude Code session, so it loads the CEO's plugins, skills and MCP servers. Each one
adds tool and skill descriptions to every session's context. With five Peeps, an unused plugin costs
five times over.

## Decision

- **A Role loads only its own plugins and MCP servers**: `--mcp-config` with `--strict-mcp-config`,
  and per-Role `--settings` for enabled plugins and allowed tools.
- **The Team page shows the cost**: roughly how many tokens each plugin and MCP server adds to every
  session, measured once from a session's first message.
- A Role can opt into "everything the CEO has installed" for convenience, marked as costly.

## Consequences

- A Peep may lack a tool it needs. It says so in its Handoff Note, and the Boss can suggest adding it.
- The measured cost is an estimate per Claude Code version; it's re-measured when the version changes.

## What we found (2026-11-16, Claude Code 2.1.292)

- **Tools are most of the cost.** Context per turn: 33.6k with everything, 26.4k with `--safe-mode`,
  6.5k with `--safe-mode --tools Read,Grep,Glob`. Each tool's definition is sent every turn.
- **Plugins can't be picked per Role.** In `--safe-mode`, a plugin passed with `--plugin-dir` is listed
  but its skills don't load; outside it, turning plugins off through `--settings` changed nothing.
- So a Role is **lean** (`--safe-mode`, its own `--tools`, its own MCP servers) or **everything**
  (all the CEO's plugins, skills, hooks and CLAUDE.md). The Team page measures what each Role starts
  every turn with, instead of a cost per plugin.
