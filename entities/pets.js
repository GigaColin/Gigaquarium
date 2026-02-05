// entities/pets.js - Stinky, Niko, Zorf, Itchy, Clyde, Angie classes

import { Pellet, Coin } from './collectibles.js';

// Game context (injected from main.js)
let ctx = {
  tankManager: null,
  coins: [],
  aliens: [],
  pellets: [],
  getGold: () => 0,
  addGold: () => {},
  addTotalEarned: () => {},
  sound: null,
  spawnParticles: null,
  updateGoldDisplay: null,
  findNearest: null,
  hasActiveAlien: null
};

/**
 * Set the game context for pets module
 */
export function setPetsContext(gameContext) {
  ctx = { ...ctx, ...gameContext };
}

/**
 * Get current gold value
 */
export function getGold() {
  return ctx.getGold();
}

// ============================================
// Stinky the Snail (Pet - Floor Coin Collector)
// ============================================
export class Stinky {
  constructor() {
    // Random starting position along the bottom
    this.x = ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2) : 400;
    this.y = ctx.tankManager ? ctx.tankManager.bounds.bottom - ctx.tankManager.padding : 550;
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
        ctx.addGold(floorCoin.value);
        ctx.addTotalEarned(floorCoin.value);
        floorCoin.collected = true;
        if (ctx.sound) ctx.sound.play('coin');
        if (ctx.spawnParticles) ctx.spawnParticles(floorCoin.x, floorCoin.y, 'coin_sparkle', 6);
        if (ctx.updateGoldDisplay) ctx.updateGoldDisplay();
      }
    } else {
      // Wander along the bottom
      if (ctx.tankManager && Math.abs(this.x - this.targetX) < 10) {
        // Pick new random target
        this.targetX = ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2);
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
    if (ctx.tankManager) {
      this.x = Math.max(ctx.tankManager.padding, Math.min(ctx.tankManager.bounds.right - ctx.tankManager.padding, this.x));
    }
  }

  findNearestFloorCoin() {
    let nearest = null;
    let nearestDist = Infinity;
    const floorY = ctx.tankManager ? ctx.tankManager.bounds.bottom - ctx.tankManager.padding : 550;

    for (const coin of ctx.coins) {
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

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Shell
    const shellColor = '#8b4513';
    const shellHighlight = '#d2691e';

    drawCtx.fillStyle = shellColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, -this.size * 0.3, this.size * 0.6, this.size * 0.5, 0, Math.PI, 0);
    drawCtx.fill();

    // Shell spiral pattern
    drawCtx.strokeStyle = shellHighlight;
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.arc(-5, -this.size * 0.35, 8, 0, Math.PI * 1.5);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.arc(-5, -this.size * 0.35, 4, 0, Math.PI);
    drawCtx.stroke();

    // Body (slug part)
    const bodyWobble = Math.sin(this.wobble) * 2;
    drawCtx.fillStyle = '#ffd700'; // Yellow-gold body
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.3 + bodyWobble, 0, this.size * 0.5, this.size * 0.2, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Head
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.6 + bodyWobble, -2, this.size * 0.25, 0, Math.PI * 2);
    drawCtx.fill();

    // Eye stalks
    drawCtx.strokeStyle = '#ffd700';
    drawCtx.lineWidth = 3;
    // Left stalk
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.5 + bodyWobble, -8);
    drawCtx.lineTo(this.size * 0.45 + bodyWobble + this.eyeOffset, -18);
    drawCtx.stroke();
    // Right stalk
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.7 + bodyWobble, -8);
    drawCtx.lineTo(this.size * 0.75 + bodyWobble + this.eyeOffset, -18);
    drawCtx.stroke();

    // Eyes
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.45 + bodyWobble + this.eyeOffset, -18, 4, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.75 + bodyWobble + this.eyeOffset, -18, 4, 0, Math.PI * 2);
    drawCtx.fill();

    // Eye shine
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.43 + bodyWobble + this.eyeOffset, -19, 1.5, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.73 + bodyWobble + this.eyeOffset, -19, 1.5, 0, Math.PI * 2);
    drawCtx.fill();

    // Smile
    drawCtx.strokeStyle = '#8b6914';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.6 + bodyWobble, 0, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    drawCtx.stroke();

    // Slime trail (subtle)
    drawCtx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    drawCtx.beginPath();
    drawCtx.ellipse(-this.size * 0.3, 5, this.size * 0.4, 3, 0, 0, Math.PI * 2);
    drawCtx.fill();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#ffd700';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('STINKY', this.x, this.y + 20);
  }
}

