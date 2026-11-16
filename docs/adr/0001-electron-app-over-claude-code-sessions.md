# 1. An Electron app over Claude Code sessions

Status: proposed (2026-11-16). Becomes accepted once a spike runs two Peeps from the app and shows
their Activities in a 3D scene.

## Context

TinyPeeps is for people on a Claude Pro or Max plan who want to stretch their Weekly Limit. It needs a
3D office that behaves the same on macOS, Windows and Linux, and it must use the plugins, skills, MCP
servers and permission rules the CEO already set up in Claude Code. The maintainer knows TypeScript.

## Decision

- **Peeps are Claude Code sessions**, started with `claude -p --output-format stream-json`, signed in
  with the CEO's own plan. Not the Agent SDK with an API key: that would bill per token, which isn't
  what the target CEO pays for, and would skip their Claude Code setup.
- **One Peep, one session.** Each runs, stops, and is counted on its own, with its own model, tools and
  plugins ([architecture.md](../architecture.md#one-peep-one-session)).
- **Electron, React, TypeScript.** Chromium's WebGL is the same on all three systems. Tauri is lighter,
  but its Linux webview (WebKitGTK) is known for weaker WebGL, and the office is the product.
- **React Three Fiber** for the office, **Tailwind** and **Motion** for the rest of the window.
- **Layout:** `src/core` (pure), `src/engine` (Node), `src/desktop` (Electron main and preload),
  `src/app` (window), `templates/`, `test/`, `spikes/`.
- **macOS first.** Windows and Linux builds come after v1, from the same code.

## Consequences

- The installer is around 100 MB, Electron's usual size.
- TinyPeeps depends on Claude Code's CLI flags, hook events and output format. A change there can
  break the app, so the Engine checks the Claude Code version on start and says when it hasn't been
  tested with it.
- Claude Code must already be installed and signed in. The first-run screen checks both.
