// Runs one `claude -p` session per Peep and turns its stream into updates for the window.
import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { type PeepUpdate, readStreamLine } from "../core/activity";
import type { Role } from "../core/roles";
import type { ContextCosts, Settings } from "../core/settings";
import { usageFromTranscript } from "../core/usage";
import { appendUsage, findTranscript, listMcp, saveLimits, writeBrief } from "./store";

export type RunRequest = { office: string; peepId: string; prompt: string };
type Job = RunRequest & { role: Role };

type Deps = {
  settings: () => Settings;
  role: (office: string, peepId: string) => Role | undefined;
  send: (peepId: string, update: PeepUpdate) => void;
  onLimits: () => void;
  onUsage: () => void;
};

// Flags that keep a session to what its Role needs (ADR 7). `--tools` is the big cut: each tool
// definition is sent every turn. Without `everything`, --safe-mode also drops the CEO's plugins, skills,
// hooks, MCP servers and CLAUDE.md (measured: 33.6k → 6.5k context tokens for Read, Grep and Glob).
// shortcut: plugins can't be picked per Role, since --safe-mode loads no plugin skills even through
// --plugin-dir; a Role that needs them turns on `everything`.
export function roleArgs(role: Role, office: string | null): string[] {
  const args = ["--model", role.model, "--tools", role.tools.join(",")];
  if (role.everything) return args;
  const all = listMcp(office);
  const mcpServers = Object.fromEntries(role.mcp.filter((n) => n in all).map((n) => [n, all[n]]));
  args.push("--safe-mode", "--strict-mcp-config", "--mcp-config", JSON.stringify({ mcpServers }));
  return args;
}

const BASE_ARGS = ["--output-format", "stream-json", "--verbose"];

export function createEngine(deps: Deps) {
  const running = new Map<string, ChildProcess>();
  const queue: Job[] = [];

  function start(job: Job) {
    const { role, office } = job;
    const args = [
      "-p",
      job.prompt,
      ...BASE_ARGS,
      ...roleArgs(role, office),
      "--append-system-prompt-file",
      writeBrief(office, role),
      // shortcut: edits inside the Office folder are auto-accepted and every other permission is denied,
      // until Approvals reach the window (ADR 5, package B).
      "--permission-mode",
      "acceptEdits",
      "--permission-prompts",
      "none",
    ];
    const child = spawn(deps.settings().claudePath, args, { cwd: office, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    running.set(job.peepId, child);
    let stderr = "";
    let sessionId: string | undefined;
    let ended = false;

    createInterface({ input: child.stdout }).on("line", (line) => {
      const u = readStreamLine(line);
      if (!u) return;
      if (u.sessionId) sessionId = u.sessionId;
      if (u.rateLimit) {
        saveLimits({ rateLimit: u.rateLimit, seenAt: Date.now() });
        deps.onLimits();
      }
      if (u.done) {
        ended = true;
        if (u.models && Object.keys(u.models).length) {
          appendUsage(office, { ts: Date.now(), peepId: job.peepId, sessionId, models: u.models });
          deps.onUsage();
        }
      }
      if (u.activity || u.label || u.text || u.done) deps.send(job.peepId, u);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (err) => deps.send(job.peepId, { activity: "stuck", done: true, error: `noClaude:${err.message}` }));
    child.on("close", (code) => {
      running.delete(job.peepId);
      if (!ended) {
        // The session died before its result: keep its tokens by reading its transcript back.
        const transcript = sessionId ? findTranscript(sessionId) : null;
        if (transcript) {
          const models = usageFromTranscript(transcript);
          if (Object.keys(models).length) {
            appendUsage(office, { ts: Date.now(), peepId: job.peepId, sessionId, models, recovered: true });
            deps.onUsage();
          }
        }
        const error = code === null ? "stopped" : stderr.trim() || `exited:${code}`;
        deps.send(job.peepId, { activity: code === null ? "idle" : "stuck", done: true, error });
      }
      const next = queue.shift();
      if (next) start(next);
    });
  }

  return {
    run(req: RunRequest): "started" | "queued" | "busy" | "no-role" {
      const role = deps.role(req.office, req.peepId);
      if (!role) return "no-role";
      if (running.has(req.peepId) || queue.some((q) => q.peepId === req.peepId)) return "busy";
      const job = { ...req, role };
      if (running.size >= deps.settings().concurrency) {
        queue.push(job);
        deps.send(req.peepId, { activity: "queued", label: "queued" });
        return "queued";
      }
      start(job);
      return "started";
    },
    stop(peepId: string) {
      const i = queue.findIndex((q) => q.peepId === peepId);
      if (i >= 0) {
        queue.splice(i, 1);
        deps.send(peepId, { activity: "idle", done: true, error: "cancelled" });
      }
      running.get(peepId)?.kill("SIGINT");
    },
    stopAll() {
      for (const c of running.values()) c.kill("SIGINT");
    },
  };
}

// Context tokens Claude Code sends on its first turn, read from the first assistant message.
function measureOnce(claude: string, extra: string[]): Promise<{ tokens: number; version: string }> {
  const cwd = mkdtempSync(join(tmpdir(), "tinypeeps-measure-"));
  return new Promise((resolve, reject) => {
    const child = spawn(claude, ["-p", "Reply with just: ok", ...BASE_ARGS, "--model", "haiku", ...extra], { cwd, stdio: ["ignore", "pipe", "ignore"] });
    let tokens = -1;
    let version = "";
    createInterface({ input: child.stdout }).on("line", (l) => {
      try {
        const m = JSON.parse(l);
        if (m.type === "system" && m.subtype === "init") version = m.claude_code_version ?? "";
        if (m.type === "assistant" && tokens < 0) {
          const u = m.message?.usage ?? {};
          tokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
        }
      } catch {}
    });
    child.on("error", reject);
    child.on("close", () => (tokens >= 0 ? resolve({ tokens, version }) : reject(new Error("no usage in measurement"))));
  });
}

// One tiny Haiku session with everything loaded, then one per Role with its own flags. The context
// size barely depends on the model, so Haiku keeps measuring cheap.
export async function measureRoles(claude: string, roles: Role[], office: string, onProgress: (i: number, n: number) => void): Promise<ContextCosts> {
  const n = roles.length + 1;
  onProgress(1, n);
  const all = await measureOnce(claude, []);
  const costs: Record<string, number> = {};
  for (const [i, role] of roles.entries()) {
    onProgress(i + 2, n);
    try {
      costs[role.id] = (await measureOnce(claude, roleArgs({ ...role, model: "haiku" }, office))).tokens;
    } catch {
      // Left unmeasured rather than shown as free.
    }
  }
  return { claudeVersion: all.version, everything: all.tokens, roles: costs, measuredAt: Date.now() };
}
