// The Task board (`.tinypeeps/board.json`): Goals split into Tasks by the Manager, run by Peeps,
// reviewed by the Manager (ADR 6), with a Handoff Note per Task (ADR 4). Pure code: the Engine does the
// running and the files; this decides what a run's or a review's text means for the Task.
import { MODELS, type Model, type Role, TOOLS } from "./roles";

export type TaskStatus = "backlog" | "working" | "review" | "done";
export const STATUSES: TaskStatus[] = ["backlog", "working", "review", "done"];

export type Review = { verdict: "pass" | "changes" | null; text: string; at: number };

export type Task = {
  id: string;
  title: string;
  detail: string;
  goal?: string;
  peepId: string | null;
  model?: Model;
  why?: string;
  status: TaskStatus;
  // Started by the CEO, or by the Manager with autonomy on. A Backlog Task without it waits.
  go: boolean;
  // Ran once more on the stronger model after the Manager asked for Changes; never twice (ADR 6).
  escalated?: boolean;
  reviewing?: boolean;
  // The Manager gave no Pass after the Escalation, or no verdict at all: the CEO decides.
  needsCeo?: boolean;
  note?: string;
  files: string[];
  reviews: Review[];
  suggestTools?: string[];
  // Handed over while working: goes to this Peep once the current run has stopped.
  handTo?: string;
  error?: string;
  createdAt: number;
};

export type RunEnd = { text?: string; error?: string; files: string[] };

const NOTE_WORDS = 150;
const STRONGER: Record<Model, Model> = { haiku: "sonnet", sonnet: "opus", opus: "opus" };

export const newTaskId = (now = Date.now(), i = 0) => `t-${now.toString(36)}-${i}`;

// The model a Task runs on: the Manager's pick, then after Changes the Role's `escalate_to`.
export function runModel(t: Task, role: Role): Model {
  const base = t.model ?? role.model;
  return t.escalated ? (role.escalate_to ?? STRONGER[base]) : base;
}

// The Manager ends its plan with one ```tasks block holding a JSON list (see planPrompt).
export function parsePlan(text: string, team: string[], goal: string, now = Date.now()): Task[] {
  const blocks = [...text.matchAll(/```(?:tasks|json)?\s*\n([\s\S]*?)```/g)];
  const raw = blocks.at(-1)?.[1];
  if (!raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof x.title === "string" && !!x.title.trim())
    .slice(0, 8)
    .map((x, i) => ({
      id: newTaskId(now, i),
      title: String(x.title).trim(),
      detail: typeof x.detail === "string" ? x.detail.trim() : "",
      goal,
      peepId: typeof x.peep === "string" && team.includes(x.peep) ? x.peep : null,
      model: MODELS.includes(x.model as Model) ? (x.model as Model) : undefined,
      why: typeof x.why === "string" ? x.why.trim() : undefined,
      status: "backlog",
      go: false,
      files: [],
      reviews: [],
      createdAt: now,
    }));
}

// The note is the part of the Peep's last message under a "Handoff Note" heading, or the whole
// message when it wrote none; either way at most about 150 words.
export function handoffNote(text: string): string {
  const m = /^#{1,4}\s*(?:handoff note|catatan serah terima)[^\n]*\n([\s\S]*)$/im.exec(text);
  const body = (m ? m[1] : text).trim();
  const words = body.split(/\s+/);
  return words.length > NOTE_WORDS ? `${words.slice(0, NOTE_WORDS).join(" ")}…` : body;
}

export function parseVerdict(text: string): "pass" | "changes" | null {
  const all = [...text.matchAll(/verdict\s*:\s*\**\s*(pass|changes)/gi)];
  const v = all.at(-1)?.[1].toLowerCase();
  return v === "pass" || v === "changes" ? v : null;
}

export function parseSuggestTools(text: string): string[] {
  const names = [...text.matchAll(/suggest tool\s*:\s*\**\s*(\w+)/gi)].map((m) => m[1].toLowerCase());
  return TOOLS.filter((t) => names.includes(t.toLowerCase()));
}

// What the Peep's run means for its Task: a failed run goes back to Backlog and waits for the CEO.
export function afterRun(t: Task, r: RunEnd): Task {
  const files = [...new Set([...t.files, ...r.files])];
  if (r.error && t.handTo) return { ...t, status: "backlog", peepId: t.handTo, handTo: undefined, go: true, error: undefined, files };
  // "Stop and do this first" puts the Task back to resume after; any other failure waits for the CEO.
  if (r.error) return { ...t, status: "backlog", go: r.error === "interrupted", error: r.error === "interrupted" ? undefined : r.error, files };
  return { ...t, status: "review", note: handoffNote(r.text ?? ""), files, error: undefined, needsCeo: false };
}

// Pass → Done. Changes → once more on the stronger model with the list. Changes again, no verdict,
// or a review that never finished → the CEO decides.
export function afterReview(t: Task, r: RunEnd, now = Date.now()): Task {
  const text = (r.text ?? "").trim();
  const verdict = r.error ? null : parseVerdict(text);
  const reviews = [...t.reviews, { verdict, text: r.error ?? text, at: now }];
  const suggested = parseSuggestTools(text);
  const base = { ...t, reviews, reviewing: false, suggestTools: suggested.length ? suggested : t.suggestTools };
  if (verdict === "pass") return { ...base, status: "done", needsCeo: false };
  if (verdict === "changes" && !t.escalated) return { ...base, status: "backlog", go: true, escalated: true };
  return { ...base, needsCeo: true };
}

