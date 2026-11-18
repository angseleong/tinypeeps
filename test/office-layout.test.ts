// Layout `studio-small`: nine Rooms that don't overlap, each named in both languages, and every seat a
// Role can have inside the Room it belongs to, including seats saved by the layout before it.
import { describe, expect, it } from "vitest";
import { deskFacing, OFFICE_SIZE, PODS, ROOMS, roomAt, SEAT_DX, SEAT_DZ } from "../src/app/office/office-data";
import { defaultRoles, MANAGER_ID, parseRole, placeHire, type Role } from "../src/core/roles";
import { STRINGS } from "../src/core/strings";

describe("studio-small", () => {
  it("has nine Rooms inside the office that never overlap, each named in both languages", () => {
    expect(ROOMS.map((r) => r.id).sort()).toEqual(["archive", "ceo", "desks", "door", "library", "lounge", "meeting", "review", "server"]);
    for (const r of ROOMS) {
      for (const k of [0, 1]) expect(Math.abs(r.center[k]) + r.size[k] / 2).toBeLessThanOrEqual(OFFICE_SIZE[k] / 2);
      expect(STRINGS.en.rooms[r.id]?.name).toBeTruthy();
      expect(STRINGS.id.rooms[r.id]?.name).toBeTruthy();
    }
    const inside = (x: number, z: number) => ROOMS.filter((r) => Math.abs(x - r.center[0]) < r.size[0] / 2 && Math.abs(z - r.center[1]) < r.size[1] / 2).length;
    for (let x = -15; x <= 15; x += 0.25) for (let z = -11; z <= 11; z += 0.25) expect(inside(x, z)).toBeLessThanOrEqual(1);
  });

  it("puts the Manager behind its desk and hires in the first pod, facing each other, resting in the Lounge", () => {
    const roles: Role[] = defaultRoles("en");
    expect(roomAt(roles[0].desk)?.id).toBe("review");
    for (let i = 0; i < 6; i++) roles.push(placeHire({ ...roles[0], id: `p${i}`, room: "desks" }, roles, "en"));
    const [px, pz] = PODS[0];
    for (const r of roles.slice(1)) {
      expect(roomAt(r.lounge)?.id).toBe("lounge");
      const [x, z] = r.desk;
      expect(SEAT_DX.some((dx) => Math.abs(px + dx - x) < 1e-9)).toBe(true);
      expect(Math.abs(Math.abs(z - pz) - SEAT_DZ)).toBeLessThan(1e-9);
      expect(deskFacing(r.desk)).toBe(z < pz ? 0 : Math.PI); // towards the divider
    }
    expect(new Set(roles.map((r) => `${r.desk}`)).size).toBe(roles.length);
  });

  it("moves seats saved by the first layout to the new ones", () => {
    const hire = parseRole("dina", "---\nname: Dina\ndesk: [2, -1]\nlounge: [-4.6, 3.8]\n---\nBrief.\n");
    expect(roomAt(hire.desk)?.id).toBe("desks");
    expect(hire.desk).not.toEqual([2, -1]);
    const boss = parseRole(MANAGER_ID, "---\nname: Bos\ndesk: [-6, -5]\nlounge: [-7.8, 3.8]\n---\nBrief.\n");
    expect(boss.desk).toEqual(defaultRoles("en")[0].desk);
  });
});
