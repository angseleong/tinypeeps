import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Notification, nativeTheme } from "electron";
import type { PeepUpdate } from "../core/activity";
import type { Answer, Approval } from "../core/approval";
import type { Meeting } from "../core/meeting";
import type { Role } from "../core/roles";
import type { Settings } from "../core/settings";
import { STRINGS } from "../core/strings";
import { createEngine, measureRoles, type RunRequest } from "./engine";
import {
  approveHiring,
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
} from "./store";

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
  send: (peepId: string, u: PeepUpdate) => emit("peep:update", peepId, u),
  onLimits: () => emit("limits:update", loadLimits()),
  onUsage: () => settings.current && emit("usage:update", loadUsage(settings.current)),
  onApprovals: (list) => {
    emit("approvals:update", list);
    notifyApprovals(list);
  },
  allowAlways: (office, peepId, rule) => {
    const role = rolesOf(office).find((r) => r.id === peepId);
    if (!role || role.allow.includes(rule)) return;
    saveRole(office, { ...role, allow: [...role.allow, rule] });
    roles.delete(office);
    emit("roles:update", office, rolesOf(office));
  },
});

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
  const costs = await measureRoles(settings.claudePath, rolesOf(office), office, (i, n) => emit("context:progress", i, n));
  saveContextCosts(costs);
  return costs;
});

ipcMain.handle("peep:run", (_e, req: RunRequest) => engine.run(req));
ipcMain.handle("peep:stop", (_e, peepId: string) => engine.stop(peepId));
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
ipcMain.handle("peeps:stopAll", () => engine.stopAll());
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

app.on("before-quit", () => engine.stopAll());
app.on("window-all-closed", () => app.quit());
