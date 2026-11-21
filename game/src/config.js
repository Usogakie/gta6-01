// Palmera Bay tuning: world size, roads, districts, player, cars and wanted levels.
export const WORLD_WIDTH = 2600;
export const WORLD_HEIGHT = 2000;
export const ROAD_WIDTH = 92;
export const AVENUES = [200, 600, 1000, 1400, 1800, 2200];
export const STREETS = [200, 600, 1000, 1400, 1700];
export const BEACH_Y = 1860;
export const SEA_Y = 1940;

export const DISTRICTS = [
  { name: "Old Port", x0: 0, y0: 0, x1: 800, y1: 800 },
  { name: "Downtown", x0: 800, y0: 0, x1: 1800, y1: 800 },
  { name: "North Hills", x0: 1800, y0: 0, x1: 2600, y1: 800 },
  { name: "Marina", x0: 0, y0: 800, x1: 800, y1: 1800 },
  { name: "Midtown", x0: 800, y0: 800, x1: 1800, y1: 1800 },
  { name: "Beachfront", x0: 1800, y0: 800, x1: 2600, y1: 1800 },
];

export const PLAYER = {
  walkSpeed: 170,
  runSpeed: 265,
  radius: 13,
  maxHealth: 100,
  startMoney: 150,
  punchDamage: 12,
  pistolDamage: 26,
  pistolRange: 420,
  startAmmo: 24,
};

export const CAR = {
  length: 52,
  width: 26,
  accel: 340,
  brake: 520,
  topSpeed: 430,
  reverseSpeed: 140,
  turnRate: 2.6,
  drag: 0.92,
};

// Wanted levels 0..5: how many cruisers, their speed and their ram damage.
export const WANTED = [
  { cars: 0, speed: 0, ram: 0 },
  { cars: 1, speed: 300, ram: 4 },
  { cars: 2, speed: 330, ram: 6 },
  { cars: 3, speed: 360, ram: 8 },
  { cars: 4, speed: 395, ram: 10 },
  { cars: 5, speed: 430, ram: 12 },
];

export const TRAFFIC_COLORS = [
  "#d23b2e",
  "#2e6fd2",
  "#e8c832",
  "#8a8f96",
  "#1d2f57",
  "#1f8a6d",
  "#e8762a",
  "#7a4fb5",
  "#f2f0e8",
  "#2ec4b6",
  "#c65a1e",
  "#5b6b7a",
];

export const CAR_MODELS = [
  "Comet GT",
  "Sunrise Sedan",
  "Bay Cruiser",
  "Hustler Van",
  "Palm Coupe",
  "Dockside Pickup",
  "Neon Hatchback",
  "Coral Taxi",
];

export const PED_SHIRTS = [
  "#e84c3d",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
];

export const POLICE_COLOR = "#141c2e";
export const POLICE_MODEL = "PD Interceptor";
