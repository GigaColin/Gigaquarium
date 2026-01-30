// Gigaquarium - Main Game File

import { FISH_SPECIES, SIZE_CONFIG, RARITY_COLORS } from './fishData.js';

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
// Game State
// ============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const goldDisplay = document.getElementById('goldAmount');

const tankManager = new TankManager(canvas);

let gold = 100;
const pellets = [];
const guppies = [];
const carnivores = [];
const coins = [];

const PELLET_COST = 5;
const FOOD_UPGRADE_COST = 200;
const LASER_COST = 300;
const STINKY_COST = 500;
const BEETLE_VALUE = 150;
const PEARL_VALUE = 500;

// Legacy fish costs (for backward compatibility - shop still uses these names)
const GUPPY_COST = 100;
const CARNIVORE_COST = 1000;
const BREEDER_COST = 750;
const FEEDER_COST = 1500;
const STARCATCHER_COST = 1200;
const GUPPYCRUNCHER_COST = 800;
const BEETLEMUNCHER_COST = 1000;
const ULTRAVORE_COST = 5000;

// Fish costs from fishData.js
const TROUT_COST = FISH_SPECIES.trout.cost;           // $100
const SKELLFIN_COST = FISH_SPECIES.skellfin.cost;     // $2500
const MOBIUS_COST = FISH_SPECIES.mobius_dickens.cost; // $8000
const CRAB_COST = FISH_SPECIES.crab.cost;             // $800
const WARDEN_COST = FISH_SPECIES.warden_lamprey.cost; // $2000
const SEEKER_COST = FISH_SPECIES.seeker.cost;         // $5000
const ANEMONE_COST = FISH_SPECIES.anemone.cost;       // $5000
const GEOTLE_COST = FISH_SPECIES.geotle.cost;         // $4000

// Legacy STAGES constant for backward compatibility with old saves
const STAGES = {
  small: { size: 20, feedingsToEvolve: 3 },
  medium: { size: 28, feedingsToEvolve: 5 },
  large: { size: 38, feedingsToEvolve: 10 },
  king: { size: 48, feedingsToEvolve: 15 },
  star: { size: 55, feedingsToEvolve: null }
};

let foodUpgraded = false;
let laserUpgraded = false;

// New fish arrays (sprite-based)
const trouts = [];      // Basic fish (replaces Guppy)
const skellfins = [];   // Carnivore (replaces Carnivore)
const mobiuses = [];    // Apex predator (replaces Ultravore)
const crabs = [];       // Bottom dweller (replaces Guppycruncher)
const wardens = [];     // Special: attacks aliens
const seekers = [];     // Special: auto-collects coins
const anemones = [];    // Special: heals nearby fish
const geotles = [];     // Special: spawns baby trout

// Legacy arrays (kept for compatibility during transition)
const breeders = [];
const feeders = [];
const starcatchers = [];
const guppycrunchers = [];
const beetlemunchers = [];
const beetles = [];
const ultravores = [];

// Pet system - multiple stinkies allowed
const stinkies = [];

// New pets (Phase 13)
const nikos = [];
const zorfs = [];
const itchys = [];
const clydes = [];
let angie = null;  // Single instance (revive mechanic)

const NIKO_COST = 600;
const ZORF_COST = 400;
const ITCHY_COST = 700;
const CLYDE_COST = 550;
const ANGIE_COST = 2000;
const MAX_PETS = 3;

// Alien system
let alien = null;
let aliens = [];  // Support multiple aliens for waves
let alienSpawnTimer = 60 + Math.random() * 30; // First spawn in 60-90 seconds
let alienWarningTimer = 0;  // 5-second warning before spawn
let alienWarningActive = false;
let totalEarned = 0;  // Track total gold earned for wave triggers
const ALIEN_SPAWN_MIN = 60;
const ALIEN_SPAWN_MAX = 90;
const ALIEN_WARNING_DURATION = 5;  // 5-second warning
const WAVE_THRESHOLD = 10000;  // Spawn pairs after $10,000 total earned

// Particle system
const particles = [];

// Missile system (for Destructor)
const missiles = [];

// ============================================
// Quality of Life & Progression (Phase 15)
// ============================================

// Speed Toggle
let gameSpeed = 1;

// Auto-Collect Upgrade
let autoCollectUpgraded = false;
const AUTO_COLLECT_COST = 1000;
const AUTO_COLLECT_RADIUS = 100;

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
const PRESTIGE_THRESHOLD = 50000;  // Minimum totalEarned to prestige

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
    guppies: guppies.map(g => ({
      x: g.x,
      y: g.y,
      stage: g.stage,
      timesEaten: g.timesEaten,
      hunger: g.hunger
    })),
    carnivores: carnivores.map(c => ({
      x: c.x,
      y: c.y,
      hunger: c.hunger
    })),
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
    guppycrunchers: guppycrunchers.map(gc => ({
      x: gc.x,
      hunger: gc.hunger,
      coinTimer: gc.coinTimer
    })),
    beetlemunchers: beetlemunchers.map(bm => ({
      x: bm.x,
      y: bm.y,
      hunger: bm.hunger,
      coinTimer: bm.coinTimer
    })),
    ultravores: ultravores.map(uv => ({
      x: uv.x,
      y: uv.y,
      hunger: uv.hunger,
      coinTimer: uv.coinTimer
    })),
    // New Phase 18 fish
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

    // Restore guppies
    if (saveData.guppies) {
      for (const gData of saveData.guppies) {
        const guppy = new Guppy(gData.x, gData.y);
        guppy.stage = gData.stage;
        guppy.timesEaten = gData.timesEaten;
        guppy.hunger = Math.min(gData.hunger, 50); // Cap hunger on load
        guppy.size = STAGES[guppy.stage].size;
        guppies.push(guppy);
      }
    }

    // Restore carnivores
    if (saveData.carnivores) {
      for (const cData of saveData.carnivores) {
        const carnivore = new Carnivore(cData.x, cData.y);
        carnivore.hunger = Math.min(cData.hunger, 50);
        carnivores.push(carnivore);
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

    // Restore guppycrunchers
    if (saveData.guppycrunchers) {
      for (const gcData of saveData.guppycrunchers) {
        const gc = new Guppycruncher();
        gc.x = gcData.x;
        gc.hunger = Math.min(gcData.hunger || 0, 50);
        gc.coinTimer = gcData.coinTimer || 15;
        guppycrunchers.push(gc);
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

    // Restore ultravores
    if (saveData.ultravores) {
      for (const uvData of saveData.ultravores) {
        const uv = new Ultravore(uvData.x, uvData.y);
        uv.hunger = Math.min(uvData.hunger || 0, 50);
        uv.coinTimer = uvData.coinTimer || 25;
        ultravores.push(uv);
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
// Trout Class (Basic Fish - Sprite Based)
// ============================================
class Trout {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'trout';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.trout.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed + Math.random() * 20;
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Death animation
    this.deathTimer = 0;

    // Coin dropping - silver coins
    const [minInterval, maxInterval] = FISH_SPECIES.trout.coinDropInterval;
    this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
    this.coinType = FISH_SPECIES.trout.coinType;
    this.coinValue = FISH_SPECIES.trout.coinValue;
  }

  update(dt) {
    // Handle dying state - float to top
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 40 * dt; // Float upward

      // Remove after floating to top
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    this.hunger += dt * 5;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Check for nearby Anemone healing
    for (const anemone of anemones) {
      if (anemone.state !== 'dying' && anemone.state !== 'dead') {
        const dx = anemone.x - this.x;
        const dy = anemone.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < FISH_SPECIES.anemone.healRadius) {
          this.hunger = Math.max(0, this.hunger - FISH_SPECIES.anemone.healRate * dt);
        }
      }
    }

    if (this.hunger > 50) {
      this.state = 'hungry';
      const nearestPellet = this.findNearestPellet();
      if (nearestPellet) {
        this.targetX = nearestPellet.x;
        this.targetY = nearestPellet.y;
      }
    } else {
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 3;
      }
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // Hungry speed boost - 30% faster when hunger > 50, plus prestige bonus
      const baseSpeed = this.hunger > 50 ? this.speed * 1.3 : this.speed;
      const currentSpeed = baseSpeed * getPrestigeBonus('speed');
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;

    this.checkPelletCollision();
    this.checkCoinDrop(dt);
  }

  checkCoinDrop(dt) {
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      // Drop a coin
      coins.push(new Coin(this.x, this.y, this.coinType));
      const [minInterval, maxInterval] = FISH_SPECIES.trout.coinDropInterval;
      // Apply prestige bonus (faster drops = lower timer)
      const baseTimer = minInterval + Math.random() * (maxInterval - minInterval);
      this.coinTimer = baseTimer / getPrestigeBonus('coinDrop');
    }
  }

  findNearestPellet() {
    let nearest = null;
    let nearestDist = Infinity;
    for (const pellet of pellets) {
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = pellet;
      }
    }
    return nearest;
  }

  checkPelletCollision() {
    // Satiation cap - ignore pellets when full (hunger < 10)
    if (this.hunger < 10) return;

    for (let i = pellets.length - 1; i >= 0; i--) {
      const pellet = pellets[i];
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.size / 2 + pellet.size) {
        pellets.splice(i, 1);
        // Upgraded pellets give bonus satiation
        this.hunger = pellet.upgraded ? -25 : 0;
        this.state = 'wandering';
        break;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Apply death animation
    if (this.state === 'dying') {
      ctx.rotate(Math.PI); // Flip upside down
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3); // Fade out
    }

    // Flip sprite based on facing direction
    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded, otherwise fallback to colored rectangle
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored fish
      ctx.fillStyle = this.state === 'dying' ? '#808080' : (this.hunger > 50 ? '#ff6347' : '#ffa500');
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Hunger warning indicator
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 5);
    }

    // Label
    ctx.fillStyle = '#ffa500';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TROUT', this.x, this.y + this.size / 2 + 12);
  }
}

// Alias for backward compatibility
const Guppy = Trout;

// ============================================
// Skellfin Class (Carnivore - Sprite Based)
// ============================================
class Skellfin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'skellfin';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.skellfin.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed + 20; // Carnivores are faster
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Death animation
    this.deathTimer = 0;

    // Coin dropping - chests ($500)
    const [minInterval, maxInterval] = FISH_SPECIES.skellfin.coinDropInterval;
    this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
    this.coinType = FISH_SPECIES.skellfin.coinType;
    this.coinValue = FISH_SPECIES.skellfin.coinValue;

    // Hunting
    this.targetFish = null;

    // Alien attack timer
    this.attackTimer = 0;
    this.attackCooldown = 0.5; // Attack every 0.5 seconds

    // Resilience - takes 2 seconds for alien to kill
    this.beingEatenTimer = 0;
    this.beingEatenDuration = 2; // Survives 2 seconds of alien attack
  }

  // Alias for backward compatibility
  get coinType() { return this._coinType || 'chest'; }
  set coinType(val) { this._coinType = val; }

  update(dt) {
    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 30 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slower than guppies
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 8);
      return;
    }

    // Coin drop timer (always drops diamonds when alive)
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      coins.push(new Coin(this.x, this.y, 'diamond'));
      this.coinTimer = 15;
    }

    // Reset being eaten timer if alien is gone or far away
    if (!alien || alien.dead) {
      this.beingEatenTimer = 0;
    } else {
      const alienDx = alien.x - this.x;
      const alienDy = alien.y - this.y;
      const alienDist = Math.sqrt(alienDx * alienDx + alienDy * alienDy);
      if (alienDist > this.size + alien.size) {
        this.beingEatenTimer = Math.max(0, this.beingEatenTimer - dt * 2); // Recover when away
      }
    }

    // PRIORITY 1: Attack alien if present!
    if (alien && !alien.dead && !alien.entering) {
      this.state = 'attacking';
      this.targetX = alien.x;
      this.targetY = alien.y;
      this.targetFish = null;

      // Check if close enough to attack
      const dx = alien.x - this.x;
      const dy = alien.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size + alien.size * 0.5) {
        // Attack the alien!
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          alien.takeDamage();
          spawnParticles(alien.x, alien.y, 'blood', 3);
          this.attackTimer = this.attackCooldown;
        }
      }
    }
    // PRIORITY 2: Hunt small guppies when hungry (no alien present)
    else if (this.hunger > 40) {
      this.state = 'hunting';
      this.targetFish = this.findTrout();

      if (this.targetFish) {
        this.targetX = this.targetFish.x;
        this.targetY = this.targetFish.y;

        // Check if caught prey
        const dx = this.targetFish.x - this.x;
        const dy = this.targetFish.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.size * 0.5 + this.targetFish.size) {
          // Eat the fish!
          this.targetFish.state = 'dead';
          this.hunger = 0;
          this.state = 'wandering';
          this.targetFish = null;
        }
      } else {
        // No prey available, just wander hungrily
        this.state = 'hungry';
      }
    } else {
      this.state = 'wandering';
      this.targetFish = null;
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 2;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = (this.state === 'hunting' || this.state === 'attacking') ? this.speed * 1.5 : this.speed;
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findTrout() {
    let nearest = null;
    let nearestDist = Infinity;
    // Hunt from trouts array (new sprite-based fish)
    for (const trout of trouts) {
      if (trout.state === 'dead' || trout.state === 'dying') continue;

      const dx = trout.x - this.x;
      const dy = trout.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = trout;
      }
    }
    // Also check legacy guppies array for backward compatibility
    for (const guppy of guppies) {
      if (guppy.state === 'dead' || guppy.state === 'dying') continue;

      const dx = guppy.x - this.x;
      const dy = guppy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = guppy;
      }
    }
    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored fish
      let bodyColor = this.state === 'dying' ? '#808080' :
                      this.state === 'attacking' ? '#4169e1' :
                      this.state === 'hunting' ? '#8b0000' : '#228b22';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Label
    ctx.fillStyle = '#9c27b0';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SKELLFIN', this.x, this.y + this.size / 2 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 10);
    }

    // Being eaten indicator (resilience bar)
    if (this.beingEatenTimer > 0 && this.state !== 'dying') {
      const barWidth = 40;
      const barHeight = 6;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size / 2 - 25;
      const progress = this.beingEatenTimer / this.beingEatenDuration;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = `rgb(${Math.floor(255 * progress)}, ${Math.floor(100 * (1 - progress))}, 0)`;
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('DANGER!', this.x, barY - 3);
    }
  }
}

// Alias for backward compatibility
const Carnivore = Skellfin;

// ============================================
// MobiusDickens Class (Apex Predator - Sprite Based)
// ============================================
class MobiusDickens {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'mobius_dickens';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.mobius_dickens.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed;
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Death animation
    this.deathTimer = 0;

    // Treasure dropping - chests ($1500)
    const [minInterval, maxInterval] = FISH_SPECIES.mobius_dickens.coinDropInterval;
    this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
    this.coinType = FISH_SPECIES.mobius_dickens.coinType;
    this.coinValue = FISH_SPECIES.mobius_dickens.coinValue;

    // Hunting
    this.targetFish = null;

