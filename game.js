/**
 * PRIMAL — Phase 1 Evolution Demo MVP
 * Core Game Engine
 */

// --- 1. DESIGNER CONFIGURATION / TWEAKS ---
const CONFIG = {
  survivalWeight: 1.0,
  healthWeight: 1.0,
  reproWeight: 1.0,
  flowSpeed: 3.5, // Base scrolling speed
  
  // Base changes for choice outcomes (modified by weights)
  outcomes: {
    best: { survival: 5, health: 15, repro: 15, speedMultiplier: 1.5 },
    ok:   { survival: 0, health: 0,  repro: 5,  speedMultiplier: 1.0 },
    worst: { survival: 15, health: -15, repro: -10, speedMultiplier: 0.6 }
  },
  
  // Threat warning settings
  threatInterval: 12000, // ms between threats
  threatDuration: 3000,  // ms warning lasts before fork choice
};

// --- 2. PROCEDURAL WEB AUDIO CONTROLLER ---
class AudioController {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.lowPass = null;
    
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientLFO = null;
    
    this.heartbeatTimer = null;
    this.heartbeatTempo = 1200; // ms between thumps
    this.isPlaying = false;
  }
  
  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Global Low-pass Filter for near-death muffling
    this.lowPass = this.ctx.createBiquadFilter();
    this.lowPass.type = 'lowpass';
    this.lowPass.frequency.value = 2000;
    
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.value = 0.4;
    
    this.lowPass.connect(this.masterVolume);
    this.masterVolume.connect(this.ctx.destination);
    
    this.isPlaying = true;
    this.startAmbient();
    this.startHeartbeat();
  }
  
  startAmbient() {
    try {
      this.ambientOsc1 = this.ctx.createOscillator();
      this.ambientOsc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      this.ambientOsc1.type = 'sine';
      this.ambientOsc1.frequency.value = 55; // A1 Note (Deep bass drone)
      
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.value = 55.4; // Detuned slightly for pulsing texture
      
      gainNode.gain.value = 0.12;
      
      // LFO to slowly sweep frequency for a fluid current effect
      this.ambientLFO = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.ambientLFO.frequency.value = 0.15; // 0.15 Hz
      lfoGain.gain.value = 4; // Sweep +/- 4Hz
      
      this.ambientLFO.connect(lfoGain);
      lfoGain.connect(this.ambientOsc1.frequency);
      
      this.ambientOsc1.connect(gainNode);
      this.ambientOsc2.connect(gainNode);
      gainNode.connect(this.lowPass);
      
      this.ambientOsc1.start();
      this.ambientOsc2.start();
      this.ambientLFO.start();
    } catch (e) {
      console.warn("Failed to start ambient audio drone:", e);
    }
  }
  
  startHeartbeat() {
    const run = () => {
      if (!this.isPlaying) return;
      this.playThump();
      this.heartbeatTimer = setTimeout(run, this.heartbeatTempo);
    };
    run();
  }
  
  playThump() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Heartbeat double thump: lub-dub
    this.triggerThumpNode(now, 58, 0.45);
    this.triggerThumpNode(now + 0.22, 44, 0.35);
  }
  
  triggerThumpNode(time, freq, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    
    osc.connect(gain);
    gain.connect(this.lowPass);
    
    osc.start(time);
    osc.stop(time + 0.35);
  }
  
  setTempo(tempoMs) {
    this.heartbeatTempo = Math.max(250, Math.min(2000, tempoMs));
  }
  
  setMuffle(healthPercent) {
    if (!this.lowPass) return;
    // Low health: cutoff drops from 2000Hz down to 220Hz (suffocating, muffled sound)
    const cutoff = 220 + (healthPercent / 100) * 1780;
    this.lowPass.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.25);
  }
  
  playSelect(type) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterVolume); // bypass lowpass so selection click is always audible
    
    if (type === 'best') {
      // Harmonic clean chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.28);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'worst') {
      // Dull distorted impact
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.35);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Ok: Standard bubble pop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
      
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc.start(now);
      osc.stop(now + 0.15);
    }
  }
  
  playMitosis() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Rising triad swell
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.08 + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + 2.0);
    });
  }
  
  stop() {
    this.isPlaying = false;
    clearTimeout(this.heartbeatTimer);
    try {
      if (this.ambientOsc1) this.ambientOsc1.stop();
      if (this.ambientOsc2) this.ambientOsc2.stop();
      if (this.ambientLFO) this.ambientLFO.stop();
    } catch(e) {}
    this.ctx = null;
  }
}

const audio = new AudioController();

