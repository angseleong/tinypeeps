import type { RateLimit } from "./activity";
import type { Lang } from "./strings";

export type Theme = "system" | "light" | "dark";

export type Settings = {
  offices: string[];
  current: string | null;
  language: Lang;
  theme: Theme;
  concurrency: number;
  bossAutonomy: boolean;
  claudePath: string;
};

export const DEFAULT_SETTINGS: Settings = {
  offices: [],
  current: null,
  language: "id",
  theme: "system",
  concurrency: 3,
  bossAutonomy: true,
  claudePath: "claude",
};

// Every field optional with a default, so a settings file from an older version still loads.
export function readSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Settings>;
  const d = DEFAULT_SETTINGS;
  return {
    offices: Array.isArray(r.offices) ? r.offices.filter((o) => typeof o === "string") : d.offices,
    current: typeof r.current === "string" ? r.current : d.current,
    language: r.language === "en" || r.language === "id" ? r.language : d.language,
    theme: r.theme === "light" || r.theme === "dark" || r.theme === "system" ? r.theme : d.theme,
    concurrency:
      Number.isInteger(r.concurrency) && (r.concurrency as number) >= 1 && (r.concurrency as number) <= 10 ? (r.concurrency as number) : d.concurrency,
    bossAutonomy: typeof r.bossAutonomy === "boolean" ? r.bossAutonomy : d.bossAutonomy,
    claudePath: typeof r.claudePath === "string" && r.claudePath.trim() ? r.claudePath.trim() : d.claudePath,
  };
}

export type Limits = { rateLimit: RateLimit; seenAt: number } | null;

// Context tokens a session starts every model turn with: with everything loaded, and per Role.
export type ContextCosts = { claudeVersion: string; everything: number; roles: Record<string, number>; measuredAt: number } | null;
