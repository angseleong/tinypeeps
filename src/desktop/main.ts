import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Notification, nativeTheme } from "electron";
import type { PeepUpdate } from "../core/activity";
import type { Answer, Approval } from "../core/approval";
import { baseSection } from "../core/base-skills";
import type { BoardAction } from "../core/board";
import { untested } from "../core/claude-version";
import type { Meeting } from "../core/meeting";
import type { Role } from "../core/roles";
import type { Settings } from "../core/settings";
import { STRINGS } from "../core/strings";
import { readBaseSkills } from "../engine/base-skills";
import { createBoard } from "../engine/board";
import { maybeCompact, undoCompaction } from "../engine/company";
import { createEngine, measureRoles, type RunRequest } from "../engine/engine";
import {
  approveHiring,
  configureStore,
  listMcp,
  loadContextCosts,
  loadHiring,
  loadLimits,
  loadMeeting,
  loadRoles,
  loadSettings,
  loadUsage,
  saveContextCosts,
  saveMeeting,
  saveRole,
  saveSettings,
  skillMissing,
} from "../engine/store";

configureStore(app.getPath("userData"), app.getAppPath());

let win: BrowserWindow | null = null;
let settings = loadSettings();
const roles = new Map<string, Role[]>();

const rolesOf = (office: string) => {
  if (!roles.has(office)) roles.set(office, loadRoles(office, settings.language));
  return roles.get(office) ?? [];
};
const emit = (channel: string, ...args: unknown[]) => win?.webContents.send(channel, ...args);

const engine = createEngine({
  settings: () => settings,
  role: (office, peepId) => rolesOf(office).find((r) => r.id === peepId),
  send: (peepId: string, u: PeepUpdate) => {
    // Warn once when the installed Claude Code is a version the app wasn't checked with (ADR 1).
    if (untested(u.claudeVersion, settings.warnedVersion)) {
      setSettings({ ...settings, warnedVersion: u.claudeVersion ?? null });
      emit("claude:untested", u.claudeVersion);
    }
    emit("peep:update", peepId, u);
  },
  onLimits: () => emit("limits:update", loadLimits()),
  onUsage: () => settings.current && emit("usage:update", loadUsage(settings.current)),
  onApprovals: (list) => {
    emit("approvals:update", list);
    notifyApprovals(list);
  },
  onFree: () => board.pumpAll(),
  baseRules: () => baseSection(onBase().flatMap((b) => (b.rule ? [b.rule] : []))),
  allowAlways: (office, peepId, rule) => {
    const role = rolesOf(office).find((r) => r.id === peepId);
    if (!role || role.allow.includes(rule)) return;
    saveRole(office, { ...role, allow: [...role.allow, rule] });
    roles.delete(office);
    emit("roles:update", office, rolesOf(office));
  },
});

const board = createBoard({
  engine,
  roles: rolesOf,
  autonomy: () => settings.bossAutonomy,
  publish: (office, tasks) => emit("board:update", office, tasks),
  beforeTask: (office) =>
    maybeCompact(
      office,
      settings.claudePath,
      (c) => emit("company:compacted", c),
      () => settings.current && emit("usage:update", loadUsage(settings.current)),
    ),
});

// Base Skills are off unless the CEO turned them on: both measured over ADR 9's 10% rule.
const onBase = () => readBaseSkills().filter((b) => settings.baseSkills[b.id] === true);

// With the window in the background, a new Approval also shows as a system notification.
let notified = 0;
function notifyApprovals(list: Approval[]) {
  if (list.length > notified && win && !win.isFocused() && Notification.isSupported()) {
    new Notification({ title: "TinyPeeps", body: STRINGS[settings.language].approval.notify(list.length) }).show();
  }
  notified = list.length;
}

function setSettings(next: Settings) {
  settings = next;
  saveSettings(settings);
  nativeTheme.themeSource = settings.theme;
  emit("settings:update", settings);
}

ipcMain.handle("settings:get", () => settings);
ipcMain.handle("settings:set", (_e, patch: Partial<Settings>) => setSettings({ ...settings, ...patch }));

ipcMain.handle("office:pick", async () => {
  if (!win) return settings;
  const r = await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"] });
  const dir = r.filePaths[0];
  if (r.canceled || !dir) return settings;
  setSettings({ ...settings, current: dir, offices: [dir, ...settings.offices.filter((o) => o !== dir)] });
  return settings;
});

ipcMain.handle("office:data", (_e, office: string) => ({ roles: rolesOf(office), usage: loadUsage(office) }));
ipcMain.handle("role:save", (_e, office: string, role: Role) => {
  saveRole(office, role);
  roles.delete(office);
  return rolesOf(office);
});

