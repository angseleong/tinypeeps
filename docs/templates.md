# Templates and Role files

A Template is a saved company: the Roles and Company Note of an Office that already works, kept as
plain files so the next Office can start with the same team, or anyone can share it on GitHub. A new
Office normally starts with the Manager alone and a Kickoff
([ADR 8](adr/0008-every-office-starts-with-the-manager.md)); a Template skips the Kickoff and the
Hiring Plan. Back to the [README](../README.md). **The format is a draft; nothing reads it yet.**

## The Hiring Plan

After the Kickoff and the Brief, the Manager writes one draft Role file per proposed Role (the format
below, with a one-line `why:`) into `.tinypeeps/hiring/`. A Skill it wants from the internet it installs
into the Office with `npx skills add <owner/repo@skill> -y`, which the CEO approves like any command;
Skills already on this computer (the app's `skills/`, the CEO's own, an installed plugin) are copied into
`.tinypeeps/skills/` when a Role first needs them. The app shows them as cards the CEO can edit: add or remove a Role,
rename it, change its model, add or remove a Skill. On Approve the files move to `.tinypeeps/roles/`
and the Peeps walk in; on Reject the CEO says what to change and nothing has run.

## A Template folder

```text
bakery-website/
├── template.md        # name, description, which Roles, the Office layout
├── company.md         # the starting Company Note
└── roles/
    ├── manager.md
    ├── designer.md
    ├── writer.md
    └── frontend.md
```

Importing copies it into the Office's `.tinypeeps/` folder. Exporting does the reverse, without
`notes/`, `hiring/`, `board.json`, the Brief or anything else that came from real work.

## `template.md`

```markdown
---
name: Bakery website
description: A small shop site, designed, written and built by four Peeps.
layout: studio-small      # one of the layouts that ship with the app
roles: [manager, designer, writer, frontend]
---
Who this company is for, in a few sentences. Shown when someone picks the Template.
```

## A Role file

The same shape as a Claude Code agent file, with a few fields of our own.

```markdown
---
name: researcher
title: Researcher            # shown on the Peep's badge
model: haiku                 # default; the Manager may change it per Task
escalate_to: sonnet          # tried once if a Task fails
tools: [Read, Grep, Glob, WebSearch, WebFetch, Write]
mcp: []                      # MCP servers this Role may use, by name
skills: []                   # Skills on top of the Base Skills, picked by the Manager
why: Searching and summarising doesn't need more than Haiku.   # one line, shown on the hiring card
room: library
avatar: { base: rogue, hair: "#3b2a20", shirt: "#c96f4a", accessories: [glasses] }
activities: { Typing: "Writing notes" }
---
You are the researcher at this company. You find facts, sources and examples for the next video and
write them up for the scriptwriter.

- Cite every claim with a link.
- Save findings to `research/<topic>.md`.
- End every Task with a Handoff Note of at most 150 words: what you found, where it is, what's open.
```

Keep the brief under 400 words. It is sent at the start of every session.

`skills:` lists Skills on top of the Base Skills every Peep holds (caveman and ponytail; set in
Settings). Whether a lean session can load them is still open
([ADR 9](adr/0009-skills-per-role-with-base-skills.md)); until then a Role with Skills runs with
`everything: true`.

## The Manager's Role

The only Role every Office has. Opus, used to plan and review only.

| Holds | For |
|---|---|
| Base Skills | Like every Peep |
| Matt Pocock skills | `grilling` runs the Kickoff, questions back one at a time until the Goal is clear; `domain-modeling` and `research` help with the Brief. More can be added on the Team page, or given to one Role (`tdd` for a builder) |
| `brief` ([skills/brief](../skills/brief/SKILL.md)) | The starting docs: `docs/brief.md`, `CONTEXT.md`, `docs/decisions/`, `TODO.md` |
| `find-skills` | Searching [skills.sh](https://skills.sh) for each Role's Skills |
| `review` ([skills/review](../skills/review/SKILL.md)) | Pass or Changes on any finished Task; code goes through `ponytail-review` |

## Example teams

What a Manager might propose. These are examples of the format, not Templates that ship: v1 ships
none ([ADR 8](adr/0008-every-office-starts-with-the-manager.md)).

### Video channel

| Role | Model | Escalates to | Skills and MCP it might get | Room |
|---|---|---|---|---|
| Researcher | Haiku | Sonnet | Web search | Library |
| Scriptwriter | Sonnet | Opus | A writing skill | Desks |
| Video editor | Sonnet | – | [Remotion](https://github.com/remotion-dev) skills | Desks |
| Uploader | Haiku | Sonnet | A YouTube or social MCP server of the CEO's choice | Desks |

### Website

| Role | Model | Escalates to | Skills and MCP it might get | Room |
|---|---|---|---|---|
| Designer | Sonnet | Opus | Impeccable, UI UX Pro Max | Desks |
| Frontend | Sonnet | Opus | Frontend Design | Desks |
| Backend | Sonnet | Opus | – | Desks |
| Scout (reads the codebase) | Haiku | Sonnet | – | Library |

## Borrowing Roles

[The Agency](https://agentsroom.dev/blog/agentsroom-x-the-agency) is an MIT-licensed library of
specialist agent prompts. A Role may start from one of them if the Role file credits it in a
`source:` field and the licence notice goes in `templates/CREDITS.md`.
