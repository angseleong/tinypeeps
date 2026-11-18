// Runs the Task board: the Manager plans a Goal, Peeps work their Tasks, the Manager reviews each one,
// Changes are tried once more on the stronger model, and the rest goes to the CEO (ADR 6).
// What each result means is decided in src/core/board.ts; this does the runs and the files.
import {
  act,
  afterReview,
  afterRun,
  type BoardAction,
  nextJobs,
  parsePlan,
  planPrompt,
  recover,
  reviewPrompt,
  runModel,
  type Task,
  taskPrompt,
} from "../core/board";
import { MANAGER_ID, type Role } from "../core/roles";
import type { createEngine } from "./engine";
import { loadBoard, saveBoard } from "./store";

type Deps = {
  engine: ReturnType<typeof createEngine>;
  roles: (office: string) => Role[];
  autonomy: () => boolean;
  publish: (office: string, tasks: Task[]) => void;
  // Before a Task starts, e.g. to keep the Company Note short.
  beforeTask: (office: string) => void;
};

// The Manager only plans and reviews here, so it only reads (ADR 6).
const READ_ONLY = ["Read", "Grep", "Glob"];

export function createBoard(deps: Deps) {
  const boards = new Map<string, Task[]>();
  // Stop all: nothing starts on its own until the CEO does something on the board.
  const held = new Set<string>();
  // "Take a break": the Peep finishes its current Task, then gets no new one until the CEO gives it one.
  const breaks = new Set<string>();

  const get = (office: string) => {
    if (!boards.has(office)) boards.set(office, recover(loadBoard(office)));
    return boards.get(office) ?? [];
  };
  const set = (office: string, tasks: Task[]) => {
    boards.set(office, tasks);
    saveBoard(office, tasks);
    deps.publish(office, tasks);
  };
  const update = (office: string, id: string, fn: (t: Task) => Task) =>
    set(
      office,
      get(office).map((t) => (t.id === id ? fn(t) : t)),
    );

  function pump(office: string) {
    if (held.has(office)) return;
    const tasks = get(office);
    const { start, review } = nextJobs(tasks, (id) => breaks.has(`${office}\0${id}`) || deps.engine.busy(id), MANAGER_ID);
    const roles = deps.roles(office);
    if (start.length) deps.beforeTask(office);
    for (const t of start) {
      const role = roles.find((r) => r.id === t.peepId);
      if (!role) {
        update(office, t.id, (x) => ({ ...x, go: false, error: "no-role" }));
        continue;
      }
      const related = tasks.filter((x) => x.id !== t.id && x.goal === t.goal && x.note).slice(-5);
      const r = deps.engine.run(
        { office, peepId: role.id, prompt: taskPrompt(t, related), taskId: t.id, escalation: t.escalated },
        { role: { model: runModel(t, role) }, onEnd: (end) => update(office, t.id, (x) => afterRun(x, end)) },
      );
      if (r === "started" || r === "queued") update(office, t.id, (x) => ({ ...x, status: "working", error: undefined }));
    }
    if (review) {
      const peep = roles.find((r) => r.id === review.peepId);
      const r = deps.engine.run(
        { office, peepId: MANAGER_ID, prompt: reviewPrompt(review, peep), taskId: review.id },
        {
          role: { tools: READ_ONLY },
          onEnd: (end) => update(office, review.id, (x) => afterReview(x, end)),
        },
      );
      if (r === "started" || r === "queued") update(office, review.id, (x) => ({ ...x, reviewing: true }));
    }
  }

  return {
    get,
    // A Goal from the Command Bar: the Manager returns Tasks, which wait in Backlog unless Manager
    // autonomy is on.
    plan(office: string, goal: string, onDone: (n: number | null) => void): ReturnType<typeof deps.engine.run> {
      held.delete(office);
      const team = deps.roles(office).filter((r) => r.id !== MANAGER_ID);
      return deps.engine.run(
        { office, peepId: MANAGER_ID, prompt: planPrompt(goal, team) },
        {
          role: { tools: READ_ONLY },
          onEnd: (end) => {
            if (end.error) return onDone(null);
            const tasks = parsePlan(
              end.text ?? "",
              team.map((r) => r.id),
              goal,
            ).map((t) => ({ ...t, go: deps.autonomy() && !!t.peepId }));
            set(office, [...get(office), ...tasks]);
            onDone(tasks.length);
            pump(office);
          },
        },
      );
    },
    act(office: string, a: BoardAction) {
      held.delete(office);
      const before = get(office).find((t) => t.id === a.id);
      if ((a.kind === "assign" || a.kind === "handover") && a.peepId) breaks.delete(`${office}\0${a.peepId}`);
      if (a.kind === "start" && before?.peepId) breaks.delete(`${office}\0${before.peepId}`);
      set(office, act(get(office), a));
      // Handing over a Task that's running stops it first; it moves once the run has ended.
      if (a.kind === "handover" && before?.status === "working" && before.peepId) deps.engine.stop(before.peepId);
      pump(office);
    },
    takeBreak(office: string, peepId: string, on: boolean) {
      if (on) breaks.add(`${office}\0${peepId}`);
      else breaks.delete(`${office}\0${peepId}`);
      pump(office);
    },
    // Stop all, or quitting: nothing starts on its own afterwards, not even a review.
    halt(office: string) {
      held.add(office);
      set(
        office,
        get(office).map((t) => (t.status === "backlog" ? { ...t, go: false } : t)),
      );
    },
    haltAll() {
      for (const office of boards.keys()) this.halt(office);
    },
    pumpAll() {
      for (const office of boards.keys()) pump(office);
    },
  };
}
