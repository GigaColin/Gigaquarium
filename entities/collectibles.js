// entities/collectibles.js - Pellet, Coin, Beetle classes

// Game context (injected from main.js)
let ctx = {
  tankManager: null,
  foodUpgraded: false,
  COIN_TYPES: {}
};

/**
 * Set the game context for collectibles module
 * @param {object} gameContext - Object with tankManager, foodUpgraded, COIN_TYPES
 */
export function setCollectiblesContext(gameContext) {
  ctx = { ...ctx, ...gameContext };
}

/**
 * Update food upgraded status (called when player upgrades food)
 */
export function updateFoodUpgradedStatus(upgraded) {
  ctx.foodUpgraded = upgraded;
}

// ============================================
// Pellet Class
// ============================================
export class Pellet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 8;
    this.fallSpeed = 80;
    this.upgraded = ctx.foodUpgraded;
  }

  update(dt) {
    this.y += this.fallSpeed * dt;
    if (ctx.tankManager && this.y > ctx.tankManager.bounds.bottom - ctx.tankManager.padding) {
      this.y = ctx.tankManager.bounds.bottom - ctx.tankManager.padding;
    }
  }

  draw(drawCtx) {
    // Upgraded pellets are green and slightly larger
    if (this.upgraded) {
      drawCtx.fillStyle = '#32cd32';
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
      drawCtx.fill();
    } else {
      drawCtx.fillStyle = '#8b4513';
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      drawCtx.fill();
    }
  }
}

