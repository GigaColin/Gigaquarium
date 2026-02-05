// Gigaquarium - Main Game File

import { FISH_SPECIES, SIZE_CONFIG, RARITY_COLORS } from './fishData.js';
import { COSTS, VALUES, TIMING, THRESHOLDS, PRESTIGE, PHYSICS } from './constants.js';
import {
  Trout, Skellfin, MobiusDickens,
  Breeder, Feeder, Starcatcher, Beetlemuncher, Crab, Geotle,
  WardenLamprey, Seeker, Anemone,
  setGameContext
} from './entities/fish.js';
import {
  Sylvester, Balrog, Gus, Destructor, Missile,
  setAlienContext
} from './entities/aliens.js';
import {
  Pellet, Coin, Beetle,
  setCollectiblesContext, updateFoodUpgradedStatus
} from './entities/collectibles.js';
import {
  Stinky, Niko, Zorf, Itchy, Clyde, Angie,
  setPetsContext
} from './entities/pets.js';
import { EntityManager } from './entities/EntityManager.js';

// ============================================
// Image Cache for Sprites
// ============================================
const imageCache = {};
let imagesLoaded = false;

async function preloadFishImages() {
  const promises = Object.entries(FISH_SPECIES).map(([key, fish]) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache[key] = img;
        console.log(`Loaded sprite: ${key}`);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${key}`);
        resolve(); // Continue even if one fails
      };
      img.src = fish.imageUrl;
    });
  });
  await Promise.all(promises);
  imagesLoaded = true;
  console.log('All fish sprites loaded!');
}

// ============================================
// TankManager - Handles canvas boundaries
// ============================================
class TankManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.bounds = {
      left: 0,
      right: canvas.width,
      top: 0,
      bottom: canvas.height
    };
    this.padding = 20; // Keep entities away from edges
  }

  getRandomPosition() {
    return {
      x: this.padding + Math.random() * (this.bounds.right - this.bounds.left - this.padding * 2),
      y: this.padding + Math.random() * (this.bounds.bottom - this.bounds.top - this.padding * 2)
    };
  }

  clampToTank(x, y) {
    return {
      x: Math.max(this.bounds.left + this.padding, Math.min(this.bounds.right - this.padding, x)),
      y: Math.max(this.bounds.top + this.padding, Math.min(this.bounds.bottom - this.padding, y))
    };
  }

  isWithinBounds(x, y) {
    return x >= this.bounds.left + this.padding &&
           x <= this.bounds.right - this.padding &&
           y >= this.bounds.top + this.padding &&
           y <= this.bounds.bottom - this.padding;
  }

  getWidth() {
    return this.bounds.right - this.bounds.left;
  }

  getHeight() {
    return this.bounds.bottom - this.bounds.top;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate distance between two points
 */
function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find nearest target from a list of entities
 * @param {object} entity - The source entity with x, y properties
 * @param {array} targets - Array of potential targets
 * @param {object} options - Optional config: { radius, filter, getPosition }
 * @returns {object|null} The nearest target or null
 */
function findNearest(entity, targets, options = {}) {
  const { radius = Infinity, filter = null, getPosition = null } = options;
  let nearest = null;
  let nearestDist = Infinity;

  for (const target of targets) {
    if (filter && !filter(target)) continue;

    const pos = getPosition ? getPosition(target) : target;
    const dist = getDistance(entity.x, entity.y, pos.x, pos.y);

    if (dist < radius && dist < nearestDist) {
      nearestDist = dist;
      nearest = target;
    }
  }
  return nearest;
}

/**
 * Move entity toward a target position
 * @returns {boolean} true if entity is still moving, false if arrived
 */
function moveToward(entity, targetX, targetY, speed, dt) {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 5) {
    entity.x += (dx / dist) * speed * dt;
    entity.y += (dy / dist) * speed * dt;
    if (entity.facingLeft !== undefined) {
      entity.facingLeft = dx < 0;
    }
    return true;
  }
  return false;
}

// ============================================
// Game State
// ============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const goldDisplay = document.getElementById('goldAmount');

const tankManager = new TankManager(canvas);

let gold = 100;
const pellets = [];
const coins = [];

// Cost aliases (using centralized constants.js)
const PELLET_COST = COSTS.pellet;
const FOOD_UPGRADE_COST = COSTS.foodUpgrade;
const LASER_COST = COSTS.laser;
const STINKY_COST = COSTS.stinky;
const BEETLE_VALUE = VALUES.beetle;
const PEARL_VALUE = VALUES.pearl;

// Fish costs from constants
const BREEDER_COST = COSTS.breeder;
const FEEDER_COST = COSTS.feeder;
const STARCATCHER_COST = COSTS.starcatcher;
const BEETLEMUNCHER_COST = COSTS.beetlemuncher;

// Sprite fish costs (from fishData.js)
const TROUT_COST = FISH_SPECIES.trout.cost;
const SKELLFIN_COST = FISH_SPECIES.skellfin.cost;
const MOBIUS_COST = FISH_SPECIES.mobius_dickens.cost;
const CRAB_COST = FISH_SPECIES.crab.cost;
const WARDEN_COST = FISH_SPECIES.warden_lamprey.cost;
const SEEKER_COST = FISH_SPECIES.seeker.cost;
const ANEMONE_COST = FISH_SPECIES.anemone.cost;
const GEOTLE_COST = FISH_SPECIES.geotle.cost;

let foodUpgraded = false;
let laserUpgraded = false;

// Fish arrays
const trouts = [];        // Basic fish
const skellfins = [];     // Carnivore predator
const mobiuses = [];      // Apex predator
const crabs = [];         // Bottom dweller, hunts trouts
const wardens = [];       // Attacks aliens
const seekers = [];       // Auto-collects coins
const anemones = [];      // Heals nearby fish
const geotles = [];       // Spawns baby trout
const breeders = [];      // Spawns baby trouts
const feeders = [];       // Drops pellets
const starcatchers = [];  // Eats stars
const beetlemunchers = []; // Eats beetles
const beetles = [];       // Collectibles

// Pet system - multiple stinkies allowed
const stinkies = [];

// New pets (Phase 13)
const nikos = [];
const zorfs = [];
const itchys = [];
const clydes = [];
let angie = null;  // Single instance (revive mechanic)

// Pet costs (aliases for centralized constants)
const NIKO_COST = COSTS.niko;
const ZORF_COST = COSTS.zorf;
const ITCHY_COST = COSTS.itchy;
const CLYDE_COST = COSTS.clyde;
const ANGIE_COST = COSTS.angie;
const MAX_PETS = THRESHOLDS.maxPets;

// Alien system
let alien = null;
let aliens = [];  // Support multiple aliens for waves
let alienSpawnTimer = TIMING.alienSpawnMin + Math.random() * (TIMING.alienSpawnMax - TIMING.alienSpawnMin);
let alienWarningTimer = 0;
let alienWarningActive = false;
let totalEarned = 0;  // Track total gold earned for wave triggers
const ALIEN_SPAWN_MIN = TIMING.alienSpawnMin;
const ALIEN_SPAWN_MAX = TIMING.alienSpawnMax;
const ALIEN_WARNING_DURATION = TIMING.alienWarningDuration;
const WAVE_THRESHOLD = THRESHOLDS.waveSpawn;

// Particle system
const particles = [];

// Missile system (for Destructor)
const missiles = [];

// ============================================
// EntityManager System (Phase R2)
// ============================================
const entityManager = new EntityManager();

// Register all entity arrays with the manager
// Fish (removable on death)
entityManager.register('trouts', trouts, 'fish');
entityManager.register('skellfins', skellfins, 'fish');
entityManager.register('mobiuses', mobiuses, 'fish');
entityManager.register('crabs', crabs, 'fish');
entityManager.register('breeders', breeders, 'fish');
entityManager.register('starcatchers', starcatchers, 'fish');
entityManager.register('beetlemunchers', beetlemunchers, 'fish');
entityManager.register('geotles', geotles, 'fish');

// Fish (permanent - never removed by manager)
entityManager.register('wardens', wardens, 'permanentFish');
entityManager.register('feeders', feeders, 'permanentFish');
entityManager.register('seekers', seekers, 'permanentFish');
entityManager.register('anemones', anemones, 'permanentFish');

// Collectibles
entityManager.register('pellets', pellets, 'pellet');
entityManager.register('coins', coins, 'coin');
entityManager.register('beetles', beetles, 'beetle');

// Combat
entityManager.register('aliens', aliens, 'alien');
entityManager.register('missiles', missiles, 'missile');

// Pets (permanent)
entityManager.register('stinkies', stinkies, 'pet');
entityManager.register('nikos', nikos, 'pet');
entityManager.register('zorfs', zorfs, 'pet');
entityManager.register('itchys', itchys, 'pet');
entityManager.register('clydes', clydes, 'pet');

// Effects
entityManager.register('particles', particles, 'particle');

// Set context for entities needing special update args (Destructor needs missiles)
entityManager.setContext({ missiles });

// ============================================
// Quality of Life & Progression (Phase 15)
// ============================================

// Speed Toggle
let gameSpeed = 1;

// Auto-Collect Upgrade
let autoCollectUpgraded = false;
const AUTO_COLLECT_COST = COSTS.autoCollect;
const AUTO_COLLECT_RADIUS = THRESHOLDS.autoCollectRadius;

// Statistics System
const stats = {
  totalEarned: 0,       // Track total earnings (separate from totalEarned for prestige tracking)
  totalFishLost: 0,     // Increment on fish death
  aliensDefeated: 0,    // Increment on alien death
  coinsCollected: 0,    // Increment on coin pickup
  fishBought: 0,        // Increment on fish purchase
  timePlayed: 0         // Accumulate dt in game loop
};

// Statistics panel visibility
let statsVisible = false;

// Achievement System
const ACHIEVEMENTS = {
  first_fish: { name: 'First Friend', desc: 'Buy your first fish', unlocked: false },
  first_carnivore: { name: 'Predator', desc: 'Buy a carnivore', unlocked: false },
  alien_slayer: { name: 'Alien Slayer', desc: 'Defeat 10 aliens', unlocked: false },
  millionaire: { name: 'Millionaire', desc: 'Earn $100,000 total', unlocked: false },
  full_tank: { name: 'Full Tank', desc: 'Have 20+ fish at once', unlocked: false },
  pet_lover: { name: 'Pet Lover', desc: 'Own all 6 pet types', unlocked: false },
  survivor: { name: 'Survivor', desc: 'Play for 30 minutes', unlocked: false }
};

const unlockedAchievements = new Set();
let achievementCheckTimer = 0;
let achievementPopup = null;  // { name, desc, timer }

// Prestige System
let prestigeLevel = 0;
let prestigePoints = 0;
const PRESTIGE_THRESHOLD = THRESHOLDS.prestigeMinimum;

// ============================================
// Sound System (Web Audio API)
// ============================================
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.log('Web Audio not supported');
      this.enabled = false;
    }
  }

  play(type) {
    if (!this.enabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    switch (type) {
      case 'feed':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'coin':
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'evolve':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case 'alien':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'hit':
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'death':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'buy':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(700, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'victory':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        osc.frequency.setValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  }
}

const sound = new SoundSystem();

// ============================================
// Particle System
// ============================================
class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.age = 0;
    this.maxAge = 1;
    this.dead = false;

    switch (type) {
      case 'bubble':
        this.vx = (Math.random() - 0.5) * 20;
        this.vy = -30 - Math.random() * 50;
        this.size = 3 + Math.random() * 5;
        this.maxAge = 2 + Math.random();
        break;

      case 'sparkle':
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = 2 + Math.random() * 4;
        this.maxAge = 0.5 + Math.random() * 0.3;
        this.color = ['#ffd700', '#ffff00', '#ffffff'][Math.floor(Math.random() * 3)];
        break;

      case 'coin_sparkle':
        const a = Math.random() * Math.PI * 2;
        const s = 20 + Math.random() * 40;
        this.vx = Math.cos(a) * s;
        this.vy = Math.sin(a) * s;
        this.size = 2 + Math.random() * 3;
        this.maxAge = 0.3 + Math.random() * 0.2;
        this.color = '#ffd700';
        break;

      case 'blood':
        const ba = Math.random() * Math.PI * 2;
        const bs = 30 + Math.random() * 50;
        this.vx = Math.cos(ba) * bs;
        this.vy = Math.sin(ba) * bs;
        this.size = 2 + Math.random() * 3;
        this.maxAge = 0.4;
        this.color = '#ff0000';
        break;
    }
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.maxAge) {
      this.dead = true;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bubbles slow down and wobble
    if (this.type === 'bubble') {
      this.vx += (Math.random() - 0.5) * 50 * dt;
      this.vy *= 0.99;
    }

    // Sparkles fade with gravity
    if (this.type === 'sparkle' || this.type === 'coin_sparkle' || this.type === 'blood') {
      this.vy += 100 * dt;
    }
  }

  draw(ctx) {
    const alpha = 1 - (this.age / this.maxAge);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.type === 'bubble') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();

      // Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function spawnParticles(x, y, type, count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, type));
  }
}

// ============================================
// Save/Load System
// ============================================
const SAVE_KEY = 'gigaquarium_save';

function saveGame() {
  const saveData = {
    gold: gold,
    totalEarned: totalEarned,
    foodUpgraded: foodUpgraded,
    laserUpgraded: laserUpgraded,
    // Phase 15: Quality of Life
    autoCollectUpgraded: autoCollectUpgraded,
    gameSpeed: gameSpeed,
    stats: stats,
    unlockedAchievements: Array.from(unlockedAchievements),
    prestigeLevel: prestigeLevel,
    prestigePoints: prestigePoints,
    stinkyCount: stinkies.length,
    breeders: breeders.map(b => ({
      x: b.x,
      y: b.y,
      hunger: b.hunger,
      breedTimer: b.breedTimer
    })),
    feeders: feeders.map(f => ({
      x: f.x,
      y: f.y,
      dropTimer: f.dropTimer
    })),
    starcatchers: starcatchers.map(s => ({
      x: s.x,
      hunger: s.hunger,
      coinTimer: s.coinTimer
    })),
    beetlemunchers: beetlemunchers.map(bm => ({
      x: bm.x,
      y: bm.y,
      hunger: bm.hunger,
      coinTimer: bm.coinTimer
    })),
    // Fish arrays
    wardens: wardens.map(w => ({ x: w.x, y: w.y })),
    seekers: seekers.map(s => ({ x: s.x, y: s.y })),
    anemones: anemones.map(a => ({ x: a.x, y: a.y })),
    geotles: geotles.map(g => ({
      x: g.x,
      y: g.y,
      hunger: g.hunger,
      spawnTimer: g.spawnTimer
    })),
    // New sprite-based arrays
    trouts: trouts.map(t => ({
      x: t.x,
      y: t.y,
      hunger: t.hunger
    })),
    skellfins: skellfins.map(s => ({
      x: s.x,
      y: s.y,
      hunger: s.hunger
    })),
    mobiuses: mobiuses.map(m => ({
      x: m.x,
      y: m.y,
      hunger: m.hunger
    })),
    crabs: crabs.map(c => ({
      x: c.x,
      hunger: c.hunger,
      coinTimer: c.coinTimer
    })),
    nikos: nikos.map(n => ({ x: n.x, y: n.y, pearlTimer: n.pearlTimer })),
    zorfs: zorfs.map(z => ({ x: z.x, y: z.y, dropTimer: z.dropTimer })),
    itchys: itchys.map(i => ({ x: i.x, y: i.y })),
    clydes: clydes.map(c => ({ x: c.x, y: c.y })),
    angie: angie ? { x: angie.x, y: angie.y } : null,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    console.log('Game saved!');
  } catch (e) {
    console.log('Failed to save game:', e);
  }
}

function loadGame() {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return false;

    const saveData = JSON.parse(data);

    // Restore gold and total earned
    gold = saveData.gold || 100;
    totalEarned = saveData.totalEarned || 0;
    updateGoldDisplay();

    // Restore upgrades
    foodUpgraded = saveData.foodUpgraded || false;
    updateFoodUpgradedStatus(foodUpgraded); // Update collectibles module
    if (foodUpgraded) {
      updateFoodButtonState();
    }

    laserUpgraded = saveData.laserUpgraded || false;
    if (laserUpgraded) {
      updateLaserButtonState();
    }

    // Phase 15: Quality of Life restore
    autoCollectUpgraded = saveData.autoCollectUpgraded || false;
    if (autoCollectUpgraded) {
      updateAutoCollectButtonState();
    }

    gameSpeed = saveData.gameSpeed || 1;
    const speedBtn = document.getElementById('speedBtn');
    if (speedBtn) {
      speedBtn.textContent = `Speed: ${gameSpeed}x`;
      speedBtn.classList.toggle('active', gameSpeed === 2);
    }

    // Restore stats
    if (saveData.stats) {
      Object.assign(stats, saveData.stats);
    }

    // Restore achievements
    if (saveData.unlockedAchievements) {
      for (const id of saveData.unlockedAchievements) {
        unlockedAchievements.add(id);
        if (ACHIEVEMENTS[id]) {
          ACHIEVEMENTS[id].unlocked = true;
        }
      }
    }

    // Restore prestige
    prestigeLevel = saveData.prestigeLevel || 0;
    prestigePoints = saveData.prestigePoints || 0;

    // Restore Stinkies (support both old hasStinky and new stinkyCount)
    const stinkyCount = saveData.stinkyCount || (saveData.hasStinky ? 1 : 0);
    for (let i = 0; i < stinkyCount; i++) {
      stinkies.push(new Stinky());
    }
    updateStinkyButtonState();

    // Migrate legacy guppies to trouts
    if (saveData.guppies) {
      for (const gData of saveData.guppies) {
        const trout = new Trout(gData.x, gData.y);
        trout.hunger = Math.min(gData.hunger || 0, 50);
        trouts.push(trout);
      }
    }

    // Migrate legacy carnivores to skellfins
    if (saveData.carnivores) {
      for (const cData of saveData.carnivores) {
        const skellfin = new Skellfin(cData.x, cData.y);
        skellfin.hunger = Math.min(cData.hunger || 0, 50);
        skellfins.push(skellfin);
      }
    }

    // Restore breeders
    if (saveData.breeders) {
      for (const bData of saveData.breeders) {
        const breeder = new Breeder(bData.x, bData.y);
        breeder.hunger = Math.min(bData.hunger, 50);
        breeder.breedTimer = bData.breedTimer || (20 + Math.random() * 10);
        breeders.push(breeder);
      }
    }

    // Restore feeders
    if (saveData.feeders) {
      for (const fData of saveData.feeders) {
        const feeder = new Feeder(fData.x, fData.y);
        feeder.dropTimer = fData.dropTimer || (15 + Math.random() * 5);
        feeders.push(feeder);
      }
    }

    // Restore starcatchers
    if (saveData.starcatchers) {
      for (const sData of saveData.starcatchers) {
        const starcatcher = new Starcatcher(sData.x, 0);
        starcatcher.hunger = Math.min(sData.hunger || 0, 50);
        starcatcher.coinTimer = sData.coinTimer || 12;
        starcatchers.push(starcatcher);
      }
    }

    // Migrate legacy guppycrunchers to crabs
    if (saveData.guppycrunchers) {
      for (const gcData of saveData.guppycrunchers) {
        const crab = new Crab();
        crab.x = gcData.x;
        crab.hunger = Math.min(gcData.hunger || 0, 50);
        crab.coinTimer = gcData.coinTimer || 15;
        crabs.push(crab);
      }
    }

    // Restore beetlemunchers
    if (saveData.beetlemunchers) {
      for (const bmData of saveData.beetlemunchers) {
        const bm = new Beetlemuncher(bmData.x, bmData.y);
        bm.hunger = Math.min(bmData.hunger || 0, 50);
        bm.coinTimer = bmData.coinTimer || 20;
        beetlemunchers.push(bm);
      }
    }

    // Migrate legacy ultravores to mobiuses
    if (saveData.ultravores) {
      for (const uvData of saveData.ultravores) {
        const mobius = new MobiusDickens(uvData.x, uvData.y);
        mobius.hunger = Math.min(uvData.hunger || 0, 50);
        mobius.coinTimer = uvData.coinTimer || 25;
        mobiuses.push(mobius);
      }
    }

    // Restore Nikos (seahorse pets)
    if (saveData.nikos) {
      for (const nData of saveData.nikos) {
        const niko = new Niko(nData.x, nData.y);
        niko.pearlTimer = nData.pearlTimer || 40;
        nikos.push(niko);
      }
    }

    // Restore Zorfs (alien pets)
    if (saveData.zorfs) {
      for (const zData of saveData.zorfs) {
        const zorf = new Zorf(zData.x, zData.y);
        zorf.dropTimer = zData.dropTimer || 8;
        zorfs.push(zorf);
      }
    }

    // Restore Itchys (swordfish pets)
    if (saveData.itchys) {
      for (const iData of saveData.itchys) {
        const itchy = new Itchy(iData.x, iData.y);
        itchys.push(itchy);
      }
    }

    // Restore Clydes (jellyfish pets)
    if (saveData.clydes) {
      for (const cData of saveData.clydes) {
        const clyde = new Clyde(cData.x, cData.y);
        clydes.push(clyde);
      }
    }

    // Restore Angie (angel fish pet)
    if (saveData.angie) {
      angie = new Angie(saveData.angie.x, saveData.angie.y);
    }

    // Restore Phase 18 fish - Wardens
    if (saveData.wardens) {
      for (const wData of saveData.wardens) {
        wardens.push(new WardenLamprey(wData.x, wData.y));
      }
    }

    // Restore Seekers
    if (saveData.seekers) {
      for (const sData of saveData.seekers) {
        seekers.push(new Seeker(sData.x, sData.y));
      }
    }

    // Restore Anemones
    if (saveData.anemones) {
      for (const aData of saveData.anemones) {
        anemones.push(new Anemone(aData.x, aData.y));
      }
    }

    // Restore Geotles
    if (saveData.geotles) {
      for (const gData of saveData.geotles) {
        const geotle = new Geotle(gData.x, gData.y);
        geotle.hunger = Math.min(gData.hunger || 0, 50);
        geotle.spawnTimer = gData.spawnTimer || 25;
        geotles.push(geotle);
      }
    }

    // Restore new sprite-based arrays
    if (saveData.trouts) {
      for (const tData of saveData.trouts) {
        const trout = new Trout(tData.x, tData.y);
        trout.hunger = Math.min(tData.hunger || 0, 50);
        trouts.push(trout);
      }
    }

    if (saveData.skellfins) {
      for (const sData of saveData.skellfins) {
        const skellfin = new Skellfin(sData.x, sData.y);
        skellfin.hunger = Math.min(sData.hunger || 0, 50);
        skellfins.push(skellfin);
      }
    }

    if (saveData.mobiuses) {
      for (const mData of saveData.mobiuses) {
        const mobius = new MobiusDickens(mData.x, mData.y);
        mobius.hunger = Math.min(mData.hunger || 0, 50);
        mobiuses.push(mobius);
      }
    }

    if (saveData.crabs) {
      for (const cData of saveData.crabs) {
        const crab = new Crab();
        crab.x = cData.x;
        crab.hunger = Math.min(cData.hunger || 0, 50);
        crab.coinTimer = cData.coinTimer || 15;
        crabs.push(crab);
      }
    }

    // Update all pet buttons
    updateAllPetButtons();

    console.log('Game loaded!');
    return true;
  } catch (e) {
    console.log('Failed to load game:', e);
    return false;
  }
}

function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
  console.log('Save deleted!');
}

// Auto-save every 30 seconds
setInterval(saveGame, 30000);

// ============================================
// Coin Configuration
// ============================================
const COIN_TYPES = {
  silver: {
    value: 15,
    color: '#c0c0c0',
    size: 12,
    label: '$15'
  },
  gold: {
    value: 35,
    color: '#ffd700',
    size: 14,
    label: '$35'
  },
  diamond: {
    value: 200,
    color: '#b9f2ff',
    size: 16,
    label: '$200'
  },
  star: {
    value: 40,
    color: '#ffff00',
    size: 18,
    label: '$40',
    floatsUp: true  // Stars float upward instead of sinking
  },
  pearl: {
    value: 500,
    color: '#faf0e6',  // Creamy white
    size: 14,
    label: '$500'
  },
  treasure: {
    value: 2000,
    color: '#8b4513',  // Saddle brown
    size: 20,
    label: '$2000'
  }
};

// ============================================
// Fish Coin Drop Configuration (No Evolution)
// ============================================
// Each fish has fixed coin drops based on species, no evolution stages


// ============================================
// Initialize Fish Module Context
// ============================================
// The fish classes need access to shared game state
setGameContext({
  tankManager,
  imageCache,
  arrays: {
    coins,
    pellets,
    trouts,
    skellfins,
    anemones,
    breeders,
    feeders,
    starcatchers,
    beetlemunchers,
    crabs,
    geotles,
    beetles
  },
  Coin,
  Pellet,
  getAlien: () => alien,
  sound,
  spawnParticles,
  stats,
  findNearest,
  getPrestigeBonus,
  getGold: () => gold,
  setGold: (amount) => { gold = amount; },
  addGold: (amount) => { gold += amount; },
  getTotalEarned: () => totalEarned,
  addTotalEarned: (amount) => { totalEarned += amount; },
  updateGoldDisplay
});

// ============================================
// Initialize Aliens Module Context
// ============================================
setAlienContext({
  tankManager,
  sound,
  spawnParticles,
  stats,
  getAngie: () => angie,
  arrays: {
    coins,
    pellets,
    trouts,
    skellfins,
    mobiuses,
    breeders,
    starcatchers,
    crabs,
    beetlemunchers,
    geotles
  },
  Coin
});


// ============================================
// Initialize Collectibles Module Context
// ============================================
setCollectiblesContext({
  tankManager,
  foodUpgraded,
  COIN_TYPES
});

// ============================================
// Initialize Pets Module Context
// ============================================
// Note: This will be called again after hasActiveAlien is defined
let petsContextInitialized = false;

function initPetsContext() {
  if (petsContextInitialized) return;
  setPetsContext({
    tankManager,
    coins,
    aliens,
    pellets,
    getGold: () => gold,
    addGold: (amount) => { gold += amount; },
    addTotalEarned: (amount) => { totalEarned += amount; },
    sound,
    spawnParticles,
    updateGoldDisplay,
    findNearest,
    hasActiveAlien: () => aliens.some(a => !a.dead && !a.entering)
  });
  petsContextInitialized = true;
}

// ============================================
// Alien System Helper Functions
// ============================================
function findNearestAlien(x, y) {
  return findNearest({ x, y }, aliens, {
    filter: a => !a.dead && !a.entering
  });
}

function hasActiveAlien() {
  return aliens.some(a => !a.dead && !a.entering);
}

// ============================================
// Pet System Helper Functions
// ============================================
function getPetCount() {
  return stinkies.length + nikos.length + zorfs.length +
         itchys.length + clydes.length + (angie ? 1 : 0);
}

function canBuyPet() {
  return getPetCount() < MAX_PETS;
}

function updatePetCounter() {
  const counter = document.getElementById('petCounter');
  if (counter) {
    counter.textContent = `Pets: ${getPetCount()}/${MAX_PETS}`;
  }
}

function updateAllPetButtons() {
  updatePetCounter();
  updateStinkyButtonState();
  updateNikoButtonState();
  updateZorfButtonState();
  updateItchyButtonState();
  updateClydeButtonState();
  updateAngieButtonState();
}

function updateNikoButtonState() {
  const btn = document.getElementById('buyNikoBtn');
  if (btn) {
    btn.disabled = !canBuyPet() || gold < NIKO_COST;
  }
}

function updateZorfButtonState() {
  const btn = document.getElementById('buyZorfBtn');
  if (btn) {
    btn.disabled = !canBuyPet() || gold < ZORF_COST;
  }
}

function updateItchyButtonState() {
  const btn = document.getElementById('buyItchyBtn');
  if (btn) {
    btn.disabled = !canBuyPet() || gold < ITCHY_COST;
  }
}

function updateClydeButtonState() {
  const btn = document.getElementById('buyClydeBtn');
  if (btn) {
    btn.disabled = !canBuyPet() || gold < CLYDE_COST;
  }
}

function updateAngieButtonState() {
  const btn = document.getElementById('buyAngieBtn');
  if (btn) {
    // Angie is unique - can only have one
    btn.disabled = angie !== null || !canBuyPet() || gold < ANGIE_COST;
    if (angie) {
      btn.textContent = 'Angie (Owned)';
    }
  }
}

// ============================================
// Quality of Life Helper Functions
// ============================================

function getTotalFishCount() {
  return trouts.length + skellfins.length + mobiuses.length + crabs.length +
         breeders.length + feeders.length + starcatchers.length +
         beetlemunchers.length + wardens.length + seekers.length +
         anemones.length + geotles.length;
}

function getPrestigeBonus(type) {
  switch (type) {
    case 'gold': return 1 + (prestigeLevel * PRESTIGE.goldBonus);
    case 'speed': return 1 + (prestigeLevel * PRESTIGE.speedBonus);
    case 'coinDrop': return 1 + (prestigeLevel * PRESTIGE.coinRateBonus);
    default: return 1;
  }
}

function checkAchievements() {
  // First Fish
  if (!unlockedAchievements.has('first_fish') && stats.fishBought >= 1) {
    unlockAchievement('first_fish');
  }

  // First Carnivore (Skellfin)
  if (!unlockedAchievements.has('first_carnivore') && skellfins.length > 0) {
    unlockAchievement('first_carnivore');
  }

  // Alien Slayer
  if (!unlockedAchievements.has('alien_slayer') && stats.aliensDefeated >= 10) {
    unlockAchievement('alien_slayer');
  }

  // Millionaire
  if (!unlockedAchievements.has('millionaire') && stats.totalEarned >= 100000) {
    unlockAchievement('millionaire');
  }

  // Full Tank
  if (!unlockedAchievements.has('full_tank') && getTotalFishCount() >= 20) {
    unlockAchievement('full_tank');
  }

  // Pet Lover - all 6 pet types owned
  const hasPets = stinkies.length > 0 && nikos.length > 0 && zorfs.length > 0 &&
                  itchys.length > 0 && clydes.length > 0 && angie !== null;
  if (!unlockedAchievements.has('pet_lover') && hasPets) {
    unlockAchievement('pet_lover');
  }

  // Survivor - 30 minutes of play time
  if (!unlockedAchievements.has('survivor') && stats.timePlayed >= 1800) {
    unlockAchievement('survivor');
  }
}

function unlockAchievement(id) {
  if (unlockedAchievements.has(id)) return;

  unlockedAchievements.add(id);
  ACHIEVEMENTS[id].unlocked = true;

  // Show popup notification
  achievementPopup = {
    name: ACHIEVEMENTS[id].name,
    desc: ACHIEVEMENTS[id].desc,
    timer: 3  // Display for 3 seconds
  };

  sound.play('victory');
}

function toggleSpeed() {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  const btn = document.getElementById('speedBtn');
  if (btn) {
    btn.textContent = `Speed: ${gameSpeed}x`;
    btn.classList.toggle('active', gameSpeed === 2);
  }
}

function toggleStats() {
  statsVisible = !statsVisible;
  const btn = document.getElementById('statsBtn');
  if (btn) {
    btn.classList.toggle('active', statsVisible);
  }
}

function buyAutoCollect() {
  if (!autoCollectUpgraded && gold >= AUTO_COLLECT_COST) {
    gold -= AUTO_COLLECT_COST;
    autoCollectUpgraded = true;
    sound.play('buy');
    updateGoldDisplay();
    updateAutoCollectButtonState();
  }
}

function updateAutoCollectButtonState() {
  const btn = document.getElementById('buyAutoCollectBtn');
  if (btn && autoCollectUpgraded) {
    btn.disabled = true;
    btn.textContent = 'Auto-Collect!';
  }
}

function doPrestige() {
  if (totalEarned < PRESTIGE_THRESHOLD) return;
  if (!confirm(`Prestige and reset? You'll gain ${Math.floor(totalEarned / 10000)} prestige points and permanent bonuses!`)) return;

  // Calculate prestige points earned
  const pointsEarned = Math.floor(totalEarned / 10000);
  prestigePoints += pointsEarned;
  prestigeLevel++;

  // Clear all fish arrays
  trouts.length = 0;
  skellfins.length = 0;
  mobiuses.length = 0;
  crabs.length = 0;
  breeders.length = 0;
  feeders.length = 0;
  starcatchers.length = 0;
  beetlemunchers.length = 0;
  wardens.length = 0;
  seekers.length = 0;
  anemones.length = 0;
  geotles.length = 0;

  // Clear pets
  stinkies.length = 0;
  nikos.length = 0;
  zorfs.length = 0;
  itchys.length = 0;
  clydes.length = 0;
  angie = null;

  // Clear items
  pellets.length = 0;
  coins.length = 0;
  beetles.length = 0;
  particles.length = 0;

  // Clear aliens
  aliens.length = 0;
  alien = null;
  missiles.length = 0;

  // Reset upgrades
  foodUpgraded = false;
  laserUpgraded = false;
  autoCollectUpgraded = false;

  // Reset gold with prestige bonus
  const baseGold = 100;
  gold = Math.floor(baseGold * getPrestigeBonus('gold'));
  totalEarned = 0;

  // Reset alien timer
  alienSpawnTimer = 60 + Math.random() * 30;
  alienWarningActive = false;

  // Spawn 2 starter fish
  for (let i = 0; i < 2; i++) {
    const pos = tankManager.getRandomPosition();
    trouts.push(new Trout(pos.x, pos.y));
  }

  // Update UI
  updateGoldDisplay();
  updateFoodButtonState();
  updateLaserButtonState();
  updateAutoCollectButtonState();
  updateAllPetButtons();
  updatePrestigeButtonState();

  // Reset button states
  const foodBtn = document.getElementById('upgradeFoodBtn');
  if (foodBtn) {
    foodBtn.disabled = false;
    foodBtn.textContent = 'Food+ ($200)';
  }
  const laserBtn = document.getElementById('buyLaserBtn');
  if (laserBtn) {
    laserBtn.disabled = false;
    laserBtn.textContent = 'Laser ($300)';
  }
  const autoBtn = document.getElementById('buyAutoCollectBtn');
  if (autoBtn) {
    autoBtn.disabled = false;
    autoBtn.textContent = 'Auto-Collect ($1000)';
  }

  sound.play('evolve');
  saveGame();
}

function updatePrestigeButtonState() {
  const btn = document.getElementById('prestigeBtn');
  if (btn) {
    btn.style.display = totalEarned >= PRESTIGE_THRESHOLD ? 'inline-block' : 'none';
    btn.textContent = `Prestige (${Math.floor(totalEarned / 10000)} pts)`;
  }
}

// Expose new functions globally
window.toggleSpeed = toggleSpeed;
window.toggleStats = toggleStats;
window.buyAutoCollect = buyAutoCollect;
window.doPrestige = doPrestige;

// ============================================
// Input Handling
// ============================================
canvas.addEventListener('click', (e) => {
  // Initialize sound on first click (required by browsers)
  sound.init();

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // COMBAT MODE: If any alien present, clicks damage aliens/missiles instead of feeding
  const inCombat = aliens.length > 0 || (alien && !alien.dead);
  if (inCombat) {
    let hitSomething = false;

    // Check missiles first (can shoot them down)
    for (let i = missiles.length - 1; i >= 0; i--) {
      if (missiles[i].isClicked(x, y)) {
        const damage = laserUpgraded ? 3 : 1;
        for (let d = 0; d < damage; d++) {
          missiles[i].takeDamage();
        }
        sound.play('hit');
        spawnParticles(x, y, 'sparkle', 5);
        hitSomething = true;
        break;
      }
    }

    // Check all aliens
    if (!hitSomething) {
      for (const a of aliens) {
        if (a.dead) continue;
        if (a.isClicked(x, y)) {
          const damage = laserUpgraded ? 3 : 1;
          for (let d = 0; d < damage; d++) {
            a.takeDamage();
          }
          sound.play('hit');
          spawnParticles(x, y, 'blood', laserUpgraded ? 15 : 8);
          hitSomething = true;
          break;
        }
      }
    }

    // Still allow coin collection during combat (with auto-collect if upgraded)
    let collectedCombat = false;
    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      const dx = coin.x - x;
      const dy = coin.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inRange = autoCollectUpgraded ? dist < AUTO_COLLECT_RADIUS : coin.isClicked(x, y);
      if (inRange) {
        gold += coin.value;
        totalEarned += coin.value;
        stats.totalEarned += coin.value;
        stats.coinsCollected++;
        coin.collected = true;
        sound.play('coin');
        spawnParticles(coin.x, coin.y, 'coin_sparkle', 8);
        collectedCombat = true;
      }
    }
    if (collectedCombat) {
      updateGoldDisplay();
    }
    return; // No food dropping during combat!
  }

  // Check for coin collection (with auto-collect radius if upgraded)
  let collectedAnything = false;
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    const dx = coin.x - x;
    const dy = coin.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Collect if clicked directly OR within auto-collect radius
    const inRange = autoCollectUpgraded ? dist < AUTO_COLLECT_RADIUS : coin.isClicked(x, y);
    if (inRange) {
      gold += coin.value;
      totalEarned += coin.value;
      stats.totalEarned += coin.value;
      stats.coinsCollected++;
      coin.collected = true;
      sound.play('coin');
      spawnParticles(coin.x, coin.y, 'coin_sparkle', 8);
      collectedAnything = true;
    }
  }

  // Check for beetle collection (with auto-collect radius if upgraded)
  for (let i = beetles.length - 1; i >= 0; i--) {
    const beetle = beetles[i];
    const dx = beetle.x - x;
    const dy = beetle.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const inRange = autoCollectUpgraded ? dist < AUTO_COLLECT_RADIUS : beetle.isClicked(x, y);
    if (inRange) {
      gold += BEETLE_VALUE;
      totalEarned += BEETLE_VALUE;
      stats.totalEarned += BEETLE_VALUE;
      stats.coinsCollected++;
      beetle.collected = true;
      sound.play('coin');
      spawnParticles(beetle.x, beetle.y, 'coin_sparkle', 6);
      collectedAnything = true;
    }
  }

  if (collectedAnything) {
    updateGoldDisplay();
    return; // Don't spawn pellet when collecting
  }

  // Spawn pellet if enough gold
  if (gold >= PELLET_COST) {
    gold -= PELLET_COST;
    pellets.push(new Pellet(x, y));
    sound.play('feed');
    spawnParticles(x, y, 'bubble', 3);
    updateGoldDisplay();
  }
});

