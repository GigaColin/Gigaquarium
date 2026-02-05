// Gigaquarium - Fish Module
// Core fish classes: Trout, Skellfin, MobiusDickens
// Support fish classes: Breeder, Feeder, Starcatcher, Beetlemuncher, Crab, Geotle

import { FISH_SPECIES, SIZE_CONFIG, RARITY_COLORS } from '../fishData.js';

// Game context - set by main.js via setGameContext()
let ctx = null;

/**
 * Initialize the game context for fish classes to access shared state
 * @param {object} gameContext - Object containing:
 *   - tankManager: TankManager instance
 *   - imageCache: Object with loaded sprites
 *   - arrays: { coins, pellets, trouts, skellfins, anemones, breeders, feeders, starcatchers, beetlemunchers, crabs, geotles, beetles }
 *   - Coin: Coin class constructor
 *   - Pellet: Pellet class constructor
 *   - Trout: Trout class constructor (for spawning)
 *   - getAlien: getter function returning current alien
 *   - sound: SoundSystem instance
 *   - spawnParticles: function(x, y, type, count)
 *   - stats: statistics object
 *   - findNearest: utility function
 *   - getPrestigeBonus: function(type)
 *   - getGold: function returning current gold
 *   - setGold: function(amount) to set gold
 *   - addGold: function(amount) to add gold
 *   - getTotalEarned: function returning total earned
 *   - addTotalEarned: function(amount) to add to total earned
 *   - updateGoldDisplay: function to update UI
 */
export function setGameContext(gameContext) {
  ctx = gameContext;
}

// ============================================
// Trout Class (Basic Fish - Sprite Based)
// ============================================
export class Trout {
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    this.hunger += dt * 5;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Check for nearby Anemone healing
    for (const anemone of ctx.arrays.anemones) {
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
        const newPos = ctx.tankManager.getRandomPosition();
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
      const currentSpeed = baseSpeed * ctx.getPrestigeBonus('speed');
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;

    this.checkPelletCollision();
    this.checkCoinDrop(dt);
  }

  checkCoinDrop(dt) {
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      // Drop a coin
      ctx.arrays.coins.push(new ctx.Coin(this.x, this.y, this.coinType));
      const [minInterval, maxInterval] = FISH_SPECIES.trout.coinDropInterval;
      // Apply prestige bonus (faster drops = lower timer)
      const baseTimer = minInterval + Math.random() * (maxInterval - minInterval);
      this.coinTimer = baseTimer / ctx.getPrestigeBonus('coinDrop');
    }
  }

  findNearestPellet() {
    return ctx.findNearest(this, ctx.arrays.pellets);
  }

  checkPelletCollision() {
    // Satiation cap - ignore pellets when full (hunger < 10)
    if (this.hunger < 10) return;

    for (let i = ctx.arrays.pellets.length - 1; i >= 0; i--) {
      const pellet = ctx.arrays.pellets[i];
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.size / 2 + pellet.size) {
        ctx.arrays.pellets.splice(i, 1);
        // Upgraded pellets give bonus satiation
        this.hunger = pellet.upgraded ? -25 : 0;
        this.state = 'wandering';
        break;
      }
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    // Apply death animation
    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI); // Flip upside down
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3); // Fade out
    }

    // Flip sprite based on facing direction
    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded, otherwise fallback to colored rectangle
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored fish
      drawCtx.fillStyle = this.state === 'dying' ? '#808080' : (this.hunger > 50 ? '#ff6347' : '#ffa500');
      drawCtx.beginPath();
      drawCtx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      drawCtx.fill();
    }

    drawCtx.restore();

    // Hunger warning indicator
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.textAlign = 'center';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 5);
    }

    // Label
    drawCtx.fillStyle = '#ffa500';
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('TROUT', this.x, this.y + this.size / 2 + 12);
  }
}