// ============================================
// Coin Class
// ============================================
export class Coin {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    const config = ctx.COIN_TYPES[type] || { value: 0, color: '#888', size: 10, label: '$0' };
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
      if (ctx.tankManager && this.y > ctx.tankManager.padding) {
        this.y -= this.fallSpeed * 0.8 * dt;
        this.x += Math.sin(this.age * this.wobbleSpeed + this.wobbleOffset) * 15 * dt;

        // Keep within horizontal bounds
        if (ctx.tankManager) {
          const clamped = ctx.tankManager.clampToTank(this.x, this.y);
          this.x = clamped.x;
        }
      } else {
        // Star escaped off top of screen
        this.escaped = true;
      }
    } else {
      // Sink slowly with wobble
      if (ctx.tankManager && this.y < ctx.tankManager.bounds.bottom - ctx.tankManager.padding) {
        this.y += this.fallSpeed * dt;
        this.x += Math.sin(this.age * this.wobbleSpeed + this.wobbleOffset) * 20 * dt;

        // Keep within horizontal bounds
        const clamped = ctx.tankManager.clampToTank(this.x, this.y);
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

  draw(drawCtx) {
    drawCtx.save();

    // Outer glow
    drawCtx.shadowColor = this.color;
    drawCtx.shadowBlur = this.type === 'star' ? 15 : 10;

    if (this.type === 'star') {
      // Draw 5-pointed star shape
      const spikes = 5;
      const outerRadius = this.size;
      const innerRadius = this.size * 0.5;
      const rotation = Math.PI / 2 + this.age * 2; // Rotate over time

      drawCtx.fillStyle = this.color;
      drawCtx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI / spikes) - rotation;
        const px = this.x + Math.cos(angle) * radius;
        const py = this.y + Math.sin(angle) * radius;
        if (i === 0) drawCtx.moveTo(px, py);
        else drawCtx.lineTo(px, py);
      }
      drawCtx.closePath();
      drawCtx.fill();

      // Inner sparkle
      drawCtx.fillStyle = 'rgba(255,255,255,0.8)';
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
      drawCtx.fill();

      // Sparkle particles around star
      if (Math.random() < 0.3) {
        drawCtx.fillStyle = 'rgba(255,255,255,0.6)';
        const sparkleAngle = Math.random() * Math.PI * 2;
        const sparkleDist = this.size * (0.8 + Math.random() * 0.5);
        drawCtx.beginPath();
        drawCtx.arc(
          this.x + Math.cos(sparkleAngle) * sparkleDist,
          this.y + Math.sin(sparkleAngle) * sparkleDist,
          2, 0, Math.PI * 2
        );
        drawCtx.fill();
      }
    } else {
      // Coin body (circle for regular coins)
      drawCtx.fillStyle = this.color;
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      drawCtx.fill();

      // Inner shine
      drawCtx.fillStyle = 'rgba(255,255,255,0.4)';
      drawCtx.beginPath();
      drawCtx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.4, 0, Math.PI * 2);
      drawCtx.fill();

      // Diamond shape for diamond coins
      if (this.type === 'diamond') {
        drawCtx.fillStyle = '#ffffff';
        drawCtx.beginPath();
        drawCtx.moveTo(this.x, this.y - this.size * 0.5);
        drawCtx.lineTo(this.x + this.size * 0.4, this.y);
        drawCtx.lineTo(this.x, this.y + this.size * 0.5);
        drawCtx.lineTo(this.x - this.size * 0.4, this.y);
        drawCtx.closePath();
        drawCtx.fill();
      }

      // Pearl - iridescent shimmer effect
      if (this.type === 'pearl') {
        // Subtle rainbow shimmer
        const shimmerAngle = this.age * 2;
        const shimmerX = Math.cos(shimmerAngle) * this.size * 0.2;
        const shimmerY = Math.sin(shimmerAngle) * this.size * 0.2;

        // Pink tint
        drawCtx.fillStyle = 'rgba(255, 182, 193, 0.3)';
        drawCtx.beginPath();
        drawCtx.arc(this.x + shimmerX, this.y + shimmerY, this.size * 0.5, 0, Math.PI * 2);
        drawCtx.fill();

        // Blue tint on opposite side
        drawCtx.fillStyle = 'rgba(173, 216, 230, 0.3)';
        drawCtx.beginPath();
        drawCtx.arc(this.x - shimmerX, this.y - shimmerY, this.size * 0.4, 0, Math.PI * 2);
        drawCtx.fill();

        // Extra bright center highlight
        drawCtx.fillStyle = 'rgba(255,255,255,0.6)';
        drawCtx.beginPath();
        drawCtx.arc(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
        drawCtx.fill();
      }

      // $ symbol for silver/gold
      if (this.type === 'silver' || this.type === 'gold') {
        drawCtx.fillStyle = 'rgba(0,0,0,0.5)';
        drawCtx.font = `bold ${this.size}px Arial`;
        drawCtx.textAlign = 'center';
        drawCtx.textBaseline = 'middle';
        drawCtx.fillText('$', this.x, this.y);
      }

      // Treasure chest shape
      if (this.type === 'treasure' || this.type === 'chest') {
        // Chest body (brown rectangle)
        drawCtx.fillStyle = '#654321';
        drawCtx.fillRect(this.x - this.size * 0.6, this.y - this.size * 0.4, this.size * 1.2, this.size * 0.8);

        // Chest lid (darker brown curved top)
        drawCtx.fillStyle = '#8b4513';
        drawCtx.beginPath();
        drawCtx.arc(this.x - this.size * 0.3, this.y - this.size * 0.4, this.size * 0.4, Math.PI, 0, true);
        drawCtx.arc(this.x + this.size * 0.3, this.y - this.size * 0.4, this.size * 0.4, Math.PI, 0, false);
        drawCtx.fill();

        // Gold trim
        drawCtx.strokeStyle = '#ffd700';
        drawCtx.lineWidth = 2;
        drawCtx.strokeRect(this.x - this.size * 0.6, this.y - this.size * 0.4, this.size * 1.2, this.size * 0.8);

        // Gold coins inside glow
        drawCtx.fillStyle = 'rgba(255,215,0,0.6)';
        drawCtx.beginPath();
        drawCtx.ellipse(this.x, this.y, this.size * 0.5, this.size * 0.3, 0, 0, Math.PI * 2);
        drawCtx.fill();

        // Lock detail
        drawCtx.fillStyle = '#ffd700';
        drawCtx.beginPath();
        drawCtx.arc(this.x, this.y + this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
        drawCtx.fill();

        drawCtx.fillStyle = '#654321';
        drawCtx.beginPath();
        drawCtx.arc(this.x, this.y + this.size * 0.1, this.size * 0.1, 0, Math.PI * 2);
        drawCtx.fill();
      }
    }

    drawCtx.restore();
  }
}

