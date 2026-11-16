import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { type Group, Plane, Vector3 } from "three";
import { ACTIVITY_LABEL } from "../../core/activity";
import { type Peep, ROOMS, type Vec2 } from "./office-data";

type Props = {
  peeps: Peep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (id: string, at: Vec2) => void;
};

const FLOOR = new Plane(new Vector3(0, 1, 0), 0);

export function Office({ peeps, selectedId, onSelect, onDrop }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  return (
    <Canvas shadows camera={{ position: [11, 13, 13], fov: 40 }}>
      <color attach="background" args={["#f7f4ef"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 15, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} />
      <OrbitControls makeDefault enabled={!dragging} maxPolarAngle={1.2} minDistance={8} maxDistance={30} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[30, 24]} />
        <meshStandardMaterial color="#f3eee6" />
      </mesh>
      {ROOMS.map((r) => (
        <group key={r.id} position={[r.center[0], 0.01, r.center[1]]}>
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={r.size} />
            <meshStandardMaterial color={r.color} />
          </mesh>
          <Html position={[0, 0.05, -r.size[1] / 2 + 0.4]} center className="room-label">
            {r.name}
          </Html>
        </group>
      ))}
      <Furniture peeps={peeps} />
      {peeps.map((p) => (
        <PeepMesh key={p.id} peep={p} selected={p.id === selectedId} others={peeps} onSelect={onSelect} onDrop={onDrop} setDragging={setDragging} />
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
          <mesh position={[0, 0.95, 0]} castShadow>
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
  peep: Peep;
  selected: boolean;
  others: Peep[];
  onSelect: (id: string) => void;
  onDrop: (id: string, at: Vec2) => void;
  setDragging: (id: string | null) => void;
};

function homeOf(p: Peep): Vec2 {
  if (p.dropAt) return p.dropAt;
  return p.activity === "idle" || p.activity === "queued" ? p.lounge : p.desk;
}

function PeepMesh({ peep, selected, onSelect, onDrop, setDragging }: PeepProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const carry = useRef<{ start: Vector3; at: Vector3; moved: boolean } | null>(null);
  const [mood, setMood] = useState<"" | "!?" | "?">("");
  const [start] = useState(() => homeOf(peep)); // set once: after that useFrame walks the Peep
  const hit = new Vector3();

  useFrame(({ clock }, dt) => {
    const g = group.current;
    const b = body.current;
    if (!g || !b) return;
    const t = clock.elapsedTime;
    const c = carry.current;
    if (c) {
      g.position.lerp(new Vector3(c.at.x, 1.4, c.at.z), 0.4);
      b.rotation.z = Math.sin(t * 22) * 0.35; // panic wobble while dangling
      b.rotation.x = Math.sin(t * 17) * 0.2;
      return;
    }
    const [hx, hz] = homeOf(peep);
    const target = new Vector3(hx, 0, hz);
    const dist = g.position.distanceTo(target);
    if (dist > 0.05) {
      const step = Math.min(dist, dt * 3);
      const dir = target.clone().sub(g.position).normalize();
      g.position.addScaledVector(dir, step);
      g.position.y = Math.abs(Math.sin(t * 12)) * 0.12; // walk hop
      g.rotation.y = Math.atan2(dir.x, dir.z);
    } else {
      g.position.y = 0;
      if (peep.activity !== "idle" && peep.activity !== "queued" && !peep.dropAt) g.rotation.y = Math.PI; // face the desk
    }
    const a = peep.activity;
    b.rotation.z = a === "stuck" ? Math.sin(t * 30) * 0.08 : a === "reading" ? Math.sin(t * 1.5) * 0.08 : 0;
    b.rotation.x = a === "typing" ? 0.15 + Math.sin(t * 25) * 0.03 : a === "thinking" ? Math.sin(t * 2) * 0.05 : 0;
    b.position.y = a === "running" ? Math.abs(Math.sin(t * 8)) * 0.15 : a === "idle" ? Math.sin(t * 2) * 0.02 : 0;
  });

  const ray = (e: ThreeEvent<PointerEvent>) => e.ray.intersectPlane(FLOOR, hit)?.clone() ?? null;

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
      onSelect(peep.id);
      return;
    }
    group.current?.position.set(c.at.x, 0, c.at.z);
    setMood("?");
    setTimeout(() => setMood(""), 1800);
    onDrop(peep.id, [c.at.x, c.at.z]);
  };

  return (
    <group ref={group} position={[start[0], 0, start[1]]} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <group ref={body}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.5, 6, 12]} />
          <meshStandardMaterial color={peep.color} />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <sphereGeometry args={[0.3, 20, 16]} />
          <meshStandardMaterial color="#f2d3b8" />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 1.38, 0.27]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
        {selected && (
          <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.45, 0.55, 32]} />
            <meshBasicMaterial color="#c96f4a" />
          </mesh>
        )}
      </group>
      <Html position={[0, 2.05, 0]} center className="peep-label" pointerEvents="none">
        {mood ? <div className="mood">{mood}</div> : null}
        <b>{peep.name}</b> <span className={`model ${peep.model}`}>{peep.model}</span>
        <div>{ACTIVITY_LABEL[peep.activity]}</div>
      </Html>
    </group>
  );
}
