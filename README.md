# TinyPeeps

**Run a one-person company with a team of AI peeps you can watch, pick up and move.** A free,
open-source desktop app that orchestrates Claude Code sessions as a small 3D office: a Manager who plans,
a team who works, and you as the CEO who approves what matters. It shows how many tokens each peep
uses and how much the team saved by not running everything on the biggest model.

> **Status: early prototype.** There is nothing to download yet. A first version runs from source
> ([Try the prototype](#try-the-prototype)). Everything under [What it will do](#what-it-will-do)
> describes the first version we intend to build.

## Try the prototype

You need macOS, Node.js 22 or newer, and [Claude Code](https://code.claude.com) installed and signed in.

```sh
npm install
node node_modules/electron/install.js   # only if `npm run dev` says "Electron uninstall"
npm run dev
```

What works today: the app shell (Office, Tasks, Dashboard, Team, Settings; light and dark; English and
Indonesian), Peeps from editable Role files in `.tinypeeps/roles/`, Simulation (0 tokens), Drop and
the Drop Box, the Command Bar (`⌘K`), real tasks through `claude -p` with each Role's own model and
tools, and a Dashboard with tokens per model and Peep, the Saving against Opus and your Weekly Limit.

Also built and run against real Claude Code from the Engine, not yet clicked through in the window:
a new Office starts with the Manager alone in the Meeting Room (Kickoff, then the Brief, then a Hiring
Plan you edit and approve), Approvals (the Peep walks to the CEO's desk, a card asks in plain words:
Allow, Deny, Always for this Role), Meeting now, Pause all and Stop all, and Skills as files.

Not yet: the Manager splitting a Goal into Tasks, a kanban board, review and Escalation, Templates,
real art. The plan is in [TODO.md](TODO.md).

## What it will do

Orchestrators like Orca run many agents but show you terminals. Office visualizers like Pixel Agents
show you cute characters but you can't give them work. TinyPeeps is both, and it counts the cost:

- **Say what you want to make.** Any kind of company: a website, a video channel, a shop. Every new
  office starts with only the Manager. Type "start a history YouTube channel" and the Manager asks you
  questions back until it's clear, writes the starting docs, then proposes a team (researcher,
  scriptwriter, editor with Remotion, uploader), each with a model and the Skills it needs. Change
  anything, approve, and they walk in through the door.
- **Watch them work.** Each peep is a real Claude Code session. When it reads, it reads a book; when it
  writes, it types; when it's idle, it gets coffee. The office follows what the session really does,
  and drawing it costs no tokens.
- **Pick them up.** Drag a peep (it panics), drop it in another room or next to someone (it looks
  confused), then type what you want or tap a quick action: "review their work", "give direction",
  "stop and do this first". Or call a meeting now, pause everyone, or stop everyone at once.
- **Stay the CEO.** Anything Claude Code would normally ask permission for (a file outside the folder,
  a `git push`, an install, an upload) walks to your desk as a sheet of paper. Nothing important
  happens without you.
- **See the savings.** A dashboard shows tokens per peep and per model, your weekly limit, and how much
  you saved compared with running every task on Opus.

English and Bahasa Indonesia, light and dark. macOS first, then Windows and Linux.

### Not in the first version

Build mode (arranging rooms and furniture yourself), a Template marketplace, a phone app, physics
ragdolls, and API-key billing. [docs/prd.md](docs/prd.md#not-in-the-first-version) says why each waits.

## What's been tested

| Question | Result |
|---|---|
| Can the app see what a Claude Code session is doing without asking the model? | Passed once: a real Haiku task streamed Read → Edit → done through `stream-json`, mapped by `src/core/activity.ts` with no extra model call. Hooks for permissions and subagents are still to test ([ADR 2](docs/adr/0002-the-office-costs-no-tokens.md)). |
| How many tokens does a session carry before any work? | Measured with Claude Code 2.1.292 and Haiku: about 33.6k context tokens per model turn with the maintainer's plugins, skills and hooks; 26.4k with `--safe-mode` (−22%: 121 → 31 tools, 90 → 20 skills, 10 → 0 MCP servers). A 4-turn task re-reads that context each turn, about 128k cache reads in all. |
| Does a lean Role really start smaller? | Passed: measured from the Team page, Claude Code 2.1.292. Everything loaded: 32.6k tokens per turn. Each default Role (`--safe-mode`, its own `--tools`): 6.8k–8.1k, 75–79% less. The tool list is most of the cut. Plugins can't be added back per Role: `--safe-mode` loads no plugin skills. |
| Does the Saving match what Claude Code charges? | Passed once: a Haiku 4.5 task cost $0.033671 by `src/core/prices.ts`, the same as Claude Code's own `costUSD`; 74% less than the same tokens on Opus 5.5. |
| Can permission prompts be answered from the app instead of a terminal? | Passed against real Claude Code 2.1.292 by driving the Engine: a denied Write wrote nothing, "always" saved `Write` to the Role and the next session asked nothing ([ADR 5](docs/adr/0005-approvals-follow-claude-code-permissions.md#what-we-found-2026-11-17-claude-code-21292)). Not yet clicked through in the real window. |
| Can a lean session use a Skill? | Not from `.claude/skills/`. As a file listed in the brief: yes, a lean Haiku session read and followed it at 5.4k context tokens ([ADR 9](docs/adr/0009-skills-per-role-with-base-skills.md#what-the-spike-found-2026-11-17-claude-code-21292)). |
| Can the app read the weekly limit? | Passed: `claude -p --output-format stream-json` emits a `rate_limit_event` with the five-hour and seven-day utilization and reset time. The status line command does not run in `-p`, so it isn't used. |
| Does a low-poly office with 6 peeps run smoothly on an M1 MacBook Air? | Not tested yet. |

## Your data stays on your computer

- TinyPeeps has no server and no account. It runs Claude Code on your machine, signed in with your
  own Claude plan.
- Your prompts, files and results go only where Claude Code already sends them (Anthropic) and to the
  tools and MCP servers you choose.
- No analytics, no tracking.

Full details: [docs/privacy.md](docs/privacy.md).

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). The repository is public, so **never commit transcripts,
tokens or files from your own sessions**. Security problems go through a [private report](SECURITY.md),
and everyone follows the [code of conduct](CODE_OF_CONDUCT.md).

**Where to find things** (for people and AI agents; agents also read [AGENTS.md](AGENTS.md)):

| Read | For |
| --- | --- |
| [docs/prd.md](docs/prd.md) | What we're building, for whom, and what counts as done |
| [TODO.md](TODO.md) | What's left before v0.1, in packages, each item pointing to its doc |
| [CONTEXT.md](CONTEXT.md) | The words the project uses (Peep, Manager, Office, Room, Drop, Approval…) |
| [docs/adr/](docs/adr/) | How it's built and why |
| [docs/architecture.md](docs/architecture.md) | How sessions, hooks and the window fit together |
| [docs/office.md](docs/office.md) | The 3D office: rooms, activities, dragging, art |
| [docs/token-savings.md](docs/token-savings.md) | How tokens, the weekly limit and savings are counted |
| [docs/templates.md](docs/templates.md) | The Hiring Plan, Role and Template file formats |
| [skills/](skills/) | The Skills the Manager ships with: `brief` and `review` |
| [docs/design-system.md](docs/design-system.md) | The look |
| [docs/privacy.md](docs/privacy.md) | What the app keeps and where it connects |
| [docs/scenarios.md](docs/scenarios.md) | Every state the app must handle |

## License

[MIT](LICENSE). Art packs keep their own licenses ([docs/office.md](docs/office.md#art)).
