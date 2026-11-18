import { describe, expect, it } from "vitest";
import { TESTED_CLAUDE, untested } from "./claude-version";

describe("Claude Code version check", () => {
  it("warns once for a version the app wasn't checked with", () => {
    expect(untested(TESTED_CLAUDE[0], null)).toBe(false);
    expect(untested("9.0.0", null)).toBe(true);
    expect(untested("9.0.0", "9.0.0")).toBe(false);
    expect(untested(undefined, null)).toBe(false);
  });
});
