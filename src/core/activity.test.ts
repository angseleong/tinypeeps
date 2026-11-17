import { describe, expect, it } from "vitest";
import { activityForTool, readStreamLine } from "./activity";

const line = (o: unknown) => JSON.stringify(o);

describe("readStreamLine", () => {
  it("maps tool calls to activities", () => {
    const edit = readStreamLine(line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/a/b/logo.svg" } }] } }));
    expect(edit).toEqual({ activity: "typing", label: "Edit: logo.svg" });
    expect(
      readStreamLine(line({ type: "assistant", message: { content: [{ type: "tool_use", name: "WebSearch", input: { query: "sejarah majapahit" } }] } }))
        ?.activity,
    ).toBe("researching");
  });

  it("treats unknown and MCP tools as running", () => {
    expect(activityForTool("mcp__youtube__upload")).toBe("running");
  });

  it("marks a failed tool as stuck", () => {
    expect(readStreamLine(line({ type: "user", message: { content: [{ type: "tool_result", is_error: true }] } }))?.activity).toBe("stuck");
  });

  it("reads usage and ends the task on result", () => {
    const r = readStreamLine(
      line({ type: "result", is_error: false, result: "Selesai", usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 } }),
    );
    expect(r).toMatchObject({ activity: "idle", done: true, text: "Selesai", usage: { input: 10, output: 5, cacheRead: 100, cacheWrite: 0 } });
  });

  it("ignores lines it can't read", () => {
    expect(readStreamLine("not json")).toBeNull();
    expect(readStreamLine(line({ type: "stream_event" }))).toBeNull();
  });
});

describe("readStreamLine: cost and limits", () => {
  it("reads the Weekly Limit from rate_limit_event", () => {
    const r = readStreamLine(
      line({
        type: "rate_limit_event",
        rate_limit_info: { unifiedWindows: { five_hour: { utilization: 0.31, resetsAt: 1 }, seven_day: { utilization: 0.15, resetsAt: 2 } } },
      }),
    );
    expect(r).toEqual({ rateLimit: { fiveHour: { utilization: 0.31, resetsAt: 1 }, sevenDay: { utilization: 0.15, resetsAt: 2 } } });
  });

  it("splits result usage per model, subagents included", () => {
    const r = readStreamLine(
      line({
        type: "result",
        usage: {},
        modelUsage: {
          "claude-sonnet-5-5": { inputTokens: 2, outputTokens: 4, cacheReadInputTokens: 0, cacheCreationInputTokens: 25860, costUSD: 0.103484 },
          "claude-haiku-4-5-20251001": { inputTokens: 1, outputTokens: 1, costUSD: 0.000006 },
        },
      }),
    );
    expect(Object.keys(r?.models ?? {})).toEqual(["claude-sonnet-5-5", "claude-haiku-4-5-20251001"]);
    expect(r?.models?.["claude-sonnet-5-5"]).toEqual({ input: 2, output: 4, cacheRead: 0, cacheWrite: 25860, costUSD: 0.103484 });
  });

  it("reads the session id and Claude Code version on init", () => {
    expect(readStreamLine(line({ type: "system", subtype: "init", model: "m", session_id: "s1", claude_code_version: "2.1.292" }))).toMatchObject({
      sessionId: "s1",
      claudeVersion: "2.1.292",
    });
  });
});
