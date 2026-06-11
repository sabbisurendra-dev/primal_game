import { audio } from './audio.js';

// --- 1. DESIGNER CONFIGURATION / TWEAKS ---
export const CONFIG = {
  survivalWeight: 1.0,
  healthWeight: 1.0,
  reproWeight: 1.0,
  flowSpeed: 3.5, // Base scrolling speed
  
  // Base changes for choice outcomes (modified by weights)
  outcomes: {
    best: { survival: 5, health: 15, repro: 15, speedMultiplier: 1.5 },
    ok:   { survival: 0, health: 0,  repro: 5,  speedMultiplier: 1.0 },
    worst: { survival: -15, health: -15, repro: -10, speedMultiplier: 0.6 }
  },
  
  // Threat warning settings
  threatInterval: 12000, // ms between threats
  threatDuration: 3000,  // ms warning lasts before fork choice
};

// --- 2. NARRATIVE TEXT DATABASE ---
export const NARRATIVE = {
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

// --- 3. GAME ENGINE STATE ---
export const STATE = {
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
  isCoverScreen: true,
  isPlaying: false,
  isIntro: false,
  introStartTime: 0,
  hasTriggeredBoom: false,
  isTransitioning: false,
  forkTimer: 3.0,
  
  // Paths
  paths: [],
  selectedPathIndex: 1,
  
  // Generation counter
  generation: 1
};

// --- 4. GAME STATE CONTROLLER ---
export const STATE_CONTROLLER = {
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
    if (window.renderer) window.renderer.generatePaths();
    
    document.getElementById('modal-start').classList.add('hidden');
    document.getElementById('ui-layer').classList.remove('hidden');
    
    this.setNarrative(NARRATIVE.chapter1[0]);
    this.triggerThreatLoop();
    this.resetForkTimer();
  },
  
  resetForkTimer() {
    STATE.forkTimer = 3.0;
  },
  
  triggerThreatLoop() {
    clearTimeout(STATE.threatTimer);
    const scheduleNextThreat = () => {
      if (!STATE.isPlaying) return;
      const interval = CONFIG.threatInterval + (Math.random() * 4000 - 2000);
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
    audio.setTempo(330);
    if (window.renderer) window.renderer.generatePaths();
  },
  
  deactivateThreatWarning() {
    STATE.isThreatWarning = false;
    document.getElementById('threat-indicator').classList.add('hidden');
    audio.setTempo(1200);
  },
  
  choosePath(pathIndex) {
    if (STATE.isTransitioning || !STATE.isPlaying) return;
    STATE.isTransitioning = true;
    
    const chosenPath = STATE.paths[pathIndex];
    if (!chosenPath) return;
    
    audio.playSelect(chosenPath.quality);
    this.animateTransition(chosenPath);
  },
  
  animateTransition(path) {
    const outcomeSpeed = CONFIG.flowSpeed * CONFIG.outcomes[path.quality].speedMultiplier;
    STATE.targetSpeed = outcomeSpeed * 2.2;
    
    if (window.renderer) {
      window.renderer.spawnChoiceSplash(window.renderer.player.x, window.renderer.player.y, path.quality);
      window.renderer.player.targetY = path.endY;
    }
    
    this.applyOutcome(path.quality);
    
    setTimeout(() => {
      STATE.targetSpeed = outcomeSpeed;
      if (window.renderer) {
        window.renderer.player.y = path.endY;
        window.renderer.player.targetY = path.endY;
      }
      this.resolveStep();
      STATE.isTransitioning = false;
      this.resetForkTimer();
    }, 450);
  },
  
  applyOutcome(quality) {
    const changes = CONFIG.outcomes[quality];
    const ds = changes.survival * CONFIG.survivalWeight;
    const dh = changes.health * CONFIG.healthWeight;
    const dr = changes.repro * CONFIG.reproWeight;
    
    STATE.survival = Math.max(0, Math.min(100, STATE.survival + ds));
    STATE.health = Math.max(5, Math.min(100, STATE.health + dh));
    STATE.repro = Math.max(0, Math.min(100, STATE.repro + dr));
    
    this.updateHUD();
    this.checkDDAEffects();
  },
  
  checkDDAEffects() {
    const isCritical = STATE.health <= 25;
    const vigScale = isCritical ? '45%' : '100%';
    const vigOpacity = isCritical ? '0.90' : '0.15';
    const vigColor = isCritical ? '35, 0, 0' : '0, 0, 0';
    
    document.documentElement.style.setProperty('--vignette-scale', vigScale);
    document.documentElement.style.setProperty('--vignette-opacity', vigOpacity);
    document.documentElement.style.setProperty('--vignette-color', vigColor);
    
    audio.setMuffle(STATE.health);
    
    if (isCritical) {
      STATE.hasLifeline = true;
      CONFIG.outcomes.best.health = 35;
    } else {
      STATE.hasLifeline = false;
      CONFIG.outcomes.best.health = 15;
    }
  },
  
  resolveStep() {
    this.deactivateThreatWarning();
    STATE.chapterProgress++;
    
    const progressPct = (STATE.chapterProgress / STATE.maxChapterSteps) * 100;
    document.getElementById('progress-bar').style.width = `${progressPct}%`;
    
    STATE.narrativeIndex++;
    
    let currentChapterDeck = NARRATIVE.chapter1;
    if (STATE.chapter === 2) currentChapterDeck = NARRATIVE.chapter2;
    if (STATE.chapter === 3) currentChapterDeck = NARRATIVE.chapter3;
    
    if (STATE.chapterProgress >= STATE.maxChapterSteps) {
      this.triggerChapterComplete();
    } else {
      const textIndex = STATE.narrativeIndex % currentChapterDeck.length;
      this.setNarrative(currentChapterDeck[textIndex]);
      if (window.renderer) window.renderer.generatePaths();
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
      this.triggerGameEnd();
    }
  },
  
  proceedToNextChapter() {
    document.getElementById('modal-chapter').classList.add('hidden');
    STATE.chapter++;
    STATE.chapterProgress = 0;
    
    if (STATE.chapter === 2) {
      STATE.maxChapterSteps = 12;
      document.getElementById('current-chapter-name').textContent = "ADAPT AND DIVIDE";
      this.setNarrative(NARRATIVE.chapter2[0]);
    } else if (STATE.chapter === 3) {
      STATE.maxChapterSteps = 10;
      document.getElementById('current-chapter-name').textContent = "THE ABYSSAL DEEP";
      this.setNarrative(NARRATIVE.chapter3[0]);
    }
    
    STATE.isPlaying = true;
    if (window.renderer) window.renderer.generatePaths();
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