// ============================================
// Niko the Seahorse (Pearl Producer)
// ============================================
export class Niko {
  constructor(x, y) {
    this.x = x || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2) : 400);
    this.y = y || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.bottom - ctx.tankManager.padding * 2) : 300);
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
      ctx.coins.push(new Coin(this.x, this.y + this.size * 0.5, 'pearl'));
      if (ctx.spawnParticles) ctx.spawnParticles(this.x, this.y, 'sparkle', 8);
      if (ctx.sound) ctx.sound.play('coin');
      this.pearlTimer = 40;
    }

    // Gentle vertical bobbing movement (seahorse style)
    this.targetY = this.y + Math.sin(this.bobPhase * 0.5) * 30 * dt;

    // Slow horizontal wander
    if (ctx.tankManager && Math.abs(this.x - this.targetX) < 20) {
      this.targetX = ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2);
    }

    // Movement
    const dx = this.targetX - this.x;

    this.x += dx * 0.02;
    this.y += Math.sin(this.bobPhase) * 20 * dt; // Bobbing motion

    if (Math.abs(dx) > 5) {
      this.facingLeft = dx < 0;
    }

    // Clamp to bounds
    if (ctx.tankManager) {
      const clamped = ctx.tankManager.clampToTank(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Bobbing effect
    const bobY = Math.sin(this.bobPhase) * 3;
    drawCtx.translate(0, bobY);

    // Purple/pink seahorse coloring
    const bodyColor = '#9932cc'; // Dark orchid
    const bellyColor = '#dda0dd'; // Plum

    // Curved body (S-shape)
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(0, -this.size * 0.6);
    drawCtx.quadraticCurveTo(this.size * 0.3, -this.size * 0.3, this.size * 0.2, 0);
    drawCtx.quadraticCurveTo(this.size * 0.1, this.size * 0.3, -this.size * 0.1, this.size * 0.5);
    drawCtx.quadraticCurveTo(-this.size * 0.3, this.size * 0.3, -this.size * 0.2, 0);
    drawCtx.quadraticCurveTo(-this.size * 0.1, -this.size * 0.3, 0, -this.size * 0.6);
    drawCtx.fill();

    // Belly ridges
    drawCtx.fillStyle = bellyColor;
    for (let i = 0; i < 5; i++) {
      const segY = -this.size * 0.4 + i * (this.size * 0.2);
      drawCtx.beginPath();
      drawCtx.ellipse(0, segY, this.size * 0.15, this.size * 0.08, 0, 0, Math.PI * 2);
      drawCtx.fill();
    }

    // Snout (long tube)
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.1, -this.size * 0.5);
    drawCtx.lineTo(this.size * 0.4, -this.size * 0.6);
    drawCtx.lineTo(this.size * 0.4, -this.size * 0.5);
    drawCtx.lineTo(this.size * 0.1, -this.size * 0.4);
    drawCtx.closePath();
    drawCtx.fill();

    // Crown/crest on head
    drawCtx.fillStyle = '#ff69b4'; // Hot pink
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.1, -this.size * 0.6);
    drawCtx.lineTo(-this.size * 0.05, -this.size * 0.8);
    drawCtx.lineTo(this.size * 0.05, -this.size * 0.75);
    drawCtx.lineTo(this.size * 0.1, -this.size * 0.6);
    drawCtx.closePath();
    drawCtx.fill();

    // Curled tail
    drawCtx.strokeStyle = bodyColor;
    drawCtx.lineWidth = 6;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.1, this.size * 0.4);
    drawCtx.quadraticCurveTo(
      -this.size * 0.4, this.size * 0.6 + this.tailCurl * 10,
      -this.size * 0.3, this.size * 0.8 + this.tailCurl * 15
    );
    drawCtx.quadraticCurveTo(
      -this.size * 0.1, this.size * 0.7 + this.tailCurl * 10,
      -this.size * 0.2, this.size * 0.5
    );
    drawCtx.stroke();

    // Dorsal fin (back)
    drawCtx.fillStyle = '#ff69b4';
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.15, -this.size * 0.2);
    drawCtx.lineTo(-this.size * 0.35, -this.size * 0.1);
    drawCtx.lineTo(-this.size * 0.15, 0);
    drawCtx.closePath();
    drawCtx.fill();

    // Eye
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.05, -this.size * 0.45, 5, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.07, -this.size * 0.45, 2, 0, Math.PI * 2);
    drawCtx.fill();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#9932cc';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('NIKO', this.x, this.y + this.size + 15);

    // Pearl ready indicator
    if (this.pearlTimer < 5) {
      drawCtx.fillStyle = '#faf0e6';
      drawCtx.font = 'bold 12px Arial';
      drawCtx.fillText('\u25cf', this.x, this.y - this.size * 0.8);
    }
  }
}

