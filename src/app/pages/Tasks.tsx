import { AlertTriangle, ArrowRight, Check, FileText, Hourglass, Play, RotateCcw, Trash2, Undo2, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { type BoardAction, runModel, STATUSES, type Task } from "../../core/board";
import { MANAGER_ID, type Role } from "../../core/roles";
import type { Strings } from "../../core/strings";
import { freshTokens, type UsageRecord } from "../../core/usage";
import type { Peep } from "../office/office-data";
import { Button, Card, compact, cx, inputClass, ModelBadge, Page, rise } from "../ui";

type Props = { s: Strings; usage: UsageRecord[]; peeps: Peep[]; tasks: Task[]; act: (a: BoardAction) => void; saveRole: (r: Role) => void };

const DRAG = "application/x-tinypeeps-task";

// Backlog → Working → Review → Done. The Engine moves cards; the CEO drags one onto a Peep to assign
// and start it, and decides what the Manager couldn't.
export function TasksPage({ s, usage, peeps, tasks, act, saveRole }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const tokens: Record<string, number> = {};
  for (const r of usage) if (r.taskId) tokens[r.taskId] = (tokens[r.taskId] ?? 0) + Object.values(r.models).reduce((n, u) => n + freshTokens(u), 0);
  const team = peeps.filter((p) => p.id !== MANAGER_ID);

  return (
    <Page title={s.tasks.title} sub={s.tasks.sub}>
      <motion.div variants={rise} className="mb-4 flex flex-wrap items-center gap-2">
        {team.map((p) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: a drop target for the mouse; the keyboard uses the card's "Give to" menu
          <div
            key={p.id}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG)) return;
              e.preventDefault();
              setOver(p.id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              setOver(null);
              const id = e.dataTransfer.getData(DRAG);
              if (id) act({ kind: "assign", id, peepId: p.id });
            }}
            className={cx(
              "flex h-10 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-[13px] font-medium transition-colors duration-150",
              over === p.id ? "bg-inverse text-on-inverse" : "bg-card",
            )}
          >
            <Avatar peep={p} />
            {p.name}
          </div>
        ))}
        {team.length > 0 && <span className="text-[12px] text-muted">{s.tasks.dropHint}</span>}
      </motion.div>

      {tasks.length === 0 ? (
        <Card>
          <p className="text-[13px] text-muted">{s.tasks.empty}</p>
        </Card>
      ) : (
        <motion.div variants={rise} className="grid grid-cols-4 items-start gap-3">
          {STATUSES.map((status) => {
            const col = tasks.filter((t) => t.status === status);
            return (
              <section key={status} className="flex min-w-0 flex-col gap-2 rounded-card bg-fill-1 p-2.5">
                <h3 className="flex items-center justify-between px-1.5 pt-1 text-[12px] font-medium text-muted">
                  {s.tasks.columns[status]}
                  <span className="tabular">{col.length}</span>
                </h3>
                {col.length === 0 && <p className="px-1.5 pb-2 text-[12px] text-muted">{s.tasks.emptyColumn}</p>}
                {col.map((t) => (
                  <TaskCard
                    key={t.id}
                    s={s}
                    task={t}
                    peep={peeps.find((p) => p.id === t.peepId)}
                    team={team}
                    tokens={tokens[t.id] ?? 0}
                    open={open === t.id}
                    onToggle={() => setOpen(open === t.id ? null : t.id)}
                    act={act}
                    saveRole={saveRole}
                  />
                ))}
              </section>
            );
          })}
        </motion.div>
      )}
    </Page>
  );
}

function Avatar({ peep, size = 7 }: { peep: Peep; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
      style={{ background: peep.color, width: size * 4, height: size * 4 }}
    >
      {peep.name[0]}
    </span>
  );
}

// What a card waits on, in words and an icon, never colour alone.
function statusLine(s: Strings, t: Task): { icon: typeof Check; text: string; tone: string } | null {
  if (t.needsCeo) return { icon: AlertTriangle, text: s.tasks.needsCeo, tone: "text-wait" };
  if (t.reviewing) return { icon: Hourglass, text: s.tasks.reviewing, tone: "text-muted" };
  if (t.error && t.status === "backlog") return { icon: AlertTriangle, text: s.tasks.stopped, tone: "text-stuck" };
  if (t.status === "backlog" && !t.go) return { icon: Hourglass, text: s.tasks.waits, tone: "text-muted" };
  return null;
}

