// Gigaquarium - Aliens Module
// Alien classes: Sylvester, Balrog, Gus, Destructor, Missile

// Game context - set by main.js via setAlienContext()
let ctx = null;

/**
 * Initialize the game context for alien classes to access shared state
 * @param {object} gameContext - Object containing:
 *   - tankManager: TankManager instance
 *   - sound: SoundSystem instance
 *   - spawnParticles: function(x, y, type, count)
 *   - stats: statistics object
 *   - getAngie: getter function returning Angie pet (or null)
 *   - arrays: { coins, pellets, trouts, skellfins, mobiuses, breeders, starcatchers, crabs, beetlemunchers, geotles }
 *   - Coin: Coin class constructor
 */
export function setAlienContext(gameContext) {
  ctx = gameContext;
}

// ============================================
// Sylvester - Basic Alien (50 HP)
// ============================================
export class Sylvester {
  constructor() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    const bounds = ctx.tankManager.bounds;
    const padding = ctx.tankManager.padding;

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
      const targetPos = ctx.tankManager.getRandomPosition();
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

      if (this.entryTimer > 1 && ctx.tankManager.isWithinBounds(this.x, this.y)) {
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
            const angie = ctx.getAngie();
            if (angie && angie.canRevive()) {
              angie.revive(target);
            } else {
              // Finally kill the carnivore
              target.state = 'dying';
              target.deathTimer = 0;
              ctx.sound.play('death');
              ctx.spawnParticles(target.x, target.y, 'blood', 10);
              ctx.spawnParticles(target.x, target.y, 'bubble', 5);
            }
          }
        } else {
          // Check if Angie can revive before instant kill
          const angie = ctx.getAngie();
          if (angie && angie.canRevive()) {
            angie.revive(target);
          } else {
            // Instant kill for other fish
            target.state = 'dying';
            target.deathTimer = 0;
            ctx.sound.play('death');
            ctx.spawnParticles(target.x, target.y, 'blood', 10);
            ctx.spawnParticles(target.x, target.y, 'bubble', 5);
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
    this.x = Math.max(-20, Math.min(ctx.tankManager.bounds.right + 20, this.x));
    this.y = Math.max(-20, Math.min(ctx.tankManager.bounds.bottom + 20, this.y));
  }

  findNearestFish() {
    let nearest = null;
    let nearestDist = Infinity;

    const { mobiuses, trouts, skellfins, breeders, starcatchers, crabs, beetlemunchers } = ctx.arrays;

    // Combine all fish arrays (mobiuses first as aliens prioritize large targets)
    const allFish = [...mobiuses, ...skellfins, ...trouts, ...breeders,
                     ...starcatchers, ...crabs, ...beetlemunchers];

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
    ctx.stats.aliensDefeated++;
    ctx.sound.play('victory');
    ctx.spawnParticles(this.x, this.y, 'sparkle', 25);
    // Drop 5 gold coins as reward
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      ctx.arrays.coins.push(new ctx.Coin(this.x + offsetX, this.y + offsetY, 'gold'));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  draw(canvasCtx) {
    canvasCtx.save();
    canvasCtx.translate(this.x, this.y);

    // Hurt flash
    if (this.hurtTimer > 0) {
      canvasCtx.globalAlpha = 0.5 + Math.sin(this.hurtTimer * 50) * 0.5;
    }

    // Entry warp effect
    if (this.entering) {
      canvasCtx.globalAlpha = this.entryTimer;
      const scale = 0.5 + this.entryTimer * 0.5;
      canvasCtx.scale(scale, scale);
    }

    if (this.facingLeft) {
      canvasCtx.scale(-1, 1);
    }

    // Wobble animation
    const wobbleY = Math.sin(this.wobble) * 3;

    // Body (blue alien blob)
    canvasCtx.fillStyle = '#4169e1';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, wobbleY, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Darker overlay
    canvasCtx.fillStyle = 'rgba(0,0,100,0.3)';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, wobbleY + 5, this.size * 0.9, this.size * 0.5, 0, 0, Math.PI);
    canvasCtx.fill();

    // Tentacles
    canvasCtx.fillStyle = '#4169e1';
    for (let i = 0; i < 4; i++) {
      const tentacleX = -20 + i * 15;
      const tentacleWobble = Math.sin(this.wobble + i) * 5;
      canvasCtx.beginPath();
      canvasCtx.ellipse(tentacleX, this.size * 0.5 + 10 + tentacleWobble, 6, 15, 0, 0, Math.PI * 2);
      canvasCtx.fill();
    }

    // Eyes (menacing)
    canvasCtx.fillStyle = '#ffff00';
    canvasCtx.beginPath();
    canvasCtx.ellipse(-15, wobbleY - 10, 12, 15, 0, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.ellipse(15, wobbleY - 10, 12, 15, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Pupils (red, evil)
    canvasCtx.fillStyle = '#ff0000';
    canvasCtx.beginPath();
    canvasCtx.arc(-12, wobbleY - 8, 5, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.arc(18, wobbleY - 8, 5, 0, Math.PI * 2);
    canvasCtx.fill();

    // Angry mouth
    canvasCtx.strokeStyle = '#000';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.arc(0, wobbleY + 15, 15, 0.2 * Math.PI, 0.8 * Math.PI);
    canvasCtx.stroke();

    // Teeth
    canvasCtx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const toothX = -10 + i * 5;
      canvasCtx.beginPath();
      canvasCtx.moveTo(toothX, wobbleY + 20);
      canvasCtx.lineTo(toothX + 2, wobbleY + 28);
      canvasCtx.lineTo(toothX + 4, wobbleY + 20);
      canvasCtx.closePath();
      canvasCtx.fill();
    }

    canvasCtx.restore();

    // Health bar
    if (!this.entering) {
      const barWidth = 60;
      const barHeight = 8;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 15;

      // Background
      canvasCtx.fillStyle = '#333';
      canvasCtx.fillRect(barX, barY, barWidth, barHeight);

      // Health
      const healthPercent = this.health / this.maxHealth;
      canvasCtx.fillStyle = healthPercent > 0.3 ? '#ff4444' : '#ff0000';
      canvasCtx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      // Border
      canvasCtx.strokeStyle = '#000';
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}

// ============================================
// Balrog - Tougher alien (100 HP), never gets full
// ============================================
export class Balrog {
  constructor() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    const bounds = ctx.tankManager.bounds;
    const padding = ctx.tankManager.padding;

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
      const targetPos = ctx.tankManager.getRandomPosition();
      this.targetX = targetPos.x;
      this.targetY = targetPos.y;

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.x += (dx / dist) * this.speed * 2 * dt;
        this.y += (dy / dist) * this.speed * 2 * dt;
      }

      if (this.entryTimer > 1 && ctx.tankManager.isWithinBounds(this.x, this.y)) {
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
            const angie = ctx.getAngie();
            if (angie && angie.canRevive()) {
              angie.revive(target);
            } else {
              target.state = 'dying';
              target.deathTimer = 0;
              ctx.sound.play('death');
              ctx.spawnParticles(target.x, target.y, 'blood', 10);
              ctx.spawnParticles(target.x, target.y, 'bubble', 5);
            }
          }
        } else {
          const angie = ctx.getAngie();
          if (angie && angie.canRevive()) {
            angie.revive(target);
          } else {
            target.state = 'dying';
            target.deathTimer = 0;
            ctx.sound.play('death');
            ctx.spawnParticles(target.x, target.y, 'blood', 10);
            ctx.spawnParticles(target.x, target.y, 'bubble', 5);
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

    this.x = Math.max(-20, Math.min(ctx.tankManager.bounds.right + 20, this.x));
    this.y = Math.max(-20, Math.min(ctx.tankManager.bounds.bottom + 20, this.y));
  }

  findNearestFish() {
    let nearest = null;
    let nearestDist = Infinity;

    const { mobiuses, trouts, skellfins, breeders, starcatchers, crabs, beetlemunchers, geotles } = ctx.arrays;

    // Check all fish types (mobiuses first as aliens prioritize large targets)
    const allFish = [...mobiuses, ...skellfins, ...trouts, ...breeders,
                     ...starcatchers, ...crabs, ...beetlemunchers, ...geotles];

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
    ctx.stats.aliensDefeated++;
    ctx.sound.play('victory');
    ctx.spawnParticles(this.x, this.y, 'sparkle', 30);
    // Drop 8 gold coins as reward (more than Sylvester)
    for (let i = 0; i < 8; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;
      ctx.arrays.coins.push(new ctx.Coin(this.x + offsetX, this.y + offsetY, 'gold'));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  draw(canvasCtx) {
    canvasCtx.save();
    canvasCtx.translate(this.x, this.y);

    if (this.hurtTimer > 0) {
      canvasCtx.globalAlpha = 0.5 + Math.sin(this.hurtTimer * 50) * 0.5;
    }

    if (this.entering) {
      canvasCtx.globalAlpha = this.entryTimer;
      const scale = 0.5 + this.entryTimer * 0.5;
      canvasCtx.scale(scale, scale);
    }

    if (this.facingLeft) {
      canvasCtx.scale(-1, 1);
    }

    const wobbleY = Math.sin(this.wobble) * 4;

    // Body (dark red demon)
    canvasCtx.fillStyle = '#8b0000';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, wobbleY, this.size, this.size * 0.8, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Horns
    canvasCtx.fillStyle = '#2f0000';
    canvasCtx.beginPath();
    canvasCtx.moveTo(-25, wobbleY - 40);
    canvasCtx.lineTo(-35, wobbleY - 70);
    canvasCtx.lineTo(-15, wobbleY - 45);
    canvasCtx.closePath();
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.moveTo(25, wobbleY - 40);
    canvasCtx.lineTo(35, wobbleY - 70);
    canvasCtx.lineTo(15, wobbleY - 45);
    canvasCtx.closePath();
    canvasCtx.fill();

    // Fire aura effect
    canvasCtx.fillStyle = 'rgba(255, 100, 0, 0.3)';
    for (let i = 0; i < 6; i++) {
      const flameX = -30 + i * 12;
      const flameY = Math.sin(this.wobble + i) * 8;
      canvasCtx.beginPath();
      canvasCtx.ellipse(flameX, this.size * 0.6 + flameY, 8, 15, 0, 0, Math.PI * 2);
      canvasCtx.fill();
    }

    // Eyes (fiery)
    canvasCtx.fillStyle = '#ff4500';
    canvasCtx.beginPath();
    canvasCtx.ellipse(-18, wobbleY - 10, 14, 18, 0, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.ellipse(18, wobbleY - 10, 14, 18, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Pupils
    canvasCtx.fillStyle = '#000';
    canvasCtx.beginPath();
    canvasCtx.arc(-15, wobbleY - 8, 6, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.arc(21, wobbleY - 8, 6, 0, Math.PI * 2);
    canvasCtx.fill();

    // Mouth with fangs
    canvasCtx.fillStyle = '#000';
    canvasCtx.beginPath();
    canvasCtx.arc(0, wobbleY + 20, 20, 0, Math.PI);
    canvasCtx.fill();

    canvasCtx.fillStyle = '#fff';
    // Large fangs
    canvasCtx.beginPath();
    canvasCtx.moveTo(-15, wobbleY + 15);
    canvasCtx.lineTo(-12, wobbleY + 35);
    canvasCtx.lineTo(-9, wobbleY + 15);
    canvasCtx.closePath();
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.moveTo(9, wobbleY + 15);
    canvasCtx.lineTo(12, wobbleY + 35);
    canvasCtx.lineTo(15, wobbleY + 15);
    canvasCtx.closePath();
    canvasCtx.fill();

    canvasCtx.restore();

    // Health bar
    if (!this.entering) {
      const barWidth = 80;
      const barHeight = 10;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 20;

      canvasCtx.fillStyle = '#333';
      canvasCtx.fillRect(barX, barY, barWidth, barHeight);

      const healthPercent = this.health / this.maxHealth;
      canvasCtx.fillStyle = '#ff4500';
      canvasCtx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      canvasCtx.strokeStyle = '#000';
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}

// ============================================
// Gus - Cannot be shot, must be fed 20 pellets
// ============================================
export class Gus {
  constructor() {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    const bounds = ctx.tankManager.bounds;
    const padding = ctx.tankManager.padding;

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
      const targetPos = ctx.tankManager.getRandomPosition();
      this.targetX = targetPos.x;
      this.targetY = targetPos.y;

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.x += (dx / dist) * this.speed * 2 * dt;
        this.y += (dy / dist) * this.speed * 2 * dt;
      }

      if (this.entryTimer > 1 && ctx.tankManager.isWithinBounds(this.x, this.y)) {
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
          const angie = ctx.getAngie();
          if (angie && angie.canRevive()) {
            angie.revive(target);
          } else {
            target.state = 'dying';
            target.deathTimer = 0;
            ctx.sound.play('death');
            ctx.spawnParticles(target.x, target.y, 'blood', 10);
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

    this.x = Math.max(-20, Math.min(ctx.tankManager.bounds.right + 20, this.x));
    this.y = Math.max(-20, Math.min(ctx.tankManager.bounds.bottom + 20, this.y));
  }

  findNearestFish() {
    let nearest = null;
    let nearestDist = Infinity;

    const { trouts, skellfins, breeders, starcatchers, beetlemunchers, geotles } = ctx.arrays;

    const allFish = [...trouts, ...skellfins, ...breeders,
                     ...starcatchers, ...beetlemunchers, ...geotles];

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

    for (const pellet of ctx.arrays.pellets) {
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
    ctx.sound.play('feed');
    ctx.spawnParticles(this.x, this.y, 'bubble', 3);

    if (this.pelletsEaten >= this.pelletsNeeded) {
      this.explode();
    }
  }

  explode() {
    this.dead = true;
    ctx.stats.aliensDefeated++;
    ctx.sound.play('victory');
    ctx.spawnParticles(this.x, this.y, 'sparkle', 40);
    ctx.spawnParticles(this.x, this.y, 'blood', 20);
    // Drop 10 gold coins
    for (let i = 0; i < 10; i++) {
      const offsetX = (Math.random() - 0.5) * 100;
      const offsetY = (Math.random() - 0.5) * 100;
      ctx.arrays.coins.push(new ctx.Coin(this.x + offsetX, this.y + offsetY, 'gold'));
    }
  }

  takeDamage() {
    // Gus cannot be damaged by clicking!
  }

  isClicked(clickX, clickY) {
    // Always return false - Gus cannot be clicked to damage
    return false;
  }

  draw(canvasCtx) {
    canvasCtx.save();
    canvasCtx.translate(this.x, this.y);

    if (this.entering) {
      canvasCtx.globalAlpha = this.entryTimer;
      const scale = 0.5 + this.entryTimer * 0.5;
      canvasCtx.scale(scale, scale);
    }

    // Apply bloat scale
    canvasCtx.scale(this.bloatScale, this.bloatScale);

    if (this.facingLeft) {
      canvasCtx.scale(-1, 1);
    }

    const wobbleY = Math.sin(this.wobble) * 3;

    // Body (green bloated creature)
    const greenIntensity = Math.min(255, 100 + this.pelletsEaten * 8);
    canvasCtx.fillStyle = `rgb(${50 + this.pelletsEaten * 5}, ${greenIntensity}, 50)`;
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, wobbleY, this.size, this.size * 0.9, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Spots
    canvasCtx.fillStyle = 'rgba(0, 100, 0, 0.5)';
    for (let i = 0; i < 5; i++) {
      const spotX = -20 + i * 10;
      const spotY = -10 + Math.sin(i) * 15;
      canvasCtx.beginPath();
      canvasCtx.arc(spotX, wobbleY + spotY, 8, 0, Math.PI * 2);
      canvasCtx.fill();
    }

    // Dopey eyes
    canvasCtx.fillStyle = '#fff';
    canvasCtx.beginPath();
    canvasCtx.ellipse(-15, wobbleY - 15, 15, 12, 0, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.ellipse(15, wobbleY - 15, 15, 12, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Cross-eyed pupils
    canvasCtx.fillStyle = '#000';
    canvasCtx.beginPath();
    canvasCtx.arc(-10, wobbleY - 15, 5, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.arc(10, wobbleY - 15, 5, 0, Math.PI * 2);
    canvasCtx.fill();

    // Open mouth (always hungry)
    canvasCtx.fillStyle = '#000';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, wobbleY + 20, 18, 15, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Tongue
    canvasCtx.fillStyle = '#ff6b6b';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, wobbleY + 28, 8, 6, 0, 0, Math.PI);
    canvasCtx.fill();

    canvasCtx.restore();

    // Pellet counter bar (instead of health bar)
    if (!this.entering) {
      const barWidth = 70;
      const barHeight = 10;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size * this.bloatScale - 20;

      canvasCtx.fillStyle = '#333';
      canvasCtx.fillRect(barX, barY, barWidth, barHeight);

      const eatPercent = this.pelletsEaten / this.pelletsNeeded;
      canvasCtx.fillStyle = eatPercent > 0.8 ? '#ff0000' : '#00ff00';
      canvasCtx.fillRect(barX, barY, barWidth * eatPercent, barHeight);

      canvasCtx.strokeStyle = '#000';
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeRect(barX, barY, barWidth, barHeight);

      // Label
      canvasCtx.fillStyle = '#fff';
      canvasCtx.font = 'bold 10px Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText(`${this.pelletsEaten}/${this.pelletsNeeded}`, this.x, barY - 3);
    }
  }
}

// ============================================
// Missile - Fired by Destructor
// ============================================
export class Missile {
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
        const angie = ctx.getAngie();
        if (angie && angie.canRevive()) {
          angie.revive(this.target);
        } else {
          this.target.state = 'dying';
          this.target.deathTimer = 0;
          ctx.sound.play('death');
          ctx.spawnParticles(this.target.x, this.target.y, 'blood', 8);
        }
        this.dead = true;
      }
    } else {
      // Lost target - continue in current direction then expire
      this.dead = true;
    }

    // Off screen
    if (this.x < -50 || this.x > ctx.tankManager.bounds.right + 50 ||
        this.y < -50 || this.y > ctx.tankManager.bounds.bottom + 50) {
      this.dead = true;
    }
  }

  takeDamage() {
    this.health--;
    if (this.health <= 0) {
      this.dead = true;
      ctx.sound.play('hit');
      ctx.spawnParticles(this.x, this.y, 'sparkle', 5);
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size + 10;  // Slightly larger hitbox
  }

  draw(canvasCtx) {
    // Draw trail
    for (const point of this.trail) {
      canvasCtx.globalAlpha = point.alpha * 0.5;
      canvasCtx.fillStyle = '#ff4500';
      canvasCtx.beginPath();
      canvasCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      canvasCtx.fill();
    }
    canvasCtx.globalAlpha = 1;

    // Missile body
    canvasCtx.fillStyle = '#ff0000';
    canvasCtx.beginPath();
    canvasCtx.ellipse(this.x, this.y, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
    canvasCtx.fill();

    // Warhead
    canvasCtx.fillStyle = '#ffff00';
    canvasCtx.beginPath();
    canvasCtx.arc(this.x + 5, this.y, 4, 0, Math.PI * 2);
    canvasCtx.fill();

    // Fins
    canvasCtx.fillStyle = '#8b0000';
    canvasCtx.beginPath();
    canvasCtx.moveTo(this.x - 8, this.y - 3);
    canvasCtx.lineTo(this.x - 15, this.y - 10);
    canvasCtx.lineTo(this.x - 8, this.y);
    canvasCtx.closePath();
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.moveTo(this.x - 8, this.y + 3);
    canvasCtx.lineTo(this.x - 15, this.y + 10);
    canvasCtx.lineTo(this.x - 8, this.y);
    canvasCtx.closePath();
    canvasCtx.fill();
  }
}

// ============================================
// Destructor - Sits at bottom, fires homing missiles
// ============================================
export class Destructor {
  constructor() {
    const bounds = ctx.tankManager.bounds;
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
        ctx.sound.play('alien');  // Missile launch sound
        ctx.spawnParticles(this.x, this.y - 20, 'sparkle', 5);
      }
    }

    // Slight horizontal movement
    this.x += Math.sin(this.wobble * 0.5) * 20 * dt;
    this.x = Math.max(50, Math.min(ctx.tankManager.bounds.right - 50, this.x));
  }

  findTargetFish() {
    const { trouts, skellfins, mobiuses, breeders, geotles, starcatchers, beetlemunchers, crabs } = ctx.arrays;

    const allFish = [...trouts, ...skellfins, ...mobiuses, ...breeders,
                     ...geotles, ...starcatchers, ...beetlemunchers, ...crabs];

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
    ctx.stats.aliensDefeated++;
    ctx.sound.play('victory');
    ctx.spawnParticles(this.x, this.y, 'sparkle', 35);
    // Drop 7 gold coins
    for (let i = 0; i < 7; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 40;
      ctx.arrays.coins.push(new ctx.Coin(this.x + offsetX, this.y + offsetY - 30, 'gold'));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  draw(canvasCtx) {
    canvasCtx.save();
    canvasCtx.translate(this.x, this.y);

    if (this.hurtTimer > 0) {
      canvasCtx.globalAlpha = 0.5 + Math.sin(this.hurtTimer * 50) * 0.5;
    }

    if (this.entering) {
      canvasCtx.globalAlpha = Math.min(1, this.entryTimer);
    }

    const wobbleX = Math.sin(this.wobble) * 2;

    // Tank treads
    canvasCtx.fillStyle = '#333';
    canvasCtx.fillRect(-35 + wobbleX, 15, 25, 20);
    canvasCtx.fillRect(10 + wobbleX, 15, 25, 20);

    // Tread details
    canvasCtx.fillStyle = '#222';
    for (let i = 0; i < 4; i++) {
      canvasCtx.fillRect(-33 + i * 6 + wobbleX, 17, 4, 16);
      canvasCtx.fillRect(12 + i * 6 + wobbleX, 17, 4, 16);
    }

    // Main body (metal dome)
    canvasCtx.fillStyle = '#4a4a4a';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, 0, this.size * 0.7, this.size * 0.5, 0, Math.PI, 0);
    canvasCtx.fill();

    canvasCtx.fillStyle = '#666';
    canvasCtx.beginPath();
    canvasCtx.ellipse(0, 0, this.size * 0.7, 15, 0, 0, Math.PI);
    canvasCtx.fill();

    // Cannon
    canvasCtx.fillStyle = '#333';
    canvasCtx.fillRect(-8, -40, 16, 35);

    // Cannon tip
    canvasCtx.fillStyle = '#ff4500';
    canvasCtx.beginPath();
    canvasCtx.arc(0, -45, 10, 0, Math.PI * 2);
    canvasCtx.fill();

    // Eye/sensor
    canvasCtx.fillStyle = '#ff0000';
    canvasCtx.beginPath();
    canvasCtx.arc(0, -10, 12, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.fillStyle = '#000';
    canvasCtx.beginPath();
    canvasCtx.arc(0, -10, 6, 0, Math.PI * 2);
    canvasCtx.fill();

    // Rivets
    canvasCtx.fillStyle = '#888';
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI + (i / 4) * Math.PI;
      const rx = Math.cos(angle) * this.size * 0.55;
      const ry = Math.sin(angle) * this.size * 0.35;
      canvasCtx.beginPath();
      canvasCtx.arc(rx, ry - 5, 3, 0, Math.PI * 2);
      canvasCtx.fill();
    }

    canvasCtx.restore();

    // Health bar
    if (!this.entering) {
      const barWidth = 80;
      const barHeight = 10;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 10;

      canvasCtx.fillStyle = '#333';
      canvasCtx.fillRect(barX, barY, barWidth, barHeight);

      const healthPercent = this.health / this.maxHealth;
      canvasCtx.fillStyle = '#666';
      canvasCtx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      canvasCtx.strokeStyle = '#000';
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}