ipcMain.handle("claude:config", (_e, office: string | null) => ({ mcp: Object.keys(listMcp(office)), costs: loadContextCosts(), limits: loadLimits() }));
ipcMain.handle("context:measure", async (_e, office: string) => {
  const base = readBaseSkills().flatMap(({ id, rule }) => {
    if (!rule) return [];
    const file = join(tmpdir(), `tinypeeps-base-${id}.md`);
    writeFileSync(file, rule.text);
    return [{ id, file }];
  });
  const costs = await measureRoles(settings.claudePath, rolesOf(office), office, base, (i, n) => emit("context:progress", i, n));
  saveContextCosts(costs);
  return costs;
});

ipcMain.handle("peep:run", (_e, req: RunRequest) => engine.run(req));
ipcMain.handle("peep:stop", (_e, peepId: string) => engine.stop(peepId));
ipcMain.handle("peep:interrupt", (_e, req: RunRequest) => engine.interrupt(req));
ipcMain.handle("peep:break", (_e, office: string, peepId: string) => board.takeBreak(office, peepId, true));
ipcMain.handle("meeting:say", (_e, req: RunRequest) => engine.converse(req));
ipcMain.handle("meeting:end", (_e, peepId: string) => engine.endConversation(peepId));
ipcMain.handle("meeting:load", (_e, office: string) => loadMeeting(office));
ipcMain.handle("meeting:save", (_e, office: string, m: Meeting | null) => saveMeeting(office, m));
ipcMain.handle("hiring:list", (_e, office: string) => loadHiring(office));
ipcMain.handle("skills:missing", (_e, office: string, entries: string[]) => skillMissing(office, entries));
ipcMain.handle("hiring:approve", (_e, office: string, hires: Role[]) => {
  const team = approveHiring(office, hires, settings.language);
  roles.set(office, team);
  emit("roles:update", office, team);
  return team;
});
ipcMain.handle("approval:list", () => engine.approvals());
ipcMain.handle("approval:answer", (_e, id: string, answer: Answer) => engine.answer(id, answer));
ipcMain.handle("peeps:stopAll", () => {
  if (settings.current) board.halt(settings.current);
  engine.stopAll();
});
ipcMain.handle("company:undo", (_e, office: string) => undoCompaction(office));
ipcMain.handle("base:list", () => readBaseSkills().map(({ id, rule }) => ({ id, version: rule?.version ?? null, chars: rule?.text.length ?? 0 })));
ipcMain.handle("board:get", (_e, office: string) => board.get(office));
ipcMain.handle("board:act", (_e, office: string, a: BoardAction) => board.act(office, a));
ipcMain.handle(
  "board:plan",
  (_e, office: string, goal: string) =>
    new Promise((resolve) => {
      const r = board.plan(office, goal, resolve);
      if (r !== "started" && r !== "queued") resolve(r);
    }),
);
ipcMain.handle("peeps:pause", (_e, on: boolean) => {
  engine.setPaused(on);
  return engine.isPaused();
});

// In development, keep painting while the window is covered, so background UI checks see the real frame.
if (!app.isPackaged) {
  app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
  app.commandLine.appendSwitch("disable-renderer-backgrounding");
}

app.whenReady().then(() => {
  // In development, keep the window's accessibility tree on so UI checks can read and click it.
  if (!app.isPackaged) app.setAccessibilitySupportEnabled(true);
  nativeTheme.themeSource = settings.theme;
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 680,
    title: "TinyPeeps",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0e0d" : "#ffffff",
    webPreferences: { preload: join(import.meta.dirname, "../preload/index.mjs"), sandbox: false },
  });
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else win.loadFile(join(import.meta.dirname, "../renderer/index.html"));
});

// Quitting with Peeps at work asks once; then they stop, their Tasks go back to Backlog (saved as each
// session closes) and their Usage is kept.
let quitting = false;
app.on("before-quit", (e) => {
  if (quitting || engine.active() === 0) {
    engine.stopAll();
    return;
  }
  e.preventDefault();
  const t = STRINGS[settings.language].quit;
  const opts = { type: "question" as const, buttons: [t.stop, t.cancel], defaultId: 1, cancelId: 1, message: t.title(engine.active()), detail: t.detail };
  const choice = win ? dialog.showMessageBoxSync(win, opts) : dialog.showMessageBoxSync(opts);
  if (choice !== 0) return;
  quitting = true;
  board.haltAll();
  engine.stopAll();
  const deadline = Date.now() + 5000;
  const wait = () => (engine.active() === 0 || Date.now() > deadline ? app.quit() : setTimeout(wait, 100));
  wait();
});
app.on("window-all-closed", () => app.quit());
