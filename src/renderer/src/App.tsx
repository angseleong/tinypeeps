import { Activity as ActivityIcon, Building2, ChartColumn, Check, FolderPlus, ListChecks, Settings as SettingsIcon, Users } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Activity, PeepUpdate } from "../../core/activity";
import type { Approval } from "../../core/approval";
import type { Meeting } from "../../core/meeting";
import { MANAGER_ID, type Role } from "../../core/roles";
import { DEFAULT_SETTINGS, type Limits, type Settings } from "../../core/settings";
import { labelText, STRINGS, type Strings } from "../../core/strings";
import { freshTokens, type UsageRecord } from "../../core/usage";
import { isWorking } from "./activity-ui";
import { type IslandState, MorphIsland, RubberDock } from "./chrome";
import { HiringSheet, MeetingPanel } from "./meeting";
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
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [paused, setPaused] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [hires, setHires] = useState<Role[]>([]);
  const [hiringOpen, setHiringOpen] = useState(false);
  const [officeMenu, setOfficeMenu] = useState(false);
  const meetingRef = useRef(meeting);
  meetingRef.current = meeting;
  // Whether the Manager's conversation session is still open. A new one remembers nothing, so it is
  // sent what was said before.
  const live = useRef(false);
  const pausedForMeeting = useRef(false);
  // Which Office the meeting state belongs to, so switching never saves one Office's chat in another.
  const meetingOf = useRef<string | null>(null);
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
  const officeRef = useRef(office);
  officeRef.current = office;

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
    if (id === MANAGER_ID && u.done) {
      if (u.error) live.current = false;
      const said = u.text;
      if (said && !u.error && meetingRef.current) setMeeting((m) => m && { ...m, chat: [...m.chat, { from: "manager", text: said, t: Date.now() }] });
      if (officeRef.current) window.tiny.hiring(officeRef.current).then(setHires);
    }
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
    window.tiny.approvals().then(setApprovals);
    const offs = [
      window.tiny.onUpdate(apply),
      window.tiny.onSettings(setSettings),
      window.tiny.onLimits(setLimits),
      window.tiny.onUsage(setUsage),
      window.tiny.onApprovals(setApprovals),
      // "Always allow" saved a rule into a Role file.
      window.tiny.onRoles((o, r) => o === officeRef.current && setRoles(r)),
    ];
    return () => {
      for (const off of offs) off();
    };
  }, []);

  useEffect(() => {
    if (!office) return;
    live.current = false;
    meetingOf.current = null;
    Promise.all([window.tiny.officeData(office), window.tiny.loadMeeting(office)]).then(([d, saved]) => {
      setRoles(d.roles);
      setUsage(d.usage);
      setRuntime({});
      // A meeting left open comes back; an Office with only its Manager opens on the Kickoff (ADR 8).
      const alone = d.roles.length === 1 && d.roles[0].id === MANAGER_ID;
      setMeeting(saved ?? (alone ? { chat: [], attendees: [d.roles[0].name], kickoff: true } : null));
      meetingOf.current = office;
    });
    window.tiny.hiring(office).then(setHires);
  }, [office]);

  useEffect(() => {
    if (office && meetingOf.current === office) window.tiny.saveMeeting(office, meeting?.chat.length ? meeting : null);
  }, [meeting, office]);

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

  // The CEO's line to the Manager: shown as `shown`, sent as `prompt`.
  const talk = async (shown: string | null, prompt: string) => {
    if (!office) return setNotice(s.office.needFolder);
    const m = meetingRef.current ?? { chat: [], attendees: [peepsRef.current.find((x) => x.id === MANAGER_ID)?.name ?? ""], kickoff: false };
    const earlier = m.chat.map((l) => `${l.from === "ceo" ? "CEO" : "Manager"}: ${l.text}`).join("\n\n");
    const sent = live.current || !earlier ? prompt : `${s.meeting.history}\n\n${earlier}\n\n---\n\n${prompt}`;
    setMeeting({ ...m, chat: shown ? [...m.chat, { from: "ceo", text: shown, t: Date.now() }] : m.chat });
    const r = await window.tiny.say({ office, peepId: MANAGER_ID, prompt: sent });
    live.current = r === "sent" || r === "started";
    if (r === "busy") setNotice(s.office.busy(peepsRef.current.find((x) => x.id === MANAGER_ID)?.name ?? ""));
  };

  const meetingNow = async () => {
    setPaused(await window.tiny.pause(true));
    pausedForMeeting.current = true;
    const ps = peepsRef.current;
    setMeeting({ chat: meetingRef.current?.chat ?? [], attendees: ps.map((x) => x.name), kickoff: false });
    const team = ps
      .filter((x) => x.id !== MANAGER_ID)
      .map((x) => s.meeting.status(x.name, x.title, x.activity, x.lastText.slice(0, 400).replace(/\s+/g, " ")))
      .join("\n");
    talk(null, `${s.meeting.nowPrompt}\n\n${team}`);
  };

  const endMeeting = async () => {
    window.tiny.endMeeting(MANAGER_ID);
    live.current = false;
    setMeeting(null);
    if (pausedForMeeting.current) {
      pausedForMeeting.current = false;
      setPaused(await window.tiny.pause(false));
    }
  };

  const approveHiring = async (team: Role[]) => {
    if (!office) return;
    setRoles(await window.tiny.approveHiring(office, team));
    setHires([]);
    setHiringOpen(false);
    setNotice(s.hiring.hired(team.length));
  };

  const run = async (peepId: string, prompt: string) => {
    if (peepId === MANAGER_ID) return talk(prompt, prompt); // the Command Bar's line to the Manager is a conversation
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
  // The island shows the Office's name; when nothing is happening, clicking it opens the Office
  // switcher right below it. A moment instead opens the Peep it's about.
  const onIsland = () => {
    if (!moment) return setOfficeMenu((v) => !v);
    if (moment.kind !== "idle" && moment.kind !== "notice") {
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
            approvals={approvals}
            paused={paused}
            setPaused={async (on) => setPaused(await window.tiny.pause(on))}
            meetingOpen={!!meeting}
            onMeetingNow={meetingNow}
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
        {page === "office" && (
          <>
            <AnimatePresence>
              {meeting && (
                <MeetingPanel
                  s={s}
                  meeting={meeting}
                  manager={roles.find((r) => r.id === MANAGER_ID)}
                  team={roles}
                  thinking={!!runtime[MANAGER_ID] && !["idle", "stuck"].includes(runtime[MANAGER_ID].activity)}
                  onSay={(t) => talk(t, t)}
                  onClose={endMeeting}
                />
              )}
            </AnimatePresence>
            {hires.length > 0 && !hiringOpen && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0, transition: springs.soft }}
                onClick={() => setHiringOpen(true)}
                className="no-drag absolute top-[60px] left-1/2 z-30 -translate-x-1/2 rounded-full bg-inverse px-4 py-2 text-[13px] font-medium text-on-inverse"
              >
                {s.hiring.ready(hires.length)}
              </motion.button>
            )}
            <AnimatePresence>
              {hiringOpen && office && (
                <HiringSheet
                  s={s}
                  office={office}
                  hires={hires}
                  onApprove={approveHiring}
                  onChanges={(t) => {
                    setHiringOpen(false);
                    talk(t, s.hiring.changesPrompt(t));
                  }}
                  onClose={() => setHiringOpen(false)}
                />
              )}
            </AnimatePresence>
          </>
        )}
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
        <AnimatePresence>
          {officeMenu && (
            <>
              <button type="button" aria-label="Close" className="no-drag absolute inset-0 z-40 cursor-default" onClick={() => setOfficeMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: springs.soft }}
                exit={{ opacity: 0, y: -4, transition: exitFast }}
                onKeyDown={(e) => e.key === "Escape" && setOfficeMenu(false)}
                className="no-drag absolute top-[52px] left-1/2 z-50 flex w-[320px] -translate-x-1/2 flex-col gap-0.5 rounded-panel bg-card p-1.5"
                role="menu"
              >
                {settings.offices.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      window.tiny.setSettings({ current: o });
                      setOfficeMenu(false);
                    }}
                    className="flex items-center gap-3 rounded-row px-3 py-2 text-left hover:bg-fill-1"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{folderName(o)}</span>
                      <span className="block truncate text-[11.5px] text-muted">{o}</span>
                    </span>
                    {o === office && <Check size={15} aria-hidden />}
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  title={s.office.newOfficeHint}
                  onClick={() => {
                    setOfficeMenu(false);
                    window.tiny.pickOffice();
                  }}
                  className="flex items-center gap-3 rounded-row px-3 py-2.5 text-left text-[13.5px] font-medium hover:bg-fill-1"
                >
                  <FolderPlus size={15} aria-hidden /> {s.office.newOffice}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
