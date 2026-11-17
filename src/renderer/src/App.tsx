import { Activity as ActivityIcon, Building2, ChartColumn, ListChecks, Settings as SettingsIcon, Users } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Activity, PeepUpdate } from "../../core/activity";
import type { Role } from "../../core/roles";
import { DEFAULT_SETTINGS, type Limits, type Settings } from "../../core/settings";
import { labelText, STRINGS, type Strings } from "../../core/strings";
import { freshTokens, type UsageRecord } from "../../core/usage";
import { isWorking } from "./activity-ui";
import { type IslandState, MorphIsland, RubberDock } from "./chrome";
import { freshRuntime, type Peep, type Runtime } from "./office-data";
import { ActivityPage } from "./pages/ActivityPage";
import { DashboardPage } from "./pages/Dashboard";
import { OfficePage } from "./pages/OfficePage";
import { SettingsPage } from "./pages/Settings";
import { TasksPage } from "./pages/Tasks";
import { TeamPage } from "./pages/Team";
import { compact, exitFast, springs } from "./ui";

export type Page = "office" | "activity" | "tasks" | "dashboard" | "team" | "settings";

const SIM_ACTIVITIES: Activity[] = ["typing", "reading", "researching", "running", "thinking", "idle", "stuck"];
const SIM_LABELS = ["Edit: logo.svg", "Read: brief.md", "WebSearch: 2026 trends", "Bash: npm test", "Write: script-ep1.md"];

