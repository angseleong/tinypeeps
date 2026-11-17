import { describe, expect, it } from "vitest";
import { readStreamLine } from "./activity";
import { allowRule, approvalKind } from "./approval";
import { skillDescription, skillsSection } from "./skills";

describe("approvals", () => {
  it("reads Claude Code's permission question as a waiting Peep with an Approval", () => {
    const line = JSON.stringify({
      type: "control_request",
      request_id: "r1",
      request: { subtype: "can_use_tool", tool_name: "Bash", input: { command: "touch a.txt" } },
    });
    expect(readStreamLine(line)).toEqual({
      activity: "waiting",
      label: "Bash: touch a.txt",
      approval: { requestId: "r1", tool: "Bash", input: { command: "touch a.txt" } },
    });
  });

  it("ignores other control messages", () => {
    expect(readStreamLine(JSON.stringify({ type: "control_request", request_id: "r2", request: { subtype: "interrupt" } }))).toBeNull();
  });

  it("names what is asked in a shape for plain words", () => {
    expect(approvalKind("Bash", { command: "git push" })).toEqual({ kind: "command", target: "git push" });
    expect(approvalKind("Write", { file_path: "/x/a.md" })).toEqual({ kind: "edit", target: "/x/a.md" });
    expect(approvalKind("mcp__youtube__upload", {})).toEqual({ kind: "mcp", target: "youtube: upload" });
  });

  it("allows a shell command only exactly as asked, other tools whole", () => {
    expect(allowRule("Bash", { command: "npm test" })).toBe("Bash(npm test)");
    expect(allowRule("Edit", { file_path: "/x" })).toBe("Edit");
  });
});

describe("skills as files", () => {
  it("reads a Skill's description and lists it in the brief", () => {
    const text = "---\nname: remotion\ndescription: Use when editing video with Remotion.\n---\nBody";
    expect(skillDescription(text)).toBe("Use when editing video with Remotion.");
    const section = skillsSection([{ name: "remotion", description: skillDescription(text), path: ".tinypeeps/skills/remotion/SKILL.md" }]);
    expect(section).toContain("- remotion (`.tinypeeps/skills/remotion/SKILL.md`): Use when editing video with Remotion.");
    expect(skillsSection([])).toBe("");
  });
});
