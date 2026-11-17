// Skills as files (ADR 9): a lean session (--safe-mode) loads no `.claude/skills`, so the brief lists
// each Skill's name, when to use it and its file, and the Peep reads the file when a task matches.
// Same idea as Claude Code's own skills: only the description costs every turn.

export type SkillRef = { name: string; description: string; path: string };

export function skillDescription(text: string): string {
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const m = /^description:\s*(.+)$/m.exec(front);
  return (m?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
}

export function skillsSection(skills: SkillRef[]): string {
  if (!skills.length) return "";
  const lines = skills.map((s) => `- ${s.name} (\`${s.path}\`): ${s.description}`);
  return `\n\n## Your Skills\nEach Skill is a file. When a task matches a Skill's description, Read its file first and follow it.\n${lines.join("\n")}\n`;
}
