import { contextBridge, ipcRenderer } from "electron";
import type { PeepUpdate } from "../core/activity";
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
  onUpdate: (fn: (peepId: string, update: PeepUpdate) => void) => on("peep:update", fn),
  onSettings: (fn: (s: Settings) => void) => on("settings:update", fn),
  onLimits: (fn: (l: Limits) => void) => on("limits:update", fn),
  onUsage: (fn: (u: UsageRecord[]) => void) => on("usage:update", fn),
  onMeasureProgress: (fn: (i: number, n: number) => void) => on("context:progress", fn),
};

export type Api = typeof api;
contextBridge.exposeInMainWorld("tiny", api);
