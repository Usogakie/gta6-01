// Wanted stars, heat and the Palmera Bay PD fleet.
import { WANTED, WORLD_WIDTH, WORLD_HEIGHT, POLICE_COLOR, POLICE_MODEL, CAR } from "./config.js";
import { clamp, angleDiff, dist } from "./random.js";
import { createCar } from "./traffic.js";

export function createWanted() {
  return { stars: 0, heat: 0, hiddenTimer: 0, lastCrime: -100 };
}

export function addCrime(wanted, stars, now) {
  wanted.stars = clamp(wanted.stars + stars, 0, 5);
  wanted.heat = clamp(wanted.heat + 34 * stars, 0, 100);
  wanted.lastCrime = now;
  wanted.hiddenTimer = 0;
}

export function syncPolice(police, wanted, player, rng) {
  const want = WANTED[wanted.stars].cars;
  while (police.length < want) {
    const edge = Math.floor(rng() * 4);
    let x;
    let y;
    if (edge === 0) {
      x = clamp(player.x + (rng() * 1400 - 700), 60, WORLD_WIDTH - 60);
      y = 60;
    } else if (edge === 1) {
      x = clamp(player.x + (rng() * 1400 - 700), 60, WORLD_WIDTH - 60);
      y = WORLD_HEIGHT - 60;
    } else if (edge === 2) {
      x = 60;
      y = clamp(player.y + (rng() * 1400 - 700), 60, WORLD_HEIGHT - 60);
    } else {
      x = WORLD_WIDTH - 60;
      y = clamp(player.y + (rng() * 1400 - 700), 60, WORLD_HEIGHT - 60);
    }
    const cruiser = createCar(x, y, 0, POLICE_COLOR, POLICE_MODEL, "police");
    cruiser.speed = 0;
    police.push(cruiser);
  }
  while (police.length > want) {
    police.pop();
  }
}

export function updatePoliceCar(car, player, dt, wanted, onRam) {
  const target = Math.atan2(player.y - car.y, player.x - car.x);
  const diff = angleDiff(car.angle, target);
  const maxTurn = 2.4 * dt;
  car.angle += clamp(diff, -maxTurn, maxTurn);
  const d = dist(car.x, car.y, player.x, player.y);
  const top = WANTED[wanted.stars].speed;
  const want = d > 90 ? top : top * 0.55;
  if (car.speed < want) {
    car.speed = Math.min(want, car.speed + 340 * dt);
  } else {
    car.speed = Math.max(want, car.speed - 340 * dt);
  }
  car.x = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 40, WORLD_WIDTH - 40);
  car.y = clamp(car.y + Math.sin(car.angle) * car.speed * dt, 40, WORLD_HEIGHT - 40);
  if (d <= CAR.length / 2 + 16) {
    onRam(WANTED[wanted.stars].ram);
    car.x -= Math.cos(car.angle) * 40;
    car.y -= Math.sin(car.angle) * 40;
    car.speed *= 0.4;
  }
  return dist(car.x, car.y, player.x, player.y);
}

export function nearestCopDistance(police, player) {
  let best = Infinity;
  for (const car of police) {
    best = Math.min(best, dist(car.x, car.y, player.x, player.y));
  }
  return best;
}

export function updateHeat(wanted, dt, nearestDist, now) {
  const hidden = nearestDist >= 520;
  if (hidden && now - wanted.lastCrime > 4 && wanted.stars > 0) {
    wanted.heat -= 9 * dt;
    if (wanted.heat <= 0) {
      wanted.stars -= 1;
      wanted.heat = wanted.stars > 0 ? 55 : 0;
    }
  }
}
