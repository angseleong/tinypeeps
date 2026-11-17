// Runs one `claude -p` session per Peep and turns its stream into updates for the window.
import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { activityForTool, type ModelUsage, type PeepUpdate, readStreamLine } from "../core/activity";
import { type Answer, type Approval, allowRule } from "../core/approval";
import type { Role } from "../core/roles";
import type { ContextCosts, Settings } from "../core/settings";
import { turnUsage, usageFromTranscript } from "../core/usage";
import { appendUsage, findTranscript, listMcp, saveLimits, writeBrief } from "./store";

export type RunRequest = { office: string; peepId: string; prompt: string };
// A conversation (the Manager's Kickoff or a Meeting) keeps its session open for the CEO's next
// message; any other Job is one Task in one session (ADR 4).
type Job = RunRequest & { role: Role; keepOpen?: boolean };
type Running = { child: ChildProcess; keepOpen: boolean };

type Deps = {
  settings: () => Settings;
  role: (office: string, peepId: string) => Role | undefined;
  send: (peepId: string, update: PeepUpdate) => void;
  onLimits: () => void;
  onUsage: () => void;
  onApprovals: (list: Approval[]) => void;
  // "Always allow for this Role": the CEO's answer becomes an `--allowedTools` rule in the Role file.
  allowAlways: (office: string, peepId: string, rule: string) => void;
};

type Pending = Approval & { child: ChildProcess; office: string };

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
  const running = new Map<string, Running>();
  // Conversations wait for the CEO most of the time, so they don't take a working seat.
  const working = () => [...running.values()].filter((r) => !r.keepOpen).length;
  const queue: Job[] = [];
  const pending = new Map<string, Pending>();
  // "Always" also covers the rest of the session it was given in: `--allowedTools` only reaches the
  // next one. Only rules the CEO chose land here (ADR 5).
  const alwaysIn = new WeakMap<ChildProcess, Set<string>>();
  let paused = false;

  const publish = () => deps.onApprovals([...pending.values()].map(({ child: _c, office: _o, ...a }) => a));
  const write = (child: ChildProcess, msg: unknown) => {
    if (child.stdin?.writable) child.stdin.write(`${JSON.stringify(msg)}\n`);
  };

  function startNext() {
    while (!paused && queue.length && working() < deps.settings().concurrency) {
      const next = queue.shift();
      if (next) start(next);
    }
  }

  function start(job: Job) {
    const { role, office } = job;
    // The task goes in on stdin as stream-json, so Claude Code's permission questions come back on
    // stdout as `can_use_tool` and wait for the CEO's answer (ADR 5). Nothing is answered for them.
    const args = [
      "-p",
      "--input-format",
      "stream-json",
      ...BASE_ARGS,
      ...roleArgs(role, office),
      "--append-system-prompt-file",
      writeBrief(office, role),
      "--permission-prompts",
      "host",
      "--permission-prompt-tool",
      "stdio",
    ];
    if (role.allow.length) args.push("--allowedTools", ...role.allow);
    const child = spawn(deps.settings().claudePath, args, { cwd: office, env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    running.set(job.peepId, { child, keepOpen: !!job.keepOpen });
    child.stdin?.on("error", () => {}); // a session that already exited just drops the write
    write(child, { type: "user", message: { role: "user", content: job.prompt } });
    let stderr = "";
    let sessionId: string | undefined;
    let ended = false;
    let before: Record<string, ModelUsage> = {};

    createInterface({ input: child.stdout }).on("line", (line) => {
      const u = readStreamLine(line);
      if (!u) return;
      if (u.sessionId) sessionId = u.sessionId;
      if (u.rateLimit) {
        saveLimits({ rateLimit: u.rateLimit, seenAt: Date.now() });
        deps.onLimits();
      }
      if (u.approval && alwaysIn.get(child)?.has(allowRule(u.approval.tool, u.approval.input))) {
        const { requestId, input } = u.approval;
        write(child, {
          type: "control_response",
          response: { subtype: "success", request_id: requestId, response: { behavior: "allow", updatedInput: input } },
        });
        deps.send(job.peepId, { activity: activityForTool(u.approval.tool), label: u.label });
        return;
      }
      if (u.approval) {
        const a = u.approval;
        pending.set(a.requestId, { id: a.requestId, peepId: job.peepId, tool: a.tool, input: a.input, at: Date.now(), child, office });
        publish();
      }
      if (u.done) {
        ended = true;
        if (!job.keepOpen) child.stdin?.end(); // one Task per session (ADR 4)
        if (u.models) {
          const turn = turnUsage(u.models, before);
          before = u.models;
          u.models = turn;
          if (Object.keys(turn).length) {
            appendUsage(office, { ts: Date.now(), peepId: job.peepId, sessionId, models: turn });
            deps.onUsage();
          }
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
      let dropped = false;
      for (const [id, p] of pending) if (p.child === child) dropped = pending.delete(id);
      if (dropped) publish();
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
      startNext();
    });
  }

  return {
    run(req: RunRequest): "started" | "queued" | "busy" | "no-role" {
      const role = deps.role(req.office, req.peepId);
      if (!role) return "no-role";
      if (running.has(req.peepId) || queue.some((q) => q.peepId === req.peepId)) return "busy";
      const job = { ...req, role };
      if (paused || working() >= deps.settings().concurrency) {
        queue.push(job);
        deps.send(req.peepId, { activity: "queued", label: paused ? "paused" : "queued" });
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
      running.get(peepId)?.child.kill("SIGINT");
    },
    stopAll() {
      for (const q of queue.splice(0)) deps.send(q.peepId, { activity: "idle", done: true, error: "cancelled" });
      for (const r of running.values()) r.child.kill("SIGINT");
    },
    // The CEO's next line in a conversation; opens the session if there is none (the caller then
    // passes what was said before, since a new session remembers nothing).
    converse(req: RunRequest): "sent" | "started" | "busy" | "no-role" {
      const open = running.get(req.peepId);
      if (open?.keepOpen) {
        write(open.child, { type: "user", message: { role: "user", content: req.prompt } });
        deps.send(req.peepId, { activity: "thinking" });
        return "sent";
      }
      if (open) return "busy";
      const role = deps.role(req.office, req.peepId);
      if (!role) return "no-role";
      start({ ...req, role, keepOpen: true });
      return "started";
    },
    endConversation(peepId: string) {
      const r = running.get(peepId);
      if (r?.keepOpen) r.child.stdin?.end();
    },
    // Paused: running Tasks finish, queued ones wait, nothing new starts.
    setPaused(on: boolean) {
      paused = on;
      startNext();
    },
    isPaused: () => paused,
    approvals: () => [...pending.values()].map(({ child: _c, office: _o, ...a }) => a),
    answer(id: string, answer: Answer) {
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      const allow = answer !== "deny";
      if (answer === "always") {
        const rule = allowRule(p.tool, p.input);
        deps.allowAlways(p.office, p.peepId, rule);
        alwaysIn.set(p.child, (alwaysIn.get(p.child) ?? new Set()).add(rule));
      }
      write(p.child, {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: id,
          response: allow ? { behavior: "allow", updatedInput: p.input } : { behavior: "deny", message: "The CEO said no." },
        },
      });
      deps.send(p.peepId, { activity: "thinking", label: allow ? "allowed" : "denied" });
      publish();
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