function TaskCard({
  s,
  task: t,
  peep,
  team,
  tokens,
  open,
  onToggle,
  act,
  saveRole,
}: {
  s: Strings;
  task: Task;
  peep: Peep | undefined;
  team: Peep[];
  tokens: number;
  open: boolean;
  onToggle: () => void;
  act: (a: BoardAction) => void;
  saveRole: (r: Role) => void;
}) {
  const line = statusLine(s, t);
  const model = peep ? runModel(t, peep) : t.model;
  const working = t.status === "working";
  const lastReview = t.reviews.at(-1);
  return (
    <motion.div layout="position" layoutId={t.id} className="rounded-tile bg-card">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: dragging is the mouse way; the keyboard uses "Give to" */}
      <div
        draggable={!working}
        onDragStart={(e) => e.dataTransfer.setData(DRAG, t.id)}
        className={cx("flex flex-col gap-2 p-3", !working && "cursor-grab active:cursor-grabbing")}
      >
        <button type="button" onClick={onToggle} className="text-left text-[13.5px] leading-snug font-medium" aria-expanded={open}>
          {t.title}
        </button>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
          {peep ? (
            <span className="flex items-center gap-1.5">
              <Avatar peep={peep} size={5} />
              {peep.name}
            </span>
          ) : (
            <span>{s.tasks.unassigned}</span>
          )}
          {model && <ModelBadge model={model} />}
          {tokens > 0 && <span className="tabular ml-auto">{compact(tokens)}</span>}
        </div>
        {t.escalated && (
          <span className="flex items-center gap-1 text-[12px] text-muted">
            <RotateCcw size={12} aria-hidden /> {s.tasks.escalated(model ?? "")}
          </span>
        )}
        {line && (
          <span className={cx("flex items-center gap-1 text-[12px]", line.tone)}>
            <line.icon size={12} aria-hidden /> {line.text}
          </span>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-fill-2 p-3 text-[12.5px]">
          {t.detail && <p className="selectable whitespace-pre-wrap text-ink-2">{t.detail}</p>}
          {t.why && (
            <p className="flex gap-1.5 text-muted">
              <ArrowRight size={13} className="mt-0.5 shrink-0" aria-hidden /> {t.why}
            </p>
          )}
          {(t.note || t.status !== "backlog") && <NoteEditor s={s} task={t} onSave={(text) => act({ kind: "note", id: t.id, text })} />}
          {lastReview && (
            <div>
              <h4 className="mb-1 font-medium text-muted">{s.tasks.review}</h4>
              <pre className="selectable max-h-48 overflow-auto rounded-row bg-fill-1 p-2.5 font-sans whitespace-pre-wrap text-ink-2">{lastReview.text}</pre>
            </div>
          )}
          {peep &&
            (t.suggestTools ?? [])
              .filter((tool) => !peep.tools.includes(tool))
              .map((tool) => (
                <div key={tool} className="flex flex-col gap-2 rounded-row bg-fill-1 p-2.5">
                  <span>{s.tasks.suggest(tool, peep.name)}</span>
                  <Button className="self-start" onClick={() => saveRole({ ...peep, tools: [...peep.tools, tool] })}>
                    <Wrench size={12} /> {s.tasks.addTool(tool)}
                  </Button>
                </div>
              ))}
          {!working && !t.reviewing && t.status !== "done" && (
            <label className="flex items-center gap-2 text-muted">
              {s.tasks.giveTo}
              <select
                className="rounded-row bg-fill-1 px-2 py-1 text-ink outline-none"
                value={t.peepId ?? ""}
                onChange={(e) => e.target.value && act({ kind: "assign", id: t.id, peepId: e.target.value })}
              >
                <option value="">{s.tasks.unassigned}</option>
                {team.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-1.5">
            {t.status === "backlog" && !t.go && t.peepId && (
              <Button variant="primary" onClick={() => act({ kind: "start", id: t.id })}>
                <Play size={12} /> {s.tasks.start}
              </Button>
            )}
            {t.status === "review" && !t.reviewing && (
              <Button variant="primary" onClick={() => act({ kind: "accept", id: t.id })}>
                <Check size={12} /> {s.tasks.accept}
              </Button>
            )}
            {(t.status === "review" || t.status === "done") && !t.reviewing && (
              <Button onClick={() => act({ kind: "backlog", id: t.id })}>
                <Undo2 size={12} /> {s.tasks.sendBack}
              </Button>
            )}
            {!working && !t.reviewing && (
              <Button variant="ghost" onClick={() => act({ kind: "remove", id: t.id })}>
                <Trash2 size={12} /> {s.tasks.remove}
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// A Task's Handoff Note, which the CEO can correct, and the files the Peep wrote or edited (ADR 4).
export function NoteEditor({ s, task, onSave }: { s: Strings; task: Task; onSave: (text: string) => void }) {
  const [text, setText] = useState(task.note ?? "");
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="font-medium text-muted">{s.tasks.note}</span>
        <textarea
          className={cx(inputClass.replace("text-[14px]", "text-[12.5px]"), "min-h-24 resize-y leading-relaxed")}
          placeholder={s.tasks.noNote}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== (task.note ?? "") && onSave(text)}
        />
      </label>
      {task.files.length > 0 && (
        <div>
          <h4 className="mb-1 font-medium text-muted">{s.tasks.files}</h4>
          <ul className="flex flex-col gap-0.5">
            {task.files.map((f) => (
              <li key={f} title={f} className="selectable flex items-center gap-1.5 truncate text-ink-2">
                <FileText size={12} className="shrink-0" aria-hidden /> {f.split("/").at(-1)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
