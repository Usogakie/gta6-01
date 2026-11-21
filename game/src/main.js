// Palmera Bay: game state, the main loop, driving, stealing and endings.
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CAR,
  PLAYER,
} from "./config.js";
import { mulberry32, clamp, dist } from "./random.js";
import { buildWorld, hitsBuilding, inWorld } from "./world.js";
import { createInput } from "./input.js";
import { createAudio } from "./audio.js";
import {
  createCar,
  spawnTraffic,
  spawnParkedCars,
  spawnPedestrians,
  updateTrafficCar,
  updatePedestrian,
  pointInCar,
} from "./traffic.js";
import {
  createWanted,
  addCrime,
  syncPolice,
  updatePoliceCar,
  nearestCopDistance,
  updateHeat,
} from "./police.js";
import {
  createCombat,
  fireBullet,
  updateCombat,
  hurtPlayer,
  updateEnemies,
  punch,
} from "./combat.js";
import {
  MISSIONS,
  createMissions,
  currentMission,
  currentStep,
  objectiveText,
  updateMissions,
  resetMission,
} from "./missions.js";
import { loadSave, writeSave } from "./save.js";
import { drawWorld, drawHUD, drawTitle, drawOverlay } from "./render.js";
import { setupShot, centreCamera } from "./shots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const params = new URLSearchParams(window.location.search);
const seed = parseInt(params.get("seed") || "20261121", 10) || 20261121;
const shotName = params.get("shot");

function resizeCanvas(g) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  g.camera.w = canvas.width;
  g.camera.h = canvas.height;
}

function buildGame() {
  const world = buildWorld(seed);
  const saved = loadSave();
  const g = {
    seed,
    world,
    rng: mulberry32(seed ^ 0x9e3779b9),
    traffic: spawnTraffic(world, seed + 1),
    parked: spawnParkedCars(seed + 2),
    peds: spawnPedestrians(world, seed + 3),
    police: [],
    wanted: createWanted(),
    missions: createMissions(),
    combat: createCombat(),
    completed: saved ? saved.completed.slice() : [],
    screen: "title",
    ending: null,
    time: 0,
    clockMinutes: 9 * 60,
    banner: { text: "", until: 0 },
    saveTimer: 0,
    dusk: false,
    shotMode: false,
    camera: { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight },
    player: {
      x: 1000,
      y: 620,
      angle: -Math.PI / 2,
      health: PLAYER.maxHealth,
      money: saved ? saved.money : PLAYER.startMoney,
      ammo: PLAYER.startAmmo,
      car: null,
      invuln: 0,
      hurtFlash: 0,
      bustedTimer: 0,
      pedCooldown: 0,
    },
    input: null,
    audio: createAudio(),
    introAt: null,
    introLine2Shown: false,
    welcomeBack: null,
    welcomeShown: false,
  };
  g.input = createInput(canvas);
  if (saved && saved.missionIndex > 0 && saved.missionIndex < MISSIONS.length) {
    g.missions.index = saved.missionIndex;
    g.welcomeBack =
      "Welcome back — " + MISSIONS[saved.missionIndex].title + " awaits";
  }
  return g;
}

const g = buildGame();
resizeCanvas(g);
window.addEventListener("resize", () => resizeCanvas(g));

function say(text, seconds) {
  g.banner.text = text;
  g.banner.until = g.time + (seconds === undefined ? 4 : seconds);
  if (statusEl) statusEl.textContent = text;
}

function onKill() {
  g.missions.killsLeft = Math.max(0, g.missions.killsLeft - 1);
  g.player.money += 40;
}

function endGame(kind) {
  g.ending = kind;
  g.screen = kind;
  g.audio.stopSiren();
  g.audio.stopEngine();
}

function startPlaying() {
  g.audio.ensure();
  g.screen = "playing";
  g.ending = null;
  g.introAt = g.time;
  g.introLine2Shown = false;
  say("ROSA: Vic, you're back in Palmera Bay. Broke, no wheels, no crew.", 5);
}

function restartRun() {
  const p = g.player;
  p.x = 1000;
  p.y = 620;
  p.angle = -Math.PI / 2;
  p.health = PLAYER.maxHealth;
  p.ammo = PLAYER.startAmmo;
  p.car = null;
  p.invuln = 0;
  p.hurtFlash = 0;
  p.bustedTimer = 0;
  p.pedCooldown = 0;
  g.wanted = createWanted();
  g.police = [];
  g.ending = null;
  g.screen = "playing";
  g.combat = createCombat();
  resetMission(g.missions, g.seed);
  say("Back on the streets — Rosa is waiting.", 4);
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  const lists = [g.traffic, g.parked, g.police];
  for (const list of lists) {
    for (const car of list) {
      if (car.kind === "player") continue;
      const d = dist(g.player.x, g.player.y, car.x, car.y);
      if (d < bestD) {
        bestD = d;
        best = { car, list };
      }
    }
  }
  return best;
}