    // Alien attack timer
    this.attackTimer = 0;
    this.attackCooldown = 0.5;

    // Resilience - takes 3 seconds for alien to kill (larger fish)
    this.beingEatenTimer = 0;
    this.beingEatenDuration = 3;
  }

  update(dt) {
    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 30 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slower than guppies (apex predator)
    this.hunger += dt * 2;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 12);
      return;
    }

    // Coin drop timer (drops chests when alive)
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      // Create a chest coin with the correct value
      const chest = new Coin(this.x, this.y, this.coinType);
      chest.value = this.coinValue; // Override with species-specific value
      coins.push(chest);
      const [minInterval, maxInterval] = FISH_SPECIES.mobius_dickens.coinDropInterval;
      this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
    }

    // Reset being eaten timer if alien is gone or far away
    if (!alien || alien.dead) {
      this.beingEatenTimer = 0;
    } else {
      const alienDx = alien.x - this.x;
      const alienDy = alien.y - this.y;
      const alienDist = Math.sqrt(alienDx * alienDx + alienDy * alienDy);
      if (alienDist > this.size + alien.size) {
        this.beingEatenTimer = Math.max(0, this.beingEatenTimer - dt * 1.5);
      }
    }

    // PRIORITY 1: Attack alien if present!
    if (alien && !alien.dead && !alien.entering) {
      this.state = 'attacking';
      this.targetX = alien.x;
      this.targetY = alien.y;
      this.targetFish = null;

      // Check if close enough to attack
      const dx = alien.x - this.x;
      const dy = alien.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size + alien.size * 0.5) {
        // Attack the alien!
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          alien.takeDamage();
          spawnParticles(alien.x, alien.y, 'blood', 5);
          this.attackTimer = this.attackCooldown;
        }
      }
    }
    // PRIORITY 2: Hunt carnivores when hungry (no alien present)
    else if (this.hunger > 40) {
      this.state = 'hunting';
      this.targetFish = this.findSkellfin();

      if (this.targetFish) {
        this.targetX = this.targetFish.x;
        this.targetY = this.targetFish.y;

        // Check if caught prey
        const dx = this.targetFish.x - this.x;
        const dy = this.targetFish.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.size * 0.5 + this.targetFish.size) {
          // Eat the carnivore!
          this.targetFish.state = 'dead';
          this.hunger = 0;
          this.state = 'wandering';
          this.targetFish = null;
        }
      } else {
        // No prey available, just wander hungrily
        this.state = 'hungry';
      }
    } else {
      this.state = 'wandering';
      this.targetFish = null;
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 2;
      }
    }

    // Movement (slowest fish)
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = (this.state === 'hunting' || this.state === 'attacking') ? this.speed * 1.3 : this.speed;
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findSkellfin() {
    let nearest = null;
    let nearestDist = Infinity;
    // Hunt from skellfins array
    for (const skellfin of skellfins) {
      if (skellfin.state === 'dead' || skellfin.state === 'dying') continue;

      const dx = skellfin.x - this.x;
      const dy = skellfin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = skellfin;
      }
    }
    // Also check legacy carnivores array
    for (const carnivore of carnivores) {
      if (carnivore.state === 'dead' || carnivore.state === 'dying') continue;

      const dx = carnivore.x - this.x;
      const dy = carnivore.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = carnivore;
      }
    }
    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored fish
      let bodyColor = this.state === 'dying' ? '#505050' :
                      this.state === 'attacking' ? '#4169e1' :
                      this.state === 'hunting' ? '#2f4f4f' : '#708090';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Danger bar when being eaten
    if (this.beingEatenTimer > 0) {
      const dangerPercent = this.beingEatenTimer / this.beingEatenDuration;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(-this.size * 0.3, -this.size * 0.55, this.size * 0.6 * dangerPercent, 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-this.size * 0.3, -this.size * 0.55, this.size * 0.6, 4);
    }

    ctx.restore();

    // Label
    ctx.fillStyle = '#9c27b0';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MOBIUS', this.x, this.y + this.size / 2 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 10);
    }
  }
}

// Alias for backward compatibility
const Ultravore = MobiusDickens;

// ============================================
// Breeder Class (Produces Guppies)
// ============================================
class Breeder {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = 40; // Slow moving
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;
    this.size = 35;

    // Death animation
    this.deathTimer = 0;

    // Breeding timer - spawns guppy every 20-30 seconds
    this.breedTimer = 20 + Math.random() * 10;
  }

  update(dt) {
    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 25 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slowly
    this.hunger += dt * 4;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Breeding timer
    this.breedTimer -= dt;
    if (this.breedTimer <= 0 && this.hunger < 70) {
      // Spawn a new baby guppy!
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      guppies.push(new Guppy(this.x + offsetX, this.y + offsetY));
      sound.play('evolve');
      spawnParticles(this.x, this.y, 'sparkle', 8);
      this.breedTimer = 20 + Math.random() * 10;
    }

    // Seek pellets when hungry
    if (this.hunger > 50) {
      this.state = 'hungry';
      const nearestPellet = this.findNearestPellet();
      if (nearestPellet) {
        this.targetX = nearestPellet.x;
        this.targetY = nearestPellet.y;
      }
    } else {
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 3 + Math.random() * 3;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // Hungry speed boost - 30% faster when hunger > 50, plus prestige bonus
      const baseSpeed = this.hunger > 50 ? this.speed * 1.3 : this.speed;
      const currentSpeed = baseSpeed * getPrestigeBonus('speed');
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;

    this.checkPelletCollision();
  }

  findNearestPellet() {
    let nearest = null;
    let nearestDist = Infinity;
    for (const pellet of pellets) {
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = pellet;
      }
    }
    return nearest;
  }

  checkPelletCollision() {
    // Satiation cap - ignore pellets when full (hunger < 10)
    if (this.hunger < 10) return;

    for (let i = pellets.length - 1; i >= 0; i--) {
      const pellet = pellets[i];
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.size + pellet.size) {
        pellets.splice(i, 1);
        this.hunger = pellet.upgraded ? -25 : 0;
        this.state = 'wandering';
        break;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Color based on state
    let bodyColor = '#ff69b4'; // Pink
    let bellyColor = '#ffb6c1'; // Light pink
    if (this.state === 'dying') {
      bodyColor = '#808080';
      bellyColor = '#a0a0a0';
    } else if (this.hunger > 75) {
      bodyColor = '#ff0000';
      bellyColor = '#ff6347';
    } else if (this.hunger > 50) {
      bodyColor = '#ff1493'; // Deep pink when hungry
      bellyColor = '#ff69b4';
    }

    // Body - round, maternal shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (larger, pregnant look)
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, this.size * 0.15, this.size * 0.7, this.size * 0.4, 0, 0, Math.PI);
    ctx.fill();

    // Tail
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(-this.size - 15, -12);
    ctx.lineTo(-this.size - 15, 12);
    ctx.closePath();
    ctx.fill();

    // Dorsal fin (small, cute)
    ctx.beginPath();
    ctx.moveTo(-5, -this.size * 0.6);
    ctx.lineTo(5, -this.size * 0.85);
    ctx.lineTo(15, -this.size * 0.6);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.size * 0.4, -this.size * 0.2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(this.size * 0.45, -this.size * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyelash (feminine touch)
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.35, -this.size * 0.35);
    ctx.lineTo(this.size * 0.3, -this.size * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.size * 0.45, -this.size * 0.38);
    ctx.lineTo(this.size * 0.45, -this.size * 0.5);
    ctx.stroke();

    // Heart on belly (if breeding soon)
    if (this.breedTimer < 5 && this.state !== 'dying') {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('\u2665', 0, this.size * 0.3);
    }

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Label
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BREEDER', this.x, this.y + this.size + 15);

    // Breeding progress indicator
    if (this.breedTimer < 10 && this.state !== 'dying') {
      const progress = 1 - (this.breedTimer / 10);
      ctx.fillStyle = `rgba(255, 105, 180, ${0.5 + progress * 0.5})`;
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Ready!', this.x, this.y - this.size - 10);
    }
  }
}

// ============================================
// Feeder Class (Drops Pellets, Doesn't Eat)
// ============================================
class Feeder {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = 30; // Very slow moving
    this.facingLeft = false;
    this.wanderTimer = 0;
    this.size = 28;

    // Pellet dropping timer - spawns pellet every 15-20 seconds
    this.dropTimer = 15 + Math.random() * 5;

    // Animation
    this.wobble = 0;
  }

  update(dt) {
    this.wobble += dt * 2;

    // Pellet drop timer
    this.dropTimer -= dt;
    if (this.dropTimer <= 0) {
      // Drop a pellet!
      const offsetX = (Math.random() - 0.5) * 20;
      pellets.push(new Pellet(this.x + offsetX, this.y + this.size * 0.5));
      sound.play('feed');
      spawnParticles(this.x, this.y, 'bubble', 2);
      this.dropTimer = 15 + Math.random() * 5;
    }

    // Wander slowly
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const newPos = tankManager.getRandomPosition();
      this.targetX = newPos.x;
      this.targetY = newPos.y;
      this.wanderTimer = 4 + Math.random() * 4; // Slow wander changes
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Subtle bobbing animation
    const bobY = Math.sin(this.wobble) * 2;
    ctx.translate(0, bobY);

    // Body color - orange
    const bodyColor = '#ff8c00';
    const bellyColor = '#ffa500';

    // Body - round, plump shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, this.size * 0.15, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI);
    ctx.fill();

    // Tail
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(-this.size - 12, -10);
    ctx.lineTo(-this.size - 12, 10);
    ctx.closePath();
    ctx.fill();

    // Dorsal fin (small)
    ctx.beginPath();
    ctx.moveTo(-5, -this.size * 0.55);
    ctx.lineTo(3, -this.size * 0.8);
    ctx.lineTo(10, -this.size * 0.55);
    ctx.closePath();
    ctx.fill();

    // Food pouch indicator (bulge on belly)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(this.size * 0.2, this.size * 0.2, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.size * 0.4, -this.size * 0.15, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(this.size * 0.45, -this.size * 0.15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Label
    ctx.fillStyle = '#ff8c00';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FEEDER', this.x, this.y + this.size + 15);

    // Drop progress indicator
    if (this.dropTimer < 5) {
      const progress = 1 - (this.dropTimer / 5);
      ctx.fillStyle = `rgba(255, 140, 0, ${0.5 + progress * 0.5})`;
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Dropping...', this.x, this.y - this.size - 5);
    }
  }
}

// ============================================
// Starcatcher Class (Bottom-dweller, eats stars)
// ============================================
class Starcatcher {
  constructor(x, y) {
    this.x = x;
    this.y = tankManager.bounds.bottom - tankManager.padding - 20; // Stay near bottom
    this.targetX = x;
    this.speed = 35; // Slow moving
    this.facingLeft = false;
    this.size = 32;
    this.hunger = 0;
    this.state = 'wandering';

    // Death animation
    this.deathTimer = 0;

    // Diamond production - drops diamond every 12 seconds when fed
    this.coinTimer = 12;
    this.canDropDiamond = false; // Only drops when fed (hunger < 50)

    // Star eating
    this.targetStar = null;

    // Animation
    this.wobble = 0;
    this.mouthOpen = 0;
  }

  update(dt) {
    this.wobble += dt * 2;

    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 20 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slowly
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Diamond production when well-fed
    if (this.hunger < 50) {
      this.canDropDiamond = true;
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        // Throw diamond upward (unique to Starcatcher)
        const diamond = new Coin(this.x, this.y - this.size, 'diamond');
        diamond.fallSpeed = -60; // Throw upward initially
        coins.push(diamond);
        spawnParticles(this.x, this.y, 'sparkle', 5);
        this.coinTimer = 12;
      }
    } else {
      this.canDropDiamond = false;
    }

    // Look for stars to eat
    this.targetStar = this.findNearestStar();
    if (this.targetStar) {
      this.state = 'hunting';
      this.targetX = this.targetStar.x;
      this.mouthOpen = Math.min(1, this.mouthOpen + dt * 3);
    } else {
      this.state = this.hunger > 50 ? 'hungry' : 'wandering';
      this.mouthOpen = Math.max(0, this.mouthOpen - dt * 2);

      // Wander along the bottom
      if (Math.abs(this.x - this.targetX) < 10) {
        this.targetX = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
      }
    }

