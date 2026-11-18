import { BakeShadows, useGLTF } from "@react-three/drei";
import { memo, useMemo } from "react";
import { type Mesh, MeshBasicMaterial, type Object3D } from "three";
import { BOOKCASE_Z, DOORS, ENTRANCE, GLASS, HX, HZ, LOW, OUTER_H, PIECES, RACKS, S, type Seg } from "./layout";
import { PAL, toon, toonOf } from "./look";
import { OFFICE_SIZE, PODS, SEAT_DX } from "./office-data";

const MODELS = [...new Set(PIECES.map((p) => p[0]).concat("book_set"))];
const url = (m: string) => `furniture/${m}.gltf`; // relative: works from the dev server and from file://
// No Draco or meshopt decoders: the packs don't need them, and their WebAssembly breaks the window's strict CSP.
useGLTF.preload(MODELS.map(url), false, false);

function useModels() {
  const gltfs = useGLTF(MODELS.map(url), false, false);
  return useMemo(() => {
    const byName = Object.fromEntries(MODELS.map((m, i) => [m, gltfs[i].scene]));
    // clone() shares geometry and material, so 60 pieces cost no extra memory.
    return (name: string, cast = true) => {
      const o = byName[name].clone();
      o.traverse((n: Object3D) => {
        const mesh = n as Mesh;
        if (!mesh.isMesh) return;
        mesh.material = toonOf(mesh.material as never);
        mesh.castShadow = cast;
        mesh.receiveShadow = true;
      });
      return o;
    };
  }, [gltfs]);
}

type BoxProps = { at: [number, number, number]; size: [number, number, number]; color: string; cast?: boolean };
const Box = ({ at, size, color, cast = true }: BoxProps) => (
  <mesh position={at} material={toon(color)} castShadow={cast} receiveShadow>
    <boxGeometry args={size} />
  </mesh>
);

const GLASS_MAT = new MeshBasicMaterial({ color: "#cfe4ea", transparent: true, opacity: 0.22, depthWrite: false });

// A wall from (x1, z1) to (x2, z2), built along local x and turned into place.
function Wall({ seg: [x1, z1, x2, z2], kind, frame }: { seg: Seg; kind: "glass" | "low"; frame: string }) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const posts = Math.ceil(len / 2);
  return (
    <group position={[(x1 + x2) / 2, 0, (z1 + z2) / 2]} rotation-y={x1 === x2 ? Math.PI / 2 : 0}>
      {kind === "low" ? (
        <>
          <Box at={[0, 0.45, 0]} size={[len, 0.9, 0.14]} color={frame} />
          <Box at={[0, 0.93, 0]} size={[len, 0.06, 0.2]} color={PAL.wood} />
        </>
      ) : (
        <>
          <Box at={[0, 0.25, 0]} size={[len, 0.5, 0.12]} color={frame} />
          <mesh position={[0, 1.4, 0]} material={GLASS_MAT}>
            <boxGeometry args={[len, 1.8, 0.03]} />
          </mesh>
          <Box at={[0, 2.33, 0]} size={[len, 0.07, 0.1]} color={PAL.woodDark} cast={false} />
          {Array.from({ length: posts + 1 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: posts along a fixed wall
            <Box key={i} at={[-len / 2 + (i * len) / posts, 1.4, 0]} size={[0.07, 1.8, 0.08]} color={PAL.woodDark} cast={false} />
          ))}
        </>
      )}
    </group>
  );
}