function enterCar(found) {
  const car = found.car;
  const wasPolice = car.kind === "police";
  if (wasPolice) {
    // A stolen PD cruiser leaves the police fleet so it stops chasing.
    const idx = g.police.indexOf(car);
    if (idx >= 0) g.police.splice(idx, 1);
    g.traffic.push(car);
  } else if (found.list === g.parked) {
    const idx = g.parked.indexOf(car);
    if (idx >= 0) g.parked.splice(idx, 1);
    g.traffic.push(car);
  }
  car.kind = "player";
  g.player.car = car;
  g.player.x = car.x;
  g.player.y = car.y;
  g.player.angle = car.angle;
  if (wasPolice) {
    addCrime(g.wanted, 2, g.time);
    say("You stole a PD cruiser! +2 stars", 4);
  } else {
    addCrime(g.wanted, 1, g.time);
    say("Car stolen — the PD has been called! +1 star", 4);
  }
  g.audio.horn();
}

function exitCar() {
  const car = g.player.car;
  car.kind = "parked";
  car.speed = 0;
  const idx = g.traffic.indexOf(car);
  if (idx >= 0) g.traffic.splice(idx, 1);
  g.parked.push(car);
  const side = car.angle + Math.PI / 2;
  g.player.x = car.x + Math.cos(side) * 34;
  g.player.y = car.y + Math.sin(side) * 34;
  g.player.angle = car.angle;
  g.player.car = null;
  g.audio.stopEngine();
}

function updateOnFoot(dt) {
  const p = g.player;
  const input = g.input;
  let dx = 0;
  let dy = 0;
  if (input.anyHeld(["w", "ArrowUp"])) dy -= 1;
  if (input.anyHeld(["s", "ArrowDown"])) dy += 1;
  if (input.anyHeld(["a", "ArrowLeft"])) dx -= 1;
  if (input.anyHeld(["d", "ArrowRight"])) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = input.anyHeld(["Shift"]) ? PLAYER.runSpeed : PLAYER.walkSpeed;
    p.angle = Math.atan2(dy, dx);
    const nx = p.x + dx * speed * dt;
    const ny = p.y + dy * speed * dt;
    if (!hitsBuilding(g.world, nx, p.y, PLAYER.radius) && inWorld(nx, p.y, 24)) {
      p.x = nx;
    }
    if (!hitsBuilding(g.world, p.x, ny, PLAYER.radius) && inWorld(p.x, ny, 24)) {
      p.y = ny;
    }
  }
  // Aim toward the mouse when it is far enough away.
  const mouseWorldX = g.camera.x + input.mouseX;
  const mouseWorldY = g.camera.y + input.mouseY;
  const mouseD = dist(p.x, p.y, mouseWorldX, mouseWorldY);
  if (mouseD > 30) {
    p.angle = Math.atan2(mouseWorldY - p.y, mouseWorldX - p.x);
  }
}

