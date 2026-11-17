# Scenarios

Every state and event the app must handle, and whether anything covers it yet. **Planned** means
nothing covers it yet. A row points to a test file once the app exists.

## First run

| State or event | Expected | Covered by |
|---|---|---|
| Claude Code not installed | Says so, links the install guide, nothing else starts | Planned |
| Claude Code installed, not signed in | Says so, explains `claude` sign-in, checks again | Planned |
| Claude Code version not tested with this release | Warns once, keeps working | Planned |
| New Office | Only the Manager and the CEO are in it | Planned |
| CEO says what they want | Kickoff: the Manager asks questions back, one at a time, in the Meeting Room | Planned |
| Kickoff done | Manager writes the Brief; existing files are extended, never replaced | Planned |
| Brief written | Hiring Plan cards: Roles with model, tools, Skills and a reason each | Planned |
| CEO edits a card | Role, model or Skills change before anything runs | Planned |
| A proposed Skill isn't installed | Installing it is an Approval showing where it comes from | Planned |
| CEO rejects the Hiring Plan | Manager asks what to change; nothing has run | Planned |
| CEO starts from a saved Template | Team arrives without a Kickoff | Planned |
| Team approved | Peeps walk in one by one and sit down | Planned |

## Working

| State or event | Expected | Covered by |
|---|---|---|
| Goal typed in the Command Bar | Manager makes Tasks, shown on the board | Planned |
| Manager autonomy off | Tasks wait in Backlog for the CEO to assign | Planned |
| More Peeps working than the Concurrency Limit | Extra ones wait on the sofa, start in order | Planned |
| Peep reads, writes, searches, runs | Activity changes within 200 ms of the hook event | Planned |
| Unknown tool or MCP tool | Shown as Running | Planned |
| Subagent starts and stops | Helper appears and leaves | Planned |
| Tool fails twice in a row | Peep shows Stuck | Planned |
| Task fails on the Role's default model | Retried once on `escalate_to`, counted as an Escalation | Planned |
| Session crashes | Peep shows Stuck, Task back to Backlog, Usage kept from the transcript | Planned |
| App quits with Peeps working | Asks first; on quit, sessions stop and Tasks go back to Backlog | Planned |
| Task finished | Peep takes it to the Manager's Office; review gives Pass or Changes | Planned |
| Review says Changes | Task goes back once on `escalate_to` with the list; a second Changes goes to the CEO | Planned |
| Manager proposes hiring mid-project | Shown as an Approval with the Role card | Planned |
| CEO presses Meeting now | Chosen Peeps finish their current step and walk to the Meeting Room | Planned |
| CEO presses Pause all | Each Peep finishes its Task, then goes to the Lounge | Planned |
| CEO presses Stop all | Asks once; every session stops, Tasks back to Backlog, Usage kept | Planned |

## Drop

| State or event | Expected | Covered by |
|---|---|---|
| Peep picked up | Dangles and panics; its Task keeps running | Planned |
| Dropped in a Room | Confused look, Drop Box with that Room's Quick Actions | Planned |
| Dropped next to a Peep | Drop Box with actions about that Peep | Planned |
| Drop Box dismissed | Peep returns to its desk, nothing sent | Planned |
| "Stop and do this first" | Current Task paused back to Backlog, new one starts | Planned |
| Reduce motion on | No wobble, Peep slides | Planned |

## Approvals

| State or event | Expected | Covered by |
|---|---|---|
| A tool needs permission | Peep walks to the CEO's desk, Approval opens in plain words | Planned |
| CEO allows | Session continues | Planned |
| CEO denies | Session is told, Peep goes on or stops as Claude Code decides | Planned |
| Several Approvals at once | Stacked on the desk, oldest first; HUD shows the count | Planned |
| Window hidden | System notification with the count | Planned |
| An allow rule already covers it | No Approval, as in a terminal | Planned |

## Cost

| State or event | Expected | Covered by |
|---|---|---|
| Any office animation | 0 model calls | Planned |
| Task ends | Usage per model added to Peep, Task and day | Planned |
| `rate_limits` present | Weekly Limit gauge with reset time | Planned |
| `rate_limits` missing | "Weekly Limit not available" | Planned |
| Prices file older than 90 days | A test fails | Planned |

## Memory

| State or event | Expected | Covered by |
|---|---|---|
| Task ends | Handoff Note saved under `.tinypeeps/notes/` | Planned |
| New Task | Session starts with Company Note, Role brief, related notes only | Planned |
| `company.md` over its limit | Compacted once by Haiku, CEO sees the diff | Planned |
