# Test data

The tests run the real Engine against a pretend Claude Code (`test/pretend/claude.mjs`) that replays
recorded sessions. This repository is public, so a recording goes in only after it is scrubbed and
read through. Back to [CONTRIBUTING.md](../CONTRIBUTING.md#how-the-tests-work).

## What's recorded

`test/pretend/sessions/`, one `stream-json` session each, from Claude Code 2.1.292 and Haiku in a
made-up Office (a 30-second video for a tiny bakery):

| File | The prompt it answers | What's in it |
|---|---|---|
| `plan.jsonl` | `planPrompt` ("Plan this Goal") | The Manager reads, then returns one ```` ```tasks ```` block |
| `task.jsonl` | `taskPrompt` ("Your Task:") | A `Write` that asks permission (`can_use_tool`), then a Handoff Note |
| `review.jsonl` | `reviewPrompt` ("Review this finished Task") | A `Read`, then `Verdict: Pass` |

The pretend Claude Code picks the session by how the prompt starts, puts the test's Office folder
back where `/office` stands, waits for the app's answer to each permission question as the real one
does, and logs every call to `$TINYPEEPS_PRETEND_LOG`. A prompt it has no session for makes it exit
with an error, so a model call the app shouldn't make fails the test.

## The rules

- **Only made-up Offices.** Never record in a folder with real work, real names or real files.
- **Scrub every recording** with `test/pretend/scrub.mjs`: the Office folder becomes `/office`, the
  home folder `/home`, session ids `session-1`; the `init` message keeps only `session_id`, `model` and
  `claude_code_version` (it otherwise lists the recorder's tools, plugins and folders); rate limits get
  fixed numbers; thinking text and signatures are blanked.
- **Read it before committing.** `grep` the file for your user name, `/Users/`, `/home/` other than
  `/home` itself, e-mail addresses and tokens. Anything left over means the scrubber needs a new rule.
- **No transcripts** from `~/.claude/projects`, ever: they hold everything a session saw.

## Recording a new session

1. Make an empty folder for the made-up Office.
2. Run `claude -p` there with the same flags the Engine uses (`src/engine/engine.ts`, `start`), Haiku,
   `--output-format stream-json --verbose`, and save stdout. Answer permission questions as the test
   will (allow), since the app never answers them itself.
3. `node test/pretend/scrub.mjs <recorded.jsonl> <office folder> > test/pretend/sessions/<name>.jsonl`
4. Read it (the rules above), then add the prompt's start to `KINDS` in `test/pretend/claude.mjs`.
