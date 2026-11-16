import { contextBridge, ipcRenderer } from "electron";
import type { PeepUpdate } from "../core/activity";
import type { RunRequest } from "../main/index";

const api = {
  pickOffice: (): Promise<string | null> => ipcRenderer.invoke("office:pick"),
  run: (req: RunRequest): Promise<"started" | "queued" | "busy"> => ipcRenderer.invoke("peep:run", req),
  stop: (peepId: string): Promise<void> => ipcRenderer.invoke("peep:stop", peepId),
  onUpdate: (fn: (peepId: string, update: PeepUpdate) => void) => {
    const listener = (_e: unknown, id: string, u: PeepUpdate) => fn(id, u);
    ipcRenderer.on("peep:update", listener);
    return () => {
      ipcRenderer.removeListener("peep:update", listener);
    };
  },
};

export type Api = typeof api;
contextBridge.exposeInMainWorld("tiny", api);