// ============================================
// Zorf the Alien Pet (Food Dropper)
// ============================================
export class Zorf {
  constructor(x, y) {
    this.x = x || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2) : 400);
    this.y = y || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.bottom - ctx.tankManager.padding * 2) : 300);
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
      ctx.pellets.push(new Pellet(this.x + offsetX, this.y + this.size * 0.3));
      if (ctx.sound) ctx.sound.play('feed');
      if (ctx.spawnParticles) ctx.spawnParticles(this.x, this.y, 'bubble', 2);
      this.dropTimer = 8;
    }

    // Erratic alien movement
    this.wanderTimer -= dt;
    if (ctx.tankManager && this.wanderTimer <= 0) {
      const newPos = ctx.tankManager.getRandomPosition();
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

    if (ctx.tankManager) {
      const clamped = ctx.tankManager.clampToTank(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Float animation
    const floatY = Math.sin(this.wobble) * 3;
    drawCtx.translate(0, floatY);

    // Green alien blob body
    const bodyColor = '#32cd32'; // Lime green
    const darkColor = '#228b22'; // Forest green

    // Main body (blob shape)
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Darker underside
    drawCtx.fillStyle = darkColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, this.size * 0.2, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI);
    drawCtx.fill();

    // Antenna (two, wobbly)
    drawCtx.strokeStyle = bodyColor;
    drawCtx.lineWidth = 4;
    // Left antenna
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.3, -this.size * 0.5);
    drawCtx.quadraticCurveTo(
      -this.size * 0.4 + this.antennaWobble * 10,
      -this.size * 0.9,
      -this.size * 0.5 + this.antennaWobble * 15,
      -this.size
    );
    drawCtx.stroke();
    // Right antenna
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.3, -this.size * 0.5);
    drawCtx.quadraticCurveTo(
      this.size * 0.4 - this.antennaWobble * 10,
      -this.size * 0.9,
      this.size * 0.5 - this.antennaWobble * 15,
      -this.size
    );
    drawCtx.stroke();

    // Antenna tips (glowing balls)
    drawCtx.fillStyle = '#7fff00'; // Chartreuse
    drawCtx.beginPath();
    drawCtx.arc(-this.size * 0.5 + this.antennaWobble * 15, -this.size, 5, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.5 - this.antennaWobble * 15, -this.size, 5, 0, Math.PI * 2);
    drawCtx.fill();

    // Big alien eyes
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.ellipse(-this.size * 0.35, -this.size * 0.1, 10, 12, 0, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.35, -this.size * 0.1, 10, 12, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Eye shine (big, characteristic alien eyes)
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.arc(-this.size * 0.4, -this.size * 0.2, 4, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.3, -this.size * 0.2, 4, 0, Math.PI * 2);
    drawCtx.fill();

    // Small tentacles/legs underneath
    drawCtx.fillStyle = darkColor;
    for (let i = 0; i < 4; i++) {
      const tentX = -this.size * 0.4 + i * (this.size * 0.27);
      const tentWobble = Math.sin(this.wobble + i) * 3;
      drawCtx.beginPath();
      drawCtx.ellipse(tentX, this.size * 0.5 + tentWobble, 4, 10, 0, 0, Math.PI * 2);
      drawCtx.fill();
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#32cd32';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('ZORF', this.x, this.y + this.size + 15);

    // Drop ready indicator
    if (this.dropTimer < 2) {
      drawCtx.fillStyle = '#7fff00';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('Feeding...', this.x, this.y - this.size - 5);
    }
  }
}