function updateGoldDisplay() {
  goldDisplay.textContent = gold;
}

// ============================================
// Shop Functions
// ============================================

/**
 * Generic fish purchase helper
 * @param {Function} FishClass - The fish class to instantiate
 * @param {Array} targetArray - The array to add the fish to
 * @param {number} cost - The cost of the fish
 * @param {boolean} useRandomPos - Whether to spawn at random position (default true)
 * @returns {boolean} Whether the purchase was successful
 */
function buyFishHelper(FishClass, targetArray, cost, useRandomPos = true) {
  if (gold < cost) return false;
  gold -= cost;
  if (useRandomPos) {
    const pos = tankManager.getRandomPosition();
    targetArray.push(new FishClass(pos.x, pos.y));
  } else {
    targetArray.push(new FishClass());
  }
  stats.fishBought++;
  sound.play('buy');
  updateGoldDisplay();
  return true;
}

/**
 * Generic pet purchase helper
 * @param {Function} PetClass - The pet class to instantiate
 * @param {Array} targetArray - The array to add the pet to
 * @param {number} cost - The cost of the pet
 * @returns {boolean} Whether the purchase was successful
 */
function buyPetHelper(PetClass, targetArray, cost) {
  if (gold < cost || !canBuyPet()) return false;
  gold -= cost;
  const pos = tankManager.getRandomPosition();
  targetArray.push(new PetClass(pos.x, pos.y));
  sound.play('buy');
  updateGoldDisplay();
  updateAllPetButtons();
  return true;
}

