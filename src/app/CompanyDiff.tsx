import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { lineDiff } from "../core/company";
import type { Strings } from "../core/strings";
import { Button, cx, exitFast, springs } from "./ui";

// Haiku shortened the Company Note: what went and what came, line by line, with a sign as well as a
// colour, so the CEO can keep it or undo it.
export function CompanyDiff({ s, before, after, onKeep, onUndo }: { s: Strings; before: string; after: string; onKeep: () => void; onUndo: () => void }) {
  return (
    <motion.div
      role="dialog"
      aria-label={s.company.title}
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: springs.soft }}
      exit={{ opacity: 0, y: 8, transition: exitFast }}
      className="no-drag absolute top-[72px] left-1/2 z-40 flex max-h-[calc(100%-140px)] w-[min(620px,calc(100%-200px))] -translate-x-1/2 flex-col gap-3 rounded-card bg-card p-5"
    >
      <div>
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{s.company.title}</h2>
        <p className="mt-1 text-[13px] text-muted">{s.company.sub}</p>
      </div>
      <ol className="selectable min-h-0 flex-1 overflow-auto rounded-tile bg-fill-1 p-3 text-[12.5px] leading-relaxed">
        {lineDiff(before.trim(), after.trim()).map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines repeat, their place is their identity
          <li key={i} className={cx("flex gap-2 rounded px-1.5", l.op === "del" && "text-stuck line-through", l.op === "add" && "bg-good-soft text-good-text")}>
            <span className="w-3 shrink-0">
              {l.op === "del" ? <Minus size={11} className="mt-1" aria-hidden /> : l.op === "add" ? <Plus size={11} className="mt-1" aria-hidden /> : null}
              {l.op !== "same" && <span className="sr-only">{l.op === "del" ? s.company.removed : s.company.added}</span>}
            </span>
            <span className="whitespace-pre-wrap">{l.text || " "}</span>
          </li>
        ))}
      </ol>
      <div className="flex justify-end gap-2">
        <Button onClick={onUndo}>{s.company.undo}</Button>
        <Button variant="primary" onClick={onKeep}>
          {s.company.keep}
        </Button>
      </div>
    </motion.div>
  );
}
