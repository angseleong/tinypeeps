// Throwaway spike (never imported by the app): can 6 rigged, animated low-poly characters plus a room
// of furniture run at 60 fps in React Three Fiber, in Electron, on an M1 MacBook Air?
// Knobs (URL query): label, chars (0-12), furn (0|1), shadows (0|1), toon (0|1), labels (0|1), dpr, secs.
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { type AnimationClip, type Group, type Material, type Mesh, MeshToonMaterial, type Object3D, type SkinnedMesh } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const q = new URLSearchParams(location.search);
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
const CFG = {
  label: q.get("label") ?? "run",
  chars: num("chars", 6),
  furn: num("furn", 1),
  shadows: num("shadows", 1),
  toon: num("toon", 0),
  labels: num("labels", 1),
  dpr: num("dpr", 1.5),
  fixdpr: num("fixdpr", 0), // force a pixel ratio: this Mac may sit on a 1x external monitor, the Air's own screen is 2x
  secs: num("secs", 10),
};

const CHARS = ["Knight", "Mage", "Rogue", "Ranger", "Barbarian", "Rogue_Hooded"];
const ANIMS = ["General", "MovementBasic", "Simulation", "Tools"];
// What a Peep does in turn. Typing has no clip of its own in the packs: sitting + Working_A stands in.
const SCRIPT = ["Walking_A", "Sit_Chair_Idle", "Working_A", "Waving", "Idle_A", "Cheering"];

// Three-tone gradient: the toon look the real office will use. One material per source material.
const toonCache = new Map<string, Material>();
function toon(m: any): Material {
  let t = toonCache.get(m.uuid);
  if (!t) {
    t = new MeshToonMaterial({ map: m.map, color: m.color });
    toonCache.set(m.uuid, t);
  }
  return t;
}

function Peep({ i, name, clips }: { i: number; name: string; clips: AnimationClip[] }) {
  const gltf = useGLTF(`/characters/${name}.glb`);
  const scene = useMemo(() => {
    const s = clone(gltf.scene) as Group;
    s.traverse((o: Object3D) => {
      const m = o as SkinnedMesh;
      if (m.isMesh) {
        m.castShadow = !!CFG.shadows;
        if (CFG.toon) m.material = toon(m.material);
      }
    });
    return s;
  }, [gltf]);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(clips, root);
  const state = useRef({ step: -1 });
  const x0 = -10 + (i % 6) * 4 + (i >= 6 ? 2 : 0);
  const z0 = i >= 6 ? 1 : -4;

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const step = Math.floor((clock.elapsedTime + i * 1.1) / 3) % SCRIPT.length;
    if (step !== state.current.step) {
      const prev = actions[SCRIPT[state.current.step] ?? ""];
      const next = actions[SCRIPT[step]];
      prev?.fadeOut(0.25);
      next?.reset().fadeIn(0.25).play();
      state.current.step = step;
    }
    if (SCRIPT[step] === "Walking_A") {
      g.position.z = z0 + Math.sin(clock.elapsedTime * 0.5 + i) * 3;
      g.rotation.y = Math.cos(clock.elapsedTime * 0.5 + i) > 0 ? 0 : Math.PI;
    } else {
      g.rotation.y = Math.PI;
    }
    void dt;
  });

  return (
    <group ref={root} position={[x0, 0, z0]}>
      <primitive object={scene} />
      {CFG.labels ? (
        <Html position={[0, 2.4, 0]} center pointerEvents="none">
          <div style={{ font: "600 12px sans-serif", background: "#fffd", padding: "2px 6px", borderRadius: 8 }}>{name}</div>
        </Html>
      ) : null}
    </group>
  );
}

const FURN: [string, number, number, number][] = []; // [model, x, z, rotY]
for (let i = 0; i < 6; i++) {
  const x = -10 + i * 4;
  FURN.push(
    ["table_medium", x, -5.5, 0],
    ["chair_A", x, -3.7, Math.PI],
    ["lamp_table", x + 0.7, -5.5, 0],
    ["book_set", x - 0.7, -5.5, 0],
    ["pictureframe_medium", x, -8, 0],
  );
}
for (let i = 0; i < 4; i++)
  FURN.push(["shelf_A_big", -11 + i * 3, 10.5, Math.PI], ["cabinet_medium_decorated", -11 + i * 3, 8.5, Math.PI], ["book_single", -11 + i * 3, 9, 0]);
