// ============================================
// Gigaquarium Constants
// Centralized configuration for easy tuning
// ============================================

// ============================================
// Economy - Costs
// ============================================
export const COSTS = {
  // Basic actions
  pellet: 5,
  foodUpgrade: 200,
  laser: 300,
  autoCollect: 1000,

  // Legacy fish (kept for backward compatibility)
  guppy: 100,
  carnivore: 1000,
  breeder: 750,
  feeder: 1500,
  starcatcher: 1200,
  guppycruncher: 800,
  beetlemuncher: 1000,
  ultravore: 5000,

  // Pets
  stinky: 500,
  niko: 600,
  zorf: 400,
  itchy: 700,
  clyde: 550,
  angie: 2000
};

// ============================================
// Economy - Values
// ============================================
export const VALUES = {
  beetle: 150,
  pearl: 500,
  silverCoin: 15,
  goldCoin: 35,
  diamondCoin: 100,
  star: 200,
  chest: 500,
  treasureChest: 1500
};

// ============================================
// Timing Constants (seconds)
// ============================================
export const TIMING = {
  // Alien spawning
  alienSpawnMin: 60,
  alienSpawnMax: 90,
  alienWarningDuration: 5,

  // Fish behavior
  troutCoinInterval: 15,      // Seconds between coin drops
  skellfnCoinInterval: 15,
  mobiusCoinInterval: 25,
  crabBeetleInterval: 15,
  nikoPearlInterval: 40,
  zorfPelletInterval: 8,
  geotleSpawnInterval: 25,

  // Auto-save interval
  autoSaveInterval: 30
};

// ============================================
// Gameplay Thresholds
// ============================================
export const THRESHOLDS = {
  waveSpawn: 15000,           // Total earned to trigger wave spawns
  maxPets: 3,                 // Maximum pets allowed
  autoCollectRadius: 100,    // Auto-collect upgrade radius
  hungerWarning: 50,         // Hunger level when fish turns red
  hungerDeath: 100,          // Hunger level when fish dies
  gusDeathFeedings: 20,      // Pellets needed to kill Gus
  prestigeMinimum: 50000     // Minimum totalEarned to prestige
};

// ============================================
// Alien Stats
// ============================================
export const ALIEN_STATS = {
  sylvester: { hp: 50, damage: 1, speed: 30 },
  balrog: { hp: 100, damage: 1, speed: 25 },
  gus: { hp: null, damage: 1, speed: 20, feedingsToKill: 20 },
  destructor: { hp: 80, damage: 1, speed: 15, missileInterval: 3 },
  missile: { hp: 3, damage: 1, speed: 120 }
};

// ============================================
// Alien Progression (unlocks by totalEarned)
// ============================================
export const ALIEN_PROGRESSION = [
  { type: 'sylvester', minEarned: 0 },
  { type: 'gus', minEarned: 3000 },
  { type: 'balrog', minEarned: 7000 },
  { type: 'destructor', minEarned: 15000 }
];

// ============================================
// Alien Scaling (early-game HP reduction)
// ============================================
export const ALIEN_SCALING = {
  sylvesterReducedHp: 30,       // Sylvester HP when totalEarned < $1,000
  sylvesterReducedThreshold: 1000
};

// ============================================
// Alien Spawn Timer Scaling
// ============================================
export const ALIEN_SPAWN_SCALING = [
  { maxEarned: 1000, min: 120, max: 180 },
  { maxEarned: 5000, min: 90, max: 120 },
  { maxEarned: Infinity, min: 60, max: 90 }
];

// ============================================
// Knockback Constants
// ============================================
export const KNOCKBACK = {
  force: 150,
  laserForce: 250,
  decay: 5
};

// ============================================
// Trout Growth Stages
// ============================================
export const TROUT_GROWTH = {
  small: { size: 35, speed: 80, feedingsToGrow: 3, coinType: 'silver', coinValue: 15 },
  medium: { size: 55, speed: 65, feedingsToGrow: 5, coinType: 'silver', coinValue: 15 },
  large: { size: 70, speed: 55, feedingsToGrow: null, coinType: 'gold', coinValue: 35 }
};

// ============================================
// Fish Evolution Stages (Legacy)
// ============================================
export const STAGES = {
  small: { size: 20, feedingsToEvolve: 3 },
  medium: { size: 28, feedingsToEvolve: 5 },
  large: { size: 38, feedingsToEvolve: 10 },
  king: { size: 48, feedingsToEvolve: 15 },
  star: { size: 55, feedingsToEvolve: null }
};

// ============================================
// Achievement Definitions
// ============================================
export const ACHIEVEMENT_DEFS = {
  first_fish: { name: 'First Friend', desc: 'Buy your first fish' },
  first_carnivore: { name: 'Predator', desc: 'Buy a carnivore' },
  alien_slayer: { name: 'Alien Slayer', desc: 'Defeat 10 aliens' },
  millionaire: { name: 'Millionaire', desc: 'Earn $100,000 total' },
  full_tank: { name: 'Full Tank', desc: 'Have 20+ fish at once' },
  pet_lover: { name: 'Pet Lover', desc: 'Own all 6 pet types' },
  survivor: { name: 'Survivor', desc: 'Play for 30 minutes' }
};

// ============================================
// Prestige Bonuses (per level)
// ============================================
export const PRESTIGE = {
  goldBonus: 0.10,      // +10% gold per level
  speedBonus: 0.05,     // +5% fish speed per level
  coinRateBonus: 0.05   // +5% faster coin drops per level
};

// ============================================
// Physics
// ============================================
export const PHYSICS = {
  pelletSinkSpeed: 50,
  coinSinkSpeed: 30,
  coinFloatSpeed: 20,
  beetleSpeed: 40
};