    // Movement (only horizontal, stays at bottom)
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 5) {
      const currentSpeed = this.state === 'hunting' ? this.speed * 1.5 : this.speed;
      this.x += Math.sign(dx) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    // Clamp to bottom area
    this.x = Math.max(tankManager.padding, Math.min(tankManager.bounds.right - tankManager.padding, this.x));

    this.checkStarCollision();
  }

  findNearestStar() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const coin of coins) {
      if (coin.type !== 'star') continue;
      if (coin.collected || coin.escaped) continue;

      const dx = coin.x - this.x;
      const dy = coin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only chase stars that are above and within reasonable range
      if (dy < 0 && dist < nearestDist && dist < 200) {
        nearestDist = dist;
        nearest = coin;
      }
    }
    return nearest;
  }

  checkStarCollision() {
    for (const coin of coins) {
      if (coin.type !== 'star') continue;
      if (coin.collected || coin.escaped) continue;

      const dx = coin.x - this.x;
      const dy = coin.y - (this.y - this.size * 0.3); // Mouth is on top
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size * 0.8) {
        // Eat the star!
        coin.collected = true;
        this.hunger = Math.max(0, this.hunger - 40);
        this.state = 'wandering';
        sound.play('coin');
        spawnParticles(this.x, this.y - this.size * 0.3, 'sparkle', 8);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    // Wobble animation
    const wobbleY = Math.sin(this.wobble) * 2;
    ctx.translate(0, wobbleY);

    // Body color - purple/periwinkle
    let bodyColor = '#9370db'; // Medium purple
    let bellyColor = '#dda0dd'; // Plum
    if (this.state === 'dying') {
      bodyColor = '#808080';
      bellyColor = '#a0a0a0';
    } else if (this.hunger > 75) {
      bodyColor = '#8b008b'; // Dark magenta when hungry
      bellyColor = '#da70d6';
    } else if (this.hunger > 50) {
      bodyColor = '#9932cc'; // Dark orchid
      bellyColor = '#da70d6';
    }

    // Body - round, bottom-heavy shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (lighter underside)
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, this.size * 0.15, this.size * 0.7, this.size * 0.25, 0, 0, Math.PI);
    ctx.fill();

    // Mouth on TOP (unique feature - opens upward)
    const mouthSize = 8 + this.mouthOpen * 8;
    ctx.fillStyle = '#4b0082'; // Indigo
    ctx.beginPath();
    ctx.ellipse(0, -this.size * 0.3, mouthSize, mouthSize * (0.3 + this.mouthOpen * 0.7), 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner mouth
    if (this.mouthOpen > 0.3) {
      ctx.fillStyle = '#2e0854';
      ctx.beginPath();
      ctx.ellipse(0, -this.size * 0.3, mouthSize * 0.6, mouthSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Side fins
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-this.size * 0.8, 0, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.size * 0.8, 0, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (on sides, looking up)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-this.size * 0.4, -this.size * 0.1, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.size * 0.4, -this.size * 0.1, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (looking up toward stars)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-this.size * 0.4, -this.size * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.4, -this.size * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Label
    ctx.fillStyle = '#9370db';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STARCATCHER', this.x, this.y + this.size * 0.6 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size * 0.6 - 15);
    }

    // Diamond ready indicator
    if (this.canDropDiamond && this.coinTimer < 3) {
      ctx.fillStyle = '#b9f2ff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('\u2666', this.x, this.y - this.size * 0.6 - 5);
    }
  }
}

// ============================================
// Beetle Class (Collectible that scuttles along bottom)
// ============================================
class Beetle {
  constructor(x, y) {
    this.x = x;
    this.y = tankManager.bounds.bottom - tankManager.padding; // Stay at bottom
    this.targetX = x;
    this.speed = 45;
    this.size = 12;
    this.collected = false;
    this.facingLeft = false;

    // Animation
    this.legPhase = 0;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.legPhase += dt * 15;
    this.wobble += dt * 2;

    // Wander along the bottom
    if (Math.abs(this.x - this.targetX) < 10) {
      this.targetX = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    }

    // Movement (only horizontal)
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 2) {
      this.x += Math.sign(dx) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    // Clamp to bottom bounds
    this.x = Math.max(tankManager.padding, Math.min(tankManager.bounds.right - tankManager.padding, this.x));
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size + 15; // Generous click area
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Shiny shell - dark brown/black
    const shellColor = '#3d2b1f';
    const shellHighlight = '#5c4033';

    // Shell body
    ctx.fillStyle = shellColor;
    ctx.beginPath();
    ctx.ellipse(0, -this.size * 0.3, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell shine
    ctx.fillStyle = shellHighlight;
    ctx.beginPath();
    ctx.ellipse(-this.size * 0.2, -this.size * 0.5, this.size * 0.4, this.size * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Shell segments (lines)
    ctx.strokeStyle = '#2a1f14';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.7);
    ctx.lineTo(0, this.size * 0.1);
    ctx.stroke();

    // Legs (6 total, animated)
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const legOffset = (i - 1) * this.size * 0.5;
      const legWiggle = Math.sin(this.legPhase + i * 1.5) * 3;

      // Left leg
      ctx.beginPath();
      ctx.moveTo(legOffset, -this.size * 0.1);
      ctx.lineTo(legOffset - 8 - legWiggle, this.size * 0.3);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(legOffset, -this.size * 0.1);
      ctx.lineTo(legOffset + 8 + legWiggle, this.size * 0.3);
      ctx.stroke();
    }

    // Antennae
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 1.5;
    const antennaWiggle = Math.sin(this.wobble) * 2;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.6, -this.size * 0.3);
    ctx.quadraticCurveTo(this.size * 0.9, -this.size * 0.8 + antennaWiggle, this.size * 0.7, -this.size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.size * 0.8, -this.size * 0.3);
    ctx.quadraticCurveTo(this.size * 1.1, -this.size * 0.7 + antennaWiggle, this.size * 1.0, -this.size * 0.9);
    ctx.stroke();

    // Eyes (small)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 0.5, -this.size * 0.4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Value label
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$150', this.x, this.y + 15);
  }
}

// ============================================
// Crab Class (Bottom-dweller that eats trout - Sprite Based)
// ============================================
class Crab {
  constructor() {
    this.x = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = tankManager.bounds.bottom - tankManager.padding;
    this.groundY = this.y; // Remember ground level
    this.targetX = this.x;
    this.species = 'crab';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.crab.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed;
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;

    // Death animation
    this.deathTimer = 0;

    // Coin dropping - uses species config
    const [minInterval, maxInterval] = FISH_SPECIES.crab.coinDropInterval;
    this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
    this.coinType = FISH_SPECIES.crab.coinType;
    this.coinValue = FISH_SPECIES.crab.coinValue;

    // Jumping mechanics
    this.vy = 0; // Vertical velocity
    this.isJumping = false;
    this.targetFish = null;

    // Animation
    this.legPhase = 0;
    this.clawOpen = 0;
  }

  update(dt) {
    this.legPhase += dt * 8;

    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 20 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases
    this.hunger += dt * 4;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Coin production when well-fed
    if (this.hunger < 50) {
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        const coin = new Coin(this.x, this.y, this.coinType);
        coin.value = this.coinValue;
        coins.push(coin);
        spawnParticles(this.x, this.y, 'sparkle', 3);
        const [minInterval, maxInterval] = FISH_SPECIES.crab.coinDropInterval;
        this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
      }
    }

    // Apply gravity if jumping
    if (this.isJumping) {
      this.vy += 400 * dt; // Gravity
      this.y += this.vy * dt;

      // Check if landed
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Hunt small guppies when hungry
    if (this.hunger > 40 && !this.isJumping) {
      this.targetFish = this.findTrout();
      if (this.targetFish) {
        this.state = 'hunting';
        this.targetX = this.targetFish.x;
        this.clawOpen = Math.min(1, this.clawOpen + dt * 3);

        // Jump to catch if guppy is above and close horizontally
        const dx = this.targetFish.x - this.x;
        const dy = this.targetFish.y - this.y;
        if (Math.abs(dx) < 60 && dy < -30 && dy > -150) {
          // Jump!
          this.isJumping = true;
          this.vy = -250 - Math.abs(dy) * 0.8; // Jump higher for higher fish
          spawnParticles(this.x, this.y, 'bubble', 3);
        }

        // Check if caught prey
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.size * 0.6 + this.targetFish.size) {
          // Eat the fish!
          this.targetFish.state = 'dead';
          this.hunger = 0;
          this.state = 'wandering';
          this.targetFish = null;
          sound.play('coin'); // Crunch sound
          spawnParticles(this.x, this.y, 'blood', 5);
        }
      } else {
        this.state = 'hungry';
        this.clawOpen = Math.max(0, this.clawOpen - dt * 2);
      }
    } else {
      this.state = this.hunger > 50 ? 'hungry' : 'wandering';
      this.targetFish = null;
      this.clawOpen = Math.max(0, this.clawOpen - dt * 2);

      // Wander along the bottom
      if (!this.isJumping && Math.abs(this.x - this.targetX) < 10) {
        this.targetX = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
      }
    }

    // Horizontal movement (only when on ground)
    if (!this.isJumping) {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) > 5) {
        const currentSpeed = this.state === 'hunting' ? this.speed * 1.5 : this.speed;
        this.x += Math.sign(dx) * currentSpeed * dt;
        this.facingLeft = dx < 0;
      }
    }

    // Clamp to bounds
    this.x = Math.max(tankManager.padding, Math.min(tankManager.bounds.right - tankManager.padding, this.x));
  }

  findTrout() {
    let nearest = null;
    let nearestDist = Infinity;

    // Search trouts array (new sprite-based fish)
    for (const trout of trouts) {
      if (trout.state === 'dead' || trout.state === 'dying') continue;

      const dx = trout.x - this.x;
      const dy = trout.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only target fish above and within range
      if (dy < 0 && dist < nearestDist && dist < 200) {
        nearestDist = dist;
        nearest = trout;
      }
    }

    // Also check legacy guppies array for backward compatibility
    for (const guppy of guppies) {
      if (guppy.state === 'dead' || guppy.state === 'dying') continue;

      const dx = guppy.x - this.x;
      const dy = guppy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dy < 0 && dist < nearestDist && dist < 200) {
        nearestDist = dist;
        nearest = guppy;
      }
    }
    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored crab shape
      let bodyColor = this.state === 'dying' ? '#808080' :
                      this.state === 'hunting' ? '#ff4500' :
                      this.hunger > 60 ? '#8b0000' : '#ff6347';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, -this.size * 0.2, this.size * 0.5, this.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Simple claws
      ctx.fillRect(-this.size * 0.6, -this.size * 0.1, 15, 8);
      ctx.fillRect(this.size * 0.6 - 15, -this.size * 0.1, 15, 8);
    }

    ctx.restore();

    // Label
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CRAB', this.x, this.y + this.size * 0.7 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size - 10);
    }

    // Coin ready indicator
    if (this.hunger < 50 && this.coinTimer < 3) {
      ctx.fillStyle = '#3d2b1f';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('\u2022', this.x, this.y - this.size * 0.8);
    }
  }
}

// Alias for backward compatibility
const Guppycruncher = Crab;

// ============================================
// WardenLamprey Class (Attacks Aliens - Sprite Based)
// ============================================
class WardenLamprey {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'warden_lamprey';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.warden_lamprey.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed + 30; // Fast when attacking
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Damage dealing
    this.damagePerSecond = FISH_SPECIES.warden_lamprey.damagePerSecond;
    this.attackTimer = 0;
    this.attackCooldown = 0.5; // Attack every 0.5 seconds for 1 damage = 2 dps

    // No hunger - this fish doesn't eat
    this.hunger = 0;
  }

  update(dt) {
    // PRIORITY: Attack alien if present
    if (alien && !alien.dead && !alien.entering) {
      this.state = 'attacking';
      this.targetX = alien.x;
      this.targetY = alien.y;

      // Check if close enough to attack
      const dx = alien.x - this.x;
      const dy = alien.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size + alien.size * 0.5) {
        // Attack the alien!
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          alien.takeDamage();
          spawnParticles(alien.x, alien.y, 'blood', 3);
          this.attackTimer = this.attackCooldown;
        }
      }
    } else {
      // No alien - wander peacefully
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 2;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = this.state === 'attacking' ? this.speed * 1.5 : this.speed;
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple eel-like shape
      let bodyColor = this.state === 'attacking' ? '#ff4500' : '#4a0080';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size / 2, this.size / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Teeth
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.size / 2 - 8, -3, 8, 2);
      ctx.fillRect(this.size / 2 - 8, 1, 8, 2);
    }

    ctx.restore();

    // Label
    ctx.fillStyle = RARITY_COLORS.relic;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WARDEN', this.x, this.y + this.size / 2 + 12);

    // Attack indicator
    if (this.state === 'attacking') {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('ATTACKING!', this.x, this.y - this.size / 2 - 10);
    }
  }
}

// ============================================
// Seeker Class (Auto-Collects Coins - Sprite Based)
// ============================================
class Seeker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'seeker';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.seeker.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed + 40; // Fast coin collector
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Coin collection
    this.collectRadius = FISH_SPECIES.seeker.collectRadius;
    this.targetCoin = null;

    // No hunger - this fish doesn't eat
    this.hunger = 0;
  }

  update(dt) {
    // Look for coins to collect
    this.targetCoin = this.findNearestCoin();

    if (this.targetCoin) {
      this.state = 'collecting';
      this.targetX = this.targetCoin.x;
      this.targetY = this.targetCoin.y;

      // Check if close enough to collect
      const dx = this.targetCoin.x - this.x;
      const dy = this.targetCoin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size / 2 + 10) {
        // Collect the coin!
        gold += this.targetCoin.value;
        totalEarned += this.targetCoin.value;
        updateGoldDisplay();
        sound.play('coin');
        spawnParticles(this.targetCoin.x, this.targetCoin.y, 'coin_sparkle', 5);
        this.targetCoin.collected = true;
        this.targetCoin = null;
      }
    } else {
      // No coins nearby - wander
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 2;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = this.state === 'collecting' ? this.speed * 1.3 : this.speed;
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findNearestCoin() {
    let nearest = null;
    let nearestDist = this.collectRadius;

    for (const coin of coins) {
      if (coin.collected) continue;
      const dx = coin.x - this.x;
      const dy = coin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = coin;
      }
    }

    // Also check beetles
    for (const beetle of beetles) {
      if (beetle.collected) continue;
      const dx = beetle.x - this.x;
      const dy = beetle.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = beetle;
      }
    }

    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple fish shape with eye
      let bodyColor = this.state === 'collecting' ? '#ffd700' : '#ff9800';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Big eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.size / 4, -5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(this.size / 4 + 2, -5, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Label
    ctx.fillStyle = RARITY_COLORS.giga;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SEEKER', this.x, this.y + this.size / 2 + 12);

    // Collection indicator
    if (this.state === 'collecting') {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('$', this.x, this.y - this.size / 2 - 5);
    }
  }
}

// ============================================
// Anemone Class (Heals Nearby Fish - Sprite Based)
// ============================================
class Anemone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'anemone';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.anemone.size];
    this.size = sizeConfig.pixelSize;
    this.speed = 15; // Very slow - almost stationary
    this.state = 'healing';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Healing
    this.healRate = FISH_SPECIES.anemone.healRate;
    this.healRadius = FISH_SPECIES.anemone.healRadius;

    // Animation
    this.pulsePhase = 0;

    // No hunger - this creature doesn't eat
    this.hunger = 0;
  }

  update(dt) {
    // Pulse animation
    this.pulsePhase += dt * 2;

    // Heal nearby fish
    this.healNearbyFish(dt);

    // Very slow wandering
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const newPos = tankManager.getRandomPosition();
      this.targetX = newPos.x;
      this.targetY = newPos.y;
      this.wanderTimer = 5 + Math.random() * 5; // Long intervals between movements
    }

    // Movement (very slow)
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  healNearbyFish(dt) {
    const healAmount = this.healRate * dt;

    // Heal trouts
    for (const fish of trouts) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }

    // Heal legacy guppies
    for (const fish of guppies) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }

    // Heal skellfins
    for (const fish of skellfins) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }

    // Heal legacy carnivores
    for (const fish of carnivores) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }

    // Heal breeders
    for (const fish of breeders) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }

    // Heal geotles
    for (const fish of geotles) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Pulsing effect
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      const drawSize = this.size * pulse;
      ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      // Fallback: draw a simple anemone shape
      ctx.fillStyle = '#ff69b4';
      // Tentacles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tentacleLen = this.size * 0.4 * pulse;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * tentacleLen, Math.sin(angle) * tentacleLen);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ff69b4';
        ctx.stroke();
      }
      // Center body
      ctx.fillStyle = '#ff1493';
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Healing radius indicator (subtle)
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.healRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = RARITY_COLORS.giga;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ANEMONE', this.x, this.y + this.size / 2 + 12);

    // Healing indicator
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('+', this.x, this.y - this.size / 2 - 5);
  }
}

