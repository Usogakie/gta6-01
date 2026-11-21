// Palmera Bay's city: the road grid, building blocks, park, beach and sea,
// plus the road-graph helpers traffic and police use to drive around it.
import { WORLD, DISTRICTS } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';

const PALETTE = [
  '#e8b4a0', '#d9a066', '#c9d1d9', '#a8c6a0', '#e0cfa8',
  '#b8a9c9', '#9fb8c8', '#d98e7a', '#8fb8a8', '#c8b8a0',
];

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const lamps = [];

  // One building block per cell between the roads. The park block (Marina /
  // Midtown corner) and the beach strip stay open.
  for (let ax = 0; ax < WORLD.avenues.length - 1; ax++) {
    for (let sy = 0; sy < WORLD.streets.length - 1; sy++) {
      const x0 = WORLD.avenues[ax] + WORLD.roadWidth / 2 + 14;
      const x1 = WORLD.avenues[ax + 1] - WORLD.roadWidth / 2 - 14;
      const y0 = WORLD.streets[sy] + WORLD.roadWidth / 2 + 14;
      const y1 = WORLD.streets[sy + 1] - WORLD.roadWidth / 2 - 14;
      if (y1 > WORLD.beachTop) continue;
      // Park block: Midtown's south-west cell becomes green space.
      if (ax === 1 && sy === 2) {
        for (let i = 0; i < 26; i++) {
          trees.push({ x: range(rng, x0 + 20, x1 - 20), y: range(rng, y0 + 20, y1 - 20), r: range(rng, 9, 16) });
        }
        continue;
      }
      const downtown = ax >= 1 && ax <= 3 && sy === 0;
      const count = downtown ? rangeInt(rng, 2, 3) : rangeInt(rng, 1, 2);
      const bw = (x1 - x0) / count;
      for (let i = 0; i < count; i++) {
        const bx = x0 + i * bw + 8;
        const by = y0 + 8;
        const w = bw - 16;
        const h = (y1 - y0) - 16;
        buildings.push({
          x: bx, y: by, w, h,
          color: pick(rng, PALETTE),
          tall: downtown && rng() < 0.6,
          roof: pick(rng, ['#5d6d7e', '#7f8c8d', '#6e7b8b', '#95a5a6']),
          windows: rangeInt(rng, 2, 5),
        });
      }
    }
  }

  // Street lamps along every avenue and street intersection.
  for (const x of WORLD.avenues) {
    for (const y of WORLD.streets) {
      lamps.push({ x: x + WORLD.roadWidth / 2 + 6, y: y - WORLD.roadWidth / 2 - 6 });
    }
  }

  // Scattered palms along the beachfront.
  for (let i = 0; i < 18; i++) {
    trees.push({ x: range(rng, 60, WORLD.width - 60), y: range(rng, WORLD.beachTop + 12, WORLD.seaTop - 14), r: range(rng, 10, 15) });
  }

  return { buildings, trees, lamps, seed };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Palmera Bay';
}

export function onRoad(x, y) {
  for (const ax of WORLD.avenues) {
    if (Math.abs(x - ax) < WORLD.roadWidth / 2) return true;
  }
  for (const sy of WORLD.streets) {
    if (Math.abs(y - sy) < WORLD.roadWidth / 2) return true;
  }
  return false;
}

// Nearest point on the road network, used to snap spawned cars and peds.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const ax of WORLD.avenues) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, y, vertical: true }; }
  }
  for (const sy of WORLD.streets) {
    const d = Math.abs(y - sy);
    if (d < bestD) { bestD = d; best = { x, y: sy, vertical: false }; }
  }
  return best;
}

// Does a circle of radius r at (x, y) overlap any building?
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

export function insideWorld(x, y, margin) {
  return x > margin && x < WORLD.width - margin && y > margin && y < WORLD.height - margin;
}
