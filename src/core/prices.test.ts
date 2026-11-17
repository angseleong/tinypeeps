import { describe, expect, it } from "vitest";
import { BASELINE_MODEL, costOf, PRICES_COPIED, priceFor } from "./prices";

describe("prices", () => {
  it("matches Claude Code's own costUSD for a real Sonnet 5.5 session", () => {
    expect(costOf({ input: 2, output: 4, cacheRead: 0, cacheWrite: 25860 }, "claude-sonnet-5-5")).toBeCloseTo(0.103484, 6);
  });

  it("picks the most specific model family", () => {
    expect(priceFor("claude-opus-5-5")?.input).toBe(4);
    expect(priceFor("claude-opus-5")?.input).toBe(5);
    expect(priceFor("claude-haiku-4-5-20251001")?.input).toBe(1);
    expect(priceFor("gpt-4")).toBeNull();
  });

  it("has a price for the Baseline model", () => {
    expect(priceFor(BASELINE_MODEL)).not.toBeNull();
  });

  it("was checked against Anthropic's pricing page in the last 90 days", () => {
    const age = (Date.now() - Date.parse(PRICES_COPIED)) / 86_400_000;
    expect(age, `prices.ts was copied on ${PRICES_COPIED}; check PRICES_SOURCE and update it`).toBeLessThan(90);
  });
});
