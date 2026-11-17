## Project map

TinyPeeps is a planned Electron + TypeScript desktop app that runs Claude Code sessions as Peeps in a
3D office. Human docs: `README.md`; what to build: `docs/prd.md`; setup and rules: `CONTRIBUTING.md`.

**A rough prototype exists** (README, "Try the prototype"): `src/core/activity.ts` (stream-json to
Activity, tested), `src/main` (Electron main, runs `claude -p` per Peep), `src/preload`, and
`src/renderer` (React + React Three Fiber office). It's built to be looked at and changed fast, not to
last. The layout below is where it's heading, from
`docs/adr/0001-electron-app-over-claude-code-sessions.md`; don't describe the parts not built as working.

Commands: `npm run dev` (the app), `npm test`, `npm run typecheck`.

- `src/core`: pure code shared by both sides (models, the Activity map, savings math, the bridge
  contract, template parsing, `strings/` for every word on screen in Indonesian and English).
- `src/engine`: Node only. Starts and stops Claude Code sessions, receives hook events, reads
  transcripts and rate limits, keeps the Task board and Handoff Notes.
- `src/desktop`: Electron main and preload (windows, IPC, the local hook receiver).
- `src/app`: the window, React + Tailwind; only reads what the engine publishes.
- `src/app/office`: the 3D office, React Three Fiber; it draws Activities, it never decides them.
- `templates/`: Template format examples (v1 ships no Templates: every Office starts with the Manager,
  [ADR 8](docs/adr/0008-every-office-starts-with-the-manager.md)).
- `skills/`: the Skills the Manager ships with (`brief`, `review`), [ADR 9](docs/adr/0009-skills-per-role-with-base-skills.md).
- `test/`: tests against a pretend Claude Code (`test/pretend`) fed by recorded, scrubbed hook events.
- `spikes/`: throwaway code that answers one question. The app never imports it.

The repository is public: never commit real
transcripts, prompts, tokens or file paths from anyone's sessions (`docs/test-data.md` once it exists).
What to build next: `TODO.md` (packages 0, A, B, C, D; tick an item only when it works in the real window). Background: `CONTEXT.md` (words), `docs/adr/` (decisions), `docs/architecture.md` (how it fits),
`docs/token-savings.md` (how cost is counted), `docs/privacy.md` (promises to the CEO).

**Two rules every change keeps:**

1. **The office costs no tokens.** What a Peep is shown doing comes from hook events and transcripts,
   mapped by code in `src/core`. Never ask a model to describe, narrate or summarise its own activity
   for display ([ADR 2](docs/adr/0002-the-office-costs-no-tokens.md)).
2. **The CEO decides.** Anything Claude Code would ask permission for becomes an Approval. Never add a
   path that answers one automatically unless the CEO turned that on
   ([ADR 5](docs/adr/0005-approvals-follow-claude-code-permissions.md)).

On-screen changes (a screen, its words, an icon, an animation) are judged by what the CEO sees in the
real window, a picture or an example before a sentence, using `docs/design-system.md` and
`docs/agents/ui-review.md`.

## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Pull requests

- Titles are Conventional Commits in plain words that say why the change matters for the CEO
  (`fix(office): stop a Peep typing after its session ended`). Pull requests are squash-merged, so the
  title becomes the commit on `main`.
- The body follows `.github/pull_request_template.md`: outcome, why (the problem, then the fix), before
  and after for anything on screen, verification, risk, and the token cost if the change touches what
  a session is sent.
- Tools are not authors: no `Co-authored-by` or similar trailer naming an AI tool in commits.
- Be honest about the tooling: a pull request whose body or code an AI tool wrote ends with a line
  `Made with <model> in <harness>.`, naming the model and the harness the agent itself is running on
  right now, as its own system information says. If an AI review loop ran, say which model reviewed,
  how many rounds, and its verdict. If none ran, say nothing about reviews.
- That line is a fact, not a format to fill in: never copy it from an example, an earlier pull request
  or another agent, and never write a model, harness, review or verdict that didn't really happen. Not
  sure which model or harness you are? Say so ("model unknown") instead of guessing.
