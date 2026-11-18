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
      the PATH `shortcut:` in `src/desktop/main.ts`)
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

**Where B stands** (2026-11-18). Clicked through in the real window with Claude Code 2.1.292 on a
made-up Office (a bakery's Instagram video): Kickoff with Opus, Hiring Plan, a Goal planned into two
Tasks, Approvals, reviews, one Escalation that passed and one that went to the CEO, Compaction, Stop
all, Meeting now and quitting with a Peep at work. B is done: the last items were seen on 2026-11-18
with a scripted pretend Claude Code (a subagent, an Approval, two failed tools, version 2.1.998, the
notification banner), 0 tokens.

| Status | How many | Items |
| ------ | -------- | ----- |
| Done | 22 | all |

- [x] **Spike `hook-listener`:** hooks never run in a lean `--safe-mode` session, not even from
      `--settings`; `stream-json` already carries tool calls, results, subagents, permission questions
      and the end ([ADR 2](docs/adr/0002-the-office-costs-no-tokens.md#what-the-hook-listener-spike-found-2026-11-18-claude-code-21292))
- [x] **Activities from `stream-json` instead of hooks:** the hook list (`SessionStart/End`,
      `Pre/PostToolUse`, `SubagentStart/Stop`…) is replaced by the stream messages that carry the same
      thing ([architecture.md](docs/architecture.md#seeing-what-a-peep-does-for-free)); an Activity shows as
      soon as its line arrives, no socket or script runs on the CEO's computer
- [x] **Activities complete** ([office.md](docs/office.md#activities)): Thinking after 3 s
      without a new tool, Delegating while a subagent works (a small helper appears beside the Peep and
      goes), Stuck only after two failed tools in a row, Waiting for Approval. Tested
      (`src/core/activity.test.ts`); seen: the helper beside the Peep, one failed tool stays Running and
      the second turns Stuck
- [x] **Spike `permission-host`**, then **Approvals:** `--input-format stream-json`,
      `--permission-prompts host`, `--permission-prompt-tool stdio`; the `acceptEdits` `shortcut:` is
      gone ([ADR 5](docs/adr/0005-approvals-follow-claude-code-permissions.md#what-we-found-2026-11-17-claude-code-21292))
- [x] **Approval flow:** Peep walks to the CEO's desk, request in plain words, Allow / Deny / "always
      allow this for this Role" (saved into the Role file, and it also answers the same question already
      waiting); a read outside the Office folder shows its path; never `bypassPermissions`. The card sits
      above the Meeting Room panel
- [x] **Approval pile:** several stack oldest first, HUD count, system notification when the window is
      hidden. Seen: four waiting, oldest on top, "+3 more waiting", HUD count, and the banner with the
      window in the background (2026-11-18, pretend Claude Code). The dev build only gets the banner after
      re-signing its bundle (`xattr -cr` + `codesign --force --deep --sign -` on
      `node_modules/electron/dist/Electron.app`): as installed it is linker-signed only, so macOS refuses
      with `UNErrorDomain error 1` and never lists Electron in Notifications. `npm ci` undoes it
- [x] **Spike `skills-per-peep`:** a lean session loads no `.claude/skills/`; Skills as files listed in
      the brief work ([ADR 9](docs/adr/0009-skills-per-role-with-base-skills.md#what-the-spike-found-2026-11-17-claude-code-21292));
      Role files have `skills:`
- [x] **Measure Base Skills:** on a 6,562-token lean Role caveman adds +1,483 (+22.6%), ponytail +888
      (+13.5%); both over the 10% rule. One Opus review with and without them gave the same verdict and
      the same four fixes ([ADR 9](docs/adr/0009-skills-per-role-with-base-skills.md#what-the-base-skills-cost-2026-11-18-claude-code-21292))
- [x] **Base Skills:** rule text read by running each plugin's own `SessionStart` hook (throwaway HOME,
      so nothing lands in `~/.claude`), added to every brief when on; listed in Settings with their size
      and a toggle; the Team page shows what they add. Both ship **off**, by the 10% rule; the Matt
      Pocock skills stay on the Manager only
- [x] **Kickoff and Brief** ([ADR 8](docs/adr/0008-every-office-starts-with-the-manager.md)): a new
      Office opens on the Meeting Room with only the Manager; the Manager writes the Brief, the Company
      Note and the Hiring Plan; the chat comes back after a restart (`.tinypeeps/meeting.json`)
- [x] **Hiring Plan:** draft Role files in `.tinypeeps/hiring/` as cards; the CEO edits a card (a renamed
      hire kept its new name), removes or adds Roles, asks for changes or approves; approving seats each
      hire and removes the drafts; installing a Skill is an Approval
      ([templates.md](docs/templates.md#the-hiring-plan))
- [x] **Manager plans:** a Goal in the Command Bar (once there's a team) → the Manager (Opus, read-only,
      "planning, not the Kickoff") returns Tasks with a Peep, a model and a one-line reason; Manager
      autonomy off leaves them in Backlog. Shortcut: Tasks of one Goal run side by side, the plan has no
      "after" between them
- [x] **Tasks page:** kanban Backlog → Working → Review → Done; cards show Avatar, model, tokens, a second
      try and "Your call"; drag a card onto a Peep to assign and start it ("Give to" from the keyboard);
      Accept, Back to Backlog, Remove
- [x] **Review and Escalation:** a finished Task goes to the Manager, who reviews it with `skills/review`
      and ends with `Verdict: Pass|Changes`; Changes runs once more on `escalate_to` with the list (seen:
      Haiku → Sonnet, then Pass); a second Changes, or no verdict, goes to the CEO; every "Suggest tool:"
      line becomes an "Add" button for a tool the Peep doesn't have; the Dashboard counts Escalations per
      Peep
- [x] **Quick Actions complete** ([office.md](docs/office.md#rooms-in-v1)): Quick Actions are data per
      Room in `src/core/strings`, with a Meeting Room, Server Room and Archive added to the floor; CEO Office
      "What do you need from me?", Manager's Office "Review my work" / "Check against the Brief", Meeting
      Room "Plan this together" / "Hand over to [Peep]", Library "Find a Skill for this", Server Room, Archive,
      next to a Peep "Ask for progress" / "Help them", Lounge "Take a break" (stops after the current
      Task), "Stop and do this first" (the Task goes back to Backlog and resumes after), dropping at its
      own desk ends the Drop. Seen: Meeting Room and Lounge actions, Hand over with nothing open, Take a
      break, Stop and do this first (the Task went to Backlog and came back to Working after), Review my
      work (a second Manager review), a hand-over of a running Task (the old run shows "Stopped by you",
      not an error), the own-desk drop
- [x] **CEO controls** ([prd.md](docs/prd.md#2-give-work)): Meeting now pauses everyone and opens the
      Meeting Room with the Manager, given each Peep's latest result (ending it resumes); Pause all;
      Stop all asks once, then stops every session, Tasks back to Backlog, nothing starts on its own
      until the CEO acts. Peeps walking to the room waits for the layout in C
- [x] **Memory:** Handoff Note (≤150 words) saved to `.tinypeeps/notes/<task>.md`; the Manager writes
      `company.md` with the Brief; a new Task gets Company Note + Role brief + the notes of its Goal (last
      5); never `--resume`; side panel shows and edits notes and lists the files the Peep wrote
- [x] **Compaction:** `company.md` over 300 words is shortened once by Haiku before the next Task
      (seen: 497 → 149 words); the CEO sees the change line by line and keeps or undoes it; an undone or
      kept note isn't compacted again until it changes. Its tokens count under "company"
- [x] **Failures:** a crashed session shows Stuck, its Task goes back to Backlog, Usage kept from the
      transcript; quitting with Peeps working asks first ("Stop and quit" / "Keep working"), then stops
      them and returns their Tasks (seen, Usage of the stopped run kept)
- [x] **Version check:** warn once when the installed Claude Code isn't one in
      `src/core/claude-version.ts` (tested); seen with a pretend 2.1.998, and it now stays its full 4 s
      instead of being replaced by the Peep's next tool ([ADR 1](docs/adr/0001-electron-app-over-claude-code-sessions.md))
- [x] **Layout:** the Engine in `src/engine` (Node only), Electron in `src/desktop`, the window in
      `src/app`, the 3D office in `src/app/office`, as [AGENTS.md](AGENTS.md) plans
- [x] **Tests:** a pretend Claude Code in `test/pretend` replaying recorded, scrubbed sessions
      ([docs/test-data.md](docs/test-data.md)); `test/board.test.ts` runs a Goal through the real Engine
      and fails on any model call besides the plan, the Task and its review
      ([ADR 2](docs/adr/0002-the-office-costs-no-tokens.md))

## C. Pretty office

From capsules to a warm low-poly office. [office.md](docs/office.md)

- [x] **Spike `office-fps`:** 6 animated Peeps at 60 fps on an M1 MacBook Air. Yes: 238 fps uncapped
      (144 at this monitor's vsync), glTF skinned meshes and `useAnimations` are fine
      ([office.md](docs/office.md#spike-office-fps-rigged-gltf-characters-are-fine)). Run in a plain Electron
      window (`spikes/office-fps/`), not the app's own window: not measured on the Air's own screen or on battery
- [x] **Art:** KayKit Adventurers + Character Animations + Furniture Bits (or Quaternius), licences
      checked on each pack's page, listed in `assets/CREDITS.md`. Needs sitting, waving, working clips
      (in the pack) but no typing clip exists: see office.md
- [x] **Look:** matte toon material, cream/terracotta/sage palette, baked soft shadows, isometric
      camera with a little rotate and zoom. Built (`src/app/office/look.ts`, `Furniture.tsx`): seen in
      a browser on the real `Office` component, light and dark, drag and drop working; the Electron dev
      window draws it at 60 fps while moving and 0 when still. Seen by the maintainer in the real window
- [x] **Layout `studio-small`** ([office.md](docs/office.md#rooms-in-v1)): CEO Office, Manager's
      Office, Meeting Room, Library with the Skill Shelf, Desks, Server Room, Front Door, Archive,
      Lounge (sofa, coffee machine). Built (`office-data.ts`, `Furniture.tsx`): closed rooms behind
      glass with doors, six cubicle pods of facing desks, names on hover; seats saved by the first
      layout move to the new ones (`test/office-layout.test.ts`). Seen in the real window
- [ ] **Poses per Activity:** laptop typing, open book, library shelf or phone, server rack, thought
      bubble, helper peep, paper to the CEO, red "!", coffee, sofa; Role-renamed Activity labels
- [x] **Walking:** simple paths around furniture, face where they go. Built (`src/app/office/paths.ts`):
      A* on a 0.25 grid from the same walls, doors and furniture the office draws, corners cut;
      `test/office-paths.test.ts` walks between 9 places and never crosses a wall. Peeps don't avoid
      each other yet. Seen in the real window
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
- Hooks or `stream-json` for Activities? Settled in B: `stream-json` only, since hooks don't run in a
  lean session ([ADR 2](docs/adr/0002-the-office-costs-no-tokens.md)).