// --- 3. STORYLINE CHRONICLES (Narrative Text Database) ---
const NARRATIVE = {
  chapter1: [
    "You awaken. The broth of the archaean sea is cold, dark, and endless. Choose your current.",
    "A membrane boundary forms. You are isolated, defined. You are 'Self'. The current sweeps you forward.",
    "Your survival instinct drives you. Nutrients float ahead. Absorb the healthy green streams.",
    "Bacterial colonies drift nearby. Avoid their acid waste. Rely on your sensory wiggles.",
    "Warm thermal vents pump heavy sulfur compounds. Swim toward the glow.",
    "Your cellular matrix is assembling genetic guidelines. Endure the toxic currents.",
    "A pulse of oxygen ripples. Adaptation is mandatory. Select the branch with higher energy.",
    "Your nucleus begins to condense, storing ancient instructions. Keep moving.",
    "Stability is reached. Your membrane is taut, healthy, and vibrating. Prepare to evolve.",
    "Chapter complete. The primordial spark has survived. Let us divide."
  ],
  chapter2: [
    "Chapter 2: Adapt and Divide. The ocean floor is crowded. Competition is starting.",
    "Warning: Chemical plumes from sub-sea volcanoes are spreading. Watch the warning signs.",
    "Rival cellular blobs drift past, absorbing the surrounding carbon. Move rapidly.",
    "Anticipation: An acidic current is sweeping in. Choose the safe branch!",
    "Mitosis preparation begins. The DNA replication loops require heavy lipids.",
    "A thermal wave approaches. Seek the cold depth branch to preserve your membrane.",
    "The cost of growth: your mass is expanding, making you less agile. Understand your limits.",
    "Toxic residue detected! Nudge yourself into the clear streams.",
    "Bioluminescent enzymes glow in your nucleus. Use the visual hues to guide your pathway.",
    "Mitosis reaches 90%. One spark is ready to become two.",
    "Division imminent! The membrane pinches. Hold your integrity.",
    "Mitosis success! Two cells split, flowing in unison. Evolved. Intrigue increases."
  ],
  chapter3: [
    "Chapter 3: The Abyssal Deep. The environment becomes unstable and chaotic.",
    "The deep trench forces you to squeeze through narrow thermal fissures.",
    "Pressure increases. The cell walls compress. Maintain your integrity.",
    "Sudden toxic plumes emerge rapidly. Trust your sensory cues.",
    "Multi-cellular coordinates are beginning to mesh. The colony needs stability.",
    "DDA Lifeline: A pure primordial nutrient vein is exposed! Grab the green currents.",
    "Your flagella wiggles in unison. You are no longer just drifting; you are swimming.",
    "The spark of cooperation is lit. Cells stick together. The colony grows.",
    "The path of Darwinian selection is long. A billion years summarized in a single beat.",
    "The circle of life closes. You are the ancestor of the future. Evolve."
  ]
};

// --- 4. GAME ENGINE STATE ---
const STATE = {
  // Stats (Survival Instinct, Health, Reproducibility)
  survival: 100,
  health: 50,
  repro: 10,
  
  // Game Flow
  chapter: 1,
  chapterProgress: 0,
  maxChapterSteps: 10,
  narrativeIndex: 0,
  
  // Speed
  currentSpeed: CONFIG.flowSpeed,
  targetSpeed: CONFIG.flowSpeed,
  
  // DDA & Threats
  isThreatWarning: false,
  threatTimer: null,
  nextThreatTime: Date.now() + 8000,
  hasLifeline: false,
  
  // Mechanics
  isPlaying: false,
  isTransitioning: false,
  forkTimer: 5.0, // seconds until auto-fork selection
  
  // Paths
  paths: [], // 3 paths (Up, Forward, Down)
  selectedPathIndex: 1, // Start middle
  
  // Generation counter for looping
  generation: 1
};

// --- 5. VISUAL RENDERING ENTITIES ---
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
class CurrentLine {
  constructor(width, height) {
    this.reset(width, height, true);
  }
  