// ============================================
// Skellfin Class (Carnivore - Sprite Based)
// ============================================
export class Skellfin {
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
    this._coinType = FISH_SPECIES.skellfin.coinType;
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slower than guppies
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 8);
      return;
    }

    // Coin drop timer (always drops diamonds when alive)
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      ctx.arrays.coins.push(new ctx.Coin(this.x, this.y, 'diamond'));
      this.coinTimer = 15;
    }

    const alien = ctx.getAlien();

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
          ctx.spawnParticles(alien.x, alien.y, 'blood', 3);
          this.attackTimer = this.attackCooldown;
        }
      }
    }
    // PRIORITY 2: Hunt trouts when hungry (no alien present)
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
        const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findTrout() {
    let nearest = null;
    let nearestDist = Infinity;
    // Hunt from trouts array (new sprite-based fish)
    for (const trout of ctx.arrays.trouts) {
      if (trout.state === 'dead' || trout.state === 'dying') continue;

      const dx = trout.x - this.x;
      const dy = trout.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = trout;
      }
    }
    return nearest;
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored fish
      let bodyColor = this.state === 'dying' ? '#808080' :
                      this.state === 'attacking' ? '#4169e1' :
                      this.state === 'hunting' ? '#8b0000' : '#228b22';
      drawCtx.fillStyle = bodyColor;
      drawCtx.beginPath();
      drawCtx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      drawCtx.fill();
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#9c27b0';
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('SKELLFIN', this.x, this.y + this.size / 2 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 12px Arial';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 10);
    }

    // Being eaten indicator (resilience bar)
    if (this.beingEatenTimer > 0 && this.state !== 'dying') {
      const barWidth = 40;
      const barHeight = 6;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size / 2 - 25;
      const progress = this.beingEatenTimer / this.beingEatenDuration;

      drawCtx.fillStyle = '#333';
      drawCtx.fillRect(barX, barY, barWidth, barHeight);
      drawCtx.fillStyle = `rgb(${Math.floor(255 * progress)}, ${Math.floor(100 * (1 - progress))}, 0)`;
      drawCtx.fillRect(barX, barY, barWidth * progress, barHeight);
      drawCtx.strokeStyle = '#fff';
      drawCtx.lineWidth = 1;
      drawCtx.strokeRect(barX, barY, barWidth, barHeight);
      drawCtx.fillStyle = '#ff0000';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('DANGER!', this.x, barY - 3);
    }
  }
}

// ============================================
// MobiusDickens Class (Apex Predator - Sprite Based)
// ============================================
export class MobiusDickens {
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slower than guppies (apex predator)
    this.hunger += dt * 2;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 12);
      return;
    }

    // Coin drop timer (drops chests when alive)
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      // Create a chest coin with the correct value
      const chest = new ctx.Coin(this.x, this.y, this.coinType);
      chest.value = this.coinValue; // Override with species-specific value
      ctx.arrays.coins.push(chest);
      const [minInterval, maxInterval] = FISH_SPECIES.mobius_dickens.coinDropInterval;
      this.coinTimer = minInterval + Math.random() * (maxInterval - minInterval);
    }

    const alien = ctx.getAlien();

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
          ctx.spawnParticles(alien.x, alien.y, 'blood', 5);
          this.attackTimer = this.attackCooldown;
        }
      }
    }
    // PRIORITY 2: Hunt skellfins when hungry (no alien present)
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
        const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findSkellfin() {
    let nearest = null;
    let nearestDist = Infinity;
    // Hunt from skellfins array
    for (const skellfin of ctx.arrays.skellfins) {
      if (skellfin.state === 'dead' || skellfin.state === 'dying') continue;

      const dx = skellfin.x - this.x;
      const dy = skellfin.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = skellfin;
      }
    }
    return nearest;
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored fish
      let bodyColor = this.state === 'dying' ? '#505050' :
                      this.state === 'attacking' ? '#4169e1' :
                      this.state === 'hunting' ? '#2f4f4f' : '#708090';
      drawCtx.fillStyle = bodyColor;
      drawCtx.beginPath();
      drawCtx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      drawCtx.fill();
    }

    // Danger bar when being eaten
    if (this.beingEatenTimer > 0) {
      const dangerPercent = this.beingEatenTimer / this.beingEatenDuration;
      drawCtx.fillStyle = '#ff0000';
      drawCtx.fillRect(-this.size * 0.3, -this.size * 0.55, this.size * 0.6 * dangerPercent, 4);
      drawCtx.strokeStyle = '#ffffff';
      drawCtx.lineWidth = 1;
      drawCtx.strokeRect(-this.size * 0.3, -this.size * 0.55, this.size * 0.6, 4);
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#9c27b0';
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('MOBIUS', this.x, this.y + this.size / 2 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 12px Arial';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 10);
    }
  }
}

