// Turns Claude Code's `stream-json` lines into what a Peep is shown doing.
// Pure code: no model is ever asked what it's doing (ADR 2).

export type Activity = "idle" | "queued" | "thinking" | "typing" | "reading" | "researching" | "running" | "delegating" | "stuck";

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
      if (tool) return { activity: activityForTool(tool.name ?? ""), label: describeTool(tool) };
      const text = blocks.find((b) => b.type === "text");
      return text?.text ? { activity: "thinking", text: text.text } : null;
    }
    case "user": {
      const failed = blocks.some((b) => b.type === "tool_result" && b.is_error);
      return failed ? { activity: "stuck", label: "tool-failed" } : { activity: "thinking" };
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
