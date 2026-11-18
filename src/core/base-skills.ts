// Base Skills: rules every Peep holds, read from the CEO's installed plugins (ADR 9). They are rule
// text, not tools, so they go into each Peep's system prompt and work in a lean session.

export type BaseSkill = { id: string; plugin: string; script: string };

// Where each plugin keeps the SessionStart hook that prints its rules.
export const BASE_SKILLS: BaseSkill[] = [
  { id: "caveman", plugin: "caveman/caveman", script: "src/hooks/caveman-activate.js" },
  { id: "ponytail", plugin: "ponytail/ponytail", script: "hooks/ponytail-activate.js" },
];

// What a hook printed: plain text, or Claude Code's JSON with `additionalContext`.
export function hookText(out: string): string {
  try {
    const j = JSON.parse(out);
    const c = j?.hookSpecificOutput?.additionalContext ?? j?.additionalContext;
    if (typeof c === "string") return c.trim();
  } catch {}
  return out.trim();
}

export function baseSection(rules: { id: string; text: string }[]): string {
  return rules.length ? `\n\n## Base Skills\n\n${rules.map((r) => r.text).join("\n\n")}` : "";
}

// Newest version folder first, comparing numbers, not letters ("5.10.0" after "5.9.1").
export const newestVersion = (dirs: string[]) => [...dirs].sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).find((d) => /^\d/.test(d)) ?? null;

// ADR 9: a Base Skill stays for every Peep only if it adds at most 10% to a lean Role's context.
export const BASE_LIMIT_SHARE = 0.1;