// ============================================
// Itchy the Swordfish (Alien Attacker)
// ============================================
export class Itchy {
  constructor(x, y) {
    this.x = x || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2) : 400);
    this.y = y || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.bottom - ctx.tankManager.padding * 2) : 300);
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

    // Find nearest active alien
    let activeAlien = null;
    for (const a of ctx.aliens) {
      if (!a.dead && !a.entering) {
        activeAlien = a;
        break;
      }
    }

    // PRIORITY: Attack alien if present
    if (activeAlien) {
      this.state = 'attacking';
      this.targetX = activeAlien.x;
      this.targetY = activeAlien.y;

      // Check if close enough to attack
      const dx = activeAlien.x - this.x;
      const dy = activeAlien.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.size + activeAlien.size * 0.5) {
        // Attack the alien! (2 damage per second)
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          if (activeAlien.takeDamage) {
            activeAlien.takeDamage();
            activeAlien.takeDamage(); // 2 damage
          }
          if (ctx.spawnParticles) ctx.spawnParticles(activeAlien.x, activeAlien.y, 'blood', 5);
          if (ctx.sound) ctx.sound.play('hit');
          this.attackTimer = this.attackCooldown;
        }
      }
    } else {
      // Normal wandering when no alien
      this.state = 'wandering';
      this.wanderTimer -= dt;
      if (ctx.tankManager && this.wanderTimer <= 0) {
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

    if (ctx.tankManager) {
      const clamped = ctx.tankManager.clampToTank(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;
    }
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Blue swordfish coloring
    let bodyColor = '#4169e1'; // Royal blue
    let bellyColor = '#87ceeb'; // Sky blue

    if (this.state === 'attacking') {
      bodyColor = '#ff4500'; // Orange-red when attacking
      bellyColor = '#ffa500';
    }

    // Long, streamlined body
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, 0, this.size, this.size * 0.25, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Belly
    drawCtx.fillStyle = bellyColor;
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.1, this.size * 0.05, this.size * 0.6, this.size * 0.12, 0, 0, Math.PI);
    drawCtx.fill();

    // Long pointed bill/sword
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size, 0);
    drawCtx.lineTo(this.size * 1.6, -this.size * 0.05);
    drawCtx.lineTo(this.size * 1.6, this.size * 0.05);
    drawCtx.closePath();
    drawCtx.fill();

    // Bill stripe
    drawCtx.strokeStyle = '#1e90ff';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size, 0);
    drawCtx.lineTo(this.size * 1.5, 0);
    drawCtx.stroke();

    // Dorsal fin (tall, sail-like)
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.2, -this.size * 0.2);
    drawCtx.lineTo(0, -this.size * 0.6);
    drawCtx.lineTo(this.size * 0.3, -this.size * 0.2);
    drawCtx.closePath();
    drawCtx.fill();

    // Tail - forked
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size, 0);
    drawCtx.lineTo(-this.size * 1.3, -this.size * 0.3);
    drawCtx.lineTo(-this.size * 1.1, 0);
    drawCtx.lineTo(-this.size * 1.3, this.size * 0.3);
    drawCtx.closePath();
    drawCtx.fill();

    // Eye
    drawCtx.fillStyle = '#fff';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.5, -this.size * 0.05, 6, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.52, -this.size * 0.05, 3, 0, Math.PI * 2);
    drawCtx.fill();

    // Angry eyebrow when attacking
    if (this.state === 'attacking') {
      drawCtx.strokeStyle = '#000';
      drawCtx.lineWidth = 2;
      drawCtx.beginPath();
      drawCtx.moveTo(this.size * 0.4, -this.size * 0.15);
      drawCtx.lineTo(this.size * 0.6, -this.size * 0.1);
      drawCtx.stroke();
    }

    // Speed lines when attacking
    if (this.state === 'attacking') {
      drawCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      drawCtx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const lineY = -this.size * 0.15 + i * (this.size * 0.15);
        drawCtx.beginPath();
        drawCtx.moveTo(-this.size * 1.2 - i * 5, lineY);
        drawCtx.lineTo(-this.size * 1.5 - i * 5, lineY);
        drawCtx.stroke();
      }
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = this.state === 'attacking' ? '#ff4500' : '#4169e1';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('ITCHY', this.x, this.y + this.size * 0.4 + 15);

    // Attack indicator
    if (this.state === 'attacking') {
      drawCtx.fillStyle = '#ff0000';
      drawCtx.font = 'bold 10px Arial';
      drawCtx.fillText('ATTACKING!', this.x, this.y - this.size * 0.4 - 10);
    }
  }
}

