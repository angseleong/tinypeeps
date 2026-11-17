import { ArrowUp, Square, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";
import { MODELS, type Model, type Role } from "../../../core/roles";
import type { Settings } from "../../../core/settings";
import type { Strings } from "../../../core/strings";
import { labelText } from "../../../core/strings";
import { savingPercent, since, startOfToday, totals, type UsageRecord, weekAgo } from "../../../core/usage";
import { ActivityIcon, ActivityPill, isWorking, StatusDot } from "../activity-ui";
import { Office } from "../Office";
import { type Peep, type Room, type Runtime, roomAt, type Vec2 } from "../office-data";
import { Button, Chip, CountUp, compact, cx, exitFast, inputClass, ModelBadge, Segmented, springs, Toggle } from "../ui";

type Props = {
  s: Strings;
  active: boolean;
  dark: boolean;
  reduced: boolean;
  peeps: Peep[];
  usage: UsageRecord[];
  settings: Settings;
  sim: boolean;
  setSim: (v: boolean) => void;
  run: (peepId: string, prompt: string) => void;
  patch: (id: string, fn: (p: Runtime) => Partial<Runtime>) => void;
  saveRole: (r: Role) => void;
  commandRef: RefObject<HTMLInputElement | null>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

type Drop = { peepId: string; room: Room | null; near: Peep | null };

// Panels open the way DesignBookmark's do: rising out of a slight blur on the soft spring.
const panelIn = {
  initial: { opacity: 0, y: 14, scale: 0.97, filter: "blur(5px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: springs.soft },
  exit: { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)", transition: exitFast },
};

export function OfficePage(p: Props) {
  const { s, peeps, selectedId, setSelectedId } = p;
  const [drop, setDrop] = useState<Drop | null>(null);

  const onDrop = (peepId: string, at: Vec2) => {
    const near = peeps.find((o) => o.id !== peepId && Math.hypot(o.desk[0] - at[0], o.desk[1] - at[1]) < 1.6) ?? null;
    p.patch(peepId, () => ({ dropAt: at }));
    setDrop({ peepId, room: roomAt(at), near });
  };
  const cancelDrop = () => {
    if (drop) p.patch(drop.peepId, () => ({ dropAt: null }));
    setDrop(null);
  };

  const selected = peeps.find((x) => x.id === selectedId) ?? null;

  return (
    <div className="absolute inset-0">
      <Office s={s} active={p.active} dark={p.dark} reduced={p.reduced} peeps={peeps} selectedId={selectedId} onSelect={setSelectedId} onDrop={onDrop} />

      <Hud s={s} usage={p.usage} peeps={peeps} max={p.settings.concurrency} sim={p.sim} setSim={p.setSim} hidden={!!selected} />
      <Roster s={s} peeps={peeps} selectedId={selectedId} onSelect={(id) => setSelectedId(selectedId === id ? null : id)} />

      <AnimatePresence>
        {drop && (
          <DropPopover
            key={drop.peepId}
            s={s}
            drop={drop}
            peeps={peeps}
            onCancel={cancelDrop}
            onSend={(prompt) => {
              p.run(drop.peepId, prompt);
              setDrop(null);
            }}
            onStop={() => {
              window.tiny.stop(drop.peepId);
              cancelDrop();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <Inspector
            key={selected.id}
            s={s}
            peep={selected}
            onClose={() => setSelectedId(null)}
            onModel={(m) => p.saveRole({ ...selected, model: m })}
            onStop={() => window.tiny.stop(selected.id)}
          />
        )}
      </AnimatePresence>

      <PromptBox s={s} peeps={peeps} onSend={p.run} inputRef={p.commandRef} />
    </div>
  );
}

function Hud({
  s,
  usage,
  peeps,
  max,
  sim,
  setSim,
  hidden,
}: {
  s: Strings;
  usage: UsageRecord[];
  peeps: Peep[];
  max: number;
  sim: boolean;
  setSim: (v: boolean) => void;
  hidden: boolean;
}) {
  const today = totals(since(usage, startOfToday()));
  const saved = savingPercent(totals(since(usage, weekAgo())));
  const working = peeps.filter((x) => isWorking(x.activity)).length;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: hidden ? 0 : 1, x: hidden ? 20 : 0, transition: springs.soft }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
      className="no-drag absolute top-[60px] right-4 z-20 w-[300px] rounded-panel bg-card p-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-tile bg-fill-1 p-3">
          <div className="text-[11px] text-muted first-letter:uppercase">{s.hud.today}</div>
          <div className="mt-0.5 text-[22px] leading-tight font-semibold tracking-[-0.02em]">
            <CountUp value={today.fresh} format={compact} />
          </div>
        </div>
        <div className="rounded-tile bg-fill-1 p-3">
          <div className="text-[11px] text-muted first-letter:uppercase">{s.hud.saved}</div>
          <div className="mt-0.5 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-good-text">
            <CountUp value={saved} format={(n) => `${Math.round(n)}%`} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 pt-2.5 pb-1 text-[12px] text-muted">
        <span>{s.hud.working(working, max)}</span>
        <span>
          {s.hud.approvals} <b className="font-semibold text-ink">0</b>
        </span>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 text-[13px]">
        <span className="text-ink-2">{s.office.simulation}</span>
        <Toggle on={sim} onChange={setSim} label={s.office.simulation} />
      </div>
    </motion.div>
  );
}

// Everyone at a glance, bottom left: who works, who's stuck, who's having coffee.
function Roster({ s, peeps, selectedId, onSelect }: { s: Strings; peeps: Peep[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="no-drag absolute bottom-[92px] left-[88px] z-20 flex flex-col gap-1.5">
      {peeps.map((p, i) => (
        <motion.button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          initial={{ opacity: 0, x: -14, filter: "blur(4px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { ...springs.soft, delay: 0.15 + i * 0.045 } }}
          whileTap={{ scale: 0.96 }}
          className={cx(
            "flex h-10 items-center gap-2.5 rounded-full pr-4 pl-1.5 text-left transition-colors duration-200",
            selectedId === p.id ? "bg-inverse text-on-inverse" : "bg-object hover:bg-surface",
          )}
        >
          <span className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: p.color }}>
            {p.name[0]}
          </span>
          <span className="text-[13px] font-medium">{p.name}</span>
          <span className={cx("flex items-center gap-1.5 text-[12px]", selectedId === p.id ? "opacity-70" : "text-muted")}>
            <ActivityIcon activity={p.activity} size={12} />
            {s.activity[p.activity]}
          </span>
          <StatusDot activity={p.activity} />
        </motion.button>
      ))}
    </div>
  );
}

function DropPopover({
  s,
  drop,
  peeps,
  onCancel,
  onSend,
  onStop,
}: {
  s: Strings;
  drop: Drop;
  peeps: Peep[];
  onCancel: () => void;
  onSend: (prompt: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => box.current?.focus(), []);
  const peep = peeps.find((x) => x.id === drop.peepId);
  if (!peep) return null;
  const near = drop.near;
  const nearContext = near?.lastText ? `\n\n${s.drop.lastResult(near.name, near.title)}\n${near.lastText.slice(0, 2000)}` : "";
  const actions: [string, string][] = [
    ...(near
      ? ([
          [s.drop.review(near.name), s.drop.reviewPrompt(near.name, near.title) + nearContext],
          [s.drop.direct(near.name), s.drop.directPrompt(near.name, near.title) + nearContext],
        ] as [string, string][])
      : []),
    ...(drop.room ? s.rooms[drop.room.id].actions : []),
  ];
  const where = near ? s.drop.near(near.name) : drop.room ? s.drop.room(s.rooms[drop.room.id].name) : s.drop.hallway;
  const withNote = (prompt: string) => prompt + (text.trim() ? `\n\n${s.drop.ceoNote} ${text.trim()}` : "");
  return (
    <motion.div
      {...panelIn}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      className="no-drag absolute bottom-[92px] left-1/2 z-30 flex w-[min(500px,calc(100%-200px))] -translate-x-1/2 flex-col gap-4 rounded-[24px] bg-card p-5"
    >
      <div className="flex items-center gap-3">
        <motion.span
          initial={{ scale: 0.6, rotate: -14 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={springs.pop}
          className="grid size-9 place-items-center rounded-full text-[15px] font-semibold text-white"
          style={{ background: peep.color }}
        >
          ?
        </motion.span>
        <div className="min-w-0 flex-1 text-[15px] font-semibold tracking-[-0.01em]">{s.drop.title(peep.name, where)}</div>
        <ModelBadge model={peep.model} />
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map(([label, prompt], i) => (
            <span key={label} className="enter-item" style={{ "--i": i } as CSSProperties}>
              <Chip onClick={() => onSend(withNote(prompt))}>{label}</Chip>
            </span>
          ))}
          {drop.room?.id === "lounge" && (
            <span className="enter-item" style={{ "--i": actions.length } as CSSProperties}>
              <Chip onClick={onStop}>{s.drop.takeBreak}</Chip>
            </span>
          )}
        </div>
      )}
      <textarea
        ref={box}
        className={`${inputClass} min-h-[72px] resize-none`}
        placeholder={s.drop.own}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>{s.drop.cancel}</Button>
        <Button variant="primary" disabled={!text.trim()} onClick={() => onSend(text + nearContext)}>
          {s.drop.send}
        </Button>
      </div>
    </motion.div>
  );
}

function Inspector({ s, peep, onClose, onModel, onStop }: { s: Strings; peep: Peep; onClose: () => void; onModel: (m: Model) => void; onStop: () => void }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 40, filter: "blur(5px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: springs.soft }}
      exit={{ opacity: 0, x: 24, transition: exitFast }}
      className="no-drag absolute top-[60px] right-4 bottom-[92px] z-30 flex w-[340px] flex-col overflow-hidden rounded-card bg-card"
    >
      <div className="flex items-center gap-3 p-5 pb-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full text-[16px] font-semibold text-white" style={{ background: peep.color }}>
          {peep.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-tight font-semibold tracking-[-0.01em]">{peep.name}</h2>
          <div className="text-[13px] text-muted capitalize">{peep.title}</div>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close" className="w-8 px-0">
          <X size={16} />
        </Button>
      </div>
      <div className="flex flex-col gap-2 px-5">
        <div className="flex items-center justify-between rounded-tile bg-fill-1 px-3.5 py-3 text-[13px]">
          <ActivityPill activity={peep.activity} label={s.activity[peep.activity]} />
          <span className="tabular text-muted">
            {compact(peep.tokens)} {s.panel.tokens}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1">
          <Segmented id={`model-${peep.id}`} value={peep.model} options={MODELS.map((m) => [m, m])} onChange={onModel} />
          <Button onClick={onStop}>
            <Square size={11} /> {s.panel.stop}
          </Button>
        </div>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-5 pb-5">
        <h3 className="text-[12px] font-medium text-muted">{s.panel.lastResult}</h3>
        <pre className="selectable max-h-56 shrink-0 overflow-auto rounded-tile bg-fill-1 p-3.5 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">
          {peep.lastText || s.panel.none}
        </pre>
        <h3 className="mt-2 text-[12px] font-medium text-muted">{s.panel.log}</h3>
        <ol className="flex flex-col gap-1 text-[13px]">
          {[...peep.log].reverse().map((l, i) => (
            <li key={`${l.t}-${l.text}`} className={cx("flex gap-2.5 rounded-row px-2.5 py-1.5", i === 0 ? "bg-fill-1 text-ink" : "text-muted")}>
              <span className="tabular shrink-0 text-[11px] leading-5 text-muted">
                {new Date(l.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="break-words">{labelText(s, l.text)}</span>
            </li>
          ))}
        </ol>
      </div>
    </motion.aside>
  );
}

function PromptBox({
  s,
  peeps,
  onSend,
  inputRef,
}: {
  s: Strings;
  peeps: Peep[];
  onSend: (peepId: string, prompt: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [to, setTo] = useState("bos");
  const [text, setText] = useState("");
  const target = peeps.find((x) => x.id === to);
  const ready = text.trim().length > 0;
  const send = () => {
    if (!ready) return;
    onSend(to, text);
    setText("");
  };
  return (
    <div className="no-drag pointer-events-none absolute right-4 bottom-4 left-[88px] z-20 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: springs.soft }}
        className="pointer-events-auto flex w-full max-w-[660px] items-center gap-2 rounded-[24px] bg-surface p-2"
      >
        <label className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-fill-2 pr-2 pl-1.5">
          <span
            className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: target?.color ?? "var(--accent)" }}
          >
            {target?.name[0] ?? "?"}
          </span>
          <select className="bg-transparent text-[13px] font-medium outline-none" value={to} onChange={(e) => setTo(e.target.value)}>
            {peeps.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {x.model}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={inputRef}
          className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[14px] outline-none placeholder:text-muted"
          placeholder={s.command.placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <span className="rounded-md bg-fill-1 px-1.5 py-0.5 text-[11px] text-muted">{s.command.hint}</span>
        <motion.button
          type="button"
          aria-label={s.command.send}
          onClick={send}
          disabled={!ready}
          animate={{ scale: ready ? 1 : 0.86, opacity: ready ? 1 : 0.35 }}
          whileTap={{ scale: 0.88 }}
          transition={springs.pop}
          className="grid size-10 place-items-center rounded-full bg-inverse text-on-inverse"
        >
          <ArrowUp size={18} strokeWidth={2.2} />
        </motion.button>
      </motion.div>
    </div>
  );
}
