import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { type Group, Plane, Vector3 } from "three";
import type { Strings } from "../../core/strings";
import { ActivityPill, isWorking } from "./activity-ui";
import { type Peep, ROOMS, type Vec2 } from "./office-data";

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

// Draws only while something moves, at most 60 times a second: after any change (Peeps walk for a few
// seconds), while a Peep works or is carried. A still office draws nothing. The camera redraws itself.
function Ticker({ peeps, busy }: { peeps: Peep[]; busy: boolean }) {
  const invalidate = useThree((st) => st.invalidate);
  const until = useRef(0);
  const working = peeps.some((p) => isWorking(p.activity) || p.activity === "waiting" || p.dropAt);
  // What can make a Peep move: where it should be. A new array with the same contents isn't a change.
  const where = peeps.map((p) => `${p.id}:${p.activity}:${p.dropAt ?? ""}:${p.color}`).join("|");
  useEffect(() => {
    if (!where) return;
    until.current = performance.now() + 5000;
    invalidate();
  }, [where, invalidate]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if ((busy || working || now < until.current) && now - last >= 15.5) {
        last = now;
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
  return (
    // Hidden behind another page, the scene stops drawing (see Ticker for when it draws); dpr is capped because a Retina canvas at 2x
    // is four times the pixels for a picture this simple.
    <Canvas
      shadows
      frameloop={active ? "demand" : "never"}
      dpr={[1, 1.5]}
      gl={{ powerPreference: "high-performance" }}
      camera={{ position: [11, 13, 13], fov: 40 }}
    >
      <color attach="background" args={[dark ? "#1b1a19" : "#f4f1ec"]} />
      <ambientLight intensity={dark ? 0.7 : 1} />
      <directionalLight
        position={[8, 15, 6]}
        intensity={dark ? 1.3 : 1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      {active && <Ticker peeps={peeps} busy={!!dragging} />}
      {import.meta.env.DEV && <FpsProbe />}
      <OrbitControls makeDefault enabled={!dragging} maxPolarAngle={1.2} minDistance={8} maxDistance={30} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color={dark ? "#222120" : "#ece7df"} />
      </mesh>
      {ROOMS.map((r) => (
        <group key={r.id} position={[r.center[0], 0.01, r.center[1]]}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={r.size} />
            <meshStandardMaterial color={dark ? r.dark : r.color} />
          </mesh>
          <Html position={[0, 0.05, -r.size[1] / 2 + 0.4]} center zIndexRange={[5, 0]} className="room-label">
            {s.rooms[r.id].name}
          </Html>
        </group>
      ))}
      <Furniture peeps={peeps} />
      {peeps.map((p) => (
        <PeepMesh key={p.id} s={s} reduced={reduced} peep={p} selected={p.id === selectedId} onSelect={onSelect} onDrop={onDrop} setDragging={setDragging} />
      ))}
    </Canvas>
  );
}

function Furniture({ peeps }: { peeps: Peep[] }) {
  return (
    <>
      {peeps.map((p) => (
        <group key={p.id} position={[p.desk[0], 0, p.desk[1] - 0.9]}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.8, 0.8]} />
            <meshStandardMaterial color="#b98e6a" />
          </mesh>
          <mesh position={[0, 0.95, 0]}>
            <boxGeometry args={[0.7, 0.3, 0.05]} />
            <meshStandardMaterial color="#2f3a40" />
          </mesh>
        </group>
      ))}
      <mesh position={[-6, 0.3, 6.3]} castShadow>
        <boxGeometry args={[3, 0.6, 0.9]} />
        <meshStandardMaterial color="#8fa58a" />
      </mesh>
      <mesh position={[-8, 0.6, 3.6]} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.6]} />
        <meshStandardMaterial color="#5a4a42" />
      </mesh>
      {[-1.5, 0, 1.5].map((dx) => (
        <mesh key={dx} position={[6 + dx * 1.3, 0.9, -7.2]} castShadow>
          <boxGeometry args={[1.6, 1.8, 0.4]} />
          <meshStandardMaterial color="#7d6450" />
        </mesh>
      ))}
    </>
  );
}

type PeepProps = {
  s: Strings;
  reduced: boolean;
  peep: Peep;
  selected: boolean;
  onSelect: (id: string) => void;
  onDrop: (id: string, at: Vec2) => void;
  setDragging: (id: string | null) => void;
};