function updateDriving(dt) {
  const p = g.player;
  const car = p.car;
  const input = g.input;
  const speedRatio = clamp(Math.abs(car.speed) / CAR.topSpeed, 0.25, 1);
  const steerDir = car.speed >= 0 ? 1 : -1;
  if (input.anyHeld(["a", "ArrowLeft"])) {
    car.angle -= CAR.turnRate * speedRatio * steerDir * dt;
  }
  if (input.anyHeld(["d", "ArrowRight"])) {
    car.angle += CAR.turnRate * speedRatio * steerDir * dt;
  }
  if (input.anyHeld(["w", "ArrowUp"])) {
    car.speed += CAR.accel * dt;
  } else if (input.anyHeld(["s", "ArrowDown"])) {
    car.speed -= CAR.brake * dt;
  } else if (!g.shotMode) {
    car.speed *= Math.max(0, 1 - 0.4 * dt);
  }
  car.speed = clamp(car.speed, -CAR.reverseSpeed, CAR.topSpeed);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (hitsBuilding(g.world, nx, ny, 20)) {
    if (Math.abs(car.speed) > 200) g.audio.crash();
    car.speed *= -0.25;
  } else {
    car.x = clamp(nx, 40, WORLD_WIDTH - 40);
    car.y = clamp(ny, 40, WORLD_HEIGHT - 40);
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;

  // Running over a pedestrian.
  for (const ped of g.peds) {
    if (pointInCar(ped.x, ped.y, car)) {
      ped.panic = true;
      const away = Math.atan2(ped.y - car.y, ped.x - car.x);
      ped.x += Math.cos(away) * 30;
      ped.y += Math.sin(away) * 30;
      car.speed *= 0.85;
      if (p.pedCooldown <= 0) {
        addCrime(g.wanted, 1, g.time);
        say("You hit a pedestrian! +1 star", 4);
        p.pedCooldown = 5;
      }
    }
  }
  // Bumping another traffic car.
  if (!g.shotMode) {
    for (const other of g.traffic) {
      if (other === car || other.kind === "player") continue;
      if (dist(car.x, car.y, other.x, other.y) < 44) {
        car.speed *= 0.6;
        other.speed = 0;
      }
    }
  }
}

function updatePlaying(dt) {
  const p = g.player;
  const input = g.input;
  g.time += dt;
  g.clockMinutes += dt * 0.5;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  p.pedCooldown = Math.max(0, p.pedCooldown - dt);

  if (input.wasPressed("p") || input.wasPressed("Escape")) {
    g.screen = "paused";
    return;
  }
  if (input.wasPressed("m")) {
    const muted = g.audio.toggleMute();
    say(muted ? "Sound muted" : "Sound on", 2);
  }
  if (input.wasPressed("e")) {
    if (p.car) {
      exitCar();
    } else {
      const found = nearestCar(70);
      if (found) enterCar(found);
      else say("No car close enough — walk up to one and press E", 3);
    }
  }

  if (p.car) updateDriving(dt);
  else updateOnFoot(dt);

  // Shooting on foot.
  if (!p.car && (input.clicked || input.wasPressed(" "))) {
    if (p.ammo > 0 && g.combat.shootCooldown <= 0) {
      fireBullet(g.combat, p.x, p.y, p.angle, undefined, true);
      p.ammo -= 1;
      g.combat.shootCooldown = 0.22;
      g.audio.shoot();
      if (g.wanted.stars < 2) addCrime(g.wanted, 1, g.time);
    } else if (p.ammo <= 0) {
      say("Out of ammo — punch with F or grab ammo at the Marina garage", 3);
    }
  }
  if (!p.car && input.wasPressed("f") && g.combat.punchCooldown <= 0) {
    g.combat.punchCooldown = 0.4;
    g.audio.punch();
    punch(p, g.missions.enemies, onKill);
  }

  for (const car of g.traffic) {
    if (car.kind === "player") continue;
    updateTrafficCar(car, g.world, dt, g.rng);
  }
  for (const ped of g.peds) {
    updatePedestrian(ped, g.world, dt, g.rng, p.car || p);
  }

  syncPolice(g.police, g.wanted, p, g.rng);
  for (const cruiser of g.police) {
    updatePoliceCar(cruiser, p, dt, g.wanted, (damage) => {
      if (p.car) {
        p.car.speed *= 0.7;
        g.audio.crash();
      } else {
        const result = hurtPlayer(p, damage);
        if (result === "wasted") endGame("wasted");
      }
    });
  }
  if (g.screen !== "playing") return;

  // Busted: a cop catches the player on foot.
  if (!p.car && g.police.length > 0) {
    const nearest = nearestCopDistance(g.police, p);
    if (nearest < 34) {
      p.bustedTimer += dt;
      if (p.bustedTimer >= 1.6) {
        g.audio.fail();
        endGame("busted");
        return;
      }
    } else {
      p.bustedTimer = 0;
    }
  } else {
    p.bustedTimer = 0;
  }

  updateHeat(g.wanted, dt, nearestCopDistance(g.police, p), g.time);
  if (g.wanted.stars > 0) g.audio.startSiren();
  else g.audio.stopSiren();
  if (p.car) g.audio.engine(Math.abs(p.car.speed) / CAR.topSpeed);
  else g.audio.stopEngine();

  const events = updateMissions(
    g.missions,
    { player: p, wanted: g.wanted, addCrime, seed: g.seed },
    dt,
    g.time,
  );
  if (events.pickup) {
    say("Package picked up — deliver it to the Downtown tower!", 4);
    g.audio.pickup();
  }
  if (events.completed) {
    const mission = events.completed;
    if (!g.completed.includes(mission.id)) g.completed.push(mission.id);
    say("Mission complete: " + mission.title + " +$" + mission.reward, 5);
    g.audio.sting();
    writeSave(p.money, g.missions.index, g.completed);
    if (events.storyDone) {
      endGame("won");
      return;
    }
  }
  if (events.failed) {
    say(events.failed, 5);
    g.audio.fail();
    resetMission(g.missions, g.seed);
  }

  updateCombat(g.combat, dt, p, g.missions.enemies, onKill);
  updateEnemies(g.missions.enemies, dt, p, g.combat, g.rng);
  if (p.health <= 0) {
    endGame("wasted");
    return;
  }

  // Ammo pickup at the Marina garage.
  if (!p.car && p.ammo < PLAYER.startAmmo) {
    if (dist(p.x, p.y, 600, 1240) <= 46) {
      p.ammo = PLAYER.startAmmo;
      say("Ammo restocked at the Marina garage", 3);
      g.audio.pickup();
    }
  }

  // Opening dialogue, second line.
  if (g.introAt !== null && !g.introLine2Shown && g.time - g.introAt >= 4.5) {
    g.introLine2Shown = true;
    say("ROSA: The bay eats nobodies. So let's make you somebody.", 5);
  }
  if (
    g.welcomeBack &&
    !g.welcomeShown &&
    g.introAt !== null &&
    g.time - g.introAt >= 9.5
  ) {
    g.welcomeShown = true;
    say(g.welcomeBack, 5);
  }

  // Camera follows the player.
  const cam = g.camera;
  cam.x = clamp(p.x - cam.w / 2, 0, Math.max(0, WORLD_WIDTH - cam.w));
  cam.y = clamp(p.y - cam.h / 2, 0, Math.max(0, WORLD_HEIGHT - cam.h));
  if (cam.w >= WORLD_WIDTH) cam.x = (WORLD_WIDTH - cam.w) / 2;
  if (cam.h >= WORLD_HEIGHT) cam.y = (WORLD_HEIGHT - cam.h) / 2;

  g.saveTimer += dt;
  if (g.saveTimer >= 15) {
    g.saveTimer = 0;
    writeSave(p.money, g.missions.index, g.completed);
  }
}

function updateTitle(dt) {
  g.time += dt;
  for (const car of g.traffic) {
    if (car.kind === "player") continue;
    updateTrafficCar(car, g.world, dt, g.rng);
  }
  if (g.input.wasPressed("Enter")) {
    startPlaying();
  }
}

function render() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#11141a";
  ctx.fillRect(0, 0, w, h);
  if (g.screen === "title") {
    const cam = g.camera;
    cam.x = clamp(1000 - cam.w / 2, 0, Math.max(0, WORLD_WIDTH - cam.w));
    cam.y = clamp(900 - cam.h / 2, 0, Math.max(0, WORLD_HEIGHT - cam.h));
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    drawWorld(ctx, g, cam);
    ctx.restore();
    drawTitle(ctx, w, h);
    return;
  }
  ctx.save();
  ctx.translate(-g.camera.x, -g.camera.y);
  drawWorld(ctx, g, g.camera);
  ctx.restore();
  if (g.dusk) {
    ctx.fillStyle = "rgba(255, 120, 30, 0.14)";
    ctx.fillRect(0, 0, w, h);
  }
  if (g.screen === "playing" || g.screen === "paused") {
    drawHUD(ctx, g, w, h);
  }
  if (g.screen === "paused") {
    const mission = currentMission(g.missions);
    drawOverlay(
      ctx,
      w,
      h,
      "PAUSED",
      [
        mission ? "Mission: " + mission.title : "Free roam",
        "Money: $" + g.player.money + "   Health: " + Math.round(g.player.health) +
          "   Wanted: " + g.wanted.stars + " stars",
        "Progress saves automatically.",
      ],
      "Press P to keep playing",
    );
  } else if (g.screen === "wasted") {
    drawOverlay(
      ctx,
      w,
      h,
      "WASTED",
      [
        "You got clipped on the streets of Palmera Bay. Rosa is already planning the comeback.",
        "Money kept: $" + g.player.money,
      ],
      "Press ENTER to try again",
    );
  } else if (g.screen === "busted") {
    drawOverlay(
      ctx,
      w,
      h,
      "BUSTED",
      ["The Palmera Bay PD caught up with you. The bay will have to wait."],
      "Press ENTER to try again",
    );
  } else if (g.screen === "won") {
    drawOverlay(
      ctx,
      w,
      h,
      "BAY KING",
      [
        "The Marina warehouse is yours, the Kings are finished, and Palmera Bay has a new name on every wall: VIC.",
        "Final take: $" + g.player.money + " — free roam continues.",
      ],
      "Press ENTER to keep playing",
    );
  }
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (g.screen === "title") {
    updateTitle(dt);
  } else if (g.screen === "playing") {
    updatePlaying(dt);
  } else if (g.screen === "paused") {
    if (g.input.wasPressed("p") || g.input.wasPressed("Escape")) {
      g.screen = "playing";
    }
  } else if (
    g.screen === "wasted" ||
    g.screen === "busted" ||
    g.screen === "won"
  ) {
    if (g.input.wasPressed("Enter")) {
      restartRun();
    }
  }
  render();
  g.input.endFrame();
  requestAnimationFrame(loop);
}

if (shotName) {
  setupShot(g, shotName);
} else {
  say("Press ENTER to start", 999);
}
requestAnimationFrame(loop);
