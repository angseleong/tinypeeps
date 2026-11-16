# Security

TinyPeeps will start Claude Code sessions that can read and write files, run commands and use tools
on the CEO's computer, and it moves their permission questions into its window. A security problem
could let a session do something the CEO never approved. Thank you for looking.

## Reporting a problem

Please report it **privately**, not in a public issue: open this repository's **Security** tab and
choose **Report a vulnerability**. Only the maintainers see the report, and you can talk it through
with them there.

- Describe what someone could do and how to make it happen.
- Don't include transcripts, tokens or other personal data, yours or anyone else's.
- TinyPeeps is a volunteer project: expect a first answer within a week. Once it's fixed and released,
  you're credited in the advisory if you want to be.

## What's in scope

The app and this repository, as they're built:

- **Approvals:** any way a permission Claude Code would ask for gets allowed without the CEO, or the
  Approval shows something other than what will happen.
- **The hook receiver:** the local socket being reachable from other programs or the network, or a
  crafted event making the Engine run something.
- **Templates and Role files:** an imported Template running commands, reaching outside its Office
  folder, or turning on tools without showing them.
- **The bridge between the window and the Engine:** the window being able to do more than it was given.
- **Updates and installers:** anything that could install something other than a real release.

## What's out of scope

What Claude Code, Anthropic or a third-party MCP server or plugin does by itself. Please report those
to their own maintainers.
