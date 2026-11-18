# Architecture

How sessions, their `stream-json` and the window fit together; built as described unless `TODO.md` says otherwise. The decisions
are in [docs/adr/](adr/); this page shows how they connect. Back to the [README](../README.md).

## The picture

```text
 ┌──────────────────────── Electron window (src/app) ─────────────────────────┐
 │  Office (React Three Fiber)   Tasks (kanban)   Dashboard   Team   Settings  │
 │        ▲ draws Activities          ▲ reads            ▲ reads               │
 └────────┼───────────────────────────┼──────────────────┼─────────────────────┘
          │            IPC (preload, typed contract in src/core)
 ┌────────┼───────────────────────────┼──────────────────┼─────────────────────┐
 │  Engine (src/engine, Node)                                                  │
 │   Session runner ── Activity map ── Task board ── Usage reader ── Approvals │
 │        │                ▲                             ▲              ▲      │
 └────────┼────────────────┼─────────────────────────────┼──────────────┼──────┘
          │ spawns         │ stream-json (stdout)        │ reads JSONL  │ permission
          ▼                │                             │              │ prompts
   claude -p  (one per Peep, in the Office folder) ──────┴──────────────┘
```

## One Peep, one session

Each Peep is one Claude Code process started by the Engine with `claude -p` and
`--output-format stream-json`, so the Engine gets structured messages, not terminal text. The flags
that matter, all present in Claude Code 2.1.292:

| Flag | Used for |
|---|---|
| `--model <alias>` | The Role's model, or the Manager's choice for this Task |
| `--append-system-prompt-file` | The Role brief + Company Note + related Handoff Notes |
| `--tools` | The Role's tools only; most of the context saving ([ADR 7](adr/0007-plugins-per-role.md#what-we-found-2026-11-16-claude-code-21292)) |
| `--safe-mode` | Lean Roles: none of the CEO's plugins, skills, hooks or CLAUDE.md; a Role's Skills come back as files listed in its brief ([ADR 9](adr/0009-skills-per-role-with-base-skills.md)) |
| `--mcp-config` + `--strict-mcp-config` | Only the Role's MCP servers, so unused ones cost nothing |
| `--input-format stream-json` + `--permission-prompts host` + `--permission-prompt-tool stdio` | The task goes in on stdin; permission questions come out as `can_use_tool` and wait for the CEO's Approval ([ADR 5](adr/0005-approvals-follow-claude-code-permissions.md#what-we-found-2026-11-17-claude-code-21292)) |
| `--allowedTools` | Rules the CEO added with "Always allow for this Role" |

Tasks always start a fresh session: memory is Handoff Notes, never `--resume` of an old conversation.
Sessions stay persisted (no `--no-session-persistence`) so their transcripts can be read back.

The Concurrency Limit (3 by default) is enforced by the Engine: a Peep over the limit is Queued and
starts when another finishes.

## Seeing what a Peep does, for free

Everything comes from the session's own `stream-json` output; the model never sees or produces any of
it. Hooks were the first plan, but they don't run in a lean `--safe-mode` session
([ADR 2](adr/0002-the-office-costs-no-tokens.md#what-the-hook-listener-spike-found-2026-11-18-claude-code-21292)).

| `stream-json` message | What the Engine does |
|---|---|
| `system` `init` | Peep sits down; the Claude Code version is checked against the tested ones |
| `assistant` with a `tool_use` | Activity from the tool (see [office.md](office.md#activities)); a `Write` or `Edit` path is listed on the Task |
| a message with a `parent_tool_use_id` | A subagent is working: the Peep stays Delegating |
| `user` with a `tool_result` | Back to Thinking after a few seconds without a new tool; Stuck after two failed results in a row |
| `control_request` `can_use_tool` | Waiting for Approval ([ADR 5](adr/0005-approvals-follow-claude-code-permissions.md)) |
| `rate_limit_event` | The Weekly Limit |
| `result` | Task output ready; Handoff Note read; Usage counted; Peep goes Idle |

Mapping messages to Activities is pure code in `src/core/activity.ts`, tested without Electron or
Claude Code.

## Counting tokens

- **Conversations:** the Manager's Kickoff and Meetings keep one session open between the CEO's lines
  (stream-json on stdin, stdin closed only when the meeting ends). Its `result.modelUsage` is the
  session's running sum, so each turn records only what it added (`turnUsage` in `src/core/usage.ts`).
  An open conversation doesn't take a seat under the Concurrency Limit.
- **Usage:** every assistant message in the `stream-json` output carries its `usage` and model, so
  the Engine counts as the session runs. The transcript (`~/.claude/projects/<folder>/<session>.jsonl`)
  is the fallback after a crash or restart.
- **Weekly Limit:** `stream-json` carries a `rate_limit_event` with `unifiedWindows.five_hour` and
  `seven_day` (`utilization`, `resetsAt`) on Pro and Max plans. The Engine saves the latest one. The
  status line command was the first idea, but it doesn't run in `-p`.
- Savings math: [token-savings.md](token-savings.md).

## Memory

| Kept by | What | Cost |
|---|---|---|
| The Engine | Task board, who did what, file results, Usage | 0 tokens |
| The Peep, at the end of a Task | Handoff Note, ≤150 words, part of its last message | A few output tokens |
| The Engine, at the start of a Task | Company Note + Role brief + related Handoff Notes | Input tokens, mostly cached because the start is the same every time |
| Haiku, once in a while | Compacting `company.md` when it passes its limit | One small call |

Files live in the Office folder under `.tinypeeps/`: `company.md`, `roles/*.md`, `hiring/*.md` (the
Hiring Plan before the CEO approves it), `notes/<task>.md`, `board.json`. The Brief the Manager writes
(`docs/brief.md`, `CONTEXT.md`, `docs/decisions/`, `TODO.md`) sits in the Office folder itself, beside
the work. Plain files, so the CEO can read and edit them.

## The window

- **React + Tailwind** for pages and panels, **Motion** for small UI animations.
- **React Three Fiber + drei** for the office; low-poly glTF assets ([office.md](office.md#art)).
- The window only reads what the Engine publishes and sends commands through the preload contract. It
  never runs Claude Code or reads files directly.
