// How a Peep walks from one place to another without going through walls or furniture: a grid of the
// floor, A* over it, then the corners cut wherever the way is clear. Built once from layout.ts, the
// same data the office is drawn from. Peeps don't avoid each other.
import { BLOCKS, type Seg, WALLS } from "./layout";
import { OFFICE_SIZE, type Vec2 } from "./office-data";

const CELL = 0.25;
const [W, H] = [Math.round(OFFICE_SIZE[0] / CELL), Math.round(OFFICE_SIZE[1] / CELL)];
const [X0, Z0] = [-OFFICE_SIZE[0] / 2, -OFFICE_SIZE[1] / 2];
const WALL_GAP = 0.3; // a Peep's half-width, plus the wall's
const BLOCK_GAP = 0.15; // less around furniture, so a Peep can stand right at its desk

function segDist(px: number, pz: number, [x1, z1, x2, z2]: Seg): number {
  const [dx, dz] = [x2 - x1, z2 - z1];
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - x1 - t * dx, pz - z1 - t * dz);
}

let grid: Uint8Array | null = null;
function walls(): Uint8Array {
  if (grid) return grid;
  grid = new Uint8Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const [x, z] = center(i + j * W);
      const hit =
        BLOCKS.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + BLOCK_GAP && Math.abs(z - cz) < d / 2 + BLOCK_GAP) ||
        WALLS.some((s) => segDist(x, z, s) < WALL_GAP);
      grid[i + j * W] = hit ? 1 : 0;
    }
  return grid;
}

const center = (c: number): Vec2 => [X0 + ((c % W) + 0.5) * CELL, Z0 + (Math.floor(c / W) + 0.5) * CELL];
const cellOf = ([x, z]: Vec2): number => {
  const i = Math.min(W - 1, Math.max(0, Math.floor((x - X0) / CELL)));
  const j = Math.min(H - 1, Math.max(0, Math.floor((z - Z0) / CELL)));
  return i + j * W;
};
export const isFree = (p: Vec2): boolean => walls()[cellOf(p)] === 0;

// A seat or a sofa spot sits right against furniture, inside its margin: walk to the nearest free cell.
function nearestFree(c: number): number {
  const g = walls();
  if (!g[c]) return c;
  const [ci, cj] = [c % W, Math.floor(c / W)];
  for (let r = 1; r < 16; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const [i, j] = [ci + di, cj + dj];
        if (i >= 0 && j >= 0 && i < W && j < H && !g[i + j * W]) return i + j * W;
      }
  return c;
}

// Clear way from a to b: every point along it is on a free cell.
function clear(a: Vec2, b: Vec2): boolean {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL / 3));
  for (let k = 1; k < steps; k++) if (!isFree([a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps])) return false;
  return true;
}

// The points to walk through from `from` to `to`, `to` last. Without a way (shouldn't happen), straight there.
export function findPath(from: Vec2, to: Vec2): Vec2[] {
  const g = walls();
  const [start, goal] = [nearestFree(cellOf(from)), nearestFree(cellOf(to))];
  const came = new Int32Array(W * H).fill(-1);
  const cost = new Float64Array(W * H).fill(Infinity);
  const heap = new Heap();
  const [gi, gj] = [goal % W, Math.floor(goal / W)];
  const guess = (c: number) => {
    const [dx, dz] = [Math.abs((c % W) - gi), Math.abs(Math.floor(c / W) - gj)];
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  cost[start] = 0;
  heap.push(start, guess(start));
  while (heap.size) {
    const c = heap.pop();
    if (c === goal) break;
    const [i, j] = [c % W, Math.floor(c / W)];
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const [ni, nj] = [i + di, j + dj];
        if ((!di && !dj) || ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = ni + nj * W;
        // no cutting a corner: a diagonal step needs both sides free
        if (g[n] || (di && dj && (g[i + di + j * W] || g[i + (j + dj) * W]))) continue;
        const k = cost[c] + (di && dj ? Math.SQRT2 : 1);
        if (k < cost[n]) {
          cost[n] = k;
          came[n] = c;
          heap.push(n, k + guess(n));
        }
      }
  }
  if (start !== goal && came[goal] < 0) return [to];
  const cells: Vec2[] = [];
  for (let c = goal; c !== start; c = came[c]) cells.push(center(c));
  cells.push(center(start));
  cells.reverse();
  // cut corners: from each point, go straight to the farthest one in clear sight
  const path: Vec2[] = [];
  for (let k = 0; k < cells.length - 1; ) {
    let far = cells.length - 1;
    while (far > k + 1 && !clear(cells[k], cells[far])) far--;
    path.push(cells[far]);
    k = far;
  }
  if (cells.length === 1) path.push(cells[0]);
  path.push(to);
  return path;
}

// A small binary min-heap of cells by priority.
class Heap {
  private c: number[] = [];
  private p: number[] = [];
  get size() {
    return this.c.length;
  }
  push(cell: number, pri: number) {
    let k = this.c.length;
    this.c.push(cell);
    this.p.push(pri);
    while (k > 0) {
      const up = (k - 1) >> 1;
      if (this.p[up] <= pri) break;
      this.swap(k, up);
      k = up;
    }
  }
  pop(): number {
    const top = this.c[0];
    const lastC = this.c.pop() as number;
    const lastP = this.p.pop() as number;
    if (this.c.length) {
      this.c[0] = lastC;
      this.p[0] = lastP;
      let k = 0;
      for (;;) {
        const [l, r] = [2 * k + 1, 2 * k + 2];
        let m = k;
        if (l < this.c.length && this.p[l] < this.p[m]) m = l;
        if (r < this.c.length && this.p[r] < this.p[m]) m = r;
        if (m === k) break;
        this.swap(k, m);
        k = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.c[a], this.c[b]] = [this.c[b], this.c[a]];
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
  }
}
