// Role files: `.tinypeeps/roles/<id>.md`, YAML front matter plus the brief (docs/templates.md).
import { parse, stringify } from "yaml";

export type Model = "opus" | "sonnet" | "haiku";

// The Manager's Role id: "bos" from the prototype, kept so Offices made then still find it.
export const MANAGER_ID = "bos";
// Behind the desk in the Manager's Office, facing the door; it rests in the Lounge's corner.
const MANAGER_SEAT: { desk: [number, number]; lounge: [number, number] } = { desk: [-3.5, -9.9], lounge: [-13.4, 9.4] };
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
  // Skills on top of the Base Skills, read as files from `.tinypeeps/skills/<name>/SKILL.md` (ADR 9).
  skills: string[];
  // `--allowedTools` rules the CEO added with "Always allow for this Role" (ADR 5).
  allow: string[];
  // Load everything the CEO installed in Claude Code (plugins, skills, hooks, CLAUDE.md). Costly.
  // Without it a session runs in --safe-mode, where Claude Code loads no plugin skills at all.
  everything: boolean;
  room: string;
  color: string;
  desk: [number, number];
  lounge: [number, number];
  // One line from the Manager's Hiring Plan: why this Role, its model and its Skills.
  why?: string;
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
    skills: Array.isArray(f.skills) ? f.skills.map(String) : [],
    allow: Array.isArray(f.allow) ? f.allow.map(String) : [],
    everything: f.everything === true,
    room: String(f.room ?? "desks"),
    color: String(f.color ?? "#5b7fa6"),
    ...moveOldSeat(id, pair(f.desk, SLOTS[0].desk), pair(f.lounge, SLOTS[0].lounge)),
    why: typeof f.why === "string" ? f.why : undefined,
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

// The Manager's brief: Kickoff, Brief, Hiring Plan and review (ADR 8). Written in English for the
// model either way; the language line tells it what to answer in.
const MANAGER_BRIEF = `You are the Manager of this company. You work for the CEO: you plan and review, and you don't do the team's work yourself.

**Kickoff.** If \`docs/brief.md\` doesn't exist yet, this is the Kickoff. Use the grilling Skill: ask the CEO one question at a time, each with your recommended answer, until the Goal, who it's for, what the first version does and what waits are clear. Keep every reply short.

**Brief.** When the CEO agrees it's clear, write the starting docs with the brief Skill. Then write \`.tinypeeps/company.md\`, the Company Note every Peep reads before each Task: the Goal, who it's for, the style and the rules, under 200 words, no Task details.

**Hiring Plan.** Then propose the team, 2 to 5 Roles, for any kind of company (software, video, a shop…). For each Role write \`.tinypeeps/hiring/<id>.md\` (id: lowercase letters and dashes):

---
name: <a short first name>
title: <job title>
model: haiku | sonnet | opus
escalate_to: sonnet | opus
tools: [only what the job needs, from Read, Grep, Glob, Edit, Write, WebSearch, WebFetch, Bash]
skills: [skill names]
why: <one line: why this Role, this model and these Skills>
---
<the Role's brief, under 200 words>

Pick the cheapest model that does the job well: haiku to search and summarise, sonnet for most making, opus only for hard work. Find each Role's Skills with the find-skills Skill and install them into this folder with \`npx skills add <owner/repo@skill> -y\` (no \`-g\`); the CEO approves each install. Then tell the CEO the Hiring Plan is ready. The CEO edits and approves it in the app: never write to \`.tinypeeps/roles/\` yourself.

**Review.** When asked to review someone's work, use the review Skill.`;

// Every Office starts with the Manager alone (ADR 8); the team comes from the Hiring Plan.
export function defaultRoles(lang: Lang): Role[] {
  return [
    {
      id: MANAGER_ID,
      title: lang === "en" ? "manager" : "manajer",
      name: lang === "en" ? "Manager" : "Manajer",
      model: "opus",
      escalate_to: undefined,
      tools: ["Read", "Grep", "Glob", "Edit", "Write", "WebSearch", "WebFetch", "Bash"],
      mcp: [],
      skills: ["grilling", "domain-modeling", "research", "brief", "find-skills", "review"],
      allow: [],
      everything: false,
      room: "ceo",
      color: "#c96f4a",
      desk: MANAGER_SEAT.desk,
      lounge: MANAGER_SEAT.lounge,
      brief: `${MANAGER_BRIEF}\n\n${lang === "en" ? "Work only in the current folder. Answer in English." : "Kerjakan di folder saat ini saja. Jawab dalam Bahasa Indonesia."}`,
    },
  ];
}

// Where hired Peeps sit and rest, and their colours, in hiring order.
// Desks: the first pod in the office (src/app/office/office-data.ts PODS), so hires sit facing each other.
const SLOTS: { desk: [number, number]; lounge: [number, number]; color: string }[] = [
  { desk: [-6.9, -0.7], lounge: [-13, 5], color: "#5b7fa6" },
  { desk: [-6.9, 2.7], lounge: [-11.6, 5], color: "#5f8f6b" },
  { desk: [-5.5, -0.7], lounge: [-10.2, 5], color: "#b58a3c" },
  { desk: [-5.5, 2.7], lounge: [-10.4, 6.6], color: "#8a6bb5" },
  { desk: [-4.1, -0.7], lounge: [-10.4, 8.2], color: "#b5566b" },
  { desk: [-4.1, 2.7], lounge: [-12, 8.8], color: "#4f9a9a" },
];

// Seats from the first layout (before C2), still in saved Offices: each moves to its new seat on read.
// shortcut: matched by exact coordinates; drop once no saved Office has them.
const OLD_DESKS = ["-2,-1", "2,-1", "0,2", "-2,2", "2,2", "0,-1"];
function moveOldSeat(id: string, desk: [number, number], lounge: [number, number]) {
  if (id === MANAGER_ID && `${desk}` === "-6,-5") return MANAGER_SEAT;
  const i = OLD_DESKS.indexOf(`${desk}`);
  return i < 0 ? { desk, lounge } : SLOTS[i];
}

// The colours hires get, in hiring order; the Hiring Plan's cards preview them.
export const HIRE_COLORS = SLOTS.map((x) => x.color);

// A hire keeps what the Manager and the CEO chose, gets a free seat, and always ends its Tasks with a
// Handoff Note, whatever its brief says.
export function placeHire(r: Role, taken: Role[], lang: Lang): Role {
  const used = new Set(taken.map((t) => `${t.desk}`));
  const slot = SLOTS.find((x) => !used.has(`${x.desk}`)) ?? SLOTS[taken.length % SLOTS.length];
  const brief = r.brief.includes("150") ? r.brief : `${r.brief}\n\n${HANDOFF[lang]}`;
  return { ...r, room: r.room === "ceo" ? "desks" : r.room, desk: slot.desk, lounge: slot.lounge, color: slot.color, brief };
}
