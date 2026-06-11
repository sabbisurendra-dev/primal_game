const Phaser = window.Phaser;
import { STATE } from './state.js';
import { audio } from './audio.js';

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
    
    const tx = Math.max(120, Math.min(width * 0.2, 220));
    const ty = height / 2;
    
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
        z: (Math.random() - 0.5) * 150,
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
    
    const tx = Math.max(120, Math.min(width * 0.2, 220));
    const ty = height / 2;
    
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
      
      // Explosion logic
      this.iceShards.forEach(s => {
        s.exploded = true;
        const speed = 7 + Math.random() * 15;
        s.vx = Math.cos(s.angle) * speed;
        s.vy = Math.sin(s.angle) * speed;
        s.rotSpeed = (Math.random() - 0.5) * 0.4;
      });
      
      this.sparks = [];
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 20;
        this.sparks.push({
          x: tx,
          y: ty,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
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
      
      // Update/Draw Shards
      this.iceShards.forEach(s => {
        if (s.alpha <= 0) return;
        
        if (s.exploded) {
          s.x += s.vx * (delta / 16.6);
          s.y += s.vy * (delta / 16.6);
          s.rot += s.rotSpeed * (delta / 16.6);
          s.alpha = Math.max(0, s.alpha - 0.035 * (delta / 16.6));
        }
        
        this.graphics.lineStyle(2.0, 0xffffff, 0.95 * s.alpha);
        this.graphics.fillStyle(0x96e6ff, 0.9 * s.alpha);
        
        this.graphics.beginPath();
        const startX = s.x + s.points[0].x * Math.cos(s.rot) - s.points[0].y * Math.sin(s.rot);
        const startY = s.y + s.points[0].x * Math.sin(s.rot) + s.points[0].y * Math.cos(s.rot);
        this.graphics.moveTo(startX, startY);
        for (let i = 1; i < s.points.length; i++) {
          const px = s.x + s.points[i].x * Math.cos(s.rot) - s.points[i].y * Math.sin(s.rot);
          const py = s.y + s.points[i].x * Math.sin(s.rot) + s.points[i].y * Math.cos(s.rot);
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
        
        const size1 = s.size * (0.3 + s.life * 0.7);
        const size2 = s.size * 2.8 * s.life;
        const color = Phaser.Display.Color.HSLToColor(s.hue / 360, 1.0, 0.62).color;
        const outerColor = Phaser.Display.Color.HSLToColor(s.hue / 360, 1.0, 0.50).color;
        
        this.graphics.fillStyle(color, s.life * 0.95);
        this.graphics.fillCircle(s.x, s.y, size1);
        this.graphics.fillStyle(outerColor, s.life * 0.18);
        this.graphics.fillCircle(s.x, s.y, size2);
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
    }
    
    // 5. Complete transition at 3 seconds
    if (progress >= 1.0) {
      this.isActive = false;
      this.game.events.emit('intro-complete');
    }
  }
}
