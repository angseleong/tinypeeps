import { costOf } from "../../../core/prices";
import type { Strings } from "../../../core/strings";
import { freshTokens, type UsageRecord } from "../../../core/usage";
import type { Peep } from "../office-data";
import { Card, compact, ModelBadge, Page, usd } from "../ui";

// shortcut: a list of finished sessions until the kanban board arrives in package B.
export function TasksPage({ s, usage, peeps }: { s: Strings; usage: UsageRecord[]; peeps: Peep[] }) {
  const rows = [...usage].reverse().slice(0, 100);
  return (
    <Page title={s.tasks.title} sub={s.tasks.soon}>
      <Card>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted">{s.tasks.empty}</p>
        ) : (
          <table className="w-full border-separate border-spacing-y-1 text-[13px]">
            <tbody>
              {rows.map((r) => {
                const p = peeps.find((x) => x.id === r.peepId);
                const models = Object.entries(r.models);
                return (
                  <tr
                    key={`${r.ts}-${r.peepId}`}
                    className="transition-colors hover:bg-fill-1 [&>td:first-child]:rounded-l-row [&>td:last-child]:rounded-r-row"
                  >
                    <td className="px-3 py-2.5 text-muted">{new Date(r.ts).toLocaleString()}</td>
                    <td className="py-2.5 font-medium">{p?.name ?? r.peepId}</td>
                    <td className="py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {models.map(([m]) => (
                          <ModelBadge key={m} model={m} />
                        ))}
                      </span>
                    </td>
                    <td className="tabular py-2.5 text-right font-medium">{compact(models.reduce((n, [, u]) => n + freshTokens(u), 0))}</td>
                    <td className="tabular px-3 py-2.5 text-right text-muted">{usd(models.reduce((n, [m, u]) => n + costOf(u, m), 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </Page>
  );
}
