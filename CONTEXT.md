# TinyPeeps

A desktop app that runs a one-person company as a small 3D office of AI Peeps, each one a Claude Code
session, with the human as the CEO who approves what matters. This glossary defines the domain
language shared by all project decisions and code.

## Language

### Product and people

**TinyPeeps**:
This project's product mark. One word, capital T and P. The repository and package slug is `tinypeeps`.
_Avoid_: "Tinypeeps", "Tiny Peeps"

**CEO**:
The person using the app. They own the company, give it goals and approve what matters. They appear in
the office as an Avatar with their own room.
_Avoid_: user, owner, admin

**Avatar**:
How a person or Peep looks in the office: a base character, colours and accessories.
_Avoid_: skin, model (model means a Claude model here)

**Peep**:
One AI worker in the office. A Peep is one Claude Code session with one Role, its own model and its
own Skills. It can be started, stopped, picked up and dropped.
_Avoid_: agent (in on-screen words), bot, worker, character

**Manager**:
The Peep every Office starts with. It interviews the CEO in the Kickoff, writes the Brief, proposes
the Hiring Plan, turns Goals into Tasks and reviews work in its own office. It runs on the strongest
model, but only when planning or reviewing. Indonesian: Manajer.
_Avoid_: Boss (the old name), lead, orchestrator (in on-screen words)

**Role**:
What a Peep is for: a name, a short brief ("you are the scriptwriter…"), a default model, the tools
and Skills it may use, and its Room. Stored as a Role file.
_Avoid_: persona, job

**Skill**:
A `SKILL.md` that teaches a Peep how to do one kind of work, such as Remotion for a video editor.
Every Peep holds the Base Skills; the Manager picks the rest per Role.
_Avoid_: plugin (a plugin is how Claude Code packages Skills and other things), ability

**Base Skills**:
The Skills every Peep holds, the Manager included: caveman and ponytail, added as short rules to
every system prompt. Set in Settings. Matt Pocock skills are the Manager's, given to other Roles one
by one.

### The office

**Office**:
One company: one project folder on the CEO's computer, its Peeps, Tasks, Notes and Rooms. A CEO can
have several Offices and switch between them.
_Avoid_: workspace, project (in on-screen words)

**Room**:
An area of the Office with a meaning, such as the Manager's Office, Meeting Room or Library. Dropping a
Peep in a Room offers the actions that Room is for.
_Avoid_: zone, area

**Activity**:
What a Peep is shown doing right now, such as Typing, Reading, Researching, Running, Waiting for
Approval or Idle. Worked out by code from hook events, never by asking a model.
_Avoid_: status (status is a Task's), animation (the animation only draws an Activity)

**Drop**:
Picking a Peep up and letting go of it in a Room or next to another Peep. A Drop never starts work by
itself; it opens the Drop Box.
_Avoid_: drag (dragging is the motion, the Drop is the decision)

**Drop Box**:
The text box and Quick Actions that appear after a Drop.

**Quick Action**:
A one-tap instruction in the Drop Box, such as "Review their work", "Give direction", "Ask for
progress" or "Stop and do this first".

**Command Bar**:
The chat box at the bottom of the Office. It always talks to the Manager. `⌘K` opens it from any page.
_Avoid_: prompt box, chat page

### Work

**Goal**:
What the CEO wants the company to achieve, in their words: "start a history YouTube channel".

**Kickoff**:
The interview at the start of an Office: the CEO says what they want and the Manager asks questions
back, one at a time, until the Goal is clear.
_Avoid_: onboarding, intake

**Brief**:
The starting docs the Manager writes after the Kickoff: `docs/brief.md`, `CONTEXT.md`, decisions and
`TODO.md`. Every Peep reads it before working.
_Avoid_: spec, PRD (in on-screen words)

**Hiring Plan**:
The team the Manager proposes after the Brief: one card per Role with its job, model, tools, Skills
and a reason. The CEO edits it, then approves; nothing runs before that.
_Avoid_: team proposal, staffing

**Meeting**:
Peeps called to the Meeting Room, by the Kickoff, a hand-over, or the CEO's "Meeting now" button.

**Task**:
One piece of work given to one Peep, with a status: Backlog, Working, Review or Done.
_Avoid_: ticket, job, issue

**Handoff Note**:
A short note, at most about 150 words, that a Peep writes at the end of a Task: what it did, where the
result is, what's left. The next session reads it instead of the whole conversation.
_Avoid_: summary, memory (memory suggests the app remembers everything)

**Company Note**:
`company.md`: what every Peep in the Office should know (the Goal, the style, the rules). Kept short;
when it grows past its limit it is compacted once.

**Approval**:
A decision the CEO must make before a Peep goes on: anything Claude Code would ask permission for. It
appears as a Peep walking to the CEO's desk with a sheet of paper.
_Avoid_: permission (Claude Code's word for the mechanism), confirmation

**Template**:
A saved company: an Office's Roles, their models and Skills, its Company Note and layout, as files
anyone can share. Starting from one skips the Kickoff and Hiring Plan. v1 ships none.
_Avoid_: preset, blueprint

### Cost

**Usage**:
The tokens a session used, read from its transcript, split into input, output and cache.

**Weekly Limit**:
The share of the CEO's Claude plan used in the current seven days, as Claude Code reports it.
_Avoid_: quota (in on-screen words)

**Baseline**:
What the same work would have used if every Task ran on Opus. Savings are measured against it.

**Saving**:
Baseline minus what was really used, per Task, per Peep and per week.
_Avoid_: discount

**Escalation**:
Re-running a Task on the next stronger model after it failed on a cheaper one. Counted, so the CEO
sees when a cheap default isn't paying off.

**Concurrency Limit**:
How many Peeps may work at once. 3 by default; the others wait on the sofa.

### Project

**Spike**:
Throwaway code under `spikes/` that answers one question. The app never imports it.
_Avoid_: prototype, when the result is meant to ship

**Engine**:
The Node side of the app that runs sessions and reads what they do.
_Avoid_: backend, server (nothing is hosted)
