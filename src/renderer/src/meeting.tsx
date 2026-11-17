// The Meeting Room panel (the Manager's Kickoff and "Meeting now") and the Hiring Plan sheet (ADR 8).
import { ArrowUp, Check, Plus, TriangleAlert, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Meeting } from "../../core/meeting";
import { HIRE_COLORS, MODELS, type Model, type Role } from "../../core/roles";
import type { Strings } from "../../core/strings";
import { Markdown } from "./Markdown";
import { Button, cx, exitFast, Segmented, springs } from "./ui";

const panelIn = {
  initial: { opacity: 0, x: -24, filter: "blur(6px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: springs.soft },
  exit: { opacity: 0, x: -16, filter: "blur(4px)", transition: exitFast },
};

const Avatar = ({ role, size = 28 }: { role: Pick<Role, "name" | "color"> | undefined; size?: number }) => (
  <span
    className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
    style={{ width: size, height: size, fontSize: size * 0.4, background: role?.color ?? "var(--accent)" }}
    aria-hidden
  >
    {role?.name[0] ?? "?"}
  </span>
);

// The Meeting Room: a full-height chat beside the office, read like a chat with Claude. The Manager's
// replies are Markdown; the CEO's lines sit in soft bubbles on the right.
export function MeetingPanel({
  s,
  meeting,
  manager,
  team,
  thinking,
  onSay,
  onClose,
}: {
  s: Strings;
  meeting: Meeting;
  manager: Role | undefined;
  team: Role[];
  thinking: boolean;
  onSay: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  // Braces matter: newer Chromium returns a Promise from scrollIntoView, and an effect must return nothing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when a line arrives or the Manager starts thinking
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [meeting.chat.length, thinking]);
  useEffect(() => {
    box.current?.focus();
  }, []);
  // The box grows with what's typed, up to about eight lines.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resize on every change of the text
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);
  const send = () => {
    if (!text.trim() || thinking) return;
    onSay(text.trim());
    setText("");
  };
  const people = meeting.attendees.map((n) => team.find((r) => r.name === n) ?? { name: n, color: "var(--muted)" });
  const empty = meeting.chat.length === 0 && !thinking;

  return (
    <motion.aside
      {...panelIn}
      aria-label={s.meeting.title}
      className="no-drag absolute top-[60px] bottom-4 left-[88px] z-30 flex w-[min(460px,calc(100%-460px))] min-w-[380px] flex-col overflow-hidden rounded-card bg-card"
    >
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className="flex -space-x-2">
          {people.slice(0, 4).map((p) => (
            <span key={p.name} className="rounded-full ring-2 ring-[var(--card)]">
              <Avatar role={p} size={30} />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] leading-tight font-semibold tracking-[-0.01em]">{meeting.kickoff ? s.meeting.kickoffTitle : s.meeting.title}</h2>
          <div className="truncate text-[12.5px] text-muted">{s.meeting.with(meeting.attendees.join(", "))}</div>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {s.meeting.close}
        </Button>
      </header>

      <div className="selectable scroll-thin min-h-0 flex-1 overflow-y-auto px-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 pb-10 text-center">
            <Avatar role={manager} size={52} />
            <div className="flex max-w-[300px] flex-col gap-1.5">
              <div className="text-[17px] font-semibold tracking-[-0.01em]">{meeting.kickoff ? s.meeting.kickoffHello : s.meeting.title}</div>
              <p className="text-[13.5px] leading-relaxed text-muted">{meeting.kickoff ? s.meeting.kickoffEmpty : s.meeting.empty}</p>
            </div>
            {meeting.kickoff && (
              <div className="flex flex-col items-center gap-1.5">
                {s.meeting.examples.map((ex, i) => (
                  <motion.button
                    key={ex}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { ...springs.fade, delay: 0.15 + i * 0.045 } }}
                    onClick={() => {
                      setText(ex);
                      box.current?.focus();
                    }}
                    className="rounded-full bg-fill-1 px-3.5 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-fill-2"
                  >
                    {ex}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-1 pb-4">
            {meeting.chat.map((l) =>
              l.from === "ceo" ? (
                <motion.div
                  key={`${l.t}-ceo`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: springs.fade }}
                  className="max-w-[85%] self-end rounded-[20px] rounded-br-[6px] bg-fill-2 px-4 py-2.5 text-[14px] leading-[1.55] whitespace-pre-wrap text-ink"
                >
                  {l.text}
                </motion.div>
              ) : (
                <motion.div
                  key={`${l.t}-manager`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: springs.fade }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar role={manager} size={22} />
                    <span className="text-[12.5px] font-semibold">{manager?.name}</span>
                  </div>
                  <Markdown text={l.text} />
                </motion.div>
              ),
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-[13px] text-muted">
                <Avatar role={manager} size={22} />
                <span className="thinking-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="sr-only" role="status">
                  {s.meeting.thinking}
                </span>
              </div>
            )}
            <div ref={end} />
          </div>
        )}
      </div>

      <div className="p-3 pt-1">
        <div className="flex items-end gap-2 rounded-[22px] bg-surface p-2 pl-4">
          <textarea
            ref={box}
            rows={1}
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-2 text-[14px] leading-[1.5] outline-none placeholder:text-muted"
            placeholder={meeting.kickoff && empty ? s.meeting.kickoffPlaceholder : s.meeting.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <motion.button
            type="button"
            aria-label={s.meeting.send}
            onClick={send}
            disabled={!text.trim() || thinking}
            animate={{ scale: text.trim() && !thinking ? 1 : 0.86, opacity: text.trim() && !thinking ? 1 : 0.35 }}
            whileTap={{ scale: 0.88 }}
            transition={springs.pop}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse"
          >
            <ArrowUp size={17} strokeWidth={2.2} />
          </motion.button>
        </div>
        <div className="px-3 pt-1.5 text-[11px] text-muted">{s.meeting.hint}</div>
      </div>
    </motion.aside>
  );
}

// The CEO edits the Manager's proposal before anyone is hired: name, job, model and Skills per card,
// or a card removed. "Ask for changes" sends a note back to the Manager instead.
export function HiringSheet({
  s,
  office,
  hires,
  onApprove,
  onChanges,
  onClose,
}: {
  s: Strings;
  office: string;
  hires: Role[];
  onApprove: (hires: Role[]) => void;
  onChanges: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(hires);
  const [missing, setMissing] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const allSkills = draft.flatMap((h) => h.skills).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check only when the set of Skills changes
  useEffect(() => {
    window.tiny
      .missingSkills(
        office,
        draft.flatMap((h) => h.skills),
      )
      .then(setMissing);
  }, [office, allSkills]);
  const edit = (id: string, patch: Partial<Role>) => setDraft((d) => d.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.18 } }}
      exit={{ opacity: 0, transition: exitFast }}
      className="no-drag absolute inset-0 z-40 grid place-items-center bg-black/45 p-8"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 18, scale: 0.97, filter: "blur(6px)" }}
        animate={{ y: 0, scale: 1, filter: "blur(0px)", transition: springs.soft }}
        exit={{ y: 10, scale: 0.98, transition: exitFast }}
        className="flex max-h-full w-[min(980px,100%)] flex-col overflow-hidden rounded-[28px] bg-card"
        role="dialog"
        aria-modal
        aria-label={s.hiring.title}
      >
        <header className="flex items-start gap-3 px-7 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{s.hiring.title}</h2>
              <span className="rounded-full bg-fill-2 px-2.5 py-0.5 text-[12px] font-medium text-ink-2 tabular">{draft.length}</span>
            </div>
            <p className="mt-1 text-[13.5px] text-muted">{s.hiring.sub}</p>
          </div>
          <Button onClick={onClose} aria-label="Close" className="size-9 px-0! text-ink-2">
            <X size={22} strokeWidth={2} />
          </Button>
        </header>

        <div className="grid min-h-0 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 overflow-y-auto px-7 pb-5">
          {draft.map((h, i) => (
            <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { ...springs.fade, delay: 0.06 + i * 0.045 } }}>
              <HireCard
                s={s}
                hire={h}
                color={HIRE_COLORS[i % HIRE_COLORS.length]}
                missing={missing}
                onEdit={(p) => edit(h.id, p)}
                onRemove={() => setDraft((d) => d.filter((x) => x.id !== h.id))}
              />
            </motion.div>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-2 bg-fill-1 px-7 py-4">
          <input
            className="h-10 min-w-[220px] flex-1 rounded-full bg-card px-4 text-[13.5px] outline-none placeholder:text-muted"
            placeholder={s.hiring.changesPlaceholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && note.trim() && onChanges(note.trim())}
          />
          <Button disabled={!note.trim()} onClick={() => onChanges(note.trim())}>
            {s.hiring.changes}
          </Button>
          <Button variant="primary" disabled={!draft.length} onClick={() => onApprove(draft)}>
            <Check size={14} /> {s.hiring.approve(draft.length)}
          </Button>
        </footer>
      </motion.div>
    </motion.div>
  );
}