function buyTrout() {
  buyFishHelper(Trout, trouts, TROUT_COST);
}

function upgradeFood() {
  if (!foodUpgraded && gold >= FOOD_UPGRADE_COST) {
    gold -= FOOD_UPGRADE_COST;
    foodUpgraded = true;
    updateFoodUpgradedStatus(true); // Update collectibles module
    sound.play('buy');
    updateGoldDisplay();
    updateFoodButtonState();
  }
}

function updateFoodButtonState() {
  const btn = document.getElementById('upgradeFoodBtn');
  if (btn && foodUpgraded) {
    btn.disabled = true;
    btn.textContent = 'Food Upgraded!';
  }
}

function buySkellfin() {
  buyFishHelper(Skellfin, skellfins, SKELLFIN_COST);
}

function getStinkyCost() {
  // $500 base + $250 for each owned
  return STINKY_COST + (stinkies.length * 250);
}

function buyStinky() {
  const cost = getStinkyCost();
  if (gold >= cost && canBuyPet()) {
    gold -= cost;
    stinkies.push(new Stinky());
    sound.play('buy');
    updateGoldDisplay();
    updateAllPetButtons();
  }
}

function updateStinkyButtonState() {
  const btn = document.getElementById('buyStinkyBtn');
  if (btn) {
    const cost = getStinkyCost();
    btn.textContent = `Stinky ($${cost})`;
    if (stinkies.length > 0) {
      btn.textContent = `Stinky x${stinkies.length + 1} ($${cost})`;
    }
    btn.disabled = !canBuyPet() || gold < cost;
  }
}

