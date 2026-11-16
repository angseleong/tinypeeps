# Privacy

What TinyPeeps will keep, where, and everything it will talk to. Back to the [README](../README.md).

**The app doesn't exist yet, so these are promises for it to keep.** Any change to them needs an ADR
first.

## No account

There is no TinyPeeps account and no TinyPeeps server. The app uses the Claude Code already installed
and signed in on your computer.

## What the app keeps

Everything stays on your computer:

- **In each Office folder, under `.tinypeeps/`:** the Company Note, Role files, Handoff Notes, the Task
  board and Usage numbers.
- **In the app's data folder:** the list of your Offices, your Avatar, settings (language, theme,
  Concurrency Limit).
- **Claude Code's own files** (transcripts in `~/.claude/projects/`) are read, never changed or copied
  elsewhere.

## Who the app talks to

TinyPeeps itself connects to nothing but GitHub, for updates. Your Peeps are Claude Code sessions, so
they connect where Claude Code and your chosen tools connect:

| Who | When | What they see |
|---|---|---|
| Anthropic, through Claude Code | Every Task | What Claude Code always sends: prompts, files the Peep reads, tool results |
| MCP servers and plugins you enabled for a Role | When that Role uses them | What that tool needs, under its own terms |
| Websites a Peep searches or fetches | When its Role allows web tools and you approved it | Your IP address and the request |
| GitHub | Checking for app updates, once that exists | Your IP address and a request for the latest version |

No analytics and no tracking. Crash reports, if ever added, will be off unless you turn them on.

## Approvals protect you

Anything Claude Code would ask permission for waits for you ([ADR 5](adr/0005-approvals-follow-claude-code-permissions.md)).
TinyPeeps never runs a session that skips permissions.

## Removing your data

Delete an Office's `.tinypeeps/` folder to remove what TinyPeeps kept for it. A **Remove everything**
setting will be in the first version, and the data folder's location will be listed here once decided.