// ============================================
// Beetle Class (Collectible that scuttles along bottom)
// ============================================
export class Beetle {
  constructor(x, y) {
    this.x = x;
    this.y = ctx.tankManager ? ctx.tankManager.bounds.bottom - ctx.tankManager.padding : y;
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
    if (ctx.tankManager && Math.abs(this.x - this.targetX) < 10) {
      this.targetX = ctx.tankManager.padding + Math.random() * (ctx.tankManager.bounds.right - ctx.tankManager.padding * 2);
    }

    // Movement (only horizontal)
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 2) {
      this.x += Math.sign(dx) * this.speed * dt;
      this.facingLeft = dx < 0;
    }

    // Clamp to bottom bounds
    if (ctx.tankManager) {
      this.x = Math.max(ctx.tankManager.padding, Math.min(ctx.tankManager.bounds.right - ctx.tankManager.padding, this.x));
    }
  }

  isClicked(clickX, clickY) {
    const dx = clickX - this.x;
    const dy = clickY - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size + 15; // Generous click area
  }

  draw(drawCtx) {
    drawCtx.save();
    drawCtx.translate(this.x, this.y);

    if (this.facingLeft) {
      drawCtx.scale(-1, 1);
    }

    // Shiny shell - dark brown/black
    const shellColor = '#3d2b1f';
    const shellHighlight = '#5c4033';

    // Shell body
    drawCtx.fillStyle = shellColor;
    drawCtx.beginPath();
    drawCtx.ellipse(0, -this.size * 0.3, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    drawCtx.fill();

    // Shell shine
    drawCtx.fillStyle = shellHighlight;
    drawCtx.beginPath();
    drawCtx.ellipse(-this.size * 0.2, -this.size * 0.5, this.size * 0.4, this.size * 0.2, -0.3, 0, Math.PI * 2);
    drawCtx.fill();

    // Shell segments (lines)
    drawCtx.strokeStyle = '#2a1f14';
    drawCtx.lineWidth = 1;
    drawCtx.beginPath();
    drawCtx.moveTo(0, -this.size * 0.7);
    drawCtx.lineTo(0, this.size * 0.1);
    drawCtx.stroke();

    // Legs (6 total, animated)
    drawCtx.strokeStyle = '#4a3728';
    drawCtx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const legOffset = (i - 1) * this.size * 0.5;
      const legWiggle = Math.sin(this.legPhase + i * 1.5) * 3;

      // Left leg
      drawCtx.beginPath();
      drawCtx.moveTo(legOffset, -this.size * 0.1);
      drawCtx.lineTo(legOffset - 8 - legWiggle, this.size * 0.3);
      drawCtx.stroke();

      // Right leg
      drawCtx.beginPath();
      drawCtx.moveTo(legOffset, -this.size * 0.1);
      drawCtx.lineTo(legOffset + 8 + legWiggle, this.size * 0.3);
      drawCtx.stroke();
    }

    // Antennae
    drawCtx.strokeStyle = '#4a3728';
    drawCtx.lineWidth = 1.5;
    const antennaWiggle = Math.sin(this.wobble) * 2;
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.6, -this.size * 0.3);
    drawCtx.quadraticCurveTo(this.size * 0.9, -this.size * 0.8 + antennaWiggle, this.size * 0.7, -this.size);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(this.size * 0.8, -this.size * 0.3);
    drawCtx.quadraticCurveTo(this.size * 1.1, -this.size * 0.7 + antennaWiggle, this.size * 1.0, -this.size * 0.9);
    drawCtx.stroke();

    // Eyes (small)
    drawCtx.fillStyle = '#000';
    drawCtx.beginPath();
    drawCtx.arc(this.size * 0.5, -this.size * 0.4, 2, 0, Math.PI * 2);
    drawCtx.fill();

    drawCtx.restore();

    // Value label
    drawCtx.fillStyle = '#ffd700';
    drawCtx.font = 'bold 9px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('$150', this.x, this.y + 15);
  }
}
