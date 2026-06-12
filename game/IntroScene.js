const Phaser = window.Phaser;
import { STATE } from './state.js';
import { audio } from './audio.js';

class IntroMacroStructure {
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = 180 + Math.random() * 220;
    this.speed = 0.08 + Math.random() * 0.12;
    this.z = 1.5 + Math.random() * 1.5;
    this.opacity = 0.02 + Math.random() * 0.03;
    this.seed = Math.random() * 100;
  }
  
  update(delta) {
    this.x -= this.speed * (delta / 16.6);
    this.y += Math.sin(Date.now() * 0.0005 + this.seed) * 0.1 * (delta / 16.6);
  }
  
  draw(graphics, tx, ty, width, height, progress) {
    // Parallax shift based on progress of the intro animation
    const parallaxX = (tx - width / 2) * 0.05 / this.z * (1.0 + progress * 2.0);
    const parallaxY = (ty - height / 2) * 0.05 / this.z * (1.0 + progress * 2.0);
    
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = this.radius * (1 - t * 0.5);
      const alpha = this.opacity * t * (1.0 - progress * 0.5); // Slow fade out
      
      graphics.fillStyle(0x006c8a, alpha);
      graphics.fillCircle(this.x + parallaxX, this.y + parallaxY, r);
    }
  }
}

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
    this.isActive = false;
    this.startTime = 0;
    this.hasTriggeredBoom = false;
    
    // Animation entities
    this.introParticles = [];
    this.iceShards = [];
    this.sparks = [];
    this.macroStructures = [];
    this.graphics = null;
  }

  create() {
    this.graphics = this.add.graphics();
    
    // Register event listener on global game events to trigger the awakening
    this.game.events.off('trigger-awaken'); // Prevent duplicates
    this.game.events.on('trigger-awaken', () => {
      this.startIntroSequence();
    });

    // Race-condition safeguard: if the user clicked cover overlay before this scene was created
    if (STATE.isIntro && !STATE.isCoverScreen && !this.isActive) {
      this.startIntroSequence();
    }
  }

  startIntroSequence() {
    this.isActive = true;
    this.startTime = this.time.now;
    this.hasTriggeredBoom = false;
    this.sparks = [];
    
    const width = this.scale.width;
    const height = this.scale.height;
    
    const isMobile = width <= 768;
    const tx = isMobile ? width * 0.16 : 180;
    const ty = height / 2;
    
    // Spawn background organic macro structures
    this.macroStructures = [];
    for (let i = 0; i < 3; i++) {
      this.macroStructures.push(new IntroMacroStructure(width, height));
    }

    // Initialize intro swelling background dust particles
    this.introParticles = [];
    const colors = [0, 60, 120, 180, 240, 300]; // Rainbow hues
    for (let i = 0; i < 280; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 260;
      const speed = (0.015 + Math.random() * 0.03) * (Math.random() > 0.5 ? 1 : -1);
      this.introParticles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * (0.6 + Math.random() * 0.4),
        z: (Math.random() - 0.5) * 150 + 50, // shifted forward slightly
        hue: colors[i % colors.length],
        speed: speed,
        size: 1.5 + Math.random() * 4.5
      });
    }
    
    // Initialize frozen ice crust shards to shatter
    this.iceShards = [];
    const shardCount = 35;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const radius = 65 + Math.random() * 20;
      
      const points = [];
      const numPoints = 3 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numPoints; j++) {
        const ptAngle = (j / numPoints) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const ptRad = 6 + Math.random() * 14;
        points.push({
          x: Math.cos(ptAngle) * ptRad,
          y: Math.sin(ptAngle) * ptRad
        });
      }
      
      this.iceShards.push({
        angle: angle,
        baseRadius: radius,
        x: tx + Math.cos(angle) * radius,
        y: ty + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        z: 0.6 + Math.random() * 1.2, // 3D depth factor
        points: points,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: 0,
        exploded: false,
        alpha: 1.0
      });
    }
  }

  update(time, delta) {
    this.graphics.clear();
    if (!this.isActive) return;

    const elapsed = time - this.startTime;
    const progress = Math.min(1.0, elapsed / 3000);
    
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Fill background with black first — matches gameplay
    this.graphics.fillStyle(0x000000, 1.0);
    this.graphics.fillRect(0, 0, width, height);

    // Draw large organic cell-wall membrane blobs (left and right sides)
    this.drawOrganicMembraneBlobs(time);

    const isMobile = width <= 768;
    const tx = isMobile ? width * 0.16 : 180;
    const ty = height / 2;
    
    // Update background macro-structures
    this.macroStructures.forEach(m => {
      m.update(delta);
      m.draw(this.graphics, tx, ty, width, height, progress);
    });

    // 1. Update/Draw background intro particles
    this.introParticles.forEach(p => {
      p.z -= 0.65 * delta * 0.06;
      if (p.z < -150) p.z = 150;
      
      const rotAngle = elapsed * 0.0003 * p.speed;
      const rx = p.x * Math.cos(rotAngle) - p.y * Math.sin(rotAngle);
      const ry = p.x * Math.sin(rotAngle) + p.y * Math.cos(rotAngle);
      
      const scale = 250 / (250 + p.z);
      const scrX = tx + rx * scale * (1.0 + progress * 1.5);
      const scrY = ty + ry * scale * (1.0 + progress * 1.5);
      const size = Math.max(0.1, p.size * scale);
      
      this.graphics.fillStyle(Phaser.Display.Color.HSLToColor(p.hue / 360, 1.0, 0.62).color, 0.45 * scale);
      this.graphics.fillCircle(scrX, scrY, size);
    });
    
    // 2. Play Sound and Spark Explosion at 2.0 seconds
    if (elapsed >= 2000 && !this.hasTriggeredBoom) {
      this.hasTriggeredBoom = true;
      audio.playAwakeningBoom();
      
      // Explosion logic for shards
      this.iceShards.forEach(s => {
        s.exploded = true;
        const speed = (7 + Math.random() * 15) / s.z; // Speed scales with depth
        s.vx = Math.cos(s.angle) * speed;
        s.vy = Math.sin(s.angle) * speed;
        s.rotSpeed = (Math.random() - 0.5) * 0.4 / s.z;
      });
      
      this.sparks = [];
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sparkZ = 0.5 + Math.random() * 2.0; // Spark depth
        const speed = (3 + Math.random() * 20) / sparkZ;
        this.sparks.push({
          x: tx,
          y: ty,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          z: sparkZ,
          size: 2.0 + Math.random() * 6.0,
          hue: 12 + Math.random() * 38,
          life: 1.0,
          decay: (0.015 + Math.random() * 0.025) * (delta / 16.6)
        });
      }
    }
    
    // 3. Render frozen ice node and crack propagation before explosion
    if (progress < 0.66) {
      const frozenAlpha = Math.min(1.0, progress * 4);
      
      this.graphics.lineStyle(2.5, 0x00f0ff, frozenAlpha * 0.9);
      this.graphics.fillStyle(0x00dcff, frozenAlpha * 0.55);
      
      this.graphics.beginPath();
      const wSpeed = time * 0.003;
      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const w = Math.sin(wSpeed + angle * 7) * 4.5 + Math.cos(wSpeed * 0.6 + angle * 3) * 2.5;
        const r = 65 + w;
        const px = tx + Math.cos(angle) * r;
        const py = ty + Math.sin(angle) * r;
        if (i === 0) this.graphics.moveTo(px, py);
        else this.graphics.lineTo(px, py);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.strokePath();

      // Render wiggling character motion inside the frozen shell (pulsating and wiggling tail)
      this.drawPlayer(tx, ty, 0.72 + Math.sin(time * 0.005) * 0.03, 0.38 + frozenAlpha * 0.25, time);
      
      // Crack lines
      const crackProgress = Math.pow(progress / 0.66, 2.5);
      const crackRadius = 88 * crackProgress;
      this.graphics.lineStyle(2.5, 0x00ebff, 0.9);
      for (let k = 0; k < 6; k++) {
        const angle = (k / 6) * Math.PI * 2;
        this.graphics.beginPath();
        this.graphics.moveTo(tx, ty);
        this.graphics.lineTo(tx + Math.cos(angle) * crackRadius, ty + Math.sin(angle) * crackRadius);
        this.graphics.lineTo(
          tx + Math.cos(angle + 0.3) * crackRadius * 1.35, 
          ty + Math.sin(angle + 0.3) * crackRadius * 1.35
        );
        this.graphics.strokePath();
      }
    }
    
    // 4. Update and Render flying ice shards and sparks after explosion
    if (progress >= 0.66) {
      const waveProgress = (progress - 0.66) / 0.34;
      
      // Update/Draw Shards (ordered by depth)
      this.iceShards.forEach(s => {
        if (s.alpha <= 0) return;
        
        if (s.exploded) {
          s.x += s.vx * (delta / 16.6);
          s.y += s.vy * (delta / 16.6);
          s.rot += s.rotSpeed * (delta / 16.6);
          s.alpha = Math.max(0, s.alpha - 0.035 * (delta / 16.6));
        }
        
        const currentScale = 1.0 / s.z;
        this.graphics.lineStyle(2.0 * currentScale, 0xffffff, 0.95 * s.alpha);
        this.graphics.fillStyle(0x96e6ff, 0.9 * s.alpha * currentScale);
        
        this.graphics.beginPath();
        const startX = s.x + s.points[0].x * Math.cos(s.rot) * currentScale - s.points[0].y * Math.sin(s.rot) * currentScale;
        const startY = s.y + s.points[0].x * Math.sin(s.rot) * currentScale + s.points[0].y * Math.cos(s.rot) * currentScale;
        this.graphics.moveTo(startX, startY);
        for (let i = 1; i < s.points.length; i++) {
          const px = s.x + s.points[i].x * Math.cos(s.rot) * currentScale - s.points[i].y * Math.sin(s.rot) * currentScale;
          const py = s.y + s.points[i].x * Math.sin(s.rot) * currentScale + s.points[i].y * Math.cos(s.rot) * currentScale;
          this.graphics.lineTo(px, py);
        }
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
      });
      
      // Update/Draw Sparks
      this.sparks.forEach(s => {
        s.x += s.vx * (delta / 16.6);
        s.y += s.vy * (delta / 16.6);
        s.life = Math.max(0, s.life - s.decay);
        
        const currentScale = 1.0 / s.z;
        const size1 = s.size * (0.3 + s.life * 0.7) * currentScale;
        const size2 = s.size * 2.8 * s.life * currentScale;
        const color = Phaser.Display.Color.HSLToColor(s.hue / 360, 1.0, 0.62).color;
        const outerColor = Phaser.Display.Color.HSLToColor(s.hue / 360, 1.0, 0.50).color;
        
        this.graphics.fillStyle(color, s.life * 0.95);
        this.graphics.fillCircle(s.x, s.y, size1);
        
        // Bokeh effect for close sparks (foreground bokeh)
        if (s.z < 0.8) {
          this.graphics.fillStyle(outerColor, s.life * 0.35);
          this.graphics.fillCircle(s.x, s.y, size2 * 1.5);
        } else {
          this.graphics.fillStyle(outerColor, s.life * 0.18);
          this.graphics.fillCircle(s.x, s.y, size2);
        }
      });
      this.sparks = this.sparks.filter(s => s.life > 0);
      
      // Lightning Arcs
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.65) {
          const arcPoints = 5;
          const angle = Math.random() * Math.PI * 2;
          const length = 70 + Math.random() * 260;
          let curX = tx;
          let curY = ty;
          
          this.graphics.lineStyle(1.5 + Math.random() * 2.5, Math.random() > 0.5 ? 0x00ffdc : 0xff0a50, 0.95);
          this.graphics.beginPath();
          this.graphics.moveTo(curX, curY);
          for (let j = 1; j <= arcPoints; j++) {
            const segT = j / arcPoints;
            const nextX = tx + Math.cos(angle) * length * segT + (Math.random() - 0.5) * 40;
            const nextY = ty + Math.sin(angle) * length * segT + (Math.random() - 0.5) * 40;
            this.graphics.lineTo(nextX, nextY);
            curX = nextX;
            curY = nextY;
          }
          this.graphics.strokePath();
        }
      }
      
      // Circular expanding shockwave
      this.graphics.lineStyle(6 * (1 - waveProgress) + 1.5, 0xff2d00, 0.9 * (1 - waveProgress));
      this.graphics.strokeCircle(tx, ty, 40 * waveProgress * 7.5);

      // Draw fully awakened wiggling cell emerging from the explosion
      const wakeScale = 0.75 + waveProgress * 0.25;
      this.drawPlayer(tx, ty, wakeScale, 1.0, time);
    }
    
    // 5. Complete transition at 3 seconds
    if (progress >= 1.0) {
      this.isActive = false;
      this.game.events.emit('intro-complete');
    }
  }

  drawPlayer(tx, ty, scale, opacity, time) {
    const baseRad = (this.scale.width <= 768 ? 45 : 78) * scale;
    
    // Draw tail
    const tailCount = 4;
    for (let tNum = 0; tNum < tailCount; tNum++) {
      this.graphics.beginPath();
      this.graphics.moveTo(tx, ty);
      
      const phaseOffset = tNum * (Math.PI / 2);
      const amp = (5 + tNum * 2.5) * scale;
      const width = (1.5 - tNum * 0.25) * scale;
      
      for (let i = 1; i < 20; i++) {
        const wave = Math.sin(time * 0.012 - i * 0.35 + phaseOffset) * (amp * (1 - i / 20));
        const emergeOffset = (tNum - 1.5) * 4 * (1 - i / 20) * scale;
        this.graphics.lineTo(tx - i * 5 * scale, ty + wave + emergeOffset);
      }
      
      if (tNum === 0) {
        this.graphics.lineStyle(width * 3.5, 0xffffff, opacity * 0.22);
        this.graphics.strokePath();
      }
      
      this.graphics.lineStyle(width, 0xffffff, opacity);
      this.graphics.strokePath();
    }
    
    // Membrane draw helper
    const drawMembrane = (mScale, color, alpha) => {
      this.graphics.fillStyle(color, alpha * opacity);
      this.graphics.beginPath();
      
      const numPts = 16;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const w = Math.sin(time * 0.003 + angle * 3) * 3;
        const px = tx + (baseRad + w) * Math.cos(angle) * mScale;
        const py = ty + (baseRad + w) * Math.sin(angle) * mScale;
        if (i === 0) this.graphics.moveTo(px, py);
        else this.graphics.lineTo(px, py);
      }
      this.graphics.closePath();
      this.graphics.fillPath();
    };
    
    const strokeMembrane = (lineWidth, color, alpha) => {
      this.graphics.lineStyle(lineWidth, color, alpha * opacity);
      this.graphics.beginPath();
      const numPts = 16;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const w = Math.sin(time * 0.003 + angle * 3) * 3;
        const px = tx + (baseRad + w) * Math.cos(angle);
        const py = ty + (baseRad + w) * Math.sin(angle);
        if (i === 0) this.graphics.moveTo(px, py);
        else this.graphics.lineTo(px, py);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    };
    
    strokeMembrane(40 * scale, 0xffffff, 0.08);
    strokeMembrane(24 * scale, 0xffffff, 0.16);
    strokeMembrane(10 * scale, 0xffffff, 0.35);
    
    drawMembrane(1.00, 0x050508, 0.95);
    drawMembrane(0.92, 0xffffff, 0.08);
    drawMembrane(0.65, 0xffffff, 0.22);
    drawMembrane(0.20, 0xffffff, 0.65);
    drawMembrane(0.08, 0xffffff, 0.95);
    
    strokeMembrane(2.5 * scale, 0xffffff, 0.98);
    
    this.graphics.beginPath();
    this.graphics.fillStyle(0xffffff, 0.48 * opacity);
    this.graphics.fillCircle(tx - baseRad * 0.3, ty - baseRad * 0.3, baseRad * 0.16);
    
    // Intro cell rendering ends here (nucleus and rotating loops removed)
  }

  drawOrganicMembraneBlobs(time) {
    const width = this.scale.width;
    const height = this.scale.height;
    const minDim = Math.min(width, height);

    // ==================== RIGHT SIDE WALLS ====================
    // ---------- LAYER 1: Largest dark blob — occupies top-right quadrant ----------
    const b1CX = width * 0.82;
    const b1CY = height * 0.28;
    const b1R  = minDim * 0.42;
    const b1Points = [];
    const bSteps = 28;
    for (let i = 0; i <= bSteps; i++) {
      const t = i / bSteps;
      const baseAngle = t * Math.PI * 2;
      const deform =
        Math.sin(baseAngle * 2.3 + time * 0.00018) * (b1R * 0.18) +
        Math.sin(baseAngle * 3.7 + time * 0.00012) * (b1R * 0.09) +
        Math.cos(baseAngle * 1.6 + time * 0.00025) * (b1R * 0.12);
      const r = b1R + deform;
      b1Points.push({ x: b1CX + Math.cos(baseAngle) * r, y: b1CY + Math.sin(baseAngle) * r });
    }
    this.graphics.fillStyle(0x181818, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(b1Points[0].x, b1Points[0].y);
    for (let i = 1; i < b1Points.length; i++) this.graphics.lineTo(b1Points[i].x, b1Points[i].y);
    this.graphics.closePath();
    this.graphics.fillPath();
    // Subtle inner highlight
    this.graphics.fillStyle(0x272727, 0.55);
    this.graphics.beginPath();
    this.graphics.moveTo(b1Points[0].x, b1Points[0].y);
    for (let i = 1; i < b1Points.length; i++) this.graphics.lineTo(b1Points[i].x - b1R * 0.08, b1Points[i].y - b1R * 0.06);
    this.graphics.closePath();
    this.graphics.fillPath();
    // Rim highlight
    this.graphics.lineStyle(2.5, 0x4a4a4a, 0.45);
    this.graphics.beginPath();
    this.graphics.moveTo(b1Points[0].x, b1Points[0].y);
    for (let i = 1; i < b1Points.length; i++) this.graphics.lineTo(b1Points[i].x, b1Points[i].y);
    this.graphics.closePath();
    this.graphics.strokePath();

    // ---------- LAYER 2: Second organic blob — smaller, overlapping at upper right ----------
    const b2CX = width * 0.72;
    const b2CY = height * 0.12;
    const b2R  = minDim * 0.22;
    const b2Points = [];
    for (let i = 0; i <= bSteps; i++) {
      const t = i / bSteps;
      const baseAngle = t * Math.PI * 2;
      const deform =
        Math.cos(baseAngle * 2.1 + time * 0.00022) * (b2R * 0.22) +
        Math.sin(baseAngle * 4.0 + time * 0.00015) * (b2R * 0.10);
      const r = b2R + deform;
      b2Points.push({ x: b2CX + Math.cos(baseAngle) * r, y: b2CY + Math.sin(baseAngle) * r });
    }
    this.graphics.fillStyle(0x131313, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(b2Points[0].x, b2Points[0].y);
    for (let i = 1; i < b2Points.length; i++) this.graphics.lineTo(b2Points[i].x, b2Points[i].y);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(1.5, 0x383838, 0.55);
    this.graphics.beginPath();
    this.graphics.moveTo(b2Points[0].x, b2Points[0].y);
    for (let i = 1; i < b2Points.length; i++) this.graphics.lineTo(b2Points[i].x, b2Points[i].y);
    this.graphics.closePath();
    this.graphics.strokePath();

    // ---------- LAYER 3: A long finger/tendril fold draping down the right side ----------
    const tendrilPoints = [];
    const tSteps = 22;
    for (let i = 0; i <= tSteps; i++) {
      const t = i / tSteps;
      const y = height * (-0.05) + t * (height * 1.1);
      const baseX = width * 0.88;
      const waver =
        Math.sin(t * Math.PI * 2.4 + time * 0.00020) * (width * 0.06) +
        Math.cos(t * Math.PI * 1.1 + time * 0.00014) * (width * 0.03);
      tendrilPoints.push({ x: baseX + waver, y });
    }
    this.graphics.fillStyle(0x0e0e0e, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(tendrilPoints[0].x, tendrilPoints[0].y);
    for (let i = 1; i < tendrilPoints.length; i++) this.graphics.lineTo(tendrilPoints[i].x, tendrilPoints[i].y);
    this.graphics.lineTo(width + 60, height * 1.1);
    this.graphics.lineTo(width + 60, -height * 0.05);
    this.graphics.closePath();
    this.graphics.fillPath();
    // Edge glow
    this.graphics.lineStyle(2, 0x333333, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(tendrilPoints[0].x, tendrilPoints[0].y);
    for (let i = 1; i < tendrilPoints.length; i++) this.graphics.lineTo(tendrilPoints[i].x, tendrilPoints[i].y);
    this.graphics.strokePath();

    // ==================== LEFT SIDE WALLS ====================
    // ---------- LAYER 4: Large organic blob — occupies top-left quadrant ----------
    const b3CX = width * 0.05;
    const b3CY = height * 0.18;
    const b3R  = minDim * 0.16;
    const b3Points = [];
    for (let i = 0; i <= bSteps; i++) {
      const t = i / bSteps;
      const baseAngle = t * Math.PI * 2;
      const deform =
        Math.sin(baseAngle * 1.9 + time * 0.00016) * (b3R * 0.16) +
        Math.cos(baseAngle * 3.3 + time * 0.00014) * (b3R * 0.11) +
        Math.sin(baseAngle * 2.1 + time * 0.00021) * (b3R * 0.07);
      const r = b3R + deform;
      b3Points.push({ x: b3CX + Math.cos(baseAngle) * r, y: b3CY + Math.sin(baseAngle) * r });
    }
    this.graphics.fillStyle(0x181818, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(b3Points[0].x, b3Points[0].y);
    for (let i = 1; i < b3Points.length; i++) this.graphics.lineTo(b3Points[i].x, b3Points[i].y);
    this.graphics.closePath();
    this.graphics.fillPath();
    // Inner volume highlight
    this.graphics.fillStyle(0x272727, 0.55);
    this.graphics.beginPath();
    this.graphics.moveTo(b3Points[0].x, b3Points[0].y);
    for (let i = 1; i < b3Points.length; i++) this.graphics.lineTo(b3Points[i].x + b3R * 0.08, b3Points[i].y + b3R * 0.06);
    this.graphics.closePath();
    this.graphics.fillPath();
    // Rim highlight
    this.graphics.lineStyle(2.5, 0x4a4a4a, 0.45);
    this.graphics.beginPath();
    this.graphics.moveTo(b3Points[0].x, b3Points[0].y);
    for (let i = 1; i < b3Points.length; i++) this.graphics.lineTo(b3Points[i].x, b3Points[i].y);
    this.graphics.closePath();
    this.graphics.strokePath();

    // ---------- LAYER 5: Second organic blob — bottom-left quadrant ----------
    const b4CX = width * 0.03;
    const b4CY = height * 0.82;
    const b4R  = minDim * 0.14;
    const b4Points = [];
    for (let i = 0; i <= bSteps; i++) {
      const t = i / bSteps;
      const baseAngle = t * Math.PI * 2;
      const deform =
        Math.cos(baseAngle * 2.5 + time * 0.00019) * (b4R * 0.15) +
        Math.sin(baseAngle * 3.8 + time * 0.00011) * (b4R * 0.08);
      const r = b4R + deform;
      b4Points.push({ x: b4CX + Math.cos(baseAngle) * r, y: b4CY + Math.sin(baseAngle) * r });
    }
    this.graphics.fillStyle(0x131313, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(b4Points[0].x, b4Points[0].y);
    for (let i = 1; i < b4Points.length; i++) this.graphics.lineTo(b4Points[i].x, b4Points[i].y);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(1.5, 0x383838, 0.55);
    this.graphics.beginPath();
    this.graphics.moveTo(b4Points[0].x, b4Points[0].y);
    for (let i = 1; i < b4Points.length; i++) this.graphics.lineTo(b4Points[i].x, b4Points[i].y);
    this.graphics.closePath();
    this.graphics.strokePath();

    // ---------- LAYER 6: Left tendril/fold draping down the left side ----------
    const leftTendrilPoints = [];
    for (let i = 0; i <= tSteps; i++) {
      const t = i / tSteps;
      const y = height * (-0.05) + t * (height * 1.1);
      const baseX = width * 0.02;
      const waver =
        Math.sin(t * Math.PI * 2.2 - time * 0.00018) * (width * 0.012) +
        Math.cos(t * Math.PI * 1.3 - time * 0.00012) * (width * 0.006);
      leftTendrilPoints.push({ x: baseX + waver, y });
    }
    this.graphics.fillStyle(0x0e0e0e, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(leftTendrilPoints[0].x, leftTendrilPoints[0].y);
    for (let i = 1; i < leftTendrilPoints.length; i++) this.graphics.lineTo(leftTendrilPoints[i].x, leftTendrilPoints[i].y);
    this.graphics.lineTo(-60, height * 1.1);
    this.graphics.lineTo(-60, -height * 0.05);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(2, 0x333333, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(leftTendrilPoints[0].x, leftTendrilPoints[0].y);
    for (let i = 1; i < leftTendrilPoints.length; i++) this.graphics.lineTo(leftTendrilPoints[i].x, leftTendrilPoints[i].y);
    this.graphics.strokePath();
  }
}
