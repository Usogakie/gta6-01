// Staged screenshot scenes for Palmera Bay. Each shot composes the real game
// — the same world, traffic, HUD and mission state a player sees — at a
// chosen moment, so the entry's screenshots show the open world at its best.
import { WORLD, MISSIONS } from './config.js';
import { makeRng, pick, range } from './random.js';
import { makeCar } from './traffic.js';
import { addCrime } from './police.js';
import { beginStep } from './missions.js';

function placePlayerCar(game, x, y, angle, color, model) {
  const rng = makeRng(99);
  const car = makeCar(x, y, angle, 'player', rng);
  car.color = color;
  car.model = model;
  car.speed = 240;
  game.player.car = car;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = angle;
  game.cars.push(car);
  return car;
}

function centreCamera(game) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  game.cam.w = vw;
  game.cam.h = vh;
  game.cam.x = Math.max(0, Math.min(WORLD.width - vw, game.player.x - vw / 2));
  game.cam.y = Math.max(0, Math.min(WORLD.height - vh, game.player.y - vh / 2));
}

export function setupShot(game, name, seed) {
  const rng = makeRng(seed + 31);
  game.state = 'playing';
  game.shotMode = true;
  game.missions.index = 0;
  game.missions.stepIndex = 0;

  if (name === 'start') {
    // Title screen over the living Downtown, traffic cruising below.
    game.state = 'title';
    game.player.x = 1000;
    game.player.y = 900;
    centreCamera(game);
    return;
  }

  if (name === 'drive') {
    // Midtown avenue at speed: the player driving, traffic around, HUD live.
    game.missions.index = 0;
    game.missions.stepIndex = 1;
    beginStep(game.missions, rng);
    placePlayerCar(game, 1000, 980, -Math.PI / 2, '#c0392b', 'Comet GT');
    // A little traffic ahead and behind on the same avenue.
    for (let i = 0; i < 4; i++) {
      const c = makeCar(1000 + (i % 2 === 0 ? 26 : -26), 700 + i * 220, -Math.PI / 2, 'traffic', rng);
      c.color = pick(rng, ['#2980b9', '#f1c40f', '#16a085', '#e67e22']);
      c.speed = 130;
      game.cars.push(c);
    }
    game.banner = 'Mission 1 — First Wheels: Drive to the Marina garage';
    game.bannerAt = game.time;
    game.bannerSeconds = 999;
    centreCamera(game);
    return;
  }

  if (name === 'chase') {
    // Golden-hour police chase: 3 stars, cruisers closing in, minimap lit up.
    game.dusk = true;
    game.missions.index = 3;
    game.missions.stepIndex = 0;
    beginStep(game.missions, rng);
    placePlayerCar(game, 1400, 1000, 0, '#c0392b', 'Sunrise Sedan');
    addCrime(game.wanted, 3, game.time);
    for (let i = 0; i < 3; i++) {
      const cop = makeCar(1400 - 350 - i * 110, 1000 + (i - 1) * 46, 0, 'police', rng);
      cop.color = '#1a1a2e';
      cop.model = 'PD Interceptor';
      cop.speed = 300;
      game.police.push(cop);
    }
    game.banner = 'WANTED ★★★ — Lose the police, then reach the safehouse!';
    game.bannerAt = game.time;
    game.bannerSeconds = 999;
    centreCamera(game);
    return;
  }

  if (name === 'mission') {
    // Turf War on foot at Beachfront: the crew, the marker and Rosa's call.
    game.missions.index = 2;
    game.missions.stepIndex = 0;
    beginStep(game.missions, rng);
    game.player.x = 2000;
    game.player.y = 1030;
    game.player.angle = Math.PI / 4;
    game.player.ammo = 24;
    game.banner = 'ROSA: The Coral Kings are on Beachfront. Take them out, Vic.';
    game.bannerAt = game.time;
    game.bannerSeconds = 999;
    centreCamera(game);
    return;
  }

  // Unknown shot name: just play from the start.
  centreCamera(game);
}

export { MISSIONS, range };