// After a restart nothing is running any more: Working Tasks go back to Backlog, unstarted.
export const recover = (tasks: Task[]): Task[] =>
  tasks.map((t) => (t.status === "working" ? { ...t, status: "backlog", go: false } : t.reviewing ? { ...t, reviewing: false } : t));

// What can start now: per Peep the oldest Backlog Task it may start, and one review for the Manager.
// shortcut: Tasks of one Goal have no order between them, so a writer may start before the research it
// needs; add an "after" to the plan when that shows up in real Offices.
export function nextJobs(tasks: Task[], busy: (peepId: string) => boolean, manager: string): { start: Task[]; review: Task | null } {
  const taken = new Set(tasks.filter((t) => t.status === "working").map((t) => t.peepId));
  const start: Task[] = [];
  for (const t of tasks) {
    if (t.status !== "backlog" || !t.go || !t.peepId || taken.has(t.peepId) || busy(t.peepId)) continue;
    taken.add(t.peepId);
    start.push(t);
  }
  const reviewing = tasks.some((t) => t.reviewing);
  const review = reviewing || busy(manager) ? null : (tasks.find((t) => t.status === "review" && !t.needsCeo) ?? null);
  return { start, review };
}

// The prompts below are for the model, so they stay in English; each Role's brief says which
// language to answer in.

export function planPrompt(goal: string, team: Role[]): string {
  const people = team.map((r) => `- ${r.id}: ${r.name}, ${r.title}, default model ${r.model}`).join("\n");
  return `Plan this Goal. This is planning, not the Kickoff: ask no questions; where something is unclear, pick the likeliest answer and say so in that Task's "why". Don't do the work and don't change any files; read docs/brief.md first if it exists.

Goal: ${goal}

Team (id: name, job, default model):
${people}

Split the Goal into the fewest Tasks that get it done (1 to 6), each one a single Peep can finish alone in one session. For each, pick the Peep and the cheapest model that does it well, with a one-line reason. End your reply with exactly one block like this:

\`\`\`tasks
[{"title": "short title", "peep": "<id>", "model": "haiku|sonnet|opus", "why": "one line", "detail": "what to do, and when it's done"}]
\`\`\``;
}

export function taskPrompt(t: Task, related: Task[]): string {
  const parts = [`Your Task: ${t.title}`, t.detail];
  const notes = related.filter((r) => r.note).map((r) => `### ${r.title}\n${r.note}`);
  if (notes.length) parts.push(`Handoff Notes from related Tasks:\n\n${notes.join("\n\n")}`);
  const changes = t.reviews.filter((r) => r.verdict === "changes").at(-1);
  if (t.escalated && changes) parts.push(`The Manager reviewed the first try and asked for these changes:\n\n${changes.text}`);
  if (t.escalated && t.note) parts.push(`The first try's Handoff Note:\n\n${t.note}`);
  parts.push(
    `When you finish, end your reply with a section headed "## Handoff Note" of at most 150 words: what you did, where the result is, what's left. If you couldn't do something because you lacked a tool, name the tool.`,
  );
  return parts.filter(Boolean).join("\n\n");
}

export function reviewPrompt(t: Task, peep: Role | undefined): string {
  return `Review this finished Task with the review Skill. Don't change any files.

Task: ${t.title}
${t.detail}
Done by: ${peep ? `${peep.name} (${peep.title})` : "?"}${t.escalated ? ", second try on a stronger model" : ""}

Their Handoff Note:
${t.note || "(none)"}

Files they wrote or edited: ${t.files.length ? t.files.join(", ") : "none"}

End your reply with one line "Verdict: Pass" or "Verdict: Changes", with the numbered Changes list above it. If the Handoff Note says they lacked a tool, add a line "Suggest tool: <ToolName>".`;
}

export type BoardAction =
  | { kind: "assign"; id: string; peepId: string }
  | { kind: "start"; id: string }
  | { kind: "accept"; id: string }
  | { kind: "backlog"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "review"; id: string }
  | { kind: "handover"; id: string; peepId: string }
  | { kind: "note"; id: string; text: string };

// The CEO's moves on the board. Running Tasks are left alone, except by Stop.
export function act(tasks: Task[], a: BoardAction): Task[] {
  if (a.kind === "remove") return tasks.filter((t) => t.id !== a.id || t.status === "working");
  return tasks.map((t) => {
    if (t.id !== a.id) return t;
    switch (a.kind) {
      case "assign":
        return t.status === "working" ? t : { ...t, peepId: a.peepId, status: "backlog", go: true, needsCeo: false };
      case "handover":
        return t.status === "working" ? { ...t, handTo: a.peepId } : { ...t, peepId: a.peepId, status: "backlog", go: true, needsCeo: false };
      case "review":
        return t.status === "working" || t.reviewing ? t : { ...t, status: "review", needsCeo: false };
      case "start":
        return t.status === "backlog" && t.peepId ? { ...t, go: true } : t;
      case "accept":
        return t.status === "working" ? t : { ...t, status: "done", needsCeo: false };
      case "backlog":
        return t.status === "working" ? t : { ...t, status: "backlog", go: false, needsCeo: false };
      case "note":
        return { ...t, note: a.text };
    }
    return t;
  });
}
