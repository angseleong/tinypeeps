// Turns Claude Code's `stream-json` lines into what a Peep is shown doing.
// Pure code: no model is ever asked what it's doing (ADR 2).

export type Activity = "idle" | "queued" | "thinking" | "typing" | "reading" | "researching" | "running" | "delegating" | "waiting" | "stuck";

const TOOL_ACTIVITY: Record<string, Activity> = {
  Edit: "typing",
  Write: "typing",
  NotebookEdit: "typing",
  Read: "reading",
  Grep: "reading",
  Glob: "reading",
  WebSearch: "researching",
  WebFetch: "researching",
  Bash: "running",
  Task: "delegating",
  Agent: "delegating",
};

export function activityForTool(name: string): Activity {
  return TOOL_ACTIVITY[name] ?? "running";
}

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

// Tokens one model used in a session, with Claude Code's own list-price cost for them.
export type ModelUsage = Usage & { costUSD: number };
export type LimitWindow = { utilization: number; resetsAt: number };
export type RateLimit = { fiveHour?: LimitWindow; sevenDay?: LimitWindow };

export type PeepUpdate = {
  activity?: Activity;
  label?: string;
  text?: string;
  model?: string;
  sessionId?: string;
  claudeVersion?: string;
  usage?: Usage;
  models?: Record<string, ModelUsage>;
  rateLimit?: RateLimit;
  // Claude Code asks before using a tool; the CEO answers it as an Approval (ADR 5).
  approval?: { requestId: string; tool: string; input: Record<string, unknown> };
  // A file the Peep wrote or edited, listed on its Task.
  file?: string;
  // A tool call came back; `track` decides what the Peep shows next.
  toolResult?: "ok" | "error";
  done?: boolean;
  error?: string;
};

type Block = { type: string; name?: string; input?: Record<string, unknown>; text?: string; is_error?: boolean };

function short(value: unknown, max = 40): string {
  const s = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function describeTool(block: Block): string {
  const input = block.input ?? {};
  const target = input.file_path ?? input.path ?? input.pattern ?? input.query ?? input.url ?? input.command ?? input.description;
  const name = block.name ?? "tool";
  if (typeof target !== "string") return name;
  const shown = typeof input.file_path === "string" ? target.split("/").pop() : target;
  return `${name}: ${short(shown)}`;
}

export function readStreamLine(line: string): PeepUpdate | null {
  let msg: any;
  try {
    msg = JSON.parse(line);
  } catch {
    return null;
  }
  const blocks: Block[] = msg?.message?.content ?? [];

  switch (msg?.type) {
    case "control_request": {
      const r = msg.request;
      if (r?.subtype !== "can_use_tool" || typeof msg.request_id !== "string") return null;
      const tool = String(r.tool_name ?? "tool");
      return {
        activity: "waiting",
        label: describeTool({ type: "tool_use", name: tool, input: r.input }),
        approval: { requestId: msg.request_id, tool, input: r.input ?? {} },
      };
    }
    case "system":
      return msg.subtype === "init"
        ? { activity: "thinking", label: "init", model: msg.model, sessionId: msg.session_id, claudeVersion: msg.claude_code_version }
        : null;
    case "rate_limit_event": {
      const w = msg.rate_limit_info?.unifiedWindows ?? {};
      const win = (x: any): LimitWindow | undefined => (typeof x?.utilization === "number" ? { utilization: x.utilization, resetsAt: x.resetsAt } : undefined);
      return { rateLimit: { fiveHour: win(w.five_hour), sevenDay: win(w.seven_day) } };
    }
    case "assistant": {
      const tool = blocks.find((b) => b.type === "tool_use");
      // A subagent's own work: the Peep stays Delegating while its helper works.
      if (msg.parent_tool_use_id) return tool ? { activity: "delegating", label: describeTool(tool) } : null;
      if (tool) {
        const file = activityForTool(tool.name ?? "") === "typing" ? (tool.input?.file_path ?? tool.input?.notebook_path) : undefined;
        return { activity: activityForTool(tool.name ?? ""), label: describeTool(tool), ...(typeof file === "string" && { file }) };
      }
      const text = blocks.find((b) => b.type === "text");
      return text?.text ? { activity: "thinking", text: text.text } : null;
    }
    case "user": {
      if (msg.parent_tool_use_id) return null;
      const results = blocks.filter((b) => b.type === "tool_result");
      if (!results.length) return null;
      return { toolResult: results.some((b) => b.is_error) ? "error" : "ok" };
    }
    case "result": {
      const u = msg.usage ?? {};
      const models: Record<string, ModelUsage> = {};
      for (const [id, m] of Object.entries<any>(msg.modelUsage ?? {})) {
        models[id] = {
          input: m.inputTokens ?? 0,
          output: m.outputTokens ?? 0,
          cacheRead: m.cacheReadInputTokens ?? 0,
          cacheWrite: m.cacheCreationInputTokens ?? 0,
          costUSD: m.costUSD ?? 0,
        };
      }
      return {
        models,
        activity: msg.is_error ? "stuck" : "idle",
        done: true,
        text: typeof msg.result === "string" ? msg.result : undefined,
        error: msg.is_error ? String(msg.result ?? msg.subtype) : undefined,
        usage: {
          input: u.input_tokens ?? 0,
          output: u.output_tokens ?? 0,
          cacheRead: u.cache_read_input_tokens ?? 0,
          cacheWrite: u.cache_creation_input_tokens ?? 0,
        },
      };
    }
    default:
      return null;
  }
}

// After a tool result the Peep keeps its Activity for a moment, then shows Thinking if no new tool
// started; one failed tool is normal, two in a row is Stuck (docs/office.md#activities).
export const THINK_AFTER_MS = 3000;
export type Tracker = { failStreak: number };

export function track(t: Tracker, u: PeepUpdate): { send: PeepUpdate | null; thinkLater: boolean } {
  if (u.toolResult === "ok") {
    t.failStreak = 0;
    return { send: null, thinkLater: true };
  }
  if (u.toolResult === "error") {
    t.failStreak += 1;
    if (t.failStreak >= 2) return { send: { activity: "stuck", label: "tool-failed" }, thinkLater: false };
    return { send: { label: "tool-failed" }, thinkLater: true };
  }
  return { send: u, thinkLater: false };
}
