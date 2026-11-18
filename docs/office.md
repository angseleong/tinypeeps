# The office

The 3D world: its Rooms, what each Activity looks like, how a Drop works, and where the art comes
from. Back to the [README](../README.md). **Built so far:** the Look and the `studio-small` layout
(C2). The rest is still a plan.

## Look

Low-poly, matte, warm. Think a calm animated explainer, not a game: soft shadows, an isometric camera
that can rotate and zoom a little, and a palette of cream, terracotta, sage and warm grey. Peeps are
small and chunky so their poses read from far away. Inspired by the style of clean product animation,
without using any brand's characters, logos or assets.

**How it's made:** `MeshToonMaterial` with a three-band gradient, one shared material per colour
(`src/app/office/look.ts`); KayKit pieces keep their texture but get the same toon shading. An
orthographic camera at the isometric angle turns ±20° and zooms 0.9x to 2.6x towards the cursor, with
no panning. Shadows come from one directional light whose shadow map is drawn once, when the furniture
has loaded (drei `BakeShadows`); Peeps cast none and get a soft blob instead. drei's
`AccumulativeShadows` was tried first and baked nothing with three 0.187. The glTF loader runs without
Draco or meshopt decoders: their WebAssembly breaks the window's strict CSP.

**Walking:** walls, doors and furniture are data (`src/app/office/layout.ts`), drawn by `Furniture.tsx`
and turned into a walkable grid by `paths.ts` (0.25 cells, walls kept 0.3 away, furniture 0.15). A
Peep finds its way with A* whenever where it should be changes, cuts the corners where the way is
clear, and goes through the door gaps (the doors stand wide open). Peeps don't avoid each other.

## Rooms in v1

The first layout has every Room below. Each Room is visited because of something real (a hook event,
a Task status, a CEO button), never because a model chose to walk there.

| Room | A Peep goes there when | Quick Actions when a Peep is dropped here |
|---|---|---|
| CEO Office | It needs an Approval (`PermissionRequest`): paper piles on the CEO's desk | "Report to me", "What do you need from me?" |
| Manager's Office | Its Task moves to Review: it queues with a folder while the Manager reviews | "Review my work", "Check against the Brief" |
| Meeting Room | Kickoff, "Meeting now", or a Task handed from one Peep to another | "Plan this together", "Hand over to [Peep]" |
| Library | Researching (`WebSearch`, `WebFetch`) or reading many files; the Skill Shelf stands here | "Research this", "Read the folder and brief me", "Find a Skill for this" |
| Desks | Typing or Thinking at its own desk | (dropping back at its desk ends the Drop) |
| Server Room | Running (`Bash`, an MCP tool) | "Run it again", "Explain what failed" |
| Front Door | It was just hired: walks in, waves, finds its desk | – |
| Archive | Its Task is Done: drops the Handoff Note's folder in a cabinet, then goes Idle | "What did we finish today?" |
| Lounge | Idle (coffee) or Queued (sofa) | "Take a break" (stop after this Task) |

Dropping a Peep **next to another Peep** offers actions about that Peep, whatever the Room: "Review
their work", "Give them direction", "Ask for progress", "Help them".

**Layout `studio-small`:** a 30 x 22 floor, walls on the two far sides so the camera looks in from the
open corner. The CEO Office, the Manager's Office and the Meeting Room are closed rooms along the back
wall, behind glass partitions with an open door onto a corridor; the lobby next to them has the Front
Door, a gap in the back wall. The Desks are an open plan of six cubicle pods (36 desks): two rows facing
each other across a sage divider, panels between neighbours. Hires take the first pod. A Room's name
shows only while it's pointed at or a Peep is being carried; the furniture tells you the rest.

| | left | middle | right |
|---|---|---|---|
| **back** (glass, doors) | CEO Office | Manager's Office | Meeting Room · lobby with the Front Door |
| **corridor** | Library (glass, Skill Shelf: the terracotta bookcase) | | |
| **open** | Lounge (sofa, coffee machine) | Desks: six pods | Server Room (glass) · Archive |

Left out on purpose: a War Room (the Meeting Room does the job) and a Studio for media files (comes
with a content Template, once one exists).

## CEO controls

