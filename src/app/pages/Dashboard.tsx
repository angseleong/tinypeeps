import { Info } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { BASELINE_MODEL } from "../../core/prices";
import type { Limits } from "../../core/settings";
import type { Strings } from "../../core/strings";
import { byDay, byFamily, byPeep, escalationsByPeep, type Family, savingPercent, since, totals, type UsageRecord, weekAgo } from "../../core/usage";
import type { Peep } from "../office/office-data";
import { Card, CountUp, compact, FAMILY_COLOR, Meter, Page, rise, Stat, usd } from "../ui";

const FAMILIES: Family[] = ["opus", "sonnet", "haiku", "fable", "other"];

// "claude-opus-5-5" → "Opus 5.5"
const modelName = (id: string) =>
  id
    .replace("claude-", "")
    .replace(/-(\d+)-(\d+)$/, " $1.$2")
    .replace(/^./, (c) => c.toUpperCase());

export function DashboardPage({ s, usage, peeps, limits }: { s: Strings; usage: UsageRecord[]; peeps: Peep[]; limits: Limits }) {
  const week = since(usage, weekAgo());
  const t = totals(week);
  const saved = savingPercent(t);
  const fams = byFamily(week);
  const famTotal = Object.values(fams).reduce((n, f) => n + f.fresh, 0);
  const perPeep = byPeep(week);
  const escalated = escalationsByPeep(week);
  const tasksPerPeep: Record<string, number> = {};
  for (const r of week) tasksPerPeep[r.peepId] = (tasksPerPeep[r.peepId] ?? 0) + 1;
  const days = byDay(usage, 14);
  const when = (sec: number) => new Date(sec * 1000).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Page title={s.dashboard.title}>
      <div className="grid grid-cols-3 gap-3">
        <motion.section variants={rise} className="col-span-2 rounded-card bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[13px] text-muted">
                {s.dashboard.savedLead}
                <span title={s.dashboard.assumption} className="cursor-help">
                  <Info size={12} />
                </span>
              </div>
              <div className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.03em] text-good-text">
                <CountUp value={saved} format={(n) => `${Math.round(n)}%`} />
              </div>
              <div className="mt-2 text-[12px] text-muted">{s.dashboard.versus(modelName(BASELINE_MODEL))}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="rounded-tile bg-fill-1 px-3.5 py-2.5">
                <div className="text-[11px] text-muted first-letter:uppercase">{s.dashboard.spent}</div>
                <div className="text-[17px] font-semibold tracking-[-0.01em]">
                  <CountUp value={t.cost} format={usd} />
                </div>
              </div>
              <div className="rounded-tile bg-fill-1 px-3.5 py-2.5">
                <div className="text-[11px] text-muted first-letter:uppercase">{s.dashboard.baseline}</div>
                <div className="text-[17px] font-semibold tracking-[-0.01em] text-muted line-through decoration-1">
                  <CountUp value={t.baseline} format={usd} />
                </div>
              </div>
            </div>
          </div>
          <DayBars days={days} label={s.dashboard.byDay} />
        </motion.section>

        <div className="flex flex-col gap-3">
          <Stat
            label={s.dashboard.tokens}
            value={t.fresh}
            format={compact}
            sub={`${week.length} ${s.dashboard.tasks} · ${s.hud.cache(compact(t.tokens - t.fresh))}`}
          />
          <Card title={s.dashboard.weekly} className="flex-1">
            {limits?.rateLimit.sevenDay ? (
              <div className="flex flex-col gap-4">
                <LimitRow label={s.dashboard.weekly} w={limits.rateLimit.sevenDay} s={s} when={when} />
                {limits.rateLimit.fiveHour && <LimitRow label={s.dashboard.session} w={limits.rateLimit.fiveHour} s={s} when={when} />}
              </div>
            ) : (
              <p className="text-[13px] text-muted">{s.dashboard.notAvailable}</p>
            )}
          </Card>
        </div>
      </div>

      {week.length === 0 ? (
        <Card className="mt-3">
          <p className="text-[13px] text-muted">{s.dashboard.noData}</p>
        </Card>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card title={s.dashboard.byModel}>
            <div className="flex flex-col gap-4">
              {FAMILIES.filter((f) => fams[f]).map((f) => (
                <div key={f}>
                  <div className="mb-2 flex items-baseline justify-between text-[13px]">
                    <span className="flex items-center gap-2 capitalize">
                      <span className="size-2 rounded-full" style={{ background: FAMILY_COLOR[f] }} />
                      {f}
                    </span>
                    <span className="tabular text-muted">
                      <span className="font-medium text-ink">{compact(fams[f].fresh)}</span> · {Math.round((fams[f].fresh / Math.max(1, famTotal)) * 100)}% ·{" "}
                      {usd(fams[f].cost)}
                    </span>
                  </div>
                  <Meter value={fams[f].fresh / Math.max(1, famTotal)} color={FAMILY_COLOR[f]} />
                </div>
              ))}
            </div>
          </Card>

          <Card title={s.dashboard.byPeep}>
            <div className="flex flex-col gap-1">
              {peeps
                .filter((p) => perPeep[p.id])
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-row px-1 py-2">
                    <span className="grid size-8 place-items-center rounded-full text-[12px] font-semibold text-white" style={{ background: p.color }}>
                      {p.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{p.name}</div>
                      <div className="text-[12px] text-muted">
                        {tasksPerPeep[p.id]} {s.dashboard.tasks} · {compact(perPeep[p.id].fresh / tasksPerPeep[p.id])} {s.dashboard.perTask}
                      </div>
                    </div>
                    <div className="tabular text-[15px] font-semibold">{compact(perPeep[p.id].fresh)}</div>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      <Card title={s.dashboard.escalations} className="mt-3">
        {Object.keys(escalated).length === 0 ? (
          <p className="text-[13px] text-muted">{s.dashboard.escalationsEmpty}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(escalated).map(([id, n]) => (
              <div key={id} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-medium">{peeps.find((p) => p.id === id)?.name ?? id}</span>
                <span className="tabular text-muted">{s.dashboard.escalated(n)}</span>
              </div>
            ))}
            <p className="mt-1 text-[12px] text-muted">{s.dashboard.escalationHint}</p>
          </div>
        )}
      </Card>
    </Page>
  );
}

function LimitRow({ label, w, s, when }: { label: string; w: { utilization: number; resetsAt: number }; s: Strings; when: (n: number) => string }) {
  const color = w.utilization >= 0.9 ? "var(--red)" : w.utilization >= 0.7 ? "var(--orange-text)" : "var(--inverse)";
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular text-[17px] font-semibold">
          <CountUp value={w.utilization * 100} format={(n) => `${Math.round(n)}%`} />
        </span>
      </div>
      <Meter value={w.utilization} color={color} />
      <div className="mt-1.5 text-[12px] text-muted">{s.dashboard.resets(when(w.resetsAt))}</div>
    </div>
  );
}

