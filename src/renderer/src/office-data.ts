import type { Activity } from "../../core/activity";
import type { Role } from "../../core/roles";

export type Vec2 = [number, number];
export type RoomId = "ceo" | "desks" | "review" | "library" | "lounge";
export type Room = { id: RoomId; center: Vec2; size: Vec2; color: string; dark: string };

// Where each Room is. Its name and Quick Actions are words, so they live in src/core/strings.
export const ROOMS: Room[] = [
  { id: "ceo", center: [-6, -5], size: [5, 4], color: "#e8c9a8", dark: "#4a3a2c" },
  { id: "desks", center: [0, 0], size: [8, 6], color: "#eadbc6", dark: "#3a332b" },
  { id: "review", center: [7, 0], size: [5, 6], color: "#c9dcc4", dark: "#2f3d31" },
  { id: "library", center: [6, -6], size: [6, 3], color: "#c6d3e2", dark: "#2c3542" },
  { id: "lounge", center: [-6, 5], size: [5, 4], color: "#efc9b5", dark: "#46332b" },
];

export type LogLine = { t: number; text: string };
export type Runtime = { activity: Activity; label: string; lastText: string; log: LogLine[]; tokens: number; dropAt: Vec2 | null };
export type Peep = Role & Runtime;

export const freshRuntime = (): Runtime => ({ activity: "idle", label: "", lastText: "", log: [], tokens: 0, dropAt: null });

export function roomAt([x, z]: Vec2): Room | null {
  return ROOMS.find((r) => Math.abs(x - r.center[0]) <= r.size[0] / 2 && Math.abs(z - r.center[1]) <= r.size[1] / 2) ?? null;
}
