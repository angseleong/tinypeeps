// Usage records (one per finished Task, saved in `.tinypeeps/usage.jsonl`) and the sums the
// dashboard shows. Pure code: no file or model access.
import type { ModelUsage, Usage } from "./activity";
import { baselineCostOf, costOf } from "./prices";

export type UsageRecord = {
  ts: number; // ms
  peepId: string;
  sessionId?: string;
  models: Record<string, ModelUsage>;
  recovered?: boolean; // read back from a transcript after a crash
};

export type Family = "opus" | "sonnet" | "haiku" | "fable" | "other";
export const familyOf = (modelId: string): Family => (["opus", "sonnet", "haiku", "fable"] as const).find((f) => modelId.includes(f)) ?? "other";

export const freshTokens = (u: Usage) => u.input + u.output + u.cacheWrite;
export const allTokens = (u: Usage) => freshTokens(u) + u.cacheRead;

export type Totals = { tokens: number; fresh: number; cost: number; baseline: number };
const zero = (): Totals => ({ tokens: 0, fresh: 0, cost: 0, baseline: 0 });

function add(t: Totals, modelId: string, u: Usage) {
  t.tokens += allTokens(u);
  t.fresh += freshTokens(u);
  t.cost += costOf(u, modelId);
  t.baseline += baselineCostOf(u);
}

export function totals(records: UsageRecord[]): Totals {
  const t = zero();
  for (const r of records) for (const [m, u] of Object.entries(r.models)) add(t, m, u);
  return t;
}

// Claude Code reports `modelUsage` summed over the whole session, so a session that stays open for a
// conversation records only what each turn added (checked with Claude Code 2.1.292).
export function turnUsage(now: Record<string, ModelUsage>, before: Record<string, ModelUsage>): Record<string, ModelUsage> {
  const out: Record<string, ModelUsage> = {};
  for (const [m, u] of Object.entries(now)) {
    const b = before[m];
    const d = b
      ? {
          input: u.input - b.input,
          output: u.output - b.output,
          cacheRead: u.cacheRead - b.cacheRead,
          cacheWrite: u.cacheWrite - b.cacheWrite,
          costUSD: u.costUSD - b.costUSD,
        }
      : u;
    if (d.input || d.output || d.cacheRead || d.cacheWrite) out[m] = d;
  }
  return out;
}

export function savingPercent(t: Totals): number {
  return t.baseline > 0 ? Math.max(0, ((t.baseline - t.cost) / t.baseline) * 100) : 0;
}

export function byKey(records: UsageRecord[], key: (r: UsageRecord, modelId: string) => string): Record<string, Totals> {
  const out: Record<string, Totals> = {};
  for (const r of records)
    for (const [m, u] of Object.entries(r.models)) {
      const k = key(r, m);
      out[k] ??= zero();
      add(out[k], m, u);
    }
  return out;
}

export const byFamily = (rs: UsageRecord[]) => byKey(rs, (_r, m) => familyOf(m));
export const byPeep = (rs: UsageRecord[]) => byKey(rs, (r) => r.peepId);

export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// The last `days` calendar days, oldest first, each split by model family (for stacked bars).
export function byDay(records: UsageRecord[], days: number, now = Date.now()): { day: string; families: Record<Family, number> }[] {
  const out = Array.from({ length: days }, (_, i) => ({
    day: dayKey(now - (days - 1 - i) * 86_400_000),
    families: { opus: 0, sonnet: 0, haiku: 0, fable: 0, other: 0 } as Record<Family, number>,
  }));
  const index = new Map(out.map((d, i) => [d.day, i]));
  for (const r of records) {
    const i = index.get(dayKey(r.ts));
    if (i === undefined) continue;
    for (const [m, u] of Object.entries(r.models)) out[i].families[familyOf(m)] += freshTokens(u);
  }
  return out;
}

export const since = (records: UsageRecord[], ms: number) => records.filter((r) => r.ts >= ms);
export const startOfToday = (now = Date.now()) => new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
export const weekAgo = (now = Date.now()) => now - 7 * 86_400_000;

// A Claude Code transcript (JSONL) read back after a crash: sum each assistant message once.
export function usageFromTranscript(text: string): Record<string, ModelUsage> {
  const seen = new Set<string>();
  const models: Record<string, ModelUsage> = {};
  for (const line of text.split("\n")) {
    let m: any;
    try {
      m = JSON.parse(line);
    } catch {
      continue;
    }
    const msg = m?.message;
    if (m?.type !== "assistant" || !msg?.usage || !msg.model) continue;
    const id = msg.id ?? m.uuid;
    if (seen.has(id)) continue;
    seen.add(id);
    const u = msg.usage;
    const t = (models[msg.model] ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUSD: 0 });
    t.input += u.input_tokens ?? 0;
    t.output += u.output_tokens ?? 0;
    t.cacheRead += u.cache_read_input_tokens ?? 0;
    t.cacheWrite += u.cache_creation_input_tokens ?? 0;
  }
  for (const [model, t] of Object.entries(models)) t.costUSD = costOf(t, model);
  return models;
}
