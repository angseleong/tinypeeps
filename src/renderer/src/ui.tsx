// The parts every page is built from (docs/design-system.md). Material and springs follow
// DesignBookmark's Motion Studies: layered solid surfaces, no strokes, no shadows, and named springs
// ("stiffness damping", mass 1) so everything moves with the same feel.
import { animate, type HTMLMotionProps, motion, type Transition, useMotionValue, useTransform, type Variants } from "motion/react";
import { type ReactNode, useEffect } from "react";
import type { Family } from "../../core/usage";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const sp = (stiffness: number, damping: number): Transition => ({ type: "spring", stiffness, damping, mass: 1 });
export const springs = {
  follow: sp(900, 50), // held by the pointer: no overshoot, no lag
  settle: sp(280, 22), // letting go, landing on a value: one small overshoot
  soft: sp(260, 24), // large moves: panels, sheets
  lead: sp(620, 36), // stretchy highlight: the edge facing the move
  trail: sp(190, 19), // stretchy highlight: the edge that lags, this makes the stretch
  pop: sp(520, 16), // icon or number pop on select
  fade: sp(420, 32), // opacity and small slides
};
export const STAGGER = 0.045;
// Kept for older callers: the general spring and a quick exit.
export const spring = springs.fade;
export const enter = springs.fade;
export const exitFast: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };

export const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springs.fade },
};

// A page: its title under the island, cards rising in one after another.
export function Page({ title, sub, actions, children }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="h-full overflow-auto bg-stage">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: STAGGER, delayChildren: 0.03 } } }}
        className="mx-auto max-w-[1180px] pt-[72px] pr-8 pb-16 pl-[112px]"
      >
        <motion.header variants={rise} className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
            {sub && <p className="mt-1.5 max-w-[620px] text-[13px] text-muted">{sub}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </motion.header>
        {children}
      </motion.div>
    </div>
  );
}

export function Card({ children, className, title, aside }: { children: ReactNode; className?: string; title?: ReactNode; aside?: ReactNode }) {
  return (
    <motion.section variants={rise} className={cx("rounded-card bg-card p-5", className)}>
      {(title || aside) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-[13px] font-medium text-muted">{title}</h3>}
          {aside}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function Tile({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-tile bg-fill-1 p-3.5", className)}>{children}</div>;
}

// A number that rolls to its new value on a spring (Stat card).
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (n) => format(n));
  useEffect(() => {
    const c = animate(mv, value, { type: "spring", stiffness: 160, damping: 22 });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className="tabular">{text}</motion.span>;
}

export function Stat({
  label,
  value,
  format,
  sub,
  delta,
}: {
  label: ReactNode;
  value: number;
  format?: (n: number) => string;
  sub?: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <motion.section variants={rise} className="rounded-card bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] text-muted first-letter:uppercase">{label}</div>
        {delta && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[12px] font-semibold text-good-text tabular">{delta}</span>}
      </div>
      <div className="mt-1 text-[30px] leading-[1.15] font-semibold tracking-[-0.02em]">
        <CountUp value={value} format={format} />
      </div>
      {sub && <div className="mt-1 text-[12px] text-muted">{sub}</div>}
    </motion.section>
  );
}

export const FAMILY_COLOR: Record<Family, string> = {
  opus: "var(--m-opus)",
  sonnet: "var(--m-sonnet)",
  haiku: "var(--m-haiku)",
  fable: "var(--m-fable)",
  other: "var(--m-other)",
};
export const familyOfModel = (model: string): Family => (["opus", "sonnet", "haiku", "fable"] as const).find((x) => model.includes(x)) ?? "other";

export function ModelBadge({ model }: { model: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-fill-2 px-2.5 text-[12px] font-medium text-chip">
      <span className="size-[7px] rounded-full" style={{ background: FAMILY_COLOR[familyOfModel(model)] }} />
      {model}
    </span>
  );
}

type Variant = "primary" | "ghost" | "default";
export function Button({ variant = "default", className, ...p }: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={springs.pop}
      {...p}
      className={cx(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-35",
        variant === "primary" && "bg-inverse text-on-inverse",
        variant === "default" && "bg-fill-2 text-ink hover:bg-fill-3",
        variant === "ghost" && "text-muted hover:bg-fill-1 hover:text-ink",
        className,
      )}
    />
  );
}

export function Chip({ active, className, ...p }: HTMLMotionProps<"button"> & { active?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      transition={springs.pop}
      {...p}
      className={cx(
        "h-8 rounded-full px-3 text-[12px] font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40",
        active ? "bg-inverse text-on-inverse" : "bg-fill-2 text-chip hover:bg-fill-3 hover:text-ink",
        className,
      )}
    />
  );
}

// One choice out of a few: a pill slides under the chosen one.
export function Segmented<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-full bg-fill-1 p-[3px]">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cx(
            "relative h-7 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200",
            v === value ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          {v === value && (
            <motion.span
              layoutId={`seg-${id}`}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute inset-0 rounded-full bg-fill-3"
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

// On/off: the knob overshoots a little when it lands and widens while pressed.
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx("relative h-[26px] w-[42px] shrink-0 rounded-full transition-colors duration-200", on ? "bg-good" : "bg-fill-3")}
      whileTap="press"
    >
      <motion.span
        className="absolute top-[3px] left-[3px] block h-5 rounded-full bg-white"
        initial={false}
        animate={{ x: on ? 16 : 0, width: 20 }}
        variants={{ press: { width: 26, x: on ? 10 : 0 } }}
        transition={springs.settle}
      />
    </motion.button>
  );
}

// A settings-style row: what it is on the left, the control on the right.
export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-6 py-2">
      <div className="min-w-0">
        <div className="text-[14px] text-ink-2">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-row bg-fill-1 px-3.5 py-2.5 text-[14px] outline-none transition-colors duration-200 placeholder:text-muted focus:bg-fill-2";

// A labelled control. `group` is for several buttons (a Segmented): a <label> around them would
// press the first one whenever the label text is clicked.
export function Field({ label, hint, group, children }: { label: ReactNode; hint?: ReactNode; group?: boolean; children: ReactNode }) {
  const inner = (
    <>
      <span className="mb-1.5 block text-[12px] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] leading-relaxed text-muted">{hint}</span>}
    </>
  );
  return group ? (
    <fieldset className="m-0 block min-w-0 border-0 p-0" aria-label={typeof label === "string" ? label : undefined}>
      {inner}
    </fieldset>
  ) : (
    <label className="block">{inner}</label>
  );
}

// A bar, hidden from screen readers: every Meter has its value written beside it.
// It grows with scaleX on the settle spring, so it never reflows the layout.
export function Meter({ value, color = "var(--inverse)" }: { value: number; color?: string }) {
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-fill-2" aria-hidden>
      <motion.div
        className="h-full origin-left rounded-full"
        style={{ background: color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.min(1, Math.max(0, value)) }}
        transition={springs.settle}
      />
    </div>
  );
}

export const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : Math.round(n).toLocaleString());
export const usd = (n: number) => `$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`;