function buyBreeder() {
  buyFishHelper(Breeder, breeders, BREEDER_COST);
}

function buyLaser() {
  if (!laserUpgraded && gold >= LASER_COST) {
    gold -= LASER_COST;
    laserUpgraded = true;
    sound.play('buy');
    updateGoldDisplay();
    updateLaserButtonState();
  }
}

function buyFeeder() {
  buyFishHelper(Feeder, feeders, FEEDER_COST);
}

function buyStarcatcher() {
  buyFishHelper(Starcatcher, starcatchers, STARCATCHER_COST);
}

function buyCrab() {
  buyFishHelper(Crab, crabs, CRAB_COST, false);
}

function buyBeetlemuncher() {
  buyFishHelper(Beetlemuncher, beetlemunchers, BEETLEMUNCHER_COST);
}

function buyMobius() {
  buyFishHelper(MobiusDickens, mobiuses, MOBIUS_COST);
}

function buyWarden() {
  buyFishHelper(WardenLamprey, wardens, WARDEN_COST);
}

function buySeeker() {
  buyFishHelper(Seeker, seekers, SEEKER_COST);
}

function buyAnemone() {
  buyFishHelper(Anemone, anemones, ANEMONE_COST);
}

function buyGeotle() {
  buyFishHelper(Geotle, geotles, GEOTLE_COST);
}

