import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { type Group, type Mesh, type OrthographicCamera, Plane, Vector3 } from "three";
import type { OrbitControls as Controls } from "three/examples/jsm/controls/OrbitControls.js";
import { MANAGER_ID } from "../../core/roles";
import type { Strings } from "../../core/strings";
import { ActivityPill, activityLabel, isWorking } from "../activity-ui";
import { BakedShadows, Furniture } from "./Furniture";
import { PAL, toon } from "./look";
import { deskFacing, OFFICE_SIZE, type Peep, ROOMS, type RoomId, type Vec2 } from "./office-data";
import { LOOKS, MANAGER_LOOK, type Motion, Person } from "./Person";
import { findPath } from "./paths";

type Props = {
  s: Strings;
  active: boolean;
  dark: boolean;
  reduced: boolean;
  peeps: Peep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (id: string, at: Vec2) => void;
};

const FLOOR = new Plane(new Vector3(0, 1, 0), 0);

// Development only: logs the office's frame rate every 5 s to the terminal running `npm run dev`.
function FpsProbe() {
  const acc = useRef({ frames: 0, since: performance.now() });
  const mode = useThree((st) => st.frameloop);
  useFrame(() => {
    const a = acc.current;
    a.frames++;
    const now = performance.now();
    if (now - a.since >= 5000) {
      console.warn(`[fps] office ${((a.frames * 1000) / (now - a.since)).toFixed(1)} (${mode})`);
      a.frames = 0;
      a.since = now;
    }
  });
  return null;
}

// A Peep on its way keeps the office drawing (see Ticker) until shortly after it stops.
const walking = { until: 0 };

