// Palmera Bay: the game loop. Owns the player, the camera, driving, crimes,
// the wanted level, mission flow and the screens — title, pause, wasted,
// busted and the Bay King ending.
import { WORLD, PLAYER, CAR, MISSIONS, DIALOGUE } from './config.js';
import { makeRng, clamp, dist } from './random.js';
import { buildCity, hitsBuilding, insideWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { spawnTraffic, spawnPedestrians, updateTrafficCar, updatePedestrian, carHitsPoint } from './traffic.js';
import { createWanted, addCrime, syncPolice, updatePoliceCar, updateWanted, wantedLevel } from './police.js';
import { createMissionState, currentMission, objectiveText, missionMarker, updateMissions, resetMissionStep } from './missions.js';
import { createCombat, fireBullet, updateBullets, updateEnemies, punch, hurtPlayer } from './combat.js';
import { drawWorld, drawHud, drawTitle, drawOverlay } from './render.js';
import { loadSave, writeSave } from './save.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 20261121);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const audio = createAudio();
const rng = makeRng(SEED);

const saved = loadSave();

const game = {
  city: buildCity(SEED),
  cars: [],
  peds: [],
  police: [],
  wanted: createWanted(),
  missions: createMissionState(),
  combat: createCombat(),
  completedMissions: saved ? saved.completedMissions : [],
  state: 'title', // title | playing | paused | over
  over: null, // wasted | busted | win
  time: 0,
  clockMinutes: 9 * 60,
  banner: '',
  bannerAt: 0,
  saveTimer: 0,
  dusk: false,
  player: {
    x: 1000, y: 620, angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    money: saved ? saved.money : PLAYER.startMoney,
    ammo: PLAYER.pistolAmmoStart,
    car: null,
    invuln: 0,
    hurtFlash: 0,
    bustedTimer: 0,
    pedHitCooldown: 0,
  },
  cam: { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight },
  marker: null,
  objective: 'Press ENTER to start',
  clock: '09:00',
};

if (saved && saved.missionIndex > 0 && saved.missionIndex < MISSIONS.length) {
  game.missions.index = saved.missionIndex;
}

game.cars = spawnTraffic(game.city, 14, SEED + 7);
game.peds = spawnPedestrians(game.city, 30, SEED + 13);

function say(text, seconds) {
  game.banner = text;
  game.bannerAt = game.time;
  game.bannerSeconds = seconds || 4;
  if (statusEl) statusEl.textContent = text;
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of game.cars) {
    const d = dist(game.player.x, game.player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  for (const cop of game.police) {
    const d = dist(game.player.x, game.player.y, cop.x, cop.y);
    if (d < bestD) { bestD = d; best = cop; }
  }
  return best;
}

function enterCar(car) {
  const p = game.player;
  const stolen = car.kind === 'traffic' || car.kind === 'parked';
  const copCar = car.kind === 'police';
  p.car = car;
  car.kind = 'player';
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  if (copCar) {
    // A stolen cruiser leaves the police fleet: it is the player's car now,
    // not a pursuer still chasing itself (it would ram the player forever).
    const i = game.police.indexOf(car);
    if (i !== -1) game.police.splice(i, 1);
    game.cars.push(car);
    // Stealing a cruiser is the loudest crime there is.
    addCrime(game.wanted, 2, game.time);
    say('You stole a PD cruiser! (+2 ★)');
    audio.horn();
  } else if (stolen) {
    // Stealing a car in the street is a crime the PD notices.
    addCrime(game.wanted, 1, game.time);
    say('You stole a car — the PD has been called! (+1 ★)');
    audio.horn();
  }
}

function exitCar() {
  const p = game.player;
  const car = p.car;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  const side = { x: car.x + Math.cos(car.angle + Math.PI / 2) * 34, y: car.y + Math.sin(car.angle + Math.PI / 2) * 34 };
  p.x = side.x;
  p.y = side.y;
  p.angle = car.angle;
  p.car = null;
}

function moveOnFoot(dt) {
  const p = game.player;
  let dx = 0;
  let dy = 0;
  if (input.held('w', 'arrowup')) dy -= 1;
  if (input.held('s', 'arrowdown')) dy += 1;
  if (input.held('a', 'arrowleft')) dx -= 1;
  if (input.held('d', 'arrowright')) dx += 1;
  if (dx === 0 && dy === 0) return;
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  const speed = input.held('shift') ? PLAYER.runSpeed : PLAYER.walkSpeed;
  p.angle = Math.atan2(dy, dx);
  const nx = p.x + dx * speed * dt;
  const ny = p.y + dy * speed * dt;
  // Slide along buildings: try each axis on its own.
  if (!hitsBuilding(game.city, nx, p.y, PLAYER.radius) && insideWorld(nx, p.y, 24)) p.x = nx;
  if (!hitsBuilding(game.city, p.x, ny, PLAYER.radius) && insideWorld(p.x, ny, 24)) p.y = ny;
}

function driveCar(dt) {
  const p = game.player;
  const car = p.car;
  const forward = input.held('w', 'arrowup') ? 1 : 0;
  const reverse = input.held('s', 'arrowdown') ? 1 : 0;
  const steer = (input.held('a', 'arrowleft') ? -1 : 0) + (input.held('d', 'arrowright') ? 1 : 0);
  if (forward) car.speed += CAR.accel * dt;
  if (reverse) car.speed -= (car.speed > 0 ? CAR.brake : CAR.accel * 0.6) * dt;
  // In a staged screenshot the car keeps its speed so the shot reads as motion.
  if (!forward && !reverse && !game.shotMode) car.speed *= Math.pow(0.4, dt);
  car.speed = clamp(car.speed, -CAR.reverseSpeed, CAR.maxSpeed);
  if (Math.abs(car.speed) > 8) {
    car.angle += steer * CAR.turnRate * dt * clamp(Math.abs(car.speed) / 120, 0.25, 1) * (car.speed >= 0 ? 1 : -1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (hitsBuilding(game.city, nx, ny, 20)) {
    if (Math.abs(car.speed) > 200) audio.crash();
    car.speed *= -0.25;
  } else {
    car.x = clamp(nx, 40, WORLD.width - 40);
    car.y = clamp(ny, 40, WORLD.height - 40);
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  // Running over a pedestrian is a crime.
  p.pedHitCooldown = Math.max(0, p.pedHitCooldown - dt);
  for (const ped of game.peds) {
    if (carHitsPoint(car, ped.x, ped.y)) {
      ped.panic = 3;
      ped.x += (ped.x - car.x) * 0.2;
      ped.y += (ped.y - car.y) * 0.2;
      if (p.pedHitCooldown <= 0) {
        addCrime(game.wanted, 1, game.time);
        say('You hit a pedestrian! The PD is on its way. (+1 ★)');
        p.pedHitCooldown = 5;
      }
      car.speed *= 0.85;
    }
  }
  // Bumping traffic slows both cars down (not in a staged screenshot, where
  // the shot is composed and the cars are meant to keep moving).
  if (!game.shotMode) {
    for (const other of game.cars) {
      if (other === car || other.kind === 'player') continue;
      if (dist(car.x, car.y, other.x, other.y) < 52) {
        car.speed *= 0.6;
        other.speed = 0;
      }
    }
  }
}

function aimAngle() {
  const p = game.player;
  const wx = game.cam.x + input.mouseX;
  const wy = game.cam.y + input.mouseY;
  if (dist(wx, wy, p.x, p.y) > 30) return Math.atan2(wy - p.y, wx - p.x);
  return p.angle;
}

function updatePlaying(dt) {
  const p = game.player;
  game.time += dt;
  game.clockMinutes += dt * 0.5; // one game hour every two real minutes
  const hh = Math.floor(game.clockMinutes / 60) % 24;
  const mm = Math.floor(game.clockMinutes % 60);
  game.clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);

  if (input.wasPressed('p') || input.wasPressed('escape')) {
    game.state = 'paused';
    return;
  }
  if (input.wasPressed('m')) {
    audio.ensure();
    say(audio.toggleMute() ? 'Sound muted' : 'Sound on');
  }

  // Enter / exit a car.
  if (input.wasPressed('e')) {
    audio.ensure();
    if (p.car) {
      exitCar();
    } else {
      const car = nearestCar(70);
      if (car) enterCar(car);
      else say('No car close enough — walk up to one and press E.');
    }
  }

  if (p.car) driveCar(dt);
  else moveOnFoot(dt);

  // Shooting: mouse click or Space, toward the mouse.
  if (!p.car && (input.mouseClicked || (input.wasPressed(' ') && game.combat.shootCooldown <= 0))) {
    audio.ensure();
    if (p.ammo > 0 && game.combat.shootCooldown <= 0) {
      fireBullet(game.combat, p.x, p.y, aimAngle(), 'player', PLAYER.pistolDamage);
      p.ammo--;
      game.combat.shootCooldown = 0.22;
      audio.shot();
      if (game.wanted.stars < 2) addCrime(game.wanted, 1, game.time);
    } else if (p.ammo <= 0) {
      say('Out of ammo — punch with F, or find the ammo pickup at the Marina garage.');
    }
  }
  if (!p.car && input.wasPressed('f') && game.combat.punchCooldown <= 0) {
    audio.ensure();
    game.combat.punchCooldown = 0.4;
    audio.punch();
    punch(game);
  }

  // Traffic and pedestrians keep living their lives.
  for (const car of game.cars) {
    if (car.kind === 'traffic') updateTrafficCar(car, dt, rng);
  }
  const danger = { x: p.x, y: p.y };
  for (const ped of game.peds) updatePedestrian(ped, dt, game.city, danger);

  // The police: spawn to the wanted level, chase, and drain heat when hidden.
  syncPolice(game.police, game.wanted, p, rng, game.time);
  let nearestCop = Infinity;
  for (const cop of game.police) {
    const d = updatePoliceCar(cop, dt, p, wantedLevel(game.wanted), (damage) => {
      if (p.car) {
        p.car.speed *= 0.7;
        audio.crash();
      } else {
        hurtPlayer(game, damage);
      }
    });
    nearestCop = Math.min(nearestCop, d);
    // Busted: on foot, a cop standing on you for a moment ends the run.
    if (!p.car && d < 34) {
      p.bustedTimer += dt;
      if (p.bustedTimer > 1.6) {
        game.over = 'busted';
        game.state = 'over';
        audio.fail();
      }
    } else {
      p.bustedTimer = 0;
    }
  }
  updateWanted(game.wanted, dt, nearestCop, game.time);
  audio.setSiren(game.wanted.stars > 0);
  audio.setEngine(p.car ? Math.abs(p.car.speed) / CAR.maxSpeed : 0);

  // Missions.
  const events = updateMissions(game.missions, game, dt, rng);
  if (events.pickedUp) {
    say('Package picked up — deliver it fast!');
    audio.pickup();
  }
  if (events.completedMission) {
    const m = events.completedMission;
    game.completedMissions.push(m.id);
    say(`${m.title} complete! +$${m.reward}`);
    audio.sting();
    writeSave(game);
    if (events.storyDone) {
      game.over = 'win';
      game.state = 'over';
    }
  }
  if (events.failed) {
    say(events.failed);
    audio.fail();
    resetMissionStep(game.missions, rng);
  }

  updateBullets(game.combat, dt, game);
  updateEnemies(game, dt, rng);

  // Ammo pickup at the Marina garage refills the pistol.
  if (!p.car && dist(p.x, p.y, 600, 1240) < 46 && p.ammo < PLAYER.pistolAmmoStart) {
    p.ammo = PLAYER.pistolAmmoStart;
    say('Ammo restocked at the Marina garage.');
    audio.pickup();
  }

  game.marker = missionMarker(game.missions);
  game.objective = objectiveText(game.missions);

  // Camera follows the player, clamped to the world.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  game.cam.w = vw;
  game.cam.h = vh;
  game.cam.x = clamp(p.x - vw / 2, 0, WORLD.width - vw);
  game.cam.y = clamp(p.y - vh / 2, 0, WORLD.height - vh);
  if (WORLD.width < vw) game.cam.x = (WORLD.width - vw) / 2;
  if (WORLD.height < vh) game.cam.y = (WORLD.height - vh) / 2;

  // Autosave every 15 seconds of play.
  game.saveTimer += dt;
  if (game.saveTimer > 15) {
    game.saveTimer = 0;
    writeSave(game);
  }
  if (game.banner && game.time - game.bannerAt > (game.bannerSeconds || 4)) game.banner = '';
}

function render() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(0, 0, vw, vh);
  if (game.state === 'title') {
    // The title screen shows the living city behind it.
    game.cam.x = clamp(1000 - vw / 2, 0, WORLD.width - vw);
    game.cam.y = clamp(900 - vh / 2, 0, WORLD.height - vh);
    ctx.save();
    ctx.translate(-game.cam.x, -game.cam.y);
    drawWorld(ctx, game, game.cam);
    ctx.restore();
    drawTitle(ctx, game, { w: vw, h: vh });
    return;
  }
  ctx.save();
  ctx.translate(-game.cam.x, -game.cam.y);
  drawWorld(ctx, game, game.cam);
  ctx.restore();
  drawHud(ctx, game, { w: vw, h: vh });
  if (game.dusk) {
    ctx.fillStyle = 'rgba(255,110,40,0.07)';
    ctx.fillRect(0, 0, vw, vh);
  }
  if (game.state === 'paused') {
    drawOverlay(ctx, { w: vw, h: vh }, 'PAUSED', [
      `${currentMission(game.missions) ? currentMission(game.missions).title : 'Free roam'}`,
      `Money $${game.player.money.toLocaleString()}  •  Health ${Math.ceil(game.player.health)}  •  Wanted ${'★'.repeat(game.wanted.stars) || '—'}`,
      'Your progress is saved automatically.',
    ], 'Press P to keep playing');
  }
  if (game.state === 'over') {
    if (game.over === 'wasted') {
      drawOverlay(ctx, { w: vw, h: vh }, 'WASTED', [DIALOGUE.wasted, `Money kept: $${game.player.money.toLocaleString()}`], 'Press ENTER to try again');
    } else if (game.over === 'busted') {
      drawOverlay(ctx, { w: vw, h: vh }, 'BUSTED', [DIALOGUE.busted], 'Press ENTER to try again');
    } else if (game.over === 'win') {
      drawOverlay(ctx, { w: vw, h: vh }, 'BAY KING', [DIALOGUE.win, `Final take: $${game.player.money.toLocaleString()} — free roam continues.`], 'Press ENTER to keep playing the bay');
    }
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'title') {
    // The city idles behind the title screen.
    game.time += dt;
    for (const car of game.cars) if (car.kind === 'traffic') updateTrafficCar(car, dt, rng);
    if (input.wasPressed('enter')) {
      audio.ensure();
      game.state = 'playing';
      say(DIALOGUE.intro[0], 5);
      setTimeout(() => { if (game.state === 'playing') say(DIALOGUE.intro[1], 5); }, 4500);
    }
  } else if (game.state === 'playing') {
    updatePlaying(dt);
  } else if (game.state === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('escape') || input.wasPressed('enter')) game.state = 'playing';
  } else if (game.state === 'over') {
    if (input.wasPressed('enter')) {
      // Restart the run from the current mission, keeping the money.
      game.player.health = PLAYER.maxHealth;
      game.player.ammo = PLAYER.pistolAmmoStart;
      game.player.x = 1000;
      game.player.y = 620;
      game.player.car = null;
      game.wanted = createWanted();
      game.police = [];
      game.over = null;
      resetMissionStep(game.missions, rng);
      game.state = 'playing';
      say('Back on the streets. Rosa is waiting.');
    }
  }
  render();
  input.endFrame();
  requestAnimationFrame(loop);
}

// Staged screenshots: ?shot=start|drive|chase|mission&seed=N renders a
// composed scene of the real game for the entry's screenshots.
if (SHOT) {
  setupShot(game, SHOT, SEED);
} else if (saved && saved.missionIndex > 0) {
  say(`Welcome back, Vic — ${MISSIONS[saved.missionIndex].title} awaits.`, 5);
}

requestAnimationFrame(loop);