// ============================================
// Clyde the Jellyfish (Coin Collector)
// ============================================
export class Clyde {
  constructor(x, y) {
    this.x = x || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2) : 400);
    this.y = y || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.bottom - ctx.tankManager.padding * 2) : 300);
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
        ctx.addGold(nearestCoin.value);
        ctx.addTotalEarned(nearestCoin.value);
        nearestCoin.collected = true;
        if (ctx.sound) ctx.sound.play('coin');
        if (ctx.spawnParticles) ctx.spawnParticles(nearestCoin.x, nearestCoin.y, 'coin_sparkle', 8);
        if (ctx.updateGoldDisplay) ctx.updateGoldDisplay();
      }
    } else {
      // Gentle floating wander
      if (ctx.tankManager && Math.abs(this.x - this.targetX) < 30 && Math.abs(this.y - this.targetY) < 30) {
        const newPos = ctx.tankManager.getRandomPosition();
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

    if (ctx.tankManager) {
      const clamped = ctx.tankManager.clampToTank(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;
    }
  }

  findNearestCoin() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const coin of ctx.coins) {
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

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    // Pulse animation affects size
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
    drawCtx.scale(pulseScale, pulseScale);

    // Translucent pink jellyfish bell
    drawCtx.fillStyle = 'rgba(255, 182, 193, 0.7)'; // Light pink, translucent
    drawCtx.beginPath();
    drawCtx.arc(0, 0, this.size, Math.PI, 0, false);
    drawCtx.quadraticCurveTo(this.size, this.size * 0.3, 0, this.size * 0.4);
    drawCtx.quadraticCurveTo(-this.size, this.size * 0.3, -this.size, 0);
    drawCtx.fill();

    // Inner bell pattern
    drawCtx.fillStyle = 'rgba(255, 105, 180, 0.4)'; // Darker pink
    drawCtx.beginPath();
    drawCtx.arc(0, -this.size * 0.1, this.size * 0.6, Math.PI, 0, false);
    drawCtx.quadraticCurveTo(this.size * 0.6, this.size * 0.1, 0, this.size * 0.2);
    drawCtx.quadraticCurveTo(-this.size * 0.6, this.size * 0.1, -this.size * 0.6, -this.size * 0.1);
    drawCtx.fill();

    // Bell edge glow
    drawCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.arc(0, 0, this.size, Math.PI, 0, false);
    drawCtx.stroke();

    // Trailing tentacles
    drawCtx.strokeStyle = 'rgba(255, 182, 193, 0.8)';
    drawCtx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const tentX = -this.size * 0.6 + i * (this.size * 0.3);
      const tentWobble = Math.sin(this.tentaclePhase + i * 0.8) * 8;
      const tentLength = this.size * (0.8 + (i % 2) * 0.4);

      drawCtx.beginPath();
      drawCtx.moveTo(tentX, this.size * 0.3);
      drawCtx.quadraticCurveTo(
        tentX + tentWobble,
        this.size * 0.3 + tentLength * 0.5,
        tentX + tentWobble * 1.5,
        this.size * 0.3 + tentLength
      );
      drawCtx.stroke();
    }

    // Short frilly tentacles at bell edge
    drawCtx.strokeStyle = 'rgba(255, 192, 203, 0.6)';
    drawCtx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + (i / 7) * Math.PI;
      const startX = Math.cos(angle) * this.size * 0.9;
      const startY = Math.sin(angle) * this.size * 0.3 + this.size * 0.2;
      const wobble = Math.sin(this.tentaclePhase + i) * 3;

      drawCtx.beginPath();
      drawCtx.moveTo(startX, startY);
      drawCtx.lineTo(startX + wobble, startY + this.size * 0.3);
      drawCtx.stroke();
    }

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#ff69b4';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('CLYDE', this.x, this.y + this.size * 1.8);
  }
}