// ============================================
// Geotle Class (Spawns Baby Trout - Sprite Based)
// ============================================
class Geotle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.species = 'geotle';
    const sizeConfig = SIZE_CONFIG[FISH_SPECIES.geotle.size];
    this.size = sizeConfig.pixelSize;
    this.speed = sizeConfig.speed;
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Death animation
    this.deathTimer = 0;

    // Spawning timer - spawns baby trout every 25 seconds
    this.spawnInterval = FISH_SPECIES.geotle.spawnInterval;
    this.spawnTimer = this.spawnInterval;
  }

  update(dt) {
    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 25 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slowly
    this.hunger += dt * 4;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Spawn timer - only spawns when not too hungry
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.hunger < 70) {
      // Spawn a new baby trout!
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      trouts.push(new Trout(this.x + offsetX, this.y + offsetY));
      sound.play('evolve');
      spawnParticles(this.x, this.y, 'sparkle', 8);
      this.spawnTimer = this.spawnInterval;
    }

    // Seek pellets when hungry
    if (this.hunger > 50) {
      this.state = 'hungry';
      const nearestPellet = this.findNearestPellet();
      if (nearestPellet) {
        this.targetX = nearestPellet.x;
        this.targetY = nearestPellet.y;
      }
    } else {
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 3 + Math.random() * 3;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // Apply prestige speed bonus
      const baseSpeed = this.hunger > 50 ? this.speed * 1.3 : this.speed;
      const currentSpeed = baseSpeed * getPrestigeBonus('speed');
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;

    this.checkPelletCollision();
  }

  findNearestPellet() {
    let nearest = null;
    let nearestDist = Infinity;
    for (const pellet of pellets) {
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = pellet;
      }
    }
    return nearest;
  }

  checkPelletCollision() {
    // Satiation cap - ignore pellets when full (hunger < 10)
    if (this.hunger < 10) return;

    for (let i = pellets.length - 1; i >= 0; i--) {
      const pellet = pellets[i];
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.size + pellet.size) {
        pellets.splice(i, 1);
        this.hunger = pellet.upgraded ? -25 : 0;
        this.state = 'wandering';
        break;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = imageCache[this.species];
    if (sprite) {
      ctx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a turtle-like shape
      let bodyColor = this.state === 'dying' ? '#808080' :
                      this.hunger > 75 ? '#ff0000' :
                      this.hunger > 50 ? '#32cd32' : '#228b22';
      // Shell
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(this.size / 3, 0, this.size / 5, 0, Math.PI * 2);
      ctx.fill();
      // Flippers
      ctx.fillRect(-this.size / 3, -this.size / 3, 15, 10);
      ctx.fillRect(-this.size / 3, this.size / 3 - 10, 15, 10);
    }

    ctx.restore();

    // Label
    ctx.fillStyle = RARITY_COLORS.giga;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GEOTLE', this.x, this.y + this.size / 2 + 12);

    // Spawn ready indicator
    if (this.spawnTimer < 5 && this.state !== 'dying') {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Ready!', this.x, this.y - this.size / 2 - 10);
    }

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 25);
    }
  }
}

// ============================================
// Beetlemuncher Class (Green tadpole that eats beetles)
// ============================================
class Beetlemuncher {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.speed = 70;
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;
    this.wanderTimer = 0;
    this.size = 38;

    // Death animation
    this.deathTimer = 0;

    // Pearl production - drops pearl every 20 seconds when well-fed
    this.coinTimer = 20;

    // Beetle hunting
    this.targetBeetle = null;

