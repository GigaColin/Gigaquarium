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

// Fish costs from fishData.js
const TROUT_COST = FISH_SPECIES.trout.cost;           // $100
const SKELLFIN_COST = FISH_SPECIES.skellfin.cost;     // $2500
const MOBIUS_COST = FISH_SPECIES.mobius_dickens.cost; // $8000
const CRAB_COST = FISH_SPECIES.crab.cost;             // $800
const WARDEN_COST = FISH_SPECIES.warden_lamprey.cost; // $2000
const SEEKER_COST = FISH_SPECIES.seeker.cost;         // $5000
const ANEMONE_COST = FISH_SPECIES.anemone.cost;       // $5000
const GEOTLE_COST = FISH_SPECIES.geotle.cost;         // $4000

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
let alienSpawnTimer = 60 + Math.random() * 30; // First spawn in 60-90 seconds
const ALIEN_SPAWN_MIN = 60;
const ALIEN_SPAWN_MAX = 90;

// Particle system
const particles = [];

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
    foodUpgraded: foodUpgraded,
    laserUpgraded: laserUpgraded,
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

    // Restore gold
    gold = saveData.gold || 100;
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
      // Hungry speed boost - 30% faster when hunger > 50
      const currentSpeed = this.hunger > 50 ? this.speed * 1.3 : this.speed;
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
      this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
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

    // Hunger increases slower than guppies
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
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
      // Hungry speed boost - 30% faster when hunger > 50
      const currentSpeed = this.hunger > 50 ? this.speed * 1.3 : this.speed;
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
// Guppycruncher Class (Crab that eats small guppies)
// ============================================
class Guppycruncher {
  constructor() {
    this.x = tankManager.padding + Math.random() * (tankManager.bounds.right - tankManager.padding * 2);
    this.y = tankManager.bounds.bottom - tankManager.padding;
    this.groundY = this.y; // Remember ground level
    this.targetX = this.x;
    this.speed = 50;
    this.size = 35;
    this.hunger = 0;
    this.state = 'wandering';
    this.facingLeft = false;

    // Death animation
    this.deathTimer = 0;

    // Beetle production - drops beetle every 15 seconds when fed
    this.coinTimer = 15;

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
      sound.play('death');
      spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Beetle production when well-fed
    if (this.hunger < 50) {
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        beetles.push(new Beetle(this.x, this.y));
        spawnParticles(this.x, this.y, 'sparkle', 3);
        this.coinTimer = 15;
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

  findSmallGuppy() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const guppy of guppies) {
      if (guppy.stage !== 'small') continue;
      if (guppy.state === 'dead' || guppy.state === 'dying') continue;

      const dx = guppy.x - this.x;
      const dy = guppy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only target guppies above and within range
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

    // Color based on state
    let bodyColor = '#ff6347'; // Tomato red
    let shellColor = '#cd5c5c'; // Indian red
    if (this.state === 'dying') {
      bodyColor = '#808080';
      shellColor = '#606060';
    } else if (this.state === 'hunting') {
      bodyColor = '#ff4500'; // Orange red when hunting
      shellColor = '#dc143c';
    } else if (this.hunger > 60) {
      bodyColor = '#8b0000'; // Dark red when hungry
      shellColor = '#800000';
    }

    // Legs (6 total, animated)
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const legOffset = (i - 1) * this.size * 0.4;
      const legWiggle = Math.sin(this.legPhase + i * 1.2) * 5;

      // Left leg
      ctx.beginPath();
      ctx.moveTo(legOffset - this.size * 0.3, 0);
      ctx.lineTo(legOffset - this.size * 0.6 - legWiggle, this.size * 0.3);
      ctx.lineTo(legOffset - this.size * 0.5 - legWiggle, this.size * 0.5);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(legOffset + this.size * 0.3, 0);
      ctx.lineTo(legOffset + this.size * 0.6 + legWiggle, this.size * 0.3);
      ctx.lineTo(legOffset + this.size * 0.5 + legWiggle, this.size * 0.5);
      ctx.stroke();
    }

    // Shell body
    ctx.fillStyle = shellColor;
    ctx.beginPath();
    ctx.ellipse(0, -this.size * 0.2, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell segments
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -this.size * 0.2, this.size * 0.5, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Claws
    const clawAngle = 0.3 + this.clawOpen * 0.4;
    ctx.fillStyle = bodyColor;

    // Left claw
    ctx.save();
    ctx.translate(-this.size * 0.7, -this.size * 0.1);
    ctx.rotate(-0.3);
    // Claw arm
    ctx.fillRect(-15, -4, 20, 8);
    // Claw pincer (top)
    ctx.save();
    ctx.rotate(-clawAngle);
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-30, -8);
    ctx.lineTo(-25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Claw pincer (bottom)
    ctx.save();
    ctx.rotate(clawAngle);
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-30, 8);
    ctx.lineTo(-25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Right claw
    ctx.save();
    ctx.translate(this.size * 0.7, -this.size * 0.1);
    ctx.rotate(0.3);
    // Claw arm
    ctx.fillRect(-5, -4, 20, 8);
    // Claw pincer (top)
    ctx.save();
    ctx.rotate(clawAngle);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(30, -8);
    ctx.lineTo(25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Claw pincer (bottom)
    ctx.save();
    ctx.rotate(-clawAngle);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(30, 8);
    ctx.lineTo(25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Eye stalks
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.2, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.25, -this.size * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.size * 0.2, -this.size * 0.5);
    ctx.lineTo(this.size * 0.25, -this.size * 0.9);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-this.size * 0.25, -this.size * 0.9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.25, -this.size * 0.9, 5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-this.size * 0.27, -this.size * 0.92, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.23, -this.size * 0.92, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label
    ctx.fillStyle = '#ff6347';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CRUNCHER', this.x, this.y + this.size * 0.7 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      ctx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('HUNGRY!', this.x, this.y - this.size - 10);
    }

    // Beetle ready indicator
    if (this.hunger < 50 && this.coinTimer < 3) {
      ctx.fillStyle = '#3d2b1f';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('\u2022', this.x, this.y - this.size * 0.8);
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

    // Reset revive flag when alien is defeated
    if (!alien || alien.dead) {
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
    return !this.hasRevivedThisAttack && alien && !alien.dead;
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
    if (alien && !alien.dead) {
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
// Pet System Helper Functions
// ============================================
function getPetCount() {
  return stinkies.length + nikos.length + zorfs.length +
         itchys.length + clydes.length + (angie ? 1 : 0);
}

function canBuyPet() {
  return getPetCount() < MAX_PETS;
}

function updateAllPetButtons() {
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
// Input Handling
// ============================================
canvas.addEventListener('click', (e) => {
  // Initialize sound on first click (required by browsers)
  sound.init();

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // COMBAT MODE: If alien present, clicks damage alien instead of feeding
  if (alien && !alien.dead) {
    if (alien.isClicked(x, y)) {
      // Laser upgrade deals 3 damage instead of 1
      const damage = laserUpgraded ? 3 : 1;
      for (let d = 0; d < damage; d++) {
        alien.takeDamage();
      }
      sound.play('hit');
      spawnParticles(x, y, 'blood', laserUpgraded ? 15 : 8);
    }
    // Still allow coin collection during combat
    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].isClicked(x, y)) {
        gold += coins[i].value;
        coins[i].collected = true;
        sound.play('coin');
        spawnParticles(coins[i].x, coins[i].y, 'coin_sparkle', 8);
        updateGoldDisplay();
        return;
      }
    }
    return; // No food dropping during combat!
  }

  // Check for coin collection first
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].isClicked(x, y)) {
      gold += coins[i].value;
      coins[i].collected = true;
      sound.play('coin');
      spawnParticles(coins[i].x, coins[i].y, 'coin_sparkle', 8);
      updateGoldDisplay();
      return; // Don't spawn pellet when collecting coin
    }
  }

  // Check for beetle collection
  for (let i = beetles.length - 1; i >= 0; i--) {
    if (beetles[i].isClicked(x, y)) {
      gold += BEETLE_VALUE;
      beetles[i].collected = true;
      sound.play('coin');
      spawnParticles(beetles[i].x, beetles[i].y, 'coin_sparkle', 6);
      updateGoldDisplay();
      return;
    }
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
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyStarcatcher() {
  if (gold >= STARCATCHER_COST) {
    gold -= STARCATCHER_COST;
    const pos = tankManager.getRandomPosition();
    starcatchers.push(new Starcatcher(pos.x, pos.y));
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyGuppycruncher() {
  if (gold >= GUPPYCRUNCHER_COST) {
    gold -= GUPPYCRUNCHER_COST;
    guppycrunchers.push(new Guppycruncher());
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyBeetlemuncher() {
  if (gold >= BEETLEMUNCHER_COST) {
    gold -= BEETLEMUNCHER_COST;
    const pos = tankManager.getRandomPosition();
    beetlemunchers.push(new Beetlemuncher(pos.x, pos.y));
    sound.play('buy');
    updateGoldDisplay();
  }
}

function buyUltravore() {
  if (gold >= ULTRAVORE_COST) {
    gold -= ULTRAVORE_COST;
    const pos = tankManager.getRandomPosition();
    ultravores.push(new Ultravore(pos.x, pos.y));
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
function init() {
  // Try to load saved game
  const loaded = loadGame();

  // If no save, spawn 2 free guppies
  if (!loaded) {
    for (let i = 0; i < 2; i++) {
      const pos = tankManager.getRandomPosition();
      guppies.push(new Guppy(pos.x, pos.y));
    }
  }
}

// ============================================
// Game Loop
// ============================================
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Alien spawn timer
  if (!alien && guppies.length > 0) {
    alienSpawnTimer -= dt;
    if (alienSpawnTimer <= 0) {
      alien = new Sylvester();
      sound.play('alien');
      showAlienWarning();
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

  // Update and draw alien
  if (alien) {
    if (alien.dead) {
      alien = null;
      alienSpawnTimer = ALIEN_SPAWN_MIN + Math.random() * (ALIEN_SPAWN_MAX - ALIEN_SPAWN_MIN);
      hideAlienWarning();
    } else {
      alien.update(dt);
      alien.draw(ctx);
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

  // Draw combat mode overlay if alien present
  if (alien && !alien.dead && !alien.entering) {
    drawCombatOverlay();
  }

  requestAnimationFrame(gameLoop);
}

function drawCombatOverlay() {
  // Red border flash
  ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Combat text
  ctx.fillStyle = '#ff0000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('CLICK THE ALIEN TO ATTACK!', canvas.width / 2, 30);
}

function showAlienWarning() {
  const warning = document.getElementById('alienWarning');
  if (warning) warning.style.display = 'block';
}

function hideAlienWarning() {
  const warning = document.getElementById('alienWarning');
  if (warning) warning.style.display = 'none';
}

// Start the game
init();
requestAnimationFrame(gameLoop);
