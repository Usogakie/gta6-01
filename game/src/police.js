// The Palmera Bay PD: the wanted system and the police cars that answer it.
// Crimes raise heat; hiding out of every cop's sight drains it again.
import { WANTED, CAR, WORLD } from './config.js';
import { clamp, dist, angleLerp } from './random.js';
import { makeCar } from './traffic.js';

export function createWanted() {
  return {
    stars: 0,
    heat: 0, // 0..100, fills with crimes, drains while hidden
    hiddenTime: 0,
    lastCrimeAt: 0,
  };
}

export function addCrime(wanted, stars, now) {
  wanted.stars = clamp(wanted.stars + stars, 0, 5);
  wanted.heat = clamp(wanted.heat + stars * 34, 0, 100);
  wanted.lastCrimeAt = now;
  wanted.hiddenTime = 0;
}

export function wantedLevel(wanted) {
  return WANTED[wanted.stars];
}

// Keep the police fleet at the size the wanted level asks for, spawning new
// cruisers at the map edges near the player.
export function syncPolice(police, wanted, player, rng, now) {
  const level = wantedLevel(wanted);
  while (police.length < level.cops) {
    const edge = Math.floor(rng() * 4);
    let x = player.x;
    let y = player.y;
    if (edge === 0) { x = clamp(player.x + (rng() < 0.5 ? -1 : 1) * 700, 80, WORLD.width - 80); y = 100; }
    if (edge === 1) { x = clamp(player.x + (rng() < 0.5 ? -1 : 1) * 700, 80, WORLD.width - 80); y = WORLD.beachTop - 100; }
    if (edge === 2) { x = 100; y = clamp(player.y + (rng() < 0.5 ? -1 : 1) * 700, 80, WORLD.beachTop - 80); }
    if (edge === 3) { x = WORLD.width - 100; y = clamp(player.y + (rng() < 0.5 ? -1 : 1) * 700, 80, WORLD.beachTop - 80); }
    const cop = makeCar(x, y, 0, 'police', rng);
    cop.color = '#1a1a2e';
    cop.model = 'PD Interceptor';
    cop.speed = 0;
    cop.spawnedAt = now;
    police.push(cop);
  }
  while (police.length > level.cops) police.pop();
}

// One police car: steer toward the player, ram on contact, and back off a
// little after a hit so it reads as a chase, not a magnet.
export function updatePoliceCar(cop, dt, player, level, onRam) {
  const targetAngle = Math.atan2(player.y - cop.y, player.x - cop.x);
  cop.angle = angleLerp(cop.angle, targetAngle, clamp(2.4 * dt, 0, 1));
  const d = dist(cop.x, cop.y, player.x, player.y);
  const wantSpeed = d > 90 ? level.copSpeed : level.copSpeed * 0.55;
  cop.speed = Math.min(wantSpeed, cop.speed + 420 * dt);
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;
  cop.x = clamp(cop.x, 30, WORLD.width - 30);
  cop.y = clamp(cop.y, 30, WORLD.height - 30);
  if (d < CAR.length / 2 + 16) {
    onRam(level.ramDamage);
    // Shove the cop back so it has to chase again.
    cop.x -= Math.cos(cop.angle) * 40;
    cop.y -= Math.sin(cop.angle) * 40;
    cop.speed *= 0.4;
  }
  return d;
}

// Drain heat while no cop can see the player; drop a star when heat empties.
export function updateWanted(wanted, dt, nearestCopDist, now) {
  if (wanted.stars === 0) return;
  const seen = nearestCopDist < 520;
  if (!seen && now - wanted.lastCrimeAt > 4) {
    wanted.hiddenTime += dt;
    wanted.heat -= dt * 9;
  } else {
    wanted.hiddenTime = 0;
  }
  if (wanted.heat <= 0) {
    wanted.stars = Math.max(0, wanted.stars - 1);
    wanted.heat = wanted.stars > 0 ? 55 : 0;
    wanted.hiddenTime = 0;
  }
}
