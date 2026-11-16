# Architecture

How sessions, hook events and the window fit together. **Nothing here is built yet.** The decisions
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
          │ spawns         │ hook events (local socket)  │ reads JSONL  │ permission
          ▼                │                             │              │ prompts
   claude -p  (one per Peep, in the Office folder) ──────┴──────────────┘
```

## One Peep, one session

Each Peep is one Claude Code process started by the Engine with `claude -p` and
`--output-format stream-json`, so the Engine gets structured messages, not terminal text. The flags
that matter, all present in Claude Code 2.1.292:

| Flag | Used for |
|---|---|
| `--model <alias>` | The Role's model, or the Boss's choice for this Task |
| `--append-system-prompt-file` | The Role brief + Company Note + related Handoff Notes |
| `--allowedTools` / `--disallowedTools` | The Role's tools |
| `--mcp-config` + `--strict-mcp-config` | Only the Role's MCP servers, so unused ones cost nothing |
| `--settings` | Per-Role settings, including which plugins are enabled and the hooks below |
| `--permission-prompts host` + `--permission-prompt-tool` | Permission questions come to the Engine, which makes them Approvals |

Tasks always start a fresh session: memory is Handoff Notes, never `--resume` of an old conversation.
Sessions stay persisted (no `--no-session-persistence`) so their transcripts can be read back.

The Concurrency Limit (3 by default) is enforced by the Engine: a Peep over the limit is Queued and
starts when another finishes.

## Seeing what a Peep does, for free

The Engine passes each session a settings file that registers command hooks for the events below. Each
hook runs a tiny script that writes the event's JSON to the Engine's local socket and exits. The model
never sees or produces any of it.

| Hook event | What the Engine does |
|---|---|
| `SessionStart`, `SessionEnd` | Peep sits down / stands up |
| `UserPromptSubmit` | A Task or a chat message reached the Peep |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure` | Activity changes (see [office.md](office.md#activities)) |
| `SubagentStart`, `SubagentStop` | A helper appears beside the Peep and leaves |
| `PermissionRequest` | The Peep walks to the CEO's desk; an Approval opens |
| `Notification` | Shown on the Peep (e.g. waiting for input) |
| `Stop` | Task output ready; Handoff Note read; Peep goes Idle |

Mapping events to Activities is a pure function in `src/core`, tested without Electron or Claude Code.
The official list of events is in the [hooks reference](https://code.claude.com/docs/en/hooks); check
it before adding one.

## Counting tokens

- **Usage:** every assistant message in the `stream-json` output carries its `usage` and model, so
  the Engine counts as the session runs. The transcript (`~/.claude/projects/<folder>/<session>.jsonl`)
  is the fallback after a crash or restart.
- **Weekly Limit:** Claude Code passes `rate_limits.five_hour` and `rate_limits.seven_day`
  (`used_percentage`, `resets_at`) to a status line command on Pro and Max plans. The Engine registers
  a status line command in each session's settings that forwards those two fields. Field names come
  from community tools and issue reports, not yet from the official docs; a spike confirms them.
- Savings math: [token-savings.md](token-savings.md).

## Memory

| Kept by | What | Cost |
|---|---|---|
| The Engine | Task board, who did what, file results, Usage | 0 tokens |
| The Peep, at the end of a Task | Handoff Note, ≤150 words, part of its last message | A few output tokens |
| The Engine, at the start of a Task | Company Note + Role brief + related Handoff Notes | Input tokens, mostly cached because the start is the same every time |
| Haiku, once in a while | Compacting `company.md` when it passes its limit | One small call |

Files live in the Office folder under `.tinypeeps/`: `company.md`, `roles/*.md`, `notes/<task>.md`,
`board.json`. Plain files, so the CEO can read and edit them.

## The window

- **React + Tailwind** for pages and panels, **Motion** for small UI animations.
- **React Three Fiber + drei** for the office; low-poly glTF assets ([office.md](office.md#art)).
- The window only reads what the Engine publishes and sends commands through the preload contract. It
  never runs Claude Code or reads files directly.