export function Furniture({ dark }: { dark: boolean }) {
  const piece = useModels();
  const placed = useMemo(
    () =>
      PIECES.map(([m, x, z, r = 0, y = 0, s = S], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list, never reordered
        <primitive key={i} object={piece(m, !m.startsWith("rug"))} position={[x, y, z]} rotation-y={r} scale={s} />
      )),
    [piece],
  );
  const wall = dark ? "#4a433b" : PAL.cream;
  return (
    <>
      {placed}
      {/* the two far walls, with a terracotta skirting and the Front Door's gap */}
      <Box at={[(-HX + ENTRANCE[0]) / 2 - 0.1, OUTER_H / 2, -HZ - 0.1]} size={[ENTRANCE[0] + HX + 0.2, OUTER_H, 0.2]} color={wall} cast={false} />
      <Box at={[(ENTRANCE[1] + HX) / 2 + 0.1, OUTER_H / 2, -HZ - 0.1]} size={[HX - ENTRANCE[1] + 0.2, OUTER_H, 0.2]} color={wall} cast={false} />
      <Box at={[(ENTRANCE[0] + ENTRANCE[1]) / 2, OUTER_H - 0.15, -HZ - 0.1]} size={[ENTRANCE[1] - ENTRANCE[0], 0.3, 0.2]} color={wall} cast={false} />
      <Box at={[-HX - 0.1, OUTER_H / 2, 0]} size={[0.2, OUTER_H, OFFICE_SIZE[1] + 0.2]} color={wall} cast={false} />
      <Box at={[(-HX + ENTRANCE[0]) / 2, 0.08, -HZ + 0.02]} size={[ENTRANCE[0] + HX, 0.16, 0.04]} color={PAL.terracotta} cast={false} />
      <Box at={[(ENTRANCE[1] + HX) / 2, 0.08, -HZ + 0.02]} size={[HX - ENTRANCE[1], 0.16, 0.04]} color={PAL.terracotta} cast={false} />
      <Box at={[-HX + 0.02, 0.08, 0]} size={[0.04, 0.16, OFFICE_SIZE[1]]} color={PAL.terracotta} cast={false} />
      {GLASS.map((seg) => (
        <Wall key={`${seg}`} seg={seg} kind="glass" frame={wall} />
      ))}
      {LOW.map((seg) => (
        <Wall key={`${seg}`} seg={seg} kind="low" frame={wall} />
      ))}
      {DOORS.map(([x, z, r]) => (
        <group key={`${x},${z}`} position={[x, 0, z]} rotation-y={r}>
          <Box at={[0.6, 1.0, 0]} size={[1.2, 2.0, 0.07]} color={PAL.terracotta} />
          <Box at={[1.05, 1.0, 0.06]} size={[0.06, 0.06, 0.06]} color={PAL.cream} cast={false} />
        </group>
      ))}
      {/* the Manager's monitor faces the Manager, who sits behind the desk */}
      <Monitor x={-3.5} y={S} z={-9.3} rot={Math.PI} />
      {/* Meeting Room whiteboard */}
      <Box at={[4, 1.45, -10.95]} size={[2.6, 1.2, 0.05]} color="#fbf8f2" cast={false} />
      <Box at={[4, 0.83, -10.9]} size={[2.6, 0.05, 0.12]} color={PAL.grey} cast={false} />
      {PODS.map(([x, z]) => (
        <Pod key={`${x},${z}`} x={x} z={z} piece={piece} />
      ))}
      {/* Library: bookcases along the left wall; the terracotta one is the Skill Shelf */}
      {BOOKCASE_Z.map((z) => (
        <Bookcase key={z} x={-HX + 0.22} z={z} rot={Math.PI / 2} frame={z === -0.8 ? PAL.terracotta : PAL.wood} piece={piece} />
      ))}
      {/* Server Room: two rows of racks */}
      {RACKS.map(([x, z], i) => (
        <Rack key={`${x},${z}`} x={x} z={z} i={i} />
      ))}
      <Monitor x={14.2} y={S} z={2.6} rot={-Math.PI / 2} />
      {/* Lounge: the coffee machine */}
      <group position={[-14.5, S, 4.0]} rotation-y={Math.PI / 2}>
        <Box at={[0, 0.22, -0.05]} size={[0.34, 0.44, 0.3]} color={PAL.terracotta} />
        <Box at={[0, 0.2, 0.1]} size={[0.2, 0.16, 0.06]} color={PAL.screen} cast={false} />
        <Box at={[0, 0.05, 0.12]} size={[0.1, 0.1, 0.1]} color={PAL.cream} cast={false} />
      </group>
      {/* Archive: boxes of finished work */}
      <Box at={[14.4, 0.22, 6.0]} size={[0.5, 0.44, 0.45]} color={PAL.wood} />
      <Box at={[14.4, 0.22, 6.6]} size={[0.5, 0.44, 0.45]} color={PAL.wood} />
      <Box at={[14.4, 0.66, 6.3]} size={[0.5, 0.44, 0.45]} color={PAL.terracottaSoft} />
    </>
  );
}

