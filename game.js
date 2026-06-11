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
  }
  
  startAmbientAndHeartbeat() {
    this.startAmbient();
    this.startHeartbeat();
  }
  
  playIntroSwell() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Sweep oscillator from 70Hz to 1100Hz over 2.8 seconds (spacey cosmic fusion)
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 2.8);
    
    // Lowpass filter sweep to make it sound spacey and vibrant
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 2.8);
    
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.24, now + 2.4);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 3.0);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination); // bypass global master/lowpass to avoid overlap
    
    osc.start(now);
    osc.stop(now + 3.0);
  }
  
  playAwakeningBoom() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Sub-bass impact boom (frozen shell shattering)
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 1.0);
    
    gainNode.gain.setValueAtTime(0.45, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.05);
    
    // Play a high-pitched crystalline shatter chime
    const oscChime = this.ctx.createOscillator();
    const gainChime = this.ctx.createGain();
    oscChime.type = 'triangle';
    oscChime.frequency.setValueAtTime(1400, now);
    oscChime.frequency.exponentialRampToValueAtTime(650, now + 0.65);
    
    gainChime.gain.setValueAtTime(0.18, now);
    gainChime.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    
    oscChime.connect(gainChime);
    gainChime.connect(this.ctx.destination);
    oscChime.start(now);
    oscChime.stop(now + 0.7);
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
  isCoverScreen: true, // Dormant frozen cover screen state
  isPlaying: false,
  isIntro: false,
  introStartTime: 0,
  hasTriggeredBoom: false,
  isTransitioning: false,
  forkTimer: 3.0, // seconds until auto-fork selection
  
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
    const colors = [0, 60, 120, 180, 240, 300]; // Rainbow hues (vibrant big bang theme)
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
      const radius = 65 + Math.random() * 20; // surrounding the forming cell membrane
      
      // Sharp ice polygon shapes
      const points = [];
      const numPoints = 3 + Math.floor(Math.random() * 2); // 3 or 4 vertices
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
    
    // Shatter ice shards
    if (this.awakeningIceShards) {
      this.awakeningIceShards.forEach(s => {
        s.exploded = true;
        const speed = 7 + Math.random() * 15;
        s.vx = Math.cos(s.angle) * speed;
        s.vy = Math.sin(s.angle) * speed;
        s.rotSpeed = (Math.random() - 0.5) * 0.4;
      });
    }
    
    // Blast 150 fiery, high-energy vitality sparks outwards (survival instinct)
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
        hue: 12 + Math.random() * 38, // gold / orange / fiery crimson range
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
      const spikes = 5 + Math.floor(Math.random() * 4); // 5 to 8 protein lobes
      const spikeHeights = Array.from({length: spikes}, () => 0.35 + Math.random() * 0.65);
      
      list.push({
        t: i / count, // position offset along Bezier [0-1]
        size: quality === 'best' ? 6 + Math.random() * 3 : 5 + Math.random() * 2, // slightly larger for protein shapes
        color: color,
        pulseOffset: Math.random() * Math.PI * 2,
        spikes: spikes,
        spikeHeights: spikeHeights,
        rotSpeed: (0.015 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1)
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
          // 3D rotation around Y and Z axes
          const cosAngle = Math.cos(p.speed);
          const sinAngle = Math.sin(p.speed);
          
          const rx = p.x * cosAngle - p.z * sinAngle;
          const rz = p.x * sinAngle + p.z * cosAngle;
          p.x = rx;
          p.z = rz;
          
          // Vortex physics: Burst -> Condensation -> Awakening Shockwave
          let radiusScale = 1.0;
          if (progress < 0.18) {
            radiusScale = 0.5 + progress * 8.5; // Rapid outward burst
          } else if (progress < 0.66) {
            // Compress particles towards the forming cell location on the left
            const compressProgress = (progress - 0.18) / (0.66 - 0.18);
            radiusScale = Math.max(0.01, 2.0 * (1.0 - compressProgress));
          } else {
            // Burst outwards again (Awakening boom!)
            const awakeProgress = (progress - 0.66) / 0.34;
            radiusScale = 0.01 + Math.pow(awakeProgress, 1.8) * 18.0;
          }
          
          // Interpolate center coordinates from center to left
          const vx = cx + (tx - cx) * progress;
          const vy = cy + (ty - cy) * progress;
          
          p.screenX = vx + p.x * radiusScale;
          p.screenY = vy + p.y * radiusScale;
        });
      }
      
      // Update ice shards (crust around the frozen soul)
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
      
      // Update fiery vitality sparks
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
      
      return; // Skip normal gameplay updates during intro
    }

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
          // Nutrients flow backward along curves (slowed down by an additional 50%)
          nut.t -= 0.00075 * STATE.currentSpeed;
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
    
    if (STATE.isCoverScreen) {
      // Draw background currents in a frozen, brighter and more colorful blue shade
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
      
      // Massive frozen ice crust vignette overlaying the entire screen (colorful abyssal glacier)
      const frostGrad = this.ctx.createRadialGradient(tx, ty, this.width * 0.05, tx, ty, this.width * 0.95);
      frostGrad.addColorStop(0, 'rgba(8, 25, 45, 0.25)');
      frostGrad.addColorStop(0.5, 'rgba(12, 40, 70, 0.65)');
      frostGrad.addColorStop(1, 'rgba(20, 55, 90, 0.92)');
      this.ctx.fillStyle = frostGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.save();
      this.ctx.translate(tx, ty);
      
      // Add glowing shadow for ice elements
      this.ctx.shadowColor = 'rgba(0, 230, 255, 0.7)';
      this.ctx.shadowBlur = 12;
      
      // Draw dormant, static frozen soul
      this.ctx.beginPath();
      const numPts = 16;
      const radius = 78;
      for (let i = 0; i < numPts; i++) {
        const angle = (i / numPts) * Math.PI * 2;
        // Tiny dormant shiver
        const w = Math.sin(Date.now() * 0.0015 + angle * 2) * 0.7;
        const r = radius + w;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      
      // Frosted bright-blue cell body
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
      
      // Draw static ice shards surrounding the dormant cell
      const shardCount = 35;
      for (let i = 0; i < shardCount; i++) {
        const angle = (i / shardCount) * Math.PI * 2;
        const baseRadius = 65 + (i % 3 === 0 ? 20 : i % 3 === 1 ? 5 : 28);
        
        this.ctx.save();
        this.ctx.translate(Math.cos(angle) * baseRadius, Math.sin(angle) * baseRadius);
        this.ctx.rotate(angle + Math.PI / 2);
        
        this.ctx.beginPath();
        // Sharp triangular shard
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
      
      // Ice fracture crack lines radiating from the cell (prominent and flashy)
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
      return; // Skip normal drawing when on cover screen
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
      
      // Heartbeat pulse scaling and extra shake in the final 1.0s (survival theme)
      if (progress >= 0.66) {
        const awakeProgress = (progress - 0.66) / 0.34;
        
        // Double heartbeat formula: thump-thump
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
      
      // Apply screen shake
      this.ctx.translate(shakeX, shakeY);
      
      // 1. Draw vignette (cold blue initially, then rapid heat blood-red surge at 2.0s)
      if (progress < 0.66) {
        // Subtle dark vignette
        const darkGrad = this.ctx.createRadialGradient(tx, ty, this.width * 0.3, tx, ty, this.width * 0.9);
        darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
        this.ctx.fillStyle = darkGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);
      } else {
        // Violent, pulsating crimson/orange survival vignette
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
      
      // 2. Draw swirling colorful-to-B&W vortex particles
      if (this.introParticles) {
        this.introParticles.forEach(p => {
          let sat = 100;
          let colorHue = p.hue;
          let alpha = Math.max(0.1, 1.0 - progress * 0.2);
          
          if (progress < 0.66) {
            // First 2 seconds: slowly desaturate down to B&W (monochromatic)
            sat = Math.max(0, 100 * (1 - (progress / 0.66)));
          } else {
            // Last 1 second: IGNITE into fiery gold/crimson survival sparks
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
      
      // Big bang bright center white/cyan flash at start
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
      
      // 3. Draw Frozen Soul (First 2.0 seconds is a frozen crystalline structure)
      if (progress < 0.66) {
        const frozenAlpha = progress / 0.66;
        
        // Draw the pale, frozen cell shell
        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.beginPath();
        const numPts = 16;
        const radius = 78 * frozenAlpha;
        for (let i = 0; i < numPts; i++) {
          const angle = (i / numPts) * Math.PI * 2;
          const w = Math.sin(Date.now() * 0.01 + angle * 2) * 2; // slow shiver
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
        
        // Draw ice cracks around it (spreading slower via exponent 2.5)
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
          // Jagged branch
          this.ctx.lineTo(Math.cos(angle + 0.3) * crackRadius * 1.35, Math.sin(angle + 0.3) * crackRadius * 1.35);
          this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0; // reset shadow glow
        this.ctx.restore();
      }
      
      // 4. Last 1 second: Dynamic cell ignition (shattering ice, lightning, warm energy)
      if (progress >= 0.66) {
        const waveProgress = (progress - 0.66) / 0.34;
        
        // Ice Crust Shards Shatter & Fly Outward
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
            
            // Shattered ice colors (fading neon cyan)
            this.ctx.fillStyle = `rgba(150, 230, 255, ${0.9 * s.alpha})`;
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * s.alpha})`;
            this.ctx.lineWidth = 2.0;
            this.ctx.stroke();
            this.ctx.restore();
          });
        }
        
        // Fiery Vitality Sparks (Warm gold/crimson embers)
        if (this.awakeningSparks) {
          this.awakeningSparks.forEach(s => {
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * (0.3 + s.life * 0.7), 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${s.hue}, 100%, 62%, ${s.life * 0.95})`;
            this.ctx.fill();
            
            // Glowing corona around embers
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * 2.8 * s.life, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${s.hue}, 100%, 50%, ${s.life * 0.18})`;
            this.ctx.fill();
          });
        }
        
        // Electric Synaptic Arcs (Brain/vitality sparking life)
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
        
        // Shockwave 1: Crimson expanding plasma front
        this.ctx.beginPath();
        this.ctx.arc(tx, ty, 40 * waveProgress * 7.5, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(255, 45, 0, ${0.9 * (1 - waveProgress)})`;
        this.ctx.lineWidth = 6 * (1 - waveProgress) + 1.5;
        this.ctx.stroke();
        
        // Shockwave 2: Neon Cyan expansion (ice-burst shock)
        this.ctx.beginPath();
        this.ctx.arc(tx, ty, 30 * waveProgress * 5.0, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.95 * (1 - waveProgress)})`;
        this.ctx.lineWidth = 9 * (1 - waveProgress) + 2;
        this.ctx.stroke();
        
        // Specular fiery plasma core forming cell spark
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
        
        // Render Waking Organism with vibrant crimson/gold cilia trail
        this.ctx.save();
        this.ctx.translate(tx, ty);
        
        // Fast-flapping flagella (instinct to survive)
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
        
        // Glowing cell body membrane
        this.ctx.beginPath();
        const bodyPts = 16;
        const bodyRadius = 78 * waveProgress;
        for (let i = 0; i < bodyPts; i++) {
          const angle = (i / bodyPts) * Math.PI * 2;
          const w = Math.sin(Date.now() * 0.045 + angle * 4) * 6; // rapid heartbeat wobble
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
      return; // Skip normal scene rendering during intro
    }
    
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
          const pulse = Math.sin(Date.now() * 0.005 + nut.pulseOffset) * 1.5;
          
          // Rotate proteins over time
          const rot = Date.now() * nut.rotSpeed * 0.08;
          const radBase = nut.size + pulse;
          
          // Helper to draw spiky protein folding lines with interlocking indentations
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
                const socketRad = radBase * 0.45 * scale; // Inner interlocking indentation slot
                const cx = pt.x + Math.cos(prevAngle) * socketRad;
                const cy = pt.y + Math.sin(prevAngle) * socketRad;
                this.ctx.quadraticCurveTo(cx, cy, px, py);
              }
            }
            
            // Close path with final interlocking indentation
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
          
          // Draw main protein body
          drawProteinPath(1.0);
          this.ctx.fillStyle = colorString.replace('ALPHA', fadeAlpha.toFixed(2));
          this.ctx.fill();
          
          // Add extra outer radial glow for the best path to aid readability
          if (p.quality === 'best' || (STATE.hasLifeline && p.quality === 'best')) {
            drawProteinPath(2.2);
            this.ctx.fillStyle = `rgba(46, 204, 113, ${fadeAlpha * 0.12})`;
            this.ctx.fill();
          }
        });
      });
    }
    
    // 3. Draw Splashed particles
    this.particles.forEach(p => p.draw(this.ctx));
    
    // Set scaling factor for start screen (3x scale of the new 78px size) vs gameplay (1x scale)
    const sizeScale = STATE.isPlaying ? 1.0 : 3.0;

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
    
    // Layered Dynamic Color Neon Outlines (Enhanced Glow)
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
      const timerPct = Math.max(0, STATE.forkTimer / 3.0);
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
    STATE.forkTimer = 3.0;
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
    if (STATE.isIntro) {
      const elapsed = Date.now() - STATE.introStartTime;
      if (elapsed >= 2000 && !STATE.hasTriggeredBoom) {
        STATE.hasTriggeredBoom = true;
        audio.playAwakeningBoom();
        if (renderer && typeof renderer.spawnAwakeningExplosion === 'function') {
          renderer.spawnAwakeningExplosion();
        }
      }
      if (elapsed >= 3000) {
        STATE.isIntro = false;
        STATE.hasTriggeredBoom = false;
        document.getElementById('modal-start').classList.remove('hidden');
        audio.startAmbientAndHeartbeat();
      }
    }
    
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
  
  // Cover screen awaken trigger to start intro cutscene
  document.getElementById('modal-awaken').addEventListener('click', () => {
    document.getElementById('modal-awaken').classList.add('hidden');
    audio.init();
    audio.playIntroSwell();
    
    STATE.isCoverScreen = false;
    STATE.isIntro = true;
    STATE.introStartTime = Date.now();
    renderer.initIntroParticles();
  });
  
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