FURN.push(
  ["rug_oval_A", 8, 6, 0],
  ["couch_pillows", 8, 8.5, Math.PI],
  ["armchair", 5.5, 6, Math.PI / 2],
  ["armchair", 10.5, 6, -Math.PI / 2],
  ["table_low", 8, 6, 0],
  ["lamp_standing", 12, 9, 0],
  ["cactus_medium_A", 12.5, 6, 0],
  ["rug_rectangle_A", -6, 2, 0],
  ["table_medium_long", -6, 2, 0],
  ["chair_B", -7.5, 3, Math.PI],
  ["chair_B", -6, 3, Math.PI],
  ["chair_B", -4.5, 3, Math.PI],
  ["chair_C", -7.5, 0.8, 0],
  ["chair_C", -6, 0.8, 0],
  ["chair_C", -4.5, 0.8, 0],
  ["cabinet_small", 13, -4, -Math.PI / 2],
  ["shelf_B_large_decorated", 13, -7, -Math.PI / 2],
  ["shelf_B_small", 13, -9, -Math.PI / 2],
  ["chair_stool", 3, 4, 0],
  ["table_small", 3, 5, 0],
  ["couch", -12.5, 5, Math.PI / 2],
);
const MODELS = [...new Set(FURN.map((f) => f[0]))];

function Furniture() {
  const gltfs = useGLTF(MODELS.map((m) => `/furniture/${m}.gltf`));
  const byName = Object.fromEntries(MODELS.map((m, i) => [m, gltfs[i].scene]));
  return (
    <>
      {FURN.map(([m, x, z, r]) => {
        // clone() copies the node tree but shares geometry and material, so memory stays flat.
        const o = byName[m].clone();
        o.traverse((n: Object3D) => {
          const mesh = n as Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = !!CFG.shadows;
            mesh.receiveShadow = !!CFG.shadows;
            if (CFG.toon) mesh.material = toon(mesh.material);
          }
        });
        return <primitive key={`${m}@${x},${z}`} object={o} position={[x, m === "book_set" || m === "lamp_table" ? 1.0 : 0, z]} rotation-y={r} />;
      })}
    </>
  );
}

function Measure() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const WARM = 2500;
    const dts: number[] = [];
    let last = performance.now();
    const t0 = last;
    let raf = 0;
    const loop = (now: number) => {
      if (now - t0 > WARM) dts.push(now - last);
      last = now;
      if (now - t0 < WARM + CFG.secs * 1000) raf = requestAnimationFrame(loop);
      else finish();
    };
    const finish = () => {
      const sorted = [...dts].sort((a, b) => a - b);
      const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
      const p = (k: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * k))];
      const ext = gl.getContext().getExtension("WEBGL_debug_renderer_info");
      const r = gl.info.render;
      console.log(
        `RESULT ${JSON.stringify({
          cfg: CFG,
          frames: dts.length,
          fps: +(1000 / mean).toFixed(1),
          p95ms: +p(0.95).toFixed(1),
          p99ms: +p(0.99).toFixed(1),
          maxms: +sorted[sorted.length - 1].toFixed(1),
          over20ms: dts.filter((d) => d > 20).length,
          calls: r.calls,
          triangles: r.triangles,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          gpu: ext ? gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?",
          dpr: gl.getPixelRatio(),
          win: `${innerWidth}x${innerHeight}`,
        })}`,
      );
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

function Scene() {
  const clips = useGLTF(ANIMS.map((a) => `/animations/Rig_Medium_${a}.glb`)).flatMap((g) => g.animations);
  return (
    <>
      <color attach="background" args={["#f4f1ec"]} />
      <ambientLight intensity={1} />
      <directionalLight
        position={[8, 15, 6]}
        intensity={1.5}
        castShadow={!!CFG.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#ece7df" />
      </mesh>
      {CFG.furn ? <Furniture /> : null}
      {CHARS.concat(CHARS)
        .slice(0, CFG.chars)
        .map((n, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the slot number is the identity here (a fixed list, never reordered)
          <Peep key={`${n}${i}`} i={i} name={n} clips={clips} />
        ))}
      <Measure />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <Canvas shadows={!!CFG.shadows} dpr={CFG.fixdpr || [1, CFG.dpr]} gl={{ powerPreference: "high-performance" }} camera={{ position: [11, 13, 13], fov: 40 }}>
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  </Canvas>,
);
