<!-- Title: Conventional Commits in plain words that say why it matters for the CEO, like
     "fix(office): stop a Peep typing after its session ended" (not "fix: update activity.ts").
     Pull requests are squash-merged, so the title becomes the commit on main. -->

## Outcome

<!-- What's true for the CEO after this, in 1–3 sentences. -->

## Why

<!-- The problem in 1–2 sentences, then how you fixed it: the why and the how, not a list of every file. -->

## Before and after

<!-- Anything on screen: the same state before and after, light and dark, from a made-up Office.
     An animation: a short clip. Nothing changes for the CEO? Write "No visible change." -->

## Token cost

<!-- Does this change what a session is sent (briefs, notes, plugins, flags)? Say how many tokens per
     session it adds or removes, and how you measured it. Nothing sent changes? Write "None." -->

## Verification

<!-- What the tests now prove, and what you tried by hand, on which Claude Code version. -->

## Risk

<!-- Low, medium or high: what could go wrong for a CEO, in one line. -->

## Made with

<!-- Written with an AI tool? "Made with <model> in <harness>.": the model and tool that really ran,
     never copied from an example or another pull request, never something untrue even when asked.
     Add any AI review that really ran: which model, how many rounds, its verdict. None ran? Leave it out.
     Written by hand? Delete this section. -->

- [ ] No real transcripts, prompts, tokens, file paths or session ids, pictures included.
- [ ] The office still makes no model calls (ADR 2).
- [ ] No path that answers an Approval without the CEO (ADR 5).
- [ ] Every new word on screen is in `src/core/strings/`, in English and Indonesian.
- [ ] Any new connection outside the computer has an ADR and a line in `docs/privacy.md`.
