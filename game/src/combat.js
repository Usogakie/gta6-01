// Combat for Palmera Bay: the player's pistol and fists, bullets in flight,
// and the rival gang members who shoot back during fight missions.
import { PLAYER } from './config.js';
import { dist, clamp } from './random.js';

export function createCombat() {
  return {
    bullets: [], // {x, y, angle, speed, from, damage, life}
    muzzle: 0, // frames left to draw the muzzle flash
    shootCooldown: 0,
    punchCooldown: 0,
  };
}

// Fire one bullet from (x, y) toward angle. `from` is 'player' or 'enemy'.
export function fireBullet(combat, x, y, angle, from, damage) {
  combat.bullets.push({
    x: x + Math.cos(angle) * 20,
    y: y + Math.sin(angle) * 20,
    angle,
    speed: 760,
    from,
    damage: damage || PLAYER.pistolDamage,
    life: 0.9,
  });
  if (from === 'player') combat.muzzle = 4;
}

export function updateBullets(combat, dt, game) {
  combat.shootCooldown = Math.max(0, combat.shootCooldown - dt);
  combat.punchCooldown = Math.max(0, combat.punchCooldown - dt);
  combat.muzzle = Math.max(0, combat.muzzle - 1);
  const kept = [];
  for (const b of combat.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    let hit = false;
    if (b.from === 'player') {
      for (const e of game.missions.enemies) {
        if (!e.alive) continue;
        if (dist(b.x, b.y, e.x, e.y) < 16) {
          e.health -= b.damage;
          if (e.health <= 0) {
            e.alive = false;
            game.missions.killsLeft = Math.max(0, game.missions.killsLeft - 1);
            game.player.money += 40;
          }
          hit = true;
          break;
        }
      }
    } else if (dist(b.x, b.y, game.player.x, game.player.y) < 14 && !game.player.car) {
      hurtPlayer(game, b.damage);
      hit = true;
    }
    if (!hit) kept.push(b);
  }
  combat.bullets = kept;
}

export function hurtPlayer(game, damage) {
  if (game.player.invuln > 0) return;
  game.player.health = clamp(game.player.health - damage, 0, PLAYER.maxHealth);
  game.player.invuln = 0.35;
  game.player.hurtFlash = 0.25;
  if (game.player.health <= 0) game.over = 'wasted';
}

// Enemy gang member AI: close in on the player and shoot when in range.
export function updateEnemies(game, dt, rng) {
  for (const e of game.missions.enemies) {
    if (!e.alive) continue;
    const d = dist(e.x, e.y, game.player.x, game.player.y);
    e.angle = Math.atan2(game.player.y - e.y, game.player.x - e.x);
    if (d > 260) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else {
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && !game.over) {
        fireBullet(game.combat, e.x, e.y, e.angle + (rng() - 0.5) * 0.22, 'enemy', 9);
        e.shootCooldown = 1.1 + rng() * 0.9;
      }
    }
  }
}

// The player's punch: a short arc in front of the player, hurts enemies and
// shoves pedestrians (which counts as a crime if the police see it).
export function punch(game) {
  const p = game.player;
  const rangePx = 46;
  const px = p.x + Math.cos(p.angle) * rangePx;
  const py = p.y + Math.sin(p.angle) * rangePx;
  let hitEnemy = false;
  for (const e of game.missions.enemies) {
    if (e.alive && dist(px, py, e.x, e.y) < 30) {
      e.health -= PLAYER.punchDamage;
      if (e.health <= 0) {
        e.alive = false;
        game.missions.killsLeft = Math.max(0, game.missions.killsLeft - 1);
        game.player.money += 40;
      }
      hitEnemy = true;
    }
  }
  return hitEnemy;
}
