// Peeps walk around walls and through doors: no step of a walk between Rooms crosses a wall.
import { describe, expect, it } from "vitest";
import { type Seg, WALLS } from "../src/app/office/layout";
import type { Vec2 } from "../src/app/office/office-data";
import { findPath, isFree } from "../src/app/office/paths";
import { defaultRoles } from "../src/core/roles";

// Do segments a-b and c-d cross?
function crosses([ax, az]: Vec2, [bx, bz]: Vec2, [cx, cz, dx, dz]: Seg): boolean {
  const side = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number) => Math.sign((qx - px) * (rz - pz) - (qz - pz) * (rx - px));
  return side(ax, az, bx, bz, cx, cz) * side(ax, az, bx, bz, dx, dz) < 0 && side(cx, cz, dx, dz, ax, az) * side(cx, cz, dx, dz, bx, bz) < 0;
}

const PLACES: Record<string, Vec2> = {
  hireDesk: [-6.9, -0.7],
  farDesk: [5.5, 9.2],
  managerSeat: defaultRoles("en")[0].desk,
  ceoQueue: [-11, -6.8],
  lounge: [-13, 5],
  library: [-12, -1],
  server: [11, -1.5],
  meeting: [4, -6],
  lobby: [11.5, -9.5],
};

describe("walking", () => {
  const names = Object.keys(PLACES);
  for (const a of names)
    for (const b of names) {
      if (a === b) continue;
      it(`goes from ${a} to ${b} without crossing a wall`, () => {
        const path = findPath(PLACES[a], PLACES[b]);
        expect(path.at(-1)).toEqual(PLACES[b]);
        const legs = [PLACES[a], ...path];
        for (let k = 0; k < legs.length - 1; k++)
          for (const w of WALLS) expect(crosses(legs[k], legs[k + 1], w), `${legs[k]} → ${legs[k + 1]} crosses ${w}`).toBe(false);
      });
    }

  it("blocks walls and furniture and leaves the corridor free", () => {
    expect(isFree([-3.5, -5])).toBe(true); // the Manager's door
    expect(isFree([-5.5, -5])).toBe(false); // the glass next to it
    expect(isFree([-5.5, 1])).toBe(false); // a pod
    expect(isFree([0, -4.25])).toBe(true); // the corridor
  });
});
