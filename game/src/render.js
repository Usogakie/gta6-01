// Rendering for Palmera Bay: the top-down city, its cars and people, and the
// whole HUD — wanted stars, money, health, minimap, objective and menus.
// Everything is drawn on one canvas, no images, no network.
import { WORLD, CAR } from './config.js';
import { clamp } from './random.js';
import { districtAt } from './world.js';

function drawCar(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 7);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  roundRect(ctx, -8, -CAR.width / 2 + 4, 18, CAR.width - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.fillRect(CAR.length / 2 - 12, -CAR.width / 2 + 5, 5, CAR.width - 10);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(CAR.length / 2 - 2, -CAR.width / 2 + 2, 3, 5);
  ctx.fillRect(CAR.length / 2 - 2, CAR.width / 2 - 7, 3, 5);
  if (car.kind === 'police') {
    // Light bar, flashing red/blue.
    const phase = Math.floor(performance.now() / 180) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e7dff';
    ctx.fillRect(-4, -CAR.width / 2 + 2, 8, CAR.width / 2 - 2);
    ctx.fillStyle = phase ? '#2e7dff' : '#ff2e2e';
    ctx.fillRect(-4, 0, 8, CAR.width / 2 - 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = 2;
    roundRect(ctx, -CAR.length / 2 - 3, -CAR.width / 2 - 3, CAR.length + 6, CAR.width + 6, 9);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, game, cam) {
  const { city } = game;
  // Ground: grass, then the beach and the sea at the south edge.
  ctx.fillStyle = '#3f7a44';
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(cam.x, Math.max(cam.y, WORLD.beachTop), cam.w, Math.max(0, cam.h - (WORLD.beachTop - cam.y)));
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(cam.x, Math.max(cam.y, WORLD.seaTop), cam.w, Math.max(0, cam.h - (WORLD.seaTop - cam.y)));
  // Sea shimmer lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let y = WORLD.seaTop + 18; y < WORLD.height; y += 34) {
    if (y < cam.y || y > cam.y + cam.h) continue;
    ctx.beginPath();
    ctx.moveTo(cam.x, y);
    ctx.lineTo(cam.x + cam.w, y);
    ctx.stroke();
  }

  // Roads: asphalt with a centre line and sidewalks.
  ctx.fillStyle = '#3a3f4a';
  for (const ax of WORLD.avenues) {
    ctx.fillRect(ax - WORLD.roadWidth / 2, cam.y, WORLD.roadWidth, cam.h);
  }
  for (const sy of WORLD.streets) {
    ctx.fillRect(cam.x, sy - WORLD.roadWidth / 2, cam.w, WORLD.roadWidth);
  }
  ctx.fillStyle = '#9aa0ab';
  for (const ax of WORLD.avenues) {
    ctx.fillRect(ax - WORLD.roadWidth / 2 - 8, cam.y, 8, cam.h);
    ctx.fillRect(ax + WORLD.roadWidth / 2, cam.y, 8, cam.h);
  }
  for (const sy of WORLD.streets) {
    ctx.fillRect(cam.x, sy - WORLD.roadWidth / 2 - 8, cam.w, 8);
    ctx.fillRect(cam.x, sy + WORLD.roadWidth / 2, cam.w, 8);
  }
  ctx.strokeStyle = '#e8c33c';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 16]);
  for (const ax of WORLD.avenues) {
    ctx.beginPath();
    ctx.moveTo(ax, cam.y);
    ctx.lineTo(ax, cam.y + cam.h);
    ctx.stroke();
  }
  for (const sy of WORLD.streets) {
    ctx.beginPath();
    ctx.moveTo(cam.x, sy);
    ctx.lineTo(cam.x + cam.w, sy);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Park: lawn, pond and trees.
  ctx.fillStyle = '#57a05a';
  ctx.fillRect(660, 1060, 280, 280);
  ctx.fillStyle = '#4a90c2';
  ctx.beginPath();
  ctx.ellipse(800, 1200, 70, 42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Buildings, with a shaded side so the city reads top-down.
  for (const b of city.buildings) {
    if (b.x > cam.x + cam.w || b.x + b.w < cam.x || b.y > cam.y + cam.h || b.y + b.h < cam.y) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i + j) % 2 === 0) ctx.fillRect(b.x + 9 + i * 26, b.y + 9 + j * 26, 9, 9);
      }
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲', b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
  }

  // Trees.
  for (const t of city.trees) {
    if (t.x < cam.x - 20 || t.x > cam.x + cam.w + 20 || t.y < cam.y - 20 || t.y > cam.y + cam.h + 20) continue;
    ctx.fillStyle = '#2e6b34';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mission marker: a pulsing beacon on the ground.
  const marker = game.marker;
  if (marker) {
    const pulse = 1 + Math.sin(performance.now() / 280) * 0.12;
    ctx.strokeStyle = '#38c6ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius * 0.45 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(56,198,255,0.25)';
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius * 0.45 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // A beam of light so the marker is visible from far away.
    const grad = ctx.createLinearGradient(marker.x, marker.y - 260, marker.x, marker.y);
    grad.addColorStop(0, 'rgba(56,198,255,0)');
    grad.addColorStop(1, 'rgba(56,198,255,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(marker.x - 8, marker.y - 260, 16, 260);
  }

  // Pedestrians.
  for (const p of game.peds) {
    if (p.x < cam.x - 20 || p.x > cam.x + cam.w + 20 || p.y < cam.y - 20 || p.y > cam.y + cam.h + 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 3, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy gang members: red jackets, visible at a glance.
  for (const e of game.missions.enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x + 2, e.y + 3, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(e.x, e.y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    // Health bar.
    ctx.fillStyle = '#111';
    ctx.fillRect(e.x - 14, e.y - 22, 28, 5);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(e.x - 13, e.y - 21, 26 * clamp(e.health / 50, 0, 1), 3);
  }

  // Cars: traffic, parked, police, then the player's car on top.
  for (const car of game.cars) {
    if (car !== game.player.car) drawCar(ctx, car, false);
  }
  for (const cop of game.police) drawCar(ctx, cop, false);
  if (game.player.car) drawCar(ctx, game.player.car, true);

  // The player on foot.
  if (!game.player.car) {
    const p = game.player;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 4, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(6, -4, 12, 8); // the direction the player faces
    ctx.restore();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    if (game.combat.muzzle > 0) {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bullets.
  ctx.fillStyle = '#ffe066';
  for (const b of game.combat.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hurt flash.
  if (game.player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${clamp(game.player.hurtFlash, 0, 0.35)})`;
    ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  }
}

export function drawHud(ctx, game, view) {
  const p = game.player;
  const W = view.w;
  const H = view.h;

  // Top-left: district, clock and mission objective.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 12, 12, 360, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(districtAt(p.x, p.y).toUpperCase(), 24, 34);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#ffd54a';
  ctx.fillText(game.clock, 24, 54);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  const obj = game.objective;
  ctx.fillText(obj.length > 46 ? obj.slice(0, 46) + '…' : obj, 24, 70);

  // Top-right: wanted stars, money, health.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, W - 232, 12, 220, 86, 8);
  ctx.fill();
  ctx.font = '22px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < game.wanted.stars ? '★' : '☆';
  ctx.fillStyle = game.wanted.stars > 0 ? '#ffd54a' : '#888';
  ctx.fillText(stars, W - 24, 40);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`$${p.money.toLocaleString()}`, W - 24, 64);
  ctx.fillStyle = '#111';
  ctx.fillRect(W - 184, 74, 160, 12);
  ctx.fillStyle = p.health > 30 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(W - 183, 75, 158 * clamp(p.health / 100, 0, 1), 10);
  ctx.fillStyle = '#fff';
  ctx.font = '11px sans-serif';
  ctx.fillText(`${Math.ceil(p.health)} HP`, W - 24, 84 - 12 + 22);

  // Ammo and car speed, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, W - 212, H - 64, 200, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '15px sans-serif';
  if (p.car) {
    ctx.fillText(`${p.car.model}`, W - 24, H - 42);
    ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.24)} km/h`, W - 24, H - 22);
  } else {
    ctx.fillText('On foot — press E near a car', W - 24, H - 42);
    ctx.fillStyle = '#9fd8ff';
    ctx.fillText(`Pistol ${p.ammo} • F punch • Click shoot`, W - 24, H - 22);
  }

  // Bottom-left: minimap.
  drawMinimap(ctx, game, 14, H - 164, 210, 150);

  // Dialogue / message line above the minimap.
  if (game.banner) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const tw = ctx.measureText(game.banner).width;
    roundRect(ctx, W / 2 - tw / 2 - 16, H - 116, tw + 32, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText(game.banner, W / 2, H - 93);
  }

  // Controls hint, bottom-centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD move/drive • E enter car • Space shoot • F punch • Shift run • P pause • M mute', W / 2, H - 12);
}

function drawMinimap(ctx, game, x, y, w, h) {
  const scaleX = w / WORLD.width;
  const scaleY = h / WORLD.height;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 8);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#274d2a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x, y + WORLD.beachTop * scaleY, w, h - WORLD.beachTop * scaleY);
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(x, y + WORLD.seaTop * scaleY, w, h - WORLD.seaTop * scaleY);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  for (const ax of WORLD.avenues) {
    ctx.beginPath();
    ctx.moveTo(x + ax * scaleX, y);
    ctx.lineTo(x + ax * scaleX, y + h);
    ctx.stroke();
  }
  for (const sy of WORLD.streets) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * scaleY);
    ctx.lineTo(x + w, y + sy * scaleY);
    ctx.stroke();
  }
  const marker = game.marker;
  if (marker) {
    ctx.fillStyle = '#38c6ff';
    ctx.beginPath();
    ctx.arc(x + marker.x * scaleX, y + marker.y * scaleY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of game.police) {
    ctx.fillStyle = '#2e7dff';
    ctx.beginPath();
    ctx.arc(x + cop.x * scaleX, y + cop.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const e of game.missions.enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(x + e.x * scaleX, y + e.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  ctx.save();
  ctx.translate(x + game.player.x * scaleX, y + game.player.y * scaleY);
  ctx.rotate(game.player.angle);
  ctx.fillStyle = '#ffd54a';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawTitle(ctx, game, view) {
  const W = view.w;
  const H = view.h;
  ctx.fillStyle = 'rgba(8,12,24,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('PALMERA BAY', W / 2, H / 2 - 120);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('An open-world crime story — in the spirit of the great city games', W / 2, H / 2 - 84);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfe8ff';
  const lines = [
    'You are Vic. Broke, no wheels, no crew — back in the city that forgot you.',
    'Steal cars, outrun the Palmera Bay PD, run missions for Rosa, and take the bay.',
    'Explore on foot and by car. Missions, traffic, pedestrians, wanted stars, combat.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 - 44 + i * 24));
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER to start  •  5 missions  •  Save keeps your progress', W / 2, H / 2 + 64);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move / drive   •   E enter a car   •   Space shoot   •   F punch   •   P pause   •   M mute', W / 2, H / 2 + 96);
  ctx.fillText('An original game. No characters, names, art or music from any commercial game.', W / 2, H - 24);
}

export function drawOverlay(ctx, view, title, lines, prompt) {
  const W = view.w;
  const H = view.h;
  ctx.fillStyle = 'rgba(8,12,24,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 60);
  ctx.fillStyle = '#fff';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 - 16 + i * 26));
  if (prompt) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(prompt, W / 2, H / 2 + 70);
  }
}
