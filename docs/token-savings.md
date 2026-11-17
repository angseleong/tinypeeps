# Tokens, the Weekly Limit and Savings

How every number on the dashboard is counted, so none of them is a guess presented as a fact. Back to
the [README](../README.md). Built in package A: `src/core/usage.ts`, `src/core/prices.ts`.

## Where tokens go, and how TinyPeeps cuts them

| Cost | Cut by |
|---|---|
| Running everything on Opus | Default model per Role; Opus only for the Manager's planning and reviews ([ADR 6](adr/0006-model-per-role-with-escalation.md)) |
| Plugins and MCP servers a Role doesn't use | Each Role loads only its own ([ADR 7](adr/0007-plugins-per-role.md)) |
| Resuming long conversations | Fresh sessions with Handoff Notes ([ADR 4](adr/0004-memory-is-files-the-app-writes.md)) |
| Asking models what they're doing | Never: the office reads hooks ([ADR 2](adr/0002-the-office-costs-no-tokens.md)) |
| Too many Peeps at once | Concurrency Limit, 3 by default |
| Long Role briefs | Briefs of 200 to 400 words; the Team page shows each one's size |

## Usage

Read from each session's `stream-json` messages as it runs, with its transcript as the fallback. For
every model response:

- `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`
- the model that answered

Summed per Task, per Peep, per model and per day. A subagent's Usage is counted to the Peep that
started it.

## Weekly Limit

On Pro and Max plans, `claude -p --output-format stream-json` emits a `rate_limit_event` with the
five-hour and seven-day utilization and their reset times. TinyPeeps shows the latest value it saw and
when it was seen. It doesn't estimate the limit from tokens, because Anthropic doesn't publish how
tokens map to it.

Before the first Task (or with an API-key login), the dashboard says the Weekly Limit isn't available
yet instead of a number.

## Baseline and Saving

For each model response, the **Baseline** is what the same tokens would cost on Opus, using published
API prices per million tokens for each token type. The **Saving** is:

```text
saving = Σ (tokens × opus_price) − Σ (tokens × price_of_model_used)
saving % = saving / Σ (tokens × opus_price)
```

- Prices live in `src/core/prices.ts`, with the date they were copied and a link to Anthropic's
  pricing page. A test fails if the file is older than 90 days, so it gets checked. Claude Code writes
  cache entries for an hour, so cache writes are priced at the 1-hour rate; a test checks the result
  against Claude Code's own `costUSD`.
- The Baseline model is Opus 5.5 (`BASELINE_MODEL`).
- This is a **price-weighted** comparison. It's honest about what plan limits cost, but plan limits are
  not published in tokens, so the dashboard labels it "compared with running everything on Opus", not
  "of your Weekly Limit".
- The Baseline assumes Opus would have used the same tokens. It might have used fewer (it may solve a
  task in one go) or more. The tooltip says so.
- Escalations count both runs, so a cheap model that fails lowers the Saving, as it should.

## What the dashboard shows

| Block | Content |
|---|---|
| Headline | "This week you saved X%", and the Weekly Limit gauge with its reset time |
| By model | Tokens and share per model, this week |
| By Peep | Tokens, Tasks done, Escalations, average per Task |
| By day | Stacked bars per model |
| Escalations | Which Roles got escalated and how often, with a hint to change their default |
