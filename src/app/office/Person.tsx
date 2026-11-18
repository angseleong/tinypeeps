import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, type Group, Mesh, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Activity } from "../../core/activity";
import { PAL, toon, toonOf } from "./look";

// Kenney Mini Characters (assets/CREDITS.md): one file each, 32 clips inside, a 7-bone rig. The office
// people first; the police officer and the pirate only once the office is big.
export const MANAGER_LOOK = "male-d"; // the suit and tie
export const LOOKS = ["female-d", "male-e", "female-e", "male-a", "female-a", "male-f", "female-b", "male-b", "female-c", "female-f", "male-g", "male-c"];
const url = (look: string) => `peeps/character-${look}.glb`; // relative: works from the dev server and from file://

// The pack's people are 0.67 tall; at 2x a Peep stands about twice a desk's height.
const PEEP_SCALE = 2;

// What a Peep does once it has arrived (docs/office.md#activities): a clip from the pack, sitting on its
// chair or not, what it holds. Bone tweaks on top, in `tweak`, for what no clip shows.
type Stance = { clip: string; sit?: boolean; hold?: "book" | "phone" | "cup" | "paper" };
const STANCE: Record<Activity, Stance> = {
  typing: { clip: "sit", sit: true },
  reading: { clip: "sit", sit: true, hold: "book" },
  researching: { clip: "sit", sit: true, hold: "phone" },
  thinking: { clip: "sit", sit: true },
  running: { clip: "interact-right" }, // pressing buttons
  delegating: { clip: "idle" },
  waiting: { clip: "holding-right", hold: "paper" },
  stuck: { clip: "idle" },
  idle: { clip: "holding-right", hold: "cup" },
  queued: { clip: "sit", sit: true },
};

// "walk" and "fall" (dangling while carried) come from PeepMesh; "pose" means the Activity's stance.
export type Motion = { current: "walk" | "fall" | "pose" };

type Props = { look: string; activity: Activity; motion: Motion; reduced: boolean };

export function Person({ look, activity, motion, reduced }: Props) {
  const gltf = useGLTF(url(look), false, false);
  const { scene, bones, held } = useMemo(() => {
    const scene = clone(gltf.scene) as Group;
    scene.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (m.isMesh) m.material = toonOf(m.material as never);
    });
    const bone = (n: string) => scene.getObjectByName(n) as Object3D;
    const bones = { armL: bone("arm-left"), armR: bone("arm-right"), head: bone("head"), legR: bone("leg-right") };
    // Props live on the bones, so the clips carry them. Sizes in the pack's units (before PEEP_SCALE); the
    // arms point sideways at rest (x), so the right hand is at -x along its bone.
    const hand = (o: Object3D, [x, y, z]: number[]) => {
      o.position.set(x, y, z);
      bones.armR.add(o);
      return o;
    };
    const book = openBook();
    bone("torso").add(book);
    const held = {
      book,
      phone: hand(box([0.04, 0.09, 0.02], PAL.screen), [-0.2, 0, 0.06]),
      cup: hand(cup(), [-0.24, 0.07, 0]),
      paper: hand(box([0.17, 0.006, 0.22], "#fbf8f2"), [-0.26, 0.05, 0.03]),
    };
    return { scene, bones, held };
  }, [gltf]);
  const root = useRef<Group>(null);
  const seat = useRef<Group>(null);
  const { actions } = useAnimations(gltf.animations, root);
  const playing = useRef("");

  // After the mixer (useAnimations' own useFrame runs first): pick the clip, then bend bones on top.
  useFrame(({ clock }) => {
    const st = STANCE[activity];
    const clip = motion.current === "pose" ? st.clip : motion.current;
    if (clip !== playing.current) {
      actions[playing.current]?.fadeOut(0.2);
      actions[clip]?.reset().fadeIn(0.2).play();
      playing.current = clip;
    }
    const posing = motion.current === "pose";
    for (const [k, o] of Object.entries(held)) o.visible = posing && st.hold === k;
    // The sit clip lowers the hips to the floor (0.15); a sitting Peep sits up on its chair instead.
    if (seat.current) seat.current.position.y = posing && st.sit ? 0.13 : 0;
    if (!posing) return;
    const t = clock.elapsedTime;
    const w = (speed: number, amount: number, phase = 0) => (reduced ? 0 : Math.sin(t * speed + phase) * amount);
    // Arms rest sideways. Turning one by ±π/2 about y points it forward, then x tips it down (+) or up (-);
    // turning the right one by about -π/2 about z raises it, then x tips it forward.
    const { armL, armR, head, legR } = bones;
    const F = Math.PI / 2;
    if (activity === "typing") {
      armL.rotation.set(0.45 + w(26, 0.12), -F + 0.2, 0);
      armR.rotation.set(0.45 + w(26, 0.12, Math.PI), F - 0.2, 0);
      head.rotation.x = 0.12;
    } else if (activity === "reading") {
      armL.rotation.set(0.55, -F - 0.35, 0);
      armR.rotation.set(0.55, F + 0.35, 0);
      head.rotation.x = 0.18;
    } else if (activity === "researching") {
      armR.rotation.set(0.2, 0, -1.4); // phone at the ear
      head.rotation.z = -0.12;
    } else if (activity === "thinking") {
      armR.rotation.set(-0.75, F + 0.55, 0); // hand on chin
      head.rotation.set(-0.12 + w(1.6, 0.06), 0, 0.08);
    } else if (activity === "stuck") {
      armR.rotation.set(0.25, 0, -1.05 + w(18, 0.2)); // scratching the side of its head
      head.rotation.z = 0.15;
    } else if (activity === "waiting") {
      legR.rotation.x = reduced ? 0 : -Math.max(0, Math.sin(t * 9)) * 0.3; // tapping a foot
    }
  });

  return (
    <group ref={root} scale={PEEP_SCALE}>
      <group ref={seat}>
        <primitive object={scene} />
      </group>
      {STANCE[activity].sit && <Chair />}
    </group>
  );
}