// ============================================
// Breeder Class (Spawns Baby Fish)
// ============================================
export class Breeder {
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slowly
    this.hunger += dt * 4;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Breeding timer
    this.breedTimer -= dt;
    if (this.breedTimer <= 0 && this.hunger < 70) {
      // Spawn a new baby trout!
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      ctx.arrays.trouts.push(new Trout(this.x + offsetX, this.y + offsetY));
      ctx.sound.play('evolve');
      ctx.spawnParticles(this.x, this.y, 'sparkle', 8);
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
        const newPos = ctx.tankManager.getRandomPosition();
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
      const currentSpeed = baseSpeed * ctx.getPrestigeBonus('speed');
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;

    this.checkPelletCollision();
  }

  findNearestPellet() {
    return ctx.findNearest(this, ctx.arrays.pellets);
  }

  checkPelletCollision() {
    // Satiation cap - ignore pellets when full (hunger < 10)
    if (this.hunger < 10) return;

    for (let i = ctx.arrays.pellets.length - 1; i >= 0; i--) {
      const pellet = ctx.arrays.pellets[i];
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.size + pellet.size) {
        ctx.arrays.pellets.splice(i, 1);
        this.hunger = pellet.upgraded ? -25 : 0;
        this.state = 'wandering';
        break;
      }
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
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
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Belly (larger, pregnant look)
    drawCtx.fillStyle = bellyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, this.size * 0.15, this.size * 0.7, this.size * 0.4, 0, 0, Math.PI);
    drawCtx.fill();

    // Tail
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size, 0);
    drawCtx.lineTo(-this.size - 15, -12);
    drawCtx.lineTo(-this.size - 15, 12);
    drawCtx.closePath();
    drawCtx.fill();

    // Dorsal fin (small, cute)
    drawCtx.beginPath();
    drawCtx.moveTo(-5, -this.size * 0.6);
    drawCtx.lineTo(5, -this.size * 0.85);
    drawCtx.lineTo(15, -this.size * 0.6);
    drawCtx.closePath();
    drawCtx.fill();

    // Eye
    drawCtx.fillStyle = 'white';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.4, -this.size * 0.2, 8, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.fillStyle = 'black';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.45, -this.size * 0.2, 4, 0, Math.PI * 2);
    drawCtx.fill();

    // Eyelash (feminine touch)
    drawCtx.strokeStyle = 'black';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.35, -this.size * 0.35);
    drawCtx.lineTo(this.size * 0.3, -this.size * 0.45);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.45, -this.size * 0.38);
    drawCtx.lineTo(this.size * 0.45, -this.size * 0.5);
    drawCtx.stroke();

    // Heart on belly (if breeding soon)
    if (this.breedTimer < 5 && this.state !== 'dying') {
      drawCtx.fillStyle = '#ff0000';
      drawCtx.font = 'bold 14px Arial';
      drawCtx.textAlign = 'center';
      drawCtx.fillText('\u2665', 0, this.size * 0.3);
    }

    // Outline
    drawCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    drawCtx.stroke();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#ff69b4';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('BREEDER', this.x, this.y + this.size + 15);

    // Breeding progress indicator
    if (this.breedTimer < 10 && this.state !== 'dying') {
      const progress = 1 - (this.breedTimer / 10);
      drawCtx.fillStyle = `rgba(255, 105, 180, ${0.5 + progress * 0.5})`;
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('Ready!', this.x, this.y - this.size - 10);
    }
  }
}

// ============================================
// Feeder Class (Drops Pellets, Doesn't Eat)
// ============================================
export class Feeder {
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