function buyNiko() {
  buyPetHelper(Niko, nikos, NIKO_COST);
}

function buyZorf() {
  buyPetHelper(Zorf, zorfs, ZORF_COST);
}

function buyItchy() {
  buyPetHelper(Itchy, itchys, ITCHY_COST);
}

function buyClyde() {
  buyPetHelper(Clyde, clydes, CLYDE_COST);
}

function buyAngie() {
  if (gold >= ANGIE_COST && canBuyPet() && !angie) {
    gold -= ANGIE_COST;
    const pos = tankManager.getRandomPosition();
    angie = new Angie(pos.x, pos.y);
    sound.play('buy');
    updateGoldDisplay();
    updateAllPetButtons();
  }
}

function updateLaserButtonState() {
  const btn = document.getElementById('buyLaserBtn');
  if (btn && laserUpgraded) {
    btn.disabled = true;
    btn.textContent = 'Laser Active!';
  }
}

function toggleSound() {
  sound.enabled = !sound.enabled;
  const btn = document.getElementById('soundBtn');
  if (btn) {
    btn.textContent = sound.enabled ? 'Sound: ON' : 'Sound: OFF';
    btn.classList.toggle('active', sound.enabled);
  }
}

function newGame() {
  if (confirm('Start a new game? Your current progress will be lost!')) {
    deleteSave();
    location.reload();
  }
}

