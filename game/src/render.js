// All drawing: the world, cars, people, HUD, title screen and overlays.
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ROAD_WIDTH,
  AVENUES,
  STREETS,
  BEACH_Y,
  SEA_Y,
  CAR,
  PLAYER,
} from "./config.js";
import { districtAt } from "./world.js";
import { currentMarker, objectiveText, currentMission } from "./missions.js";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  roundRect(ctx, -CAR.length / 2 + 3, -CAR.width / 2 + 3, CAR.length, CAR.width, 7);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 7);
  ctx.fill();
  if (car.kind === "player") {
    ctx.strokeStyle = "#ffd34d";
    ctx.lineWidth = 2;
    roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 7);
    ctx.stroke();
  }
  ctx.fillStyle = "#222a33";
  roundRect(ctx, -8, -CAR.width / 2 + 4, 18, CAR.width - 8, 4);
  ctx.fill();
  ctx.fillStyle = "#cfe8ef";
  ctx.fillRect(CAR.length / 2 - 12, -CAR.width / 2 + 4, 6, CAR.width - 8);
  ctx.fillStyle = "#fff8c9";
  ctx.fillRect(CAR.length / 2 - 2, -CAR.width / 2 + 2, 3, 5);
  ctx.fillRect(CAR.length / 2 - 2, CAR.width / 2 - 7, 3, 5);
  if (car.kind === "police") {
    const red = Math.floor(time / 0.18) % 2 === 0;
    ctx.fillStyle = red ? "#ff2a2a" : "#2a5cff";
    ctx.fillRect(-4, -CAR.width / 2 + 2, 10, 6);
    ctx.fillStyle = red ? "#2a5cff" : "#ff2a2a";
    ctx.fillRect(-4, CAR.width / 2 - 8, 10, 6);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PD", 0, 0);
  }
  ctx.restore();
}