// Draws only while something moves, at most 60 times a second: after any change (Peeps walk for a few
// seconds), while a Peep works or is carried. A still office draws nothing. The camera redraws itself.
function Ticker({ peeps, busy }: { peeps: Peep[]; busy: boolean }) {
  const invalidate = useThree((st) => st.invalidate);
  const until = useRef(0);
  const working = peeps.some((p) => isWorking(p.activity) || p.activity === "waiting" || p.activity === "stuck" || p.dropAt);
  // What can make a Peep move: where it should be. A new array with the same contents isn't a change.
  const where = peeps.map((p) => `${p.id}:${p.activity}:${p.dropAt ?? ""}:${p.color}`).join("|");
  useEffect(() => {
    if (!where) return;
    until.current = performance.now() + 5000;
    invalidate();
  }, [where, invalidate]);
  useEffect(() => {
    let raf = 0;
    let next = 0;
    const tick = (now: number) => {
      // A 60 fps beat, not "15.5 ms since the last frame": on a 144 Hz screen that gave every third refresh (48 fps).
      if ((busy || working || now < until.current || now < walking.until) && now >= next - 2) {
        next = (now - next > 50 ? now : next) + 1000 / 60;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [busy, working, invalidate]);
  return null;
}

export function Office({ s, active, dark, reduced, peeps, selectedId, onSelect, onDrop }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovered, setHovered] = useState<RoomId | null>(null);
  return (
    // Hidden behind another page, the scene stops drawing (see Ticker for when it draws); dpr is capped because a Retina canvas at 2x
    // is four times the pixels for a picture this simple.
    // Orthographic and isometric: the office reads like a diorama, and `flat` keeps the palette's
    // colours as written (no tone mapping). Hidden behind another page the scene stops drawing (see
    // Ticker for when it draws); dpr is capped because 2x is four times the pixels for little gain.
    <Canvas
      shadows
      flat
      orthographic
      frameloop={active ? "demand" : "never"}
      dpr={[1, 1.5]}
      gl={{ powerPreference: "high-performance" }}
      camera={{ position: [30, 30, 30], zoom: 30, near: 0.1, far: 200 }}
    >
      <color attach="background" args={[dark ? "#1b1a19" : "#f4f1ec"]} />
      <ambientLight intensity={dark ? 1.1 : 1.35} />
      <directionalLight
        position={[6, 15, 9]}
        intensity={dark ? 1.2 : 1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={4}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {active && <Ticker peeps={peeps} busy={!!dragging} />}
      {import.meta.env.DEV && <FpsProbe />}
      <IsoControls enabled={!dragging} />

      {/* the plinth: the office stands on it like a diorama; its top is the corridor's floor */}
      <mesh position={[0, -0.2, 0]} material={toon(dark ? "#34302b" : "#d6ccbd")} receiveShadow>
        <boxGeometry args={[OFFICE_SIZE[0] + 0.4, 0.4, OFFICE_SIZE[1] + 0.4]} />
      </mesh>
      {ROOMS.map((r) => (
        <group key={r.id} position={[r.center[0], 0.005, r.center[1]]}>
          <mesh
            rotation-x={-Math.PI / 2}
            material={toon(dark ? r.dark : r.color)}
            receiveShadow
            onPointerOver={() => setHovered(r.id)}
            onPointerOut={() => setHovered((h) => (h === r.id ? null : h))}
          >
            <planeGeometry args={[r.size[0] - 0.1, r.size[1] - 0.1]} />
          </mesh>
          {/* a Room's name shows only while it's pointed at or a Peep is carried: the furniture says the rest */}
          {(dragging || hovered === r.id) && (
            <Html position={[0, 0.05, 0]} center zIndexRange={[5, 0]} className="room-label">
              {s.rooms[r.id].name}
            </Html>
          )}
        </group>
      ))}
      <Suspense fallback={null}>
        <Furniture dark={dark} />
        <BakedShadows />
      </Suspense>
      {peeps.map((p, i) => (
        <PeepMesh
          key={p.id}
          s={s}
          reduced={reduced}
          peep={p}
          // shortcut: a look by place in the list, so it can change when the team changes; the Avatar editor (package C) stores one per Role
          look={p.id === MANAGER_ID ? MANAGER_LOOK : LOOKS[i % LOOKS.length]}
          selected={p.id === selectedId}
          onSelect={onSelect}
          onDrop={onDrop}
          setDragging={setDragging}
        />
      ))}
    </Canvas>
  );
}

// Isometric, with a little turn and zoom (docs/office.md#look). Zoom starts where the whole office fits
// the window, and zooms towards the cursor, so there's no panning to get lost in.
const VIEW: Vec2 = [38, 25]; // the office's size on screen at zoom 1, walls included
function IsoControls({ enabled }: { enabled: boolean }) {
  const size = useThree((st) => st.size);
  const camera = useThree((st) => st.camera) as OrthographicCamera;
  const controls = useThree((st) => st.controls) as Controls | null;
  useEffect(() => {
    const fit = Math.min(size.width / VIEW[0], size.height / VIEW[1]);
    camera.zoom = fit;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.minZoom = fit * 0.9;
      controls.maxZoom = fit * 2.6;
    }
  }, [size.width, size.height, camera, controls]);
  const iso = Math.PI / 4;
  return (
    <OrbitControls
      makeDefault
      enabled={enabled}
      enablePan={false}
      zoomToCursor
      minAzimuthAngle={iso - 0.35}
      maxAzimuthAngle={iso + 0.35}
      minPolarAngle={0.8}
      maxPolarAngle={1.1}
    />
  );
}

type PeepProps = {
  s: Strings;
  reduced: boolean;
  peep: Peep;
  look: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onDrop: (id: string, at: Vec2) => void;
  setDragging: (id: string | null) => void;
};

// Waiting for an Approval: the Peep queues in front of the CEO's desk. Its lounge spot is unique, so
// it doubles as a place in that line.
const CEO_DESK_FRONT: Vec2 = [-11, -6.8];
const LOUNGE = ROOMS.find((r) => r.id === "lounge")?.center ?? [0, 0];

function homeOf(p: Peep): Vec2 {
  if (p.dropAt) return p.dropAt;
  if (p.activity === "waiting") return [CEO_DESK_FRONT[0] + (p.lounge[0] - LOUNGE[0]) * 0.5, CEO_DESK_FRONT[1] + (p.lounge[1] - LOUNGE[1]) * 0.35];
  return p.activity === "idle" || p.activity === "queued" ? p.lounge : p.desk;
}

// Squash and stretch with anticipation (motion-prompt #011, #121): a Peep crouches before it's
// lifted, stretches while it dangles, and squashes when it lands, then settles.
type Pose = { kind: "lift" | "land"; t0: number } | null;
function poseScale(pose: Pose, now: number): [number, number] {
  if (!pose) return [1, 1];
  const e = now - pose.t0;
  if (pose.kind === "lift") {
    if (e < 0.09) {
      const k = e / 0.09; // anticipation: crouch
      return [1 + 0.16 * k, 1 - 0.22 * k];
    }
    const k = Math.min(1, (e - 0.09) / 0.12); // then stretch out of it
    return [1.16 - 0.24 * k, 0.78 + 0.36 * k];
  }
  const y = 1 - 0.3 * Math.exp(-e * 7) * Math.cos(e * 24); // land: squash, overshoot, settle
  return [1 + (1 - y) * 0.6, y];
}

function PeepMesh({ s, reduced, peep, look, selected, onSelect, onDrop, setDragging }: PeepProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const blob = useRef<Mesh>(null);
  const carry = useRef<{ start: Vector3; at: Vector3; moved: boolean } | null>(null);
  const pose = useRef<Pose>(null);
  const motion = useRef<Motion["current"]>("pose");
  // The way to where the Peep should be, found again whenever that place changes or it's put down.
  const route = useRef<{ to: string; points: Vec2[] }>({ to: "", points: [] });
  const [mood, setMood] = useState<"" | "!?" | "?">("");
  const [start] = useState(() => homeOf(peep)); // set once: after that useFrame walks the Peep
  // Reused every frame, so walking makes no garbage.
  const tmp = useRef({ hit: new Vector3(), target: new Vector3(), dir: new Vector3(), lifted: new Vector3() }).current;

  useFrame(({ clock }, dt) => {
    const g = group.current;
    const b = body.current;
    if (!g || !b) return;
    const t = clock.elapsedTime;
    if (blob.current) blob.current.position.y = 0.02 - g.position.y; // the blob stays on the floor
    const [sx, sy] = reduced ? [1, 1] : poseScale(pose.current, t);
    b.scale.set(sx, sy, sx);
    if (pose.current?.kind === "land" && t - pose.current.t0 > 0.8) pose.current = null;

    const c = carry.current;
    if (c) {
      motion.current = c.moved ? "fall" : "pose";
      g.position.lerp(tmp.lifted.set(c.at.x, c.moved ? 1.4 : 0, c.at.z), 0.35);
      b.rotation.z = reduced || !c.moved ? 0 : Math.sin(t * 14) * 0.22; // dangling
      b.rotation.x = reduced || !c.moved ? 0 : Math.sin(t * 11) * 0.12;
      return;
    }
    const home = homeOf(peep);
    const r = route.current;
    if (r.to !== `${home}`) route.current = { to: `${home}`, points: findPath([g.position.x, g.position.z], home) };
    const pts = route.current.points;
    while (pts.length > 1 && Math.hypot(pts[0][0] - g.position.x, pts[0][1] - g.position.z) < 0.05) pts.shift();
    const [hx, hz] = pts[0] ?? home;
    tmp.target.set(hx, 0, hz);
    const dist = g.position.distanceTo(tmp.target);
    if (dist > 0.05) {
      tmp.dir.copy(tmp.target).sub(g.position).normalize();
      g.position.addScaledVector(tmp.dir, Math.min(dist, dt * 3.2));
      motion.current = "walk";
      g.rotation.y = Math.atan2(tmp.dir.x, tmp.dir.z);
      walking.until = performance.now() + 200; // a long walk outlasts the Ticker's few seconds
    } else {
      motion.current = "pose";
      const a = peep.activity;
      if (a === "waiting")
        g.rotation.y = Math.PI; // facing the CEO's desk
      else if (a !== "idle" && a !== "queued" && !peep.dropAt) g.rotation.y = deskFacing(peep.desk); // face the desk
    }
    b.rotation.set(0, 0, 0);
  });

  const ray = (e: ThreeEvent<PointerEvent>) => e.ray.intersectPlane(FLOOR, tmp.hit)?.clone() ?? null;

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const at = ray(e);
    if (!at) return;
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    carry.current = { start: at, at, moved: false };
    setDragging(peep.id);
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    const c = carry.current;
    if (!c) return;
    const at = ray(e);
    if (!at) return;
    c.at = at;
    if (!c.moved && at.distanceTo(c.start) > 0.3) {
      c.moved = true;
      pose.current = { kind: "lift", t0: -1 };
      setMood("!?");
    }
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    const c = carry.current;
    if (!c) return;
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    carry.current = null;
    setDragging(null);
    if (!c.moved) {
      pose.current = null;
      onSelect(peep.id);
      return;
    }
    group.current?.position.set(c.at.x, 0, c.at.z);
    route.current.to = ""; // put down somewhere new: find the way again from here
    pose.current = { kind: "land", t0: -1 };
    setMood("?");
    setTimeout(() => setMood(""), 1600);
    onDrop(peep.id, [c.at.x, c.at.z]);
  };

  return (
    <group ref={group} position={[start[0], 0, start[1]]} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <PoseClock pose={pose} />
      <group ref={body}>
        <Suspense fallback={null}>
          <Person look={look} activity={peep.activity} motion={motion} reduced={reduced} />
        </Suspense>
      </group>
      <mesh ref={blob} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#3a2a1e" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {peep.activity === "delegating" && <Helper look={look} reduced={reduced} />}
      {peep.activity === "thinking" && <ThoughtBubble reduced={reduced} />}
      {peep.activity === "stuck" && <Alarm reduced={reduced} />}
      {/* the Peep's own colour on the floor, as in the HUD; terracotta around it when selected */}
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.4, 0.46, 40]} />
        <meshBasicMaterial color={peep.color} />
      </mesh>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.48, 0.55, 40]} />
          <meshBasicMaterial color={PAL.terracotta} />
        </mesh>
      )}
      <Html position={[0, 1.85, 0]} center zIndexRange={[6, 0]} className="peep-label" pointerEvents="none">
        {mood ? <div className="mood">{mood}</div> : null}
        <span className="font-semibold">{peep.name}</span>
        <ActivityPill activity={peep.activity} label={activityLabel(s, peep)} className="text-[10px] text-muted" />
      </Html>
    </group>
  );
}

