// Role files: `.tinypeeps/roles/<id>.md`, YAML front matter plus the brief (docs/templates.md).
import { parse, stringify } from "yaml";

export type Model = "opus" | "sonnet" | "haiku";
export const MODELS: Model[] = ["opus", "sonnet", "haiku"];

// Tools a Role may be given. Everything else Claude Code has stays off for that Peep.
export const TOOLS = ["Read", "Grep", "Glob", "Edit", "Write", "WebSearch", "WebFetch", "Bash", "Task"] as const;

export type Role = {
  id: string;
  title: string;
  name: string;
  model: Model;
  escalate_to?: Model;
  tools: string[];
  mcp: string[];
  // Load everything the CEO installed in Claude Code (plugins, skills, hooks, CLAUDE.md). Costly.
  // Without it a session runs in --safe-mode, where Claude Code loads no plugin skills at all.
  everything: boolean;
  room: string;
  color: string;
  desk: [number, number];
  lounge: [number, number];
  brief: string;
};

const FRONT = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseRole(id: string, text: string): Role {
  const m = FRONT.exec(text);
  if (!m) throw new Error(`${id}.md has no front matter`);
  const f = (parse(m[1]) ?? {}) as Partial<Role>;
  const model = MODELS.includes(f.model as Model) ? (f.model as Model) : "sonnet";
  return {
    id,
    title: String(f.title ?? id),
    name: String(f.name ?? id),
    model,
    escalate_to: MODELS.includes(f.escalate_to as Model) ? f.escalate_to : undefined,
    tools: Array.isArray(f.tools) ? f.tools.map(String) : ["Read", "Grep", "Glob"],
    mcp: Array.isArray(f.mcp) ? f.mcp.map(String) : [],
    everything: f.everything === true,
    room: String(f.room ?? "desks"),
    color: String(f.color ?? "#5b7fa6"),
    desk: pair(f.desk, [0, 0]),
    lounge: pair(f.lounge, [-6, 4]),
    brief: m[2].trim(),
  };
}

function pair(v: unknown, fallback: [number, number]): [number, number] {
  return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number") ? [v[0], v[1]] : fallback;
}

export function serializeRole(r: Role): string {
  const { id: _id, brief, ...front } = r;
  return `---\n${stringify(front, { flowCollectionPadding: false }).trim()}\n---\n${brief.trim()}\n`;
}

export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

type Lang = "en" | "id";

const HANDOFF: Record<Lang, string> = {
  en: "Work only in the current folder. Answer briefly in English. End with a handoff note of at most 150 words: what you did, where the result is, what's left.",
  id: "Kerjakan di folder saat ini saja. Jawab singkat dalam Bahasa Indonesia. Akhiri dengan catatan serah terima maks 150 kata: apa yang kamu lakukan, di mana hasilnya, apa yang tersisa.",
};

const JOBS: Record<string, Record<Lang, [string, string]>> = {
  bos: {
    en: ["manager", "You split the CEO's goals into tasks and review the team's work. Don't do small tasks yourself."],
    id: ["manajer", "Kamu memecah tujuan CEO jadi tugas dan me-review hasil kerja tim. Jangan mengerjakan tugas kecil sendiri."],
  },
  designer: {
    en: ["designer", "You make designs: SVG, HTML/CSS and visual assets."],
    id: ["designer", "Kamu membuat desain: SVG, HTML/CSS, dan aset visual."],
  },
  periset: {
    en: ["researcher", "You find facts, sources and examples, and write them up clearly."],
    id: ["periset", "Kamu mencari fakta, sumber, dan contoh, lalu menuliskannya rapi."],
  },
  penulis: { en: ["writer", "You write: scripts, articles, copy, READMEs."], id: ["penulis", "Kamu menulis teks: skrip, artikel, copy, README."] },
};

export function defaultRoles(lang: Lang): Role[] {
  const role = (
    id: string,
    name: string,
    model: Model,
    escalate_to: Model | undefined,
    color: string,
    room: string,
    desk: [number, number],
    lounge: [number, number],
    tools: string[],
  ): Role => {
    const [title, job] = JOBS[id][lang];
    const intro = lang === "en" ? `You are the ${title} at a small company called TinyPeeps.` : `Kamu ${title} di kantor kecil "TinyPeeps".`;
    return {
      id,
      title,
      name,
      model,
      escalate_to,
      tools,
      mcp: [],
      everything: false,
      room,
      color,
      desk,
      lounge,
      brief: `${intro} ${job} ${HANDOFF[lang]}`,
    };
  };
  return [
    role("bos", "Bos", "opus", undefined, "#c96f4a", "ceo", [-6, -5], [-7.8, 3.8], ["Read", "Grep", "Glob", "Write"]),
    role("designer", "Dina", "sonnet", "opus", "#5b7fa6", "desks", [-2, -1], [-6.2, 3.8], ["Read", "Grep", "Glob", "Edit", "Write"]),
    role("periset", "Raka", "haiku", "sonnet", "#5f8f6b", "library", [2, -1], [-4.6, 3.8], ["Read", "Grep", "Glob", "Write", "WebSearch", "WebFetch"]),
    role("penulis", "Sari", "sonnet", "opus", "#b58a3c", "desks", [0, 2], [-4.6, 5.6], ["Read", "Grep", "Glob", "Edit", "Write"]),
  ];
}
