// Traffic and pedestrians for Palmera Bay. Traffic cars cruise the road
// grid and turn at intersections; pedestrians stroll the sidewalks and flee
// when a gun goes off or a car comes at them.
import { WORLD, CAR, CAR_COLORS, CAR_MODELS } from './config.js';
import { makeRng, pick, range, clamp } from './random.js';
import { hitsBuilding, nearestRoadPoint, onRoad } from './world.js';

let carId = 0;

export function makeCar(x, y, angle, kind, rng) {
  return {
    id: ++carId,
    x, y, angle,
    speed: 0,
    color: pick(rng, CAR_COLORS),
    model: pick(rng, CAR_MODELS),
    kind, // 'traffic' | 'parked' | 'police' | 'player'
    // Traffic state: which road it follows and which way it drives.
    vertical: rng() < 0.5,
    dir: rng() < 0.5 ? 1 : -1,
    cruise: range(rng, 90, 150),
    turnCooldown: 0,
    stuck: 0,
  };
}

export function spawnTraffic(city, count, seed) {
  const rng = makeRng(seed);
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard++ < 400) {
    const x = range(rng, 100, WORLD.width - 100);
    const y = range(rng, 100, WORLD.beachTop - 100);
    if (!onRoad(x, y)) continue;
    if (hitsBuilding(city, x, y, 30)) continue;
    const p = nearestRoadPoint(x, y);
    const car = makeCar(p.x, p.y, p.vertical ? Math.PI / 2 : 0, 'traffic', rng);
    car.vertical = p.vertical;
    car.dir = rng() < 0.5 ? 1 : -1;
    car.angle = car.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    car.speed = car.cruise;
    cars.push(car);
  }
  // A few parked cars the player can steal, tucked along the avenues.
  for (let i = 0; i < 8; i++) {
    const avenue = WORLD.avenues[i % WORLD.avenues.length];
    const street = WORLD.streets[(i * 2 + 1) % WORLD.streets.length];
    const parked = makeCar(avenue + WORLD.roadWidth / 2 - 14, street + 90 + i * 37, Math.PI / 2, 'parked', rng);
    parked.speed = 0;
    cars.push(parked);
  }
  return cars;
}

export function spawnPedestrians(city, count, seed) {
  const rng = makeRng(seed);
  const peds = [];
  const shirts = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#ecf0f1', '#e67e22'];
  let guard = 0;
  while (peds.length < count && guard++ < 600) {
    const x = range(rng, 80, WORLD.width - 80);
    const y = range(rng, 80, WORLD.beachTop - 80);
    if (onRoad(x, y)) continue;
    if (hitsBuilding(city, x, y, 12)) continue;
    peds.push({
      x, y,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 28, 55),
      shirt: pick(rng, shirts),
      panic: 0,
      wander: range(rng, 1, 4),
    });
  }
  return peds;
}

// Drive one traffic car along the grid. At intersections it sometimes turns.
export function updateTrafficCar(car, dt, rng) {
  car.turnCooldown -= dt;
  const speed = car.cruise;
  const nx = car.x + Math.cos(car.angle) * speed * dt;
  const ny = car.y + Math.sin(car.angle) * speed * dt;
  const nearIntersection = WORLD.avenues.some((ax) => Math.abs(nx - ax) < 26)
    && WORLD.streets.some((sy) => Math.abs(ny - sy) < 26);
  if (nearIntersection && car.turnCooldown <= 0 && rng() < 0.35) {
    // Turn left or right onto the crossing road.
    const turn = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    car.angle += turn;
    car.vertical = Math.abs(Math.sin(car.angle)) > Math.abs(Math.cos(car.angle));
    car.turnCooldown = 2;
  }
  // Stay on the road network: if the next step leaves it, snap back to the
  // nearest road and keep going along it.
  if (!onRoad(nx, ny)) {
    const p = nearestRoadPoint(nx, ny);
    car.x = p.x;
    car.y = p.y;
    car.angle = p.vertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    car.vertical = p.vertical;
    return;
  }
  car.x = clamp(nx, 40, WORLD.width - 40);
  car.y = clamp(ny, 40, WORLD.height - 40);
}

export function updatePedestrian(ped, dt, city, danger) {
  ped.wander -= dt;
  if (ped.panic > 0) {
    ped.panic -= dt;
    // Flee directly away from the danger point.
    const dx = ped.x - danger.x;
    const dy = ped.y - danger.y;
    const d = Math.hypot(dx, dy) || 1;
    ped.angle = Math.atan2(dy / d, dx / d);
    ped.speed = 150;
  } else if (ped.wander <= 0) {
    ped.angle = Math.random() * Math.PI * 2;
    ped.wander = range(Math.random, 2, 5);
    ped.speed = 28 + Math.random() * 27;
  }
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  if (onRoad(nx, ny) && ped.panic <= 0) {
    // Peds prefer the sidewalk: turn back off the road.
    ped.angle += Math.PI / 2;
    return;
  }
  if (!hitsBuilding(city, nx, ny, 10) && nx > 30 && nx < WORLD.width - 30 && ny > 30 && ny < WORLD.beachTop) {
    ped.x = nx;
    ped.y = ny;
  } else {
    ped.angle += Math.PI / 2;
  }
}

// Simple circle-vs-car collision used by the player and the police.
export function carHitsPoint(car, x, y) {
  const dx = x - car.x;
  const dy = y - car.y;
  const ca = Math.cos(-car.angle);
  const sa = Math.sin(-car.angle);
  const lx = dx * ca - dy * sa;
  const ly = dx * sa + dy * ca;
  return Math.abs(lx) < CAR.length / 2 + 6 && Math.abs(ly) < CAR.width / 2 + 6;
}