// Six desks in two rows facing each other across a sage divider, panels between neighbours: cubicles.
function Pod({ x, z, piece }: { x: number; z: number; piece: (m: string) => Object3D }) {
  const tables = useMemo(() => SEAT_DX.flatMap(() => [piece("table_medium"), piece("table_medium")]), [piece]);
  return (
    <group position={[x, 0, z]}>
      {SEAT_DX.flatMap((dx, i) =>
        [-1, 1].map((side, k) => (
          <group key={`${dx},${side}`} position={[dx, 0, side * 0.65]}>
            <primitive object={tables[i * 2 + k]} scale={S} />
            <Monitor x={0} y={S} z={-side * 0.3} rot={side < 0 ? Math.PI : 0} />
            <Box at={[0, S + 0.015, side * 0.2]} size={[0.46, 0.03, 0.16]} color={PAL.cream} cast={false} />
          </group>
        )),
      )}
      <Box at={[0, 0.58, 0]} size={[4.3, 1.16, 0.07]} color={PAL.sage} />
      {[-2.15, 2.15].map((dx) => (
        <Box key={dx} at={[dx, 0.5, 0]} size={[0.07, 1.0, 2.7]} color={PAL.sage} />
      ))}
      {[-0.7, 0.7].map((dx) => (
        <Box key={dx} at={[dx, 0.45, 0]} size={[0.05, 0.9, 2.6]} color={PAL.sageSoft} />
      ))}
    </group>
  );
}

// The desk monitor (later it shows the real tool: docs/office.md#details-that-make-it-feel-alive).
function Monitor({ x, y, z, rot = 0 }: { x: number; y: number; z: number; rot?: number }) {
  return (
    <group position={[x, y, z]} rotation-y={rot}>
      <Box at={[0, 0.02, 0]} size={[0.24, 0.04, 0.16]} color={PAL.screen} />
      <Box at={[0, 0.12, 0]} size={[0.06, 0.18, 0.06]} color={PAL.screen} />
      <Box at={[0, 0.36, 0]} size={[0.6, 0.38, 0.05]} color={PAL.screen} />
      <Box at={[0, 0.36, 0.03]} size={[0.52, 0.3, 0.01]} color="#56707a" cast={false} />
    </group>
  );
}

const SHELVES = [0.06, 0.66, 1.26];
type BookcaseProps = { x: number; z: number; rot: number; frame: string; piece: (m: string, cast?: boolean) => Object3D };
function Bookcase({ x, z, rot, frame, piece }: BookcaseProps) {
  const books = useMemo(() => SHELVES.flatMap(() => [piece("book_set", false), piece("book_set", false)]), [piece]);
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <Box at={[0, 0.95, -0.17]} size={[1.3, 1.9, 0.06]} color={frame} />
      <Box at={[-0.62, 0.95, 0]} size={[0.06, 1.9, 0.4]} color={frame} />
      <Box at={[0.62, 0.95, 0]} size={[0.06, 1.9, 0.4]} color={frame} />
      {[...SHELVES, 1.87].map((y) => (
        <Box key={y} at={[0, y, 0]} size={[1.3, 0.06, 0.4]} color={frame} />
      ))}
      {books.map((b, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: two books per shelf, fixed
        <primitive key={i} object={b} position={[i % 2 ? 0.28 : -0.28, SHELVES[i >> 1] + 0.03 + 0.25 * S, 0]} scale={S} />
      ))}
    </group>
  );
}

function Rack({ x, z, i }: { x: number; z: number; i: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box at={[0, 0.75, 0]} size={[0.8, 1.5, 0.7]} color={PAL.screen} />
      {[0.35, 0.65, 0.95, 1.25].map((y, k) => (
        <group key={y}>
          <Box at={[0, y, 0.36]} size={[0.66, 0.2, 0.02]} color="#454c51" cast={false} />
          <mesh position={[0.24, y, 0.375]}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
            <meshBasicMaterial color={(i + k) % 3 ? PAL.sageSoft : PAL.terracottaSoft} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Shadows are drawn once into the shadow map when the furniture has loaded, then reused every frame
// (drei's BakeShadows turns off the map's auto-update), so the office pays nothing for them per frame.
// Peeps cast none: each has its own blob under it.
export const BakedShadows = memo(BakeShadows);
