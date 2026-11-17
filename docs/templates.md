# Templates and Role files

A Template is a ready-made company, kept as plain files so anyone can share one on GitHub. Back to
the [README](../README.md). **The format is a draft; nothing reads it yet.**

## A Template folder

```text
content-studio/
├── template.md        # name, description, which Roles, the Office layout
├── company.md         # the starting Company Note
└── roles/
    ├── boss.md
    ├── researcher.md
    ├── scriptwriter.md
    ├── video-editor.md
    └── uploader.md
```

Importing copies it into the Office's `.tinypeeps/` folder. Exporting does the reverse, without
`notes/`, `board.json` or anything else that came from real work.

## `template.md`

```markdown
---
name: Content Studio
description: Research, script, edit and upload videos.
layout: studio-small      # one of the layouts that ship with the app
roles: [boss, researcher, scriptwriter, video-editor, uploader]
---
Who this company is for, in a few sentences. Shown when someone picks the Template.
```

## A Role file

The same shape as a Claude Code agent file, with a few fields of our own.

```markdown
---
name: researcher
title: Researcher            # shown on the Peep's badge
model: haiku                 # default; the Boss may change it per Task
escalate_to: sonnet          # tried once if a Task fails
tools: [Read, Grep, Glob, WebSearch, WebFetch, Write]
mcp: []                      # MCP servers this Role may use, by name
plugins: []                  # Claude Code plugins this Role loads
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

`plugins:` is not read yet: Claude Code can't load chosen plugins per session ([ADR 7](adr/0007-plugins-per-role.md#what-we-found-2026-11-16-claude-code-21292)). Use `everything: true` for a Role that needs them.

## Templates that ship

### Content Studio

| Role | Model | Escalates to | Plugins and MCP to suggest | Room |
|---|---|---|---|---|
| Boss | Opus (plan and review only) | – | – | CEO Office |
| Researcher | Haiku | Sonnet | Web search | Library |
| Scriptwriter | Sonnet | Opus | – | Desks |
| Video editor | Sonnet | – | [Remotion](https://github.com/remotion-dev) skills | Desks |
| Uploader | Haiku | Sonnet | A YouTube or social MCP server of the CEO's choice | Desks |

### Dev Studio

| Role | Model | Escalates to | Plugins and MCP to suggest | Room |
|---|---|---|---|---|
| Boss | Opus (plan and review only) | – | – | CEO Office |
| Frontend | Sonnet | Opus | Design or UI skills | Desks |
| Backend | Sonnet | Opus | – | Desks |
| Reviewer | Sonnet | Opus | Code review | Review Room |
| Scout (reads the codebase) | Haiku | Sonnet | – | Library |

### Blank

The Boss only. The CEO describes the company and the Boss proposes Roles.

## Borrowing Roles

[The Agency](https://agentsroom.dev/blog/agentsroom-x-the-agency) is an MIT-licensed library of
specialist agent prompts. A Role may start from one of them if the Role file credits it in a
`source:` field and the licence notice goes in `templates/CREDITS.md`.