export function drawWorld(ctx, g, camera) {
  const world = g.world;
  const viewX0 = camera.x;
  const viewY0 = camera.y;
  const viewX1 = camera.x + camera.w;
  const viewY1 = camera.y + camera.h;

  ctx.fillStyle = "#6da85c";
  ctx.fillRect(viewX0, viewY0, camera.w, camera.h);

  if (viewY1 > BEACH_Y) {
    ctx.fillStyle = "#e8d29a";
    ctx.fillRect(viewX0, Math.max(viewY0, BEACH_Y), camera.w, viewY1 - Math.max(viewY0, BEACH_Y));
  }
  if (viewY1 > SEA_Y) {
    ctx.fillStyle = "#2f7fc4";
    ctx.fillRect(viewX0, Math.max(viewY0, SEA_Y), camera.w, viewY1 - Math.max(viewY0, SEA_Y));
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let y = SEA_Y + 17; y < viewY1; y += 34) {
      ctx.beginPath();
      ctx.moveTo(viewX0, y);
      ctx.lineTo(viewX1, y);
      ctx.stroke();
    }
  }

  // Roads: asphalt, sidewalks and dashed centre lines.
  for (const ax of AVENUES) {
    ctx.fillStyle = "#3a3f45";
    ctx.fillRect(ax - ROAD_WIDTH / 2, viewY0, ROAD_WIDTH, camera.h);
    ctx.fillStyle = "#9aa0a6";
    ctx.fillRect(ax - ROAD_WIDTH / 2 - 5, viewY0, 5, camera.h);
    ctx.fillRect(ax + ROAD_WIDTH / 2, viewY0, 5, camera.h);
    ctx.strokeStyle = "#e8c832";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(ax, viewY0);
    ctx.lineTo(ax, viewY1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const sy of STREETS) {
    ctx.fillStyle = "#3a3f45";
    ctx.fillRect(viewX0, sy - ROAD_WIDTH / 2, camera.w, ROAD_WIDTH);
    ctx.fillStyle = "#9aa0a6";
    ctx.fillRect(viewX0, sy - ROAD_WIDTH / 2 - 5, camera.w, 5);
    ctx.fillRect(viewX0, sy + ROAD_WIDTH / 2, camera.w, 5);
    ctx.strokeStyle = "#e8c832";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(viewX0, sy);
    ctx.lineTo(viewX1, sy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Park with its pond.
  const park = world.park;
  ctx.fillStyle = "#4f9e4a";
  ctx.fillRect(park.x0, park.y0, park.x1 - park.x0, park.y1 - park.y0);
  ctx.fillStyle = "#4d9ec9";
  ctx.beginPath();
  ctx.ellipse(world.pond.x, world.pond.y, world.pond.rx, world.pond.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Buildings.
  for (const b of world.buildings) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = "#f4eeda";
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 30));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillRect(b.x + 12 + i * 24, b.y + 14 + j * 28, 10, 12);
        }
      }
    }
    if (b.tall) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y - 14);
      ctx.lineTo(b.x + b.w / 2 - 8, b.y - 2);
      ctx.lineTo(b.x + b.w / 2 + 8, b.y - 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Trees.
  for (const tree of world.trees) {
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.arc(tree.x - 5, tree.y - 4, 9, 0, Math.PI * 2);
    ctx.arc(tree.x + 6, tree.y + 3, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#43a047";
    ctx.beginPath();
    ctx.arc(tree.x, tree.y - 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Street lamps.
  ctx.fillStyle = "#33383d";
  for (const lamp of world.lamps) {
    ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
  }

  // Mission marker.
  const marker = currentMarker(g.missions);
  if (marker) {
    const pulse = 1 + 0.15 * Math.sin(g.time * 4);
    ctx.fillStyle = "rgba(66, 135, 245, 0.25)";
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4287f5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(66, 135, 245, 0.15)";
    ctx.fillRect(marker.x - 6, marker.y - 260, 12, 260);
  }

  // Pedestrians.
  for (const ped of g.peds) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y + 8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b98a";
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy gang members with health bars.
  for (const enemy of g.missions.enemies) {
    if (!enemy.alive) continue;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b98a";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.fillRect(enemy.x - 14, enemy.y - 26, 28, 5);
    ctx.fillStyle = "#e53935";
    ctx.fillRect(enemy.x - 14, enemy.y - 26, 28 * Math.max(0, enemy.health / 50), 5);
  }

  // Cars: traffic and parked, then police, then the player's car on top.
  for (const car of g.traffic) {
    if (car.kind === "player") continue;
    drawCar(ctx, car, g.time);
  }
  for (const car of g.parked) {
    drawCar(ctx, car, g.time);
  }
  for (const car of g.police) {
    drawCar(ctx, car, g.time);
  }
  if (g.player.car) drawCar(ctx, g.player.car, g.time);

  // Player on foot.
  if (!g.player.car) {
    const p = g.player;
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = "#ffd34d";
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333333";
    ctx.fillRect(6, -2, 8, 4);
    ctx.restore();
    ctx.fillStyle = "#e8b98a";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    if (g.combat.muzzle > 0) {
      ctx.fillStyle = "#ffe14d";
      ctx.beginPath();
      ctx.arc(
        p.x + Math.cos(p.angle) * 26,
        p.y + Math.sin(p.angle) * 26,
        6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Bullets.
  ctx.fillStyle = "#ffe14d";
  for (const bullet of g.combat.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hurt flash.
  if (g.player.hurtFlash > 0) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
    ctx.fillRect(viewX0, viewY0, camera.w, camera.h);
  }
}

function formatClock(minutes) {
  const total = Math.floor(minutes) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

export function drawHUD(ctx, g, canvasW, canvasH) {
  const p = g.player;
  const district = districtAt(p.x, p.y).toUpperCase();
  const objective = objectiveText(g.missions);
  const shown =
    objective.length > 46 ? objective.slice(0, 46) + "…" : objective;

  // Top-left: district, clock, objective.
  ctx.fillStyle = "rgba(10, 12, 16, 0.72)";
  roundRect(ctx, 12, 12, 340, 84, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(district, 24, 22);
  ctx.fillStyle = "#ffd34d";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(formatClock(g.clockMinutes), 24, 44);
  ctx.fillStyle = "#dfe6ee";
  ctx.font = "13px sans-serif";
  ctx.fillText(shown, 24, 64);

  // Top-right: stars, money, health.
  ctx.fillStyle = "rgba(10, 12, 16, 0.72)";
  roundRect(ctx, canvasW - 232, 12, 220, 84, 8);
  ctx.fill();
  let stars = "";
  for (let i = 0; i < 5; i++) stars += i < g.wanted.stars ? "★" : "☆";
  ctx.fillStyle = "#ffd34d";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(stars, canvasW - 220, 20);
  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("$" + p.money, canvasW - 220, 46);
  ctx.fillStyle = "#222222";
  ctx.fillRect(canvasW - 220, 68, 120, 10);
  ctx.fillStyle = p.health > 30 ? "#4ade80" : "#ef4444";
  ctx.fillRect(canvasW - 220, 68, 120 * Math.max(0, p.health / PLAYER.maxHealth), 10);
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.fillText(String(Math.round(p.health)), canvasW - 92, 66);

  // Bottom-right: car info or on-foot hints.
  ctx.fillStyle = "rgba(10, 12, 16, 0.72)";
  roundRect(ctx, canvasW - 272, canvasH - 64, 260, 52, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "13px sans-serif";
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.24);
    ctx.fillText(p.car.model + " — " + kmh + " km/h", canvasW - 260, canvasH - 52);
    ctx.fillStyle = "#dfe6ee";
    ctx.fillText("W accelerate · S brake · E exit", canvasW - 260, canvasH - 32);
  } else {
    ctx.fillText("Press E near a car to steal it", canvasW - 260, canvasH - 52);
    ctx.fillStyle = "#dfe6ee";
    ctx.fillText(
      "Ammo " + p.ammo + " · Space shoot · F punch",
      canvasW - 260,
      canvasH - 32,
    );
  }

  // Bottom-left: minimap.
  const mapW = 210;
  const mapH = 150;
  const mapX = 12;
  const mapY = canvasH - mapH - 12;
  ctx.fillStyle = "rgba(10, 12, 16, 0.8)";
  ctx.fillRect(mapX - 3, mapY - 3, mapW + 6, mapH + 6);
  ctx.fillStyle = "#6da85c";
  ctx.fillRect(mapX, mapY, mapW, mapH);
  const sx = mapW / WORLD_WIDTH;
  const sy = mapH / WORLD_HEIGHT;
  ctx.fillStyle = "#e8d29a";
  ctx.fillRect(mapX, mapY + BEACH_Y * sy, mapW, mapH - BEACH_Y * sy);
  ctx.fillStyle = "#2f7fc4";
  ctx.fillRect(mapX, mapY + SEA_Y * sy, mapW, mapH - SEA_Y * sy);
  ctx.fillStyle = "#9aa0a6";
  for (const ax of AVENUES) ctx.fillRect(mapX + ax * sx - 1, mapY, 2, mapH);
  for (const syy of STREETS) ctx.fillRect(mapX, mapY + syy * sy, mapW, 2);
  const marker = currentMarker(g.missions);
  if (marker) {
    ctx.fillStyle = "#4287f5";
    ctx.beginPath();
    ctx.arc(mapX + marker.x * sx, mapY + marker.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#2a5cff";
  for (const car of g.police) {
    ctx.beginPath();
    ctx.arc(mapX + car.x * sx, mapY + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e53935";
  for (const enemy of g.missions.enemies) {
    if (!enemy.alive) continue;
    ctx.beginPath();
    ctx.arc(mapX + enemy.x * sx, mapY + enemy.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(mapX + p.x * sx, mapY + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = "#ffd34d";
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Banner above the minimap.
  if (g.banner.text && g.time < g.banner.until) {
    ctx.font = "bold 15px sans-serif";
    const bw = ctx.measureText(g.banner.text).width + 28;
    const bx = Math.max(12, (canvasW - bw) / 2);
    const by = mapY - 44;
    ctx.fillStyle = "rgba(10, 12, 16, 0.78)";
    roundRect(ctx, bx, by, bw, 32, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(g.banner.text, bx + bw / 2, by + 16);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }

  // Controls hint at the very bottom centre.
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "WASD move · E enter car · Space shoot · F punch · Shift run · P pause · M mute",
    canvasW / 2,
    canvasH - 18,
  );
  ctx.textAlign = "left";
}

export function drawTitle(ctx, canvasW, canvasH) {
  ctx.fillStyle = "rgba(8, 10, 18, 0.62)";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd34d";
  ctx.font = "bold 72px sans-serif";
  ctx.fillText("PALMERA BAY", canvasW / 2, canvasH / 2 - 170);
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px sans-serif";
  ctx.fillText(
    "An open-world crime story in the spirit of the great city games",
    canvasW / 2,
    canvasH / 2 - 118,
  );
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#dfe6ee";
  ctx.fillText(
    "Vic is back in Palmera Bay. Broke, no wheels, no crew — back in the city that forgot him.",
    canvasW / 2,
    canvasH / 2 - 70,
  );
  ctx.fillText(
    "Steal cars, outrun the Palmera Bay PD, run missions for Rosa and take the bay.",
    canvasW / 2,
    canvasH / 2 - 44,
  );
  ctx.fillText(
    "Explore on foot and by car, with missions, traffic, pedestrians, wanted stars and combat.",
    canvasW / 2,
    canvasH / 2 - 18,
  );
  ctx.fillStyle = "#ffd34d";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(
    "Press ENTER to start — 5 missions. Your save keeps your progress.",
    canvasW / 2,
    canvasH / 2 + 34,
  );
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px sans-serif";
  ctx.fillText(
    "WASD move · E enter car · Space shoot · F punch · Shift run · P pause · M mute",
    canvasW / 2,
    canvasH / 2 + 70,
  );
  ctx.fillStyle = "#9aa0a6";
  ctx.font = "13px sans-serif";
  ctx.fillText(
    "An original game: no characters, names, art or music from any commercial game.",
    canvasW / 2,
    canvasH / 2 + 104,
  );
  ctx.textAlign = "left";
}

export function drawOverlay(ctx, canvasW, canvasH, title, lines, prompt) {
  ctx.fillStyle = "rgba(8, 10, 18, 0.82)";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd34d";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(title, canvasW / 2, canvasH / 2 - 90);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px sans-serif";
  lines.forEach((line, i) => {
    ctx.fillText(line, canvasW / 2, canvasH / 2 - 30 + i * 30);
  });
  if (prompt) {
    ctx.fillStyle = "#7db8ff";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(prompt, canvasW / 2, canvasH / 2 - 30 + lines.length * 30 + 24);
  }
  ctx.textAlign = "left";
}
