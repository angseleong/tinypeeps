import { FolderOpen, Minus, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Settings, Theme } from "../../../core/settings";
import type { Lang, Strings } from "../../../core/strings";
import { Button, Card, CountUp, cx, inputClass, Page, Row, Segmented, springs, Toggle } from "../ui";

// Grouped rows, one column: what a setting is on the left, its control on the right.
export function SettingsPage({ s, settings }: { s: Strings; settings: Settings }) {
  const set = (patch: Partial<Settings>) => window.tiny.setSettings(patch);
  const [claudePath, setClaudePath] = useState(settings.claudePath);
  const name = (p: string) => p.split("/").filter(Boolean).at(-1) ?? p;

  return (
    <Page title={s.settings.title}>
      <div className="flex max-w-[720px] flex-col gap-3">
        <Group title={s.settings.groups.general}>
          <Row label={s.settings.language}>
            <Segmented
              id="lang"
              value={settings.language}
              options={
                [
                  ["id", "Bahasa Indonesia"],
                  ["en", "English"],
                ] as [Lang, string][]
              }
              onChange={(l) => set({ language: l })}
            />
          </Row>
          <Row label={s.settings.theme}>
            <Segmented
              id="theme"
              value={settings.theme}
              options={(["system", "light", "dark"] as Theme[]).map((t) => [t, s.settings.themes[t]] as [Theme, string])}
              onChange={(t) => set({ theme: t })}
            />
          </Row>
        </Group>

        <Group title={s.settings.groups.peeps}>
          <Row label={s.settings.concurrency}>
            <Stepper value={settings.concurrency} min={1} max={6} onChange={(n) => set({ concurrency: n })} />
          </Row>
          <Row label={s.settings.autonomy} hint={s.settings.autonomyHint}>
            <Toggle on={settings.bossAutonomy} onChange={(v) => set({ bossAutonomy: v })} label={s.settings.autonomy} />
          </Row>
        </Group>

        <Group title={s.settings.groups.claude}>
          <div className="py-2">
            <div className="mb-2 text-[14px] text-ink-2">{s.settings.claudePath}</div>
            <input
              className={`${inputClass} font-mono text-[13px]`}
              value={claudePath}
              onChange={(e) => setClaudePath(e.target.value)}
              onBlur={() => set({ claudePath })}
            />
            <div className="mt-2 text-[12px] text-muted">{s.settings.claudePathHint}</div>
          </div>
        </Group>

        <Group
          title={s.settings.groups.offices}
          aside={
            <Button onClick={() => window.tiny.pickOffice()}>
              <Plus size={14} /> {s.office.pick}
            </Button>
          }
        >
          {settings.offices.map((o) => (
            <div key={o} className="group flex min-h-[52px] items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => set({ current: o })}
                className={cx(
                  "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                  o === settings.current ? "bg-inverse text-on-inverse" : "bg-fill-2 text-muted hover:bg-fill-3",
                )}
                aria-label={name(o)}
              >
                <FolderOpen size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{name(o)}</div>
                <div className="truncate text-[12px] text-muted">{o}</div>
              </div>
              {o === settings.current && (
                <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-[12px] font-medium text-good-text">{s.settings.current}</span>
              )}
              <Button
                variant="ghost"
                className="w-8 px-0! opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={s.settings.remove}
                onClick={() => set({ offices: settings.offices.filter((x) => x !== o), current: settings.current === o ? null : settings.current })}
              >
                <X size={15} />
              </Button>
            </div>
          ))}
        </Group>
      </div>
    </Page>
  );
}

function Group({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card title={title} aside={aside} className="pb-3">
      <div className="flex flex-col">{children}</div>
    </Card>
  );
}

// − value +, the number rolls to its new value.
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = "grid size-8 place-items-center rounded-full text-ink transition-colors hover:bg-fill-3 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center gap-1 rounded-full bg-fill-1 p-[3px]">
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        transition={springs.pop}
        className={btn}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="−"
      >
        <Minus size={15} />
      </motion.button>
      <span className="w-7 text-center text-[15px] font-semibold">
        <CountUp value={value} />
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        transition={springs.pop}
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="+"
      >
        <Plus size={15} />
      </motion.button>
    </div>
  );
}
