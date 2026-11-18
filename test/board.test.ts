// The real Engine and Task board against the pretend Claude Code: a Goal becomes a Task, the Peep asks
// to write a file, the CEO allows it, the Manager reviews it, and it ends in Done with its Handoff Note.
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Activity } from "../src/core/activity";
import type { Task } from "../src/core/board";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import { createBoard } from "../src/engine/board";
import { createEngine } from "../src/engine/engine";
import { configureStore, loadRoles, loadUsage } from "../src/engine/store";

const PRETEND = resolve(__dirname, "pretend/claude.mjs");

function setup() {
  const root = mkdtempSync(join(tmpdir(), "tinypeeps-test-"));
  const office = join(root, "office");
  configureStore(join(root, "data"), resolve(__dirname, ".."));
  loadRoles(office, "en"); // writes the Manager
  writeFileSync(
    join(office, ".tinypeeps", "roles", "dina.md"),
    "---\ntitle: writer\nname: Dina\nmodel: haiku\nescalate_to: sonnet\ntools: [Read, Write]\n---\nYou write short scripts.\n",
  );
  const log = join(root, "calls.jsonl");
  process.env.TINYPEEPS_PRETEND_LOG = log;
  const activities: Activity[] = [];
  let tasks: Task[] = [];
  const asked: string[] = [];
  const settings = { ...DEFAULT_SETTINGS, claudePath: PRETEND };
  const engine = createEngine({
    settings: () => settings,
    role: (o, id) => loadRoles(o, "en").find((r) => r.id === id),
    send: (_id, u) => u.activity && activities.push(u.activity),
    onLimits: () => {},
    onUsage: () => {},
    // The test stands in for the CEO and allows what is asked.
    onApprovals: (list) => {
      for (const a of list) {
        asked.push(a.tool);
        setTimeout(() => engine.answer(a.id, "allow"), 5);
      }
    },
    allowAlways: () => {},
    onFree: () => board.pumpAll(),
    baseRules: () => "",
  });
  const board = createBoard({
    engine,
    roles: (o) => loadRoles(o, "en"),
    autonomy: () => true,
    publish: (_o, t) => {
      tasks = t;
    },
    beforeTask: () => {},
  });
  board.get(office);
  const calls = () =>
    existsSync(log)
      ? readFileSync(log, "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l) as { kind: string; model: string })
      : [];
  return { office, board, activities, asked, calls, tasks: () => tasks };
}

const until = async (ok: () => boolean, ms = 15000) => {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("a Goal through the board", () => {
  it("plans, works, asks, reviews and ends Done with a Handoff Note", async () => {
    const t = setup();
    const planned = await new Promise<number | null>((done) => t.board.plan(t.office, "Make a 30-second intro video for a tiny bakery", done));
    expect(planned).toBe(1);
    await until(() => t.tasks()[0]?.status === "done");

    const [task] = t.tasks();
    expect(task).toMatchObject({ peepId: "dina", model: "haiku", status: "done" });
    expect(task.note).toContain("intro.md");
    expect(task.files.map((f) => f.split("/").at(-1))).toEqual(["intro.md"]);
    expect(readFileSync(join(t.office, ".tinypeeps", "notes", `${task.id}.md`), "utf8")).toBe(task.note);
    expect(task.reviews.map((r) => r.verdict)).toEqual(["pass"]);

    expect(t.asked).toEqual(["Write"]);
    expect(t.activities).toContain("typing");
    expect(t.activities).toContain("waiting");
    expect(
      loadUsage(t.office)
        .filter((r) => r.taskId === task.id)
        .map((r) => r.peepId),
    ).toEqual(["dina", "bos"]);
  });

  // ADR 2: the office costs no tokens. The only model calls are the Manager's plan, the Task and its
  // review; nothing asks a model to describe what a Peep is doing.
  it("makes no model call outside the plan, the Task and its review", async () => {
    const t = setup();
    await new Promise((done) => t.board.plan(t.office, "Make a 30-second intro video for a tiny bakery", done));
    await until(() => t.tasks()[0]?.status === "done");
    await new Promise((r) => setTimeout(r, 100));
    expect(t.calls()).toEqual([
      { kind: "plan", model: "opus" },
      { kind: "task", model: "haiku" },
      { kind: "review", model: "opus" },
    ]);
  });
});
