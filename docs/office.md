# The office

The 3D world: its Rooms, what each Activity looks like, how a Drop works, and where the art comes
from. Back to the [README](../README.md). **Nothing here is built yet.**

## Look

Low-poly, matte, warm. Think a calm animated explainer, not a game: soft shadows, an isometric camera
that can rotate and zoom a little, and a palette of cream, terracotta, sage and warm grey. Peeps are
small and chunky so their poses read from far away. Inspired by the style of clean product animation,
without using any brand's characters, logos or assets.

## Rooms in v1

The layout is fixed by the Template. Every Template has the first three.

| Room | For | Quick Actions when a Peep is dropped here |
|---|---|---|
| CEO Office | The CEO's desk, where Approvals pile up as paper | "Report to me", "What do you need from me?" |
| Desks | Where each Peep works | (dropping back at its desk ends the Drop) |
| Lounge | Coffee machine and sofa: Idle and Queued Peeps | "Take a break" (stop after this Task) |
| Review Room | Checking work | "Review [Peep]'s latest work", "Check against the Goal" |
| Meeting Room | Two or more Peeps sharing context | "Plan this together", "Hand over to [Peep]" |
| Library | Reading and research | "Research this", "Read the folder and brief me" |

Dropping a Peep **next to another Peep** offers actions about that Peep, whatever the Room: "Review
their work", "Give them direction", "Ask for progress", "Help them".

## Activities

Worked out by code from hook events ([architecture.md](architecture.md#seeing-what-a-peep-does-for-free)),
the same for every kind of company. A Role can rename an Activity for its job ("Editing video" instead
of "Typing") without changing what it means.

| Activity | When | Looks like |
|---|---|---|
| Typing | `PreToolUse` for `Edit`, `Write`, `NotebookEdit` | At the laptop, typing |
| Reading | `Read`, `Grep`, `Glob` | Holding an open book |
| Researching | `WebSearch`, `WebFetch` | At the library shelf, or on the phone |
| Running | `Bash`, or an MCP tool | Standing at the server rack / pressing buttons on a big machine |
| Thinking | Session working, no tool call for a few seconds | Hand on chin, small thought bubble |
| Delegating | `SubagentStart` | A tiny helper peep pops out and runs to a desk |
| Waiting for Approval | `PermissionRequest` | Walks to the CEO's desk holding paper, taps foot |
| Stuck | `PostToolUseFailure` twice in a row, or Escalation | Scratches head, red `!` |
| Idle | `Stop`, no Task waiting | Coffee at the lounge |
| Queued | Over the Concurrency Limit | Sitting on the sofa |

The map from tool names to Activities is data in `src/core`, so a new tool or MCP server gets an
Activity by adding one line. Unknown tools show as Running.

## Picking up and dropping

1. **Hover:** the Peep glows and shows its name, Role and model.
2. **Pick up:** it lifts with a squash and stretch, legs dangle on a spring, arms flail; a small "!?"
   above its head. Its Task keeps running; the HUD says so.
3. **Carry:** valid Rooms and Peeps under the cursor highlight.
4. **Drop:** it lands with a bounce and a confused look ("?").
5. **Drop Box:** a text box with the Quick Actions for that place. Escape or clicking away sends it
   back to its desk with nothing started.
6. **Send:** the Peep nods and walks to where the work happens.

The wobble is a spring on the legs and arms, not a physics ragdoll
([prd.md](prd.md#not-in-the-first-version)).

## Arriving

When the CEO approves a team, Peeps walk in through the door one at a time, wave, and sit at their
desk, with their name and model on a small badge. This is the app's signature moment; keep it under
about 6 seconds for 5 Peeps.

## Art

All free and licensed CC0 unless noted. Check each pack's own page before adding it, and list it in
`assets/CREDITS.md`.

| Pack | For | Source |
|---|---|---|
| KayKit Character Pack: Adventurers | Base characters, rigged, 25+ accessories | [itch.io](https://kaylousberg.itch.io/kaykit-adventurers) |
| KayKit Character Animations | Walk, sit, wave, idle and more, for KayKit characters | [OpenGameArt](https://opengameart.org/content/kaykit-character-animations) |
| KayKit Furniture Bits | Desks, chairs, shelves, sofas | [itch.io](https://kaylousberg.itch.io/furniture-bits) |
| Quaternius Universal Base Characters | Plainer alternative characters, glTF | [quaternius.com](https://quaternius.com/packs/universalbasecharacters.html) |

Shading is ours: a matte toon material and the warm palette, so mixed packs look like one world.

## Performance

- 6 Peeps at 60 fps on an M1 MacBook Air. One shared material per palette colour, instanced
  furniture, baked soft shadows, and animations that pause when the window is hidden.
- The office drops to 30 fps when nothing moves, and to 0 when the window isn't visible.
