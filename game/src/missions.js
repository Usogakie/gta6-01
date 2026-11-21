// The story engine for Palmera Bay: runs the five-mission chain, tracks the
// current step, spawns rival gang members for fight steps, and pays out.
import { MISSIONS } from './config.js';
import { dist, range } from './random.js';

export function createMissionState() {
  return {
    index: 0, // mission in MISSIONS, or MISSIONS.length when the story is done
    stepIndex: 0,
    stepTimer: 0,
    stepStarted: false,
    enemies: [], // rival gang members for the current fight step
    killsLeft: 0,
    packageHeld: false,
    message: '',
    messageAt: 0,
    justCompleted: null,
    failed: null,
  };
}

export function currentMission(state) {
  return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
}

export function currentStep(state) {
  const mission = currentMission(state);
  return mission ? mission.steps[state.stepIndex] : null;
}

export function objectiveText(state) {
  const mission = currentMission(state);
  if (!mission) return 'Free roam — Palmera Bay is yours, Vic.';
  const step = currentStep(state);
  if (!step) return mission.title;
  if (step.type === 'fight') return `${step.text.replace(/\(\d+ left\)/, `(${state.killsLeft} left)`)}`;
  return step.text;
}

export function missionMarker(state) {
  const step = currentStep(state);
  if (step && step.type === 'goto') return { x: step.x, y: step.y, radius: step.radius };
  return null;
}

function spawnEnemies(state, step, rng) {
  state.enemies = [];
  for (let i = 0; i < step.count; i++) {
    state.enemies.push({
      x: step.spawn.x + range(rng, -90, 90),
      y: step.spawn.y + range(rng, -90, 90),
      health: 50,
      speed: 95,
      shootCooldown: range(rng, 0.5, 1.8),
      angle: 0,
      alive: true,
    });
  }
  state.killsLeft = step.count;
}

export function beginStep(state, rng) {
  const step = currentStep(state);
  state.stepStarted = true;
  state.stepTimer = step && step.timeLimit ? step.timeLimit : 0;
  if (step && step.type === 'fight') spawnEnemies(state, step, rng);
  if (step && step.type === 'escape') state.escapeReady = true;
}

// Advance the mission state one frame. Returns events for the main loop:
// { completedMission, failed, pickedUp, stepDone }.
export function updateMissions(state, game, dt, rng) {
  const events = {};
  const mission = currentMission(state);
  if (!mission) return events;
  const step = currentStep(state);
  if (!step) return events;
  if (!state.stepStarted) beginStep(state, rng);

  const px = game.player.x;
  const py = game.player.y;

  if (step.type === 'steal') {
    if (game.player.car) {
      events.stepDone = true;
    }
  } else if (step.type === 'goto') {
    if (step.timeLimit) {
      state.stepTimer -= dt;
      if (state.stepTimer <= 0 && dist(px, py, step.x, step.y) > step.radius) {
        state.failed = 'Out of time — the delivery window closed.';
        events.failed = state.failed;
        return events;
      }
    }
    if (dist(px, py, step.x, step.y) < step.radius) {
      if (state.stepIndex === 0 && mission.id === 'delivery-run') {
        state.packageHeld = true;
        events.pickedUp = true;
      }
      events.stepDone = true;
    }
  } else if (step.type === 'fight') {
    if (state.killsLeft <= 0) events.stepDone = true;
  } else if (step.type === 'escape') {
    if (game.wanted.stars === 0) events.stepDone = true;
  }

  if (events.stepDone) {
    state.stepIndex++;
    state.stepStarted = false;
    if (state.stepIndex >= mission.steps.length) {
      game.player.money += mission.reward;
      state.justCompleted = mission;
      state.index++;
      state.stepIndex = 0;
      state.packageHeld = false;
      events.completedMission = mission;
      if (state.index >= MISSIONS.length) events.storyDone = true;
    }
  }
  return events;
}

export function resetMissionStep(state, rng) {
  state.stepIndex = 0;
  state.stepStarted = false;
  state.enemies = [];
  state.killsLeft = 0;
  state.packageHeld = false;
  state.failed = null;
  beginStep(state, rng);
}
