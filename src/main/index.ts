import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { type PeepUpdate, readStreamLine } from "../core/activity";

export type RunRequest = { peepId: string; model: string; prompt: string; brief: string; cwd: string };

const CONCURRENCY_LIMIT = 3;
const running = new Map<string, ChildProcess>();
const queue: RunRequest[] = [];
let win: BrowserWindow | null = null;

function send(peepId: string, update: PeepUpdate) {
  win?.webContents.send("peep:update", peepId, update);
}

function start(req: RunRequest) {
  const args = [
    "-p",
    req.prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    req.model,
    "--append-system-prompt",
    req.brief,
    // shortcut: edits inside the Office folder are auto-accepted and every other permission is denied,
    // until Approvals reach the window (ADR 5, spike permission-host).
    "--permission-mode",
    "acceptEdits",
    "--permission-prompts",
    "none",
  ];
  // shortcut: relies on `claude` being on PATH, true when started from a terminal with `npm run dev`;
  // a packaged app opened from Finder needs the path in Settings.
  const child = spawn("claude", args, { cwd: req.cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  running.set(req.peepId, child);
  let stderr = "";
  let ended = false;

  createInterface({ input: child.stdout }).on("line", (line) => {
    const update = readStreamLine(line);
    if (!update) return;
    if (update.done) ended = true;
    send(req.peepId, update);
  });
  child.stderr.on("data", (d) => {
    stderr += String(d);
  });
  child.on("error", (err) => {
    send(req.peepId, { activity: "stuck", done: true, error: `Gagal menjalankan claude: ${err.message}` });
  });
  child.on("close", (code) => {
    running.delete(req.peepId);
    if (!ended) {
      const error = code === null ? "Dihentikan" : stderr.trim() || `claude keluar dengan kode ${code}`;
      send(req.peepId, { activity: code === null ? "idle" : "stuck", done: true, error });
    }
    const next = queue.shift();
    if (next) start(next);
  });
}

ipcMain.handle("office:pick", async () => {
  if (!win) return null;
  const r = await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"], title: "Pilih folder kantor" });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("peep:run", (_e, req: RunRequest) => {
  if (running.has(req.peepId) || queue.some((q) => q.peepId === req.peepId)) return "busy";
  if (running.size >= CONCURRENCY_LIMIT) {
    queue.push(req);
    send(req.peepId, { activity: "queued", label: "Nunggu giliran di sofa" });
    return "queued";
  }
  start(req);
  return "started";
});

ipcMain.handle("peep:stop", (_e, peepId: string) => {
  const i = queue.findIndex((q) => q.peepId === peepId);
  if (i >= 0) {
    queue.splice(i, 1);
    send(peepId, { activity: "idle", done: true, error: "Dibatalin" });
  }
  running.get(peepId)?.kill("SIGINT");
});

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "TinyPeeps",
    backgroundColor: "#f7f4ef",
    webPreferences: { preload: join(import.meta.dirname, "../preload/index.mjs"), sandbox: false },
  });
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else win.loadFile(join(import.meta.dirname, "../renderer/index.html"));
});

app.on("before-quit", () => {
  for (const child of running.values()) child.kill("SIGINT");
});
app.on("window-all-closed", () => app.quit());
