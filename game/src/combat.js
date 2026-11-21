// Bullets, punches, hurting the player and gang enemies.
import { PLAYER } from "./config.js";
import { range } from "./random.js";

export function createCombat() {
  return { bullets: [], muzzle: 0, shootCooldown: 0, punchCooldown: 0 };
}

export function fireBullet(combat, x, y, angle, damage, isPlayer) {
  combat.bullets.push({
    x: x + Math.cos(angle) * 20,
    y: y + Math.sin(angle) * 20,
    angle,
    speed: 760,
    origin: isPlayer ? "player" : "enemy",
    damage: damage === undefined ? PLAYER.pistolDamage : damage,
    life: 0.9,
  });
  if (isPlayer) combat.muzzle = 4;
}

export function updateCombat(combat, dt, player, enemies, onKill) {
  combat.shootCooldown = Math.max(0, combat.shootCooldown - dt);
  combat.punchCooldown = Math.max(0, combat.punchCooldown - dt);
  combat.muzzle = Math.max(0, combat.muzzle - 1);
  const kept = [];
  for (const bullet of combat.bullets) {
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    let hit = false;
    if (bullet.origin === "player") {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const d = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
        if (d <= 16) {
          enemy.health -= bullet.damage;
          if (enemy.health <= 0) {
            enemy.alive = false;
            onKill(enemy);
          }
          hit = true;
          break;
        }
      }
    } else if (!player.car) {
      const d = Math.hypot(player.x - bullet.x, player.y - bullet.y);
      if (d <= 14) {
        hurtPlayer(player, bullet.damage);
        hit = true;
      }
    }
    if (!hit) kept.push(bullet);
  }
  combat.bullets = kept;
}

// Returns "wasted" when the player's health reaches zero, else null.
export function hurtPlayer(player, damage) {
  if (player.invuln > 0) return null;
  player.health = Math.max(0, Math.min(PLAYER.maxHealth, player.health - damage));
  player.invuln = 0.35;
  player.hurtFlash = 0.25;
  if (player.health <= 0) return "wasted";
  return null;
}

export function updateEnemies(enemies, dt, player, combat, rng) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const d = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    enemy.cooldown -= dt;
    if (d > 260) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
    } else if (enemy.cooldown <= 0) {
      const spread = range(rng, -0.08, 0.08);
      fireBullet(combat, enemy.x, enemy.y, enemy.angle + spread, 9, false);
      enemy.cooldown = range(rng, 1.1, 2.0);
    }
  }
}

export function punch(player, enemies, onKill) {
  const px = player.x + Math.cos(player.angle) * 46;
  const py = player.y + Math.sin(player.angle) * 46;
  let hit = false;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - px, enemy.y - py);
    if (d <= 30) {
      enemy.health -= PLAYER.punchDamage;
      if (enemy.health <= 0) {
        enemy.alive = false;
        onKill(enemy);
      }
      hit = true;
    }
  }
  return hit;
}
