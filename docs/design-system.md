# Design system

The look and behaviour every TinyPeeps screen should follow. **This is a first draft and no screen
exists yet.** It will be rewritten around real tokens and components once the app does, and the code
then becomes the source of truth. The 3D office has its own page: [office.md](office.md).

**User-centred design.** Every decision starts from the CEO: one person running a company, glancing at
the window between other work, who wants to know in one look who is working, who is stuck and what
needs them. A change is judged by what they see in the real window. Every screen is checked against
Nielsen's [ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).

TinyPeeps should also look great in a 30-second demo: type a Goal, watch Peeps walk in, pick one up.

## Principles

1. **One look tells the state.** Who is working, who is waiting for the CEO, what it cost today.
2. **The office is the home.** Every page is one click from the Office; the Command Bar is everywhere.
3. **Never pretend.** Numbers say how they were counted. A Peep looks busy only when it is.
4. **Calm, then delightful.** Panels are quiet and clear; the delight lives in the office and in small
   motion, not in loud colours.
5. **Cost is visible before it's spent.** Anything that starts work says which Peep and which model.

## Layout

A clean, light, card-based shell, in the spirit of modern project dashboards:

- **Icon sidebar** on the left: Office (home), Tasks, Dashboard, Team, Settings. The current Office's
  name and a switcher on top.
- **Office page:** the 3D scene fills the window. HUD top-right (tokens today, Saving this week,
  Approvals waiting). Command Bar bottom-centre. Peep side panel slides in from the right.
- **Tasks page:** kanban (Backlog, Working, Review, Done). Cards show the Peep's Avatar, model and
  tokens; a card can be dragged onto a Peep's Avatar to assign it.
- **Dashboard page:** a headline card with the big Saving number and the Weekly Limit gauge, then
  cards by model, by Peep, by day and Escalations ([token-savings.md](token-savings.md#what-the-dashboard-shows)).
- **Team page:** a card per Role: Avatar, brief size, model, plugins with their token cost.

## Screens in the first version

| Screen | Answers |
|---|---|
| First run | Is Claude Code installed and signed in? Describe a company or pick a Template |
| Team proposal | Who will work here, on which model, with which plugins, and why? |
| Office | Who's doing what right now, and who needs me? |
| Peep panel | What is this Peep doing, what did it make, what did it cost? |
| Drop Box | What do I want this Peep to do here? |
| Approval | What is this Peep asking, and what happens if I allow it? |
| Tasks | What's queued, running, in review and done? |
| Dashboard | What did this week cost, and how much did I save? |
| Team | What is each Role, and what does it cost to run? |
| Settings | Language, theme, Concurrency Limit, Boss autonomy, Claude Code path |

## Colour

Light is the main theme, to match the warm office. Dark has to work too. Draft tokens:

| Token | Light | Dark | Used for |
|---|---|---|---|
| `bg` | `#f7f4ef` | `#151412` | Window |
| `panel` | `#ffffff` | `#1f1d1a` | Cards and panels |
| `line` | `#e7e1d8` | `#34302b` | Borders |
| `text` | `#24211d` | `#f1ece4` | Main text |
| `muted` | `#7a736a` | `#a59d92` | Secondary text |
| `accent` | `#c96f4a` | `#e08a63` | Primary action, Boss |
| `good` | `#5f8f6b` | `#7fb38b` | Saving, Done |
| `wait` | `#d9a441` | `#e6b95c` | Waiting for Approval |
| `stuck` | `#c4524a` | `#e06b62` | Stuck, Escalation |

Model colours, used the same everywhere (badges, charts): Opus `accent`, Sonnet `#5b7fa6`, Haiku
`good`. Colour never carries meaning alone: every state also has a word and an icon.

## Type and shape

- One sans family (Inter or Plus Jakarta Sans), numbers in tabular figures.
- Radius 12 px on cards, 8 px on buttons and inputs. Soft shadows, thin borders.
- Big numbers on cards (like "15 work items") are the first thing read; their label sits above, small.

## Motion

- **Motion** (the library) for panels, cards and buttons: 150 to 250 ms, ease-out, nothing bounces in
  the UI. The bounce belongs to Peeps.
- Respect "reduce motion": the office keeps working but Peeps walk instead of hop, and the Drop wobble
  is off.
- When choosing a micro-interaction, collections like motion-prompt and DesignBookmark help; check a
  skill's contents before installing it.

## Words

Every word on screen lives in `src/core/strings/`, in English and Indonesian. Use the terms in
[CONTEXT.md](../CONTEXT.md): Peep, not agent; Office, not workspace; Approval, not permission. Write
short and plain, like a friendly office manager. No exclamation marks in errors; say what happened and
what to do.
