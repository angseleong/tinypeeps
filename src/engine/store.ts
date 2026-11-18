// Files the app keeps: settings in Electron's data folder, and per Office under `.tinypeeps/`.
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Task } from "../core/board";
import type { Meeting } from "../core/meeting";
import { defaultRoles, parseRole, placeHire, type Role, serializeRole } from "../core/roles";
import { type ContextCosts, type Limits, readSettings, type Settings } from "../core/settings";
import { type SkillRef, skillDescription, skillsSection } from "../core/skills";
import type { Lang } from "../core/strings";
import type { UsageRecord } from "../core/usage";

// The Engine is Node only: Electron tells it where the app's data and its bundled `skills/` live.
const dirs = { data: "", app: "" };
export function configureStore(data: string, appDir: string) {
  dirs.data = data;
  dirs.app = appDir;
  mkdirSync(data, { recursive: true });
}

const dataFile = (name: string) => join(dirs.data, name);

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
  return readRoleDir(dir);
}

function readRoleDir(dir: string): Role[] {
  const roles: Role[] = [];
  if (!existsSync(dir)) return roles;
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

// The open meeting's chat, so a restart doesn't lose the Kickoff. Ending the meeting removes it.
export const loadMeeting = (office: string): Meeting | null => readJson<Meeting | null>(tiny(office, "meeting.json"), null);
export function saveMeeting(office: string, m: Meeting | null) {
  mkdirSync(tiny(office), { recursive: true });
  if (m) writeFileSync(tiny(office, "meeting.json"), JSON.stringify(m, null, 1));
  else rmSync(tiny(office, "meeting.json"), { force: true });
}

// The Manager's Hiring Plan: draft Role files it wrote into `.tinypeeps/hiring/` (ADR 8).
export const loadHiring = (office: string): Role[] => readRoleDir(tiny(office, "hiring"));

// The CEO approved the (edited) Hiring Plan: each hire gets a seat and a Role file, and the drafts go.
export function approveHiring(office: string, hires: Role[], lang: Lang): Role[] {
  const team = loadRoles(office, lang);
  for (const h of hires) {
    const r = placeHire(h, team, lang);
    saveRole(office, r);
    team.push(r);
  }
  rmSync(tiny(office, "hiring"), { recursive: true, force: true });
  return loadRoles(office, lang);
}

export function saveRole(office: string, role: Role) {
  if (!/^[a-z0-9-]+$/.test(role.id)) throw new Error("bad role id");
  writeFileSync(tiny(office, "roles", `${role.id}.md`), serializeRole(role));
}

// The system prompt a session starts with: the Role's brief, the Base Skills the CEO turned on, the
// Company Note, then the Role's Skills as files (ADR 4, ADR 9).
export function writeBrief(office: string, role: Role, base = ""): string {
  mkdirSync(tiny(office, "run"), { recursive: true });
  const path = tiny(office, "run", `${role.id}.md`);
  writeFileSync(path, role.brief + base + companySection(office) + skillsSection(roleSkills(office, role)));
  return path;
}

// What every Peep in the Office should know, at the start of every session (ADR 4).
function companySection(office: string): string {
  try {
    const note = readFileSync(tiny(office, "company.md"), "utf8").trim();
    return note ? `\n\n## Company Note\n\n${note}` : "";
  } catch {
    return "";
  }
}

export const readCompany = (office: string, name = "company.md"): string | null => {
  try {
    return readFileSync(tiny(office, name), "utf8");
  } catch {
    return null;
  }
};
export function writeCompany(office: string, name: string, text: string) {
  mkdirSync(tiny(office, "run"), { recursive: true });
  writeFileSync(tiny(office, name), text);
}

// The Task board, with each Handoff Note in its own file `notes/<task>.md` so the CEO can read and
// edit it anywhere; the file wins over the copy in board.json.
export function loadBoard(office: string): Task[] {
  return (
    readJson<{ tasks?: Task[] }>(tiny(office, "board.json"), {}).tasks?.map((t) => {
      try {
        return { ...t, note: readFileSync(tiny(office, "notes", `${t.id}.md`), "utf8") };
      } catch {
        return t;
      }
    }) ?? []
  );
}

export function saveBoard(office: string, tasks: Task[]) {
  mkdirSync(tiny(office, "notes"), { recursive: true });
  writeFileSync(tiny(office, "board.json"), JSON.stringify({ tasks }, null, 1));
  for (const t of tasks) {
    if (!/^[\w-]+$/.test(t.id)) continue;
    const path = tiny(office, "notes", `${t.id}.md`);
    if (t.note) writeFileSync(path, t.note);
    else rmSync(path, { force: true });
  }
}

// A Skill the Role names but nobody has installed is left out of the brief, not invented.
function roleSkills(office: string, role: Role): SkillRef[] {
  return role.skills.flatMap((entry) => {
    const name = skillName(entry);
    if (!ensureSkill(office, name)) return [];
    const path = join(".tinypeeps", "skills", name, "SKILL.md");
    return [{ name, path, description: skillDescription(readFileSync(join(office, path), "utf8")) }];
  });
}

// "owner/repo@remotion" and "remotion" name the same Skill.
const skillName = (entry: string) => entry.split("@").at(-1)?.split("/").at(-1) ?? entry;

// Skills reach a lean Peep as files inside its Office (ADR 9), so the first time a Role needs one it
// is copied in from where it already is on this computer: the app's own `skills/`, the Office's
// `.claude/skills` or `.agents/skills` (where `npx skills add` puts them), the CEO's own skills, or an
// installed plugin. Nothing is downloaded here; installing from the internet is a Bash Approval.
export function ensureSkill(office: string, name: string): boolean {
  if (!/^[\w.-]+$/.test(name)) return false;
  const dest = tiny(office, "skills", name);
  if (existsSync(join(dest, "SKILL.md"))) return true;
  const from = findSkill(office, name);
  if (!from) return false;
  cpSync(from, dest, { recursive: true, dereference: true });
  return true;
}

export const skillMissing = (office: string, entries: string[]) => entries.filter((e) => !ensureSkill(office, skillName(e)));

function findSkill(office: string, name: string): string | null {
  const home = homedir();
  const direct = [
    join(dirs.app, "skills", name),
    join(office, ".claude", "skills", name),
    join(office, ".agents", "skills", name),
    join(home, ".claude", "skills", name),
    join(home, ".agents", "skills", name),
  ].find((d) => existsSync(join(d, "SKILL.md")));
  if (direct) return direct;
  return pluginSkills().get(name) ?? null;
}

// Plugins keep skills a few folders deep, one folder per version. Listed once per run (the cache can
// hold thousands of files); sorted, so a newer version replaces an older one.
let pluginIndex: Map<string, string> | null = null;
function pluginSkills(): Map<string, string> {
  if (pluginIndex) return pluginIndex;
  pluginIndex = new Map();
  const cache = join(homedir(), ".claude", "plugins", "cache");
  try {
    const files = readdirSync(cache, { recursive: true, encoding: "utf8" }).filter(
      (p) => p.endsWith("/SKILL.md") && p.includes("/skills/") && !p.includes("node_modules"),
    );
    for (const f of files.sort()) {
      const dir = join(cache, f, "..");
      pluginIndex.set(dir.split("/").at(-1) ?? "", dir);
    }
  } catch {}
  return pluginIndex;
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