// Bars per day, stacked by model, that grow up one after another with a small overshoot
// (the chart in DesignBookmark's Rubber dock). Hover or focus shows the day's numbers.
function DayBars({ days, label }: { days: ReturnType<typeof byDay>; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? days.length - 1;
  const max = Math.max(1, ...days.map((d) => Object.values(d.families).reduce((a, b) => a + b, 0)));
  return (
    <div className="mt-5 rounded-tile bg-fill-1 p-3.5">
      <div className="mb-3 flex items-baseline gap-3 text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="ml-auto text-muted">{days[shown].day}</span>
        {FAMILIES.filter((f) => days[shown].families[f]).map((f) => (
          <span key={f} className="tabular flex items-center gap-1.5 capitalize">
            <span className="size-[7px] rounded-full" style={{ background: FAMILY_COLOR[f] }} />
            {compact(days[shown].families[f])}
          </span>
        ))}
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {days.map((d, i) => {
          const total = Object.values(d.families).reduce((a, b) => a + b, 0);
          return (
            <button
              type="button"
              key={d.day}
              aria-label={d.day}
              className="flex h-full flex-1 flex-col justify-end outline-none"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <motion.div
                className="flex w-full origin-bottom flex-col justify-end gap-[2px]"
                style={{ height: total ? `${(total / max) * 100}%` : "6%" }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1, opacity: hover === null || hover === i ? 1 : 0.45 }}
                transition={{ scaleY: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.22 + i * 0.035 }, opacity: { duration: 0.15 } }}
              >
                {total === 0 ? (
                  <div className="h-full w-full rounded-[5px] bg-fill-3" />
                ) : (
                  FAMILIES.map((f) =>
                    d.families[f] > 0 ? (
                      <div key={f} className="w-full rounded-[5px]" style={{ height: `${(d.families[f] / total) * 100}%`, background: FAMILY_COLOR[f] }} />
                    ) : null,
                  )
                )}
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