    // Feeder doesn't have hunger
    this.hunger = 0;
    this.state = 'wandering';
  }

  update(dt) {
    this.wobble += dt * 2;

    // Pellet drop timer
    this.dropTimer -= dt;
    if (this.dropTimer <= 0) {
      // Drop a pellet!
      const offsetX = (Math.random() - 0.5) * 20;
      ctx.arrays.pellets.push(new ctx.Pellet(this.x + offsetX, this.y + this.size * 0.5));
      ctx.sound.play('feed');
      ctx.spawnParticles(this.x, this.y, 'bubble', 2);
      this.dropTimer = 15 + Math.random() * 5;
    }

    // Wander slowly
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Subtle bobbing animation
    const bobY = Math.sin(this.wobble) * 2;
    drawCtx.translate(0, bobY);

    // Body color - orange
    const bodyColor = '#ff8c00';
    const bellyColor = '#ffa500';

    // Body - round, plump shape
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.65, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Belly
    drawCtx.fillStyle = bellyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, this.size * 0.15, this.size * 0.7, this.size * 0.35, 0, 0, Math.PI);
    drawCtx.fill();

    // Tail
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size, 0);
    drawCtx.lineTo(-this.size - 12, -10);
    drawCtx.lineTo(-this.size - 12, 10);
    drawCtx.closePath();
    drawCtx.fill();

    // Dorsal fin (small)
    drawCtx.beginPath();
    drawCtx.moveTo(-5, -this.size * 0.55);
    drawCtx.lineTo(3, -this.size * 0.8);
    drawCtx.lineTo(10, -this.size * 0.55);
    drawCtx.closePath();
    drawCtx.fill();

    // Food pouch indicator (bulge on belly)
    drawCtx.fillStyle = '#ffd700';
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.2, this.size * 0.2, 8, 6, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Eye
    drawCtx.fillStyle = 'white';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.4, -this.size * 0.15, 7, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.fillStyle = 'black';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.45, -this.size * 0.15, 3, 0, Math.PI * 2);
    drawCtx.fill();

    // Outline
    drawCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.65, 0, 0, Math.PI * 2);
    drawCtx.stroke();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#ff8c00';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('FEEDER', this.x, this.y + this.size + 15);

    // Drop progress indicator
    if (this.dropTimer < 5) {
      const progress = 1 - (this.dropTimer / 5);
      drawCtx.fillStyle = `rgba(255, 140, 0, ${0.5 + progress * 0.5})`;
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('Dropping...', this.x, this.y - this.size - 5);
    }
  }
}

// ============================================
// Starcatcher Class (Bottom-dweller, eats stars)
// ============================================
export class Starcatcher {
  constructor(x, y) {
    this.x = x;
    this.y = ctx.tankManager.bounds.bottom - ctx.tankManager.padding - 20; // Stay near bottom
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slowly
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Diamond production when well-fed
    if (this.hunger < 50) {
      this.canDropDiamond = true;
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        // Throw diamond upward (unique to Starcatcher)
        const diamond = new ctx.Coin(this.x, this.y - this.size, 'diamond');
        diamond.fallSpeed = -60; // Throw upward initially
        ctx.arrays.coins.push(diamond);
        ctx.spawnParticles(this.x, this.y, 'sparkle', 5);
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
        this.targetX = ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2);
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
    this.x = Math.max(ctx.tankManager.padding, Math.min(ctx.tankManager.bounds.right - ctx.tankManager.padding, this.x));

    this.checkStarCollision();
  }

