---
name: brief
description: Write a project's starting docs (Brief, glossary, decisions, plan) after the CEO's Kickoff interview. Use when the Manager has finished grilling the CEO about a new Goal, or the CEO asks to write or refresh the project docs.
---

The **Brief** is the set of plain Markdown files every Peep reads before working. It works for any
kind of company: software, videos, a shop, a newsletter. Write it in the CEO's language, in short
plain sentences, each word chosen so a newcomer understands it.

Write only from what the Kickoff settled. Anything the CEO didn't answer goes under **Open
questions**, never guessed into a decision.

## Steps

1. **Read first.** List the folder. A file below that already exists gets extended, its content kept;
   say in your reply what you changed.
2. **Write the four files** in the shapes below. Done when each file exists and every section has
   content or the word "None yet".
3. **Check.** Every term written in **bold capitals** in `docs/brief.md` has an entry in
   `CONTEXT.md`; every decision the CEO made in the Kickoff has a decision file; every `TODO.md` item
   names the doc it comes from.
4. **Hand over** with a Handoff Note: the four paths, and the open questions.

## The four files

### `docs/brief.md`: what we're making and why

```markdown
# Brief: <project name>

Status: draft (<date>).

## The problem
What hurts today, for whom, in 2 to 4 sentences or a short numbered list.

## Who it's for
The people it serves, with one or two concrete examples.

## Principles
3 to 5 numbered rules every Peep follows when choosing between two ways.

## What the first version does
Numbered sections, each a few bullets of what someone can see or do.

## Not in the first version
| Waits | Why |

## How we'll know it works
| Measure | Target |   (numbers, never "good" or "fast")

## Open questions
```

### `CONTEXT.md`: the words

```markdown
# <project name>

One paragraph: what this is.

## Language

**Term**:
One or two sentences defining it.
_Avoid_: the words people might use instead
```

Group terms under `###` headings when there are more than about eight.

### `docs/decisions/NNNN-short-title.md`: one per decision

```markdown
# N. <The decision as a sentence>

Status: proposed | accepted (<date>).

## Context
What forced a choice, and what else was considered.

## Decision
The choice, in bullets.

## Consequences
What gets easier, what gets harder, what to watch.
```

### `TODO.md`: the plan

```markdown
# TODO

| Package | Days | You can try |

## A. <package name>

One line on what this package delivers, and the doc it comes from.

- [ ] **Item:** what done looks like, the doc it comes from
```

Each package ends in something the CEO can try or see. An item is ticked only when the CEO could
check it themselves.
