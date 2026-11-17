import { describe, expect, it } from "vitest";
import { defaultRoles, parseRole, serializeRole } from "./roles";
import { byDay, byFamily, savingPercent, totals, turnUsage, type UsageRecord, usageFromTranscript } from "./usage";

const rec = (ts: number, model: string, input: number, output: number): UsageRecord => ({
  ts,
  peepId: "p",
  models: { [model]: { input, output, cacheRead: 0, cacheWrite: 0, costUSD: 0 } },
});

describe("savings", () => {
  it("is zero when everything ran on the Baseline model", () => {
    expect(savingPercent(totals([rec(0, "claude-opus-5-5", 1000, 1000)]))).toBe(0);
  });

  it("is 50% for Sonnet 5.5 against Opus 5.5 (half the price)", () => {
    expect(savingPercent(totals([rec(0, "claude-sonnet-5-5", 1000, 1000)]))).toBeCloseTo(50);
  });

  it("counts an Escalation's two runs, so a failed cheap run lowers the Saving", () => {
    const cheapOnly = savingPercent(totals([rec(0, "claude-haiku-5-5", 1000, 1000)]));
    const escalated = savingPercent(totals([rec(0, "claude-haiku-5-5", 1000, 1000), rec(0, "claude-opus-5-5", 1000, 1000)]));
    expect(escalated).toBeLessThan(cheapOnly);
  });

  it("groups by model family and by day", () => {
    const now = Date.parse("2026-11-16T12:00:00");
    const rs = [rec(now, "claude-haiku-4-5-20251001", 10, 0), rec(now - 86_400_000, "claude-sonnet-5-5", 5, 0)];
    expect(Object.keys(byFamily(rs)).sort()).toEqual(["haiku", "sonnet"]);
    const days = byDay(rs, 7, now);
    expect(days).toHaveLength(7);
    expect(days[6].families.haiku).toBe(10);
    expect(days[5].families.sonnet).toBe(5);
  });
});

describe("usageFromTranscript", () => {
  it("counts each assistant message once, per model", () => {
    const msg = { type: "assistant", message: { id: "m1", model: "claude-haiku-4-5", usage: { input_tokens: 3, output_tokens: 7 } } };
    const text = [JSON.stringify(msg), JSON.stringify(msg), "garbage", JSON.stringify({ type: "user" })].join("\n");
    expect(usageFromTranscript(text)["claude-haiku-4-5"]).toMatchObject({ input: 3, output: 7 });
  });
});

describe("role files", () => {
  it("round-trips through a file", () => {
    for (const r of defaultRoles("id")) expect(parseRole(r.id, serializeRole(r))).toEqual(r);
  });

  it("falls back to safe defaults for a hand-edited file", () => {
    const r = parseRole("x", "---\nmodel: gpt\n---\nHi");
    expect(r).toMatchObject({ model: "sonnet", tools: ["Read", "Grep", "Glob"], everything: false, brief: "Hi" });
  });
});

describe("turnUsage", () => {
  it("keeps only what the latest turn added to the session's running sum", () => {
    const a = { input: 3, output: 42, cacheRead: 0, cacheWrite: 100, costUSD: 0.0107 };
    const b = { input: 6, output: 71, cacheRead: 5234, cacheWrite: 100, costUSD: 0.0115 };
    const d = turnUsage({ haiku: b }, { haiku: a }).haiku;
    expect([d.input, d.output, d.cacheRead, d.cacheWrite]).toEqual([3, 29, 5234, 0]);
    expect(turnUsage({ haiku: a }, {})).toEqual({ haiku: a });
    expect(turnUsage({ haiku: a }, { haiku: a })).toEqual({});
  });
});
