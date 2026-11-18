# 9. Skills per Role, on top of Base Skills every Peep holds

Status: accepted (2026-11-17). The `skills-per-peep` spike settled how Skills reach a lean Peep
([below](#what-the-spike-found-2026-11-17-claude-code-21292)).

## Context

A Peep is as good as what it knows how to do. A video editor needs Remotion; a frontend builder
needs design skills such as Impeccable, UI UX Pro Max or Frontend Design. Some skills help every
Peep whatever its job. [ADR 7](0007-plugins-per-role.md#what-we-found-2026-11-16-claude-code-21292)
found that Claude Code 2.1.292 can't load chosen plugins per session: a Role gets none (lean) or all
(everything).

## Decision

- **Base Skills**, held by every Peep including the Manager, on by default and listed in Settings:
  - caveman (short answers; real output saving is about 15 to 25%, not the 65% often quoted)
  - ponytail (smallest change that works, plain replies)
- **Both are mostly rules, not tools**, so the app adds their rule text to every Peep's system prompt
  (read from the CEO's installed plugin, never copied into this repository). That works in a lean
  session, which runs no plugin hooks, and is cached like the rest of the brief.
- **Matt Pocock skills belong to the Manager.** Most of them are for code, and their descriptions
  cost every Peep every turn. The Manager may give one of them to a Role that needs it (`tdd` for a
  builder) through the Hiring Plan, like any other Skill.
- **The Manager's own Skills**, on top of the Base Skills:
  - Matt Pocock skills (`mattpocock-skills`), including `grilling` for the Kickoff interview
  - `brief` (ships in `skills/brief/`): the starting docs
  - `find-skills` (Vercel Labs, MIT): searches [skills.sh](https://skills.sh) by install count, to
    pick each Role's Skills ([installer page](https://mrcreate.studio/find-skill/))
  - `review` (ships in `skills/review/`): Pass or Changes on any kind of work, handing code to
    `ponytail-review`
- **Every other Skill is chosen per Role by the Manager** in the Hiring Plan, with a reason, and is
  listed in the Role file's `skills:` field ([templates.md](../templates.md#a-role-file)).
- **Install needs an Approval.** A Skill not on the CEO's computer yet is installed only after the
  CEO allows it, showing where it comes from.

## Consequences

- Base Skills cost every Peep, every turn. The Team page shows each Role's context size, so their
  cost is visible; the CEO can turn one off in Settings.
- **The rule for what every Peep holds:** a Base Skill stays only if it adds at most 10% to a lean
  Role's context per turn (about 700 tokens on a 6.8k Role) and doesn't make reviews worse. Anything
  bigger moves to the Manager, who hands it out per Role.

## First estimate (2026-11-17, from the installed plugins, no model calls)

Counted from the skill descriptions and rule files on disk at about 4 characters per token. The spike
replaces these with measured numbers.

| Plugin | What each turn carries | About |
|---|---|---|
| Matt Pocock skills 1.3.1 | 15 skill descriptions the model can call | 800 tokens (+11% on a 6.8k lean Role) |
| ponytail 5.3.2 | Rule text from its session hook, plus 6 skill descriptions | 650 + 430 tokens |
| caveman 3.0.0 | Rule text from its session hook, plus its skill descriptions | 160 tokens + descriptions, to measure |

Matt Pocock skills alone pass the 10% line, which is why they moved to the Manager.
- Lean Roles (`--safe-mode`) load no plugin skills and no project `.claude/skills/` either, so Skills
  reach them as files (below).

## What the spike found (2026-11-17, Claude Code 2.1.292)

- A `SKILL.md` in the session folder's `.claude/skills/` loads with everything on, and **doesn't** in
  `--safe-mode`: only Claude Code's bundled skills are listed.
- **Skills as files work:** each Skill lives in `.tinypeeps/skills/<name>/SKILL.md`; the brief lists
  its name, description and path; the Peep reads the file when a task matches. A lean Haiku session
  with one such Skill started at 5.4k context tokens, read the file and followed it.
- So a Skill costs about what Claude Code's own skills cost (the description every turn, the body only
  when used) without giving up lean sessions. `src/core/skills.ts` builds the list; a Skill a Role names
  that isn't in the Office yet is left out of the brief.
- Measured below.

## What the Base Skills cost (2026-11-18, Claude Code 2.1.292)

Each plugin's rules read by running its own `SessionStart` hook (with a throwaway HOME, so its flag
files never touch the CEO's `~/.claude`), then added with `--append-system-prompt-file` to a lean Haiku
session with Read, Grep and Glob. Context tokens on the first turn:

| Session | Tokens | Added |
|---|---|---|
| Lean Role, nothing added | 6,562 | – |
| + caveman 3.0.0 rules | 8,045 | +1,483 (+22.6%) |
| + ponytail 5.3.2 rules | 7,450 | +888 (+13.5%) |
| + both | 8,925 | +2,363 (+36%) |

Both are over the 10% rule, so **both ship off.** The CEO sees each one's measured cost in Settings and
can turn it on for every Peep; the Team page then shows what it adds. The Matt Pocock skills stay on the
Manager only, as files listed in its brief (their descriptions, not their bodies, go every turn).

**Reviews stay as good with them.** The same Opus review of a made-up `intro.md` that broke its
"done when" (five lines instead of three, a typo, a placeholder link), once with the Manager's brief
alone and once with caveman and ponytail added: both said **Changes** and listed the same four fixes;
the second was terser and also named what it couldn't check. One pair, so a sign, not proof.