function useTheme(theme: Settings["theme"]) {
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const dark = theme === "dark" || (theme === "system" && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  return dark;
}

const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
const folderName = (p: string | null) => p?.split("/").filter(Boolean).at(-1) ?? "TinyPeeps";

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [roles, setRoles] = useState<Role[]>([]);
  const [runtime, setRuntime] = useState<Record<string, Runtime>>({});
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [limits, setLimits] = useState<Limits>(null);
  const [page, setPage] = useState<Page>("office");
  const [sim, setSim] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moment, setMoment] = useState<IslandState | null>(null);
  const momentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const commandRef = useRef<HTMLInputElement>(null);
  const dark = useTheme(settings.theme);
  const s = STRINGS[settings.language];
  const office = settings.current;

  const peeps: Peep[] = roles.map((r) => ({ ...r, ...(runtime[r.id] ?? freshRuntime()) }));
  const peepsRef = useRef(peeps);
  peepsRef.current = peeps;
  const sRef = useRef(s);
  sRef.current = s;

  // The island shows what just happened for a moment, then goes back to the office summary.
  const flash = (state: IslandState, ms: number) => {
    clearTimeout(momentTimer.current);
    setMoment(state);
    momentTimer.current = setTimeout(() => setMoment(null), ms);
  };

  const patch = (id: string, fn: (p: Runtime) => Partial<Runtime>) =>
    setRuntime((rt) => {
      const cur = rt[id] ?? freshRuntime();
      return { ...rt, [id]: { ...cur, ...fn(cur) } };
    });

  const apply = (id: string, u: PeepUpdate) => {
    const t = sRef.current;
    const err = u.error ? errorText(t, u.error) : null;
    const line = err ?? (u.label ? labelText(t, u.label) : null) ?? (u.text ? `“${u.text.slice(0, 140)}”` : null);
    const tokens = u.models ? Object.values(u.models).reduce((n, m) => n + freshTokens(m), 0) : 0;
    patch(id, (p) => ({
      activity: u.activity ?? p.activity,
      label: u.label ?? p.label,
      lastText: u.text ?? p.lastText,
      log: line ? [...p.log, { t: Date.now(), text: line }].slice(-80) : p.log,
      dropAt: u.done ? null : p.dropAt,
      tokens: p.tokens + tokens,
    }));
    const peep = peepsRef.current.find((x) => x.id === id);
    if (!peep) return;
    if (u.done) {
      flash(
        { kind: "done", key: `done-${id}-${Date.now()}`, name: peep.name, color: peep.color, text: err ? t.island.failed : t.island.done(compact(tokens)) },
        3200,
      );
    } else if (u.label && u.label !== "init" && u.activity) {
      flash({ kind: "work", key: `work-${id}-${u.label}`, name: peep.name, color: peep.color, activity: u.activity, text: labelText(t, u.label) }, 2600);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: apply reads only refs and setters, so subscribing once is right
  useEffect(() => {
    window.tiny.getSettings().then(setSettings);
    window.tiny.claudeConfig(null).then((c) => setLimits(c.limits));
    const offs = [window.tiny.onUpdate(apply), window.tiny.onSettings(setSettings), window.tiny.onLimits(setLimits), window.tiny.onUsage(setUsage)];
    return () => {
      for (const off of offs) off();
    };
  }, []);

  useEffect(() => {
    if (!office) return;
    window.tiny.officeData(office).then((d) => {
      setRoles(d.roles);
      setUsage(d.usage);
      setRuntime({});
    });
  }, [office]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: flash only sets state; the notice text is the trigger
  useEffect(() => {
    if (!notice) return;
    flash({ kind: "notice", key: `notice-${notice}-${Date.now()}`, text: notice }, 4000);
    setNotice(""); // so the same notice can show again
  }, [notice]);

  // ⌘K opens the prompt box from any page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPage("office");
        setTimeout(() => commandRef.current?.focus(), 50);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Simulation: fake activities so the office can be checked without spending tokens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: apply reads only refs and setters
  useEffect(() => {
    if (!sim) return;
    const timer = setInterval(() => {
      const ps = peepsRef.current;
      if (!ps.length) return;
      const p = ps[Math.floor(Math.random() * ps.length)];
      const activity = SIM_ACTIVITIES[Math.floor(Math.random() * SIM_ACTIVITIES.length)];
      apply(p.id, { activity, label: `(sim) ${SIM_LABELS[Math.floor(Math.random() * SIM_LABELS.length)]}` });
    }, 1400);
    return () => {
      clearInterval(timer);
      setRuntime((rt) =>
        Object.fromEntries(Object.entries(rt).map(([k, v]) => [k, v.label.startsWith("(sim)") ? { ...v, activity: "idle" as Activity, label: "" } : v])),
      );
    };
  }, [sim]);

  const run = async (peepId: string, prompt: string) => {
    const p = peepsRef.current.find((x) => x.id === peepId);
    if (!p) return;
    if (!office) return setNotice(s.office.needFolder);
    const task = s.label.task;
    patch(peepId, (x) => ({
      activity: "thinking",
      log: [...x.log, { t: Date.now(), text: typeof task === "function" ? task(prompt.slice(0, 120)) : prompt }],
    }));
    const r = await window.tiny.run({ office, peepId, prompt });
    if (r === "busy") setNotice(s.office.busy(p.name));
  };

  const saveRole = async (role: Role) => {
    if (office) setRoles(await window.tiny.saveRole(office, role));
  };

  const working = peeps.filter((p) => isWorking(p.activity)).length;
  const island: IslandState = moment ?? { kind: "idle", title: folderName(office), detail: s.island.idle(working) };
  const onIsland = () => {
    if (moment && moment.kind !== "idle" && moment.kind !== "notice") {
      const p = peeps.find((x) => x.name === moment.name);
      if (p) setSelectedId(p.id);
    }
    setPage("office");
  };

  const nav = [
    { id: "office" as const, label: s.nav.office, icon: Building2 },
    { id: "activity" as const, label: s.nav.activity, icon: ActivityIcon },
    { id: "tasks" as const, label: s.nav.tasks, icon: ListChecks },
    { id: "dashboard" as const, label: s.nav.dashboard, icon: ChartColumn },
    { id: "team" as const, label: s.nav.team, icon: Users },
    { id: "settings" as const, label: s.nav.settings, icon: SettingsIcon },
  ];

  return (
    <MotionConfig reducedMotion="user" transition={springs.fade}>
      <div className="relative h-full overflow-hidden bg-stage">
        {/* The office stays mounted: rebuilding the 3D scene on every visit was slow and crashed drei's labels. */}
        <div className={page === "office" ? "absolute inset-0" : "invisible absolute inset-0"} aria-hidden={page !== "office"}>
          <OfficePage
            s={s}
            active={page === "office"}
            dark={dark}
            reduced={reducedQuery.matches}
            peeps={peeps}
            usage={usage}
            settings={settings}
            sim={sim}
            setSim={setSim}
            run={run}
            patch={patch}
            saveRole={saveRole}
            commandRef={commandRef}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        </div>
        <AnimatePresence initial={false}>
          {page !== "office" && (
            <motion.div
              key={page}
              className="absolute inset-0"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, transition: exitFast }}
            >
              {page === "activity" && (
                <ActivityPage
                  s={s}
                  peeps={peeps}
                  onOpen={(id) => {
                    setSelectedId(id);
                    setPage("office");
                  }}
                />
              )}
              {page === "tasks" && <TasksPage s={s} usage={usage} peeps={peeps} />}
              {page === "dashboard" && <DashboardPage s={s} usage={usage} peeps={peeps} limits={limits} />}
              {page === "team" && <TeamPage s={s} office={office} roles={roles} saveRole={saveRole} />}
              {page === "settings" && <SettingsPage s={s} settings={settings} />}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="drag absolute inset-x-0 top-0 h-[52px]" />
        <MorphIsland state={island} onClick={onIsland} />
        <RubberDock items={nav} active={page} onChange={setPage} />
      </div>
    </MotionConfig>
  );
}

function errorText(s: Strings, e: string): string {
  const [key, rest] = [e.split(":")[0], e.slice(e.indexOf(":") + 1)];
  const v = s.label[key];
  if (typeof v === "function") return key === "exited" ? v(Number(rest)) : v(rest);
  return typeof v === "string" ? v : e;
}
