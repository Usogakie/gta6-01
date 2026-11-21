// The five-mission story: steps, spawning, completion and failure.
import { mulberry32, range } from "./random.js";

export const MISSIONS = [
  {
    id: "first-wheels",
    title: "First Wheels",
    reward: 250,
    briefing:
      "Rosa needs wheels fast: steal any car on the street and bring it to the blue marker at the Marina garage.",
    steps: [
      { type: "steal", text: "Steal a car (walk up and press E)" },
      { type: "goto", x: 600, y: 1240, radius: 70, text: "Drive to the Marina garage" },
    ],
  },
  {
    id: "delivery-run",
    title: "Delivery Run",
    reward: 400,
    briefing:
      "A package waits at the Old Port docks: pick it up, then deliver it to the Downtown tower before the clock runs out.",
    steps: [
      { type: "goto", x: 200, y: 320, radius: 70, text: "Pick up the package at the Old Port docks" },
      { type: "goto", x: 1000, y: 420, radius: 70, timeLimit: 75, text: "Deliver the package to the Downtown tower" },
    ],
  },
  {
    id: "turf-war",
    title: "Turf War",
    reward: 600,
    briefing:
      "The Coral Kings are muscling in on Beachfront: take out their crew — four of them — then meet Rosa at the pier.",
    steps: [
      { type: "fight", count: 4, spawn: { x: 2050, y: 1000 }, text: "Take out the Coral Kings (4 left)" },
      { type: "goto", x: 2300, y: 1880, radius: 70, text: "Meet Rosa at the pier" },
    ],
  },
  {
    id: "the-getaway",
    title: "The Getaway",
    reward: 800,
    briefing:
      "The job went loud and the whole Palmera Bay PD is on you, three stars and climbing: lose them, then reach the safehouse in North Hills.",
    steps: [
      { type: "escape", text: "Lose the police" },
      { type: "goto", x: 2200, y: 320, radius: 70, text: "Reach the safehouse in North Hills" },
    ],
  },
  {
    id: "bay-king",
    title: "Bay King",
    reward: 1500,
    briefing:
      "One last job: the Kings' boss is holed up at the Marina warehouse with his crew; take them all down and the bay is yours.",
    steps: [
      { type: "fight", count: 6, spawn: { x: 600, y: 1560 }, text: "Take out the Kings at the warehouse (6 left)" },
      { type: "goto", x: 600, y: 1560, radius: 80, text: "Claim the Marina warehouse" },
    ],
  },
];

export function createMissions() {
  return {
    index: 0,
    step: 0,
    timer: 0,
    started: false,
    enemies: [],
    killsLeft: 0,
    hasPackage: false,
    failed: null,
  };
}

export function currentMission(state) {
  if (state.index >= MISSIONS.length) return null;
  return MISSIONS[state.index];
}

export function currentStep(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  return mission.steps[state.step] || null;
}

export function objectiveText(state) {
  const step = currentStep(state);
  if (!step) return "Free roam — the bay is yours";
  if (step.type === "fight") {
    return step.text.replace(/\(\d+/, "(" + state.killsLeft);
  }
  return step.text;
}

export function currentMarker(state) {
  const step = currentStep(state);
  if (!step || step.type !== "goto") return null;
  return { x: step.x, y: step.y, radius: step.radius };
}

export function startStep(state, seed) {
  const step = currentStep(state);
  if (!step) return;
  state.started = true;
  state.timer = step.timeLimit || 0;
  if (step.type === "fight") {
    const rng = mulberry32((seed || 20261121) + state.index * 101 + state.step * 17);
    state.enemies = [];
    for (let i = 0; i < step.count; i++) {
      state.enemies.push({
        x: step.spawn.x + range(rng, -90, 90),
        y: step.spawn.y + range(rng, -90, 90),
        angle: 0,
        health: 50,
        speed: 95,
        cooldown: range(rng, 0.5, 1.8),
        alive: true,
      });
    }
    state.killsLeft = step.count;
  }
}

// env: { player, wanted, addCrime, onPickup, onComplete, onFail, onStoryDone }
// Returns an events object describing what happened this frame.
export function updateMissions(state, env, dt, now) {
  const events = { pickup: false, completed: null, failed: null, storyDone: false };
  const mission = currentMission(state);
  if (!mission) return events;
  const step = currentStep(state);
  if (!step) return events;

  if (!state.started) {
    startStep(state, env.seed);
    // The Getaway escape step must grant three stars the moment it starts,
    // or it would complete instantly when the player arrives with no stars.
    if (mission.id === "the-getaway" && step.type === "escape") {
      if (env.wanted.stars < 3) env.addCrime(env.wanted, 3, now);
    }
  }

  let done = false;
  if (step.type === "steal") {
    done = !!env.player.car;
  } else if (step.type === "goto") {
    if (step.timeLimit) {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.failed = "Out of time — the delivery window closed.";
        events.failed = state.failed;
        return events;
      }
    }
    const d = Math.hypot(env.player.x - step.x, env.player.y - step.y);
    if (d <= step.radius) {
      done = true;
      if (mission.id === "delivery-run" && state.step === 0) {
        state.hasPackage = true;
        events.pickup = true;
      }
    }
  } else if (step.type === "fight") {
    done = state.killsLeft <= 0;
  } else if (step.type === "escape") {
    done = env.wanted.stars === 0;
  }

  if (!done) return events;

  state.step += 1;
  state.started = false;
  if (state.step >= mission.steps.length) {
    env.player.money += mission.reward;
    state.index += 1;
    state.step = 0;
    state.hasPackage = false;
    events.completed = mission;
    if (state.index >= MISSIONS.length) {
      events.storyDone = true;
    }
  }
  return events;
}

export function resetMission(state, seed) {
  state.step = 0;
  state.started = false;
  state.timer = 0;
  state.enemies = [];
  state.killsLeft = 0;
  state.hasPackage = false;
  state.failed = null;
  startStep(state, seed);
}
