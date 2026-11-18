import { describe, expect, it } from "vitest";
import { cleanNote, lineDiff, needsCompaction } from "./company";

const long = Array.from({ length: 320 }, (_, i) => `w${i}`).join(" ");

describe("Company Note", () => {
  it("is compacted once past its limit, again only after it changes", () => {
    expect(needsCompaction("short note", null)).toBe(false);
    expect(needsCompaction(long, null)).toBe(true);
    expect(needsCompaction(long, long)).toBe(false);
    expect(needsCompaction(`${long} more`, long)).toBe(true);
  });

  it("drops a code fence around the reply", () => {
    expect(cleanNote("```markdown\n# Goal\nShip it\n```")).toBe("# Goal\nShip it");
  });

  it("shows what was removed and added, line by line", () => {
    expect(lineDiff("a\nb\nc", "a\nc\nd")).toEqual([
      { op: "same", text: "a" },
      { op: "del", text: "b" },
      { op: "same", text: "c" },
      { op: "add", text: "d" },
    ]);
  });
});
