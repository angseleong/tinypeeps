import { describe, expect, it } from "vitest";
import { activityForTool, readStreamLine } from "./activity";

const line = (o: unknown) => JSON.stringify(o);

describe("readStreamLine", () => {
  it("maps tool calls to activities", () => {
    const edit = readStreamLine(line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "/a/b/logo.svg" } }] } }));
    expect(edit).toEqual({ activity: "typing", label: "Edit: logo.svg" });
    expect(readStreamLine(line({ type: "assistant", message: { content: [{ type: "tool_use", name: "WebSearch", input: { query: "sejarah majapahit" } }] } }))?.activity).toBe("researching");
  });

  it("treats unknown and MCP tools as running", () => {
    expect(activityForTool("mcp__youtube__upload")).toBe("running");
  });

  it("marks a failed tool as stuck", () => {
    expect(readStreamLine(line({ type: "user", message: { content: [{ type: "tool_result", is_error: true }] } }))?.activity).toBe("stuck");
  });

  it("reads usage and ends the task on result", () => {
    const r = readStreamLine(line({ type: "result", is_error: false, result: "Selesai", usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100 } }));
    expect(r).toMatchObject({ activity: "idle", done: true, text: "Selesai", usage: { input: 10, output: 5, cacheRead: 100, cacheWrite: 0 } });
  });

  it("ignores lines it can't read", () => {
    expect(readStreamLine("not json")).toBeNull();
    expect(readStreamLine(line({ type: "stream_event" }))).toBeNull();
  });
});
