# Contributing to TinyPeeps

Thanks for helping. Every change is judged by one question: does it let the CEO get more done with
fewer tokens, and enjoy it?

TinyPeeps is still being planned, so the most useful help right now is questioning the decisions in
[docs/adr/](docs/adr/) and building the spikes they ask for. Before a bigger change, open an issue
first so we can agree on what to build. For the words the project uses (Peep, Manager, Office, Drop,
Approval…) read [CONTEXT.md](CONTEXT.md); for what we're building, [docs/prd.md](docs/prd.md); for the
look, [docs/design-system.md](docs/design-system.md) and [docs/office.md](docs/office.md).

## Setting up

There is no app to run yet. Spikes will need Node.js 22 or newer and Claude Code, signed in. This
section grows when the app arrives.

## The first spikes

Each answers one question from the README's "What's been tested" table. Put each in `spikes/<name>/`
with a README that says the question, how to run it and the result.

1. **hook-listener:** run one `claude -p` session with command hooks that write to a local socket;
   print an Activity for every event.
2. **permission-host:** answer a permission prompt of a `claude -p` session from outside the terminal.
3. **rate-limits:** confirm the status line's `rate_limits` fields on a Pro or Max plan.
4. **office-fps:** six animated low-poly Peeps in React Three Fiber on an M1 MacBook Air.

## How the tests work

Tests check what the CEO sees, not how the code does it. They run the real Engine against a pretend
Claude Code (`test/pretend`) that replays recorded hook events and stream messages, scrubbed of
anything personal. They never call a real model.

## Privacy: the repository is public

Everything here, including issues, pull requests and screenshots, is public and stays in the history.

- **Never commit real transcripts, prompts, tokens, file paths or session ids.** Not in code, tests,
  issues or screenshots. Use made-up Offices and the demo Template.
- **Screenshots come from a made-up Office**, never from your own work.
- **`.scratch/` is git-ignored and stays that way.** Put recordings of your own sessions there before
  scrubbing them.
- A new connection to anything outside the computer needs an ADR and a line in
  [docs/privacy.md](docs/privacy.md) first.

## Pull requests

Follow [the template](.github/pull_request_template.md). The rules, including how to credit AI tools
honestly, are in [AGENTS.md](AGENTS.md#pull-requests).

## Reporting problems

Use the [issue forms](.github/ISSUE_TEMPLATE). Security problems go through a
[private report](SECURITY.md).
