import { Check, Ruler, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { MODELS, type Model, type Role, TOOLS, wordCount } from "../../core/roles";
import type { ContextCosts } from "../../core/settings";
import type { Strings } from "../../core/strings";
import { ROOMS } from "../office/office-data";
import { Button, Card, Chip, compact, cx, Field, inputClass, Meter, ModelBadge, Page, Segmented } from "../ui";

export function TeamPage({
  s,
  office,
  roles,
  saveRole,
  baseSkills,
}: {
  s: Strings;
  office: string | null;
  roles: Role[];
  saveRole: (r: Role) => Promise<void>;
  baseSkills: Record<string, boolean>;
}) {
  const [config, setConfig] = useState<{ mcp: string[]; costs: ContextCosts } | null>(null);
  const [measuring, setMeasuring] = useState<[number, number] | null>(null);
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.tiny.claudeConfig(office).then(setConfig);
    return window.tiny.onMeasureProgress((i, n) => setMeasuring([i, n]));
  }, [office]);

  const measure = async () => {
    setMeasuring([0, 1]);
    try {
      const costs = await window.tiny.measureContext(office as string);
      setConfig((c) => (c ? { ...c, costs } : c));
      setVersion(costs?.claudeVersion ?? "");
    } finally {
      setMeasuring(null);
    }
  };

  if (!office)
    return (
      <Page title={s.team.title}>
        <Card>
          <p className="text-[13px] text-muted">{s.team.noOffice}</p>
        </Card>
      </Page>
    );

  const costs = config?.costs;
  const baseOn = Object.entries(baseSkills)
    .filter(([, on]) => on)
    .map(([id]) => id);
  return (
    <Page
      title={s.team.title}
      sub={
        <>
          {costs ? s.team.everythingBase(compact(costs.everything)) : s.team.measureNote}
          {baseOn.length > 0 && (
            <span className="mt-1 block">{s.team.base(compact(baseOn.reduce((n, id) => n + (costs?.base?.[id] ?? 0), 0)), baseOn.join(", "))}</span>
          )}
        </>
      }
      actions={
        <>
          {costs && version && costs.claudeVersion !== version && <span className="text-[11px] text-wait">{s.team.stale(costs.claudeVersion)}</span>}
          <Button onClick={measure} disabled={!!measuring}>
            <Ruler size={14} /> {measuring ? s.team.measuring(measuring[0], measuring[1]) : s.team.measure}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {roles.map((r) => (
          <RoleCard key={`${r.id}-${r.model}-${r.brief.length}`} s={s} role={r} config={config} onSave={saveRole} />
        ))}
      </div>
    </Page>
  );
}

function RoleCard({
  s,
  role,
  config,
  onSave,
}: {
  s: Strings;
  role: Role;
  config: { mcp: string[]; costs: ContextCosts } | null;
  onSave: (r: Role) => Promise<void>;
}) {
  const [r, setR] = useState(role);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(r) !== JSON.stringify(role);
  const words = wordCount(r.brief);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const save = async () => {
    await onSave(r);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const costs = config?.costs;
  const ctx = costs?.roles[role.id];

  return (
    <Card
      title={
        <span className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-ink">
          <input
            type="color"
            aria-label={s.team.color}
            className="size-7 cursor-pointer appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            value={r.color}
            onChange={(e) => setR({ ...r, color: e.target.value })}
          />
          <input className="w-24 bg-transparent font-semibold outline-none" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
          <span className="text-[13px] font-normal text-muted capitalize">{r.title}</span>
        </span>
      }
      aside={<ModelBadge model={r.model} />}
    >
      <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-3">
        <Field label={s.team.model} group>
          <Segmented id={`role-model-${r.id}`} value={r.model} options={MODELS.map((m) => [m, m])} onChange={(m) => setR({ ...r, model: m })} />
        </Field>
        <Field label={s.team.escalate}>
          <select
            className={inputClass}
            value={r.escalate_to ?? ""}
            onChange={(e) => setR({ ...r, escalate_to: (e.target.value || undefined) as Model | undefined })}
          >
            <option value="">{s.team.none}</option>
            {MODELS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label={s.team.room}>
          <select className={inputClass} value={r.room} onChange={(e) => setR({ ...r, room: e.target.value })}>
            {ROOMS.filter((room) => room.id !== "door").map((room) => (
              <option key={room.id} value={room.id}>
                {s.rooms[room.id].name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-3">
        <Field
          label={s.team.brief}
          hint={
            <span className={cx(words > 400 ? "text-wait" : "")}>
              {s.team.words(words)} · {s.team.briefWarn}
            </span>
          }
        >
          <textarea className={`${inputClass} min-h-[90px] resize-y`} value={r.brief} onChange={(e) => setR({ ...r, brief: e.target.value })} />
        </Field>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[12px] font-semibold text-muted">{s.team.tools}</div>
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map((t) => (
            <Chip key={t} active={r.tools.includes(t)} onClick={() => setR({ ...r, tools: toggle(r.tools, t) })}>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[12px] font-semibold text-muted">{s.team.mcp}</div>
        {config?.mcp.length ? (
          <div className="flex flex-wrap gap-1.5">
            {config.mcp.map((m) => (
              <Chip key={m} disabled={r.everything} active={r.everything || r.mcp.includes(m)} onClick={() => setR({ ...r, mcp: toggle(r.mcp, m) })}>
                {m}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">{s.team.mcpEmpty}</p>
        )}
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px]">
        <input
          type="checkbox"
          className="mt-0.5 accent-[var(--accent)]"
          checked={r.everything}
          onChange={(e) => setR({ ...r, everything: e.target.checked })}
        />
        <span className={r.everything ? "font-medium text-wait" : "text-muted"}>{s.team.everything}</span>
      </label>

      <p className="mt-1 text-[11px] text-muted">{s.team.plugins}</p>

      <div className="mt-4 rounded-tile bg-fill-1 p-3.5">
        {ctx !== undefined && costs ? (
          <>
            <div className="mb-2.5 flex items-center gap-2 text-[13px] font-medium">
              <Zap size={14} className="text-good-text" />
              {s.team.context(compact(ctx), Math.max(0, Math.round((1 - ctx / costs.everything) * 100)))}
            </div>
            <Meter value={ctx / costs.everything} color="var(--green)" />
          </>
        ) : (
          <div className="text-[13px] text-muted">{s.team.notMeasured}</div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" disabled={!dirty} onClick={save}>
          {saved ? <Check size={14} /> : null} {saved ? s.team.saved : s.team.save}
        </Button>
      </div>
    </Card>
  );
}