  findNearestStar() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const coin of ctx.arrays.coins) {
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
    for (const coin of ctx.arrays.coins) {
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
        ctx.sound.play('coin');
        ctx.spawnParticles(this.x, this.y - this.size * 0.3, 'sparkle', 8);
      }
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    // Wobble animation
    const wobbleY = Math.sin(this.wobble) * 2;
    drawCtx.translate(0, wobbleY);

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
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Belly (lighter underside)
    drawCtx.fillStyle = bellyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, this.size * 0.15, this.size * 0.7, this.size * 0.25, 0, 0, Math.PI);
    drawCtx.fill();

    // Mouth on TOP (unique feature - opens upward)
    const mouthSize = 8 + this.mouthOpen * 8;
    drawCtx.fillStyle = '#4b0082'; // Indigo
    drawCtx.beginPath();
    drawCtx.ellipse(0, -this.size * 0.3, mouthSize, mouthSize * (0.3 + this.mouthOpen * 0.7), 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Inner mouth
    if (this.mouthOpen > 0.3) {
      drawCtx.fillStyle = '#2e0854';
      drawCtx.beginPath();
      drawCtx.ellipse(0, -this.size * 0.3, mouthSize * 0.6, mouthSize * 0.4, 0, 0, Math.PI * 2);
      drawCtx.fill();
    }

    // Side fins
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(-this.size * 0.8, 0, 10, 6, -0.3, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.8, 0, 10, 6, 0.3, 0, Math.PI * 2);
    drawCtx.fill();

    // Eyes (on sides, looking up)
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.ellipse(-this.size * 0.4, -this.size * 0.1, 7, 8, 0, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.4, -this.size * 0.1, 7, 8, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Pupils (looking up toward stars)
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(-this.size * 0.4, -this.size * 0.2, 3, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.4, -this.size * 0.2, 3, 0, Math.PI * 2);
    drawCtx.fill();

    // Outline
    drawCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    drawCtx.stroke();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#9370db';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('STARCATCHER', this.x, this.y + this.size * 0.6 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size * 0.6 - 15);
    }

    // Diamond ready indicator
    if (this.canDropDiamond && this.coinTimer < 3) {
      drawCtx.fillStyle = '#b9f2ff';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('\u2666', this.x, this.y - this.size * 0.6 - 5);
    }
  }
}

// ============================================
// Crab Class (Bottom-dweller, Hunts Trouts - Sprite Based)
// ============================================
export class Crab {
  constructor() {
    this.x = ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2);
    this.y = ctx.tankManager.bounds.bottom - ctx.tankManager.padding;
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases
    this.hunger += dt * 4;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Coin production when well-fed
    if (this.hunger < 50) {
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        const coin = new ctx.Coin(this.x, this.y, this.coinType);
        coin.value = this.coinValue;
        ctx.arrays.coins.push(coin);
        ctx.spawnParticles(this.x, this.y, 'sparkle', 3);
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

    // Hunt trouts when hungry
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
          ctx.spawnParticles(this.x, this.y, 'bubble', 3);
        }

        // Check if caught prey
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.size * 0.6 + this.targetFish.size) {
          // Eat the fish!
          this.targetFish.state = 'dead';
          this.hunger = 0;
          this.state = 'wandering';
          this.targetFish = null;
          ctx.sound.play('coin'); // Crunch sound
          ctx.spawnParticles(this.x, this.y, 'blood', 5);
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
        this.targetX = ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2);
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
    this.x = Math.max(ctx.tankManager.padding, Math.min(ctx.tankManager.bounds.right - ctx.tankManager.padding, this.x));
  }

  findTrout() {
    let nearest = null;
    let nearestDist = Infinity;

    // Search trouts array (new sprite-based fish)
    for (const trout of ctx.arrays.trouts) {
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
    return nearest;
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple colored crab shape
      let bodyColor = this.state === 'dying' ? '#808080' :
                      this.state === 'hunting' ? '#ff4500' :
                      this.hunger > 60 ? '#8b0000' : '#ff6347';
      drawCtx.fillStyle = bodyColor;
      drawCtx.beginPath();
      drawCtx.ellipse(0, -this.size * 0.2, this.size * 0.5, this.size * 0.3, 0, 0, Math.PI * 2);
      drawCtx.fill();
      // Simple claws
      drawCtx.fillRect(-this.size * 0.6, -this.size * 0.1, 15, 8);
      drawCtx.fillRect(this.size * 0.6 - 15, -this.size * 0.1, 15, 8);
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#4caf50';
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('CRAB', this.x, this.y + this.size * 0.7 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size - 10);
    }

    // Coin ready indicator
    if (this.hunger < 50 && this.coinTimer < 3) {
      drawCtx.fillStyle = '#3d2b1f';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('\u2022', this.x, this.y - this.size * 0.8);
    }
  }
}