  reset(width, height, randomizeX = false) {
    this.x = randomizeX ? Math.random() * width : width + 10;
    this.y = Math.random() * height;
    this.length = 50 + Math.random() * 100;
    this.speed = (1.5 + Math.random() * 2.0);
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
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Organism Spring/Physics Membrane node
class MembranePoint {
  constructor(angle, baseRadius) {
    this.angle = angle;
    this.baseRadius = baseRadius;
    this.offset = 0;
    this.velocity = 0;
    this.targetOffset = 0;
  }
  
  update(wobbleSpeed, massScale) {
    // Verlet/Spring system: Accelerate towards target offset
    const k = 0.08; // Spring constant
    const damping = 0.88; // Damping
    
    // Amoeba-like morphing: combine a slow global rotation wave and faster organic ripples
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

// --- 6. CANVAS GAME CONTROLLER ---
class GameCanvasController {
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
      radius: 26,
      targetRadius: 26,
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
  
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    this.player.x = Math.max(120, Math.min(this.width * 0.2, 220));
    
    // Recalculate paths to fit resizing screen
    if (STATE.isPlaying) {
      this.generatePaths();
    }
  }
  
  // Calculate three branching paths ahead of player
  generatePaths() {
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = this.width - 120;
    
    // Determine path qualities
    // Shuffle quality mapping
    const qualities = ['best', 'ok', 'worst'];
    
    // DDA Lifeline mode: if health is low, force a lifeline (which makes path best and glow gold)
    if (STATE.hasLifeline) {
      qualities[0] = 'best'; // ensure we have a recovery path
    }
    
    // Shuffle the array randomly to avoid predictability
    for (let i = qualities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qualities[i], qualities[j]] = [qualities[j], qualities[i]];
    }
    
    // Path End Y coordinates
    const branchDelta = Math.min(220, this.height * 0.28);
    const endYPositions = [
      startY - branchDelta, // Up branch
      startY,               // Forward branch
      startY + branchDelta  // Down branch
    ];
    
    STATE.paths = [];
    
    for (let i = 0; i < 3; i++) {
      const endY = endYPositions[i];
      
      // Control points for cubic Bezier
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
        
        // Nutrients moving along path
        particles: this.generatePathNutrients(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY, qualities[i])
      });
    }
  }
  