// ============================================
// Angie the Angel Fish (Reviver)
// ============================================
export class Angie {
  constructor(x, y) {
    this.x = x || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2) : 400);
    this.y = y || (ctx.tankManager ? ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.bottom - ctx.tankManager.padding * 2) : 300);
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
    const hasActive = ctx.hasActiveAlien ? ctx.hasActiveAlien() : false;
    if (!hasActive) {
      this.hasRevivedThisAttack = false;
    }

    // Gentle wandering
    this.wanderTimer -= dt;
    if (ctx.tankManager && this.wanderTimer <= 0) {
      const newPos = ctx.tankManager.getRandomPosition();
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

    if (ctx.tankManager) {
      const clamped = ctx.tankManager.clampToTank(this.x, this.y);
      this.x = clamped.x;
      this.y = clamped.y;
    }
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
    if (ctx.sound) ctx.sound.play('evolve');
    if (ctx.spawnParticles) ctx.spawnParticles(fish.x, fish.y, 'sparkle', 25);

    return true;
  }

  canRevive() {
    const hasActive = ctx.hasActiveAlien ? ctx.hasActiveAlien() : false;
    return !this.hasRevivedThisAttack && hasActive;
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Glowing aura
    const glowIntensity = 0.3 + Math.sin(this.glowPhase) * 0.15;
    const gradient = drawCtx.createRadialGradient(0, 0, this.size * 0.5, 0, 0, this.size * 1.5);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    drawCtx.fillStyle = gradient;
    drawCtx.beginPath();
    drawCtx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
    drawCtx.fill();

    // White/cream angel fish body
    const bodyColor = '#fffaf0'; // Floral white
    const accentColor = '#ffd700'; // Gold

    // Main body - diamond/angular shape
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.6, 0);
    drawCtx.lineTo(0, -this.size * 0.5);
    drawCtx.lineTo(-this.size * 0.4, 0);
    drawCtx.lineTo(0, this.size * 0.5);
    drawCtx.closePath();
    drawCtx.fill();

    // Wing/fin (angel wings)
    const wingOffset = Math.sin(this.wingPhase) * 5;
    drawCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    // Top wing
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.2, -this.size * 0.3);
    drawCtx.quadraticCurveTo(
      -this.size * 0.5,
      -this.size * 0.8 - wingOffset,
      -this.size * 0.8,
      -this.size * 0.6 - wingOffset
    );
    drawCtx.quadraticCurveTo(
      -this.size * 0.4,
      -this.size * 0.4,
      -this.size * 0.2,
      -this.size * 0.3
    );
    drawCtx.fill();
    // Bottom wing
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.2, this.size * 0.3);
    drawCtx.quadraticCurveTo(
      -this.size * 0.5,
      this.size * 0.8 + wingOffset,
      -this.size * 0.8,
      this.size * 0.6 + wingOffset
    );
    drawCtx.quadraticCurveTo(
      -this.size * 0.4,
      this.size * 0.4,
      -this.size * 0.2,
      this.size * 0.3
    );
    drawCtx.fill();

    // Tail
    drawCtx.fillStyle = bodyColor;
    drawCtx.beginPath();
    drawCtx.moveTo(-this.size * 0.4, 0);
    drawCtx.lineTo(-this.size * 0.7, -this.size * 0.2);
    drawCtx.lineTo(-this.size * 0.7, this.size * 0.2);
    drawCtx.closePath();
    drawCtx.fill();

    // Gold accents/stripes
    drawCtx.strokeStyle = accentColor;
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.2, -this.size * 0.3);
    drawCtx.lineTo(this.size * 0.2, this.size * 0.3);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(0, -this.size * 0.35);
    drawCtx.lineTo(0, this.size * 0.35);
    drawCtx.stroke();

    // Halo above head
    drawCtx.strokeStyle = accentColor;
    drawCtx.lineWidth = 3;
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.3, -this.size * 0.5 - 8, 12, 5, 0, 0, Math.PI * 2);
    drawCtx.stroke();

    // Halo glow
    drawCtx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(this.glowPhase * 2) * 0.2})`;
    drawCtx.beginPath();
    drawCtx.ellipse(this.size * 0.3, -this.size * 0.5 - 8, 10, 4, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Eye
    drawCtx.fillStyle = '#87ceeb'; // Sky blue
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.35, -this.size * 0.1, 6, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.37, -this.size * 0.1, 3, 0, Math.PI * 2);
    drawCtx.fill();

    // Body outline
    drawCtx.strokeStyle = 'rgba(255,215,0,0.5)';
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.6, 0);
    drawCtx.lineTo(0, -this.size * 0.5);
    drawCtx.lineTo(-this.size * 0.4, 0);
    drawCtx.lineTo(0, this.size * 0.5);
    drawCtx.closePath();
    drawCtx.stroke();

    drawCtx.restore();

    // Label
    drawCtx.fillStyle = '#ffd700';
    drawCtx.font = 'bold 10px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('ANGIE', this.x, this.y + this.size * 0.7 + 15);

    // Revive status indicator
    const hasActive = ctx.hasActiveAlien ? ctx.hasActiveAlien() : false;
    if (hasActive) {
      if (this.hasRevivedThisAttack) {
        drawCtx.fillStyle = 'rgba(150, 150, 150, 0.8)';
        drawCtx.font = 'bold 9px Arial';
        drawCtx.fillText('Revive Used', this.x, this.y - this.size * 0.7 - 5);
      } else {
        drawCtx.fillStyle = 'rgba(255, 215, 0, 0.9)';
        drawCtx.font = 'bold 9px Arial';
        drawCtx.fillText('Revive Ready!', this.x, this.y - this.size * 0.7 - 5);
      }
    }
  }
}
