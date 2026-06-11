import { STATE, CONFIG } from './state.js';
import { audio } from './audio.js';

// --- VISUAL RENDERING ENTITIES ---
export class Particle {
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
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('ALPHA', alpha.toFixed(2));
    ctx.fill();
  }
}

// Background flow currents (pure B&W Sin City vibe)
export class CurrentLine {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 10;
    this.y = Math.random() * height;
    this.length = 50 + Math.random() * 100;
    this.speed = (1.5 + Math.random() * 2.0);
    this.thickness = 1;
  }
  
  update(width, height, speedMultiplier) {
    this.x -= this.speed * speedMultiplier;
    if (this.x + this.length < 0) {
      this.reset(width, height);
    }
  }
  
  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.length, this.y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + (this.speed * 0.01)})`;
    ctx.lineWidth = this.thickness;
    ctx.stroke();
  }
}

// Organism Spring/Physics Membrane node
export class MembranePoint {
  constructor(angle, baseRadius) {
    this.angle = angle;
    this.baseRadius = baseRadius;
    this.offset = 0;
    this.velocity = 0;
    this.targetOffset = 0;
  }
  
  update(wobbleSpeed, massScale) {
    const k = 0.08; // Spring constant
    const damping = 0.88; // Damping
    
    const time = Date.now();
    const primaryLobe = Math.sin(time * 0.001 + this.angle) * (14 * massScale);
    const secondaryLobe = Math.cos(time * 0.0023 + this.angle * 3) * (8 * massScale);
    const ripple = Math.sin(time * 0.006 + this.angle * 5) * (3 * massScale);
    
    this.targetOffset = primaryLobe + secondaryLobe + ripple;
    
    const force = k * (this.targetOffset - this.offset);
    this.velocity += force;
    this.velocity *= damping;
    this.offset += this.velocity;
  }
}

// --- CANVAS GAME CONTROLLER ---
export class GameCanvasController {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.particles = [];
    this.currents = [];
    this.membranePoints = [];
    
    // Organism metrics
    this.player = {
      x: 180,
      y: this.height / 2,
      targetY: this.height / 2,
      radius: 78,
      targetRadius: 78,
      massScale: 1.0,
      wobbleSpeed: 0.005,
      tail: []
    };
    
    this.initMembrane();
    this.initCurrents();
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
  }
  
  initMembrane() {
    const numPoints = 16;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.membranePoints.push(new MembranePoint(angle, this.player.radius));
    }
  }
  
  initCurrents() {
    for (let i = 0; i < 40; i++) {
      this.currents.push(new CurrentLine(this.width, this.height));
    }
  }
  
  initIntroParticles() {
    this.introParticles = [];
    const colors = [0, 60, 120, 180, 240, 300]; // Rainbow hues
    for (let i = 0; i < 280; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 260;
      const speed = (0.015 + Math.random() * 0.03) * (Math.random() > 0.5 ? 1 : -1);
      this.introParticles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * (0.6 + Math.random() * 0.4),
        z: (Math.random() - 0.5) * 150,
        hue: colors[i % colors.length],
        speed: speed,
        size: 1.5 + Math.random() * 4.5
      });
    }
    
    // Initialize frozen ice crust shards to shatter during awakening
    this.awakeningIceShards = [];
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
      
      this.awakeningIceShards.push({
        angle: angle,
        baseRadius: radius,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        points: points,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: 0,
        exploded: false,
        alpha: 1.0
      });
    }
    this.awakeningSparks = [];
  }
  
  spawnAwakeningExplosion() {
    const tx = Math.max(120, Math.min(this.width * 0.2, 220));
    const ty = this.height / 2;
    
    if (this.awakeningIceShards) {
      this.awakeningIceShards.forEach(s => {
        s.exploded = true;
        const speed = 7 + Math.random() * 15;
        s.vx = Math.cos(s.angle) * speed;
        s.vy = Math.sin(s.angle) * speed;
        s.rotSpeed = (Math.random() - 0.5) * 0.4;
      });
    }
    
    this.awakeningSparks = [];
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 20;
      this.awakeningSparks.push({
        x: tx,
        y: ty,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.0 + Math.random() * 6.0,
        hue: 12 + Math.random() * 38,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.025
      });
    }
  }
  
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    this.player.x = Math.max(120, Math.min(this.width * 0.2, 220));
    
    if (STATE.isPlaying) {
      this.generatePaths();
    }
  }
  
  generatePaths() {
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = this.width - 120;
    
    const qualities = ['best', 'ok', 'worst'];
    if (STATE.hasLifeline) {
      qualities[0] = 'best';
    }
    
    for (let i = qualities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qualities[i], qualities[j]] = [qualities[j], qualities[i]];
    }
    
    const branchDelta = Math.min(220, this.height * 0.28);
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
    if (STATE.hasLifeline && quality === 'best') color = 'rgba(46, 204, 113, ALPHA)';
    
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
    
    const count = 25;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      const vx = Math.cos(angle) * speed - STATE.currentSpeed;
      const vy = Math.sin(angle) * speed;
      const size = 1.5 + Math.random() * 3.5;
      const life = 30 + Math.floor(Math.random() * 30);
      
      this.particles.push(new Particle(x, y, color, size, vx, vy, life));
    }
  }
  
  update() {
    if (STATE.isCoverScreen) {
      this.currents.forEach(c => c.update(this.width, this.height, 0.05));
      return;
    }
    
    if (STATE.isIntro) {
      const elapsed = Date.now() - STATE.introStartTime;
      const progress = Math.min(1.0, elapsed / 3000);
      
      const cx = this.width / 2;
      const cy = this.height / 2;
      const tx = Math.max(120, Math.min(this.width * 0.2, 220));
      const ty = this.height / 2;
      
      if (this.introParticles) {
        this.introParticles.forEach(p => {
          const cosAngle = Math.cos(p.speed);
          const sinAngle = Math.sin(p.speed);
          
          const rx = p.x * cosAngle - p.z * sinAngle;
          const rz = p.x * sinAngle + p.z * cosAngle;
          p.x = rx;
          p.z = rz;
          
          let radiusScale = 1.0;
          if (progress < 0.18) {
            radiusScale = 0.5 + progress * 8.5;
          } else if (progress < 0.66) {
            const compressProgress = (progress - 0.18) / (0.66 - 0.18);
            radiusScale = Math.max(0.01, 2.0 * (1.0 - compressProgress));
          } else {
            const awakeProgress = (progress - 0.66) / 0.34;
            radiusScale = 0.01 + Math.pow(awakeProgress, 1.8) * 18.0;
          }
          
          const vx = cx + (tx - cx) * progress;
          const vy = cy + (ty - cy) * progress;
          
          p.screenX = vx + p.x * radiusScale;
          p.screenY = vy + p.y * radiusScale;
        });
      }
      
      if (this.awakeningIceShards) {
        this.awakeningIceShards.forEach(s => {
          if (!s.exploded) {
            s.x = tx + Math.cos(s.angle) * s.baseRadius;
            s.y = ty + Math.sin(s.angle) * s.baseRadius;
          } else {
            s.x += s.vx;
            s.y += s.vy;
            s.rot += s.rotSpeed;
            s.vx *= 0.95;
            s.vy *= 0.95;
            s.alpha -= 0.025;
          }
        });
      }
      
      if (this.awakeningSparks) {
        this.awakeningSparks.forEach(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.96;
          s.vy *= 0.96;
          s.life -= s.decay;
        });
        this.awakeningSparks = this.awakeningSparks.filter(s => s.life > 0);
      }
      return;
    }

    const targetX = Math.max(120, Math.min(this.width * 0.2, 220));
    const targetY = STATE.isPlaying ? this.player.targetY : this.height / 2;
    
    this.player.x += (targetX - this.player.x) * 0.08;
    this.player.y += (targetY - this.player.y) * 0.08;
    
    this.player.massScale = 0.95 + (STATE.repro / 100) * 0.35;
    this.membranePoints.forEach(pt => pt.update(this.player.wobbleSpeed, this.player.massScale));
    
    this.player.tail.unshift({ x: this.player.x, y: this.player.y });
    if (this.player.tail.length > 25) {
      this.player.tail.pop();
    }
    
    this.currents.forEach(c => c.update(this.width, this.height, STATE.currentSpeed * 0.8));
    
    this.particles.forEach((p, idx) => {
      p.update();
      if (p.life <= 0) {
        this.particles.splice(idx, 1);
      }
    });
    
    if (STATE.paths && STATE.paths.length > 0) {
      STATE.paths.forEach(p => {
        p.particles.forEach(nut => {
          nut.t -= 0.00075 * STATE.currentSpeed;
          if (nut.t < 0) {
            nut.t = 1.0;
          }
        });
      });
    }
    
    STATE.currentSpeed += (STATE.targetSpeed - STATE.currentSpeed) * 0.08;
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    if (STATE.isCoverScreen) {
      this.currents.forEach(c => {
        this.ctx.beginPath();
        this.ctx.moveTo(c.x, c.y);
        this.ctx.lineTo(c.x + c.length, c.y);
        this.ctx.strokeStyle = 'rgba(0, 195, 255, 0.22)';
        this.ctx.lineWidth = c.thickness + 0.5;
        this.ctx.stroke();
      });
      
      const tx = Math.max(120, Math.min(this.width * 0.2, 220));
      const ty = this.height / 2;
      
      const frostGrad = this.ctx.createRadialGradient(tx, ty, this.width * 0.05, tx, ty, this.width * 0.95);
      frostGrad.addColorStop(0, 'rgba(8, 25, 45, 0.25)');
      frostGrad.addColorStop(0.5, 'rgba(12, 40, 70, 0.65)');
      frostGrad.addColorStop(1, 'rgba(20, 55, 90, 0.92)');
      this.ctx.fillStyle = frostGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.save();
      this.ctx.translate(tx, ty);
      
      this.ctx.shadowColor = 'rgba(0, 230, 255, 0.7)';
      this.ctx.shadowBlur = 12;
      
      this.ctx.beginPath();
      const numPts = 16;
      const radius = 78;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const w = Math.sin(Date.now() * 0.0015 + angle * 2) * 0.7;
        const r = radius + w;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      
      const soulGrad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
      soulGrad.addColorStop(0, 'rgba(0, 225, 255, 0.75)');
      soulGrad.addColorStop(0.5, 'rgba(0, 160, 255, 0.55)');
      soulGrad.addColorStop(0.85, 'rgba(0, 90, 200, 0.35)');
      soulGrad.addColorStop(1, 'rgba(0, 45, 120, 0.08)');
      this.ctx.fillStyle = soulGrad;
      this.ctx.fill();
      
      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.95)';
      this.ctx.lineWidth = 3.0;
      this.ctx.stroke();
      
      const shardCount = 35;
      for (let i = 0; i < shardCount; i++) {
        const angle = (i / shardCount) * Math.PI * 2;
        const baseRadius = 65 + (i % 3 === 0 ? 20 : i % 3 === 1 ? 5 : 28);
        
        this.ctx.save();
        this.ctx.translate(Math.cos(angle) * baseRadius, Math.sin(angle) * baseRadius);
        this.ctx.rotate(angle + Math.PI / 2);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, -9);
        this.ctx.lineTo(5, 7);
        this.ctx.lineTo(-5, 7);
        this.ctx.closePath();
        
        this.ctx.fillStyle = 'rgba(0, 185, 255, 0.45)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(160, 245, 255, 0.85)';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        this.ctx.restore();
      }
      
      this.ctx.shadowColor = 'rgba(0, 240, 255, 0.95)';
      this.ctx.shadowBlur = 15;
      this.ctx.strokeStyle = 'rgba(0, 235, 255, 0.88)';
      this.ctx.lineWidth = 2.8;
      for (let k = 0; k < 8; k++) {
        const angle = (k / 8) * Math.PI * 2 + 0.25;
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        let curDist = radius;
        let curAngle = angle;
        for (let seg = 0; seg < 4; seg++) {
          curDist += 35 + Math.random() * 25;
          curAngle += (Math.random() - 0.5) * 0.45;
          this.ctx.lineTo(Math.cos(curAngle) * curDist, Math.sin(curAngle) * curDist);
        }
        this.ctx.stroke();
      }
      
      this.ctx.restore();
      return;
    }
    
    let shakeX = 0;
    let shakeY = 0;
    if (STATE.isIntro) {
      const elapsed = Date.now() - STATE.introStartTime;
      if (elapsed >= 2000 && elapsed < 3000) {
        const shakePct = 1.0 - ((elapsed - 2000) / 1000);
        shakeX = (Math.random() - 0.5) * 16 * shakePct;
        shakeY = (Math.random() - 0.5) * 16 * shakePct;
      }
    }
    
    if (STATE.isIntro) {
      this.ctx.save();
      
      const elapsed = Date.now() - STATE.introStartTime;
      const progress = Math.min(1.0, elapsed / 3000);
      const tx = Math.max(120, Math.min(this.width * 0.2, 220));
      const ty = this.height / 2;
      const hueBase = (Date.now() * 0.015) % 360;
      
      if (progress >= 0.66) {
        const awakeProgress = (progress - 0.66) / 0.34;
        
        let heartScale = 1.0;
        const beatPhase = (awakeProgress * Math.PI * 4) % (Math.PI * 2);
        if (beatPhase < Math.PI) {
          heartScale = 1.0 + Math.sin(beatPhase) * 0.14 * Math.max(0, 1.0 - awakeProgress);
        } else {
          const subPhase = beatPhase - Math.PI;
          heartScale = 1.0 + Math.sin(subPhase) * 0.07 * Math.max(0, 1.0 - awakeProgress);
        }
        
        this.ctx.translate(tx, ty);
        this.ctx.scale(heartScale, heartScale);
        this.ctx.translate(-tx, -ty);
      }
      
      this.ctx.translate(shakeX, shakeY);
      
      if (progress < 0.66) {
        const darkGrad = this.ctx.createRadialGradient(tx, ty, this.width * 0.3, tx, ty, this.width * 0.9);
        darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
        this.ctx.fillStyle = darkGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);
      } else {
        const awakeProgress = (progress - 0.66) / 0.34;
        const pulse = Math.sin(awakeProgress * Math.PI * 6) * 0.4 + 0.6;
        const alpha = 0.75 * (1.0 - awakeProgress) * pulse;
        const survivalGrad = this.ctx.createRadialGradient(tx, ty, this.width * 0.2, tx, ty, this.width * 0.95);
        survivalGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        survivalGrad.addColorStop(0.5, `rgba(200, 15, 0, ${alpha * 0.35})`);
        survivalGrad.addColorStop(1, `rgba(240, 25, 0, ${alpha * 0.95})`);
        this.ctx.fillStyle = survivalGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
      
      if (this.introParticles) {
        this.introParticles.forEach(p => {
          let sat = 100;
          let colorHue = p.hue;
          let alpha = Math.max(0.1, 1.0 - progress * 0.2);
          
          if (progress < 0.66) {
            sat = Math.max(0, 100 * (1 - (progress / 0.66)));
          } else {
            const awakeProgress = (progress - 0.66) / 0.34;
            sat = 100;
            colorHue = 12 + (p.hue % 38) + Math.sin(Date.now() * 0.02) * 5;
            alpha = Math.max(0.1, (1.0 - awakeProgress) * 0.9);
          }
          
          const size = p.size * (progress >= 0.66 ? 1.0 + (progress - 0.66) * 2.0 : 1.3 - progress * 0.65);
          
          this.ctx.beginPath();
          this.ctx.arc(p.screenX, p.screenY, size, 0, Math.PI * 2);
          this.ctx.fillStyle = `hsla(${colorHue}, ${sat}%, 55%, ${alpha})`;
          this.ctx.fill();
          
          if (p.size > 3.0 && (sat > 10 || progress >= 0.66)) {
            this.ctx.beginPath();
            this.ctx.arc(p.screenX, p.screenY, size * 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${colorHue}, ${sat}%, 50%, ${alpha * 0.15})`;
            this.ctx.fill();
          }
        });
      }
      
      if (progress < 0.14) {
        const flashAlpha = 1.0 - (progress / 0.14);
        const radius = Math.min(this.width, this.height) * 0.45 * (1 - flashAlpha);
        
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.9})`;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2, this.height / 2, radius * 1.5, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0, 255, 204, ${flashAlpha * 0.3})`;
        this.ctx.fill();
      }
      
      if (progress < 0.66) {
        const frozenAlpha = progress / 0.66;
        
        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.beginPath();
        const numPts = 16;
        const radius = 78 * frozenAlpha;
        for (let i = 0; i < numPts; i++) {
          const angle = (i / numPts) * Math.PI * 2;
          const w = Math.sin(Date.now() * 0.01 + angle * 2) * 2;
          const r = radius + w;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = `rgba(0, 220, 255, ${frozenAlpha * 0.55})`;
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(0, 240, 255, ${frozenAlpha * 0.9})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
        
        const crackProgress = Math.pow(progress / 0.66, 2.5);
        const crackRadius = 88 * crackProgress;
        
        this.ctx.shadowColor = 'rgba(0, 240, 255, 0.85)';
        this.ctx.shadowBlur = 12;
        this.ctx.strokeStyle = 'rgba(0, 235, 255, 0.9)';
        this.ctx.lineWidth = 2.5;
        
        for (let k = 0; k < 6; k++) {
          const angle = (k / 6) * Math.PI * 2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(Math.cos(angle) * crackRadius, Math.sin(angle) * crackRadius);
          this.ctx.lineTo(Math.cos(angle + 0.3) * crackRadius * 1.35, Math.sin(angle + 0.3) * crackRadius * 1.35);
          this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
      }
      
      if (progress >= 0.66) {
        const waveProgress = (progress - 0.66) / 0.34;
        
        if (this.awakeningIceShards) {
          this.awakeningIceShards.forEach(s => {
            if (s.alpha <= 0) return;
            this.ctx.save();
            this.ctx.translate(s.x, s.y);
            this.ctx.rotate(s.rot);
            
            this.ctx.beginPath();
            this.ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let i = 1; i < s.points.length; i++) {
              this.ctx.lineTo(s.points[i].x, s.points[i].y);
            }
            this.ctx.closePath();
            
            this.ctx.fillStyle = `rgba(150, 230, 255, ${0.9 * s.alpha})`;
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * s.alpha})`;
            this.ctx.lineWidth = 2.0;
            this.ctx.stroke();
            this.ctx.restore();
          });
        }
        
        if (this.awakeningSparks) {
          this.awakeningSparks.forEach(s => {
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * (0.3 + s.life * 0.7), 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${s.hue}, 100%, 62%, ${s.life * 0.95})`;
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * 2.8 * s.life, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${s.hue}, 100%, 50%, ${s.life * 0.18})`;
            this.ctx.fill();
          });
        }
        
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.65) {
            const arcPoints = 5;
            const angle = Math.random() * Math.PI * 2;
            const length = 70 + Math.random() * 260;
            let curX = tx;
            let curY = ty;
            this.ctx.beginPath();
            this.ctx.moveTo(curX, curY);
            for (let j = 1; j <= arcPoints; j++) {
              const segT = j / arcPoints;
              const nextX = tx + Math.cos(angle) * length * segT + (Math.random() - 0.5) * 40;
              const nextY = ty + Math.sin(angle) * length * segT + (Math.random() - 0.5) * 40;
              this.ctx.lineTo(nextX, nextY);
              curX = nextX;
              curY = nextY;
            }
            this.ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0, 255, 220, 0.95)' : 'rgba(255, 10, 80, 0.95)';
            this.ctx.lineWidth = 1.5 + Math.random() * 2.5;
            this.ctx.stroke();
          }
        }
        
        this.ctx.beginPath();
        this.ctx.arc(tx, ty, 40 * waveProgress * 7.5, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 45, 0, ${0.9 * (1 - waveProgress)})`;
        this.ctx.lineWidth = 6 * (1 - waveProgress) + 1.5;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(tx, ty, 30 * waveProgress * 5.0, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.95 * (1 - waveProgress)})`;
        this.ctx.lineWidth = 9 * (1 - waveProgress) + 2;
        this.ctx.stroke();
        
        const plasmaRad = 60 * (1.15 + Math.sin(Date.now() * 0.04) * 0.18) * waveProgress;
        const plasmaGrad = this.ctx.createRadialGradient(tx, ty, 2, tx, ty, plasmaRad);
        plasmaGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        plasmaGrad.addColorStop(0.3, `hsla(${(hueBase + 110) % 360}, 100%, 65%, 0.95)`);
        plasmaGrad.addColorStop(0.65, `hsla(${hueBase}, 100%, 55%, 0.65)`);
        plasmaGrad.addColorStop(1, 'rgba(138, 43, 226, 0.0)');
        
        this.ctx.beginPath();
        this.ctx.arc(tx, ty, plasmaRad, 0, Math.PI * 2);
        this.ctx.fillStyle = plasmaGrad;
        this.ctx.fill();
        
        this.ctx.save();
        this.ctx.translate(tx, ty);
        
        this.ctx.beginPath();
        const trailLen = 9;
        for (let i = 0; i < trailLen; i++) {
          const tAngle = Math.PI + Math.sin(Date.now() * 0.07 + i * 0.45) * 0.45;
          const tDist = (i + 1) * 15;
          const trailX = Math.cos(tAngle) * tDist;
          const trailY = Math.sin(tAngle) * tDist;
          if (i === 0) this.ctx.moveTo(trailX, trailY);
          else this.ctx.lineTo(trailX, trailY);
        }
        this.ctx.strokeStyle = `rgba(255, 50, 0, ${0.8 * waveProgress})`;
        this.ctx.lineWidth = 7 * waveProgress;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        this.ctx.beginPath();
        const bodyPts = 16;
        const bodyRadius = 78 * waveProgress;
        for (let i = 0; i < bodyPts; i++) {
          const angle = (i / bodyPts) * Math.PI * 2;
          const w = Math.sin(Date.now() * 0.045 + angle * 4) * 6;
          const r = bodyRadius + w;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        
        const cellGrad = this.ctx.createRadialGradient(0, 0, 2, 0, 0, bodyRadius);
        cellGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        cellGrad.addColorStop(0.35, 'rgba(255, 165, 0, 0.9)');
        cellGrad.addColorStop(0.75, 'rgba(220, 20, 60, 0.75)');
        cellGrad.addColorStop(1, 'rgba(120, 0, 50, 0.0)');
        
        this.ctx.fillStyle = cellGrad;
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
        
        this.ctx.restore();
      }
      
      this.ctx.restore();
      return;
    }
    
    this.currents.forEach(c => c.draw(this.ctx));
    
    if (STATE.isPlaying && STATE.paths && STATE.paths.length > 0) {
      STATE.paths.forEach(p => {
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, p.startY);
        this.ctx.bezierCurveTo(p.cp1X, p.cp1Y, p.cp2X, p.cp2Y, p.endX, p.endY);
        
        let pathStroke = 'rgba(255, 255, 255, 0.08)';
        
        if (STATE.isThreatWarning) {
          if (p.quality === 'worst') {
            pathStroke = 'rgba(231, 76, 60, 0.45)';
          } else if (p.quality === 'best') {
            pathStroke = 'rgba(46, 204, 113, 0.35)';
          }
        } else if (STATE.hasLifeline && p.quality === 'best') {
          pathStroke = `rgba(46, 204, 113, ${0.3 + Math.sin(Date.now() * 0.01) * 0.15})`;
        }
        
        this.ctx.strokeStyle = pathStroke;
        this.ctx.lineWidth = STATE.hasLifeline && p.quality === 'best' ? 4 : 2.5;
        this.ctx.setLineDash([8, 12]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.beginPath();
        this.ctx.arc(p.endX, p.endY, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = p.quality === 'worst' && STATE.isThreatWarning ? '#e74c3c' : 'rgba(255, 255, 255, 0.15)';
        this.ctx.fill();
        
        p.particles.forEach(nut => {
          const pt = this.getBezierPoint(p, nut.t);
          const pulse = Math.sin(Date.now() * 0.005 + nut.pulseOffset) * 1.5;
          const rot = Date.now() * nut.rotSpeed * 0.08;
          const radBase = nut.size + pulse;
          
          const drawProteinPath = (scale) => {
            this.ctx.beginPath();
            const angleStep = (Math.PI * 2) / nut.spikes;
            for (let i = 0; i < nut.spikes; i++) {
              const angle = i * angleStep + rot;
              const r = radBase * (1.0 + nut.spikeHeights[i] * 0.6) * scale;
              const px = pt.x + Math.cos(angle) * r;
              const py = pt.y + Math.sin(angle) * r;
              
              if (i === 0) {
                this.ctx.moveTo(px, py);
              } else {
                const prevAngle = (i - 0.5) * angleStep + rot;
                const socketRad = radBase * 0.45 * scale;
                const cx = pt.x + Math.cos(prevAngle) * socketRad;
                const cy = pt.y + Math.sin(prevAngle) * socketRad;
                this.ctx.quadraticCurveTo(cx, cy, px, py);
              }
            }
            
            const prevAngle = (nut.spikes - 0.5) * angleStep + rot;
            const socketRad = radBase * 0.45 * scale;
            const cx = pt.x + Math.cos(prevAngle) * socketRad;
            const cy = pt.y + Math.sin(prevAngle) * socketRad;
            const startAngle = rot;
            const startR = radBase * (1.0 + nut.spikeHeights[0] * 0.6) * scale;
            const startX = pt.x + Math.cos(startAngle) * startR;
            const startY = pt.y + Math.sin(startAngle) * startR;
            this.ctx.quadraticCurveTo(cx, cy, startX, startY);
            this.ctx.closePath();
          };
          
          const fadeAlpha = Math.min(1.0, nut.t * 3) * Math.min(1.0, (1 - nut.t) * 3);
          
          let colorString = nut.color;
          if (STATE.isThreatWarning) {
            if (p.quality === 'worst') {
              colorString = 'rgba(231, 76, 60, ALPHA)';
            } else if (p.quality === 'best') {
              colorString = 'rgba(46, 204, 113, ALPHA)';
            } else {
              colorString = 'rgba(100, 100, 100, ALPHA)';
            }
          }
          
          drawProteinPath(1.0);
          this.ctx.fillStyle = colorString.replace('ALPHA', fadeAlpha.toFixed(2));
          this.ctx.fill();
          
          if (p.quality === 'best' || (STATE.hasLifeline && p.quality === 'best')) {
            drawProteinPath(2.2);
            this.ctx.fillStyle = `rgba(46, 204, 113, ${fadeAlpha * 0.12})`;
            this.ctx.fill();
          }
        });
      });
    }
    
    this.particles.forEach(p => p.draw(this.ctx));
    
    const sizeScale = STATE.isPlaying ? 1.0 : 3.0;
    const hueBase = (Date.now() * 0.015) % 360;
    
    if (this.player.tail.length > 5) {
      const tailGrad1 = this.ctx.createLinearGradient(this.player.x, this.player.y, this.player.x - 100 * sizeScale, this.player.y);
      tailGrad1.addColorStop(0, `hsla(${hueBase}, 100%, 60%, 0.95)`);
      tailGrad1.addColorStop(0.4, `hsla(${(hueBase + 120) % 360}, 100%, 50%, 0.55)`);
      tailGrad1.addColorStop(1, 'rgba(255, 0, 128, 0.0)');
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.tail[0].x, this.player.tail[0].y);
      for (let i = 1; i < this.player.tail.length; i++) {
        const t = this.player.tail[i];
        const wave = Math.sin(Date.now() * 0.012 - i * 0.35) * (8 * (1 - i / this.player.tail.length)) * sizeScale;
        this.ctx.lineTo(t.x - i * 4 * sizeScale, t.y + wave);
      }
      this.ctx.strokeStyle = tailGrad1;
      this.ctx.lineWidth = 4 * sizeScale;
      this.ctx.stroke();
      
      const tailGrad2 = this.ctx.createLinearGradient(this.player.x, this.player.y, this.player.x - 70 * sizeScale, this.player.y);
      tailGrad2.addColorStop(0, `hsla(${(hueBase + 240) % 360}, 100%, 55%, 0.8)`);
      tailGrad2.addColorStop(0.5, `hsla(${(hueBase + 300) % 360}, 100%, 50%, 0.4)`);
      tailGrad2.addColorStop(1, 'rgba(0, 255, 204, 0.0)');
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.player.tail[0].x, this.player.tail[0].y);
      for (let i = 1; i < this.player.tail.length * 0.7; i++) {
        const t = this.player.tail[i];
        const wave = Math.cos(Date.now() * 0.016 - i * 0.5) * (6 * (1 - i / this.player.tail.length)) * sizeScale;
        this.ctx.lineTo(t.x - i * 5 * sizeScale, t.y + wave - 5 * sizeScale);
      }
      this.ctx.strokeStyle = tailGrad2;
      this.ctx.lineWidth = 2 * sizeScale;
      this.ctx.stroke();
    }
    
    const baseRad = this.player.radius * this.player.massScale * sizeScale;
    
    const buildMembranePath = () => {
      this.ctx.beginPath();
      const startOffset = this.membranePoints[0].offset * sizeScale;
      const startAngle = this.membranePoints[0].angle;
      const sx = this.player.x + (baseRad + startOffset) * Math.cos(startAngle);
      const sy = this.player.y + (baseRad + startOffset) * Math.sin(startAngle);
      this.ctx.moveTo(sx, sy);
      
      for (let i = 1; i < this.membranePoints.length; i++) {
        const pt = this.membranePoints[i];
        const px = this.player.x + (baseRad + pt.offset * sizeScale) * Math.cos(pt.angle);
        const py = this.player.y + (baseRad + pt.offset * sizeScale) * Math.sin(pt.angle);
        this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
    };
    
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${hueBase}, 100%, 50%, 0.25)`;
    this.ctx.lineWidth = 42 * sizeScale;
    this.ctx.stroke();
    
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${(hueBase + 120) % 360}, 100%, 50%, 0.45)`;
    this.ctx.lineWidth = 26 * sizeScale;
    this.ctx.stroke();
    
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${(hueBase + 240) % 360}, 100%, 60%, 0.85)`;
    this.ctx.lineWidth = 12 * sizeScale;
    this.ctx.stroke();
    
    const gradFill = this.ctx.createRadialGradient(
      this.player.x - baseRad * 0.22,
      this.player.y - baseRad * 0.22,
      baseRad * 0.05,
      this.player.x,
      this.player.y,
      baseRad * 1.15
    );
    gradFill.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    gradFill.addColorStop(0.25, `hsla(${(hueBase + 40) % 360}, 100%, 75%, 0.85)`);
    gradFill.addColorStop(0.65, `hsla(${(hueBase + 180) % 360}, 100%, 50%, 0.65)`);
    gradFill.addColorStop(0.9, `hsla(${(hueBase + 280) % 360}, 100%, 40%, 0.38)`);
    gradFill.addColorStop(1.0, 'rgba(5, 5, 20, 0.94)');
    
    buildMembranePath();
    this.ctx.fillStyle = gradFill;
    this.ctx.fill();
    
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${(hueBase + 120) % 360}, 100%, 85%, 0.95)`;
    this.ctx.lineWidth = 2.5 * sizeScale;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.ellipse(
      this.player.x - baseRad * 0.38,
      this.player.y - baseRad * 0.38,
      baseRad * 0.22,
      baseRad * 0.09,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    this.ctx.fill();
    
    const cycleTime = Date.now() * 0.002;
    
    this.ctx.beginPath();
    this.ctx.arc(
      this.player.x + Math.sin(cycleTime) * (baseRad * 0.35),
      this.player.y + Math.cos(cycleTime) * (baseRad * 0.35) - baseRad * 0.1,
      3.5 * this.player.massScale * sizeScale,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = `hsla(${(hueBase + 60) % 360}, 100%, 65%, 0.85)`;
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(
      this.player.x + Math.cos(cycleTime * 1.35) * (baseRad * 0.38),
      this.player.y + Math.sin(cycleTime * 1.35) * (baseRad * 0.38) + baseRad * 0.1,
      2.8 * this.player.massScale * sizeScale,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = `hsla(${(hueBase + 180) % 360}, 100%, 60%, 0.8)`;
    this.ctx.fill();
    
    const nPulse = 1.0 + Math.sin(Date.now() * 0.004) * 0.08;
    const nRad = 9 * this.player.massScale * nPulse * sizeScale;
    
    const nGrad = this.ctx.createRadialGradient(
      this.player.x - 2,
      this.player.y - 2,
      nRad * 0.1,
      this.player.x - 2,
      this.player.y,
      nRad
    );
    
    if (STATE.health < 30) {
      nGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      nGrad.addColorStop(0.4, 'rgba(180, 210, 0, 0.85)');
      nGrad.addColorStop(1, 'rgba(128, 128, 0, 0.0)');
    } else if (STATE.repro > 80) {
      nGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      nGrad.addColorStop(0.4, 'rgba(0, 255, 180, 0.85)');
      nGrad.addColorStop(1, 'rgba(0, 128, 255, 0.0)');
    } else {
      nGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      nGrad.addColorStop(0.35, `hsla(${(hueBase + 120) % 360}, 100%, 65%, 0.95)`);
      nGrad.addColorStop(0.75, `hsla(${(hueBase + 60) % 360}, 100%, 55%, 0.6)`);
      nGrad.addColorStop(1, 'rgba(138, 43, 226, 0.0)');
    }
    
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 2, this.player.y, nRad, 0, Math.PI * 2);
    this.ctx.fillStyle = nGrad;
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 3.5, this.player.y - 1, nRad * 0.35, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
    this.ctx.fill();
    
    if (STATE.isPlaying && !STATE.isTransitioning) {
      const timerPct = Math.max(0, STATE.forkTimer / 3.0);
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, baseRad + 14, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * timerPct));
      this.ctx.strokeStyle = STATE.isThreatWarning ? 'rgba(231, 76, 60, 0.55)' : 'rgba(255, 255, 255, 0.25)';
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    }
  }
}
