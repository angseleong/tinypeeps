import type { Activity } from "../../core/activity";

export type Model = "opus" | "sonnet" | "haiku";
export type Vec2 = [number, number];

export type RoomId = "ceo" | "desks" | "review" | "library" | "lounge";
export type Room = { id: RoomId; name: string; center: Vec2; size: Vec2; color: string; actions: { label: string; prompt: string }[] };

export const ROOMS: Room[] = [
  { id: "ceo", name: "Ruang CEO", center: [-6, -5], size: [5, 4], color: "#e8c9a8", actions: [{ label: "Laporan ke gw", prompt: "Laporkan ke CEO: apa yang sudah kamu kerjakan di folder ini dan apa yang tersisa. Singkat, poin-poin." }] },
  { id: "desks", name: "Meja Kerja", center: [0, 0], size: [8, 6], color: "#eadbc6", actions: [{ label: "Lanjutin kerjaan", prompt: "Lanjutkan pekerjaanmu yang terakhir di folder ini." }] },
  { id: "review", name: "Ruang Review", center: [7, 0], size: [5, 6], color: "#c9dcc4", actions: [
    { label: "Review kerjaan terbaru", prompt: "Review file yang paling baru diubah di folder ini. Sebutkan masalah dan saran perbaikan, singkat." },
    { label: "Cek sesuai tujuan", prompt: "Baca company.md kalau ada, lalu cek apakah isi folder ini sudah sesuai tujuan. Singkat." },
  ] },
  { id: "library", name: "Perpustakaan", center: [6, -6], size: [6, 3], color: "#c6d3e2", actions: [
    { label: "Riset topik ini", prompt: "Riset topik berikut lalu tulis ringkasan dengan sumber ke research.md: " },
    { label: "Baca folder & ringkas", prompt: "Baca isi folder ini dan beri ringkasan singkat untuk CEO." },
  ] },
  { id: "lounge", name: "Lounge", center: [-6, 5], size: [5, 4], color: "#efc9b5", actions: [] },
];

export type Peep = {
  id: string;
  name: string;
  role: string;
  model: Model;
  color: string;
  desk: Vec2;
  lounge: Vec2;
  brief: string;
  activity: Activity;
  label: string;
  lastText: string;
  log: string[];
  tokens: number;
  dropAt: Vec2 | null;
};

const brief = (role: string, job: string) =>
  `Kamu ${role} di kantor kecil "TinyPeeps". ${job} Kerjakan di folder saat ini saja. Jawab singkat dalam Bahasa Indonesia. Akhiri dengan catatan serah terima maks 150 kata: apa yang kamu lakukan, di mana hasilnya, apa yang tersisa.`;

const peep = (id: string, name: string, role: string, model: Model, color: string, desk: Vec2, lounge: Vec2, job: string): Peep => ({
  id, name, role, model, color, desk, lounge, brief: brief(role, job),
  activity: "idle", label: "", lastText: "", log: [], tokens: 0, dropAt: null,
});

export const START_PEEPS: Peep[] = [
  peep("bos", "Bos", "manajer", "opus", "#c96f4a", [-6, -5], [-7.8, 3.8], "Kamu memecah tujuan CEO jadi tugas, dan me-review hasil kerja tim. Jangan mengerjakan tugas kecil sendiri."),
  peep("designer", "Dina", "designer", "sonnet", "#5b7fa6", [-2, -1], [-6.2, 3.8], "Kamu membuat desain: SVG, HTML/CSS, dan aset visual."),
  peep("periset", "Raka", "periset", "haiku", "#5f8f6b", [2, -1], [-4.6, 3.8], "Kamu mencari fakta, sumber, dan contoh, lalu menuliskannya rapi."),
  peep("penulis", "Sari", "penulis", "sonnet", "#b58a3c", [0, 2], [-4.6, 5.6], "Kamu menulis teks: skrip, artikel, copy, README."),
];

export function roomAt([x, z]: Vec2): Room | null {
  return ROOMS.find((r) => Math.abs(x - r.center[0]) <= r.size[0] / 2 && Math.abs(z - r.center[1]) <= r.size[1] / 2) ?? null;
}

export const MODEL_COLOR: Record<Model, string> = { opus: "#c96f4a", sonnet: "#5b7fa6", haiku: "#5f8f6b" };