// Expose functions globally for HTML buttons
window.buyTrout = buyTrout;
window.upgradeFood = upgradeFood;
window.buySkellfin = buySkellfin;
window.buyStinky = buyStinky;
window.buyBreeder = buyBreeder;
window.buyLaser = buyLaser;
window.buyFeeder = buyFeeder;
window.buyStarcatcher = buyStarcatcher;
window.buyCrab = buyCrab;
window.buyBeetlemuncher = buyBeetlemuncher;
window.buyMobius = buyMobius;
window.buyWarden = buyWarden;
window.buySeeker = buySeeker;
window.buyAnemone = buyAnemone;
window.buyGeotle = buyGeotle;
window.buyNiko = buyNiko;
window.buyZorf = buyZorf;
window.buyItchy = buyItchy;
window.buyClyde = buyClyde;
window.buyAngie = buyAngie;
window.toggleSound = toggleSound;
window.saveGame = saveGame;
window.newGame = newGame;

// ============================================
// Game Initialization
// ============================================
async function init() {
  // Preload fish sprites
  console.log('Loading fish sprites...');
  await preloadFishImages();
  console.log('Fish sprites loaded!');

  // Initialize pets module context
  initPetsContext();

  // Try to load saved game
  const loaded = loadGame();

  // If no save, spawn 2 free fish (use Trout for new games)
  if (!loaded) {
    for (let i = 0; i < 2; i++) {
      const pos = tankManager.getRandomPosition();
      trouts.push(new Trout(pos.x, pos.y));
    }
    updateAllPetButtons();
  }
}

// ============================================
// Game Loop
// ============================================
let lastTime = 0;

