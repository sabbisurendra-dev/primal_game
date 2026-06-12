const Phaser = window.Phaser;
import { STATE, CONFIG, STATE_CONTROLLER, triggerMilestoneFlash } from './state.js';

// --- VISUAL RENDERING ENTITIES ---
class Particle {
  constructor(x, y, color, size, vx, vy, life, gy = 0) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.gy = gy;
    this.maxLife = life;
    this.life = life;
  }
  
  update(delta) {
    const dt = delta / 16.6;
    this.x += this.vx * dt;
    this.vy += this.gy * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  
  draw(graphics) {
    const alpha = Math.max(0, this.life / this.maxLife);
    let colorRGB = 0xf2f2f2;
    if (typeof this.color === 'number') {
      colorRGB = this.color;
    } else if (this.color.includes('46, 204, 113')) {
      colorRGB = 0x2ecc71;
    } else if (this.color.includes('231, 76, 60')) {
      colorRGB = 0xe74c3c;
    }
    graphics.fillStyle(colorRGB, alpha);
    graphics.fillCircle(this.x, this.y, this.size);
  }
}

class AbsorptionParticle {
  constructor(startX, startY, endX, endY, color, duration = 800) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.cpX = startX + (endX - startX) * 0.5;
    this.cpY = startY + (Math.random() - 0.5) * 200;
    this.color = color;
    this.duration = duration;
    this.time = 0;
    this.x = startX;
    this.y = startY;
  }
  
  update(delta) {
    this.time += delta;
    const t = Math.min(1.0, this.time / this.duration);
    if (t < 0) return true;
    const mt = 1 - t;
    this.x = mt * mt * this.startX + 2 * mt * t * this.cpX + t * t * this.endX;
    this.y = mt * mt * this.startY + 2 * mt * t * this.cpY + t * t * this.endY;
    return t < 1.0;
  }
  
  draw(graphics) {
    if (this.time < 0) return;
    graphics.fillStyle(this.color, 0.8 * (1.0 - (this.time / this.duration) * 0.3));
    graphics.fillCircle(this.x, this.y, 1.5);
  }
}

class BackgroundDust {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 10;
    this.y = Math.random() * height;
    this.z = 0.4 + Math.random() * 2.6; // depth factor (lower is closer/foreground)
    this.size = (0.5 + Math.random() * 2.5) / this.z;
    this.speed = (0.3 + Math.random() * 0.9) / this.z;
    this.opacity = (0.08 + Math.random() * 0.28) / this.z;
    this.wiggleSpeed = (0.001 + Math.random() * 0.002) / this.z;
    this.wiggleAmp = (1.0 + Math.random() * 4.0) / this.z;
    this.seed = Math.random() * 100;
  }
  
  update(width, height, speedMultiplier, delta) {
    let currentSpeed = this.speed;
    if (STATE.currentStreak >= 7) {
      currentSpeed = this.speed * 2.2;
    }
    this.x -= currentSpeed * speedMultiplier * (delta / 16.6);
    this.y += Math.sin(Date.now() * this.wiggleSpeed + this.seed) * this.wiggleAmp * 0.06 * (delta / 16.6);
    
    if (this.x < -20) {
      this.reset(width, height);
    }
  }
  
  draw(graphics) {
    let size = this.size;
    let opacity = this.opacity;
    if (STATE.currentStreak >= 7) {
      size = this.size * 1.5;
      opacity = Math.min(0.7, this.opacity * 1.4);
    }
    graphics.fillStyle(0xffffff, opacity);
    graphics.fillCircle(this.x, this.y, size);
    
    // Simulate bokeh for close foreground particles
    if (this.z < 0.8) {
      graphics.fillStyle(0xffffff, opacity * 0.35);
      graphics.fillCircle(this.x, this.y, size * 2.8);
    } else if (size > 1.8) {
      graphics.fillStyle(0xffffff, opacity * 0.25);
      graphics.fillCircle(this.x, this.y, size * 2.5);
    }
  }
}

class GameMacroStructure {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 300;
    this.y = Math.random() * height;
    this.radius = 200 + Math.random() * 250;
    this.speed = 0.12 + Math.random() * 0.18;
    this.z = 1.4 + Math.random() * 1.6; // background depth
    this.seed = Math.random() * 100;
    this.opacity = 0.015 + Math.random() * 0.035;
  }
  
  update(speedMultiplier, delta) {
    this.x -= this.speed * speedMultiplier * (delta / 16.6);
    this.y += Math.sin(Date.now() * 0.0004 + this.seed) * 0.08 * (delta / 16.6);
    
    if (this.x + this.radius < -50) {
      this.reset(this.scaleWidth || 1000, this.scaleHeight || 600);
    }
  }
  
  draw(graphics) {
    const steps = 7;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = this.radius * (1 - t * 0.5);
      const alpha = this.opacity * t;
      
      // Muted dark organic misty green/teal shade
      graphics.fillStyle(0x0a3c4a, alpha);
      graphics.fillCircle(this.x, this.y, r);
    }
  }
}

class MembranePoint {
  constructor(angle, baseRadius) {
    this.angle = angle;
    this.baseRadius = baseRadius;
    this.offset = 0;
    this.velocity = 0;
    this.targetOffset = 0;
  }
  