    // Animation
    this.tailPhase = 0;
    this.mouthOpen = 0;
  }

  update(dt) {
    this.tailPhase += dt * 6;

    // Handle dying state
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.y -= 30 * dt;
      if (this.y < tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
      stats.totalFishLost++;
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 6);
      return;
    }

    // Pearl production when well-fed
    if (this.hunger < 50) {
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        coins.push(new Coin(this.x, this.y, 'pearl'));
        spawnParticles(this.x, this.y, 'sparkle', 8);
        this.coinTimer = 20;
      }
    }

    // Hunt beetles when hungry
    if (this.hunger > 30) {
      this.targetBeetle = this.findNearestBeetle();
      if (this.targetBeetle) {
        this.state = 'hunting';
        this.targetX = this.targetBeetle.x;
        this.targetY = this.targetBeetle.y;
        this.mouthOpen = Math.min(1, this.mouthOpen + dt * 4);

        // Check if caught beetle
        const dx = this.targetBeetle.x - this.x;
        const dy = this.targetBeetle.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.size * 0.5 + this.targetBeetle.size) {
          // Eat the beetle!
          this.targetBeetle.collected = true;
          this.hunger = Math.max(0, this.hunger - 35);
          this.state = 'wandering';
          this.targetBeetle = null;
          sound.play('coin');
          spawnParticles(this.x, this.y, 'sparkle', 5);
        }
      } else {
        this.state = 'hungry';
        this.mouthOpen = Math.max(0, this.mouthOpen - dt * 2);
      }
    } else {
      this.state = 'wandering';
      this.targetBeetle = null;
      this.mouthOpen = Math.max(0, this.mouthOpen - dt * 2);

      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 3;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = this.state === 'hunting' ? this.speed * 1.4 : this.speed;
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findNearestBeetle() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const beetle of beetles) {
      if (beetle.collected) continue;

      const dx = beetle.x - this.x;
      const dy = beetle.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = beetle;
      }
    }
    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === 'dying') {
      ctx.rotate(Math.PI);
      ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Color based on state
    let bodyColor = '#32cd32'; // Lime green
    let bellyColor = '#90ee90'; // Light green
    if (this.state === 'dying') {
      bodyColor = '#808080';
      bellyColor = '#a0a0a0';
    } else if (this.state === 'hunting') {
      bodyColor = '#228b22'; // Forest green when hunting
      bellyColor = '#7cfc00';
    } else if (this.hunger > 60) {
      bodyColor = '#006400'; // Dark green when hungry
      bellyColor = '#556b2f';
    }

    // Tail (tapered, wavy)
    const tailWave = Math.sin(this.tailPhase) * 8;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.3, 0);
    ctx.quadraticCurveTo(
      -this.size * 0.7, tailWave,
      -this.size * 1.1, tailWave * 0.5
    );
    ctx.quadraticCurveTo(
      -this.size * 0.7, -tailWave * 0.3,
      -this.size * 0.3, 0
    );
    ctx.fill();

    // Tail fin
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.9, tailWave * 0.3);
    ctx.lineTo(-this.size * 1.3, tailWave - 5);
    ctx.lineTo(-this.size * 1.3, tailWave + 5);
    ctx.closePath();
    ctx.fill();

    // Body - tadpole shape (large head, tapered back)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(this.size * 0.1, this.size * 0.1, this.size * 0.3, this.size * 0.25, 0, 0, Math.PI);
    ctx.fill();

    // Dorsal fin (small)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.2, -this.size * 0.35);
    ctx.lineTo(0, -this.size * 0.55);
    ctx.lineTo(this.size * 0.1, -this.size * 0.35);
    ctx.closePath();
    ctx.fill();

    // Side fins
    ctx.beginPath();
    ctx.ellipse(-this.size * 0.15, this.size * 0.15, this.size * 0.2, this.size * 0.1, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.size * 0.15, this.size * 0.15, this.size * 0.2, this.size * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    const mouthSize = 6 + this.mouthOpen * 6;
    ctx.fillStyle = '#004d00';
    ctx.beginPath();
    ctx.ellipse(this.size * 0.4, this.size * 0.05, mouthSize, mouthSize * (0.3 + this.mouthOpen * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (large, characteristic of tadpole)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(this.size * 0.15, -this.size * 0.15, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.size * 0.35, -this.size * 0.1, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 0.18, -this.size * 0.12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.38, -this.size * 0.08, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.size * 0.12, -this.size * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.33, -this.size * 0.14, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Label
    ctx.fillStyle = '#32cd32';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MUNCHER', this.x, this.y + this.size * 0.6 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size * 0.6 - 10);
    }

    // Pearl ready indicator
    if (this.hunger < 50 && this.coinTimer < 4) {
      ctx.fillStyle = '#faf0e6';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('\u25cf', this.x, this.y - this.size * 0.5);
    }
  }
}

// ============================================
// Pellet Class
// ============================================
class Pellet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 8;
    this.fallSpeed = 80;
    this.upgraded = foodUpgraded;
  }

  update(dt) {
    this.y += this.fallSpeed * dt;
    if (this.y > tankManager.bounds.bottom - tankManager.padding) {
      this.y = tankManager.bounds.bottom - tankManager.padding;
    }
  }

  draw(ctx) {
    // Upgraded pellets are green and slightly larger
    if (this.upgraded) {
      ctx.fillStyle = '#32cd32';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================
// Coin Class
// ============================================
class Coin {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    const config = COIN_TYPES[type];
    this.value = config.value;
    this.color = config.color;
    this.size = config.size;
    this.label = config.label;
    this.floatsUp = config.floatsUp || false;

    this.fallSpeed = 30;
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 3 + Math.random() * 2;
    this.age = 0;
    this.collected = false;
    this.escaped = false; // For stars that float off screen
  }

  update(dt) {
    this.age += dt;

    if (this.floatsUp) {
      // Stars float upward slowly
      if (this.y > tankManager.padding) {
        this.y -= this.fallSpeed * 0.8 * dt; // Slightly slower than falling
        this.x += Math.sin(this.age * this.wobbleSpeed + this.wobbleOffset) * 15 * dt;

        // Keep within horizontal bounds
        const clamped = tankManager.clampToTank(this.x, this.y);
        this.x = clamped.x;
      } else {
        // Star escaped off top of screen
        this.escaped = true;
      }
    } else {
      // Sink slowly with wobble
      if (this.y < tankManager.bounds.bottom - tankManager.padding) {
        this.y += this.fallSpeed * dt;
        this.x += Math.sin(this.age * this.wobbleSpeed + this.wobbleOffset) * 20 * dt;

        // Keep within horizontal bounds
        const clamped = tankManager.clampToTank(this.x, this.y);
        this.x = clamped.x;
      }
    }
    // Coins no longer expire - they persist until collected (or escape for stars)
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size + 10; // Generous click area
  }

  draw(ctx) {
    ctx.save();

    // Outer glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.type === 'star' ? 15 : 10;

    if (this.type === 'star') {
      // Draw 5-pointed star shape
      const spikes = 5;
      const outerRadius = this.size;
      const innerRadius = this.size * 0.5;
      const rotation = Math.PI / 2 + this.age * 2; // Rotate over time

      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI / spikes) - rotation;
        const px = this.x + Math.cos(angle) * radius;
        const py = this.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Inner sparkle
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle particles around star
      if (Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const sparkleAngle = Math.random() * Math.PI * 2;
        const sparkleDist = this.size * (0.8 + Math.random() * 0.5);
        ctx.beginPath();
        ctx.arc(
          this.x + Math.cos(sparkleAngle) * sparkleDist,
          this.y + Math.sin(sparkleAngle) * sparkleDist,
          2, 0, Math.PI * 2
        );
        ctx.fill();
      }
    } else {
      // Coin body (circle for regular coins)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

      // Inner shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Diamond shape for diamond coins
      if (this.type === 'diamond') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size * 0.5);
        ctx.lineTo(this.x + this.size * 0.4, this.y);
        ctx.lineTo(this.x, this.y + this.size * 0.5);
        ctx.lineTo(this.x - this.size * 0.4, this.y);
        ctx.closePath();
        ctx.fill();
      }

      // Pearl - iridescent shimmer effect
      if (this.type === 'pearl') {
        // Subtle rainbow shimmer
        const shimmerAngle = this.age * 2;
        const shimmerX = Math.cos(shimmerAngle) * this.size * 0.2;
        const shimmerY = Math.sin(shimmerAngle) * this.size * 0.2;

        // Pink tint
        ctx.fillStyle = 'rgba(255, 182, 193, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + shimmerX, this.y + shimmerY, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Blue tint on opposite side
        ctx.fillStyle = 'rgba(173, 216, 230, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - shimmerX, this.y - shimmerY, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Extra bright center highlight
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // $ symbol for silver/gold
      if (this.type === 'silver' || this.type === 'gold') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = `bold ${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', this.x, this.y);
      }

      // Treasure chest shape
      if (this.type === 'treasure') {
        // Chest body (brown rectangle)
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x - this.size * 0.6, this.y - this.size * 0.4, this.size * 1.2, this.size * 0.8);

        // Chest lid (darker brown curved top)
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.4, this.size * 0.4, Math.PI, 0, true);
        ctx.arc(this.x + this.size * 0.3, this.y - this.size * 0.4, this.size * 0.4, Math.PI, 0, false);
        ctx.fill();

        // Gold trim
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.size * 0.6, this.y - this.size * 0.4, this.size * 1.2, this.size * 0.8);

        // Gold coins inside glow
        ctx.fillStyle = 'rgba(255,215,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size * 0.5, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lock detail
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.size * 0.1, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// ============================================
// Sylvester (Alien) Class
// ============================================
class Sylvester {
  constructor() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    const bounds = tankManager.bounds;
    const padding = tankManager.padding;

    switch (edge) {
      case 0: // Top
        this.x = padding + Math.random() * (bounds.right - padding * 2);
        this.y = -50;
        break;
      case 1: // Right
        this.x = bounds.right + 50;
        this.y = padding + Math.random() * (bounds.bottom - padding * 2);
        break;
      case 2: // Bottom
        this.x = padding + Math.random() * (bounds.right - padding * 2);
        this.y = bounds.bottom + 50;
        break;
      case 3: // Left
        this.x = -50;
        this.y = padding + Math.random() * (bounds.bottom - padding * 2);
        break;
    }

    this.targetX = bounds.right / 2;
    this.targetY = bounds.bottom / 2;
    this.speed = 80;
    this.size = 50;
    this.health = 50;
    this.maxHealth = 50;
    this.dead = false;
    this.facingLeft = false;

    // Animation
    this.wobble = 0;
    this.hurtTimer = 0;

    // Entry animation
    this.entering = true;
    this.entryTimer = 0;
  }

  update(dt) {
    this.wobble += dt * 5;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    // Entry animation - warp in
    if (this.entering) {
      this.entryTimer += dt;
      const targetPos = tankManager.getRandomPosition();
      this.targetX = targetPos.x;
      this.targetY = targetPos.y;

      // Move toward tank center
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.x += (dx / dist) * this.speed * 2 * dt;
        this.y += (dy / dist) * this.speed * 2 * dt;
      }

      if (this.entryTimer > 1 && tankManager.isWithinBounds(this.x, this.y)) {
        this.entering = false;
      }
      return;
    }

    // Find nearest fish to hunt
    const target = this.findNearestFish();
    if (target) {
      this.targetX = target.x;
      this.targetY = target.y;

      // Check if caught fish
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size * 0.5 + target.size) {
        // Check if target is a carnivore (has resilience)
        if (target.beingEatenTimer !== undefined) {
          // Carnivore resilience - takes 2 seconds to kill
          target.beingEatenTimer += dt;
          if (target.beingEatenTimer >= target.beingEatenDuration) {
            // Check if Angie can revive
            if (angie && angie.canRevive()) {
              angie.revive(target);
            } else {
              // Finally kill the carnivore
              target.state = 'dying';
              target.deathTimer = 0;
              sound.play('death');
              spawnParticles(target.x, target.y, 'blood', 10);
              spawnParticles(target.x, target.y, 'bubble', 5);
            }
          }
        } else {
          // Check if Angie can revive before instant kill
          if (angie && angie.canRevive()) {
            angie.revive(target);
          } else {
            // Instant kill for other fish
            target.state = 'dying';
            target.deathTimer = 0;
            sound.play('death');
            spawnParticles(target.x, target.y, 'blood', 10);
            spawnParticles(target.x, target.y, 'bubble', 5);
          }
        }
      }
    }

    // Move toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    // Stay within bounds (loosely)
    this.x = Math.max(-20, Math.min(tankManager.bounds.right + 20, this.x));
    this.y = Math.max(-20, Math.min(tankManager.bounds.bottom + 20, this.y));
  }

  findNearestFish() {
    let nearest = null;
    let nearestDist = Infinity;

    // PRIORITY 1: Check ultravores first (aliens prioritize the large target)
    for (const uv of ultravores) {
      if (uv.state === 'dead' || uv.state === 'dying') continue;
      const dx = uv.x - this.x;
      const dy = uv.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = uv;
      }
    }

    // Check guppies
    for (const guppy of guppies) {
      if (guppy.state === 'dead' || guppy.state === 'dying') continue;
      const dx = guppy.x - this.x;
      const dy = guppy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = guppy;
      }
    }

    // Check carnivores too
    for (const carnivore of carnivores) {
      if (carnivore.state === 'dead' || carnivore.state === 'dying') continue;
      const dx = carnivore.x - this.x;
      const dy = carnivore.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = carnivore;
      }
    }

    // Check breeders too
    for (const breeder of breeders) {
      if (breeder.state === 'dead' || breeder.state === 'dying') continue;
      const dx = breeder.x - this.x;
      const dy = breeder.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = breeder;
      }
    }

    // Check starcatchers too
    for (const starcatcher of starcatchers) {
      if (starcatcher.state === 'dead' || starcatcher.state === 'dying') continue;
      const dx = starcatcher.x - this.x;
      const dy = starcatcher.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = starcatcher;
      }
    }

    // Check guppycrunchers
    for (const gc of guppycrunchers) {
      if (gc.state === 'dead' || gc.state === 'dying') continue;
      const dx = gc.x - this.x;
      const dy = gc.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = gc;
      }
    }

    // Check beetlemunchers
    for (const bm of beetlemunchers) {
      if (bm.state === 'dead' || bm.state === 'dying') continue;
      const dx = bm.x - this.x;
      const dy = bm.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = bm;
      }
    }

    return nearest;
  }

  takeDamage() {
    this.health--;
    this.hurtTimer = 0.1;

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    stats.aliensDefeated++;
    sound.play('victory');
    spawnParticles(this.x, this.y, 'sparkle', 25);
    // Drop 5 gold coins as reward
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      coins.push(new Coin(this.x + offsetX, this.y + offsetY, 'gold'));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Hurt flash
    if (this.hurtTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.hurtTimer * 50) * 0.5;
    }

    // Entry warp effect
    if (this.entering) {
      ctx.globalAlpha = this.entryTimer;
      const scale = 0.5 + this.entryTimer * 0.5;
      ctx.scale(scale, scale);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Wobble animation
    const wobbleY = Math.sin(this.wobble) * 3;

    // Body (blue alien blob)
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.ellipse(0, wobbleY, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker overlay
    ctx.fillStyle = 'rgba(0,0,100,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, wobbleY + 5, this.size * 0.9, this.size * 0.5, 0, 0, Math.PI);
    ctx.fill();

    // Tentacles
    ctx.fillStyle = '#4169e1';
    for (let i = 0; i < 4; i++) {
      const tentacleX = -20 + i * 15;
      const tentacleWobble = Math.sin(this.wobble + i) * 5;
      ctx.beginPath();
      ctx.ellipse(tentacleX, this.size * 0.5 + 10 + tentacleWobble, 6, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes (menacing)
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.ellipse(-15, wobbleY - 10, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, wobbleY - 10, 12, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (red, evil)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(-12, wobbleY - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, wobbleY - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Angry mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, wobbleY + 15, 15, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Teeth
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const toothX = -10 + i * 5;
      ctx.beginPath();
      ctx.moveTo(toothX, wobbleY + 20);
      ctx.lineTo(toothX + 2, wobbleY + 28);
      ctx.lineTo(toothX + 4, wobbleY + 20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Health bar
    if (!this.entering) {
      const barWidth = 60;
      const barHeight = 8;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 15;

      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Health
      const healthPercent = this.health / this.maxHealth;
      ctx.fillStyle = healthPercent > 0.3 ? '#ff4444' : '#ff0000';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      // Border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}

// ============================================
// Balrog - Tougher alien (100 HP), never gets full
// ============================================
class Balrog {
  constructor() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    const bounds = tankManager.bounds;
    const padding = tankManager.padding;

    switch (edge) {
      case 0:
        this.x = padding + Math.random() * (bounds.right - padding * 2);
        this.y = -60;
        break;
      case 1:
        this.x = bounds.right + 60;
        this.y = padding + Math.random() * (bounds.bottom - padding * 2);
        break;
      case 2:
        this.x = padding + Math.random() * (bounds.right - padding * 2);
        this.y = bounds.bottom + 60;
        break;
      case 3:
        this.x = -60;
        this.y = padding + Math.random() * (bounds.bottom - padding * 2);
        break;
    }

    this.targetX = bounds.right / 2;
    this.targetY = bounds.bottom / 2;
    this.speed = 60;  // Slower than Sylvester
    this.size = 65;   // Larger
    this.health = 100;
    this.maxHealth = 100;
    this.dead = false;
    this.facingLeft = false;
    this.type = 'balrog';

    this.wobble = 0;
    this.hurtTimer = 0;
    this.entering = true;
    this.entryTimer = 0;
  }

  update(dt) {
    this.wobble += dt * 4;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    if (this.entering) {
      this.entryTimer += dt;
      const targetPos = tankManager.getRandomPosition();
      this.targetX = targetPos.x;
      this.targetY = targetPos.y;

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.x += (dx / dist) * this.speed * 2 * dt;
        this.y += (dy / dist) * this.speed * 2 * dt;
      }

      if (this.entryTimer > 1 && tankManager.isWithinBounds(this.x, this.y)) {
        this.entering = false;
      }
      return;
    }

    // Find nearest fish to hunt (same as Sylvester)
    const target = this.findNearestFish();
    if (target) {
      this.targetX = target.x;
      this.targetY = target.y;

      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size * 0.5 + target.size) {
        // Balrog never gets full - keeps eating!
        if (target.beingEatenTimer !== undefined) {
          target.beingEatenTimer += dt;
          if (target.beingEatenTimer >= target.beingEatenDuration) {
            if (angie && angie.canRevive()) {
              angie.revive(target);
            } else {
              target.state = 'dying';
              target.deathTimer = 0;
              sound.play('death');
              spawnParticles(target.x, target.y, 'blood', 10);
              spawnParticles(target.x, target.y, 'bubble', 5);
            }
          }
        } else {
          if (angie && angie.canRevive()) {
            angie.revive(target);
          } else {
            target.state = 'dying';
            target.deathTimer = 0;
            sound.play('death');
            spawnParticles(target.x, target.y, 'blood', 10);
            spawnParticles(target.x, target.y, 'bubble', 5);
          }
        }
      }
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    this.x = Math.max(-20, Math.min(tankManager.bounds.right + 20, this.x));
    this.y = Math.max(-20, Math.min(tankManager.bounds.bottom + 20, this.y));
  }

  findNearestFish() {
    let nearest = null;
    let nearestDist = Infinity;

    // Check all fish types
    const allFish = [...ultravores, ...mobiuses, ...guppies, ...trouts, ...carnivores,
                     ...skellfins, ...breeders, ...starcatchers, ...guppycrunchers,
                     ...beetlemunchers, ...geotles];

    for (const fish of allFish) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = fish;
      }
    }
    return nearest;
  }

  takeDamage() {
    this.health--;
    this.hurtTimer = 0.1;
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    stats.aliensDefeated++;
    sound.play('victory');
    spawnParticles(this.x, this.y, 'sparkle', 30);
    // Drop 8 gold coins as reward (more than Sylvester)
    for (let i = 0; i < 8; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;
      coins.push(new Coin(this.x + offsetX, this.y + offsetY, 'gold'));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hurtTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.hurtTimer * 50) * 0.5;
    }

    if (this.entering) {
      ctx.globalAlpha = this.entryTimer;
      const scale = 0.5 + this.entryTimer * 0.5;
      ctx.scale(scale, scale);
    }

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    const wobbleY = Math.sin(this.wobble) * 4;

    // Body (dark red demon)
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.ellipse(0, wobbleY, this.size, this.size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#2f0000';
    ctx.beginPath();
    ctx.moveTo(-25, wobbleY - 40);
    ctx.lineTo(-35, wobbleY - 70);
    ctx.lineTo(-15, wobbleY - 45);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(25, wobbleY - 40);
    ctx.lineTo(35, wobbleY - 70);
    ctx.lineTo(15, wobbleY - 45);
    ctx.closePath();
    ctx.fill();

    // Fire aura effect
    ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
    for (let i = 0; i < 6; i++) {
      const flameX = -30 + i * 12;
      const flameY = Math.sin(this.wobble + i) * 8;
      ctx.beginPath();
      ctx.ellipse(flameX, this.size * 0.6 + flameY, 8, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes (fiery)
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.ellipse(-18, wobbleY - 10, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, wobbleY - 10, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-15, wobbleY - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(21, wobbleY - 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Mouth with fangs
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, wobbleY + 20, 20, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#fff';
    // Large fangs
    ctx.beginPath();
    ctx.moveTo(-15, wobbleY + 15);
    ctx.lineTo(-12, wobbleY + 35);
    ctx.lineTo(-9, wobbleY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, wobbleY + 15);
    ctx.lineTo(12, wobbleY + 35);
    ctx.lineTo(15, wobbleY + 15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Health bar
    if (!this.entering) {
      const barWidth = 80;
      const barHeight = 10;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 20;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const healthPercent = this.health / this.maxHealth;
      ctx.fillStyle = '#ff4500';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}

// ============================================
// Gus - Cannot be shot, must be fed 20 pellets
// ============================================
class Gus {
  constructor() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    const bounds = tankManager.bounds;
    const padding = tankManager.padding;

    switch (edge) {
      case 0:
        this.x = padding + Math.random() * (bounds.right - padding * 2);
        this.y = -50;
        break;
      case 1:
        this.x = bounds.right + 50;
        this.y = padding + Math.random() * (bounds.bottom - padding * 2);
        break;
      case 2:
        this.x = padding + Math.random() * (bounds.right - padding * 2);
        this.y = bounds.bottom + 50;
        break;
      case 3:
        this.x = -50;
        this.y = padding + Math.random() * (bounds.bottom - padding * 2);
        break;
    }

    this.targetX = bounds.right / 2;
    this.targetY = bounds.bottom / 2;
    this.speed = 70;
    this.size = 55;
    this.pelletsEaten = 0;
    this.pelletsNeeded = 20;
    this.dead = false;
    this.facingLeft = false;
    this.type = 'gus';

    this.wobble = 0;
    this.entering = true;
    this.entryTimer = 0;
    this.bloatScale = 1;  // Grows as it eats
  }

  update(dt) {
    this.wobble += dt * 5;

    if (this.entering) {
      this.entryTimer += dt;
      const targetPos = tankManager.getRandomPosition();
      this.targetX = targetPos.x;
      this.targetY = targetPos.y;

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.x += (dx / dist) * this.speed * 2 * dt;
        this.y += (dy / dist) * this.speed * 2 * dt;
      }

      if (this.entryTimer > 1 && tankManager.isWithinBounds(this.x, this.y)) {
        this.entering = false;
      }
      return;
    }

    // Gus hunts fish AND eats pellets
    const targetFish = this.findNearestFish();
    const targetPellet = this.findNearestPellet();

    // Prefer pellets if close
    let target = null;
    if (targetPellet && targetFish) {
      const pelletDist = Math.sqrt((targetPellet.x - this.x) ** 2 + (targetPellet.y - this.y) ** 2);
      const fishDist = Math.sqrt((targetFish.x - this.x) ** 2 + (targetFish.y - this.y) ** 2);
      target = pelletDist < fishDist * 0.7 ? targetPellet : targetFish;
    } else {
      target = targetPellet || targetFish;
    }

    if (target) {
      this.targetX = target.x;
      this.targetY = target.y;

      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if reached target
      if (dist < this.size * 0.5 * this.bloatScale + (target.size || 10)) {
        if (target.eaten !== undefined) {
          // It's a pellet
          target.eaten = true;
          this.eatPellet();
        } else {
          // It's a fish
          if (angie && angie.canRevive()) {
            angie.revive(target);
          } else {
            target.state = 'dying';
            target.deathTimer = 0;
            sound.play('death');
            spawnParticles(target.x, target.y, 'blood', 10);
          }
        }
      }
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = this.speed * (1 - this.pelletsEaten / this.pelletsNeeded * 0.5);  // Slows down as it bloats
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    this.x = Math.max(-20, Math.min(tankManager.bounds.right + 20, this.x));
    this.y = Math.max(-20, Math.min(tankManager.bounds.bottom + 20, this.y));
  }

  findNearestFish() {
    let nearest = null;
    let nearestDist = Infinity;

    const allFish = [...guppies, ...trouts, ...carnivores, ...skellfins,
                     ...breeders, ...starcatchers, ...beetlemunchers, ...geotles];

    for (const fish of allFish) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = fish;
      }
    }
    return nearest;
  }

  findNearestPellet() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const pellet of pellets) {
      if (pellet.eaten) continue;
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = pellet;
      }
    }
    return nearest;
  }

  eatPellet() {
    this.pelletsEaten++;
    this.bloatScale = 1 + (this.pelletsEaten / this.pelletsNeeded) * 0.8;
    sound.play('feed');
    spawnParticles(this.x, this.y, 'bubble', 3);

    if (this.pelletsEaten >= this.pelletsNeeded) {
      this.explode();
    }
  }

  explode() {
    this.dead = true;
    stats.aliensDefeated++;
    sound.play('victory');
    spawnParticles(this.x, this.y, 'sparkle', 40);
    spawnParticles(this.x, this.y, 'blood', 20);
    // Drop 10 gold coins
    for (let i = 0; i < 10; i++) {
      const offsetX = (Math.random() - 0.5) * 100;
      const offsetY = (Math.random() - 0.5) * 100;
      coins.push(new Coin(this.x + offsetX, this.y + offsetY, 'gold'));
    }
  }

  takeDamage() {
    // Gus cannot be damaged by clicking!
  }

  isClicked(clickX, clickY) {
    // Always return false - Gus cannot be clicked to damage
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.entering) {
      ctx.globalAlpha = this.entryTimer;
      const scale = 0.5 + this.entryTimer * 0.5;
      ctx.scale(scale, scale);
    }

    // Apply bloat scale
    ctx.scale(this.bloatScale, this.bloatScale);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    const wobbleY = Math.sin(this.wobble) * 3;

    // Body (green bloated creature)
    const greenIntensity = Math.min(255, 100 + this.pelletsEaten * 8);
    ctx.fillStyle = `rgb(${50 + this.pelletsEaten * 5}, ${greenIntensity}, 50)`;
    ctx.beginPath();
    ctx.ellipse(0, wobbleY, this.size, this.size * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spots
    ctx.fillStyle = 'rgba(0, 100, 0, 0.5)';
    for (let i = 0; i < 5; i++) {
      const spotX = -20 + i * 10;
      const spotY = -10 + Math.sin(i) * 15;
      ctx.beginPath();
      ctx.arc(spotX, wobbleY + spotY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dopey eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-15, wobbleY - 15, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, wobbleY - 15, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cross-eyed pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-10, wobbleY - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, wobbleY - 15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Open mouth (always hungry)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, wobbleY + 20, 18, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tongue
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.ellipse(0, wobbleY + 28, 8, 6, 0, 0, Math.PI);
    ctx.fill();

    ctx.restore();

    // Pellet counter bar (instead of health bar)
    if (!this.entering) {
      const barWidth = 70;
      const barHeight = 10;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size * this.bloatScale - 20;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const eatPercent = this.pelletsEaten / this.pelletsNeeded;
      ctx.fillStyle = eatPercent > 0.8 ? '#ff0000' : '#00ff00';
      ctx.fillRect(barX, barY, barWidth * eatPercent, barHeight);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.pelletsEaten}/${this.pelletsNeeded}`, this.x, barY - 3);
    }
  }
}

