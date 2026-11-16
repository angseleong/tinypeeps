# 7. Plugins and MCP servers per Role

Status: proposed (2026-11-16).

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