  update(massScale, delta) {
    const k = 0.08; // Spring constant
    const damping = 0.88; // Damping
    
    const time = Date.now();
    const primaryLobe = Math.sin(time * 0.001 + this.angle) * (14 * massScale);
    const secondaryLobe = Math.cos(time * 0.0023 + this.angle * 3) * (8 * massScale);
    const ripple = Math.sin(time * 0.006 + this.angle * 5) * (3 * massScale);
    
    this.targetOffset = primaryLobe + secondaryLobe + ripple;
    
    const force = k * (this.targetOffset - this.offset);
    this.velocity += force * (delta / 16.6);
    this.velocity *= Math.pow(damping, delta / 16.6);
    this.offset += this.velocity * (delta / 16.6);
  }
}

function drawGlowCircle(graphics, x, y, radius, startColor, endColor, steps = 8) {
  const r0 = startColor.r, g0 = startColor.g, b0 = startColor.b, a0 = startColor.a;
  const r1 = endColor.r, g1 = endColor.g, b1 = endColor.b, a1 = endColor.a;
  
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = radius * (1 - t * 0.9);
    
    const currR = Math.round(r0 + (r1 - r0) * t);
    const currG = Math.round(g0 + (g1 - g0) * t);
    const currB = Math.round(b0 + (b1 - b0) * t);
    const currA = a0 + (a1 - a0) * t;
    const hex = (currR << 16) + (currG << 8) + currB;
    
    graphics.fillStyle(hex, currA);
    graphics.fillCircle(x, y, r);
  }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.particles = [];
    this.absorptionParticles = [];
    this.currents = [];
    this.macroStructures = [];
    this.membranePoints = [];
    this.graphics = null;
    this.player = null;
  }

  create() {
    this.graphics = this.add.graphics();
    
    // Position player cell
    const width = this.scale.width;
    const height = this.scale.height;
    const isMobile = width <= 768;
    const px = isMobile ? width * 0.3 : 400;
    
    this.player = {
      x: px,
      y: height / 2,
      targetY: height / 2,
      radius: isMobile ? 45 : 78,
      targetRadius: isMobile ? 45 : 78,
      massScale: 1.0,
      wobbleSpeed: 0.005,
      steerOffset: 0,
      rippleTime: 0,
      rippleDuration: 350,
      reproOrganelleAlpha: 0,
      ghosts: [],
      glowColorRGB: { r: 46, g: 196, b: 182 },
      glowHex: 0x2ec4b6,
      tail: []
    };
    
    this.ringPulseScale = 0.0;
    this.ringPulseAlpha = 0.0;
    
    this.initMembrane();
    this.initCurrents(width, height);
    
    // Setup inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Pointer/Touch choice support
    this.input.on('pointerdown', (pointer) => {
      if (!STATE.isPlaying || STATE.isTransitioning) return;
      const touchY = pointer.y;
      const zoneHeight = this.scale.height / 3;
      if (touchY < zoneHeight) {
        STATE_CONTROLLER.choosePath(0);
      } else if (touchY > zoneHeight * 2) {
        STATE_CONTROLLER.choosePath(2);
      } else {
        STATE_CONTROLLER.choosePath(1);
      }
    });

    // Register global renderer hooks so state.js can interact with this scene
    window.renderer = this;
    
    // Handle window resize dynamically
    this.scale.on('resize', this.resize, this);
    
    if (STATE.isPlaying) {
      this.generatePaths();
    }
  }

  initMembrane() {
    this.membranePoints = [];
    const numPoints = 16;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.membranePoints.push(new MembranePoint(angle, this.player.radius));
    }
  }

  initCurrents(width, height) {
    this.currents = [];
    for (let i = 0; i < 160; i++) {
      this.currents.push(new BackgroundDust(width, height));
    }

    this.macroStructures = [];
    for (let i = 0; i < 5; i++) {
      const ms = new GameMacroStructure(width, height);
      ms.scaleWidth = width;
      ms.scaleHeight = height;
      this.macroStructures.push(ms);
    }
  }

  spawnBestPathBurst(x, y) {
    const count = 12 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.0;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random();
      const life = 36;
      this.particles.push(new Particle(x, y, 0x2ecc71, size, vx, vy, life, 0.3));
    }
  }

  spawnNutrientAbsorptionTrail() {
    const width = this.scale.width;
    const height = this.scale.height;
    for (let i = 0; i < 8; i++) {
      const startX = width + 10;
      const startY = Math.random() * height;
      const delay = i * 60;
      const p = new AbsorptionParticle(startX, startY, this.player.x, this.player.y, 0x2ecc71, 800);
      p.time = -delay;
      this.absorptionParticles.push(p);
    }
  }

  triggerMembraneRipple() {
    this.player.rippleTime = 350;
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    const isMobile = width <= 768;
    
    this.player.radius = isMobile ? 45 : 78;
    this.player.targetRadius = isMobile ? 45 : 78;
    this.player.x = isMobile ? width * 0.3 : 400;
    
    const minY = isMobile ? 140 : 190;
    const maxY = height - 120;
    this.player.y = Math.max(minY, Math.min(maxY, this.player.y));
    this.player.targetY = Math.max(minY, Math.min(maxY, this.player.targetY));
    
    if (STATE.isPlaying) {
      this.generatePaths();
    }
  }

  generatePaths() {
    const width = this.scale.width;
    const height = this.scale.height;
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = width - 120;
    
    const qualities = ['best', 'ok', 'worst'];
    if (STATE.hasLifeline) {
      qualities[0] = 'best';
    }
    
    // Shuffle path qualities
    for (let i = qualities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qualities[i], qualities[j]] = [qualities[j], qualities[i]];
    }
    
    const branchDelta = Math.min(220, height * 0.28);
    const isMobile = width <= 768;
    const minY = isMobile ? 140 : 190;
    const maxY = height - 120;
    const endYPositions = [
      Math.max(minY, Math.min(maxY, startY - branchDelta)),
      Math.max(minY, Math.min(maxY, startY)),
      Math.max(minY, Math.min(maxY, startY + branchDelta))
    ];
    
    STATE.paths = [];
    
    for (let i = 0; i < 3; i++) {
      const endY = endYPositions[i];
      const cp1X = startX + (endX - startX) * 0.35;
      const cp1Y = startY;
      const cp2X = startX + (endX - startX) * 0.65;
      const cp2Y = endY;
      
      STATE.paths.push({
        index: i,
        quality: qualities[i],
        startY: startY,
        endY: endY,
        cp1X: cp1X,
        cp1Y: cp1Y,
        cp2X: cp2X,
        cp2Y: cp2Y,
        endX: endX,
        particles: this.generatePathNutrients(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY, qualities[i])
      });
    }
    
    this.pathGenerationTime = Date.now();
    if (window.updateButtonVisuals) {
      window.updateButtonVisuals();
    }
  }

  generatePathNutrients(x0, y0, cx1, cy1, cx2, cy2, x3, y3, quality) {
    const list = [];
    const count = 6;
    
    let color = 'rgba(240, 240, 240, ALPHA)';
    if (quality === 'best') color = 'rgba(46, 204, 113, ALPHA)';
    if (quality === 'worst') color = 'rgba(231, 76, 60, ALPHA)';
    
    for (let i = 0; i < count; i++) {
      const spikes = 5 + Math.floor(Math.random() * 4);
      const spikeHeights = Array.from({length: spikes}, () => 0.35 + Math.random() * 0.65);
      
      list.push({
        t: i / count,
        size: quality === 'best' ? 6 + Math.random() * 3 : 5 + Math.random() * 2,
        color: color,
        pulseOffset: Math.random() * Math.PI * 2,
        spikes: spikes,
        spikeHeights: spikeHeights,
        rotSpeed: (0.015 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1)
      });
    }
    return list;
  }

  getBezierPoint(p, t, shiftX = 0) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = mt3 * (this.player.x - shiftX) + 3 * mt2 * t * (p.cp1X - shiftX) + 3 * mt * t2 * (p.cp2X - shiftX) + t3 * (p.endX - shiftX);
    const y = mt3 * p.startY + 3 * mt2 * t * p.cp1Y + 3 * mt * t2 * p.cp2Y + t3 * p.endY;
    
    return { x, y };
  }

  spawnChoiceSplash(x, y, quality) {
    let color = 'rgba(240, 240, 240, ALPHA)';
    if (quality === 'best') color = 'rgba(46, 204, 113, ALPHA)';
    if (quality === 'worst') color = 'rgba(231, 76, 60, ALPHA)';
    
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 8.5;
      this.particles.push(new Particle(
        x,
        y,
        color,
        2.0 + Math.random() * 4.5,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        35 + Math.floor(Math.random() * 25)
      ));
    }
  }

  triggerRingPulse() {
    this.ringPulseScale = 0.0;
    this.ringPulseAlpha = 1.0;
  }

  update(time, delta) {
    this.graphics.clear();
    
    // Update fork selection timer and check auto-choice / poll inputs
    if (STATE.isPlaying && !STATE.isTransitioning) {
      STATE.distanceTraveled += STATE.currentSpeed * (delta / 1000) * 10;
      STATE.forkTimer -= delta / 1000;
      if (STATE.forkTimer <= 0) {
        const fallbackPathIndex = STATE.isThreatWarning ? 
          STATE.paths.findIndex(p => p.quality === 'best') : 1;
        STATE_CONTROLLER.choosePath(fallbackPathIndex !== -1 ? fallbackPathIndex : 1, true);
      } else if (this.cursors && this.keys) {
        if (this.cursors.up.isDown || this.keys.w.isDown) {
          STATE_CONTROLLER.choosePath(0);
        } else if (this.cursors.down.isDown || this.keys.s.isDown) {
          STATE_CONTROLLER.choosePath(2);
        } else if (this.cursors.right.isDown || this.keys.d.isDown || this.cursors.space.isDown) {
          STATE_CONTROLLER.choosePath(1);
        }
      }
    }
    
    const width = this.scale.width;
    const height = this.scale.height;
    const isMobile = width <= 768;
    
    // 1. Update Game Physics Entities
    const targetX = isMobile ? width * 0.3 : 400;
    
    let trT = 0;
    if (STATE.isTransitioning && STATE.transitionStart) {
      const elapsed = Date.now() - STATE.transitionStart;
      trT = Math.min(1.0, elapsed / 450);
    }
    
    let targetY = STATE.isPlaying ? this.player.targetY : height / 2;
    if (trT > 0 && STATE.chosenPathIndex !== undefined && STATE.paths && STATE.paths[STATE.chosenPathIndex]) {
      const selectedPath = STATE.paths[STATE.chosenPathIndex];
      const pt = this.getBezierPoint(selectedPath, trT);
      
      // Real-time steering input (WASD/Arrows or Mouse pointer)
      const pointer = this.input.activePointer;
      let keyboardSteer = 0;
      if (this.cursors && this.keys) {
        if (this.cursors.up.isDown || this.keys.w.isDown) {
          keyboardSteer = -2.8;
        } else if (this.cursors.down.isDown || this.keys.s.isDown) {
          keyboardSteer = 2.8;
        }
      }
      
      if (keyboardSteer !== 0) {
        this.player.steerOffset += keyboardSteer * (delta / 16.6);
      } else if (pointer && pointer.isDown) {
        const mouseSteerTarget = Phaser.Math.Clamp(pointer.y - pt.y, -35, 35);
        this.player.steerOffset += (mouseSteerTarget - this.player.steerOffset) * 0.15 * (delta / 16.6);
      } else {
        this.player.steerOffset *= Math.pow(0.88, delta / 16.6);
      }
      
      this.player.steerOffset = Phaser.Math.Clamp(this.player.steerOffset, -35, 35);
      
      targetY = pt.y + this.player.steerOffset;
      this.player.y = pt.y + this.player.steerOffset;
      this.player.targetY = pt.y + this.player.steerOffset;
    } else {
      this.player.steerOffset = 0;
      this.player.y += (targetY - this.player.y) * 0.08 * (delta / 16.6);
    }
    
    this.player.x += (targetX - this.player.x) * 0.08 * (delta / 16.6);

    const minY = isMobile ? 140 : 190;
    const maxY = height - 120;
    this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);
    this.player.targetY = Phaser.Math.Clamp(this.player.targetY, minY, maxY);

    // 2a. Smooth radius scaling based on health
    const targetRadius = (isMobile ? 32 : 56) + (STATE.health / 100) * (isMobile ? 16 : 28);
    this.player.radius += (targetRadius - this.player.radius) * 0.04 * (delta / 16.6);

    // 2d. Color temperature shift based on health
    let targetRGB = { r: 46, g: 196, b: 182 }; // Neutral teal #2ec4b6
    if (STATE.health > 65) {
      targetRGB = { r: 245, g: 200, b: 66 }; // Thriving gold #f5c842
    } else if (STATE.health < 35) {
      targetRGB = { r: 55, g: 138, b: 221 }; // Struggling blue #378ADD
    }
    
    if (!this.player.glowColorRGB) {
      this.player.glowColorRGB = { r: 46, g: 196, b: 182 };
    }
    const lerpSpeed = 0.04 * (delta / 16.6);
    this.player.glowColorRGB.r += (targetRGB.r - this.player.glowColorRGB.r) * lerpSpeed;
    this.player.glowColorRGB.g += (targetRGB.g - this.player.glowColorRGB.g) * lerpSpeed;
    this.player.glowColorRGB.b += (targetRGB.b - this.player.glowColorRGB.b) * lerpSpeed;
    this.player.glowHex = (Math.round(this.player.glowColorRGB.r) << 16) + 
                          (Math.round(this.player.glowColorRGB.g) << 8) + 
                          Math.round(this.player.glowColorRGB.b);
                          
    // Subtle ambient color shift of vignette
    if (Math.random() < 0.15) {
      const vR = Math.round(this.player.glowColorRGB.r * 0.15);
      const vG = Math.round(this.player.glowColorRGB.g * 0.15);
      const vB = Math.round(this.player.glowColorRGB.b * 0.15);
      document.documentElement.style.setProperty('--vignette-color', `${vR}, ${vG}, ${vB}`);
    }

    // 2c. Secondary organelle tracking
    if (STATE.repro > 50) {
      this.player.reproOrganelleAlpha = Math.min(1.0, (this.player.reproOrganelleAlpha || 0) + 0.05 * (delta / 16.6));
    } else {
      this.player.reproOrganelleAlpha = Math.max(0, (this.player.reproOrganelleAlpha || 0) - 0.05 * (delta / 16.6));
    }

    // Update ring pulse
    if (this.ringPulseAlpha > 0) {
      this.ringPulseScale += 0.04 * (delta / 16.6);
      this.ringPulseAlpha -= 0.025 * (delta / 16.6);
    }

    // Update time-based milestones
    if (STATE.isPlaying && STATE.sessionStartTime > 0) {
      const elapsedSec = (Date.now() - STATE.sessionStartTime) / 1000;
      if (elapsedSec >= 30 && !STATE.milestone30) {
        STATE.milestone30 = true;
        triggerMilestoneFlash("ADAPTING");
      }
      if (elapsedSec >= 60 && !STATE.milestone60) {
        STATE.milestone60 = true;
        triggerMilestoneFlash("ENDURING");
      }
      if (elapsedSec >= 90 && !STATE.milestone90) {
        STATE.milestone90 = true;
        triggerMilestoneFlash("THRIVING");
      }
    }

    // 2e. Record motion trail ghosts
    if (!this.player.ghosts) this.player.ghosts = [];
    this.player.ghosts.unshift({
      x: this.player.x,
      y: this.player.y,
      radius: this.player.radius,
      massScale: this.player.massScale
    });
    if (this.player.ghosts.length > 6) {
      this.player.ghosts.pop();
    }

    // Threat environmental camera shake
    if (STATE.isThreatWarning && Math.random() < 0.08) {
      this.cameras.main.shake(100, 0.0018);
    }

    // Grazing and Obstacle collision check during transition
    if (trT > 0 && STATE.chosenPathIndex !== undefined && STATE.paths && STATE.paths[STATE.chosenPathIndex]) {
      const selectedPath = STATE.paths[STATE.chosenPathIndex];
      const shiftX = trT * (selectedPath.endX - this.player.x);
      
      selectedPath.particles.forEach(nut => {
        if (nut.consumed) return;
        
        let nutPt = this.getBezierPoint(selectedPath, nut.t, shiftX);
        if (selectedPath.quality === 'worst') {
          const indexFactor = Math.floor(nut.t * 80);
          const factor = Math.sin(nut.t * Math.PI);
          const noiseY = Math.sin(time * 0.018 + indexFactor * 0.6) * 7.5 * factor;
          const noiseX = Math.cos(time * 0.014 + indexFactor * 0.45) * 3.5 * factor;
          nutPt.x += noiseX;
          nutPt.y += noiseY;
        }
        
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nutPt.x, nutPt.y);
        const baseRad = this.player.radius * this.player.massScale * (STATE.isPlaying ? 1.0 : 3.0);
        
        if (dist < baseRad * 0.52) {
          nut.consumed = true;
          if (selectedPath.quality === 'best') {
            audio.playGrazingEat();
            STATE.repro = Math.min(100, STATE.repro + 0.6);
            document.getElementById('stat-repro-val').textContent = `${Math.round(STATE.repro)}%`;
            document.getElementById('bar-repro').style.width = `${STATE.repro}%`;
            this.spawnChoiceSplash(nutPt.x, nutPt.y, 'best');
          } else if (selectedPath.quality === 'worst') {
            audio.playHazardHit();
            STATE.health = Math.max(5, STATE.health - 2.8);
            document.getElementById('stat-health-val').textContent = `${Math.round(STATE.health)}%`;
            document.getElementById('bar-health').style.width = `${STATE.health}%`;
            this.spawnChoiceSplash(nutPt.x, nutPt.y, 'worst');
            STATE_CONTROLLER.checkDDAEffects();
          }
        }
      });
    }
    
    if (this.player.rippleTime > 0) {
      this.player.rippleTime -= delta;
      if (this.player.rippleTime < 0) this.player.rippleTime = 0;
    }

    this.absorptionParticles.forEach(p => {
      p.endX = this.player.x;
      p.endY = this.player.y;
      p.update(delta);
    });
    this.absorptionParticles = this.absorptionParticles.filter(p => p.time < p.duration);

    this.player.massScale = 0.95 + (STATE.repro / 100) * 0.35;
    this.membranePoints.forEach(pt => pt.update(this.player.massScale, delta));
    
    // Update swimming flagella tail
    this.player.tail.unshift({ x: this.player.x, y: this.player.y });
    if (this.player.tail.length > 25) {
      this.player.tail.pop();
    }
    
    // Update ambient currents and macroStructures
    this.currents.forEach(c => c.update(width, height, STATE.currentSpeed * 0.8, delta));
    this.macroStructures.forEach(m => m.update(STATE.currentSpeed * 0.8, delta));
    
    // Update choice splash particles
    this.particles.forEach(p => p.update(delta));
    this.particles = this.particles.filter(p => p.life > 0);
    
    // Update path nutrient positions
    if (STATE.isPlaying && STATE.paths && STATE.paths.length > 0) {
      STATE.paths.forEach(p => {
        p.particles.forEach(nut => {
          nut.t -= 0.00075 * STATE.currentSpeed * (delta / 16.6);
          if (nut.t < 0) {
            nut.t = 1.0;
          }
        });
      });
    }
    
    // Adjust current speed toward target
    STATE.currentSpeed += (STATE.targetSpeed - STATE.currentSpeed) * 0.08 * (delta / 16.6);
    
    // 2. Render background macroStructures and deep currents (z > 1.2)
    this.macroStructures.forEach(m => m.draw(this.graphics));
    this.currents.forEach(c => {
      if (c.z > 1.2) {
        c.draw(this.graphics);
      }
    });
    
    // 3. Render paths and nutrients
    if (STATE.isPlaying && STATE.paths && STATE.paths.length > 0) {
      let trT = 0;
      if (STATE.isTransitioning && STATE.transitionStart) {
        const elapsed = Date.now() - STATE.transitionStart;
        trT = Math.min(1.0, elapsed / 450);
      }

      STATE.paths.forEach(p => {
        const shiftX = trT * (p.endX - this.player.x);
        const steps = 80;
        
        // Draw spiked organic proteins floating backward along paths
        p.particles.forEach(nut => {
          if (nut.consumed) return;
          let pt = this.getBezierPoint(p, nut.t, shiftX);
          // Incorporate jagged offsets for red stream
          if (p.quality === 'worst') {
            const indexFactor = Math.floor(nut.t * steps);
            const factor = Math.sin(nut.t * Math.PI);
            const noiseY = Math.sin(time * 0.018 + indexFactor * 0.6) * 7.5 * factor;
            const noiseX = Math.cos(time * 0.014 + indexFactor * 0.45) * 3.5 * factor;
            pt.x += noiseX;
            pt.y += noiseY;
          }

          const pulse = Math.sin(time * 0.005 + nut.pulseOffset) * 1.5;
          const rot = time * nut.rotSpeed * 0.08;
          const radBase = nut.size + pulse;
          
          const drawSpikePath = (scale) => {
            const drawQuadraticSegment = (x0, y0, cx, cy, x1, y1) => {
              const segments = 6;
              for (let step = 1; step <= segments; step++) {
                const t = step / segments;
                const mt = 1 - t;
                const tx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
                const ty = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
                this.graphics.lineTo(tx, ty);
              }
            };

            this.graphics.beginPath();
            const angleStep = (Math.PI * 2) / nut.spikes;
            
            const startAngle = rot;
            const startR = radBase * (1.0 + nut.spikeHeights[0] * 0.6) * scale;
            const startX = pt.x + Math.cos(startAngle) * startR;
            const startY = pt.y + Math.sin(startAngle) * startR;
            this.graphics.moveTo(startX, startY);
            
            let lastX = startX;
            let lastY = startY;
            
            for (let k = 1; k < nut.spikes; k++) {
              const angle = k * angleStep + rot;
              const r = radBase * (1.0 + nut.spikeHeights[k] * 0.6) * scale;
              const px = pt.x + Math.cos(angle) * r;
              const py = pt.y + Math.sin(angle) * r;
              
              const prevAngle = (k - 0.5) * angleStep + rot;
              const socketRad = radBase * 0.45 * scale;
              const cx = pt.x + Math.cos(prevAngle) * socketRad;
              const cy = pt.y + Math.sin(prevAngle) * socketRad;
              
              drawQuadraticSegment(lastX, lastY, cx, cy, px, py);
              lastX = px;
              lastY = py;
            }
            
            const prevAngle = (nut.spikes - 0.5) * angleStep + rot;
            const socketRad = radBase * 0.45 * scale;
            const cx = pt.x + Math.cos(prevAngle) * socketRad;
            const cy = pt.y + Math.sin(prevAngle) * socketRad;
            drawQuadraticSegment(lastX, lastY, cx, cy, startX, startY);
            this.graphics.closePath();
          };
          
          const fadeAlpha = Math.min(1.0, nut.t * 3) * Math.min(1.0, (1 - nut.t) * 3);
          
          let nutRGB = 0xf2f2f2;
          if (p.quality === 'best') nutRGB = 0x2ecc71;
          if (p.quality === 'worst') nutRGB = 0xe74c3c;
          
          if (STATE.isThreatWarning) {
            if (p.quality === 'worst') nutRGB = 0xe74c3c;
            else if (p.quality === 'best') nutRGB = 0x2ecc71;
            else nutRGB = 0x646464;
          }
          
          drawSpikePath(1.0);
          this.graphics.fillStyle(nutRGB, fadeAlpha);
          this.graphics.fillPath();
          
          // Render beautiful soft glow shell matching quality
          const glowColor = (p.quality === 'best') ? 0x2ecc71 : 
                            (p.quality === 'worst') ? 0xe74c3c : 0xffffff;
          drawSpikePath(2.2);
          this.graphics.fillStyle(glowColor, fadeAlpha * 0.15);
          this.graphics.fillPath();
        });
      });
    }
    
    // 4. Render choice splash particles
    this.particles.forEach(p => p.draw(this.graphics));
    
    this.absorptionParticles.forEach(p => {
      if (p.time >= 0) p.draw(this.graphics);
    });
    
    // 5. Draw Player Flagella Tail - multiple thin, wavy, bright white threads
    const sizeScale = STATE.isPlaying ? 1.0 : 3.0;
    const hueBase = (time * 0.015) % 360;
    
    if (this.player.tail.length > 5) {
      const tailCount = 4;
      for (let tNum = 0; tNum < tailCount; tNum++) {
        this.graphics.beginPath();
        this.graphics.moveTo(this.player.tail[0].x, this.player.tail[0].y);
        
        const phaseOffset = tNum * (Math.PI / 2);
        const amp = (5 + tNum * 2.5) * sizeScale;
        const width = (1.5 - tNum * 0.25) * sizeScale;
        const opacity = 0.75 - tNum * 0.12;
        
        for (let i = 1; i < this.player.tail.length; i++) {
          const t = this.player.tail[i];
          const wave = Math.sin(time * 0.012 - i * 0.35 + phaseOffset) * (amp * (1 - i / this.player.tail.length));
          const emergeOffset = (tNum - 1.5) * 4 * (1 - i / this.player.tail.length) * sizeScale;
          this.graphics.lineTo(t.x - i * 5 * sizeScale, t.y + wave + emergeOffset);
        }
        
        if (tNum === 0) {
          this.graphics.lineStyle(width * 3.5, 0xffffff, opacity * 0.22);
          this.graphics.strokePath();
        }
        
        this.graphics.lineStyle(width, 0xffffff, opacity);
        this.graphics.strokePath();
      }
    }
    
    // 6. Draw cell membrane layers - glowing white theme
    const swimCycle = Math.sin(time * 0.012);
    const swimSquash = 1.0 + swimCycle * 0.05; // squash-and-stretch on X/Y axis
    
    let rippleOffset = 0;
    let rippleAlphaAdd = 0;
    if (this.player.rippleTime > 0) {
      const t = 1.0 - (this.player.rippleTime / this.player.rippleDuration);
      rippleOffset = 8 * Math.sin(t * Math.PI);
      rippleAlphaAdd = 0.4 * Math.sin(t * Math.PI);
    }
    
    const baseRad = (this.player.radius + rippleOffset) * this.player.massScale * sizeScale;
    
    const drawMembrane = (px, py, scale, color, alpha) => {
      this.graphics.fillStyle(color, Math.min(1.0, alpha + rippleAlphaAdd));
      this.graphics.beginPath();
      const startOffset = this.membranePoints[0].offset * sizeScale;
      const startAngle = this.membranePoints[0].angle;
      const sx = px + (baseRad + startOffset) * Math.cos(startAngle) * scale * swimSquash;
      const sy = py + (baseRad + startOffset) * Math.sin(startAngle) * scale * (2.0 - swimSquash);
      this.graphics.moveTo(sx, sy);
      
      for (let i = 1; i < this.membranePoints.length; i++) {
        const pt = this.membranePoints[i];
        const gx = px + (baseRad + pt.offset * sizeScale) * Math.cos(pt.angle) * scale * swimSquash;
        const gy = py + (baseRad + pt.offset * sizeScale) * Math.sin(pt.angle) * scale * (2.0 - swimSquash);
        this.graphics.lineTo(gx, gy);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
    };
    
    const strokeMembrane = (px, py, lineWidth, color, alpha) => {
      this.graphics.lineStyle(lineWidth, color, Math.min(1.0, alpha + rippleAlphaAdd));
      this.graphics.beginPath();
      const startOffset = this.membranePoints[0].offset * sizeScale;
      const startAngle = this.membranePoints[0].angle;
      const sx = px + (baseRad + startOffset) * Math.cos(startAngle) * swimSquash;
      const sy = py + (baseRad + startOffset) * Math.sin(startAngle) * (2.0 - swimSquash);
      this.graphics.moveTo(sx, sy);
      
      for (let i = 1; i < this.membranePoints.length; i++) {
        const pt = this.membranePoints[i];
        const gx = px + (baseRad + pt.offset * sizeScale) * Math.cos(pt.angle) * swimSquash;
        const gy = py + (baseRad + pt.offset * sizeScale) * Math.sin(pt.angle) * (2.0 - swimSquash);
        this.graphics.lineTo(gx, gy);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    };

    // 2e. Draw ghost motion trails
    if (this.player.ghosts) {
      this.player.ghosts.forEach((ghost, idx) => {
        const ageOpacity = (1 - idx / 6) * 0.12;
        const gGlowHex = this.player.glowHex || 0x2ec4b6;
        strokeMembrane(ghost.x, ghost.y, 10 * sizeScale, gGlowHex, ageOpacity * 0.35);
        strokeMembrane(ghost.x, ghost.y, 2.5 * sizeScale, gGlowHex, ageOpacity * 0.98);
        
        this.graphics.beginPath();
        drawGlowCircle(
          this.graphics,
          ghost.x - 2,
          ghost.y,
          5 * ghost.massScale * sizeScale,
          { r: 255, g: 255, b: 255, a: ageOpacity },
          { r: 138, g: 43, b: 226, a: 0.0 },
          4
        );
      });
    }

    // Render faint ghost preview cell 60px ahead when reproduction > 75%
    if (STATE.repro > 75) {
      const ghostX = this.player.x + 60 * sizeScale;
      const ghostY = this.player.y;
      const previewWiggle = Math.sin(time * 0.015) * 2;
      const previewGlowHex = this.player.glowHex || 0x2ec4b6;
      strokeMembrane(ghostX, ghostY + previewWiggle, 15 * sizeScale, previewGlowHex, 0.12);
      drawMembrane(ghostX, ghostY + previewWiggle, 0.9, 0xffffff, 0.05);
      strokeMembrane(ghostX, ghostY + previewWiggle, 1.5 * sizeScale, previewGlowHex, 0.35);
      
      const previewNRad = ((this.scale.width <= 768 ? 4 : 8) + (STATE.survival / 100) * (this.scale.width <= 768 ? 4 : 8)) * this.player.massScale * sizeScale;
      this.graphics.fillStyle(0xffffff, 0.25);
      this.graphics.fillCircle(ghostX - 2, ghostY + previewWiggle, previewNRad * 0.7);
    }

    // 1d. Speed lines at high velocity
    const cellSpeed = STATE.currentSpeed * 30;
    if (cellSpeed > 140) {
      const numStreaks = 6 + Math.floor(Math.random() * 3);
      const glowColor = this.player.glowHex || 0x00ffdc;
      for (let i = 0; i < numStreaks; i++) {
        const yOffset = (Math.random() - 0.5) * baseRad * 1.5;
        const length = (cellSpeed * 0.4) + Math.random() * 30;
        const opacity = 0.15 + Math.random() * 0.1;
        const thickness = 0.5 + Math.random() * 0.5;
        
        this.graphics.lineStyle(thickness, glowColor, opacity);
        this.graphics.beginPath();
        this.graphics.moveTo(this.player.x - baseRad * 0.8, this.player.y + yOffset);
        this.graphics.lineTo(this.player.x - baseRad * 0.8 - length, this.player.y + yOffset);
        this.graphics.strokePath();
      }
    }
    
    const glowHex = this.player.glowHex || 0x2ec4b6;
    
    // Draw thick organic glowing white/colored aura rings
    strokeMembrane(this.player.x, this.player.y, 40 * sizeScale, glowHex, 0.08);
    strokeMembrane(this.player.x, this.player.y, 24 * sizeScale, glowHex, 0.16);
    strokeMembrane(this.player.x, this.player.y, 10 * sizeScale, glowHex, 0.35);

    // Draw expanding ring pulse if active
    if (this.ringPulseAlpha > 0) {
      this.graphics.lineStyle(4 * sizeScale, glowHex, this.ringPulseAlpha);
      this.graphics.strokeCircle(this.player.x, this.player.y, baseRad * (1.0 + this.ringPulseScale));
      
      this.graphics.lineStyle(1.5 * sizeScale, 0xffffff, this.ringPulseAlpha * 0.5);
      this.graphics.strokeCircle(this.player.x, this.player.y, baseRad * (1.0 + this.ringPulseScale) + 6);
    }
    
    // Multi-layered concentric shades of white/grey inside cell membrane
    drawMembrane(this.player.x, this.player.y, 1.00, 0x050508, 0.95);
    drawMembrane(this.player.x, this.player.y, 0.92, 0xffffff, 0.08);
    drawMembrane(this.player.x, this.player.y, 0.65, 0xffffff, 0.22);
    drawMembrane(this.player.x, this.player.y, 0.20, 0xffffff, 0.65);
    drawMembrane(this.player.x, this.player.y, 0.08, 0xffffff, 0.95);
    
    // Sharp cell outline
    strokeMembrane(this.player.x, this.player.y, 2.5 * sizeScale, glowHex, 0.98);
    
    // 7. Draw Specular Shine
    this.graphics.beginPath();
    this.graphics.fillStyle(0xffffff, 0.48);
    this.graphics.fillCircle(
      this.player.x - baseRad * 0.3,
      this.player.y - baseRad * 0.3,
      baseRad * 0.16
    );

    // 8. Draw Organelles
    const cycleTime = time * 0.002;
    const organelle1Hex = Phaser.Display.Color.HSLToColor(((hueBase + 60) % 360) / 360, 1.0, 0.65).color;
    const organelle2Hex = Phaser.Display.Color.HSLToColor(((hueBase + 180) % 360) / 360, 1.0, 0.6).color;
    
    this.graphics.fillStyle(organelle1Hex, 0.85);
    this.graphics.fillCircle(
      this.player.x + Math.sin(cycleTime) * (baseRad * 0.35),
      this.player.y + Math.cos(cycleTime) * (baseRad * 0.35) - baseRad * 0.1,
      3.5 * this.player.massScale * sizeScale
    );
    
    this.graphics.fillStyle(organelle2Hex, 0.8);
    this.graphics.fillCircle(
      this.player.x + Math.cos(cycleTime * 1.35) * (baseRad * 0.38),
      this.player.y + Math.sin(cycleTime * 1.35) * (baseRad * 0.38) + baseRad * 0.1,
      2.8 * this.player.massScale * sizeScale
    );

    // 2c. Secondary organelle (appears at repro > 50%)
    if (this.player.reproOrganelleAlpha > 0) {
      const pulseSec = Math.sin(time * 0.0035 + 2.5) * 1.0;
      const secRad = (isMobile ? 2.5 : 4.5) * (1.0 + pulseSec * 0.15) * sizeScale;
      const offsetX = (isMobile ? 5 : 15) * sizeScale;
      const offsetY = (isMobile ? -4 : -12) * sizeScale;
      this.graphics.fillStyle(0xa78bfa, this.player.reproOrganelleAlpha * 0.85);
      this.graphics.fillCircle(this.player.x + offsetX, this.player.y + offsetY, secRad);
    }

    // 11. Render mid-ground and fore-ground currents (z <= 1.2) on top of the player and paths
    this.currents.forEach(c => {
      if (c.z <= 1.2) {
        c.draw(this.graphics);
      }
    });
  }
}
