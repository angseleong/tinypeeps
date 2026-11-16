import { useEffect, useRef, useState } from "react";
import { ACTIVITY_LABEL, type Activity, type PeepUpdate, type Usage } from "../../core/activity";
import { type Model, type Peep, type Room, roomAt, START_PEEPS, type Vec2 } from "./office-data";
import { Office } from "./Office";

type Drop = { peepId: string; room: Room | null; near: Peep | null };
type Totals = Record<Model, number>;

// Cache reads are counted apart: they're cheap, and with many plugins they dwarf the real work.
const fresh = (u: Usage) => u.input + u.output + u.cacheWrite;

const SIM_ACTIVITIES: Activity[] = ["typing", "reading", "researching", "running", "thinking", "idle", "stuck"];
const SIM_LABELS = ["Edit: logo.svg", "Read: brief.md", "WebSearch: tren 2026", "Bash: npm test", "Write: skrip-ep1.md"];

export function App() {
  const [peeps, setPeeps] = useState<Peep[]>(START_PEEPS);
  const [officeDir, setOfficeDir] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [totals, setTotals] = useState<Totals>({ opus: 0, sonnet: 0, haiku: 0 });
  const [cached, setCached] = useState(0);
  const [sim, setSim] = useState(false);
  const [notice, setNotice] = useState("");
  const peepsRef = useRef(peeps);
  peepsRef.current = peeps;

  const patch = (id: string, fn: (p: Peep) => Partial<Peep>) => setPeeps((ps) => ps.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)));

  const apply = (id: string, u: PeepUpdate) => {
    const line = u.error ?? u.label ?? (u.text ? `💬 ${u.text.slice(0, 120)}` : null);
    patch(id, (p) => ({
      activity: u.activity ?? p.activity,
      label: u.label ?? p.label,
      lastText: u.text ?? p.lastText,
      log: line ? [...p.log, line].slice(-40) : p.log,
      dropAt: u.done ? null : p.dropAt,
      tokens: p.tokens + (u.usage ? fresh(u.usage) : 0),
    }));
    if (u.usage) {
      const usage = u.usage;
      const model = peepsRef.current.find((p) => p.id === id)?.model ?? "sonnet";
      setTotals((t) => ({ ...t, [model]: t[model] + fresh(usage) }));
      setCached((c) => c + usage.cacheRead);
    }
  };

  useEffect(() => window.tiny.onUpdate(apply), []);

  // Simulation: fake activities so the office can be checked without spending tokens.
  useEffect(() => {
    if (!sim) return;
    const timer = setInterval(() => {
      const p = peepsRef.current[Math.floor(Math.random() * peepsRef.current.length)];
      const activity = SIM_ACTIVITIES[Math.floor(Math.random() * SIM_ACTIVITIES.length)];
      apply(p.id, { activity, label: `(simulasi) ${SIM_LABELS[Math.floor(Math.random() * SIM_LABELS.length)]}` });
    }, 1200);
    return () => clearInterval(timer);
  }, [sim]);

  const run = async (peepId: string, prompt: string) => {
    const p = peepsRef.current.find((x) => x.id === peepId);
    if (!p) return;
    if (!officeDir) {
      setNotice("Pilih folder kantor dulu (kiri atas). Peep cuma kerja di folder itu.");
      return;
    }
    patch(peepId, (x) => ({ activity: "thinking", label: "Nerima tugas", log: [...x.log, `📝 Tugas: ${prompt.slice(0, 120)}`] }));
    const r = await window.tiny.run({ peepId, model: p.model, prompt, brief: p.brief, cwd: officeDir });
    if (r === "busy") setNotice(`${p.name} masih kerja. Stop dulu atau tunggu selesai.`);
  };

  const onDrop = (peepId: string, at: Vec2) => {
    const others = peepsRef.current.filter((p) => p.id !== peepId);
    const near = others.find((o) => Math.hypot(o.desk[0] - at[0], o.desk[1] - at[1]) < 1.6) ?? null;
    patch(peepId, () => ({ dropAt: at }));
    setDrop({ peepId, room: roomAt(at), near });
  };

  const cancelDrop = () => {
    if (drop) patch(drop.peepId, () => ({ dropAt: null }));
    setDrop(null);
  };

  const selected = peeps.find((p) => p.id === selectedId) ?? null;
  const working = peeps.filter((p) => !["idle", "queued", "stuck"].includes(p.activity)).length;

  return (
    <div className="app">
      <Office peeps={peeps} selectedId={selectedId} onSelect={setSelectedId} onDrop={onDrop} />

      <div className="topbar">
        <b>TinyPeeps</b>
        <button type="button" onClick={async () => setOfficeDir((await window.tiny.pickOffice()) ?? officeDir)}>
          📁 {officeDir ? officeDir.split("/").slice(-2).join("/") : "Pilih folder kantor"}
        </button>
        <label className="toggle">
          <input
            type="checkbox"
            checked={sim}
            onChange={(e) => {
              setSim(e.target.checked);
              if (!e.target.checked) setPeeps((ps) => ps.map((p) => (p.label.startsWith("(simulasi)") ? { ...p, activity: "idle", label: "" } : p)));
            }}
          />{" "}
          Simulasi (0 token)
        </label>
      </div>

      <div className="hud">
        <div className="hud-big">{(totals.opus + totals.sonnet + totals.haiku).toLocaleString("id-ID")}</div>
        <div className="muted">token baru sesi ini · +{cached.toLocaleString("id-ID")} dari cache</div>
        <div className="hud-row">
          {(Object.keys(totals) as Model[]).map((m) => (
            <span key={m} className={`model ${m}`}>
              {m} {totals[m].toLocaleString("id-ID")}
            </span>
          ))}
        </div>
        <div className="muted">{working} kerja · maks 3 barengan</div>
      </div>

      {notice && (
        <button type="button" className="notice" onClick={() => setNotice("")}>
          {notice} ✕
        </button>
      )}

      {drop && <DropBox drop={drop} peeps={peeps} onCancel={cancelDrop} onSend={(prompt) => { run(drop.peepId, prompt); setDrop(null); }} onStop={() => { window.tiny.stop(drop.peepId); setDrop(null); }} />}

      {selected && <SidePanel peep={selected} onClose={() => setSelectedId(null)} onModel={(m) => patch(selected.id, () => ({ model: m }))} onStop={() => window.tiny.stop(selected.id)} />}

      <CommandBar peeps={peeps} onSend={run} />
    </div>
  );
}

