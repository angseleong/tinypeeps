# Product spec: TinyPeeps v1

What the first version is, who it's for and how we'll know it works. Back to the [README](../README.md).
Words in **bold capitals** are defined in [CONTEXT.md](../CONTEXT.md).

Status: draft (2026-11-16). Decisions behind it are in [docs/adr/](adr/).

## The problem

People now run whole "one-person companies" on AI: a script, a video, an upload, a landing page, all
made by agents while one person approves. Doing that with Claude Code today means:

1. **Several terminals and no overview.** You can't see at a glance who is doing what, who is stuck
   and who is waiting for you.
2. **Everything runs on one model.** Reading files and searching the web on Opus burns the weekly limit
   for work Haiku or Sonnet would do as well.
3. **No sense of cost.** `/usage` shows a percentage, not which agent or which task spent it, and not
   what you saved.

Tools exist for each piece, but not together:

| Tool | Does | Doesn't |
|---|---|---|
| [Orca](https://github.com/stablyai/orca) | Runs many CLI agents in parallel worktrees | No office, no model routing, no savings |
| [AgentsRoom](https://agentsroom.dev/features) | Roles with their own prompt and model, kanban, workflows | No 3D office, closed source |
| [TinyAGI / TinyOffice](https://github.com/TinyAGI/tinyagi) | "One Person Company" agent teams, kanban, org chart | No 3D office, no dragging, no savings |
| [Pixel Agents](https://docsearch.algolia.com/mcp/docs/repo/pixel-agents-hq/pixel-agents), [agents-in-the-office](https://github.com/gukosowa/agents-in-the-office) | 2D characters that follow Claude Code hooks | Watch only: you can't give work through them |
| [Claw3D](https://gitee.com/RexHuang936/Claw3D), [ClawOffice](https://chatgate.ai/post/clawoffice) | 3D offices for agents | Not Claude Code, no drag-to-room |

**TinyPeeps' bet:** the office is the controls, not a screensaver, and the cost is visible.

## Who it's for

**The CEO**: one person running a small company on Claude Code with a Pro or Max plan. They are
comfortable installing an app and an MCP server, not necessarily a developer. Two first examples:

- **A content maker** who wants research, scripts, edits and uploads done by a team they supervise.
- **A solo developer** who wants a planner, two builders and a reviewer working on one repository.

## Principles

1. **The office costs no tokens.** Drawing what Peeps do never calls a model.
2. **The CEO decides.** Anything Claude Code would ask permission for waits for the CEO.
3. **Never pretend.** A Peep looks busy only when its session is busy. A number on the dashboard
   says how it was counted.
4. **Cheapest model that works.** Defaults per Role, Escalation when they fail, Opus only to plan and
   review.
5. **Fun is a feature.** Picking a Peep up should make people smile. Peeps walking in through the door
   is the moment people share.

## What v1 does

### 1. Start an Office

- First launch shows an empty office: the CEO's Avatar, the Boss and the **Command Bar** ("What do you
  want to make today?").
- Two ways in: **describe it** (the Boss proposes a team: Roles, models, plugins, with the reason for
  each) or **pick a Template** (Content Studio, Dev Studio, blank).
- The CEO approves the team; Peeps walk in through the door one by one and sit at their desks.
- Each Office is one folder. The CEO can have several and switch between them.

### 2. Give work

- The Command Bar always talks to the Boss. The Boss turns a Goal into Tasks and assigns them.
- The CEO can override any time: drag a Task card onto a Peep, or Drop a Peep (below).
- Boss autonomy can be turned off, so every Task waits for the CEO to assign it.

### 3. Watch work

- Each Peep's **Activity** comes from hook events (see [office.md](office.md#activities)): Typing,
  Reading, Researching, Running, Waiting for Approval, Idle (coffee), Queued (sofa).
- Clicking a Peep opens its side panel: current Task and Activity, a short log, files it produced,
  a chat straight to it, its model and plugins.
- A HUD in the office corner: tokens today, Saving this week, Approvals waiting.

### 4. Drop a Peep

- Pick up: the Peep dangles and panics (spring wobble, not physics).
- Drop: it looks confused, and the **Drop Box** opens: free text plus **Quick Actions** for that
  Room or that neighbour. Example: drop the Boss in the designer's room, tap "Review their work", and
  Opus reviews the designer's latest output.
- A Drop never starts work by itself. Picking up a working Peep doesn't stop it; "Stop and do this
  first" does.

### 5. Approve

- Every permission Claude Code would ask for (files outside the folder, `git push`, installs, web
  access, MCP actions, uploads) becomes an **Approval**: the Peep walks to the CEO's desk with a sheet
  of paper, and the request shows in plain words with Allow and Deny.
- The CEO's existing Claude Code permission settings still apply; TinyPeeps only moves the question
  into the window.

### 6. Count the cost

- **Usage** per Peep, per model, per Task and per day, from transcripts.
- **Weekly Limit**, read from what Claude Code reports.
- **Saving** against the Baseline (all on Opus), with one big number on top: "This week you saved X%".
- **Escalations**: how often a cheap default had to be retried on a stronger model.
- How each number is counted: [token-savings.md](token-savings.md).

### 7. Team and Templates

- The Team page edits Roles: brief, model, tools, plugins and MCP servers, Room, Avatar.
- Each plugin shows roughly how many tokens it adds to every session, so the costly ones stand out.
- Templates export and import as a folder of files ([templates.md](templates.md)), shared on GitHub.

### 8. Memory without waste

- The app keeps the Task board and file results itself (no tokens).
- A Peep ends each Task with a Handoff Note.
- A new session gets the Company Note, its Role brief and the Handoff Notes of related Tasks, never the
  whole history, and never `--resume` of an old conversation.

## Not in the first version

| Waits | Why |
|---|---|
| Build mode (moving rooms and furniture) | A project of its own: grid, saving positions, walking paths. 1 to 2 weeks. |
| Sims-style sliders for Avatars | Base character + colours + accessories gives most of the feeling in a fraction of the work. |
| Physics ragdoll | A spring wobble looks almost the same, takes a third of the time and can't fall through the floor. |
| API-key billing | v1 is for Pro and Max plans; the Weekly Limit is the cost that matters there. |
| Windows and Linux builds | macOS first. Electron keeps the door open ([ADR 1](adr/0001-electron-app-over-claude-code-sessions.md)). |
| Template marketplace, accounts, cloud sync | Open source and local. Templates are files on GitHub. |
| A phone app | Later, once the desktop is useful. |

## How we'll know it works

| Measure | Target |
|---|---|
| Time from install to Peeps walking in | Under 3 minutes, with a Template |
| Tokens the office itself spends | 0, checked by a test that fails on any model call outside a Task |
| Saving on the Content Studio demo Goal, against the Baseline | At least 40% |
| Approvals that reach the CEO | Every one Claude Code would have asked in a terminal |
| Frame rate, 6 Peeps, M1 MacBook Air | 60 fps idle, never under 30 |

## Open questions

- The status line's `rate_limits` gives the overall five-hour and seven-day windows, not per-model
  ones. Is the overall Weekly Limit enough for the dashboard? (Probably, with per-model Usage beside it.)
- How should the Boss pick a model for a Task when the Role default isn't obvious? Start with the
  Role default and Escalation; revisit with data.
