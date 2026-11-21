// Palmera Bay: configuration for the open-world crime game.
// Everything that tunes the city, the player, the police and the story lives
// here so the other modules stay small and single-purpose.

export const WORLD = {
  width: 2600,
  height: 2000,
  roadWidth: 92,
  // Vertical avenues (x) and horizontal streets (y) of the city grid.
  avenues: [200, 600, 1000, 1400, 1800, 2200],
  streets: [200, 600, 1000, 1400, 1700],
  beachTop: 1860, // everything below this line is sand, then sea
  seaTop: 1940,
};

export const DISTRICTS = [
  { name: 'Old Port', x: 0, y: 0, w: 800, h: 800 },
  { name: 'Downtown', x: 800, y: 0, w: 1000, h: 800 },
  { name: 'North Hills', x: 1800, y: 0, w: 800, h: 800 },
  { name: 'Marina', x: 0, y: 800, w: 800, h: 1000 },
  { name: 'Midtown', x: 800, y: 800, w: 1000, h: 1000 },
  { name: 'Beachfront', x: 1800, y: 800, w: 800, h: 1000 },
];

export const PLAYER = {
  walkSpeed: 170,
  runSpeed: 265,
  radius: 13,
  maxHealth: 100,
  punchDamage: 12,
  pistolDamage: 26,
  pistolRange: 420,
  pistolAmmoStart: 24,
  startMoney: 150,
};

export const CAR = {
  length: 52,
  width: 26,
  accel: 340,
  brake: 520,
  maxSpeed: 430,
  reverseSpeed: 140,
  turnRate: 2.6,
  drag: 0.92,
};

// Wanted stars 0..5. Each level sets how many police hunt the player and
// how aggressive they are. Hiding out of sight drains the heat.
export const WANTED = [
  { stars: 0, cops: 0, copSpeed: 0, ramDamage: 0 },
  { stars: 1, cops: 1, copSpeed: 300, ramDamage: 4 },
  { stars: 2, cops: 2, copSpeed: 330, ramDamage: 6 },
  { stars: 3, cops: 3, copSpeed: 360, ramDamage: 8 },
  { stars: 4, cops: 4, copSpeed: 395, ramDamage: 10 },
  { stars: 5, cops: 5, copSpeed: 430, ramDamage: 12 },
];

export const CAR_COLORS = [
  '#c0392b', '#2980b9', '#f1c40f', '#7f8c8d', '#2c3e50', '#16a085',
  '#e67e22', '#8e44ad', '#ecf0f1', '#1abc9c', '#d35400', '#34495e',
];

export const CAR_MODELS = [
  'Comet GT', 'Sunrise Sedan', 'Bay Cruiser', 'Hustler Van',
  'Palm Coupe', 'Dockside Pickup', 'Neon Hatchback', 'Coral Taxi',
];

// The story: five missions that take the player from nobody to Bay King.
// Each mission is a list of steps; a step completes when its condition holds.
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'Mission 1 — First Wheels',
    reward: 250,
    briefing: 'Rosa needs wheels, fast. Steal any car on the street and bring it to the blue marker at the Marina garage.',
    steps: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'goto', x: 600, y: 1240, radius: 70, text: 'Drive to the Marina garage' },
    ],
  },
  {
    id: 'delivery-run',
    title: 'Mission 2 — Delivery Run',
    reward: 400,
    briefing: 'A package is waiting at the Old Port docks. Pick it up, then deliver it to the Downtown tower before the clock runs out.',
    steps: [
      { type: 'goto', x: 200, y: 320, radius: 70, text: 'Pick up the package at the Old Port docks' },
      { type: 'goto', x: 1000, y: 420, radius: 70, timeLimit: 75, text: 'Deliver the package to the Downtown tower' },
    ],
  },
  {
    id: 'turf-war',
    title: 'Mission 3 — Turf War',
    reward: 600,
    briefing: 'The Coral Kings are muscling in on Beachfront. Take out their crew — four of them — then meet Rosa at the pier.',
    steps: [
      { type: 'fight', count: 4, spawn: { x: 2050, y: 1000 }, text: 'Take out the Coral Kings crew (4 left)' },
      { type: 'goto', x: 2300, y: 1880, radius: 70, text: 'Meet Rosa at the Beachfront pier' },
    ],
  },
  {
    id: 'the-getaway',
    title: 'Mission 4 — The Getaway',
    reward: 800,
    briefing: 'The job went loud. The whole Palmera Bay PD is on you — 3 stars and climbing. Lose them, then reach the safehouse in North Hills.',
    steps: [
      { type: 'escape', text: 'Lose the police (break line of sight and stay hidden)' },
      { type: 'goto', x: 2200, y: 320, radius: 70, text: 'Reach the North Hills safehouse' },
    ],
  },
  {
    id: 'bay-king',
    title: 'Mission 5 — Bay King',
    reward: 1500,
    briefing: 'One last job: the Kings’ boss is holed up at the Marina warehouse with his crew. Take them all down and the bay is yours.',
    steps: [
      { type: 'fight', count: 6, spawn: { x: 600, y: 1560 }, text: 'Take down the Kings’ crew (6 left)' },
      { type: 'goto', x: 600, y: 1560, radius: 80, text: 'Claim the Marina warehouse' },
    ],
  },
];

export const DIALOGUE = {
  intro: [
    'ROSA: Vic, you’re back in Palmera Bay. Broke, no wheels, no crew.',
    'ROSA: The bay eats nobodies. So let’s make you somebody.',
  ],
  missionComplete: [
    'ROSA: Clean work. The money’s yours — and the bay is starting to notice.',
  ],
  busted: 'The Palmera Bay PD caught up with you. The bay will have to wait.',
  wasted: 'You got clipped on the streets of Palmera Bay. Rosa is already planning the comeback.',
  win: 'BAY KING. The Marina warehouse is yours, the Kings are finished, and Palmera Bay has a new name on every wall: VIC.',
};

export const SAVE_KEY = 'palmera-bay-save-v1';
