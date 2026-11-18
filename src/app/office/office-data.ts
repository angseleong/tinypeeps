import type { Activity } from "../../core/activity";
import type { Role } from "../../core/roles";

export type Vec2 = [number, number];
export type RoomId = "ceo" | "desks" | "review" | "meeting" | "library" | "server" | "door" | "archive" | "lounge";
export type Room = { id: RoomId; center: Vec2; size: Vec2; color: string; dark: string };

// Layout `studio-small` (docs/office.md#rooms-in-v1), 30 x 22. Along the back wall, closed rooms behind
// glass: CEO Office, Manager's Office, Meeting Room, then the open lobby with the Front Door. A corridor
// runs in front of them. Left: Library and Lounge; middle: the open plan with the Desks; right: Server
// Room and Archive. The corridor isn't a Room (a Drop there goes "to the hallway"). Walls are on the far
// sides (-x, -z) so the camera looks in from the open corner.
export const ROOMS: Room[] = [
  { id: "ceo", center: [-11, -8], size: [8, 6], color: "#ecd3c1", dark: "#503f34" },
  { id: "review", center: [-3.5, -8], size: [7, 6], color: "#efdccb", dark: "#4a3e34" },
  { id: "meeting", center: [4, -8], size: [8, 6], color: "#ebe1cf", dark: "#48413a" },
  { id: "door", center: [11.5, -8], size: [7, 6], color: "#e8dfd0", dark: "#443e36" },
  { id: "library", center: [-12, -1], size: [6, 8], color: "#dbe3d2", dark: "#3a463b" },
  { id: "lounge", center: [-12, 7], size: [6, 8], color: "#d5e0cb", dark: "#374437" },
  { id: "desks", center: [0, 3.75], size: [18, 14.5], color: "#f2e9d9", dark: "#463f37" },
  { id: "server", center: [12, 0], size: [6, 7], color: "#dcd7cf", dark: "#3f3e3c" },
  { id: "archive", center: [12, 7.25], size: [6, 7.5], color: "#e6ddca", dark: "#46413a" },
];
export const OFFICE_SIZE: Vec2 = [30, 22];

// The Desks: six pods of six desks, two rows facing each other across a divider. A seat is where the
// Peep stands, SEAT_DZ in front of its pod's divider. Hired Peeps take the first pod (src/core/roles.ts SLOTS).
export const PODS: Vec2[] = [
  [-5.5, 1],
  [0, 1],
  [5.5, 1],
  [-5.5, 7.5],
  [0, 7.5],
  [5.5, 7.5],
];
export const SEAT_DX = [-1.4, 0, 1.4];
export const SEAT_DZ = 1.7;

// Which way a Peep faces at its desk: towards the divider in a pod, otherwise +z (the Manager sits behind
// its desk, facing the door).
export function deskFacing([x, z]: Vec2): number {
  const pod = PODS.find(([px, pz]) => Math.abs(x - px) <= 2.2 && Math.abs(z - pz) <= 2.2);
  return pod && z > pod[1] ? Math.PI : 0;
}

export type LogLine = { t: number; text: string };
export type Runtime = { activity: Activity; label: string; lastText: string; log: LogLine[]; tokens: number; dropAt: Vec2 | null };
export type Peep = Role & Runtime;

export const freshRuntime = (): Runtime => ({ activity: "idle", label: "", lastText: "", log: [], tokens: 0, dropAt: null });

export function roomAt([x, z]: Vec2): Room | null {
  return ROOMS.find((r) => Math.abs(x - r.center[0]) <= r.size[0] / 2 && Math.abs(z - r.center[1]) <= r.size[1] / 2) ?? null;
}
