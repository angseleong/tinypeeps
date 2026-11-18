import { type CSSProperties, useEffect, useState } from "react";
import type { Activity } from "../../core/activity";
import type { Strings } from "../../core/strings";
import { labelText } from "../../core/strings";
import type { Peep } from "../office/office-data";
import { Card, cx, Page, Segmented } from "../ui";

type Entry = { t: number; text: string; peep: Peep };

// Every Peep's log in one feed, newest first: what they read, wrote, ran and finished.
export function ActivityPage({ s, peeps, onOpen }: { s: Strings; peeps: Peep[]; onOpen: (peepId: string) => void }) {
  const [who, setWho] = useState("all");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const entries: Entry[] = peeps
    .filter((p) => who === "all" || p.id === who)
    .flatMap((p) => p.log.map((l) => ({ ...l, peep: p })))
    .sort((a, b) => b.t - a.t)
    .slice(0, 200);
  const ago = (t: number) => {
    const m = Math.floor((now - t) / 60_000);
    return m < 1 ? s.feed.now : s.feed.ago(m);
  };

  return (
    <Page
      title={s.feed.title}
      sub={s.feed.sub}
      actions={
        <Segmented id="feed-who" value={who} options={[["all", s.feed.all], ...peeps.map((p) => [p.id, p.name] as [string, string])]} onChange={setWho} />
      }
    >
      <Card>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">{s.feed.empty}</p>
        ) : (
          <ol className="flex flex-col">
            {entries.map((e, i) => (
              <li key={`${e.peep.id}-${e.t}-${e.text}`} className="enter-item" style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                <button
                  type="button"
                  onClick={() => onOpen(e.peep.id)}
                  className="flex w-full items-center gap-3 rounded-row px-2 py-2.5 text-left transition-colors duration-200 hover:bg-fill-1"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white"
                    style={{ background: e.peep.color }}
                  >
                    {e.peep.name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{e.peep.name}</span>
                    <span className={cx("block truncate text-[12px]", kindOf(e.text) === "stuck" ? "text-stuck" : "text-muted")}>{labelText(s, e.text)}</span>
                  </span>
                  <time className="shrink-0 text-[11px] text-muted tabular">{ago(e.t)}</time>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </Page>
  );
}

const kindOf = (text: string): Activity | "" => (/gagal|failed|error|exited|Mentok|Stuck/i.test(text) ? "stuck" : "");