// ============================================
// Geotle Class (Spawns Baby Trout - Sprite Based)
// ============================================
export class Geotle {
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases slowly
    this.hunger += dt * 4;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 5);
      return;
    }

    // Spawn timer - only spawns when not too hungry
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.hunger < 70) {
      // Spawn a new baby trout!
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      ctx.arrays.trouts.push(new Trout(this.x + offsetX, this.y + offsetY));
      ctx.sound.play('evolve');
      ctx.spawnParticles(this.x, this.y, 'sparkle', 8);
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
        const newPos = ctx.tankManager.getRandomPosition();
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
      const currentSpeed = baseSpeed * ctx.getPrestigeBonus('speed');
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
      this.facingLeft = dx < 0;
    }

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;

    this.checkPelletCollision();
  }

  findNearestPellet() {
    return ctx.findNearest(this, ctx.arrays.pellets);
  }

  checkPelletCollision() {
    // Satiation cap - ignore pellets when full (hunger < 10)
    if (this.hunger < 10) return;

    for (let i = ctx.arrays.pellets.length - 1; i >= 0; i--) {
      const pellet = ctx.arrays.pellets[i];
      const dx = pellet.x - this.x;
      const dy = pellet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.size + pellet.size) {
        ctx.arrays.pellets.splice(i, 1);
        this.hunger = pellet.upgraded ? -25 : 0;
        this.state = 'wandering';
        break;
      }
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a turtle-like shape
      let bodyColor = this.state === 'dying' ? '#808080' :
                      this.hunger > 75 ? '#ff0000' :
                      this.hunger > 50 ? '#32cd32' : '#228b22';
      // Shell
      drawCtx.fillStyle = '#8b4513';
      drawCtx.beginPath();
      drawCtx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      drawCtx.fill();
      // Head
      drawCtx.fillStyle = bodyColor;
      drawCtx.beginPath();
      drawCtx.arc(this.size / 3, 0, this.size / 5, 0, Math.PI * 2);
      drawCtx.fill();
      // Flippers
      drawCtx.fillRect(-this.size / 3, -this.size / 3, 15, 10);
      drawCtx.fillRect(-this.size / 3, this.size / 3 - 10, 15, 10);
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = RARITY_COLORS.giga;
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('GEOTLE', this.x, this.y + this.size / 2 + 12);

    // Spawn ready indicator
    if (this.spawnTimer < 5 && this.state !== 'dying') {
      drawCtx.fillStyle = '#ffd700';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('Ready!', this.x, this.y - this.size / 2 - 10);
    }

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size / 2 - 25);
    }
  }
}

// ============================================
// WardenLamprey Class (Attacks Aliens - Sprite Based)
// ============================================
export class WardenLamprey {
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
    const alien = ctx.getAlien();

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
          ctx.spawnParticles(alien.x, alien.y, 'blood', 3);
          this.attackTimer = this.attackCooldown;
        }
      }
    } else {
      // No alien - wander peacefully
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple eel-like shape
      let bodyColor = this.state === 'attacking' ? '#ff4500' : '#4a0080';
      drawCtx.fillStyle = bodyColor;
      drawCtx.beginPath();
      drawCtx.ellipse(0, 0, this.size / 2, this.size / 4, 0, 0, Math.PI * 2);
      drawCtx.fill();
      // Teeth
      drawCtx.fillStyle = '#fff';
      drawCtx.fillRect(this.size / 2 - 8, -3, 8, 2);
      drawCtx.fillRect(this.size / 2 - 8, 1, 8, 2);
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = RARITY_COLORS.relic;
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('WARDEN', this.x, this.y + this.size / 2 + 12);

    // Attack indicator
    if (this.state === 'attacking') {
      drawCtx.fillStyle = '#ff0000';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('ATTACKING!', this.x, this.y - this.size / 2 - 10);
    }
  }
}

