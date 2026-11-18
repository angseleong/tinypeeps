// Reads each Base Skill's rule text by running its plugin's own SessionStart hook, the way Claude Code
// would, with a throwaway HOME so the hook's flag files never land in the CEO's ~/.claude. Read once
// per plugin version; nothing is copied into this repository (ADR 9).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { BASE_SKILLS, hookText, newestVersion } from "../core/base-skills";

export type BaseRule = { id: string; version: string; text: string };

const cache = new Map<string, BaseRule | null>();

export function readBaseSkill(id: string): BaseRule | null {
  const skill = BASE_SKILLS.find((b) => b.id === id);
  if (!skill) return null;
  const dir = join(homedir(), ".claude", "plugins", "cache", skill.plugin);
  let version: string | null = null;
  try {
    version = newestVersion(readdirSync(dir));
  } catch {}
  if (!version) return null;
  const key = `${id}@${version}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const root = join(dir, version);
  const script = join(root, skill.script);
  let rule: BaseRule | null = null;
  if (existsSync(script)) {
    const home = mkdtempSync(join(tmpdir(), "tinypeeps-base-"));
    const r = spawnSync(process.execPath, [script], {
      input: JSON.stringify({ hook_event_name: "SessionStart", source: "startup", session_id: "tinypeeps", cwd: home }),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", HOME: home, CLAUDE_PLUGIN_ROOT: root },
      encoding: "utf8",
      timeout: 15000,
    });
    rmSync(home, { recursive: true, force: true });
    const text = r.status === 0 ? hookText(r.stdout ?? "") : "";
    if (text) rule = { id, version, text };
  }
  cache.set(key, rule);
  return rule;
}

export const readBaseSkills = () => BASE_SKILLS.map((b) => ({ id: b.id, rule: readBaseSkill(b.id) }));
