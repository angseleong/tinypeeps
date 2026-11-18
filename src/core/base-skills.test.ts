import { describe, expect, it } from "vitest";
import { baseSection, hookText, newestVersion } from "./base-skills";

describe("Base Skills", () => {
  it("reads a hook's rules as plain text or Claude Code's JSON", () => {
    expect(hookText("PONYTAIL MODE ACTIVE\n\nrules\n")).toBe("PONYTAIL MODE ACTIVE\n\nrules");
    expect(hookText(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "be brief" } }))).toBe("be brief");
  });

  it("picks the newest plugin version by number", () => {
    expect(newestVersion(["5.9.1", "5.10.0", ".DS_Store"])).toBe("5.10.0");
    expect(newestVersion([])).toBeNull();
  });

  it("adds nothing when every Base Skill is off", () => {
    expect(baseSection([])).toBe("");
    expect(baseSection([{ id: "a", text: "x" }])).toBe("\n\n## Base Skills\n\nx");
  });
});
