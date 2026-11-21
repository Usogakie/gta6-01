// The city of Palmera Bay, built deterministically from a seed.
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ROAD_WIDTH,
  AVENUES,
  STREETS,
  BEACH_Y,
  SEA_Y,
  DISTRICTS,
} from "./config.js";
import { mulberry32, pick, range, intInRange } from "./random.js";

const BUILDING_COLORS = [
  "#d8a7a0",
  "#c9a876",
  "#a8bcc4",
  "#9db89a",
  "#e3d3ae",
  "#b9b3c4",
  "#7d9bb5",
  "#e0987f",
  "#6fae8f",
  "#b5a89a",
];

const ROOF_COLORS = ["#5a5f66", "#6e6a63", "#4d5560", "#7a756c"];

// The park block: second avenue column, third street row.
export const PARK = { x0: 660, y0: 1060, x1: 940, y1: 1340 };
export const PARK_POND = { x: 800, y: 1200, rx: 70, ry: 42 };

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const trees = [];
  const lamps = [];

  for (let col = 0; col < AVENUES.length - 1; col++) {
    for (let row = 0; row < STREETS.length - 1; row++) {
      const inset = 14 + ROAD_WIDTH / 2;
      const bx0 = AVENUES[col] + inset;
      const bx1 = AVENUES[col + 1] - inset;
      const by0 = STREETS[row] + inset;
      const by1 = STREETS[row + 1] - inset;
      if (by0 >= BEACH_Y) continue;
      const blockWidth = bx1 - bx0;
      const blockHeight = by1 - by0;

      if (col === 1 && row === 2) {
        for (let i = 0; i < 26; i++) {
          trees.push({
            x: range(rng, bx0 + 20, bx1 - 20),
            y: range(rng, by0 + 20, by1 - 20),
          });
        }
        continue;
      }

      const inDowntownTop =
        bx0 >= DISTRICTS[1].x0 &&
        bx1 <= DISTRICTS[1].x1 &&
        by0 >= DISTRICTS[1].y0 &&
        row === 0;
      const count = inDowntownTop
        ? intInRange(rng, 2, 3)
        : intInRange(rng, 1, 2);
      const bw = blockWidth / count - 16;
      const bh = blockHeight - 16;
      for (let i = 0; i < count; i++) {
        const x = bx0 + 8 + i * (blockWidth / count);
        const y = by0 + 8;
        const inDowntown =
          x + bw / 2 >= DISTRICTS[1].x0 && x + bw / 2 <= DISTRICTS[1].x1 &&
          y + bh / 2 >= DISTRICTS[1].y0 && y + bh / 2 <= DISTRICTS[1].y1;
        buildings.push({
          x,
          y,
          w: bw,
          h: bh,
          color: pick(rng, BUILDING_COLORS),
          roof: pick(rng, ROOF_COLORS),
          windows: intInRange(rng, 2, 5),
          tall: inDowntown && rng() < 0.6,
        });
      }
    }
  }

  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      lamps.push({ x: ax + ROAD_WIDTH / 2 + 8, y: sy + ROAD_WIDTH / 2 + 8 });
    }
  }

  for (let i = 0; i < 18; i++) {
    trees.push({
      x: range(rng, 40, WORLD_WIDTH - 40),
      y: range(rng, BEACH_Y + 12, SEA_Y - 12),
    });
  }

  return { buildings, trees, lamps, park: PARK, pond: PARK_POND };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return "Palmera Bay";
}

export function isOnRoad(x, y) {
  const half = ROAD_WIDTH / 2;
  for (const ax of AVENUES) {
    if (Math.abs(x - ax) <= half) return true;
  }
  for (const sy of STREETS) {
    if (Math.abs(y - sy) <= half) return true;
  }
  return false;
}

export function nearestRoad(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestDist) {
      bestDist = d;
      best = { x: ax, y, vertical: true };
    }
  }
  for (const sy of STREETS) {
    const d = Math.abs(y - sy);
    if (d < bestDist) {
      bestDist = d;
      best = { x, y: sy, vertical: false };
    }
  }
  return best;
}

export function hitsBuilding(world, x, y, radius) {
  for (const b of world.buildings) {
    if (
      x + radius > b.x &&
      x - radius < b.x + b.w &&
      y + radius > b.y &&
      y - radius < b.y + b.h
    ) {
      return true;
    }
  }
  return false;
}

export function inWorld(x, y, margin) {
  return (
    x >= margin &&
    x <= WORLD_WIDTH - margin &&
    y >= margin &&
    y <= WORLD_HEIGHT - margin
  );
}
