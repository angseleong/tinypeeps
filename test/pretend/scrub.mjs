#!/usr/bin/env node
// Turns a recorded `stream-json` session into a fixture that is safe to commit (docs/test-data.md):
// the Office folder becomes /office, the home folder /home, ids become fixed, the init message keeps
// only what the app reads, thinking text and rate limits are blanked.
// Usage: node test/pretend/scrub.mjs <recorded.jsonl> <office folder it ran in> > test/pretend/sessions/<name>.jsonl
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const [, , file, office] = process.argv;
const swap = (s) => s.split(office).join("/office").split(homedir()).join("/home");
const out = [];
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const m = JSON.parse(swap(line));
  if (m.session_id) m.session_id = "session-1";
  if (m.type === "system" && m.subtype === "init") {
    out.push({ type: "system", subtype: "init", session_id: m.session_id, model: m.model, claude_code_version: m.claude_code_version });
    continue;
  }
  if (m.type === "rate_limit_event") {
    out.push({
      type: "rate_limit_event",
      rate_limit_info: { unifiedWindows: { five_hour: { utilization: 0.1, resetsAt: 0 }, seven_day: { utilization: 0.2, resetsAt: 0 } } },
    });
    continue;
  }
  for (const b of m.message?.content ?? []) if (b?.type === "thinking") Object.assign(b, { thinking: "", signature: "" });
  out.push(m);
}
process.stdout.write(`${out.map((o) => JSON.stringify(o)).join("\n")}\n`);
