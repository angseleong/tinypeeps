// Files the app keeps: settings in Electron's data folder, and per Office under `.tinypeeps/`.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { app } from "electron";
import { defaultRoles, parseRole, type Role, serializeRole } from "../core/roles";
import { type ContextCosts, type Limits, readSettings, type Settings } from "../core/settings";
import type { Lang } from "../core/strings";
import type { UsageRecord } from "../core/usage";

const dataFile = (name: string) => join(app.getPath("userData"), name);

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export const loadSettings = (): Settings => readSettings(readJson(dataFile("settings.json"), {}));
export const saveSettings = (s: Settings) => writeFileSync(dataFile("settings.json"), JSON.stringify(s, null, 2));

export const loadLimits = (): Limits => readJson<Limits>(dataFile("limits.json"), null);
export const saveLimits = (l: Limits) => writeFileSync(dataFile("limits.json"), JSON.stringify(l));

export const loadContextCosts = (): ContextCosts => readJson<ContextCosts>(dataFile("context-costs.json"), null);
export const saveContextCosts = (c: ContextCosts) => writeFileSync(dataFile("context-costs.json"), JSON.stringify(c, null, 2));

const tiny = (office: string, ...p: string[]) => join(office, ".tinypeeps", ...p);

// Opening an Office for the first time writes the default Role files, so the CEO can edit them.
export function loadRoles(office: string, lang: Lang): Role[] {
  const dir = tiny(office, "roles");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    for (const r of defaultRoles(lang)) writeFileSync(join(dir, `${r.id}.md`), serializeRole(r));
  }
  const roles: Role[] = [];
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()) {
    try {
      roles.push(parseRole(f.slice(0, -3), readFileSync(join(dir, f), "utf8")));
    } catch {
      // A Role file the CEO broke by hand is skipped, not fatal; fixing it brings the Peep back.
    }
  }
  return roles;
}

export function saveRole(office: string, role: Role) {
  if (!/^[a-z0-9-]+$/.test(role.id)) throw new Error("bad role id");
  writeFileSync(tiny(office, "roles", `${role.id}.md`), serializeRole(role));
}

export function writeBrief(office: string, role: Role): string {
  mkdirSync(tiny(office, "run"), { recursive: true });
  const path = tiny(office, "run", `${role.id}.md`);
  writeFileSync(path, role.brief);
  return path;
}

export function loadUsage(office: string): UsageRecord[] {
  try {
    return readFileSync(tiny(office, "usage.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as UsageRecord);
  } catch {
    return [];
  }
}

export function appendUsage(office: string, r: UsageRecord) {
  mkdirSync(tiny(office), { recursive: true });
  appendFileSync(tiny(office, "usage.jsonl"), `${JSON.stringify(r)}\n`);
}

// Claude Code's own files are only read, never changed (docs/privacy.md).
export function listMcp(office: string | null): Record<string, unknown> {
  const j = readJson<{ mcpServers?: Record<string, unknown>; projects?: Record<string, { mcpServers?: Record<string, unknown> }> }>(
    join(homedir(), ".claude.json"),
    {},
  );
  return { ...(j.mcpServers ?? {}), ...(office ? (j.projects?.[office]?.mcpServers ?? {}) : {}) };
}

export function findTranscript(sessionId: string): string | null {
  const root = join(homedir(), ".claude", "projects");
  try {
    for (const d of readdirSync(root)) {
      const p = join(root, d, `${sessionId}.jsonl`);
      if (existsSync(p)) return readFileSync(p, "utf8");
    }
  } catch {}
  return null;
}