function gameLoop(timestamp) {
  const rawDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Apply game speed (but NOT to alien spawn timer for balance)
  const dt = rawDt * gameSpeed;

  // Track time played (use raw time, not sped up)
  stats.timePlayed += rawDt;

  // Check achievements periodically (every 1 second of real time)
  achievementCheckTimer += rawDt;
  if (achievementCheckTimer >= 1) {
    achievementCheckTimer = 0;
    checkAchievements();
  }

  // Update achievement popup timer
  if (achievementPopup) {
    achievementPopup.timer -= rawDt;
    if (achievementPopup.timer <= 0) {
      achievementPopup = null;
    }
  }

  // Update prestige button visibility
  updatePrestigeButtonState();

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Alien spawn timer with warning system (uses rawDt to keep balanced)
  const hasFish = trouts.length > 0 || skellfins.length > 0 || mobiuses.length > 0 ||
                  crabs.length > 0 || breeders.length > 0 || geotles.length > 0 ||
                  starcatchers.length > 0;

  const noActiveAliens = !alien && aliens.length === 0;

  if (noActiveAliens && hasFish) {
    if (alienWarningActive) {
      // Warning countdown active (use rawDt for balance)
      alienWarningTimer -= rawDt;
      if (alienWarningTimer <= 0) {
        // Spawn alien(s)!
        spawnAlien();
        alienWarningActive = false;
        showAlienWarning();
      }
    } else {
      // Main spawn timer (use rawDt for balance)
      alienSpawnTimer -= rawDt;
      if (alienSpawnTimer <= 0) {
        // Start warning phase
        alienWarningActive = true;
        alienWarningTimer = ALIEN_WARNING_DURATION;
        sound.play('alien');  // Warning sound
        showBossWarning();
      }
    }
  }

  // ============================================
  // EntityManager handles all entity updates and draws
  // Replaces ~250 lines of repetitive loops
  // ============================================
  entityManager.updateAll(dt);

  // Handle Angie singleton (not in array)
  if (angie) {
    angie.update(dt);
  }

  // Draw all entities in layer order
  entityManager.drawAll(ctx);

  // Draw Angie on top of other pets
  if (angie) {
    angie.draw(ctx);
  }

  // Legacy single alien compatibility
  if (alien && alien.dead) {
    alien = null;
  }
  if (aliens.length === 0 && alien === null) {
    hideAlienWarning();
  }

  // Spawn ambient bubbles occasionally
  if (Math.random() < 0.02) {
    const x = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    const y = tankManager.bounds.bottom - tankManager.padding;
    spawnParticles(x, y, 'bubble', 1);
  }

  // Draw warning countdown if active
  if (alienWarningActive) {
    drawWarningCountdown();
  }

  // Draw combat mode overlay if aliens present
  const activeAliens = aliens.filter(a => !a.dead && !a.entering);
  if (activeAliens.length > 0) {
    drawCombatOverlay();
  }

  // Draw fish counter UI
  drawFishCounterUI();

  // Draw statistics panel if visible
  if (statsVisible) {
    drawStatsPanel();
  }

  // Draw achievement popup if active
  if (achievementPopup) {
    drawAchievementPopup();
  }

  // Draw prestige level indicator
  if (prestigeLevel > 0) {
    drawPrestigeIndicator();
  }

  requestAnimationFrame(gameLoop);
}

function drawWarningCountdown() {
  // Orange pulsing border
  ctx.strokeStyle = `rgba(255, 140, 0, ${0.5 + Math.sin(Date.now() / 150) * 0.3})`;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Countdown text
  ctx.fillStyle = '#ff8800';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`ALIEN INCOMING IN ${Math.ceil(alienWarningTimer)}...`, canvas.width / 2, 50);
}

function drawCombatOverlay() {
  // Red border flash
  ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Combat text based on alien type
  ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';

  // Find the first active alien to display info
  const firstAlien = aliens.find(a => !a.dead);
  let combatText = 'CLICK THE ALIEN TO ATTACK!';

  if (firstAlien) {
    if (firstAlien.type === 'gus') {
      combatText = 'FEED GUS PELLETS TO DEFEAT!';
    } else if (firstAlien.type === 'destructor') {
      combatText = 'SHOOT DOWN MISSILES! ATTACK THE DESTRUCTOR!';
    } else if (firstAlien.type === 'balrog') {
      combatText = 'BALROG ATTACK! NEVER GETS FULL!';
    }
  }

  ctx.fillText(combatText, canvas.width / 2, 30);

  // Show missile count if any
  if (missiles.length > 0) {
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Missiles: ${missiles.length}`, canvas.width / 2, 50);
  }
}

// ============================================
// Quality of Life UI Drawing
// ============================================

function drawFishCounterUI() {
  const fishCounts = [
    { name: 'Trout', count: trouts.length, color: '#ffa500' },
    { name: 'Skellfin', count: skellfins.length, color: '#8b0000' },
    { name: 'Mobius', count: mobiuses.length, color: '#708090' },
    { name: 'Crab', count: crabs.length, color: '#ff6347' },
    { name: 'Breeder', count: breeders.length, color: '#ff69b4' },
    { name: 'Feeder', count: feeders.length, color: '#ff8c00' },
    { name: 'Starcatcher', count: starcatchers.length, color: '#9370db' },
    { name: 'Muncher', count: beetlemunchers.length, color: '#32cd32' },
    { name: 'Warden', count: wardens.length, color: '#4a0080' },
    { name: 'Seeker', count: seekers.length, color: '#ff9800' },
    { name: 'Anemone', count: anemones.length, color: '#ff1493' },
    { name: 'Geotle', count: geotles.length, color: '#228b22' }
  ];

  // Filter to only show fish types that have been purchased
  const activeFish = fishCounts.filter(f => f.count > 0);
  if (activeFish.length === 0) return;

  // Panel dimensions
  const padding = 8;
  const lineHeight = 14;
  const panelWidth = 100;
  const panelHeight = padding * 2 + activeFish.length * lineHeight;

  // Draw semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, 70, panelWidth, panelHeight);

  // Draw border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 70, panelWidth, panelHeight);

  // Draw fish counts
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';

  activeFish.forEach((fish, i) => {
    const y = 70 + padding + (i + 1) * lineHeight - 3;
    ctx.fillStyle = fish.color;
    ctx.fillText(`${fish.name}: ${fish.count}`, 10 + padding, y);
  });
}

function drawStatsPanel() {
  const panelWidth = 300;
  const panelHeight = 280;
  const x = (canvas.width - panelWidth) / 2;
  const y = (canvas.height - panelHeight) / 2;

  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(x, y, panelWidth, panelHeight);

  // Border
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('STATISTICS', x + panelWidth / 2, y + 30);

  // Stats list
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  const statsList = [
    { label: 'Total Earned', value: `$${stats.totalEarned.toLocaleString()}` },
    { label: 'Coins Collected', value: stats.coinsCollected.toLocaleString() },
    { label: 'Fish Bought', value: stats.fishBought.toLocaleString() },
    { label: 'Fish Lost', value: stats.totalFishLost.toLocaleString() },
    { label: 'Aliens Defeated', value: stats.aliensDefeated.toLocaleString() },
    { label: 'Time Played', value: formatTime(stats.timePlayed) },
    { label: 'Current Fish', value: getTotalFishCount().toLocaleString() },
    { label: 'Current Pets', value: getPetCount().toLocaleString() }
  ];

  ctx.fillStyle = '#ffffff';
  statsList.forEach((stat, i) => {
    const lineY = y + 60 + i * 22;
    ctx.textAlign = 'left';
    ctx.fillText(stat.label + ':', x + 20, lineY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(stat.value, x + panelWidth - 20, lineY);
    ctx.fillStyle = '#ffffff';
  });

  // Achievements section
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ACHIEVEMENTS', x + panelWidth / 2, y + panelHeight - 60);

  // Achievement count
  ctx.font = '12px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${unlockedAchievements.size} / ${Object.keys(ACHIEVEMENTS).length} unlocked`, x + panelWidth / 2, y + panelHeight - 40);

  // List unlocked achievements
  ctx.textAlign = 'left';
  ctx.font = '10px Arial';
  let achY = y + panelHeight - 25;
  const unlockedList = Array.from(unlockedAchievements);
  const displayAch = unlockedList.slice(0, 3);  // Show up to 3
  displayAch.forEach((id, i) => {
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`★ ${ACHIEVEMENTS[id].name}`, x + 20 + (i * 95), achY);
  });

  // Click to close hint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Click Stats button to close', x + panelWidth / 2, y + panelHeight - 8);
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function drawAchievementPopup() {
  const popupWidth = 250;
  const popupHeight = 60;
  const x = (canvas.width - popupWidth) / 2;
  const y = 80;

  // Animated entrance
  const progress = Math.min(1, (3 - achievementPopup.timer) / 0.3);
  const slideY = y - 30 + progress * 30;

  // Gold background with glow
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'linear-gradient(180deg, #ffd700 0%, #ff8c00 100%)';
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(x, slideY, popupWidth, popupHeight);
  ctx.shadowBlur = 0;

  // Dark border
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, slideY, popupWidth, popupHeight);

  // Star icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('★', x + 15, slideY + 38);

  // Achievement text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('ACHIEVEMENT UNLOCKED!', x + 50, slideY + 22);

  ctx.font = '12px Arial';
  ctx.fillText(achievementPopup.name, x + 50, slideY + 42);
}

