// Where the walls, doors and furniture stand: drawn by Furniture.tsx, walked around by paths.ts.
import { OFFICE_SIZE, PODS, type Vec2 } from "./office-data";

// KayKit pieces are a size bigger than our Peeps (a table is 1 tall); this makes a desk reach a Peep's hip.
export const S = 0.65;
export const [HX, HZ] = [OFFICE_SIZE[0] / 2, OFFICE_SIZE[1] / 2];
export const OUTER_H = 2.6;
export const ENTRANCE: Vec2 = [10.8, 12.2]; // the Front Door: a gap in the back wall, x from..to

// [model, x, z, turn (rad), y, scale]. A piece faces +z (the camera side) unless turned.
export type Piece = [string, number, number, number?, number?, number?];
export const PIECES: Piece[] = [
  // CEO Office: the big desk, the CEO's chair behind it, a sofa for visitors
  ["rug_rectangle_A", -11, -6.6],
  ["table_medium_long", -11, -8.8],
  ["chair_A", -11, -9.9],
  ["lamp_table", -11.7, -8.95, 0, S, 0.45],
  ["book_set", -10.3, -9.0, 0, 0.81],
  ["couch_pillows", -14.4, -8, Math.PI / 2],
  ["cabinet_medium_decorated", -9, -10.67],
  ["lamp_standing", -14.4, -10.4],
  ["cactus_medium_A", -7.6, -10.5],
  ["pictureframe_large_A", -12.5, -11, 0, 1.5],
  // Manager's Office: desk facing the door, chairs for Peeps waiting for a review
  ["table_medium", -3.5, -9.0],
  ["chair_C", -4.3, -7.3, Math.PI],
  ["chair_C", -2.7, -7.3, Math.PI],
  ["cabinet_medium_decorated", -6.0, -10.67],
  ["cactus_small_A", -0.6, -10.5],
  ["pictureframe_medium", -1.4, -11, 0, 1.5],
  // Meeting Room: one long table
  ["table_medium_long", 3.03, -8],
  ["table_medium_long", 4.97, -8],
  ...[2.5, 3.5, 4.5, 5.5].flatMap((x): Piece[] => [
    ["chair_B", x, -9.0],
    ["chair_B", x, -7.0, Math.PI],
  ]),
  ["chair_B", 1.6, -8, Math.PI / 2],
  ["chair_B", 6.4, -8, -Math.PI / 2],
  ["cactus_medium_A", 7.4, -10.5],
  // Front Door: lobby with a waiting sofa and a reception desk
  ["rug_rectangle_A", 11.5, -9.9],
  ["couch", 8.6, -8, Math.PI / 2],
  ["table_medium_long", 13.9, -8, Math.PI / 2],
  ["chair_stool", 14.6, -8],
  ["cactus_medium_A", 9.4, -10.5],
  ["cactus_medium_A", 13.6, -10.5],
  ["lamp_standing", 9.0, -5.8],
  // Library: bookcases are built below; a reading corner
  ["rug_oval_A", -12, -1],
  ["armchair", -10.4, -1.9, -Math.PI / 2],
  ["armchair", -10.4, 0.3, -Math.PI / 2],
  ["table_small", -10.3, -0.8],
  ["lamp_standing", -9.7, 2.4],
  // Lounge: sofa, coffee table, the coffee machine on its cabinet
  ["rug_oval_A", -12.4, 7],
  ["couch_pillows", -14.4, 7, Math.PI / 2],
  ["table_low", -12.6, 7],
  ["cactus_small_A", -12.9, 7, 0, 0.33, 0.8],
  ["armchair", -11.2, 10.3, Math.PI],
  ["cabinet_small", -14.5, 4.0],
  ["lamp_standing", -14.4, 10.4],
  ["cactus_medium_A", -9.6, 10.4],
  // Desks: plants at the pods' ends
  ["cactus_medium_A", -8.3, 4.25],
  ["cactus_medium_A", 8.3, 4.25],
  ["cactus_small_A", -2.75, 4.25],
  ["cactus_small_A", 2.75, 4.25],
  ["cactus_medium_A", -2.75, -2.6],
  ["cactus_medium_A", 2.75, 10.4],
  // Server Room: the big machine's console (racks are built below)
  ["table_small", 14.2, 2.6],
  ["chair_stool", 13.4, 2.6],
  // Archive
  ["cabinet_medium", 10.2, 3.85],
  ["cabinet_medium_decorated", 11.6, 3.85],
  ["cabinet_medium", 13.0, 3.85],
  ["cabinet_small", 14.3, 3.85],
  ["cabinet_medium", 11.0, 7.6, Math.PI],
  ["cabinet_medium", 12.4, 7.6, Math.PI],
  ["table_medium", 11.7, 9.6],
];