// A subagent at work: a small helper, in the Peep's own look, pops up beside it and runs on the spot
// until its result is back.
const WALKING: Motion = { current: "walk" };
function Helper({ look, reduced }: { look: string; reduced: boolean }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    const h = g.current;
    if (h) h.scale.setScalar(reduced ? 0.45 : Math.min(0.45, h.scale.x + dt * 2));
  });
  return (
    <group ref={g} position={[0.75, 0, 0.35]} scale={reduced ? 0.45 : 0.01}>
      <Suspense fallback={null}>
        <Person look={look} activity="delegating" motion={WALKING} reduced={reduced} />
      </Suspense>
    </group>
  );
}

// Thinking: three cream puffs rising beside the head, the last one big.
function ThoughtBubble({ reduced }: { reduced: boolean }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current && !reduced) g.current.position.y = 1.35 + Math.sin(clock.elapsedTime * 2) * 0.04;
  });
  return (
    <group ref={g} position={[0.35, 1.35, 0]}>
      {[
        [0, 0, 0.05],
        [0.12, 0.14, 0.08],
        [0.28, 0.34, 0.17],
      ].map(([x, y, r]) => (
        <mesh key={r} position={[x, y, 0]} material={toon(PAL.cream)}>
          <sphereGeometry args={[r, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

// Stuck: a red "!" over its head, bobbing.
function Alarm({ reduced }: { reduced: boolean }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current && !reduced) g.current.position.y = 1.55 + Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.08;
  });
  return (
    <group ref={g} position={[0, 1.55, 0]}>
      <mesh position={[0, 0.2, 0]} material={toon("#d0453a")}>
        <boxGeometry args={[0.09, 0.26, 0.09]} />
      </mesh>
      <mesh position={[0, 0, 0]} material={toon("#d0453a")}>
        <boxGeometry args={[0.09, 0.09, 0.09]} />
      </mesh>
    </group>
  );
}

// Pointer events don't know the scene clock, so poses started from them are stamped here, on the next frame.
function PoseClock({ pose }: { pose: { current: Pose } }) {
  useFrame(({ clock }) => {
    const p = pose.current;
    if (p && p.t0 < 0) pose.current = { ...p, t0: clock.elapsedTime };
  });
  return null;
}