function drawPrestigeIndicator() {
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`★ Prestige ${prestigeLevel}`, canvas.width - 15, 85);

  if (prestigeLevel > 0) {
    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    ctx.fillText(`+${prestigeLevel * 10}% gold, +${prestigeLevel * 5}% speed`, canvas.width - 15, 98);
  }
}

function spawnAlien() {
  // Pick random alien type
  const alienTypes = ['sylvester', 'balrog', 'gus', 'destructor'];
  const type = alienTypes[Math.floor(Math.random() * alienTypes.length)];

  let newAlien;
  switch (type) {
    case 'balrog':
      newAlien = new Balrog();
      break;
    case 'gus':
      newAlien = new Gus();
      break;
    case 'destructor':
      newAlien = new Destructor();
      break;
    default:
      newAlien = new Sylvester();
  }

  // Use the legacy single alien variable for backward compatibility
  alien = newAlien;
  aliens.push(newAlien);

  // Spawn second alien if wave mode (total earned > $10,000)
  if (totalEarned >= WAVE_THRESHOLD) {
    const type2 = alienTypes[Math.floor(Math.random() * alienTypes.length)];
    let secondAlien;
    switch (type2) {
      case 'balrog':
        secondAlien = new Balrog();
        break;
      case 'gus':
        secondAlien = new Gus();
        break;
      case 'destructor':
        secondAlien = new Destructor();
        break;
      default:
        secondAlien = new Sylvester();
    }
    aliens.push(secondAlien);
  }

  // Reset spawn timer for next wave
  alienSpawnTimer = ALIEN_SPAWN_MIN + Math.random() * (ALIEN_SPAWN_MAX - ALIEN_SPAWN_MIN);
}

function showBossWarning() {
  const warning = document.getElementById('alienWarning');
  if (warning) {
    warning.textContent = 'ALIEN INCOMING!';
    warning.style.display = 'block';
    warning.style.background = 'linear-gradient(180deg, #ff8800 0%, #ff4400 100%)';
  }
}

function showAlienWarning() {
  const warning = document.getElementById('alienWarning');
  if (warning) {
    warning.textContent = 'ALIEN ATTACK! Click to fight!';
    warning.style.display = 'block';
    warning.style.background = 'linear-gradient(180deg, #8b0000 0%, #4a0000 100%)';
  }
}

function hideAlienWarning() {
  const warning = document.getElementById('alienWarning');
  if (warning) warning.style.display = 'none';
}

// ============================================
// Debug Commands (for development/testing)
// Access via browser console: game.debug.*
// ============================================
window.game = {
  debug: {
    // Economy
    setGold: (amount) => { gold = amount; updateGoldDisplay(); console.log(`Gold set to $${amount}`); },
    addGold: (amount) => { gold += amount; updateGoldDisplay(); console.log(`Added $${amount}, now $${gold}`); },

    // Spawning
    spawnAlien: (type = 'random') => {
      const types = ['sylvester', 'balrog', 'gus', 'destructor'];
      const chosen = type === 'random' ? types[Math.floor(Math.random() * types.length)] : type;
      let newAlien;
      switch(chosen) {
        case 'balrog': newAlien = new Balrog(); break;
        case 'gus': newAlien = new Gus(); break;
        case 'destructor': newAlien = new Destructor(); break;
        default: newAlien = new Sylvester();
      }
      aliens.push(newAlien);
      showAlienWarning();
      console.log(`Spawned ${chosen}`);
    },
    spawnTrout: (count = 1) => {
      for (let i = 0; i < count; i++) trouts.push(new Trout());
      console.log(`Spawned ${count} trout(s)`);
    },
    spawnSkellfin: (count = 1) => {
      for (let i = 0; i < count; i++) skellfins.push(new Skellfin());
      console.log(`Spawned ${count} skellfin(s)`);
    },
    spawnMobius: (count = 1) => {
      for (let i = 0; i < count; i++) mobiuses.push(new MobiusDickens());
      console.log(`Spawned ${count} mobius(es)`);
    },

    // Killing
    killAllAliens: () => {
      const count = aliens.length;
      aliens.forEach(a => a.health = 0);
      console.log(`Killed ${count} alien(s)`);
    },
    killAllFish: () => {
      const count = trouts.length + skellfins.length + mobiuses.length + crabs.length;
      trouts.length = 0;
      skellfins.length = 0;
      mobiuses.length = 0;
      crabs.length = 0;
      console.log(`Killed ${count} fish`);
    },

    // Game state
    setSpeed: (speed) => { gameSpeed = speed; console.log(`Game speed set to ${speed}x`); },
    resetAlienTimer: () => { alienSpawnTimer = 5; console.log('Alien spawning in 5 seconds'); },
    skipToWave: () => { totalEarned = 10000; console.log('Total earned set to $10,000 (wave mode)'); },

    // Info
    status: () => {
      console.log('=== Game Status ===');
      console.log(`Gold: $${gold}`);
      console.log(`Trouts: ${trouts.length}, Skellfins: ${skellfins.length}, Mobiuses: ${mobiuses.length}`);
      console.log(`Crabs: ${crabs.length}, Wardens: ${wardens.length}, Seekers: ${seekers.length}`);
      console.log(`Aliens: ${aliens.length}, Missiles: ${missiles.length}`);
      console.log(`Total Earned: $${totalEarned}`);
      console.log(`Game Speed: ${gameSpeed}x`);
      console.log(`Prestige Level: ${prestigeLevel}`);
    },

    // Unlocks
    unlockAll: () => {
      gold = 100000;
      foodUpgraded = true;
      updateFoodUpgradedStatus(true); // Update collectibles module
      laserUpgraded = true;
      autoCollectUpgraded = true;
      updateGoldDisplay();
      console.log('Unlocked all upgrades, set gold to $100,000');
    },

    // Save management
    clearSave: () => { deleteSave(); console.log('Save deleted. Refresh to start fresh.'); }
  },

  // Direct access to game state (read-only intended)
  state: {
    get gold() { return gold; },
    get trouts() { return trouts; },
    get skellfins() { return skellfins; },
    get aliens() { return aliens; },
    get totalEarned() { return totalEarned; },
    get stats() { return stats; }
  }
};

console.log('Gigaquarium Debug: Access via game.debug.* (try game.debug.status())');

// Start the game
init().then(() => {
  requestAnimationFrame(gameLoop);
});
