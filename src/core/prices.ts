import type { Usage } from "./activity";

// Anthropic first-party list prices, US$ per million tokens. Check them against PRICES_SOURCE and
// update PRICES_COPIED; prices.test.ts fails 90 days after that date so this never quietly goes stale.
export const PRICES_COPIED = "2026-11-03";
export const PRICES_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";

// The model the Saving is measured against: "what if every Task ran on Opus".
export const BASELINE_MODEL = "claude-opus-5-5";

export type Price = { input: number; output: number; cacheWrite1h: number; cacheRead: number };

// Longest prefix wins, so "claude-opus-5-5" beats "claude-opus-5".
const PRICES: Record<string, Price> = {
  "claude-fable-5-2": { input: 8, output: 40, cacheWrite1h: 16, cacheRead: 0.2 },
  "claude-fable-5-1": { input: 10, output: 50, cacheWrite1h: 20, cacheRead: 0.25 },
  "claude-fable-5": { input: 10, output: 50, cacheWrite1h: 20, cacheRead: 1 },
  "claude-mythos-5-2": { input: 8, output: 40, cacheWrite1h: 16, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite1h: 8, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheWrite1h: 10, cacheRead: 0.5 },
  "claude-opus-4": { input: 5, output: 25, cacheWrite1h: 10, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite1h: 4, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite1h: 4, cacheRead: 0.2 },
  "claude-sonnet-4": { input: 3, output: 15, cacheWrite1h: 6, cacheRead: 0.3 },
  // shortcut: Haiku 5.5's prompts over 100K tokens cost 5x; Peeps' prompts are well under that.
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite1h: 0.2, cacheRead: 0.01 },
  "claude-haiku-4": { input: 1, output: 5, cacheWrite1h: 2, cacheRead: 0.1 },
};

export function priceFor(modelId: string): Price | null {
  const key = Object.keys(PRICES)
    .filter((k) => modelId.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : null;
}

// shortcut: every cache write is priced as a 1-hour write, which is what Claude Code sends today
// (checked against its costUSD); split 5-minute writes once Claude Code reports them per model.
export function costOf(u: Usage, modelId: string): number {
  const p = priceFor(modelId);
  if (!p) return 0;
  return (u.input * p.input + u.output * p.output + u.cacheWrite * p.cacheWrite1h + u.cacheRead * p.cacheRead) / 1e6;
}

export const baselineCostOf = (u: Usage) => costOf(u, BASELINE_MODEL);