function DropBox({ drop, peeps, onCancel, onSend, onStop }: { drop: Drop; peeps: Peep[]; onCancel: () => void; onSend: (prompt: string) => void; onStop: () => void }) {
  const [text, setText] = useState("");
  const peep = peeps.find((p) => p.id === drop.peepId);
  if (!peep) return null;
  const near = drop.near;
  const nearContext = near?.lastText ? `\n\nHasil terakhir ${near.name} (${near.role}):\n${near.lastText.slice(0, 2000)}` : "";
  const actions = [
    ...(near
      ? [
          { label: `Review kerjaan ${near.name}`, prompt: `Review hasil kerja ${near.name} (${near.role}). Sebutkan yang bagus, yang kurang, dan saran konkret.${nearContext}` },
          { label: `Kasih arahan ke ${near.name}`, prompt: `Tulis arahan singkat untuk ${near.name} (${near.role}) tentang langkah berikutnya.${nearContext}` },
        ]
      : []),
    ...(drop.room?.actions ?? []),
  ];
  const where = near ? `ke deket ${near.name}` : drop.room ? `ke ${drop.room.name}` : "ke lorong";
  return (
    <div className="dropbox">
      <div className="dropbox-title">
        {peep.name} dipindah {where}. Mau ngapain? <span className={`model ${peep.model}`}>{peep.model}</span>
      </div>
      <div className="chips">
        {actions.map((a) => (
          <button type="button" key={a.label} onClick={() => onSend(a.prompt + (text ? `\n\nCatatan CEO: ${text}` : ""))}>
            {a.label}
          </button>
        ))}
        {drop.room?.id === "lounge" && (
          <button type="button" onClick={onStop}>
            Istirahat (stop)
          </button>
        )}
      </div>
      <textarea autoFocus placeholder="Atau ketik sendiri…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>
          Batal
        </button>
        <button type="button" className="primary" disabled={!text.trim()} onClick={() => onSend(text + nearContext)}>
          Kirim
        </button>
      </div>
    </div>
  );
}

function SidePanel({ peep, onClose, onModel, onStop }: { peep: Peep; onClose: () => void; onModel: (m: Model) => void; onStop: () => void }) {
  return (
    <aside className="panel">
      <div className="row">
        <h2>
          {peep.name} <span className="muted">· {peep.role}</span>
        </h2>
        <button type="button" className="ghost" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="row">
        <span>{ACTIVITY_LABEL[peep.activity]}</span>
        <select value={peep.model} onChange={(e) => onModel(e.target.value as Model)}>
          <option value="opus">opus</option>
          <option value="sonnet">sonnet</option>
          <option value="haiku">haiku</option>
        </select>
      </div>
      <div className="muted">{peep.tokens.toLocaleString("id-ID")} token</div>
      <button type="button" onClick={onStop}>
        Stop
      </button>
      <h3>Hasil terakhir</h3>
      <pre className="result">{peep.lastText || "Belum ada."}</pre>
      <h3>Log</h3>
      <ul className="log">
        {[...peep.log].reverse().map((l, i) => (
          <li key={`${i}-${l}`}>{l}</li>
        ))}
      </ul>
    </aside>
  );
}

function CommandBar({ peeps, onSend }: { peeps: Peep[]; onSend: (peepId: string, prompt: string) => void }) {
  const [to, setTo] = useState("bos");
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    onSend(to, text);
    setText("");
  };
  return (
    <div className="command">
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        {peeps.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.model})
          </option>
        ))}
      </select>
      <input placeholder="Mau bikin apa hari ini?" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
      <button type="button" className="primary" onClick={send}>
        Kirim
      </button>
    </div>
  );
}
