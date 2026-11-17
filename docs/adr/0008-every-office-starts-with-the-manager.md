# 8. Every Office starts with only the Manager, who interviews the CEO and hires the team

Status: accepted (2026-11-17). Replaces "pick a Template" as a way to start in
[prd.md](../prd.md#1-start-an-office).

## Context

The first plan opened with two ways in: describe the company, or pick a ready-made Template (Content
Studio, Dev Studio). A fixed Template guesses the team before anyone knows the Goal, and it pulls the
app toward the two companies we happened to write. TinyPeeps is for any kind of company: software,
videos, a shop, a newsletter.

Tools like [AgentsRoom](https://agentsroom.dev/features) and OneManCompany let a lead agent propose the
team. [My Virtual Office](https://github.com/eliautobot/my-virtual-office) (AGPL-3.0, so ideas only,
no code) keeps a shared shelf of skills given to agents one by one.

## Decision

- **A new Office has only the Manager** (the Peep formerly called the Boss) and the CEO.
- **Kickoff:** the CEO says what they want; the Manager asks questions back, one at a time, with the
  `grilling` skill, in the Meeting Room, until the Goal is clear.
- **Brief:** the Manager writes the project's starting docs with the `brief` skill
  (`skills/brief/SKILL.md`): `docs/brief.md`, `CONTEXT.md`, `docs/decisions/`, `TODO.md`.
- **Hiring Plan:** the Manager proposes the team: each Role with its job, model, tools and Skills
  (found with `find-skills`), a one-line reason each, and the context size each Role will start every
  turn with. It is written as draft Role files the CEO can see as cards.
- **The CEO edits, then approves.** Add or remove a Role, rename it, change its model, add or remove
  a Skill. Nothing runs until Approve; then the Peeps walk in.
- **Hiring later** works the same way: the Manager proposes one more Role as an Approval.
- **Templates become "save this company"**: an Office's Roles and Company Note exported as files, to
  start the next Office with the same team or share it on GitHub. The app ships with none in v1.

## Consequences

- The first minutes cost tokens (the Kickoff and Brief run on the Manager's model). The CEO sees the
  count, as for any Task.
- The Hiring Plan is only as good as the skills `find-skills` finds; the CEO's edit step is the guard.
- The Brief skill writes into the Office folder. In a folder that already has these files it extends
  them and says what changed.

## What we found (2026-11-17, Claude Code 2.1.292)

- One run against real Claude Code, Haiku standing in for the Manager's Opus, in an empty Office: it
  wrote `docs/brief.md` and three draft Roles (copywriter on Haiku, designer on Haiku, frontend on
  Sonnet) with a `why` each; every Write went through an Approval; approving seated all three.
- Haiku wrote only `docs/brief.md`, not the other three Brief files the `brief` Skill asks for.
- Then clicked through in the real window with Opus (2026-11-17): two grilling questions, each with a
  recommendation, then all four Brief files (`docs/brief.md`, `CONTEXT.md`, three decisions, `TODO.md`)
  and a Hiring Plan of two (copywriter on Haiku, web developer on Sonnet) with Skills it found on
  skills.sh. 9 Approvals, about $0.38 in all. Approving seated both.
- Found and fixed after that run: "Always" now also covers the rest of the session it was given in;
  the Meeting Room renders the Manager's Markdown (bold, lists, tables, code) with a reader in
  `src/core/markdown.ts` that returns data, never HTML; the chat is saved in `.tinypeeps/meeting.json`
  and comes back after a restart, and a new session is sent what was said.
