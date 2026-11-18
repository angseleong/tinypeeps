import { DataTexture, type Material, MeshToonMaterial, NearestFilter, RedFormat, type Texture } from "three";

// The office palette (docs/office.md#look): cream, terracotta, sage and warm grey, plus wood and the
// dark of screens and racks. Light and dark mode share the furniture; only floors, walls and the
// background change.
export const PAL = {
  cream: "#f3ead9",
  terracotta: "#c96f4a",
  terracottaSoft: "#e2a283",
  sage: "#8fa98a",
  sageSoft: "#b9cbb1",
  grey: "#b8afa3",
  wood: "#c39a72",
  woodDark: "#8a6649",
  screen: "#33393d",
  skin: "#f2d3b8",
} as const;

// Matte toon: three flat bands of light, no shine. One texture for every material.
const GRADIENT = new DataTexture(new Uint8Array([90, 175, 255]), 3, 1, RedFormat);
GRADIENT.minFilter = NearestFilter;
GRADIENT.magFilter = NearestFilter;
GRADIENT.needsUpdate = true;

// One shared material per colour, so 50 cream boxes cost one material (docs/office.md#performance).
const byColor = new Map<string, MeshToonMaterial>();
export function toon(color: string): MeshToonMaterial {
  let m = byColor.get(color);
  if (!m) {
    m = new MeshToonMaterial({ color, gradientMap: GRADIENT });
    byColor.set(color, m);
  }
  return m;
}

// A pack's material made toon, keeping its texture: KayKit pieces then shade like our own boxes.
const bySource = new Map<string, MeshToonMaterial>();
export function toonOf(src: Material & { map?: Texture | null }): MeshToonMaterial {
  let m = bySource.get(src.uuid);
  if (!m) {
    m = new MeshToonMaterial({ map: src.map ?? null, gradientMap: GRADIENT });
    bySource.set(src.uuid, m);
  }
  return m;
}
