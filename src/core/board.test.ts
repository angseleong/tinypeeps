import { describe, expect, it } from "vitest";
import { act, afterReview, afterRun, handoffNote, nextJobs, parsePlan, parseVerdict, recover, runModel, type Task } from "./board";
import { defaultRoles, type Role } from "./roles";

const task = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Write the script",
  detail: "",
  peepId: "dina",
  status: "backlog",
  go: true,
  files: [],
  reviews: [],
  createdAt: 0,
  ...over,
});

const role = (over: Partial<Role> = {}): Role => ({ ...defaultRoles("en")[0], id: "dina", model: "haiku", ...over });

describe("the Manager's plan", () => {
  it("reads the last tasks block, keeps only known Peeps and models", () => {
    const text =
      'Here is the plan.\n\n```tasks\n[{"title":"Research","peep":"raka","model":"haiku","why":"cheap search","detail":"find 5"},{"title":"Edit","peep":"ghost","model":"gpt"}]\n```';
    const tasks = parsePlan(text, ["raka", "dina"], "Make a video", 1000);
    expect(tasks.map((t) => [t.title, t.peepId, t.model, t.why, t.status, t.go])).toEqual([
      ["Research", "raka", "haiku", "cheap search", "backlog", false],
      ["Edit", null, undefined, undefined, "backlog", false],
    ]);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(2);
  });

  it("gives no Tasks for text without a valid block", () => {
    expect(parsePlan("I think we should start with research.", ["raka"], "g")).toEqual([]);
    expect(parsePlan("```tasks\nnot json\n```", ["raka"], "g")).toEqual([]);
  });
});

describe("Handoff Note", () => {
  it("takes the part under the heading", () => {
    expect(handoffNote("Long work log…\n\n## Handoff Note\nScript in script.md. Left: the ending.")).toBe("Script in script.md. Left: the ending.");
  });

  it("caps a note at 150 words", () => {
    const note = handoffNote(Array.from({ length: 300 }, (_, i) => `w${i}`).join(" "));
    expect(note.split(" ")).toHaveLength(150);
    expect(note.endsWith("…")).toBe(true);
  });
});

describe("Review and Escalation", () => {
  it("reads the last verdict line", () => {
    expect(parseVerdict("1. fix intro\n\nVerdict: **Changes**")).toBe("changes");
    expect(parseVerdict("Verdict: Pass")).toBe("pass");
    expect(parseVerdict("Looks fine")).toBeNull();
  });

  it("a finished run goes to Review with its note and files; a failed one back to Backlog, waiting", () => {
    const done = afterRun(task({ status: "working" }), { text: "## Handoff Note\nDone.", files: ["/o/a.md"] });
    expect([done.status, done.note, done.files]).toEqual(["review", "Done.", ["/o/a.md"]]);
    const failed = afterRun(task({ status: "working" }), { error: "stopped", files: [] });
    expect([failed.status, failed.go]).toEqual(["backlog", false]);
  });

  it("Pass → Done; Changes → once more, stronger; Changes again → the CEO", () => {
    const r = task({ status: "review", model: "haiku" });
    expect(afterReview(r, { text: "Verdict: Pass", files: [] }).status).toBe("done");

    const again = afterReview(r, { text: "1. fix intro\nVerdict: Changes", files: [] });
    expect([again.status, again.go, again.escalated]).toEqual(["backlog", true, true]);
    expect(runModel(again, role({ escalate_to: "opus" }))).toBe("opus");
    expect(runModel(again, role())).toBe("sonnet");
    expect(runModel(r, role())).toBe("haiku");

    const second = afterReview({ ...again, status: "review" }, { text: "Verdict: Changes", files: [] });
    expect([second.status, second.needsCeo]).toEqual(["review", true]);
  });

  it("no verdict or a failed review goes to the CEO, never loops", () => {
    expect(afterReview(task({ status: "review" }), { text: "hmm", files: [] }).needsCeo).toBe(true);
    expect(afterReview(task({ status: "review" }), { error: "stopped", files: [] }).needsCeo).toBe(true);
  });

  it("picks up a tool the Peep lacked", () => {
    expect(afterReview(task({ status: "review" }), { text: "Suggest tool: bash\nSuggest tool: WebFetch\nVerdict: Pass", files: [] }).suggestTools).toEqual([
      "WebFetch",
      "Bash",
    ]);
  });
});

describe("what starts next", () => {
  it("one Task per free Peep, only started ones, one review at a time", () => {
    const tasks = [
      task({ id: "a" }),
      task({ id: "b" }),
      task({ id: "c", peepId: "raka", go: false }),
      task({ id: "d", peepId: "sari" }),
      task({ id: "r", status: "review" }),
    ];
    const next = nextJobs(tasks, (id) => id === "sari", "bos");
    expect(next.start.map((t) => t.id)).toEqual(["a"]);
    expect(next.review?.id).toBe("r");
    expect(nextJobs(tasks, (id) => id === "bos", "bos").review).toBeNull();
    expect(nextJobs([...tasks, task({ id: "x", status: "review", reviewing: true })], () => false, "bos").review).toBeNull();
  });

  it("after a restart nothing is left working", () => {
    expect(recover([task({ status: "working" })])[0]).toMatchObject({ status: "backlog", go: false });
  });

  it("dragging onto a Peep assigns and starts; a working Task can't be moved or removed", () => {
    expect(act([task({ go: false, peepId: null })], { kind: "assign", id: "t1", peepId: "raka" })[0]).toMatchObject({ peepId: "raka", go: true });
    const working = [task({ status: "working" })];
    expect(act(working, { kind: "assign", id: "t1", peepId: "raka" })[0].peepId).toBe("dina");
    expect(act(working, { kind: "remove", id: "t1" })).toHaveLength(1);
  });
  it("Stop and do this first resumes the Task later; a hand-over moves it once stopped", () => {
    expect(afterRun(task({ status: "working" }), { error: "interrupted", files: [] })).toMatchObject({ status: "backlog", go: true });
    const handed = act([task({ status: "working" })], { kind: "handover", id: "t1", peepId: "raka" })[0];
    expect(handed).toMatchObject({ status: "working", peepId: "dina", handTo: "raka" });
    expect(afterRun(handed, { error: "stopped", files: [] })).toMatchObject({ status: "backlog", peepId: "raka", go: true, handTo: undefined });
  });
});