Three buttons always on screen, beside the HUD ([prd.md](prd.md#2-give-work)):

| Button | What the office shows |
|---|---|
| Meeting now | Chosen Peeps finish their current step and walk to the Meeting Room; chairs fill one by one |
| Pause all | Each Peep finishes its Task, stretches and walks to the Lounge |
| Stop all | Asks once; then every Peep stops where it is, its screen goes dark, and it walks to the Lounge |

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

## Details that make it feel alive

All from data the app already has, so they cost no tokens. Ideas seen in
[My Virtual Office](https://github.com/eliautobot/my-virtual-office) (AGPL-3.0: ideas only, no code).

**In v1:**

| Detail | From |
|---|---|
| The desk monitor shows the real tool: the command, the file, the site | `PreToolUse` input |
| A folder flies from one desk to another when work is handed over | Task reassigned, or a Handoff Note read by another Peep |
| A face for how it's going: focused, stuck, relieved | Activity and the Task's last result |
| A small celebration and the Peep's own victory move when a Task passes review | Review verdict Pass |
| The Skill Shelf in the Library shows every Skill and who holds it | Role files |

**Later:** a morning stand-up and a "Daily Office" page filled from the Task board (never written by a
model), day and night, an office pet, previews of a Peep's files above its desk.

## Art

All free and licensed CC0 unless noted. Check each pack's own page before adding it, and list it in
`assets/CREDITS.md`.

| Pack | For | Source |
|---|---|---|
| KayKit Character Pack: Adventurers | Base characters, rigged, 25+ accessories | [itch.io](https://kaylousberg.itch.io/kaykit-adventurers) |
| KayKit Character Animations (1.1) | Walk, sit, wave, cheer, work and more, for KayKit characters | [itch.io](https://kaylousberg.itch.io/kaykit-character-animations) |
| KayKit Furniture Bits | Desks, chairs, shelves, sofas | [itch.io](https://kaylousberg.itch.io/furniture-bits) |
| Quaternius Universal Base Characters | Plainer alternative characters, glTF | [quaternius.com](https://quaternius.com/packs/universalbasecharacters.html) |

Shading is ours: a matte toon material and the warm palette, so mixed packs look like one world.

## Performance

- 6 Peeps at 60 fps on an M1 MacBook Air. One shared material per palette colour, instanced
  furniture, baked soft shadows, and animations that pause when the window is hidden.
- The office drops to 30 fps when nothing moves, and to 0 when the window isn't visible.

### Spike `office-fps`: rigged glTF characters are fine

**Answer: yes.** 6 rigged, animated KayKit characters plus a furnished room (24 models, 63 pieces)
run far above 60 fps in React Three Fiber inside Electron. Skinned meshes from glTF and drei's
`useAnimations` need nothing special. C2 to C5 can use them. Code: `spikes/office-fps/` (throwaway; run
`spikes/office-fps/run.sh` with its Vite server).

**Where:** MacBook Air (MacBookAir10,1), Apple M1 with 7 GPU cores, 8 GB, macOS 26, plugged in, not in
Low Power Mode. That is the target machine, with one difference: it sat on an external 1080p 144 Hz
monitor, not the Air's own 60 Hz Retina screen. So the window was 1440x900 with the pixel ratio forced
to 1.5 (what the office's `dpr` cap gives on the Air, 2160x1302 pixels), and "uncapped" runs (no vsync)
show the real cost per frame. Electron 45, three 0.187, R3F 9, drei 10; same `Canvas` settings as
`Office.tsx` (shadows on, 1024 shadow map, `dpr` 1.5, high-performance GPU). Each row is 10 s after a
2.5 s warm-up, drawing every frame; the scene always ran Walking, Sitting, Working, Waving, Idle and
Cheering in turn.

| Run | fps (mean) | 99th percentile frame | Draw calls | Triangles |
|---|---|---|---|---|
| With vsync (this monitor's 144 Hz): 6 Peeps, furniture, shadows, name labels | **144** (the monitor's limit) | 7.6 ms | 210 | 121k |
| Uncapped: the same | 238 | 7.2 ms | 211 | 121k |
| Uncapped: toon material instead of standard | 275 | 5.9 ms | 211 | 121k |
| Uncapped: no shadows | 376 | 4.9 ms | 102 | 59k |
| Uncapped: furniture only | 307 | 4.3 ms | 117 | 35k |
| Uncapped: 6 Peeps only | 292 | 4.9 ms | 95 | 86k |
| Uncapped: 12 Peeps | 239 | 6.5 ms | 305 | 208k |
| Uncapped: pixel ratio 2 | 164 | 8.0 ms | 211 | 121k |
| Uncapped: no name labels | 278 | 5.0 ms | 211 | 121k |

No frame in any run took longer than 16.7 ms (the worst was 15.7 ms), so a 60 Hz screen would hold 60 fps
with room to spare, about 4x. Not measured: the Air's own screen, battery power, a long run (heat),
and the `demand` frame loop (the office draws only while something moves).

**What the scene needs, and what to avoid:**

- **Load each character once with `useGLTF`, then copy it per Peep with `SkeletonUtils.clone`** (from
  `three/examples/jsm/utils/SkeletonUtils.js`). Furniture can use plain `scene.clone()`, which shares
  geometry and materials. Plain `clone()` on a skinned character was not tried.
- **Clips live in separate files and bind by bone name.** The Adventurers have no animations inside;
  the four `Rig_Medium_*.glb` files share their 23-bone skeleton, so `useAnimations(clips, ref)` finds
  every bone (no `PropertyBinding` warnings). Gather the clips of all four files into one array.
- **Shadows are the biggest cost** (the shadow pass doubles the draw calls). Keep one directional
  light and one 1024 map, as now. Do not add more shadow-casting lights; skip `castShadow` on small
  props like books.
- **Keep the pixel ratio at 1.5 or lower.** Ratio 2 costs about a third of the speed for a picture that
  looks the same at this size.
- **Toon material is not slower** than the standard one (measured faster, within noise). The swap used
  one `MeshToonMaterial` per source material, keeping the pack's texture.
- **Name labels (drei `Html`) cost about 0.7 ms a frame for 6.** Fine, but they are DOM, so keep them
  to the Peeps, not every prop.
- Furniture was not instanced: 71 geometries and about 210 draw calls were already cheap. Instancing
  is a later tidy-up (package C, Performance), not needed to hit 60 fps.

**What the packs do not have:** no typing clip, no open-book, thought or phone clip, no server-rack
press, no folder carrying. Candidates: Sitting (`Sit_Chair_Idle`) plus `Working_A` for typing,
`Interact`, `Use_Item` and `PickUp` for the rest; whatever has no clip is a pose tweak on the bones
(C3). The free Furniture Bits also has no desk with a monitor, server rack or coffee machine: C2 builds
those from the pieces or models them.
