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

Material and motion follow DesignBookmark's [Motion Studies](https://designbookmark.com/motion), the
part of the site whose components are built to be copied, adapted to our warm accent:

- **Surfaces, not effects.** Stage → card → surface → fills at 5 / 9 / 14 %. No strokes, no shadows,
  no blur over the 3D office, no gradients. Inter, sizes 11 to 17 (titles 26), weights 400 / 500 / 600.
- **Inverse pill** (white on dark, near-black on light) for the main action; green only for success
  (Saving, a finished Task); warm accent only for the brand mark and a working Peep.
- **Rubber dock** (left, floating): Office, Activity, Tasks, Dashboard, Team, Settings, with a name on
  hover.
- **Morph island** (top centre): the Office name and who's working; for a moment it becomes what just
  happened ("Raka · Read notes.md", "Raka · Finished · 13k tokens", a notice). Clicking it opens that
  Peep.
- **Office page:** the 3D scene fills the window. Stats and the Simulation switch top-right, the
  roster bottom-left, the prompt box bottom-centre, the Drop popover above it, the inspector on the right.
- **Other pages:** a title under the island and cards that rise in one after another. Settings is
  one column of grouped rows: what it is on the left, the control on the right.

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
| `accent` | `#b5552f` | `#ec8a5e` | Primary action, Boss (text on it: white in light, near-black in dark, 4.5:1) |
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

Named springs ("stiffness damping", mass 1), copied from Motion Studies' `tokens.css` into
`springs` in `src/renderer/src/ui.tsx`:

| Spring | Values | Used for |
|---|---|---|
| `follow` | 900 50 | Something held by the pointer |
| `settle` | 280 22 | Landing on a value: toggles, meters (one small overshoot) |
| `soft` | 260 24 | Panels: the inspector, the Drop popover, the HUD |
| `lead` / `trail` | 620 36 / 190 19 | The Rubber dock's two edges: the lazy one makes the stretch |
| `pop` | 520 16 | Icon and button pops on select or press |
| `fade` | 420 32 | Opacity and small slides; cards rising on a page |

- **Rubber dock:** the pill's top and bottom are separate springs; the edge facing the move leads, the
  other trails, so the pill stretches between pages and settles. The new icon pops.
- **Morph island:** width (380 24) and height (300 22) are separate springs, so a change lands
  sideways first and then drops; the content cross-fades through a 6 px blur.
- Panels open out of a slight blur on `soft`; chips and feed rows arrive 45 ms apart.
- Day bars grow from the baseline one after another with a small overshoot.
- Peeps: squash and stretch with anticipation when picked up and dropped (motion-prompt #011, #121).
- Only transform, opacity and small filters animate. "Reduce motion" turns springs into plain fades.

**Performance.** The office draws on demand: only while something moves, at most about 60 frames a
second, nothing when still or when another page is open. The 3D scene stays mounted between pages, the
canvas is capped at 1.5× pixel density, shadows use a 1024 map. `npm run dev` logs `[fps]` while it draws.

## Words

Every word on screen lives in `src/core/strings/`, in English and Indonesian. Use the terms in
[CONTEXT.md](../CONTEXT.md): Peep, not agent; Office, not workspace; Approval, not permission. Write
short and plain, like a friendly office manager. No exclamation marks in errors; say what happened and
what to do.