// ============================================
// Missile - Fired by Destructor
// ============================================
class Missile {
  constructor(x, y, targetFish) {
    this.x = x;
    this.y = y;
    this.target = targetFish;
    this.speed = 150;
    this.size = 10;
    this.health = 3;
    this.dead = false;
    this.trail = [];
  }

  update(dt) {
    // Add trail
    this.trail.push({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > 10) this.trail.shift();

    // Fade trail
    for (const point of this.trail) {
      point.alpha -= dt * 3;
    }
    this.trail = this.trail.filter(p => p.alpha > 0);

    // Home toward target
    if (this.target && this.target.state !== 'dying' && this.target.state !== 'dead') {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }

      // Hit target
      if (dist < this.size + (this.target.size || 20)) {
        if (angie && angie.canRevive()) {
          angie.revive(this.target);
        } else {
          this.target.state = 'dying';
          this.target.deathTimer = 0;
          sound.play('death');
          spawnParticles(this.target.x, this.target.y, 'blood', 8);
        }
        this.dead = true;
      }
    } else {
      // Lost target - continue in current direction then expire
      this.dead = true;
    }

    // Off screen
    if (this.x < -50 || this.x > tankManager.bounds.right + 50 ||
        this.y < -50 || this.y > tankManager.bounds.bottom + 50) {
      this.dead = true;
    }
  }

  takeDamage() {
    this.health--;
    if (this.health <= 0) {
      this.dead = true;
      sound.play('hit');
      spawnParticles(this.x, this.y, 'sparkle', 5);
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size + 10;  // Slightly larger hitbox
  }

  draw(ctx) {
    // Draw trail
    for (const point of this.trail) {
      ctx.globalAlpha = point.alpha * 0.5;
      ctx.fillStyle = '#ff4500';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Missile body
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warhead
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Fins
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(this.x - 8, this.y - 3);
    ctx.lineTo(this.x - 15, this.y - 10);
    ctx.lineTo(this.x - 8, this.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.x - 8, this.y + 3);
    ctx.lineTo(this.x - 15, this.y + 10);
    ctx.lineTo(this.x - 8, this.y);
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================
// Destructor - Sits at bottom, fires homing missiles
// ============================================
class Destructor {
  constructor() {
    const bounds = tankManager.bounds;
    this.x = bounds.right / 2;
    this.y = bounds.bottom + 60;  // Start below screen
    this.targetY = bounds.bottom - 30;  // Sit at bottom
    this.speed = 30;
    this.size = 70;
    this.health = 75;
    this.maxHealth = 75;
    this.dead = false;
    this.type = 'destructor';

    this.wobble = 0;
    this.hurtTimer = 0;
    this.entering = true;
    this.entryTimer = 0;
    this.fireTimer = 3;  // Fire every 3 seconds
    this.fireRate = 3;
  }

  update(dt, missiles) {
    this.wobble += dt * 3;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    if (this.entering) {
      this.entryTimer += dt;
      const dy = this.targetY - this.y;

      if (Math.abs(dy) > 5) {
        this.y += Math.sign(dy) * this.speed * dt;
      } else {
        this.entering = false;
      }
      return;
    }

    // Fire missiles at fish
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      const target = this.findTargetFish();
      if (target) {
        missiles.push(new Missile(this.x, this.y - 20, target));
        sound.play('alien');  // Missile launch sound
        spawnParticles(this.x, this.y - 20, 'sparkle', 5);
      }
    }

    // Slight horizontal movement
    this.x += Math.sin(this.wobble * 0.5) * 20 * dt;
    this.x = Math.max(50, Math.min(tankManager.bounds.right - 50, this.x));
  }

  findTargetFish() {
    const allFish = [...guppies, ...trouts, ...carnivores, ...skellfins,
                     ...ultravores, ...mobiuses, ...breeders, ...geotles,
                     ...starcatchers, ...beetlemunchers];

    const aliveFish = allFish.filter(f => f.state !== 'dead' && f.state !== 'dying');
    if (aliveFish.length === 0) return null;

    // Target random fish
    return aliveFish[Math.floor(Math.random() * aliveFish.length)];
  }

  takeDamage() {
    this.health--;
    this.hurtTimer = 0.1;
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.dead = true;
    stats.aliensDefeated++;
    sound.play('victory');
    spawnParticles(this.x, this.y, 'sparkle', 35);
    // Drop 7 gold coins
    for (let i = 0; i < 7; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 40;
      coins.push(new Coin(this.x + offsetX, this.y + offsetY - 30, 'gold'));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hurtTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.hurtTimer * 50) * 0.5;
    }

    if (this.entering) {
      ctx.globalAlpha = Math.min(1, this.entryTimer);
    }

    const wobbleX = Math.sin(this.wobble) * 2;

    // Tank treads
    ctx.fillStyle = '#333';
    ctx.fillRect(-35 + wobbleX, 15, 25, 20);
    ctx.fillRect(10 + wobbleX, 15, 25, 20);

    // Tread details
    ctx.fillStyle = '#222';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-33 + i * 6 + wobbleX, 17, 4, 16);
      ctx.fillRect(12 + i * 6 + wobbleX, 17, 4, 16);
    }

    // Main body (metal dome)
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.7, this.size * 0.5, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.7, 15, 0, 0, Math.PI);
    ctx.fill();

    // Cannon
    ctx.fillStyle = '#333';
    ctx.fillRect(-8, -40, 16, 35);

    // Cannon tip
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.arc(0, -45, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eye/sensor
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, -10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    // Rivets
    ctx.fillStyle = '#888';
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI + (i / 4) * Math.PI;
      const rx = Math.cos(angle) * this.size * 0.55;
      const ry = Math.sin(angle) * this.size * 0.35;
      ctx.beginPath();
      ctx.arc(rx, ry - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Health bar
    if (!this.entering) {
      const barWidth = 80;
      const barHeight = 10;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 10;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const healthPercent = this.health / this.maxHealth;
      ctx.fillStyle = '#666';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}

// ============================================
// Stinky the Snail (Pet)
// ============================================
class Stinky {
  constructor() {
    // Random starting position along the bottom
    this.x = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = tankManager.bounds.bottom - tankManager.padding;
    this.targetX = this.x;
    this.speed = 40;
    this.size = 25;
    this.facingLeft = false;

    // Animation
    this.wobble = 0;
    this.eyeOffset = 0;
  }

  update(dt) {
    this.wobble += dt * 3;
    this.eyeOffset = Math.sin(this.wobble * 2) * 2;

    // Find nearest floor coin to collect
    const floorCoin = this.findNearestFloorCoin();

    if (floorCoin) {
      this.targetX = floorCoin.x;

      // Check if reached coin
      const dx = floorCoin.x - this.x;
      if (Math.abs(dx) < this.size * 0.5) {
        // Collect the coin!
        gold += floorCoin.value;
        totalEarned += floorCoin.value;
        floorCoin.collected = true;
        sound.play('coin');
        spawnParticles(floorCoin.x, floorCoin.y, 'coin_sparkle', 6);
        updateGoldDisplay();
      }
    } else {
      // Wander along the bottom
      if (Math.abs(this.x - this.targetX) < 10) {
        // Pick new random target
        this.targetX = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
      }
    }

    // Move toward target (only horizontal)
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 2) {
      const moveSpeed = floorCoin ? this.speed * 1.5 : this.speed; // Faster when chasing coin
      this.x += Math.sign(dx) * moveSpeed * dt;
      this.facingLeft = dx < 0;
    }

    // Clamp to floor bounds
    this.x = Math.max(tankManager.padding, Math.min(tankManager.bounds.right - tankManager.padding, this.x));
  }

  findNearestFloorCoin() {
    let nearest = null;
    let nearestDist = Infinity;
    const floorY = tankManager.bounds.bottom - tankManager.padding;

    for (const coin of coins) {
      if (coin.collected) continue;
      // Only target coins on the floor (or very close to it)
      if (coin.y < floorY - 20) continue;

      const dx = coin.x - this.x;
      const dist = Math.abs(dx);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = coin;
      }
    }
    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Shell
    const shellColor = '#8b4513';
    const shellHighlight = '#d2691e';

    ctx.fillStyle = shellColor;
    ctx.beginPath();
    ctx.ellipse(0, -this.size * 0.3, this.size * 0.6, this.size * 0.5, 0, Math.PI, 0);
    ctx.fill();

    // Shell spiral pattern
    ctx.strokeStyle = shellHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-5, -this.size * 0.35, 8, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-5, -this.size * 0.35, 4, 0, Math.PI);
    ctx.stroke();

    // Body (slug part)
    const bodyWobble = Math.sin(this.wobble) * 2;
    ctx.fillStyle = '#ffd700'; // Yellow-gold body
    ctx.beginPath();
    ctx.ellipse(this.size * 0.3 + bodyWobble, 0, this.size * 0.5, this.size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(this.size * 0.6 + bodyWobble, -2, this.size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Eye stalks
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    // Left stalk
    ctx.beginPath();
    ctx.moveTo(this.size * 0.5 + bodyWobble, -8);
    ctx.lineTo(this.size * 0.45 + bodyWobble + this.eyeOffset, -18);
    ctx.stroke();
    // Right stalk
    ctx.beginPath();
    ctx.moveTo(this.size * 0.7 + bodyWobble, -8);
    ctx.lineTo(this.size * 0.75 + bodyWobble + this.eyeOffset, -18);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 0.45 + bodyWobble + this.eyeOffset, -18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.75 + bodyWobble + this.eyeOffset, -18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.size * 0.43 + bodyWobble + this.eyeOffset, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.73 + bodyWobble + this.eyeOffset, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.size * 0.6 + bodyWobble, 0, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Slime trail (subtle)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-this.size * 0.3, 5, this.size * 0.4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STINKY', this.x, this.y + 20);
  }
}

// ============================================
// Niko the Seahorse (Pearl Producer)
// ============================================
class Niko {
  constructor(x, y) {
    this.x = x || tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = y || tankManager.padding + Math.random() * (tankManager.bounds.bottom - tankManager.padding * 2);
    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = 25; // Slow, graceful movement
    this.size = 30;
    this.facingLeft = false;

    // Pearl production - drops pearl every 40 seconds
    this.pearlTimer = 40;

    // Animation
    this.bobPhase = Math.random() * Math.PI * 2;
    this.tailCurl = 0;
  }

  update(dt) {
    this.bobPhase += dt * 3;
    this.tailCurl = Math.sin(this.bobPhase) * 0.3;

    // Pearl drop timer (no hunger requirement - passive producer)
    this.pearlTimer -= dt;
    if (this.pearlTimer <= 0) {
      coins.push(new Coin(this.x, this.y + this.size * 0.5, 'pearl'));
      spawnParticles(this.x, this.y, 'sparkle', 8);
      sound.play('coin');
      this.pearlTimer = 40;
    }

    // Gentle vertical bobbing movement (seahorse style)
    this.targetY = this.y + Math.sin(this.bobPhase * 0.5) * 30 * dt;

    // Slow horizontal wander
    if (Math.abs(this.x - this.targetX) < 20) {
      this.targetX = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    this.x += dx * 0.02;
    this.y += Math.sin(this.bobPhase) * 20 * dt; // Bobbing motion

    if (Math.abs(dx) > 5) {
      this.facingLeft = dx < 0;
    }

    // Clamp to bounds
    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Bobbing effect
    const bobY = Math.sin(this.bobPhase) * 3;
    ctx.translate(0, bobY);

    // Purple/pink seahorse coloring
    const bodyColor = '#9932cc'; // Dark orchid
    const bellyColor = '#dda0dd'; // Plum

    // Curved body (S-shape)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.6);
    ctx.quadraticCurveTo(this.size * 0.3, -this.size * 0.3, this.size * 0.2, 0);
    ctx.quadraticCurveTo(this.size * 0.1, this.size * 0.3, -this.size * 0.1, this.size * 0.5);
    ctx.quadraticCurveTo(-this.size * 0.3, this.size * 0.3, -this.size * 0.2, 0);
    ctx.quadraticCurveTo(-this.size * 0.1, -this.size * 0.3, 0, -this.size * 0.6);
    ctx.fill();

    // Belly ridges
    ctx.fillStyle = bellyColor;
    for (let i = 0; i < 5; i++) {
      const segY = -this.size * 0.4 + i * (this.size * 0.2);
      ctx.beginPath();
      ctx.ellipse(0, segY, this.size * 0.15, this.size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snout (long tube)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.1, -this.size * 0.5);
    ctx.lineTo(this.size * 0.4, -this.size * 0.6);
    ctx.lineTo(this.size * 0.4, -this.size * 0.5);
    ctx.lineTo(this.size * 0.1, -this.size * 0.4);
    ctx.closePath();
    ctx.fill();

    // Crown/crest on head
    ctx.fillStyle = '#ff69b4'; // Hot pink
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.1, -this.size * 0.6);
    ctx.lineTo(-this.size * 0.05, -this.size * 0.8);
    ctx.lineTo(this.size * 0.05, -this.size * 0.75);
    ctx.lineTo(this.size * 0.1, -this.size * 0.6);
    ctx.closePath();
    ctx.fill();

    // Curled tail
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.1, this.size * 0.4);
    ctx.quadraticCurveTo(
      -this.size * 0.4, this.size * 0.6 + this.tailCurl * 10,
      -this.size * 0.3, this.size * 0.8 + this.tailCurl * 15
    );
    ctx.quadraticCurveTo(
      -this.size * 0.1, this.size * 0.7 + this.tailCurl * 10,
      -this.size * 0.2, this.size * 0.5
    );
    ctx.stroke();

    // Dorsal fin (back)
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.15, -this.size * 0.2);
    ctx.lineTo(-this.size * 0.35, -this.size * 0.1);
    ctx.lineTo(-this.size * 0.15, 0);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.size * 0.05, -this.size * 0.45, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 0.07, -this.size * 0.45, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label
    ctx.fillStyle = '#9932cc';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NIKO', this.x, this.y + this.size + 15);

    // Pearl ready indicator
    if (this.pearlTimer < 5) {
      ctx.fillStyle = '#faf0e6';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('\u25cf', this.x, this.y - this.size * 0.8);
    }
  }
}

// ============================================
// Zorf the Alien Pet (Food Dropper)
// ============================================
class Zorf {
  constructor(x, y) {
    this.x = x || tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = y || tankManager.padding + Math.random() * (tankManager.bounds.bottom - tankManager.padding * 2);
    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = 35;
    this.size = 28;
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Food dropping - drops pellet every 8 seconds (better than Feeder's 15-20s)
    this.dropTimer = 8;

    // Animation
    this.wobble = 0;
    this.antennaWobble = 0;
  }

  update(dt) {
    this.wobble += dt * 4;
    this.antennaWobble = Math.sin(this.wobble * 2) * 0.3;

    // Pellet drop timer (no hunger - always drops)
    this.dropTimer -= dt;
    if (this.dropTimer <= 0) {
      const offsetX = (Math.random() - 0.5) * 15;
      pellets.push(new Pellet(this.x + offsetX, this.y + this.size * 0.3));
      sound.play('feed');
      spawnParticles(this.x, this.y, 'bubble', 2);
      this.dropTimer = 8;
    }

    // Erratic alien movement
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const newPos = tankManager.getRandomPosition();
      this.targetX = newPos.x;
      this.targetY = newPos.y;
      this.wanderTimer = 1.5 + Math.random() * 2; // Quick direction changes
    }

    // Movement (slightly erratic)
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      // Add some wobble to movement
      const wobbleX = Math.sin(this.wobble * 3) * 10 * dt;
      const wobbleY = Math.cos(this.wobble * 2) * 10 * dt;
      this.x += (dx / dist) * this.speed * dt + wobbleX;
      this.y += (dy / dist) * this.speed * dt + wobbleY;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Float animation
    const floatY = Math.sin(this.wobble) * 3;
    ctx.translate(0, floatY);

    // Green alien blob body
    const bodyColor = '#32cd32'; // Lime green
    const darkColor = '#228b22'; // Forest green

    // Main body (blob shape)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker underside
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(0, this.size * 0.2, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI);
    ctx.fill();

    // Antenna (two, wobbly)
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    // Left antenna
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.3, -this.size * 0.5);
    ctx.quadraticCurveTo(
      -this.size * 0.4 + this.antennaWobble * 10,
      -this.size * 0.9,
      -this.size * 0.5 + this.antennaWobble * 15,
      -this.size
    );
    ctx.stroke();
    // Right antenna
    ctx.beginPath();
    ctx.moveTo(this.size * 0.3, -this.size * 0.5);
    ctx.quadraticCurveTo(
      this.size * 0.4 - this.antennaWobble * 10,
      -this.size * 0.9,
      this.size * 0.5 - this.antennaWobble * 15,
      -this.size
    );
    ctx.stroke();

