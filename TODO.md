# TODO

Everything left before **v0.1**, grouped in packages. Each package ends with something to try in the
app, then merges to `main`. Every item comes from a doc; the doc is named so you can check what "done"
means. Tick an item only when it works in the real window.

Order: **0 → A → B → C → D**, about 3 to 4 weeks of full days.

| Package                                | Days  | You can try                                              |
| -------------------------------------- | ----- | -------------------------------------------------------- |
| [Done: prototype](#done-prototype)     | –     | Capsule Peeps, simulation, Drop, real `claude -p` tasks  |
| [0. Pretty UI](#0-pretty-ui)           | 1.5–2 | The app looks finished outside the 3D office             |
| [A. Thrifty office](#a-thrifty-office) | 2–3   | Real savings numbers, Roles you can edit                 |
| [B. A real Manager](#b-a-real-manager) | 4–5   | Kickoff, Hiring Plan, the team works, you only approve   |
| [C. Pretty office](#c-pretty-office)   | 4–5   | Low-poly characters that look like an animated explainer |
| [D. Ready to ship](#d-ready-to-ship)   | 2–3   | Someone else downloads it and starts in 3 minutes        |

## Done: prototype

- [x] Electron + React + React Three Fiber app runs on macOS with `npm run dev`
- [x] Four hard-coded Peeps (Bos/opus, Dina/sonnet, Raka/haiku, Sari/sonnet), desks, five Rooms
- [x] Activities from `stream-json` with no model calls, tested (`src/core/activity.test.ts`)
- [x] Peep walks to its desk when working, to the Lounge when idle
- [x] Pick up (panic wobble, "!?"), drop ("?"), Drop Box with Room Quick Actions and free text
- [x] Drop next to a Peep: "Review their work" and "Give direction", with that Peep's last result
- [x] Command Bar, side panel (log, last result, model, Stop), HUD (new tokens, cache apart)
- [x] Simulation mode (0 tokens)
- [x] Concurrency Limit of 3, extra Peeps queue on the sofa
- [x] Verified with one real Haiku task: Read → Edit → done, Usage read

## 0. Pretty UI

The shell every later page is built in, so nothing gets restyled twice.
[design-system.md](docs/design-system.md)

- [x] **Foundation:** Tailwind v4, colour tokens light and dark, Plus Jakarta Sans bundled locally (OFL),
      radius, shadows, tabular numbers
- [x] **Shell:** icon sidebar (Office, Tasks, Dashboard, Team, Settings), Office name and switcher on
      top, the Office page as home
- [x] **Offices:** remember several Office folders in the app's data folder, switch between them
      ([CONTEXT.md](CONTEXT.md): Office)
- [x] **Parts:** card with a big number, model badge (Opus `accent`, Sonnet blue, Haiku green), button,
      input, chip, gauge; every state has a word and an icon, not colour alone
- [x] **Redesign** the Drop Box, Peep side panel, HUD and Command Bar with those parts; `⌘K` opens the
      Command Bar from any page
- [x] **Motion** (the library): panels slide, cards lift, numbers count up, 150–250 ms ease-out, no
      bounce in the UI
- [x] **Reduce motion:** UI animation off; in the office Peeps slide instead of hop, no Drop wobble
      ([scenarios.md](docs/scenarios.md#drop))
- [x] **Words:** every on-screen word in `src/core/strings/`, English and Indonesian, language setting
- [x] **Settings page:** language, theme, Concurrency Limit, Manager autonomy, Claude Code path (removes
      the PATH `shortcut:` in `src/main/index.ts`)
- [x] **Code health:** Biome (lint, format), GitHub Actions CI running lint, typecheck and tests

## A. Thrifty office

Make the savings real and visible. [ADR 6](docs/adr/0006-model-per-role-with-escalation.md),
[ADR 7](docs/adr/0007-plugins-per-role.md), [token-savings.md](docs/token-savings.md)

- [x] **Role files:** `.tinypeeps/roles/*.md` in the Office folder, format from
      [templates.md](docs/templates.md#a-role-file); the four prototype Peeps become the default files
- [x] **Per-Role sessions:** `--append-system-prompt-file`, `--allowedTools`/`--disallowedTools`,
      `--mcp-config` + `--strict-mcp-config`, `--settings` with only the Role's plugins
- [x] **Measure the win:** context per turn 33.6k with everything → 6.8–8.1k per Role (−75 to −79%),
      in the README's "What's been tested"
- [x] **Session size instead of plugin cost:** Claude Code's `--safe-mode` loads no plugin skills, even
      through `--plugin-dir`, so plugins can't be picked per Role. The Team page measures what each Role
      really starts every turn with instead (one tiny Haiku session per Role); "everything" stays as the
      opt-in for Roles that need plugins
- [x] **Team page:** a card per Role with Avatar, brief size (warn outside 200–400 words), model,
      `escalate_to`, tools, plugins with their cost, Room
- [x] **Usage store:** per Peep, model, Task and day, saved in `.tinypeeps/`; a subagent's Usage counts
      to the Peep that started it; transcript fallback after a crash or restart
      ([architecture.md](docs/architecture.md#counting-tokens))
- [x] **Prices:** one file in `src/core` with the date copied and a link to Anthropic's pricing; a test
      fails when it's older than 90 days
- [x] **Saving:** price-weighted against the Opus Baseline, labelled "compared with running everything
      on Opus", tooltip with the assumptions; Escalations count both runs
- [x] **Weekly Limit:** read from the `rate_limit_event` that `claude -p --output-format stream-json` emits
      (five-hour and seven-day utilization with reset time), shown with when it was last seen; "not
      available yet" before the first Task; never estimated from tokens. The status line idea was dropped:
      it doesn't run in `-p`
- [x] **Dashboard page:** headline "This week you saved X%" + Weekly Limit gauge, by model, by Peep, by
      day (stacked bars), Escalations per Role with a hint to change the default
- [x] **HUD:** tokens today, Saving this week, Approvals waiting (the count arrives in B)

Left from 0 and A, small: CI has only run locally (`npm run check`), not on GitHub yet; light mode
and the transcript fallback after a crash haven't been checked in the real window; drei's `<Html>`
labels log "synchronously unmount a root" warnings on start.

## B. A real Manager

The CEO gives a Goal and only approves. [ADR 4](docs/adr/0004-memory-is-files-the-app-writes.md),
[ADR 5](docs/adr/0005-approvals-follow-claude-code-permissions.md), [prd.md](docs/prd.md#2-give-work)

- [ ] **Spike `hook-listener`** (smaller now: Approvals don't need hooks): command hooks write events to a local socket the Engine reads;
      reachable only from this computer ([SECURITY.md](SECURITY.md#whats-in-scope))
- [ ] **Hooks wired:** `SessionStart/End`, `UserPromptSubmit`, `Pre/PostToolUse`, `PostToolUseFailure`,
      `SubagentStart/Stop`, `PermissionRequest`, `Notification`, `Stop`; Activity within 200 ms
- [ ] **Activities complete** ([office.md](docs/office.md#activities)): Thinking after a few seconds
      without a tool, Delegating (helper appears and leaves), Stuck only after two failures in a row
      (today it's one), Waiting for Approval
- [x] **Spike `permission-host`**, then **Approvals:** `--input-format stream-json`,
      `--permission-prompts host`, `--permission-prompt-tool stdio`; the `acceptEdits` `shortcut:` is
      gone ([ADR 5](docs/adr/0005-approvals-follow-claude-code-permissions.md#what-we-found-2026-11-17-claude-code-21292))
- [ ] **Approval flow:** Peep walks to the CEO's desk, request in plain words, Allow / Deny / "always
      allow this for this Role"; the CEO's own allow rules still skip the question; never
      `bypassPermissions`. Built and passing against real Claude Code from the Engine; tick after a
      click-through in the real window
- [ ] **Approval pile:** several stack oldest first, HUD count, system notification when the window is
      hidden. Built (oldest card on top, "+N more", HUD count, notification); tick after the window check
- [x] **Spike `skills-per-peep`:** a lean session loads no `.claude/skills/`; Skills as files listed in
      the brief work ([ADR 9](docs/adr/0009-skills-per-role-with-base-skills.md#what-the-spike-found-2026-11-17-claude-code-21292));
      Role files have `skills:`
- [ ] **Measure Base Skills:** what caveman, ponytail and the Matt Pocock skills add per turn against
      the 10% rule, and that review verdicts stay as good
- [ ] **Base Skills:** caveman and ponytail rules in every Peep's system prompt (read from the CEO's
      installed plugins), Matt Pocock skills on the Manager only; listed in Settings, each can be
      turned off; their size shows on the Team page
- [ ] **Kickoff and Brief** ([ADR 8](docs/adr/0008-every-office-starts-with-the-manager.md)): a new
      Office has only the Manager; the CEO's first message starts the Kickoff (`grilling`, in the
      Meeting Room); then the Manager writes the Brief with `skills/brief`. Built: a new Office opens
      on the Meeting Room panel; the Manager's session stays open between the CEO's lines and counts
      tokens per turn. Clicked through in the real window with Opus
      ([ADR 8](docs/adr/0008-every-office-starts-with-the-manager.md#what-we-found-2026-11-17-claude-code-21292));
      the meeting chat is saved in `.tinypeeps/meeting.json` and comes back after a restart
- [ ] **Hiring Plan:** draft Role files in `.tinypeeps/hiring/` as cards (job, model, tools, Skills
      from `find-skills`, one-line `why`); the CEO edits any card, removes or adds Roles, then approves
      or rejects (asks what to change, nothing run); installing a Skill is an Approval; hiring later
      works the same way ([templates.md](docs/templates.md#the-hiring-plan)). Built: cards with name,
      job, model, Skills (⚠ when not on this computer), remove, "Ask for changes", Approve seats each
      hire; Skills already on this computer are copied into `.tinypeeps/skills/`. Passed once against
      real Claude Code; tick after the window check
- [ ] **Manager plans:** a Goal in the Command Bar → the Manager (Opus, planning only) returns Tasks with a
      Peep and a model each, with a one-line reason; Manager autonomy off leaves them in Backlog
- [ ] **Tasks page:** kanban Backlog → Working → Review → Done; cards show Avatar, model, tokens; drag a
      card onto a Peep to assign
- [ ] **Review and Escalation:** a finished Task goes to the Manager's Office; the Manager reviews it
      with `skills/review` (Pass or Changes); Changes runs once more on `escalate_to` with the list,
      counted, and a second Changes goes to the CEO; when a Peep's Handoff Note says it lacked a tool, the Manager suggests adding it
- [ ] **Quick Actions complete** ([office.md](docs/office.md#rooms-in-v1)): CEO Office "What do you need
      from me?", Meeting Room "Plan this together" / "Hand over to [Peep]", next to a Peep "Ask for
      progress" / "Help them", Lounge "Take a break" stops after the current Task, "Stop and do this
      first" sends the current Task back to Backlog; dropping at its own desk ends the Drop; Quick
      Actions live as data per Room
- [ ] **CEO controls** ([prd.md](docs/prd.md#2-give-work)): Meeting now (chosen Peeps finish their
      step and meet in the Meeting Room), Pause all (after the current Task), Stop all (asks once;
      Tasks back to Backlog, Usage kept). All three are built in the HUD, not yet checked in the window.
      Meeting now pauses everyone and opens the Meeting Room with the Manager, given each Peep's latest
      result; Peeps walking to the room waits for the layout in C
- [ ] **Memory:** Handoff Note (≤150 words) saved to `.tinypeeps/notes/<task>.md`; `company.md`; a new
      Task gets Company Note + Role brief + related notes only; never `--resume`; side panel shows and
      edits notes, and lists the files the Peep produced (from its Write and Edit calls)
- [ ] **Compaction:** `company.md` over its limit is compacted once by Haiku, the CEO sees the diff
- [ ] **Failures:** a crashed session shows Stuck, its Task goes back to Backlog, Usage kept from the
      transcript; quitting with Peeps working asks first, then stops them and returns their Tasks
- [ ] **Version check:** warn once when the installed Claude Code version hasn't been tested
      ([ADR 1](docs/adr/0001-electron-app-over-claude-code-sessions.md))
- [ ] **Layout:** as the Engine grows, move it out of `src/main` into `src/engine` (Node), `src/desktop`
      (Electron) and `src/app` (window), as [AGENTS.md](AGENTS.md) plans
- [ ] **Tests:** a pretend Claude Code in `test/pretend` replaying recorded, scrubbed events;
      `docs/test-data.md`; a test that fails on any model call outside a Task
      ([ADR 2](docs/adr/0002-the-office-costs-no-tokens.md))

## C. Pretty office

From capsules to a warm low-poly office. [office.md](docs/office.md)

- [ ] **Spike `office-fps`:** 6 animated Peeps at 60 fps on an M1 MacBook Air
- [ ] **Art:** KayKit Adventurers + Character Animations + Furniture Bits (or Quaternius), licences
      checked on each pack's page, listed in `assets/CREDITS.md`
- [ ] **Look:** matte toon material, cream/terracotta/sage palette, baked soft shadows, isometric
      camera with a little rotate and zoom
- [ ] **Layout `studio-small`** ([office.md](docs/office.md#rooms-in-v1)): CEO Office, Manager's
      Office, Meeting Room, Library with the Skill Shelf, Desks, Server Room, Front Door, Archive,
      Lounge (sofa, coffee machine)
- [ ] **Poses per Activity:** laptop typing, open book, library shelf or phone, server rack, thought
      bubble, helper peep, paper to the CEO, red "!", coffee, sofa; Role-renamed Activity labels
- [ ] **Walking:** simple paths around furniture, face where they go
- [ ] **Alive details** ([office.md](docs/office.md#details-that-make-it-feel-alive)): desk monitor
      shows the real tool, a folder flies on hand-over, faces from how it's going, a celebration and a
      victory move on Pass
- [ ] **Drop polish:** hover glow with name, Role and model; squash and stretch on pick-up; spring
      limbs; valid Rooms and Peeps highlight while carrying; landing bounce; nod and walk after Send
- [ ] **Arrival:** Peeps walk in through the door one by one, wave, sit, show a name and model badge;
      under 6 seconds for 5 Peeps
- [ ] **CEO in the office:** Avatar at the CEO desk, Approvals as a paper pile
- [ ] **Avatar editor:** base character, colours, accessories, for the CEO and each Peep
- [ ] **Performance:** shared materials, instanced furniture, 30 fps when nothing moves, 0 when the
      window is hidden

## D. Ready to ship

Someone who isn't us can install it and start. [prd.md](docs/prd.md#1-start-an-office),
[templates.md](docs/templates.md), [privacy.md](docs/privacy.md)

- [ ] **First run:** Claude Code installed? signed in? (says how to fix each), then the Manager's
      first Kickoff question
- [ ] **Save as Template / start from one:** export an Office's Roles and Company Note without
      `notes/`, `hiring/`, `board.json` or the Brief; a new Office from a Template skips the Kickoff;
      `template.md` format ([templates.md](docs/templates.md)). No Templates ship
- [ ] **Import safety:** importing a Template never runs
      commands and shows every tool and Skill it turns on ([SECURITY.md](SECURITY.md#whats-in-scope)); Roles borrowed from The
      Agency keep `source:` and `templates/CREDITS.md`
- [ ] **Privacy:** "Remove everything" setting; the data folder's location written into privacy.md;
      update check against GitHub Releases only
- [ ] **Security pass:** sandboxed preload, context isolation, no Node in the window, strict CSP; the
      window can only call what the preload contract gives it ([SECURITY.md](SECURITY.md#whats-in-scope))
- [ ] **Installer:** electron-builder `.dmg`; decide on Apple signing ($99/year) or document
      right-click → Open; Claude Code path works when opened from Finder
- [ ] **Release:** v0.1.0 on GitHub Releases; README with a GIF from a made-up Office, "What's been
      tested" table up to date
- [ ] **Repository:** private vulnerability reporting on, triage labels created
      ([docs/agents/triage-labels.md](docs/agents/triage-labels.md)), Dependabot
- [ ] **Check the targets** ([prd.md](docs/prd.md#how-well-know-it-works)): install → first
      Kickoff question under 3 minutes, Kickoff → Peeps walking in under 15, 0 office tokens, Saving
      ≥40% on a demo content Goal, every Approval a terminal would ask, 60 fps idle / never under 30

## After v0.1

Waiting on purpose ([prd.md](docs/prd.md#not-in-the-first-version)): build mode, Sims-style Avatar
sliders, physics ragdoll, API-key billing, Windows and Linux builds, a phone app. No marketplace,
accounts or cloud sync: Templates stay files on GitHub.

## Open questions

- Is the overall Weekly Limit enough, since `rate_limits` has no per-model windows? Decide in A.
- Can Skills load per Role in a lean session? The `skills-per-peep` spike in B answers it.
- Can plugins come back per Role? Only if Claude Code gets a way to load chosen plugins without the
  rest; until then a Role loads none (lean) or all (everything).
- How should the Manager pick a model when the Role default isn't obvious? Start with defaults and
  Escalation; revisit with data after B.
- Hooks or `stream-json` for Activities? The prototype uses `stream-json` alone; B adds hooks for what
  the stream doesn't carry (permissions, subagents, notifications). Update
  [architecture.md](docs/architecture.md) once settled.
