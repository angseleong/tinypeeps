// The window's chrome: the Rubber dock on the left and the Morph island on top, rebuilt from
// DesignBookmark's Motion Studies (designbookmark.com/motion) with the same springs.
import { Check, type LucideIcon, Square, TriangleAlert } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Activity } from "../core/activity";
import { ActivityIcon } from "./activity-ui";
import { cx, springs } from "./ui";

const TAB = 46;
const GAP = 4;
const PAD = 6;
const topOf = (i: number) => PAD + i * (TAB + GAP);

// Rubber dock: the pill's two edges are separate springs. The edge facing the move is stiff (lead),
// the other is lazy (trail), so moving between pages stretches the pill like rubber, then it settles.
export function RubberDock<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { id: T; label: string; icon: LucideIcon }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const index = Math.max(
    0,
    items.findIndex((x) => x.id === active),
  );
  const top = useMotionValue(topOf(index));
  const bottom = useMotionValue(topOf(index) + TAB);
  const height = useTransform(() => bottom.get() - top.get());
  const last = useRef(index);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const dir = Math.sign(index - last.current);
    last.current = index;
    const t = topOf(index);
    // Moving down, the bottom edge leads; moving up, the top edge leads.
    const a = animate(top, t, dir > 0 ? springs.trail : springs.lead);
    const b = animate(bottom, t + TAB, dir > 0 ? springs.lead : springs.trail);
    return () => {
      a.stop();
      b.stop();
    };
  }, [index, top, bottom]);

  return (
    <nav className="no-drag absolute top-1/2 left-3 z-40 -translate-y-1/2 rounded-[29px] bg-surface p-[6px]" aria-label="TinyPeeps">
      <motion.span className="absolute right-[6px] left-[6px] rounded-full bg-inverse" style={{ top, height }} aria-hidden />
      <div className="relative flex flex-col" style={{ gap: GAP }}>
        {items.map((it, i) => (
          <DockButton key={it.id} item={it} on={i === index} onClick={() => onChange(it.id)} onHover={(v) => setHover(v ? i : null)} />
        ))}
      </div>
      <AnimatePresence>
        {hover !== null && (
          <motion.span
            key={hover}
            initial={{ opacity: 0, x: -6, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: springs.fade }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="pointer-events-none absolute left-[66px] rounded-full bg-object px-3 py-1 text-[12px] font-medium whitespace-nowrap"
            style={{ top: topOf(hover) + TAB / 2 - 13 }}
          >
            {items[hover].label}
          </motion.span>
        )}
      </AnimatePresence>
    </nav>
  );
}

function DockButton({
  item,
  on,
  onClick,
  onHover,
}: {
  item: { label: string; icon: LucideIcon };
  on: boolean;
  onClick: () => void;
  onHover: (v: boolean) => void;
}) {
  const scale = useMotionValue(1);
  useEffect(() => {
    // Pop on select: a kick of velocity into the pop spring.
    if (on) animate(scale, 1, { ...springs.pop, velocity: -3.2 });
  }, [on, scale]);
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-label={item.label}
      aria-current={on ? "page" : undefined}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className={cx("grid place-items-center rounded-full transition-colors duration-200", on ? "text-on-inverse" : "text-muted hover:text-ink")}
      style={{ width: TAB, height: TAB }}
    >
      <motion.span style={{ scale }} className="grid place-items-center">
        <Icon size={20} strokeWidth={1.8} />
      </motion.span>
    </button>
  );
}

export type IslandState =
  | { kind: "idle"; title: string; detail: string }
  | { kind: "work"; key: string; name: string; color: string; activity: Activity; text: string }
  | { kind: "done"; key: string; name: string; color: string; text: string; end: "ok" | "stopped" | "failed" }
  | { kind: "notice"; key: string; text: string };

const SIZE: Record<IslandState["kind"], [number, number]> = { idle: [220, 34], work: [360, 44], done: [340, 54], notice: [380, 44] };

// Morph island: one grey pill whose width and height are springs. Width is stiffer than height, so
// every change lands sideways first and then drops into place; the content cross-fades through a blur.
export function MorphIsland({ state, onClick }: { state: IslandState; onClick: () => void }) {
  const [w, h] = SIZE[state.kind];
  const width = useMotionValue(w);
  const height = useMotionValue(h);
  const radius = useTransform(height, (v) => Math.min(v / 2, 22));
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const grow = w * h > width.get() * height.get();
    const a = animate(width, w, { type: "spring", stiffness: 380, damping: 24 });
    const b = animate(height, h, { type: "spring", stiffness: grow ? 300 : 390, damping: 22 });
    return () => {
      a.stop();
      b.stop();
    };
  }, [w, h, width, height]);

  const key = state.kind === "idle" ? `idle-${state.title}-${state.detail}` : state.key;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      animate={{ scale: pressed ? 0.96 : 1 }}
      transition={springs.pop}
      style={{ width, height, borderRadius: radius }}
      className="no-drag absolute top-[9px] left-1/2 z-40 -translate-x-1/2 overflow-hidden bg-object"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { delay: 0.09, duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(6px)", transition: { duration: 0.14 } }}
          className="absolute inset-0 flex items-center gap-2.5 px-3.5 whitespace-nowrap"
        >
          <IslandContent state={state} />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

function Avatar({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {name[0]}
    </span>
  );
}

function IslandContent({ state }: { state: IslandState }): ReactNode {
  switch (state.kind) {
    case "idle":
      return (
        <>
          <span className="size-[7px] shrink-0 rounded-full bg-accent" />
          <span className="truncate text-[12px] font-semibold">{state.title}</span>
          <span className="ml-auto truncate text-[12px] text-muted">{state.detail}</span>
        </>
      );
    case "work":
      return (
        <>
          <Avatar name={state.name} color={state.color} />
          <span className="text-[13px] font-semibold">{state.name}</span>
          <ActivityIcon activity={state.activity} size={14} />
          <span className="min-w-0 flex-1 truncate text-left text-[12px] text-muted">{state.text}</span>
        </>
      );
    case "done":
      return (
        <>
          <span
            className={cx(
              "grid size-7 shrink-0 place-items-center rounded-full",
              state.end === "ok" ? "bg-good text-black" : state.end === "failed" ? "bg-stuck text-white" : "bg-fill-2 text-ink",
            )}
          >
            {state.end === "ok" ? (
              <Check size={15} strokeWidth={2.6} />
            ) : state.end === "failed" ? (
              <TriangleAlert size={14} strokeWidth={2.4} />
            ) : (
              <Square size={12} strokeWidth={2.6} />
            )}
          </span>
          <span className="text-left leading-tight">
            <b className="block text-[13px] font-semibold">{state.name}</b>
            <span className="block text-[12px] text-muted">{state.text}</span>
          </span>
          <Avatar name={state.name} color={state.color} size={22} />
        </>
      );
    case "notice":
      return (
        <>
          <span className="size-[7px] shrink-0 rounded-full bg-wait" />
          <span className="min-w-0 flex-1 truncate text-left text-[12px]">{state.text}</span>
        </>
      );
  }
}