    // Antenna tips (glowing balls)
    ctx.fillStyle = '#7fff00'; // Chartreuse
    ctx.beginPath();
    ctx.arc(-this.size * 0.5 + this.antennaWobble * 15, -this.size, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.5 - this.antennaWobble * 15, -this.size, 5, 0, Math.PI * 2);
    ctx.fill();

    // Big alien eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-this.size * 0.35, -this.size * 0.1, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.size * 0.35, -this.size * 0.1, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine (big, characteristic alien eyes)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-this.size * 0.4, -this.size * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.3, -this.size * 0.2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Small tentacles/legs underneath
    ctx.fillStyle = darkColor;
    for (let i = 0; i < 4; i++) {
      const tentX = -this.size * 0.4 + i * (this.size * 0.27);
      const tentWobble = Math.sin(this.wobble + i) * 3;
      ctx.beginPath();
      ctx.ellipse(tentX, this.size * 0.5 + tentWobble, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Label
    ctx.fillStyle = '#32cd32';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ZORF', this.x, this.y + this.size + 15);

    // Drop ready indicator
    if (this.dropTimer < 2) {
      ctx.fillStyle = '#7fff00';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Feeding...', this.x, this.y - this.size - 5);
    }
  }
}

// ============================================
// Itchy the Swordfish (Alien Attacker)
// ============================================
class Itchy {
  constructor(x, y) {
    this.x = x || tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = y || tankManager.padding + Math.random() * (tankManager.bounds.bottom - tankManager.padding * 2);
    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = 120; // Fast
    this.size = 40;
    this.facingLeft = false;
    this.wanderTimer = 0;
    this.state = 'wandering';

    // Attack mechanics
    this.attackTimer = 0;
    this.attackCooldown = 0.5; // 2 damage per second

    // Animation
    this.wobble = 0;
  }

  update(dt) {
    this.wobble += dt * 5;

    // PRIORITY: Attack alien if present
    if (alien && !alien.dead && !alien.entering) {
      this.state = 'attacking';
      this.targetX = alien.x;
      this.targetY = alien.y;

      // Check if close enough to attack
      const dx = alien.x - this.x;
      const dy = alien.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size + alien.size * 0.5) {
        // Attack the alien! (2 damage per second)
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          alien.takeDamage();
          alien.takeDamage(); // 2 damage
          spawnParticles(alien.x, alien.y, 'blood', 5);
          sound.play('hit');
          this.attackTimer = this.attackCooldown;
        }
      }
    } else {
      // Normal wandering when no alien
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
        this.wanderTimer = 2 + Math.random() * 2;
      }
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const currentSpeed = this.state === 'attacking' ? this.speed * 1.5 : this.speed;
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Blue swordfish coloring
    let bodyColor = '#4169e1'; // Royal blue
    let bellyColor = '#87ceeb'; // Sky blue

    if (this.state === 'attacking') {
      bodyColor = '#ff4500'; // Orange-red when attacking
      bellyColor = '#ffa500';
    }

    // Long, streamlined body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(this.size * 0.1, this.size * 0.05, this.size * 0.6, this.size * 0.12, 0, 0, Math.PI);
    ctx.fill();

    // Long pointed bill/sword
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(this.size * 1.6, -this.size * 0.05);
    ctx.lineTo(this.size * 1.6, this.size * 0.05);
    ctx.closePath();
    ctx.fill();

    // Bill stripe
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(this.size * 1.5, 0);
    ctx.stroke();

    // Dorsal fin (tall, sail-like)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.2, -this.size * 0.2);
    ctx.lineTo(0, -this.size * 0.6);
    ctx.lineTo(this.size * 0.3, -this.size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Tail - forked
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(-this.size * 1.3, -this.size * 0.3);
    ctx.lineTo(-this.size * 1.1, 0);
    ctx.lineTo(-this.size * 1.3, this.size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.size * 0.5, -this.size * 0.05, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 0.52, -this.size * 0.05, 3, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrow when attacking
    if (this.state === 'attacking') {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.size * 0.4, -this.size * 0.15);
      ctx.lineTo(this.size * 0.6, -this.size * 0.1);
      ctx.stroke();
    }

    // Speed lines when attacking
    if (this.state === 'attacking') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const lineY = -this.size * 0.15 + i * (this.size * 0.15);
        ctx.beginPath();
        ctx.moveTo(-this.size * 1.2 - i * 5, lineY);
        ctx.lineTo(-this.size * 1.5 - i * 5, lineY);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Label
    ctx.fillStyle = this.state === 'attacking' ? '#ff4500' : '#4169e1';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ITCHY', this.x, this.y + this.size * 0.4 + 15);

    // Attack indicator
    if (this.state === 'attacking') {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('ATTACKING!', this.x, this.y - this.size * 0.4 - 10);
    }
  }
}

// ============================================
// Clyde the Jellyfish (Coin Collector)
// ============================================
class Clyde {
  constructor(x, y) {
    this.x = x || tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = y || tankManager.padding + Math.random() * (tankManager.bounds.bottom - tankManager.padding * 2);
    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = 45;
    this.size = 25;

    // Animation
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.tentaclePhase = 0;
  }

  update(dt) {
    this.pulsePhase += dt * 3;
    this.tentaclePhase += dt * 4;

    // Find nearest coin ANYWHERE in tank (not just floor like Stinky)
    const nearestCoin = this.findNearestCoin();

    if (nearestCoin) {
      this.targetX = nearestCoin.x;
      this.targetY = nearestCoin.y;

      // Check if reached coin
      const dx = nearestCoin.x - this.x;
      const dy = nearestCoin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size) {
        // Collect the coin!
        gold += nearestCoin.value;
        totalEarned += nearestCoin.value;
        nearestCoin.collected = true;
        sound.play('coin');
        spawnParticles(nearestCoin.x, nearestCoin.y, 'coin_sparkle', 8);
        updateGoldDisplay();
      }
    } else {
      // Gentle floating wander
      if (Math.abs(this.x - this.targetX) < 30 && Math.abs(this.y - this.targetY) < 30) {
        const newPos = tankManager.getRandomPosition();
        this.targetX = newPos.x;
        this.targetY = newPos.y;
      }
    }

    // Pulsing movement (jellyfish style)
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      const pulseSpeed = this.speed * (0.7 + Math.sin(this.pulsePhase) * 0.3);
      this.x += (dx / dist) * pulseSpeed * dt;
      this.y += (dy / dist) * pulseSpeed * dt;
    }

    // Add gentle floating drift
    this.y += Math.sin(this.pulsePhase * 0.5) * 5 * dt;

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findNearestCoin() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const coin of coins) {
      if (coin.collected || coin.escaped) continue;

      const dx = coin.x - this.x;
      const dy = coin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = coin;
      }
    }
    return nearest;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Pulse animation affects size
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
    ctx.scale(pulseScale, pulseScale);

    // Translucent pink jellyfish bell
    ctx.fillStyle = 'rgba(255, 182, 193, 0.7)'; // Light pink, translucent
    ctx.beginPath();
    ctx.arc(0, 0, this.size, Math.PI, 0, false);
    ctx.quadraticCurveTo(this.size, this.size * 0.3, 0, this.size * 0.4);
    ctx.quadraticCurveTo(-this.size, this.size * 0.3, -this.size, 0);
    ctx.fill();

    // Inner bell pattern
    ctx.fillStyle = 'rgba(255, 105, 180, 0.4)'; // Darker pink
    ctx.beginPath();
    ctx.arc(0, -this.size * 0.1, this.size * 0.6, Math.PI, 0, false);
    ctx.quadraticCurveTo(this.size * 0.6, this.size * 0.1, 0, this.size * 0.2);
    ctx.quadraticCurveTo(-this.size * 0.6, this.size * 0.1, -this.size * 0.6, -this.size * 0.1);
    ctx.fill();

    // Bell edge glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, Math.PI, 0, false);
    ctx.stroke();

    // Trailing tentacles
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.8)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const tentX = -this.size * 0.6 + i * (this.size * 0.3);
      const tentWobble = Math.sin(this.tentaclePhase + i * 0.8) * 8;
      const tentLength = this.size * (0.8 + (i % 2) * 0.4);

      ctx.beginPath();
      ctx.moveTo(tentX, this.size * 0.3);
      ctx.quadraticCurveTo(
        tentX + tentWobble,
        this.size * 0.3 + tentLength * 0.5,
        tentX + tentWobble * 1.5,
        this.size * 0.3 + tentLength
      );
      ctx.stroke();
    }

    // Short frilly tentacles at bell edge
    ctx.strokeStyle = 'rgba(255, 192, 203, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + (i / 7) * Math.PI;
      const startX = Math.cos(angle) * this.size * 0.9;
      const startY = Math.sin(angle) * this.size * 0.3 + this.size * 0.2;
      const wobble = Math.sin(this.tentaclePhase + i) * 3;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + wobble, startY + this.size * 0.3);
      ctx.stroke();
    }

    ctx.restore();

    // Label
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CLYDE', this.x, this.y + this.size * 1.8);
  }
}

// ============================================
// Angie the Angel Fish (Reviver)
// ============================================
class Angie {
  constructor(x, y) {
    this.x = x || tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = y || tankManager.padding + Math.random() * (tankManager.bounds.bottom - tankManager.padding * 2);
    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = 40;
    this.size = 35;
    this.facingLeft = false;
    this.wanderTimer = 0;

    // Revive mechanic - can revive ONE fish per alien attack
    this.hasRevivedThisAttack = false;

    // Animation
    this.glowPhase = 0;
    this.wingPhase = 0;
  }

  update(dt) {
    this.glowPhase += dt * 2;
    this.wingPhase += dt * 6;

    // Reset revive flag when all aliens are defeated
    if (!hasActiveAlien()) {
      this.hasRevivedThisAttack = false;
    }

    // Gentle wandering
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const newPos = tankManager.getRandomPosition();
      this.targetX = newPos.x;
      this.targetY = newPos.y;
      this.wanderTimer = 3 + Math.random() * 3;
    }

    // Movement
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  // Called to revive a dying fish
  revive(fish) {
    if (this.hasRevivedThisAttack) return false;

    // Move to the fish
    this.x = fish.x;
    this.y = fish.y;

    // Revive the fish
    fish.state = 'wandering';
    fish.hunger = 20; // Give them some hunger buffer
    fish.deathTimer = 0;

    // Reset being eaten timer if it exists
    if (fish.beingEatenTimer !== undefined) {
      fish.beingEatenTimer = 0;
    }

    this.hasRevivedThisAttack = true;

    // Effects
    sound.play('evolve');
    spawnParticles(fish.x, fish.y, 'sparkle', 25);

    return true;
  }

  canRevive() {
    return !this.hasRevivedThisAttack && hasActiveAlien();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Glowing aura
    const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.15;
    const gradient = ctx.createRadialGradient(0, 0, this.size * 0.5, 0, 0, this.size * 1.5);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // White/cream angel fish body
    const bodyColor = '#fffaf0'; // Floral white
    const accentColor = '#ffd700'; // Gold

    // Main body - diamond/angular shape
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.6, 0);
    ctx.lineTo(0, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.4, 0);
    ctx.lineTo(0, this.size * 0.5);
    ctx.closePath();
    ctx.fill();

