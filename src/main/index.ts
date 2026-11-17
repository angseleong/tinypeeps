import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from "electron";
import type { PeepUpdate } from "../core/activity";
import type { Role } from "../core/roles";
import type { Settings } from "../core/settings";
import { createEngine, measureRoles, type RunRequest } from "./engine";
import { listMcp, loadContextCosts, loadLimits, loadRoles, loadSettings, loadUsage, saveContextCosts, saveRole, saveSettings } from "./store";

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
});

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
