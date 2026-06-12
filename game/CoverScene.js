const Phaser = window.Phaser;

class CurrentLine {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 10;
    this.y = Math.random() * height;
    this.z = 0.5 + Math.random() * 2.5; // Depth factor (lower is closer/foreground)
    this.length = (50 + Math.random() * 100) / this.z;
    this.speed = (1.5 + Math.random() * 2.0) / this.z;
    this.thickness = 0.5 + 2.0 / this.z;
    this.opacityMultiplier = 1.0 / this.z;
  }
  
  update(width, height, speedMultiplier, delta) {
    this.x -= this.speed * speedMultiplier * (delta / 16.6);
    if (this.x + this.length < -20) {
      this.reset(width, height);
    }
  }
  
  draw(graphics, pointer, width, height, colorOverride = null) {
    // Parallax offset
    const pOffsetX = pointer ? (pointer.x - width / 2) * 0.08 / this.z : 0;
    const pOffsetY = pointer ? (pointer.y - height / 2) * 0.08 / this.z : 0;
    
    const alpha = (0.03 + (this.speed * 0.01)) * this.opacityMultiplier;
    
    if (colorOverride) {
      graphics.lineStyle(this.thickness, colorOverride.hex, colorOverride.alpha * this.opacityMultiplier);
    } else {
      graphics.lineStyle(this.thickness, 0xffffff, alpha);
    }
    
    graphics.beginPath();
    graphics.moveTo(this.x + pOffsetX, this.y + pOffsetY);
    graphics.lineTo(this.x + this.length + pOffsetX, this.y + pOffsetY);
    graphics.strokePath();

    // Bokeh halo for foreground lines
    if (this.z < 0.8) {
      graphics.lineStyle(this.thickness * 2.8, colorOverride ? colorOverride.hex : 0xffffff, alpha * 0.28);
      graphics.beginPath();
      graphics.moveTo(this.x + pOffsetX, this.y + pOffsetY);
      graphics.lineTo(this.x + this.length + pOffsetX, this.y + pOffsetY);
      graphics.strokePath();
    }
  }
}