    // Wing/fin (angel wings)
    const wingOffset = Math.sin(this.wingPhase) * 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    // Top wing
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.2, -this.size * 0.3);
    ctx.quadraticCurveTo(
      -this.size * 0.5,
      -this.size * 0.8 - wingOffset,
      -this.size * 0.8,
      -this.size * 0.6 - wingOffset
    );
    ctx.quadraticCurveTo(
      -this.size * 0.4,
      -this.size * 0.4,
      -this.size * 0.2,
      -this.size * 0.3
    );
    ctx.fill();
    // Bottom wing
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.2, this.size * 0.3);
    ctx.quadraticCurveTo(
      -this.size * 0.5,
      this.size * 0.8 + wingOffset,
      -this.size * 0.8,
      this.size * 0.6 + wingOffset
    );
    ctx.quadraticCurveTo(
      -this.size * 0.4,
      this.size * 0.4,
      -this.size * 0.2,
      this.size * 0.3
    );
    ctx.fill();

    // Tail
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.4, 0);
    ctx.lineTo(-this.size * 0.7, -this.size * 0.2);
    ctx.lineTo(-this.size * 0.7, this.size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Gold accents/stripes
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.2, -this.size * 0.3);
    ctx.lineTo(this.size * 0.2, this.size * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.35);
    ctx.lineTo(0, this.size * 0.35);
    ctx.stroke();

    // Halo above head
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.size * 0.3, -this.size * 0.5 - 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Halo glow
    ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(this.glowPhase * 2) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(this.size * 0.3, -this.size * 0.5 - 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#87ceeb'; // Sky blue
    ctx.beginPath();
    ctx.arc(this.size * 0.35, -this.size * 0.1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 0.37, -this.size * 0.1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.6, 0);
    ctx.lineTo(0, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.4, 0);
    ctx.lineTo(0, this.size * 0.5);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

    // Label
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ANGIE', this.x, this.y + this.size * 0.7 + 15);

    // Revive status indicator
    if (hasActiveAlien()) {
      if (this.hasRevivedThisAttack) {
        ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('Revive Used', this.x, this.y - this.size * 0.7 - 5);
      } else {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('Revive Ready!', this.x, this.y - this.size * 0.7 - 5);
      }
    }
  }
}

// ============================================
// Alien System Helper Functions
// ============================================
function findNearestAlien(x, y) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const a of aliens) {
    if (a.dead || a.entering) continue;
    const dx = a.x - x;
    const dy = a.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = a;
    }
  }
  return nearest;
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
  return guppies.length + trouts.length + carnivores.length + skellfins.length +
         breeders.length + feeders.length + starcatchers.length +
         guppycrunchers.length + beetlemunchers.length + ultravores.length +
         mobiuses.length + crabs.length + wardens.length + seekers.length +
         anemones.length + geotles.length;
}

function getPrestigeBonus(type) {
  switch (type) {
    case 'gold': return 1 + (prestigeLevel * 0.1);      // +10% per level
    case 'speed': return 1 + (prestigeLevel * 0.05);    // +5% per level
    case 'coinDrop': return 1 + (prestigeLevel * 0.05); // +5% per level
    default: return 1;
  }
}

function checkAchievements() {
  // First Fish
  if (!unlockedAchievements.has('first_fish') && stats.fishBought >= 1) {
    unlockAchievement('first_fish');
  }

  // First Carnivore
  if (!unlockedAchievements.has('first_carnivore') &&
      (carnivores.length > 0 || skellfins.length > 0)) {
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
  guppies.length = 0;
  trouts.length = 0;
  carnivores.length = 0;
  skellfins.length = 0;
  breeders.length = 0;
  feeders.length = 0;
  starcatchers.length = 0;
  guppycrunchers.length = 0;
  beetlemunchers.length = 0;
  ultravores.length = 0;
  mobiuses.length = 0;
  crabs.length = 0;
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
function buyGuppy() {
  if (gold >= GUPPY_COST) {
    gold -= GUPPY_COST;
    const pos = tankManager.getRandomPosition();
    guppies.push(new Guppy(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function upgradeFood() {
  if (!foodUpgraded && gold >= FOOD_UPGRADE_COST) {
    gold -= FOOD_UPGRADE_COST;
    foodUpgraded = true;
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

function buyCarnivore() {
  if (gold >= CARNIVORE_COST) {
    gold -= CARNIVORE_COST;
    const pos = tankManager.getRandomPosition();
    carnivores.push(new Carnivore(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
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
  if (gold >= BREEDER_COST) {
    gold -= BREEDER_COST;
    const pos = tankManager.getRandomPosition();
    breeders.push(new Breeder(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
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
  if (gold >= FEEDER_COST) {
    gold -= FEEDER_COST;
    const pos = tankManager.getRandomPosition();
    feeders.push(new Feeder(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyStarcatcher() {
  if (gold >= STARCATCHER_COST) {
    gold -= STARCATCHER_COST;
    const pos = tankManager.getRandomPosition();
    starcatchers.push(new Starcatcher(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyGuppycruncher() {
  if (gold >= GUPPYCRUNCHER_COST) {
    gold -= GUPPYCRUNCHER_COST;
    guppycrunchers.push(new Guppycruncher());
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyBeetlemuncher() {
  if (gold >= BEETLEMUNCHER_COST) {
    gold -= BEETLEMUNCHER_COST;
    const pos = tankManager.getRandomPosition();
    beetlemunchers.push(new Beetlemuncher(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyUltravore() {
  if (gold >= ULTRAVORE_COST) {
    gold -= ULTRAVORE_COST;
    const pos = tankManager.getRandomPosition();
    ultravores.push(new Ultravore(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyWarden() {
  if (gold >= WARDEN_COST) {
    gold -= WARDEN_COST;
    const pos = tankManager.getRandomPosition();
    wardens.push(new WardenLamprey(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buySeeker() {
  if (gold >= SEEKER_COST) {
    gold -= SEEKER_COST;
    const pos = tankManager.getRandomPosition();
    seekers.push(new Seeker(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyAnemone() {
  if (gold >= ANEMONE_COST) {
    gold -= ANEMONE_COST;
    const pos = tankManager.getRandomPosition();
    anemones.push(new Anemone(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyGeotle() {
  if (gold >= GEOTLE_COST) {
    gold -= GEOTLE_COST;
    const pos = tankManager.getRandomPosition();
    geotles.push(new Geotle(pos.x, pos.y));
    stats.fishBought++;
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyNiko() {
  if (gold >= NIKO_COST && canBuyPet()) {
    gold -= NIKO_COST;
    const pos = tankManager.getRandomPosition();
    nikos.push(new Niko(pos.x, pos.y));
    sound.play('buy');
    updateGoldDisplay();
    updateAllPetButtons();
  }
}

function buyZorf() {
  if (gold >= ZORF_COST && canBuyPet()) {
    gold -= ZORF_COST;
    const pos = tankManager.getRandomPosition();
    zorfs.push(new Zorf(pos.x, pos.y));
    sound.play('buy');
    updateGoldDisplay();
    updateAllPetButtons();
  }
}

function buyItchy() {
  if (gold >= ITCHY_COST && canBuyPet()) {
    gold -= ITCHY_COST;
    const pos = tankManager.getRandomPosition();
    itchys.push(new Itchy(pos.x, pos.y));
    sound.play('buy');
    updateGoldDisplay();
    updateAllPetButtons();
  }
}

function buyClyde() {
  if (gold >= CLYDE_COST && canBuyPet()) {
    gold -= CLYDE_COST;
    const pos = tankManager.getRandomPosition();
    clydes.push(new Clyde(pos.x, pos.y));
    sound.play('buy');
    updateGoldDisplay();
    updateAllPetButtons();
  }
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
window.buyGuppy = buyGuppy;
window.upgradeFood = upgradeFood;
window.buyCarnivore = buyCarnivore;
window.buyStinky = buyStinky;
window.buyBreeder = buyBreeder;
window.buyLaser = buyLaser;
window.buyFeeder = buyFeeder;
window.buyStarcatcher = buyStarcatcher;
window.buyGuppycruncher = buyGuppycruncher;
window.buyBeetlemuncher = buyBeetlemuncher;
window.buyUltravore = buyUltravore;
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
  const hasFish = guppies.length > 0 || trouts.length > 0 || carnivores.length > 0 ||
                  skellfins.length > 0 || breeders.length > 0 || geotles.length > 0 ||
                  starcatchers.length > 0 || ultravores.length > 0 || mobiuses.length > 0;

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

  // Update and draw pellets
  for (const pellet of pellets) {
    pellet.update(dt);
    pellet.draw(ctx);
  }

  // Update and draw coins
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.update(dt);
    if (coin.collected || coin.escaped) {
      coins.splice(i, 1);
    } else {
      coin.draw(ctx);
    }
  }

  // Update and draw guppies
  for (let i = guppies.length - 1; i >= 0; i--) {
    const guppy = guppies[i];
    guppy.update(dt);
    if (guppy.state === 'dead') {
      guppies.splice(i, 1);
    } else {
      guppy.draw(ctx);
    }
  }

  // Update and draw carnivores
  for (let i = carnivores.length - 1; i >= 0; i--) {
    const carnivore = carnivores[i];
    carnivore.update(dt);
    if (carnivore.state === 'dead') {
      carnivores.splice(i, 1);
    } else {
      carnivore.draw(ctx);
    }
  }

  // Update and draw breeders
  for (let i = breeders.length - 1; i >= 0; i--) {
    const breeder = breeders[i];
    breeder.update(dt);
    if (breeder.state === 'dead') {
      breeders.splice(i, 1);
    } else {
      breeder.draw(ctx);
    }
  }

  // Update and draw feeders
  for (const feeder of feeders) {
    feeder.update(dt);
    feeder.draw(ctx);
  }

  // Update and draw starcatchers
  for (let i = starcatchers.length - 1; i >= 0; i--) {
    const starcatcher = starcatchers[i];
    starcatcher.update(dt);
    if (starcatcher.state === 'dead') {
      starcatchers.splice(i, 1);
    } else {
      starcatcher.draw(ctx);
    }
  }

  // Update and draw guppycrunchers
  for (let i = guppycrunchers.length - 1; i >= 0; i--) {
    guppycrunchers[i].update(dt);
    if (guppycrunchers[i].state === 'dead') {
      guppycrunchers.splice(i, 1);
    } else {
      guppycrunchers[i].draw(ctx);
    }
  }

  // Update and draw beetles
  for (let i = beetles.length - 1; i >= 0; i--) {
    beetles[i].update(dt);
    if (beetles[i].collected) {
      beetles.splice(i, 1);
    } else {
      beetles[i].draw(ctx);
    }
  }

  // Update and draw beetlemunchers
  for (let i = beetlemunchers.length - 1; i >= 0; i--) {
    beetlemunchers[i].update(dt);
    if (beetlemunchers[i].state === 'dead') {
      beetlemunchers.splice(i, 1);
    } else {
      beetlemunchers[i].draw(ctx);
    }
  }

  // Update and draw ultravores
  for (let i = ultravores.length - 1; i >= 0; i--) {
    ultravores[i].update(dt);
    if (ultravores[i].state === 'dead') {
      ultravores.splice(i, 1);
    } else {
      ultravores[i].draw(ctx);
    }
  }

  // Update and draw trouts (sprite-based)
  for (let i = trouts.length - 1; i >= 0; i--) {
    trouts[i].update(dt);
    if (trouts[i].state === 'dead') {
      trouts.splice(i, 1);
    } else {
      trouts[i].draw(ctx);
    }
  }

  // Update and draw skellfins (sprite-based)
  for (let i = skellfins.length - 1; i >= 0; i--) {
    skellfins[i].update(dt);
    if (skellfins[i].state === 'dead') {
      skellfins.splice(i, 1);
    } else {
      skellfins[i].draw(ctx);
    }
  }

  // Update and draw mobiuses (sprite-based)
  for (let i = mobiuses.length - 1; i >= 0; i--) {
    mobiuses[i].update(dt);
    if (mobiuses[i].state === 'dead') {
      mobiuses.splice(i, 1);
    } else {
      mobiuses[i].draw(ctx);
    }
  }

  // Update and draw crabs (sprite-based)
  for (let i = crabs.length - 1; i >= 0; i--) {
    crabs[i].update(dt);
    if (crabs[i].state === 'dead') {
      crabs.splice(i, 1);
    } else {
      crabs[i].draw(ctx);
    }
  }

  // Update and draw wardens (Phase 18 - alien attackers)
  for (const warden of wardens) {
    warden.update(dt);
    warden.draw(ctx);
  }

  // Update and draw seekers (Phase 18 - coin collectors)
  for (const seeker of seekers) {
    seeker.update(dt);
    seeker.draw(ctx);
  }

  // Update and draw anemones (Phase 18 - healers)
  for (const anemone of anemones) {
    anemone.update(dt);
    anemone.draw(ctx);
  }

  // Update and draw geotles (Phase 18 - breeders)
  for (let i = geotles.length - 1; i >= 0; i--) {
    geotles[i].update(dt);
    if (geotles[i].state === 'dead') {
      geotles.splice(i, 1);
    } else {
      geotles[i].draw(ctx);
    }
  }

  // Update and draw Stinkies (pets)
  for (const stinky of stinkies) {
    stinky.update(dt);
    stinky.draw(ctx);
  }

  // Update and draw Nikos (seahorse pets)
  for (const niko of nikos) {
    niko.update(dt);
    niko.draw(ctx);
  }

  // Update and draw Zorfs (alien pets)
  for (const zorf of zorfs) {
    zorf.update(dt);
    zorf.draw(ctx);
  }

  // Update and draw Itchys (swordfish pets)
  for (const itchy of itchys) {
    itchy.update(dt);
    itchy.draw(ctx);
  }

  // Update and draw Clydes (jellyfish pets)
  for (const clyde of clydes) {
    clyde.update(dt);
    clyde.draw(ctx);
  }

  // Update and draw Angie (angel fish pet)
  if (angie) {
    angie.update(dt);
    angie.draw(ctx);
  }

  // Update and draw aliens (supports multiple)
  for (let i = aliens.length - 1; i >= 0; i--) {
    const a = aliens[i];
    if (a.dead) {
      aliens.splice(i, 1);
    } else {
      // Destructor needs missiles array passed to update
      if (a.type === 'destructor') {
        a.update(dt, missiles);
      } else {
        a.update(dt);
      }
      a.draw(ctx);
    }
  }

  // Legacy single alien compatibility
  if (alien && alien.dead) {
    alien = null;
  }
  if (aliens.length === 0 && alien === null) {
    hideAlienWarning();
  }

  // Update and draw missiles
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];
    m.update(dt);
    if (m.dead) {
      missiles.splice(i, 1);
    } else {
      m.draw(ctx);
    }
  }

  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.update(dt);
    if (particle.dead) {
      particles.splice(i, 1);
    } else {
      particle.draw(ctx);
    }
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
    { name: 'Guppy/Trout', count: guppies.length + trouts.length, color: '#ffa500' },
    { name: 'Carnivore', count: carnivores.length + skellfins.length, color: '#8b0000' },
    { name: 'Breeder', count: breeders.length, color: '#ff69b4' },
    { name: 'Feeder', count: feeders.length, color: '#ff8c00' },
    { name: 'Starcatcher', count: starcatchers.length, color: '#9370db' },
    { name: 'Cruncher', count: guppycrunchers.length + crabs.length, color: '#ff6347' },
    { name: 'Muncher', count: beetlemunchers.length, color: '#32cd32' },
    { name: 'Ultravore', count: ultravores.length + mobiuses.length, color: '#708090' },
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
