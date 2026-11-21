// Traffic cars and pedestrians: spawning and movement.
import { AVENUES, STREETS, ROAD_WIDTH, CAR, TRAFFIC_COLORS, CAR_MODELS, PED_SHIRTS, WORLD_WIDTH, WORLD_HEIGHT, BEACH_Y, SEA_Y } from "./config.js";
import { mulberry32, pick, range, intInRange, clamp } from "./random.js";
import { isOnRoad, nearestRoad, hitsBuilding, inWorld } from "./world.js";

let nextCarId = 1;

export function createCar(x, y, angle, color, model, kind) {
  return {
    id: nextCarId++,
    x,
    y,
    angle,
    speed: 0,
    color,
    model,
    kind: kind || "traffic",
    vertical: true,
    direction: 1,
    cruise: 120,
    turnCooldown: 0,
    stuck: 0,
  };
}

export function randomCar(rng, x, y, angle) {
  const car = createCar(
    x,
    y,
    angle,
    pick(rng, TRAFFIC_COLORS),
    pick(rng, CAR_MODELS),
    "traffic",
  );
  car.vertical = rng() < 0.5;
  car.direction = rng() < 0.5 ? 1 : -1;
  car.cruise = range(rng, 90, 150);
  return car;
}

export function spawnTraffic(world, seed) {
  const rng = mulberry32(seed);
  const cars = [];
  let placed = 0;
  let attempts = 0;
  while (placed < 14 && attempts < 400) {
    attempts++;
    const x = range(rng, 60, WORLD_WIDTH - 60);
    const y = range(rng, 60, WORLD_HEIGHT - 60);
    if (!isOnRoad(x, y)) continue;
    if (hitsBuilding(world, x, y, 40)) continue;
    const road = nearestRoad(x, y);
    const car = randomCar(rng, road.x, road.y, 0);
    car.vertical = road.vertical;
    car.angle = road.vertical
      ? (car.direction > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (car.direction > 0 ? 0 : Math.PI);
    car.speed = car.cruise;
    cars.push(car);
    placed++;
  }
  return cars;
}

export function spawnParkedCars(seed) {
  const rng = mulberry32(seed);
  const parked = [];
  for (let i = 0; i < 8; i++) {
    const avenue = AVENUES[i % AVENUES.length];
    const street = STREETS[(2 * i + 1) % STREETS.length];
    const car = randomCar(rng, avenue + ROAD_WIDTH / 2 - 14, street + 90 + 37 * i, Math.PI / 2);
    car.kind = "parked";
    car.speed = 0;
    parked.push(car);
  }
  return parked;
}

export function spawnPedestrians(world, seed) {
  const rng = mulberry32(seed);
  const peds = [];
  let placed = 0;
  let attempts = 0;
  while (placed < 30 && attempts < 600) {
    attempts++;
    const x = range(rng, 60, WORLD_WIDTH - 60);
    const y = range(rng, 60, BEACH_Y - 60);
    if (isOnRoad(x, y)) continue;
    if (hitsBuilding(world, x, y, 20)) continue;
    peds.push({
      x,
      y,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 28, 55),
      shirt: pick(rng, PED_SHIRTS),
      panic: false,
      wander: range(rng, 1, 4),
    });
    placed++;
  }
  return peds;
}

function nearIntersection(car) {
  for (const ax of AVENUES) {
    if (Math.abs(car.x - ax) <= 26) {
      for (const sy of STREETS) {
        if (Math.abs(car.y - sy) <= 26) return true;
      }
    }
  }
  return false;
}

export function updateTrafficCar(car, world, dt, rng) {
  car.turnCooldown = Math.max(0, car.turnCooldown - dt);
  const step = car.speed * dt;
  let nx = car.x + Math.cos(car.angle) * step;
  let ny = car.y + Math.sin(car.angle) * step;

  if (nearIntersection(car) && car.turnCooldown <= 0 && rng() < 0.35) {
    car.angle += rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    car.turnCooldown = 2;
    nx = car.x + Math.cos(car.angle) * step;
    ny = car.y + Math.sin(car.angle) * step;
  }

  if (!isOnRoad(nx, ny)) {
    const road = nearestRoad(nx, ny);
    nx = road.x;
    ny = road.y;
    car.vertical = road.vertical;
    car.angle = road.vertical
      ? (car.direction > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (car.direction > 0 ? 0 : Math.PI);
  }

  car.x = clamp(nx, 30, WORLD_WIDTH - 30);
  car.y = clamp(ny, 30, WORLD_HEIGHT - 30);
}

export function updatePedestrian(ped, world, dt, rng, danger) {
  if (danger && ped.panic) {
    const away = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    ped.angle = away;
    ped.x += Math.cos(away) * 150 * dt;
    ped.y += Math.sin(away) * 150 * dt;
    ped.x = clamp(ped.x, 30, WORLD_WIDTH - 30);
    ped.y = clamp(ped.y, 30, WORLD_HEIGHT - 30);
    return;
  }
  ped.wander -= dt;
  if (ped.wander <= 0) {
    ped.angle = range(rng, 0, Math.PI * 2);
    ped.wander = range(rng, 2, 5);
    ped.speed = range(rng, 28, 55);
  }
  const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
  const calmOnRoad = !ped.panic && isOnRoad(nx, ny);
  const blocked =
    hitsBuilding(world, nx, ny, 12) ||
    !inWorld(nx, ny, 24) ||
    ny >= BEACH_Y;
  if (calmOnRoad || blocked) {
    ped.angle += Math.PI / 2;
    return;
  }
  ped.x = nx;
  ped.y = ny;
}

export function pointInCar(x, y, car) {
  const dx = x - car.x;
  const dy = y - car.y;
  const cos = Math.cos(-car.angle);
  const sin = Math.sin(-car.angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return (
    Math.abs(localX) <= CAR.length / 2 + 6 &&
    Math.abs(localY) <= CAR.width / 2 + 6
  );
}
