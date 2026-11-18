#!/usr/bin/env node
// A pretend Claude Code for tests: replays a recorded, scrubbed session from ./sessions, picked by the
// prompt it was sent, and waits for the app's answer to each permission question the way the real one
// does. Every call is logged to $TINYPEEPS_PRETEND_LOG, so a test can prove which model calls ran.
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const model = args[args.indexOf("--model") + 1];
const KINDS = [
  ["plan", "Plan this Goal"],
  ["task", "Your Task:"],
  ["review", "Review this finished Task"],
];

const input = createInterface({ input: process.stdin });
const waiting = new Map();
let gotFirst;
const firstMessage = new Promise((resolve) => (gotFirst = resolve));
input.on("line", (l) => {
  const m = JSON.parse(l);
  if (m.type === "control_response") waiting.get(m.response.request_id)?.(m.response.response);
  else if (m.type === "user") gotFirst(m.message.content);
});

// `-p <prompt>` (a one-off) or the first stream-json user message on stdin (a Task session).
const inline = args[args.indexOf("-p") + 1];
const prompt = inline && !inline.startsWith("--") ? inline : await firstMessage;
const kind = KINDS.find(([, start]) => prompt.startsWith(start))?.[0] ?? "unknown";
if (process.env.TINYPEEPS_PRETEND_LOG) appendFileSync(process.env.TINYPEEPS_PRETEND_LOG, `${JSON.stringify({ kind, model })}\n`);
if (kind === "unknown") {
  process.stderr.write("pretend claude: no recorded session for this prompt\n");
  process.exit(1);
}

const lines = readFileSync(join(here, "sessions", `${kind}.jsonl`), "utf8")
  .split("\n")
  .filter(Boolean);
for (const line of lines) {
  const out = line.split("/office").join(process.cwd());
  process.stdout.write(`${out}\n`);
  const m = JSON.parse(out);
  if (m.type === "control_request") {
    const answer = await new Promise((resolve) => waiting.set(m.request_id, resolve));
    if (answer.behavior !== "allow") process.stderr.write(`pretend claude: denied ${m.request.tool_name}\n`);
  }
  await new Promise((r) => setTimeout(r, 2));
}
process.exit(0);
