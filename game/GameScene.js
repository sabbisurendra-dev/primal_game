const Phaser = window.Phaser;
import { STATE, CONFIG, STATE_CONTROLLER } from './state.js';

// --- VISUAL RENDERING ENTITIES ---
class Particle {
  constructor(x, y, color, size, vx, vy, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = life;
    this.life = life;
  }
  
  update(delta) {
    this.x += this.vx * (delta / 16.6);
    this.y += this.vy * (delta / 16.6);
    this.life -= (delta / 16.6);
  }
  
  draw(graphics) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const colorRGB = this.color.includes('46, 204, 113') ? 0x2ecc71 : 
                    this.color.includes('231, 76, 60') ? 0xe74c3c : 0xf2f2f2;
    graphics.fillStyle(colorRGB, alpha);
    graphics.fillCircle(this.x, this.y, this.size);
  }
}

class BackgroundDust {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 10;
    this.y = Math.random() * height;
    this.size = 0.5 + Math.random() * 2.5;
    this.speed = (0.3 + Math.random() * 0.9);
    this.opacity = 0.08 + Math.random() * 0.28;
    this.wiggleSpeed = 0.001 + Math.random() * 0.002;
    this.wiggleAmp = 1.0 + Math.random() * 4.0;
    this.seed = Math.random() * 100;
  }
  
  update(width, height, speedMultiplier, delta) {
    this.x -= this.speed * speedMultiplier * (delta / 16.6);
    this.y += Math.sin(Date.now() * this.wiggleSpeed + this.seed) * this.wiggleAmp * 0.06 * (delta / 16.6);
    
    if (this.x < -10) {
      this.reset(width, height);
    }
  }
  
  draw(graphics) {
    graphics.fillStyle(0xffffff, this.opacity);
    graphics.fillCircle(this.x, this.y, this.size);
    
    if (this.size > 1.8) {
      graphics.fillStyle(0xffffff, this.opacity * 0.25);
      graphics.fillCircle(this.x, this.y, this.size * 2.5);
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
    this.currents = [];
    this.membranePoints = [];
    this.graphics = null;
    this.player = null;
  }

  create() {
    this.graphics = this.add.graphics();
    
    // Position player cell
    const width = this.scale.width;
    const height = this.scale.height;
    const px = Math.max(120, Math.min(width * 0.2, 220));
    
    this.player = {
      x: px,
      y: height / 2,
      targetY: height / 2,
      radius: 78,
      targetRadius: 78,
      massScale: 1.0,
      wobbleSpeed: 0.005,
      tail: []
    };
    
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
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    
    this.player.x = Math.max(120, Math.min(width * 0.2, 220));
    
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
    const endYPositions = [
      startY - branchDelta,
      startY,
      startY + branchDelta
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

  getBezierPoint(p, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = mt3 * this.player.x + 3 * mt2 * t * p.cp1X + 3 * mt * t2 * p.cp2X + t3 * p.endX;
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

  update(time, delta) {
    this.graphics.clear();
    
    // Update fork selection timer and check auto-choice / poll inputs
    if (STATE.isPlaying && !STATE.isTransitioning) {
      STATE.forkTimer -= delta / 1000;
      if (STATE.forkTimer <= 0) {
        const fallbackPathIndex = STATE.isThreatWarning ? 
          STATE.paths.findIndex(p => p.quality === 'best') : 1;
        STATE_CONTROLLER.choosePath(fallbackPathIndex !== -1 ? fallbackPathIndex : 1);
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
    
    // 1. Update Game Physics Entities
    const targetX = Math.max(120, Math.min(width * 0.2, 220));
    const targetY = STATE.isPlaying ? this.player.targetY : height / 2;
    
    this.player.x += (targetX - this.player.x) * 0.08 * (delta / 16.6);
    this.player.y += (targetY - this.player.y) * 0.08 * (delta / 16.6);
    
    this.player.massScale = 0.95 + (STATE.repro / 100) * 0.35;
    this.membranePoints.forEach(pt => pt.update(this.player.massScale, delta));
    
    // Update swimming flagella tail
    this.player.tail.unshift({ x: this.player.x, y: this.player.y });
    if (this.player.tail.length > 25) {
      this.player.tail.pop();
    }
    
    // Update ambient currents
    this.currents.forEach(c => c.update(width, height, STATE.currentSpeed * 0.8, delta));
    
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
    
    // 2. Render background currents
    this.currents.forEach(c => c.draw(this.graphics));
    
    // 3. Render paths and nutrients
    if (STATE.isPlaying && STATE.paths && STATE.paths.length > 0) {
      STATE.paths.forEach(p => {
        const steps = 80;
        const curvePoints = [];
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          curvePoints.push(this.getBezierPoint(p, t));
        }

        // Draw streams matching the reference image's visual details
        if (p.quality === 'best') {
          // Green Path: Wavy green band with soft aura and core dots
          this.graphics.beginPath();
          this.graphics.moveTo(curvePoints[0].x, curvePoints[0].y);
          for (let j = 1; j <= steps; j++) {
            this.graphics.lineTo(curvePoints[j].x, curvePoints[j].y);
          }
          this.graphics.lineStyle(24, 0x2ecc71, 0.08);
          this.graphics.strokePath();
          this.graphics.lineStyle(8, 0x2ecc71, 0.20);
          this.graphics.strokePath();
          this.graphics.lineStyle(1.8, 0xa3f5c8, 0.75);
          this.graphics.strokePath();

          // Core glowing micro-dots
          for (let j = 4; j < steps - 4; j += 3) {
            const pt = curvePoints[j];
            const pulse = Math.sin(time * 0.003 + j) * 1.5;
            this.graphics.fillStyle(0x2ecc71, 0.45 + Math.sin(time * 0.002 + j) * 0.2);
            this.graphics.fillCircle(pt.x, pt.y + pulse, 1.5 + Math.abs(pulse) * 0.3);
          }
        } else if (p.quality === 'ok') {
          // White Path: Dense stream of glowing white/silver particles
          for (let j = 0; j <= steps; j += 2) {
            const pt = curvePoints[j];
            const spread = Math.sin(time * 0.004 + j) * 2.2;
            this.graphics.fillStyle(0xffffff, 0.35 + Math.sin(time * 0.003 + j) * 0.25);
            this.graphics.fillCircle(pt.x, pt.y + spread, 1.2 + Math.abs(spread) * 0.15);
            
            // Scattered side-sparks
            if (j % 8 === 0 && j > 5 && j < steps - 5) {
              const sideOffset = Math.sin(j * 17) * 8;
              this.graphics.fillStyle(0xffffff, 0.15);
              this.graphics.fillCircle(pt.x, pt.y + sideOffset, 0.8);
            }
          }
          // Soft solid core guide
          this.graphics.lineStyle(1.0, 0xffffff, 0.12);
          this.graphics.beginPath();
          this.graphics.moveTo(curvePoints[0].x, curvePoints[0].y);
          for (let j = 1; j <= steps; j++) {
            this.graphics.lineTo(curvePoints[j].x, curvePoints[j].y);
          }
          this.graphics.strokePath();
        } else if (p.quality === 'worst') {
          // Red Path: Jagged, chaotic toxic stream
          const jaggedPoints = [];
          for (let j = 0; j <= steps; j++) {
            const pt = curvePoints[j];
            const factor = Math.sin((j / steps) * Math.PI);
            const noiseY = Math.sin(time * 0.018 + j * 0.6) * 7.5 * factor;
            const noiseX = Math.cos(time * 0.014 + j * 0.45) * 3.5 * factor;
            jaggedPoints.push({ x: pt.x + noiseX, y: pt.y + noiseY });
          }

          this.graphics.beginPath();
          this.graphics.moveTo(jaggedPoints[0].x, jaggedPoints[0].y);
          for (let j = 1; j <= steps; j++) {
            this.graphics.lineTo(jaggedPoints[j].x, jaggedPoints[j].y);
          }
          this.graphics.lineStyle(16, 0xe74c3c, 0.08);
          this.graphics.strokePath();
          this.graphics.lineStyle(6, 0xe74c3c, 0.22);
          this.graphics.strokePath();
          this.graphics.lineStyle(1.8, 0xff7a6b, 0.8);
          this.graphics.strokePath();

          // Red hazardous core particles
          for (let j = 2; j < steps - 2; j += 4) {
            const pt = jaggedPoints[j];
            const pSize = 1.2 + Math.random() * 2.0;
            this.graphics.fillStyle(0xe74c3c, 0.65);
            this.graphics.fillCircle(pt.x, pt.y, pSize);
          }
        }

        // Draw terminal path node circles
        const terminalNodeColor = (p.quality === 'worst') ? 0xe74c3c : (p.quality === 'best' ? 0x2ecc71 : 0xffffff);
        const terminalNodeAlpha = (p.quality === 'worst' && STATE.isThreatWarning) ? 0.95 : 0.25;
        this.graphics.fillStyle(terminalNodeColor, terminalNodeAlpha);
        this.graphics.fillCircle(p.endX, p.endY, 6);
        
        // Draw spiked organic proteins floating backward along paths
        p.particles.forEach(nut => {
          let pt = this.getBezierPoint(p, nut.t);
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
            this.graphics.beginPath();
            const angleStep = (Math.PI * 2) / nut.spikes;
            
            const startAngle = rot;
            const startR = radBase * (1.0 + nut.spikeHeights[0] * 0.6) * scale;
            const startX = pt.x + Math.cos(startAngle) * startR;
            const startY = pt.y + Math.sin(startAngle) * startR;
            this.graphics.moveTo(startX, startY);
            
            for (let k = 1; k < nut.spikes; k++) {
              const angle = k * angleStep + rot;
              const r = radBase * (1.0 + nut.spikeHeights[k] * 0.6) * scale;
              const px = pt.x + Math.cos(angle) * r;
              const py = pt.y + Math.sin(angle) * r;
              
              const prevAngle = (k - 0.5) * angleStep + rot;
              const socketRad = radBase * 0.45 * scale;
              const cx = pt.x + Math.cos(prevAngle) * socketRad;
              const cy = pt.y + Math.sin(prevAngle) * socketRad;
              
              this.graphics.quadraticCurveTo(cx, cy, px, py);
            }
            
            const prevAngle = (nut.spikes - 0.5) * angleStep + rot;
            const socketRad = radBase * 0.45 * scale;
            const cx = pt.x + Math.cos(prevAngle) * socketRad;
            const cy = pt.y + Math.sin(prevAngle) * socketRad;
            this.graphics.quadraticCurveTo(cx, cy, startX, startY);
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
    const baseRad = this.player.radius * this.player.massScale * sizeScale;
    
    const drawMembrane = (scale, color, alpha) => {
      this.graphics.fillStyle(color, alpha);
      this.graphics.beginPath();
      const startOffset = this.membranePoints[0].offset * sizeScale;
      const startAngle = this.membranePoints[0].angle;
      const sx = this.player.x + (baseRad + startOffset) * Math.cos(startAngle) * scale;
      const sy = this.player.y + (baseRad + startOffset) * Math.sin(startAngle) * scale;
      this.graphics.moveTo(sx, sy);
      
      for (let i = 1; i < this.membranePoints.length; i++) {
        const pt = this.membranePoints[i];
        const px = this.player.x + (baseRad + pt.offset * sizeScale) * Math.cos(pt.angle) * scale;
        const py = this.player.y + (baseRad + pt.offset * sizeScale) * Math.sin(pt.angle) * scale;
        this.graphics.lineTo(px, py);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
    };
    
    const strokeMembrane = (lineWidth, color, alpha) => {
      this.graphics.lineStyle(lineWidth, color, alpha);
      this.graphics.beginPath();
      const startOffset = this.membranePoints[0].offset * sizeScale;
      const startAngle = this.membranePoints[0].angle;
      const sx = this.player.x + (baseRad + startOffset) * Math.cos(startAngle);
      const sy = this.player.y + (baseRad + startOffset) * Math.sin(startAngle);
      this.graphics.moveTo(sx, sy);
      
      for (let i = 1; i < this.membranePoints.length; i++) {
        const pt = this.membranePoints[i];
        const px = this.player.x + (baseRad + pt.offset * sizeScale) * Math.cos(pt.angle);
        const py = this.player.y + (baseRad + pt.offset * sizeScale) * Math.sin(pt.angle);
        this.graphics.lineTo(px, py);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    };
    
    // Draw thick organic glowing white aura rings
    strokeMembrane(40 * sizeScale, 0xffffff, 0.08);
    strokeMembrane(24 * sizeScale, 0xffffff, 0.16);
    strokeMembrane(10 * sizeScale, 0xffffff, 0.35);
    
    // Multi-layered concentric shades of white/grey inside cell membrane
    drawMembrane(1.00, 0x050508, 0.95);
    drawMembrane(0.92, 0xffffff, 0.08);
    drawMembrane(0.65, 0xffffff, 0.22);
    drawMembrane(0.20, 0xffffff, 0.65);
    drawMembrane(0.08, 0xffffff, 0.95);
    
    // Sharp cell outline
    strokeMembrane(2.5 * sizeScale, 0xffffff, 0.98);
    
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

    // 9. Draw Nucleus (glowing life spark nucleus core)
    const nPulse = 1.0 + Math.sin(time * 0.004) * 0.08;
    const nRad = 9 * this.player.massScale * nPulse * sizeScale;
    
    this.graphics.beginPath();
    drawGlowCircle(
      this.graphics,
      this.player.x - 2,
      this.player.y,
      nRad,
      { r: 255, g: 255, b: 255, a: 0.98 },
      { r: 138, g: 43, b: 226, a: 0.0 },
      6
    );
    
    // Core nucleolus
    this.graphics.fillStyle(0x0a0a14, 0.92);
    this.graphics.fillCircle(this.player.x - 3.5, this.player.y - 1, nRad * 0.35);

    // Rotating DNA/Chromosome replication loop rings
    this.graphics.lineStyle(1.8 * sizeScale, 0xffffff, 0.22);
    this.graphics.strokeCircle(this.player.x, this.player.y, baseRad * 0.38);
    
    this.graphics.lineStyle(1.2 * sizeScale, organelle1Hex, 0.4);
    this.graphics.strokeEllipse(this.player.x, this.player.y, baseRad * 0.9, baseRad * 0.28);

    // 10. Draw Visual Timer Circle
    if (STATE.isPlaying && !STATE.isTransitioning) {
      const timerPct = Math.max(0, STATE.forkTimer / 3.0);
      this.graphics.beginPath();
      this.graphics.lineStyle(2.5, STATE.isThreatWarning ? 0xe74c3c : 0xffffff, STATE.isThreatWarning ? 0.55 : 0.25);
      
      const startAngle = -Math.PI / 2;
      const endAngle = (-Math.PI / 2) + (Math.PI * 2 * timerPct);
      
      const arcRadius = baseRad + 14;
      const arcSteps = 30;
      this.graphics.moveTo(this.player.x + Math.cos(startAngle) * arcRadius, this.player.y + Math.sin(startAngle) * arcRadius);
      for (let j = 1; j <= arcSteps; j++) {
        const currAngle = startAngle + (endAngle - startAngle) * (j / arcSteps);
        this.graphics.lineTo(this.player.x + Math.cos(currAngle) * arcRadius, this.player.y + Math.sin(currAngle) * arcRadius);
      }
      this.graphics.strokePath();
    }
  }
}
