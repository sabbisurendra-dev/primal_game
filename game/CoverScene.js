const Phaser = window.Phaser;

class CurrentLine {
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
  
  update(width, height, speedMultiplier, delta) {
    this.x -= this.speed * speedMultiplier * (delta / 16.6);
    if (this.x + this.length < 0) {
      this.reset(width, height);
    }
  }
  
  draw(graphics, colorOverride = null) {
    const alpha = 0.03 + (this.speed * 0.01);
    
    if (colorOverride) {
      graphics.lineStyle(this.thickness, colorOverride.hex, colorOverride.alpha);
    } else {
      graphics.lineStyle(this.thickness, 0xffffff, alpha);
    }
    
    graphics.beginPath();
    graphics.moveTo(this.x, this.y);
    graphics.lineTo(this.x + this.length, this.y);
    graphics.strokePath();
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

export default class CoverScene extends Phaser.Scene {
  constructor() {
    super('CoverScene');
    this.currents = [];
    this.graphics = null;
  }
  
  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    
    this.graphics = this.add.graphics();
    
    // Spawn slow currents
    this.currents = [];
    for (let i = 0; i < 40; i++) {
      this.currents.push(new CurrentLine(width, height));
    }
  }
  
  update(time, delta) {
    this.graphics.clear();
    
    const width = this.scale.width;
    const height = this.scale.height;
    
    // Update and draw slow currents
    this.currents.forEach(c => {
      c.update(width, height, 0.05, delta);
      c.draw(this.graphics, { hex: 0x00c3ff, alpha: 0.16 });
    });
    
    const tx = Math.max(120, Math.min(width * 0.2, 220));
    const ty = height / 2;
    const radius = 78;
    
    // 1. Draw static background frost vignette
    drawGlowCircle(
      this.graphics, tx, ty, width * 0.95,
      { r: 8, g: 25, b: 45, a: 0.1 },
      { r: 20, g: 55, b: 90, a: 0.88 },
      12
    );
    
    // 2. Draw dormant, static frozen soul
    this.graphics.beginPath();
    const numPts = 16;
    for (let i = 0; i < numPts; i++) {
      const angle = (i / numPts) * Math.PI * 2;
      const w = Math.sin(time * 0.0015 + angle * 2) * 0.7;
      const r = radius + w;
      const px = tx + Math.cos(angle) * r;
      const py = ty + Math.sin(angle) * r;
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
    this.graphics.closePath();
    
    // Gradient fill for frozen cell
    drawGlowCircle(
      this.graphics, tx, ty, radius,
      { r: 0, g: 225, b: 255, a: 0.75 },
      { r: 0, g: 45, b: 120, a: 0.0 },
      8
    );
    
    this.graphics.lineStyle(3.0, 0x00f0ff, 0.95);
    this.graphics.strokePath();
    
    // 3. Draw static ice shards surrounding the dormant cell
    const shardCount = 35;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2;
      const baseRadius = 65 + (i % 3 === 0 ? 20 : i % 3 === 1 ? 5 : 28);
      
      const sx = tx + Math.cos(angle) * baseRadius;
      const sy = ty + Math.sin(angle) * baseRadius;
      const rot = angle + Math.PI / 2;
      
      // Calculate rotated triangle points manually
      const p1x = sx + Math.cos(rot - Math.PI/2) * -9;
      const p1y = sy + Math.sin(rot - Math.PI/2) * -9;
      const p2x = sx + Math.cos(rot + 0.5) * 8.6;
      const p2y = sy + Math.sin(rot + 0.5) * 8.6;
      const p3x = sx + Math.cos(rot + Math.PI - 0.5) * 8.6;
      const p3y = sy + Math.sin(rot + Math.PI - 0.5) * 8.6;
      
      this.graphics.beginPath();
      this.graphics.moveTo(p1x, p1y);
      this.graphics.lineTo(p2x, p2y);
      this.graphics.lineTo(p3x, p3y);
      this.graphics.closePath();
      
      this.graphics.fillStyle(0x00b9ff, 0.45);
      this.graphics.fillPath();
      
      this.graphics.lineStyle(1.2, 0xa0f5ff, 0.85);
      this.graphics.strokePath();
    }
    
    // 4. Draw Ice fracture crack lines radiating from the cell
    this.graphics.lineStyle(2.8, 0x00ebff, 0.88);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + 0.25;
      let curDist = radius;
      let curAngle = angle;
      this.graphics.beginPath();
      this.graphics.moveTo(tx + Math.cos(angle) * radius, ty + Math.sin(angle) * radius);
      
      for (let seg = 0; seg < 4; seg++) {
        curDist += 35;
        curAngle += Math.sin(k + seg) * 0.15;
        this.graphics.lineTo(tx + Math.cos(curAngle) * curDist, ty + Math.sin(curAngle) * curDist);
      }
      this.graphics.strokePath();
    }
  }
}