// ============================================
// Seeker Class (Auto-Collects Coins - Sprite Based)
// ============================================
export class Seeker {
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
        ctx.addGold(this.targetCoin.value);
        ctx.addTotalEarned(this.targetCoin.value);
        ctx.updateGoldDisplay();
        ctx.sound.play('coin');
        ctx.spawnParticles(this.targetCoin.x, this.targetCoin.y, 'coin_sparkle', 5);
        this.targetCoin.collected = true;
        this.targetCoin = null;
      }
    } else {
      // No coins nearby - wander
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findNearestCoin() {
    let nearest = null;
    let nearestDist = this.collectRadius;

    for (const coin of ctx.arrays.coins) {
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
    for (const beetle of ctx.arrays.beetles) {
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

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      drawCtx.drawImage(sprite, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Fallback: draw a simple fish shape with eye
      let bodyColor = this.state === 'collecting' ? '#ffd700' : '#ff9800';
      drawCtx.fillStyle = bodyColor;
      drawCtx.beginPath();
      drawCtx.ellipse(0, 0, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      drawCtx.fill();
      // Big eye
      drawCtx.fillStyle = '#fff';
      drawCtx.beginPath();
      drawCtx.arc(this.size / 4, -5, 10, 0, Math.PI * 2);
      drawCtx.fill();
      drawCtx.fillStyle = '#000';
      drawCtx.beginPath();
      drawCtx.arc(this.size / 4 + 2, -5, 5, 0, Math.PI * 2);
      drawCtx.fill();
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = RARITY_COLORS.giga;
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('SEEKER', this.x, this.y + this.size / 2 + 12);

    // Collection indicator
    if (this.state === 'collecting') {
      drawCtx.fillStyle = '#ffd700';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('$', this.x, this.y - this.size / 2 - 5);
    }
  }
}

// ============================================
// Anemone Class (Heals Nearby Fish - Sprite Based)
// ============================================
export class Anemone {
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
      const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  healNearbyFish(dt) {
    const healAmount = this.healRate * dt;

    // Combine all healable fish arrays
    const allFish = [
      ...ctx.arrays.trouts,
      ...ctx.arrays.skellfins,
      ...ctx.arrays.breeders,
      ...ctx.arrays.geotles
    ];

    for (const fish of allFish) {
      if (fish.state === 'dead' || fish.state === 'dying') continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.healRadius) {
        fish.hunger = Math.max(0, fish.hunger - healAmount);
      }
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    // Pulsing effect
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;

    // Draw sprite if loaded
    const sprite = ctx.imageCache[this.species];
    if (sprite) {
      const drawSize = this.size * pulse;
      drawCtx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      // Fallback: draw a simple anemone shape
      drawCtx.fillStyle = '#ff69b4';
      // Tentacles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tentacleLen = this.size * 0.4 * pulse;
        drawCtx.beginPath();
        drawCtx.moveTo(0, 0);
        drawCtx.lineTo(Math.cos(angle) * tentacleLen, Math.sin(angle) * tentacleLen);
        drawCtx.lineWidth = 4;
        drawCtx.strokeStyle = '#ff69b4';
        drawCtx.stroke();
      }
      // Center body
      drawCtx.fillStyle = '#ff1493';
      drawCtx.beginPath();
      drawCtx.arc(0, 0, this.size / 4, 0, Math.PI * 2);
      drawCtx.fill();
    }

    drawCtx.restore();

    // Healing radius indicator (subtle)
    drawCtx.strokeStyle = 'rgba(255, 105, 180, 0.2)';
    drawCtx.lineWidth = 2;
    drawCtx.setLineDash([5, 5]);
    drawCtx.beginPath();
    drawCtx.arc(this.x, this.y, this.healRadius, 0, Math.PI * 2);
    drawCtx.stroke();
    drawCtx.setLineDash([]);

    // Label
    drawCtx.fillStyle = RARITY_COLORS.giga;
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('ANEMONE', this.x, this.y + this.size / 2 + 12);

    // Healing indicator
    drawCtx.fillStyle = '#ff69b4';
    drawCtx.font = 'bold 12px Arial';
    drawCtx.fillText('+', this.x, this.y - this.size / 2 - 5);
  }
}

// ============================================
// Beetlemuncher Class (Green tadpole that eats beetles)
// ============================================
export class Beetlemuncher {
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
      if (this.y < ctx.tankManager.padding || this.deathTimer > 3) {
        this.state = 'dead';
      }
      return;
    }

    // Hunger increases
    this.hunger += dt * 3;

    if (this.hunger >= 100) {
      this.state = 'dying';
      ctx.stats.totalFishLost++;
      ctx.sound.play('death');
      ctx.spawnParticles(this.x, this.y, 'bubble', 6);
      return;
    }

    // Pearl production when well-fed
    if (this.hunger < 50) {
      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        ctx.arrays.coins.push(new ctx.Coin(this.x, this.y, 'pearl'));
        ctx.spawnParticles(this.x, this.y, 'sparkle', 8);
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
          ctx.sound.play('coin');
          ctx.spawnParticles(this.x, this.y, 'sparkle', 5);
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
        const newPos = ctx.tankManager.getRandomPosition();
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

    const clamped = ctx.tankManager.clampToTank(this.x, this.y);
    this.x = clamped.x;
    this.y = clamped.y;
  }

  findNearestBeetle() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const beetle of ctx.arrays.beetles) {
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

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.state === 'dying') {
      drawCtx.rotate(Math.PI);
      drawCtx.globalAlpha = Math.max(0, 1 - this.deathTimer / 3);
    }

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
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
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.3, 0);
    drawCtx.quadraticCurveTo(
      -this.size * 0.7, tailWave,
      -this.size * 1.1, tailWave * 0.5
    );
    drawCtx.quadraticCurveTo(
      -this.size * 0.7, -tailWave * 0.3,
      -this.size * 0.3, 0
    );
    drawCtx.fill();

    // Tail fin
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.9, tailWave * 0.3);
    drawCtx.lineTo(-this.size * 1.3, tailWave - 5);
    drawCtx.lineTo(-this.size * 1.3, tailWave + 5);
    drawCtx.closePath();
    drawCtx.fill();

    // Body - tadpole shape (large head, tapered back)
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size * 0.5, this.size * 0.45, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Belly
    drawCtx.fillStyle = bellyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.1, this.size * 0.1, this.size * 0.3, this.size * 0.25, 0, 0, Math.PI);
    drawCtx.fill();

    // Dorsal fin (small)
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.2, -this.size * 0.35);
    drawCtx.lineTo(0, -this.size * 0.55);
    drawCtx.lineTo(this.size * 0.1, -this.size * 0.35);
    drawCtx.closePath();
    drawCtx.fill();

    // Side fins
    drawCtx.beginPath();
    drawCtx.ellipse(-this.size * 0.15, this.size * 0.15, this.size * 0.2, this.size * 0.1, 0.5, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.15, this.size * 0.15, this.size * 0.2, this.size * 0.1, -0.5, 0, Math.PI * 2);
    drawCtx.fill();

    // Mouth
    const mouthSize = 6 + this.mouthOpen * 6;
    drawCtx.fillStyle = '#004d00';
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.4, this.size * 0.05, mouthSize, mouthSize * (0.3 + this.mouthOpen * 0.5), 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Eyes (large, characteristic of tadpole)
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.15, -this.size * 0.15, 10, 12, 0, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.35, -this.size * 0.1, 8, 10, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Pupils
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.18, -this.size * 0.12, 4, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.38, -this.size * 0.08, 3, 0, Math.PI * 2);
    drawCtx.fill();

    // Eye shine
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.12, -this.size * 0.2, 2, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.33, -this.size * 0.14, 1.5, 0, Math.PI * 2);
    drawCtx.fill();

    // Outline
    drawCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size * 0.5, this.size * 0.45, 0, 0, Math.PI * 2);
    drawCtx.stroke();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#32cd32';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('MUNCHER', this.x, this.y + this.size * 0.6 + 12);

    // Hunger warning
    if (this.hunger > 60 && this.state !== 'dying') {
      drawCtx.fillStyle = this.hunger > 80 ? '#ff0000' : '#ffaa00';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('HUNGRY!', this.x, this.y - this.size * 0.6 - 10);
    }

    // Pearl ready indicator
    if (this.hunger < 50 && this.coinTimer < 4) {
      drawCtx.fillStyle = '#faf0e6';
      drawCtx.font = 'bold 12px Arial';
      drawCtx.fillText('\u25cf', this.x, this.y - this.size * 0.5);
    }
  }
}
