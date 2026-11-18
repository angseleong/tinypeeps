import { contextBridge, ipcRenderer } from "electron";
import type { PeepUpdate } from "../core/activity";
import type { Answer, Approval } from "../core/approval";
import type { BoardAction, Task } from "../core/board";
import type { Meeting } from "../core/meeting";
import type { Role } from "../core/roles";
import type { ContextCosts, Limits, Settings } from "../core/settings";
import type { UsageRecord } from "../core/usage";
import type { RunRequest } from "../engine/engine";

function on<A extends unknown[]>(channel: string, fn: (...args: A) => void) {
  const listener = (_e: unknown, ...args: unknown[]) => fn(...(args as A));
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
  setSettings: (patch: Partial<Settings>): Promise<void> => ipcRenderer.invoke("settings:set", patch),
  pickOffice: (): Promise<Settings> => ipcRenderer.invoke("office:pick"),
  officeData: (office: string): Promise<{ roles: Role[]; usage: UsageRecord[] }> => ipcRenderer.invoke("office:data", office),
  saveRole: (office: string, role: Role): Promise<Role[]> => ipcRenderer.invoke("role:save", office, role),
  claudeConfig: (office: string | null): Promise<{ mcp: string[]; costs: ContextCosts; limits: Limits }> => ipcRenderer.invoke("claude:config", office),
  measureContext: (office: string): Promise<ContextCosts> => ipcRenderer.invoke("context:measure", office),
  run: (req: RunRequest): Promise<"started" | "queued" | "busy" | "no-role"> => ipcRenderer.invoke("peep:run", req),
  stop: (peepId: string): Promise<void> => ipcRenderer.invoke("peep:stop", peepId),
  interrupt: (req: RunRequest): Promise<"started" | "queued" | "busy" | "no-role"> => ipcRenderer.invoke("peep:interrupt", req),
  takeBreak: (office: string, peepId: string): Promise<void> => ipcRenderer.invoke("peep:break", office, peepId),
  say: (req: RunRequest): Promise<"sent" | "started" | "busy" | "no-role"> => ipcRenderer.invoke("meeting:say", req),
  endMeeting: (peepId: string): Promise<void> => ipcRenderer.invoke("meeting:end", peepId),
  loadMeeting: (office: string): Promise<Meeting | null> => ipcRenderer.invoke("meeting:load", office),
  saveMeeting: (office: string, m: Meeting | null): Promise<void> => ipcRenderer.invoke("meeting:save", office, m),
  hiring: (office: string): Promise<Role[]> => ipcRenderer.invoke("hiring:list", office),
  missingSkills: (office: string, entries: string[]): Promise<string[]> => ipcRenderer.invoke("skills:missing", office, entries),
  approveHiring: (office: string, hires: Role[]): Promise<Role[]> => ipcRenderer.invoke("hiring:approve", office, hires),
  approvals: (): Promise<Approval[]> => ipcRenderer.invoke("approval:list"),
  answer: (id: string, answer: Answer): Promise<void> => ipcRenderer.invoke("approval:answer", id, answer),
  stopAll: (): Promise<void> => ipcRenderer.invoke("peeps:stopAll"),
  pause: (on: boolean): Promise<boolean> => ipcRenderer.invoke("peeps:pause", on),
  baseSkills: (): Promise<{ id: string; version: string | null; chars: number }[]> => ipcRenderer.invoke("base:list"),
  board: (office: string): Promise<Task[]> => ipcRenderer.invoke("board:get", office),
  boardAct: (office: string, a: BoardAction): Promise<void> => ipcRenderer.invoke("board:act", office, a),
  // Resolves with how many Tasks the Manager planned (null: the run failed), or why it couldn't start.
  plan: (office: string, goal: string): Promise<number | null | "busy" | "no-role"> => ipcRenderer.invoke("board:plan", office, goal),
  undoCompaction: (office: string): Promise<void> => ipcRenderer.invoke("company:undo", office),
  onCompacted: (fn: (c: { office: string; before: string; after: string }) => void) => on("company:compacted", fn),
  onUntestedClaude: (fn: (version: string) => void) => on("claude:untested", fn),
  onBoard: (fn: (office: string, tasks: Task[]) => void) => on("board:update", fn),
  onApprovals: (fn: (list: Approval[]) => void) => on("approvals:update", fn),
  onRoles: (fn: (office: string, roles: Role[]) => void) => on("roles:update", fn),
  onUpdate: (fn: (peepId: string, update: PeepUpdate) => void) => on("peep:update", fn),
  onSettings: (fn: (s: Settings) => void) => on("settings:update", fn),
  onLimits: (fn: (l: Limits) => void) => on("limits:update", fn),
  onUsage: (fn: (u: UsageRecord[]) => void) => on("usage:update", fn),
  onMeasureProgress: (fn: (i: number, n: number) => void) => on("context:progress", fn),
};

export type Api = typeof api;
contextBridge.exposeInMainWorld("tiny", api);
