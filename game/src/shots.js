// Staged screenshots: compose one of four scenes for ?shot=<name>&seed=1.
import { WORLD_WIDTH, WORLD_HEIGHT } from "./config.js";
import { createCar } from "./traffic.js";
import { clamp } from "./random.js";
import { addCrime } from "./police.js";
import { startStep, resetMission } from "./missions.js";

export function placePlayerInCar(g, x, y, angle, color, model) {
  const car = createCar(x, y, angle, color, model, "player");
  car.speed = 240;
  g.player.car = car;
  g.player.x = x;
  g.player.y = y;
  g.player.angle = angle;
  g.traffic.push(car);
  return car;
}

export function centreCamera(g) {
  const cam = g.camera;
  cam.x = clamp(
    g.player.x - cam.w / 2,
    0,
    Math.max(0, WORLD_WIDTH - cam.w),
  );
  cam.y = clamp(
    g.player.y - cam.h / 2,
    0,
    Math.max(0, WORLD_HEIGHT - cam.h),
  );
}

export function setupShot(g, name) {
  g.screen = "playing";
  g.shotMode = true;
  g.missions.index = 0;
  g.missions.step = 0;
  resetMission(g.missions, g.seed);

  if (name === "start") {
    g.screen = "title";
    g.player.x = 1000;
    g.player.y = 900;
    g.player.angle = -Math.PI / 2;
    centreCamera(g);
    return;
  }

  if (name === "drive") {
    g.missions.index = 0;
    g.missions.step = 1;
    startStep(g.missions, g.seed);
    placePlayerInCar(g, 1000, 980, -Math.PI / 2, "#d23b2e", "Comet GT");
    const colors = ["#2e6fd2", "#e8c832", "#1f8a6d", "#e8762a"];
    for (let i = 0; i < 4; i++) {
      const x = 1000 + (i % 2 === 0 ? 26 : -26);
      const y = 700 + i * 220;
      const car = createCar(x, y, -Math.PI / 2, colors[i], "Bay Cruiser", "traffic");
      car.speed = 130;
      g.traffic.push(car);
    }
    g.banner.text = "Mission 1 — First Wheels: Drive to the Marina garage";
    g.banner.until = g.time + 999;
    centreCamera(g);
    return;
  }

  if (name === "chase") {
    g.dusk = true;
    g.missions.index = 3;
    g.missions.step = 0;
    startStep(g.missions, g.seed);
    placePlayerInCar(g, 1400, 1000, 0, "#d23b2e", "Sunrise Sedan");
    addCrime(g.wanted, 3, g.time);
    for (let i = 0; i < 3; i++) {
      const x = 1050 - i * 110;
      const y = 1000 + (i % 2 === 0 ? 46 : -46);
      const cruiser = createCar(x, y, 0, "#141c2e", "PD Interceptor", "police");
      cruiser.speed = 300;
      g.police.push(cruiser);
    }
    g.banner.text = "WANTED ★★★ — Lose the police, then reach the safehouse!";
    g.banner.until = g.time + 999;
    centreCamera(g);
    return;
  }

  if (name === "mission") {
    g.missions.index = 2;
    g.missions.step = 0;
    startStep(g.missions, g.seed);
    g.player.car = null;
    g.player.x = 2000;
    g.player.y = 1030;
    g.player.angle = Math.PI / 4;
    g.player.ammo = 24;
    g.banner.text = "ROSA: The Coral Kings are on Beachfront. Take them out, Vic.";
    g.banner.until = g.time + 999;
    centreCamera(g);
    return;
  }

  centreCamera(g);
}
