import { contextBridge, ipcRenderer } from "electron";
import type { PeepUpdate } from "../core/activity";
import type { Answer, Approval } from "../core/approval";
import type { Meeting } from "../core/meeting";
import type { Role } from "../core/roles";
import type { ContextCosts, Limits, Settings } from "../core/settings";
import type { UsageRecord } from "../core/usage";
import type { RunRequest } from "../main/engine";

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