// Waiting for an Approval: the Peep queues in front of the CEO's desk. Its lounge spot is unique, so
// it doubles as a place in that line.
const CEO_DESK_FRONT: Vec2 = [-3.6, -4.6];

function homeOf(p: Peep): Vec2 {
  if (p.dropAt) return p.dropAt;
  if (p.activity === "waiting") return [CEO_DESK_FRONT[0] + (p.lounge[0] + 6) * 0.35, CEO_DESK_FRONT[1] + (p.lounge[1] - 4.5) * 0.5];
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

function PeepMesh({ s, reduced, peep, selected, onSelect, onDrop, setDragging }: PeepProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const carry = useRef<{ start: Vector3; at: Vector3; moved: boolean } | null>(null);
  const pose = useRef<Pose>(null);
  const [mood, setMood] = useState<"" | "!?" | "?">("");
  const [start] = useState(() => homeOf(peep)); // set once: after that useFrame walks the Peep
  // Reused every frame, so walking makes no garbage.
  const tmp = useRef({ hit: new Vector3(), target: new Vector3(), dir: new Vector3(), lifted: new Vector3() }).current;

  useFrame(({ clock }, dt) => {
    const g = group.current;
    const b = body.current;
    if (!g || !b) return;
    const t = clock.elapsedTime;
    const [sx, sy] = reduced ? [1, 1] : poseScale(pose.current, t);
    b.scale.set(sx, sy, sx);
    if (pose.current?.kind === "land" && t - pose.current.t0 > 0.8) pose.current = null;

    const c = carry.current;
    if (c) {
      g.position.lerp(tmp.lifted.set(c.at.x, c.moved ? 1.4 : 0, c.at.z), 0.35);
      b.rotation.z = reduced || !c.moved ? 0 : Math.sin(t * 14) * 0.22; // dangling
      b.rotation.x = reduced || !c.moved ? 0 : Math.sin(t * 11) * 0.12;
      return;
    }
    const [hx, hz] = homeOf(peep);
    tmp.target.set(hx, 0, hz);
    const dist = g.position.distanceTo(tmp.target);
    if (dist > 0.05) {
      tmp.dir.copy(tmp.target).sub(g.position).normalize();
      g.position.addScaledVector(tmp.dir, Math.min(dist, dt * 3));
      g.position.y = reduced ? 0 : Math.abs(Math.sin(t * 12)) * 0.1;
      g.rotation.y = Math.atan2(tmp.dir.x, tmp.dir.z);
    } else {
      g.position.y = 0;
      if (peep.activity !== "idle" && peep.activity !== "queued" && !peep.dropAt) g.rotation.y = Math.PI; // face the desk
    }
    const a = peep.activity;
    b.rotation.z = a === "stuck" ? Math.sin(t * 30) * 0.06 : a === "reading" ? Math.sin(t * 1.5) * 0.06 : a === "waiting" ? Math.sin(t * 5) * 0.05 : 0;
    b.rotation.x = a === "typing" ? 0.12 + Math.sin(t * 25) * 0.025 : a === "thinking" ? Math.sin(t * 2) * 0.04 : 0;
    b.position.y = a === "running" ? Math.abs(Math.sin(t * 8)) * 0.12 : 0;
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
    pose.current = { kind: "land", t0: -1 };
    setMood("?");
    setTimeout(() => setMood(""), 1600);
    onDrop(peep.id, [c.at.x, c.at.z]);
  };

  return (
    <group ref={group} position={[start[0], 0, start[1]]} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <PoseClock pose={pose} />
      <group ref={body}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.5, 4, 12]} />
          <meshStandardMaterial color={peep.color} />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color="#f2d3b8" />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 1.38, 0.27]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color="#222" />
          </mesh>
        ))}
      </group>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.45, 0.52, 40]} />
          <meshBasicMaterial color="#d9774c" />
        </mesh>
      )}
      <Html position={[0, 2.05, 0]} center zIndexRange={[6, 0]} className="peep-label" pointerEvents="none">
        {mood ? <div className="mood">{mood}</div> : null}
        <span className="font-semibold">{peep.name}</span>
        <ActivityPill activity={peep.activity} label={s.activity[peep.activity]} className="text-[10px] text-muted" />
      </Html>
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