class MacroStructure {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 250;
    this.y = Math.random() * height;
    this.radius = 180 + Math.random() * 240;
    this.speed = 0.1 + Math.random() * 0.15;
    this.z = 1.6 + Math.random() * 1.8; // Always in background
    this.seed = Math.random() * 100;
    this.opacity = 0.015 + Math.random() * 0.035;
  }
  
  update(width, height, delta) {
    this.x -= this.speed * (delta / 16.6);
    this.y += Math.sin(Date.now() * 0.0006 + this.seed) * 0.12 * (delta / 16.6);
    
    if (this.x + this.radius < -50) {
      this.reset(width, height);
    }
  }
  
  draw(graphics, pointer, width, height) {
    const pOffsetX = pointer ? (pointer.x - width / 2) * 0.04 / this.z : 0;
    const pOffsetY = pointer ? (pointer.y - height / 2) * 0.04 / this.z : 0;
    
    // Draw smooth concentric smoky gradient circles
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = this.radius * (1 - t * 0.55);
      const alpha = this.opacity * t;
      
      // Beautiful deep cyan glow
      graphics.fillStyle(0x006c8a, alpha);
      graphics.fillCircle(this.x + pOffsetX, this.y + pOffsetY, r);
    }
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
    this.macroStructures = [];
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

    // Spawn background organic macro structures
    this.macroStructures = [];
    for (let i = 0; i < 4; i++) {
      this.macroStructures.push(new MacroStructure(width, height));
    }
  }
  
  update(time, delta) {
    this.graphics.clear();
    
    const width = this.scale.width;
    const height = this.scale.height;
    const pointer = this.input.activePointer;
    
    // Update background macro-structures
    this.macroStructures.forEach(m => m.update(width, height, delta));
    
    // Update slow currents
    this.currents.forEach(c => {
      c.update(width, height, 0.05, delta);
    });
    
    const txBase = width <= 768 ? width * 0.3 : 400;
    const tyBase = height / 2;
    const radius = width <= 768 ? 45 : 78;

    // Soul / Frozen core coordinates with medium depth z = 1.0
    const tx = txBase + (pointer ? (pointer.x - width / 2) * 0.08 : 0);
    const ty = tyBase + (pointer ? (pointer.y - height / 2) * 0.08 : 0);
    
    // 1. Draw static background frost vignette (Deepest layer)
    drawGlowCircle(
      this.graphics, txBase, tyBase, width * 0.95,
      { r: 8, g: 25, b: 45, a: 0.1 },
      { r: 20, g: 55, b: 90, a: 0.88 },
      12
    );
    
    // 2. Draw background macro-structures
    this.macroStructures.forEach(m => m.draw(this.graphics, pointer, width, height));

    // 3. Draw deep background currents (z > 1.2)
    this.currents.forEach(c => {
      if (c.z > 1.2) {
        c.draw(this.graphics, pointer, width, height, { hex: 0x00c3ff, alpha: 0.16 });
      }
    });
    
    // 4. Draw dormant, slow-moving frozen cell/organism (z = 1.0 layer)
    this.drawDormantPlayer(tx, ty, 1.0, 0.95, time);
    
    // 5. Draw static ice shards surrounding the dormant cell (with layer-based parallax)
    const shardCount = 35;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2;
      const baseRadius = 65 + (i % 3 === 0 ? 20 : i % 3 === 1 ? 5 : 28);
      const shardZ = 0.85 + (i % 3) * 0.15; // Shards have slight depth variation
      
      const shardOffsetX = pointer ? (pointer.x - width / 2) * 0.08 / shardZ : 0;
      const shardOffsetY = pointer ? (pointer.y - height / 2) * 0.08 / shardZ : 0;
      
      const sx = txBase + Math.cos(angle) * baseRadius + shardOffsetX;
      const sy = tyBase + Math.sin(angle) * baseRadius + shardOffsetY;
      const rot = angle + Math.PI / 2;
      
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
      
      this.graphics.lineStyle(1.2 / shardZ, 0xa0f5ff, 0.85);
      this.graphics.strokePath();
    }
    
    // 6. Draw Ice fracture crack lines radiating from the cell
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

    // 7. Draw mid-ground and fore-ground currents (z <= 1.2)
    this.currents.forEach(c => {
      if (c.z <= 1.2) {
        c.draw(this.graphics, pointer, width, height, { hex: 0x00c3ff, alpha: 0.16 });
      }
    });
  }

  drawDormantPlayer(tx, ty, scale, opacity, time) {
    const baseRad = 78 * scale;
    
    // Draw tail flagella wiggling very slowly (dormant)
    const tailCount = 4;
    for (let tNum = 0; tNum < tailCount; tNum++) {
      this.graphics.beginPath();
      this.graphics.moveTo(tx, ty);
      
      const phaseOffset = tNum * (Math.PI / 2);
      const amp = (4 + tNum * 2.0) * scale;
      const width = (1.5 - tNum * 0.25) * scale;
      
      for (let i = 1; i < 20; i++) {
        // Slow movement: time * 0.003
        const wave = Math.sin(time * 0.003 - i * 0.35 + phaseOffset) * (amp * (1 - i / 20));
        const emergeOffset = (tNum - 1.5) * 4 * (1 - i / 20) * scale;
        this.graphics.lineTo(tx - i * 5 * scale, ty + wave + emergeOffset);
      }
      
      if (tNum === 0) {
        this.graphics.lineStyle(width * 3.5, 0x00d2ff, opacity * 0.12);
        this.graphics.strokePath();
      }
      
      this.graphics.lineStyle(width, 0xa3f2ff, opacity * 0.7);
      this.graphics.strokePath();
    }
    
    // Membrane draw helper with slow wiggles
    const drawMembrane = (mScale, color, alpha) => {
      this.graphics.fillStyle(color, alpha * opacity);
      this.graphics.beginPath();
      
      const numPts = 16;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        const w = Math.sin(time * 0.0008 + angle * 3) * 1.5;
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
        const w = Math.sin(time * 0.0008 + angle * 3) * 1.5;
        const px = tx + (baseRad + w) * Math.cos(angle);
        const py = ty + (baseRad + w) * Math.sin(angle);
        if (i === 0) this.graphics.moveTo(px, py);
        else this.graphics.lineTo(px, py);
      }
      this.graphics.closePath();
      this.graphics.strokePath();
    };
    
    // Frozen blue/white theme
    strokeMembrane(40 * scale, 0x00d2ff, 0.08);
    strokeMembrane(24 * scale, 0x00f0ff, 0.15);
    strokeMembrane(10 * scale, 0xffffff, 0.28);
    
    drawMembrane(1.00, 0x031224, 0.95);
    drawMembrane(0.92, 0x00c3ff, 0.08);
    drawMembrane(0.65, 0x00f0ff, 0.18);
    drawMembrane(0.20, 0xffffff, 0.45);
    drawMembrane(0.08, 0xffffff, 0.75);
    
    strokeMembrane(2.5 * scale, 0x00f0ff, 0.95);
    
    // Encasing frozen ice glow halo (representing the frozen sphere)
    drawGlowCircle(
      this.graphics, tx, ty, baseRad,
      { r: 0, g: 225, b: 255, a: 0.6 },
      { r: 0, g: 45, b: 120, a: 0.0 },
      8
    );
    
    // Specular Shine
    this.graphics.beginPath();
    this.graphics.fillStyle(0xffffff, 0.35 * opacity);
    this.graphics.fillCircle(tx - baseRad * 0.3, ty - baseRad * 0.3, baseRad * 0.16);
    
    // Dormant player cell rendering ends here (nucleus and rotating loops removed)
  }
}