function HireCard({
  s,
  hire,
  color,
  missing,
  onEdit,
  onRemove,
}: {
  s: Strings;
  hire: Role;
  color: string;
  missing: string[];
  onEdit: (p: Partial<Role>) => void;
  onRemove: () => void;
}) {
  const [skill, setSkill] = useState("");
  const add = () => {
    const v = skill.trim();
    if (v && !hire.skills.includes(v)) onEdit({ skills: [...hire.skills, v] });
    setSkill("");
  };
  const field = "w-full rounded-[10px] bg-transparent px-2 py-1 outline-none transition-colors hover:bg-fill-1 focus:bg-fill-1";
  return (
    <div className="flex h-full flex-col gap-3 rounded-[20px] bg-fill-1 p-4">
      <div className="flex items-start gap-3">
        <Avatar role={{ name: hire.name || "?", color }} size={40} />
        <div className="min-w-0 flex-1">
          <input
            aria-label={s.hiring.name}
            className={`${field} -ml-2 text-[16px] font-semibold tracking-[-0.01em]`}
            value={hire.name}
            onChange={(e) => onEdit({ name: e.target.value })}
          />
          <input
            aria-label={s.hiring.jobTitle}
            className={`${field} -ml-2 text-[13px] text-muted`}
            value={hire.title}
            onChange={(e) => onEdit({ title: e.target.value })}
          />
        </div>
        <Button variant="ghost" onClick={onRemove} aria-label={s.hiring.remove} title={s.hiring.remove} className="size-8 px-0! text-ink-2">
          <X size={20} strokeWidth={2} />
        </Button>
      </div>
      {hire.why && <p className="rounded-tile bg-card px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">{hire.why}</p>}
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted">{s.hiring.model}</div>
        <Segmented id={`hire-model-${hire.id}`} value={hire.model} options={MODELS.map((m) => [m, m])} onChange={(m: Model) => onEdit({ model: m })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted">{s.hiring.skills}</div>
        <div className="flex flex-wrap gap-1.5">
          {hire.skills.map((k) => {
            const gone = missing.includes(k);
            return (
              <span
                key={k}
                className={cx("inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-2.5 text-[12px]", gone ? "bg-wait/15 text-wait" : "bg-card")}
                title={gone ? s.hiring.missing : undefined}
              >
                {gone && <TriangleAlert size={11} aria-hidden />}
                {k}
                <button
                  type="button"
                  aria-label={`${s.hiring.remove} ${k}`}
                  onClick={() => onEdit({ skills: hire.skills.filter((x) => x !== k) })}
                  className="grid size-5 place-items-center rounded-full hover:bg-fill-2"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1 rounded-full bg-card pr-1 pl-2.5">
            <input
              className="w-[96px] bg-transparent py-1 text-[12px] outline-none placeholder:text-muted"
              placeholder={s.hiring.addSkill}
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button type="button" aria-label={s.hiring.addSkill} onClick={add} className="grid size-5 place-items-center rounded-full hover:bg-fill-2">
              <Plus size={11} />
            </button>
          </span>
        </div>
        {hire.skills.some((k) => missing.includes(k)) && <p className="text-[11.5px] text-wait">{s.hiring.missingHint}</p>}
      </div>
    </div>
  );
}