  generatePathNutrients(x0, y0, cx1, cy1, cx2, cy2, x3, y3, quality) {
    const list = [];
    const count = 6;
    
    // Path colors: best=green, worst=red, ok=neutral white
    let color = 'rgba(240, 240, 240, ALPHA)'; // ok
    if (quality === 'best') color = 'rgba(46, 204, 113, ALPHA)'; // green
    if (quality === 'worst') color = 'rgba(231, 76, 60, ALPHA)'; // red
    if (STATE.hasLifeline && quality === 'best') color = 'rgba(46, 204, 113, ALPHA)'; // bold green
    
    for (let i = 0; i < count; i++) {
      list.push({
        t: i / count, // position offset along Bezier [0-1]
        size: quality === 'best' ? 4 + Math.random() * 3 : 3 + Math.random() * 2,
        color: color,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
    return list;
  }
  
  // Interpolate cubic bezier position
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
    // Set target X and Y coordinates (organism stays on the left)
    const targetX = Math.max(120, Math.min(this.width * 0.2, 220));
    const targetY = STATE.isPlaying ? this.player.targetY : this.height / 2;
    
    // Smoothly interpolate player position
    this.player.x += (targetX - this.player.x) * 0.08;
    this.player.y += (targetY - this.player.y) * 0.08;
    
    // Scale body size depending on reproduction/growth status
    this.player.massScale = 0.95 + (STATE.repro / 100) * 0.35;
    
    // Update membrane spring points
    this.membranePoints.forEach(pt => pt.update(this.player.wobbleSpeed, this.player.massScale));
    
    // Keep past history for cilia trail
    this.player.tail.unshift({ x: this.player.x, y: this.player.y });
    if (this.player.tail.length > 25) {
      this.player.tail.pop();
    }
    
    // Update background currents
    this.currents.forEach(c => c.update(this.width, this.height, STATE.currentSpeed * 0.8));
    
    // Update random float particles
    this.particles.forEach((p, idx) => {
      p.update();
      if (p.life <= 0) {
        this.particles.splice(idx, 1);
      }
    });
    
    // Update path nutrient particles
    if (STATE.paths && STATE.paths.length > 0) {
      STATE.paths.forEach(p => {
        p.particles.forEach(nut => {
          // Nutrients flow backward along curves
          nut.t -= 0.003 * STATE.currentSpeed;
          if (nut.t < 0) {
            nut.t = 1.0;
          }
        });
      });
    }
    
    // Shift speeds
    STATE.currentSpeed += (STATE.targetSpeed - STATE.currentSpeed) * 0.08;
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 1. Draw Background Currents
    this.currents.forEach(c => c.draw(this.ctx));
    
    // 2. Draw Branching Paths
    if (STATE.isPlaying && STATE.paths && STATE.paths.length > 0) {
      STATE.paths.forEach(p => {
        // Draw the main path line (subtle dotted outline in Sin City theme)
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, p.startY);
        this.ctx.bezierCurveTo(p.cp1X, p.cp1Y, p.cp2X, p.cp2Y, p.endX, p.endY);
        
        let pathStroke = 'rgba(255, 255, 255, 0.08)';
        
        // Visual anticipation cues
        if (STATE.isThreatWarning) {
          if (p.quality === 'worst') {
            pathStroke = 'rgba(231, 76, 60, 0.45)'; // Glow red
          } else if (p.quality === 'best') {
            pathStroke = 'rgba(46, 204, 113, 0.35)'; // Glow green (safe escape)
          }
        } else if (STATE.hasLifeline && p.quality === 'best') {
          // Glowing green lifeline path
          pathStroke = `rgba(46, 204, 113, ${0.3 + Math.sin(Date.now() * 0.01) * 0.15})`;
        }
        
        this.ctx.strokeStyle = pathStroke;
        this.ctx.lineWidth = STATE.hasLifeline && p.quality === 'best' ? 4 : 2.5;
        this.ctx.setLineDash([8, 12]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw path destination branch indicator
        this.ctx.beginPath();
        this.ctx.arc(p.endX, p.endY, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = p.quality === 'worst' && STATE.isThreatWarning ? '#e74c3c' : 'rgba(255, 255, 255, 0.15)';
        this.ctx.fill();
        
        // Draw flowing nutrient particles along the path
        p.particles.forEach(nut => {
          const pt = this.getBezierPoint(p, nut.t);
          const pulse = Math.sin(Date.now() * 0.005 + nut.pulseOffset) * 2;
          
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, nut.size + pulse, 0, Math.PI * 2);
          
          // Modify particle opacity based on location along path (fades in near fork, out near player)
          const fadeAlpha = Math.min(1.0, nut.t * 3) * Math.min(1.0, (1 - nut.t) * 3);
          
          let colorString = nut.color;
          // Override colors on threat warning to highlight escape vs damage
          if (STATE.isThreatWarning) {
            if (p.quality === 'worst') {
              colorString = 'rgba(231, 76, 60, ALPHA)'; // Red
            } else if (p.quality === 'best') {
              colorString = 'rgba(46, 204, 113, ALPHA)'; // Green
            } else {
              colorString = 'rgba(100, 100, 100, ALPHA)'; // Greyed out
            }
          }
          
          this.ctx.fillStyle = colorString.replace('ALPHA', fadeAlpha.toFixed(2));
          this.ctx.fill();
          
          // Add extra outer radial glow for the best path to aid readability
          if (p.quality === 'best' || (STATE.hasLifeline && p.quality === 'best')) {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, (nut.size + pulse) * 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(46, 204, 113, ${fadeAlpha * 0.15})`;
            this.ctx.fill();
          }
        });
      });
    }
    
    // 3. Draw Splashed particles
    this.particles.forEach(p => p.draw(this.ctx));
    
    // Set scaling factor for start screen (5x scale) vs gameplay (1x scale)
    const sizeScale = STATE.isPlaying ? 1.0 : 5.0;

    // Calculate dynamic base color hue shifting over time (bio-luminescent rainbow)
    const hueBase = (Date.now() * 0.015) % 360;

    // 4. Draw Organism Flagella (Cilia Tail)
    if (this.player.tail.length > 5) {
      // Primary flagella tail gradient shifting with hueBase
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
      
      // Secondary minor flagella gradient
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
    
    // 5. Draw Organism Membrane (Spring-based fluid polygon)
    const baseRad = this.player.radius * this.player.massScale * sizeScale;
    
    // Outer Membrane path builder
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
    
    // Layered Dynamic Color Neon Outlines
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${hueBase}, 100%, 50%, 0.12)`;
    this.ctx.lineWidth = 32 * sizeScale;
    this.ctx.stroke();
    
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${(hueBase + 120) % 360}, 100%, 50%, 0.22)`;
    this.ctx.lineWidth = 18 * sizeScale;
    this.ctx.stroke();
    
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${(hueBase + 240) % 360}, 100%, 60%, 0.58)`;
    this.ctx.lineWidth = 7 * sizeScale;
    this.ctx.stroke();
    
    // Volumetric 3D Color-Shifting Gradient Filling
    const gradFill = this.ctx.createRadialGradient(
      this.player.x - baseRad * 0.22,
      this.player.y - baseRad * 0.22,
      baseRad * 0.05,
      this.player.x,
      this.player.y,
      baseRad * 1.15
    );
    gradFill.addColorStop(0, 'rgba(255, 255, 255, 0.98)');                         // High gloss white reflection
    gradFill.addColorStop(0.25, `hsla(${(hueBase + 40) % 360}, 100%, 75%, 0.85)`);  // Bright highlight fluid color
    gradFill.addColorStop(0.65, `hsla(${(hueBase + 180) % 360}, 100%, 50%, 0.65)`); // Vivid complementary mid-tone
    gradFill.addColorStop(0.9, `hsla(${(hueBase + 280) % 360}, 100%, 40%, 0.38)`); // Deep rim shading
    gradFill.addColorStop(1.0, 'rgba(5, 5, 20, 0.94)');                             // Volumetric backing shadow
    
    buildMembranePath();
    this.ctx.fillStyle = gradFill;
    this.ctx.fill();
    
    // Sharp reflective outer membrane boundary
    buildMembranePath();
    this.ctx.strokeStyle = `hsla(${(hueBase + 120) % 360}, 100%, 85%, 0.95)`;
    this.ctx.lineWidth = 2.5 * sizeScale;
    this.ctx.stroke();
    
    // Gloss Specularity Reflection (top-left surface shine)
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
    
    // Tiny shifting organelles inside the cytoplasm
    const cycleTime = Date.now() * 0.002;
    
    // Organelle 1 (shifting hue helper)
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
    
    // Organelle 2 (shifting hue helper 2)
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
    
    // 6. Draw Nucleus (Spark of Life)
    const nPulse = 1.0 + Math.sin(Date.now() * 0.004) * 0.08;
    const nRad = 9 * this.player.massScale * nPulse * sizeScale;
    
    // Radial gradient for internal glow spark
    const nGrad = this.ctx.createRadialGradient(
      this.player.x - 2,
      this.player.y - 2,
      nRad * 0.1,
      this.player.x - 2,
      this.player.y,
      nRad
    );
    
    if (STATE.health < 30) {
      // Sickly yellow-green decay spark
      nGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      nGrad.addColorStop(0.4, 'rgba(180, 210, 0, 0.85)');
      nGrad.addColorStop(1, 'rgba(128, 128, 0, 0.0)');
    } else if (STATE.repro > 80) {
      // Brilliant neon division cyan spark
      nGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      nGrad.addColorStop(0.4, 'rgba(0, 255, 180, 0.85)');
      nGrad.addColorStop(1, 'rgba(0, 128, 255, 0.0)');
    } else {
      // Fiery gold/rose life spark shifting in color
      nGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      nGrad.addColorStop(0.35, `hsla(${(hueBase + 120) % 360}, 100%, 65%, 0.9)`);
      nGrad.addColorStop(0.75, `hsla(${(hueBase + 60) % 360}, 100%, 55%, 0.6)`);
      nGrad.addColorStop(1, 'rgba(138, 43, 226, 0.0)');
    }
    
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 2, this.player.y, nRad, 0, Math.PI * 2);
    this.ctx.fillStyle = nGrad;
    this.ctx.fill();
    
    // Inner nucleolus core
    this.ctx.beginPath();
    this.ctx.arc(this.player.x - 3.5, this.player.y - 1, nRad * 0.35, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
    this.ctx.fill();
    
    // 7. Draw Visual Timer Circle around Player
    if (STATE.isPlaying && !STATE.isTransitioning) {
      const timerPct = Math.max(0, STATE.forkTimer / 5.0);
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, baseRad + 14, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * timerPct));
      this.ctx.strokeStyle = STATE.isThreatWarning ? 'rgba(231, 76, 60, 0.55)' : 'rgba(255, 255, 255, 0.25)';
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    }
  }
}

let renderer = null;

// --- 7. GAME STATE AND METRICS LOGIC ---
const STATE_CONTROLLER = {
  
  startGame() {
    audio.init();
    STATE.isPlaying = true;
    STATE.chapter = 1;
    STATE.chapterProgress = 0;
    STATE.narrativeIndex = 0;
    
    STATE.survival = 100;
    STATE.health = 50;
    STATE.repro = 10;
    
    STATE.currentSpeed = CONFIG.flowSpeed;
    STATE.targetSpeed = CONFIG.flowSpeed;
    
    this.updateHUD();
    renderer.generatePaths();
    
    document.getElementById('modal-start').classList.add('hidden');
    document.getElementById('ui-layer').classList.remove('hidden');
    
    this.setNarrative(NARRATIVE.chapter1[0]);
    this.triggerThreatLoop();
    
    // Start countdown timer clock
    this.resetForkTimer();
  },
  
  resetForkTimer() {
    STATE.forkTimer = 5.0;
  },
  
  triggerThreatLoop() {
    clearTimeout(STATE.threatTimer);
    
    const scheduleNextThreat = () => {
      if (!STATE.isPlaying) return;
      
      const interval = CONFIG.threatInterval + (Math.random() * 4000 - 2000); // randomize +/- 2s
      
      STATE.threatTimer = setTimeout(() => {
        if (!STATE.isPlaying) return;
        this.activateThreatWarning();
      }, interval);
    };
    
    scheduleNextThreat();
  },
  
  activateThreatWarning() {
    STATE.isThreatWarning = true;
    document.getElementById('threat-indicator').classList.remove('hidden');
    
    // Heartbeat races
    audio.setTempo(330); // Fast heartbeat (180bpm equivalent)
    
    // Re-generate paths immediately to inject threat details visually
    renderer.generatePaths();
    
    // Warning resets after the choice is resolved
  },
  
  deactivateThreatWarning() {
    STATE.isThreatWarning = false;
    document.getElementById('threat-indicator').classList.add('hidden');
    audio.setTempo(1200); // Standard resting tempo
  },
  
  // Choice execution handler
  choosePath(pathIndex) {
    if (STATE.isTransitioning || !STATE.isPlaying) return;
    STATE.isTransitioning = true;
    
    const chosenPath = STATE.paths[pathIndex];
    if (!chosenPath) return;
    
    // Play audio feedback
    audio.playSelect(chosenPath.quality);
    
    // Animate cell moving onto selected branch coordinate
    this.animateTransition(chosenPath);
  },
  
  animateTransition(path) {
    // Zoom/speed boost animation
    const outcomeSpeed = CONFIG.flowSpeed * CONFIG.outcomes[path.quality].speedMultiplier;
    STATE.targetSpeed = outcomeSpeed * 2.2; // Quick boost
    
    // Spawn gorgeous visual splash particles at player Y
    renderer.spawnChoiceSplash(renderer.player.x, renderer.player.y, path.quality);
    
    // Update stats based on choice quality
    this.applyOutcome(path.quality);
    
    // Slide player target Y
    renderer.player.targetY = path.endY;
    
    setTimeout(() => {
      // Re-settle speed
      STATE.targetSpeed = outcomeSpeed;
      renderer.player.y = path.endY;
      renderer.player.targetY = path.endY;
      
      // Resolve path change and narrative progression
      this.resolveStep();
      
      STATE.isTransitioning = false;
      this.resetForkTimer();
    }, 450); // duration of slide forward
  },
  
  applyOutcome(quality) {
    const changes = CONFIG.outcomes[quality];
    
    // Apply designer weights
    const ds = changes.survival * CONFIG.survivalWeight;
    const dh = changes.health * CONFIG.healthWeight;
    const dr = changes.repro * CONFIG.reproWeight;
    
    STATE.survival = Math.max(0, Math.min(100, STATE.survival + ds));
    STATE.health = Math.max(5, Math.min(100, STATE.health + dh)); // clip health at 5% (no phase 1 death)
    STATE.repro = Math.max(0, Math.min(100, STATE.repro + dr));
    
    this.updateHUD();
    this.checkDDAEffects();
  },
  
  checkDDAEffects() {
    // Dynamic Difficulty Adjustment logic
    // Low health: vignette compresses, sound muffles
    const isCritical = STATE.health <= 25;
    
    const vigScale = isCritical ? '45%' : '100%';
    const vigOpacity = isCritical ? '0.90' : '0.15';
    // Vignette color becomes dark red if critical to simulate suffocating alarm
    const vigColor = isCritical ? '35, 0, 0' : '0, 0, 0';
    
    document.documentElement.style.setProperty('--vignette-scale', vigScale);
    document.documentElement.style.setProperty('--vignette-opacity', vigOpacity);
    document.documentElement.style.setProperty('--vignette-color', vigColor);
    
    // Dynamic audio filter muffling
    audio.setMuffle(STATE.health);
    
    // Spawn lifeline next turn if critical
    if (isCritical) {
      STATE.hasLifeline = true;
      // Nudge towards survival
      CONFIG.outcomes.best.health = 35; // boost lifeline recovery
    } else {
      STATE.hasLifeline = false;
      CONFIG.outcomes.best.health = 15; // restore default
    }
  },
  
  resolveStep() {
    this.deactivateThreatWarning();
    
    STATE.chapterProgress++;
    
    // Update Chapter Header Progress Bar
    const progressPct = (STATE.chapterProgress / STATE.maxChapterSteps) * 100;
    document.getElementById('progress-bar').style.width = `${progressPct}%`;
    
    // Shift Narrative database
    STATE.narrativeIndex++;
    let currentChapterDeck = NARRATIVE.chapter1;
    if (STATE.chapter === 2) currentChapterDeck = NARRATIVE.chapter2;
    if (STATE.chapter === 3) currentChapterDeck = NARRATIVE.chapter3;
    
    // Retrieve narrative text or loop if chapter ends
    if (STATE.chapterProgress >= STATE.maxChapterSteps) {
      this.triggerChapterComplete();
    } else {
      const textIndex = STATE.narrativeIndex % currentChapterDeck.length;
      this.setNarrative(currentChapterDeck[textIndex]);
      
      // Re-generate paths starting at player Y
      renderer.generatePaths();
    }
  },
  
  setNarrative(text) {
    const el = document.getElementById('narrative-text');
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = 1;
    }, 200);
  },
  
  updateHUD() {
    document.getElementById('stat-survival-val').textContent = `${Math.round(STATE.survival)}%`;
    document.getElementById('bar-survival').style.width = `${STATE.survival}%`;
    
    document.getElementById('stat-health-val').textContent = `${Math.round(STATE.health)}%`;
    document.getElementById('bar-health').style.width = `${STATE.health}%`;
    
    document.getElementById('stat-repro-val').textContent = `${Math.round(STATE.repro)}%`;
    document.getElementById('bar-repro').style.width = `${STATE.repro}%`;
  },
  
  triggerChapterComplete() {
    STATE.isPlaying = false;
    clearTimeout(STATE.threatTimer);
    
    const titleEl = document.getElementById('chapter-title');
    const summaryEl = document.getElementById('chapter-summary');
    const btnCont = document.getElementById('btn-chapter-continue');
    
    if (STATE.chapter === 1) {
      // End of Chapter 1 (2-minute module completed)
      audio.playMitosis();
      titleEl.textContent = "CHAPTER 1 COMPLETE: THE SPARK";
      summaryEl.innerHTML = `
        <strong>Cellular Status Summary:</strong><br>
        • Generation: Gen-${STATE.generation}<br>
        • Final Health: ${Math.round(STATE.health)}%<br>
        • Survival Instinct: ${Math.round(STATE.survival)}%<br>
        • Reproductive Capacity: ${Math.round(STATE.repro)}%<br><br>
        You have successfully survived the Archaean Sea. If you choose to proceed, the narrative will develop further into Division and Scale.
      `;
      btnCont.textContent = "PROCEED TO CHAPTER 2 (3 mins)";
      document.getElementById('modal-chapter').classList.remove('hidden');
    } else if (STATE.chapter === 2) {
      // End of Chapter 2 (3-minute module completed)
      audio.playMitosis();
      titleEl.textContent = "CHAPTER 2 COMPLETE: MULTIPLY";
      summaryEl.innerHTML = `
        <strong>Mitosis Colony Log:</strong><br>
        • Generation: Gen-${STATE.generation + 1}<br>
        • Division Rate: Stable<br>
        • Biomass: Expanding<br><br>
        The primordial broth is divided. The multicellular spark is lit. Prepare to explore the unstable Abyssal Deep.
      `;
      btnCont.textContent = "EXPLORE ABYSSAL DEEP (20 mins demo)";
      document.getElementById('modal-chapter').classList.remove('hidden');
    } else {
      // End of Chapter 3 (Abyssal Deep loop ending)
      this.triggerGameEnd();
    }
  },
  
  proceedToNextChapter() {
    document.getElementById('modal-chapter').classList.add('hidden');
    
    STATE.chapter++;
    STATE.chapterProgress = 0;
    
    // Set chapter limits
    if (STATE.chapter === 2) {
      STATE.maxChapterSteps = 12; // 12 choices
      document.getElementById('current-chapter-name').textContent = "ADAPT AND DIVIDE";
      this.setNarrative(NARRATIVE.chapter2[0]);
    } else if (STATE.chapter === 3) {
      STATE.maxChapterSteps = 10;
      document.getElementById('current-chapter-name').textContent = "THE ABYSSAL DEEP";
      this.setNarrative(NARRATIVE.chapter3[0]);
    }
    
    STATE.isPlaying = true;
    renderer.generatePaths();
    this.resetForkTimer();
    this.triggerThreatLoop();
  },
  
  triggerGameEnd() {
    audio.playMitosis();
    document.getElementById('ui-layer').classList.add('hidden');
    document.getElementById('modal-end').classList.remove('hidden');
  },
  
  restartCycle() {
    STATE.generation++;
    document.getElementById('modal-end').classList.add('hidden');
    this.startGame();
  }
};

// --- 8. SYSTEM INITIALIZATION & LOOPS ---
function init() {
  renderer = new GameCanvasController();
  
  // Game Loop
  function loop() {
    if (STATE.isPlaying) {
      // Tick fork timer countdown down
      if (!STATE.isTransitioning) {
        STATE.forkTimer -= 1 / 60; // 60 fps step
        
        // Auto-select middle path if timer hits 0 to maintain flow
        if (STATE.forkTimer <= 0) {
          // If threat warning is active and player doesn't select, choose best path as DDA lifeline safety
          const fallbackPathIndex = STATE.isThreatWarning ? 
            STATE.paths.findIndex(p => p.quality === 'best') : 1;
            
          STATE_CONTROLLER.choosePath(fallbackPathIndex !== -1 ? fallbackPathIndex : 1);
        }
      }
    }
    
    // Always update renderer (including membrane wiggles and currents) even when paused
    renderer.update();
    
    // Always render currents and particles even when paused for high-res fluid atmosphere
    renderer.draw();
    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
  
  // Set up designer tweaker HUD variables
  setupDesignerTweaker();
  
  // Bind input listeners
  bindInputEvents();
  
  // Urgent 3-second countdown hook
  setupUrgentStartHook();
}

function bindInputEvents() {
  // Choice button handlers
  document.getElementById('btn-up').addEventListener('click', () => STATE_CONTROLLER.choosePath(0));
  document.getElementById('btn-forward').addEventListener('click', () => STATE_CONTROLLER.choosePath(1));
  document.getElementById('btn-down').addEventListener('click', () => STATE_CONTROLLER.choosePath(2));
  
  // Start / Next / Loop Buttons
  document.getElementById('btn-start').addEventListener('click', () => STATE_CONTROLLER.startGame());
  document.getElementById('btn-chapter-continue').addEventListener('click', () => STATE_CONTROLLER.proceedToNextChapter());
  document.getElementById('btn-loop-restart').addEventListener('click', () => STATE_CONTROLLER.restartCycle());
  
  // Keyboard shortcut handlers
  window.addEventListener('keydown', (e) => {
    if (!STATE.isPlaying) {
      if (e.code === 'Space' && document.getElementById('modal-start').style.display !== 'none') {
        STATE_CONTROLLER.startGame();
      }
      return;
    }
    
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      STATE_CONTROLLER.choosePath(0);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space') {
      STATE_CONTROLLER.choosePath(1);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      STATE_CONTROLLER.choosePath(2);
    } else if (e.key === '/') {
      // Toggle designer tweaker panel
      document.getElementById('dev-tweaks').classList.toggle('hidden');
    } else if (e.code === 'Escape') {
      document.getElementById('dev-tweaks').classList.add('hidden');
    }
  });
  
  // Mobile canvas tap to choose
  renderer.canvas.addEventListener('touchstart', (e) => {
    if (!STATE.isPlaying || STATE.isTransitioning) return;
    const touchY = e.touches[0].clientY;
    
    // Split screen vertically into 3 zones
    const zoneHeight = window.innerHeight / 3;
    if (touchY < zoneHeight) {
      STATE_CONTROLLER.choosePath(0); // Up
    } else if (touchY > zoneHeight * 2) {
      STATE_CONTROLLER.choosePath(2); // Down
    } else {
      STATE_CONTROLLER.choosePath(1); // Forward
    }
  }, { passive: true });
}

function setupDesignerTweaker() {
  const tSurv = document.getElementById('tweak-survival');
  const tHlth = document.getElementById('tweak-health');
  const tRep = document.getElementById('tweak-repro');
  const tSpd = document.getElementById('tweak-speed');
  
  const tSurvLbl = document.getElementById('tweak-survival-lbl');
  const tHlthLbl = document.getElementById('tweak-health-lbl');
  const tRepLbl = document.getElementById('tweak-repro-lbl');
  const tSpdLbl = document.getElementById('tweak-speed-lbl');
  
  tSurv.addEventListener('input', (e) => {
    CONFIG.survivalWeight = parseFloat(e.target.value);
    tSurvLbl.textContent = CONFIG.survivalWeight.toFixed(1);
  });
  
  tHlth.addEventListener('input', (e) => {
    CONFIG.healthWeight = parseFloat(e.target.value);
    tHlthLbl.textContent = CONFIG.healthWeight.toFixed(1);
  });
  
  tRep.addEventListener('input', (e) => {
    CONFIG.reproWeight = parseFloat(e.target.value);
    tRepLbl.textContent = CONFIG.reproWeight.toFixed(1);
  });
  
  tSpd.addEventListener('input', (e) => {
    CONFIG.flowSpeed = parseFloat(e.target.value);
    tSpdLbl.textContent = CONFIG.flowSpeed.toFixed(1);
    STATE.targetSpeed = CONFIG.flowSpeed;
  });
  
  document.getElementById('btn-close-tweaks').addEventListener('click', () => {
    document.getElementById('dev-tweaks').classList.add('hidden');
  });
}

function setupUrgentStartHook() {
  const cta = document.querySelector('.modal-cta-main');
  cta.textContent = "READY. CLICK OR PRESS SPACEBAR TO START.";
}

// Window load trigger
window.addEventListener('load', init);