export type Seg = [number, number, number, number]; // x1, z1, x2, z2: a straight wall along x or along z
// Glass partitions around the closed Rooms, with gaps where the doors are.
export const GLASS: Seg[] = [
  // back row: between the Rooms
  [-7, -11, -7, -5],
  [0, -11, 0, -5],
  [8, -11, 8, -5],
  // back row, on the corridor: a door into each Room
  [-15, -5, -8.8, -5],
  [-7.6, -5, -7, -5],
  [-7, -5, -4.1, -5],
  [-2.9, -5, 0, -5],
  [0, -5, 3.4, -5],
  [4.6, -5, 8, -5],
  // Library, its door on the corridor
  [-9, -3.7, -9, 3],
  // Server Room, its door from the Desks
  [9, -3.5, 15, -3.5],
  [9, -3.5, 9, -1.2],
  [9, 0, 9, 3.5],
  [9, 3.5, 15, 3.5],
];
// Low walls: they separate the open Rooms without hiding them.
export const LOW: Seg[] = [
  [-15, 3, -12.6, 3],
  [-11.4, 3, -9, 3],
  [9, 5.2, 9, 11],
];
// [hinge x, z, turn]: a door hinged at one side of its gap, swung wide open into the Room so Peeps fit
// through (paths.ts walks around the open door).
export const DOORS: [number, number, number][] = [
  [-8.8, -5, 1.4], // CEO Office
  [-4.1, -5, 1.4], // Manager's Office
  [3.4, -5, 1.4], // Meeting Room
  [-9, -4.9, -Math.PI / 2 - 1.4], // Library
  [9, -1.2, -Math.PI / 2 + 1.4], // Server Room
  [ENTRANCE[0], -HZ, -1.4], // Front Door
];
// Built pieces (not from the pack), drawn by Furniture.tsx.
export const BOOKCASE_Z = [-3.6, -2.2, -0.8, 0.6, 2.0]; // along the Library's wall; -0.8 is the Skill Shelf
export const RACKS: Vec2[] = [10.1, 11.0, 11.9, 12.8, 13.7].map((x): Vec2 => [x, -3.05]).concat([10.6, 11.5, 12.4].map((x): Vec2 => [x, 0.2]));

// What a Peep can't walk through. Footprints [width, depth] of the pack's pieces at scale S, before turning;
// pieces standing on something (y > 0), rugs and pictures don't block.
const FOOTPRINT: Record<string, Vec2> = {
  armchair: [1.17, 1.04],
  cabinet_medium: [1.3, 0.65],
  cabinet_medium_decorated: [1.33, 0.65],
  cabinet_small: [0.65, 0.65],
  cactus_medium_A: [0.57, 0.55],
  cactus_small_A: [0.33, 0.33],
  chair_A: [0.5, 0.55],
  chair_B: [0.5, 0.55],
  chair_C: [0.5, 0.61],
  chair_stool: [0.49, 0.49],
  couch: [1.95, 1.04],
  couch_pillows: [1.95, 1.04],
  lamp_standing: [0.4, 0.4],
  table_low: [1.56, 0.98],
  table_medium: [1.3, 1.3],
  table_medium_long: [1.95, 1.3],
  table_small: [0.65, 0.65],
};
export type Rect = [number, number, number, number]; // centre x, z, width (x), depth (z)
const turned = (w: number, d: number, r: number): Vec2 => (Math.abs(Math.sin(r)) > 0.7 ? [d, w] : [w, d]);
export const BLOCKS: Rect[] = [
  ...PIECES.flatMap(([m, x, z, r = 0, y = 0]): Rect[] => {
    const f = FOOTPRINT[m];
    return f && y === 0 ? [[x, z, ...turned(f[0], f[1], r)]] : [];
  }),
  ...PODS.map(([x, z]): Rect => [x, z, 4.4, 2.7]),
  ...RACKS.map(([x, z]): Rect => [x, z, 0.8, 0.7]),
  ...BOOKCASE_Z.map((z): Rect => [-HX + 0.22, z, 0.4, 1.3]),
  [14.4, 6.3, 0.5, 1.05], // the Archive's boxes
];
// Walls as segments: the far walls (with the Front Door's gap), glass, low walls and the open doors.
export const WALLS: Seg[] = [
  [-HX, -HZ, ENTRANCE[0], -HZ],
  [ENTRANCE[1], -HZ, HX, -HZ],
  [-HX, -HZ, -HX, HZ],
  ...GLASS,
  ...LOW,
  ...DOORS.map(([x, z, r]): Seg => [x, z, x + 1.2 * Math.cos(r), z - 1.2 * Math.sin(r)]),
];