const box = ([x, y, z]: number[], color: string) => new Mesh(new BoxGeometry(x, y, z), toon(color));

function openBook(): Object3D {
  const g = box([0.001, 0.001, 0.001], PAL.cream);
  for (const side of [-1, 1]) {
    const page = box([0.09, 0.12, 0.012], PAL.cream);
    page.position.set(side * 0.042, 0, 0);
    page.rotation.y = side * -0.35;
    const cover = box([0.095, 0.125, 0.006], PAL.terracotta);
    cover.position.set(side * 0.044, 0, -0.01);
    cover.rotation.y = side * -0.35;
    g.add(page, cover);
  }
  g.position.set(0, 0.03, 0.26);
  g.rotation.x = -0.9;
  return g;
}

function cup(): Object3D {
  const c = new Mesh(new CylinderGeometry(0.045, 0.038, 0.09, 10), toon(PAL.cream));
  const coffee = new Mesh(new CylinderGeometry(0.04, 0.04, 0.002, 10), toon(PAL.woodDark));
  coffee.position.y = 0.045;
  c.add(coffee);
  return c;
}

// A Peep brings its own office chair when it sits: the pods have no chairs, so the way to a desk stays clear.
function Chair() {
  return (
    <group position={[0, 0, -0.06]}>
      <mesh position={[0, 0.115, 0]} material={toon(PAL.screen)}>
        <boxGeometry args={[0.3, 0.035, 0.28]} />
      </mesh>
      <mesh position={[0, 0.25, -0.15]} material={toon(PAL.screen)}>
        <boxGeometry args={[0.28, 0.24, 0.035]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} material={toon(PAL.grey)}>
        <cylinderGeometry args={[0.02, 0.02, 0.1, 6]} />
      </mesh>
      <mesh position={[0, 0.006, 0]} material={toon(PAL.grey)}>
        <boxGeometry args={[0.26, 0.012, 0.04]} />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation-y={Math.PI / 2} material={toon(PAL.grey)}>
        <boxGeometry args={[0.26, 0.012, 0.04]} />
      </mesh>
    </group>
  );
}
