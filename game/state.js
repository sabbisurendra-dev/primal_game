import { audio } from './audio.js';

// Priority 6: Personal Bests tracking
const PERSONAL_BESTS = {
  longestStreak: 0,
  peakHealth: 0,
  duration: 0
};

// Try to load from localStorage
try {
  const stored = localStorage.getItem('primal_personal_best');
  if (stored) {
    Object.assign(PERSONAL_BESTS, JSON.parse(stored));
  }
} catch (e) {
  console.warn("localStorage not available", e);
}

function savePersonalBests() {
  try {
    localStorage.setItem('primal_personal_best', JSON.stringify(PERSONAL_BESTS));
  } catch (e) {}
}

export function shakeCanvas() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const duration = 220;
  const start = performance.now();
  const frequency = 5;
  function animate(time) {
    const elapsed = time - start;
    if (elapsed >= duration) {
      canvas.style.transform = '';
      return;
    }
    const t = elapsed / duration;
    const decay = 1 - t;
    const dx = Math.sin(t * Math.PI * 2 * frequency) * 3 * decay;
    const dy = Math.cos(t * Math.PI * 2 * frequency) * 2 * decay;
    canvas.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

export function spawnFloatingTextHTML(text, x, y) {
  const container = document.getElementById('ui-layer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'floating-text-juice';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  container.appendChild(el);
  
  setTimeout(() => el.classList.add('float-active'), 50);
  setTimeout(() => el.remove(), 1250);
}
window.spawnFloatingTextHTML = spawnFloatingTextHTML;

export function triggerMilestoneFlash(text) {
  const container = document.getElementById('ui-layer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'milestone-flash-text';
  el.textContent = text;
  container.appendChild(el);
  
  setTimeout(() => el.classList.add('flash-active'), 50);
  setTimeout(() => el.remove(), 1500);
}
window.triggerMilestoneFlash = triggerMilestoneFlash;

export function triggerScreenCompression() {
  document.documentElement.style.setProperty('--vignette-scale', '35%');
  document.documentElement.style.setProperty('--vignette-opacity', '0.90');
  setTimeout(() => {
    STATE_CONTROLLER.checkDDAEffects();
  }, 500);
}

// --- 1. DESIGNER CONFIGURATION / TWEAKS ---
export const CONFIG = {
  survivalWeight: 1.0,
  healthWeight: 1.0,
  reproWeight: 1.0,
  flowSpeed: 1.75, // Base scrolling speed (reduced by 50%)
  
  // Base changes for choice outcomes (modified by weights)
  outcomes: {
    best: { survival: 5, health: 15, repro: 15, speedMultiplier: 1.5 },
    ok:   { survival: 0, health: 0,  repro: 5,  speedMultiplier: 1.0 },
    worst: { survival: -15, health: -15, repro: -10, speedMultiplier: 0.6 }
  },
  
  // Threat warning settings
  threatInterval: 24000, // ms between threats (doubled to match 50% speed)
  threatDuration: 6000,  // ms warning lasts before fork choice (doubled to match 50% speed)
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
  hoveredPathIndex: null,
  
  // Paths
  paths: [],
  selectedPathIndex: 1,
  
  // Generation counter
  generation: 1,

  // Priority 4: Streak & Milestones
  currentStreak: 0,
  longestStreak: 0,
  sessionStartTime: 0,
  milestone30: false,
  milestone60: false,
  milestone90: false,
  
  // Priority 6: Session statistics
  peakHealth: 50,
  bestChoicesCount: 0,
  okChoicesCount: 0,
  worstChoicesCount: 0,
  totalChoices: 0,
  distanceTraveled: 0
};

// Helper to safely obtain the active Phaser GameScene instance
function getGameScene() {
  if (window.phaserGame && window.phaserGame.scene) {
    try {
      return window.phaserGame.scene.getScene('GameScene');
    } catch (e) {
      return null;
    }
  }
  return null;
}

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
    
    STATE.currentStreak = 0;
    STATE.longestStreak = 0;
    STATE.peakHealth = 50;
    STATE.bestChoicesCount = 0;
    STATE.okChoicesCount = 0;
    STATE.worstChoicesCount = 0;
    STATE.totalChoices = 0;
    STATE.distanceTraveled = 0;
    STATE.sessionStartTime = Date.now();
    STATE.milestone30 = false;
    STATE.milestone60 = false;
    STATE.milestone90 = false;
    
    STATE.currentSpeed = CONFIG.flowSpeed;
    STATE.targetSpeed = CONFIG.flowSpeed;
    
    this.updateHUD();
    const scene = getGameScene();
    if (scene) {
      if (scene.scale) {
        const height = scene.scale.height;
        if (scene.player) {
          scene.player.y = height / 2;
          scene.player.targetY = height / 2;
          scene.player.steerOffset = 0;
        }
      }
      if (scene.player) {
        scene.generatePaths();
      }
    }
    
    document.getElementById('modal-start').classList.add('hidden');
    document.getElementById('ui-layer').classList.remove('hidden');
    
    this.setNarrative(NARRATIVE.chapter1[0]);
    this.triggerThreatLoop();
    this.resetForkTimer();
  },
  
  resetForkTimer() {
    STATE.forkTimer = 6.0; // doubled from 3.0 to match 50% speed
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
    audio.startWarningDrone();
    const scene = getGameScene();
    if (scene && scene.player) scene.generatePaths();
  },
  
  deactivateThreatWarning() {
    STATE.isThreatWarning = false;
    document.getElementById('threat-indicator').classList.add('hidden');
    audio.setTempo(1000 / (0.8 + (STATE.health / 100) * 1.2));
    audio.stopWarningDrone();
  },
  
  choosePath(pathIndex, isAuto = false) {
    if (STATE.isTransitioning || !STATE.isPlaying) return;
    STATE.isTransitioning = true;
    
    const chosenPath = STATE.paths[pathIndex];
    if (!chosenPath) return;
    
    audio.playSelect(chosenPath.quality);
    this.animateTransition(chosenPath, isAuto);
  },
  
  animateTransition(path, isAuto) {
    const outcomeSpeed = CONFIG.flowSpeed * CONFIG.outcomes[path.quality].speedMultiplier;
    STATE.targetSpeed = outcomeSpeed * 2.2;
    STATE.transitionStart = Date.now();
    STATE.chosenPathIndex = path.index;
    
    const scene = getGameScene();
    if (scene) {
      scene.spawnChoiceSplash(scene.player.x, scene.player.y, path.quality);
      scene.player.targetY = path.endY;
      
      // Screen shake on worst selection
      if (path.quality === 'worst') {
        shakeCanvas();
      }
      
      // Best path golden particle burst + nutrient absorption trail
      if (path.quality === 'best') {
        scene.spawnBestPathBurst(scene.player.x, scene.player.y);
        scene.spawnNutrientAbsorptionTrail();
      }
      
      // Cell membrane ripple on every choice
      scene.triggerMembraneRipple();
    }
    
    this.applyOutcome(path.quality, isAuto);
    
    setTimeout(() => {
      STATE.targetSpeed = outcomeSpeed;
      const sceneLater = getGameScene();
      if (sceneLater) {
        sceneLater.player.y = path.endY;
        sceneLater.player.targetY = path.endY;
      }
      this.resolveStep();
      STATE.isTransitioning = false;
      STATE.transitionStart = 0;
      this.resetForkTimer();
    }, 450);
  },
  
  applyOutcome(quality, isAuto = false) {
    const changes = CONFIG.outcomes[quality];
    let ds = changes.survival * CONFIG.survivalWeight;
    let dh = changes.health * CONFIG.healthWeight;
    let dr = changes.repro * CONFIG.reproWeight;
    
    // If choice is resolved automatically due to timeout/no user input, prevent any metric increases
    if (isAuto) {
      if (ds > 0) ds = 0;
      if (dh > 0) dh = 0;
      if (dr > 0) dr = 0;
    }
    
    STATE.survival = Math.max(0, Math.min(100, STATE.survival + ds));
    STATE.health = Math.max(5, Math.min(100, STATE.health + dh));
    STATE.repro = Math.max(0, Math.min(100, STATE.repro + dr));
    
    // Priority 6: Choice stats and peak health tracking
    STATE.totalChoices++;
    if (quality === 'best') STATE.bestChoicesCount++;
    else if (quality === 'ok') STATE.okChoicesCount++;
    else if (quality === 'worst') STATE.worstChoicesCount++;
    
    if (STATE.health > STATE.peakHealth) {
      STATE.peakHealth = STATE.health;
    }
    
    // Priority 4: Streak counter
    const scene = getGameScene();
    if (quality === 'best' || quality === 'ok') {
      STATE.currentStreak++;
      if (STATE.currentStreak > STATE.longestStreak) {
        STATE.longestStreak = STATE.currentStreak;
      }
      
      if (scene && scene.player) {
        const offsetRad = scene.player.radius * scene.player.massScale * (STATE.isPlaying ? 1.0 : 3.0);
        if (STATE.currentStreak === 3) {
          spawnFloatingTextHTML("THRIVING ×3", scene.player.x, scene.player.y - offsetRad - 20);
        } else if (STATE.currentStreak === 5) {
          spawnFloatingTextHTML("THRIVING ×5", scene.player.x, scene.player.y - offsetRad - 20);
          scene.triggerRingPulse();
        } else if (STATE.currentStreak >= 7) {
          spawnFloatingTextHTML(`THRIVING ×${STATE.currentStreak}`, scene.player.x, scene.player.y - offsetRad - 20);
          scene.triggerRingPulse();
        }
      }
      
      // 4d. Near-miss floating text
      const bestAvailable = STATE.paths.some(p => p.quality === 'best');
      if (quality === 'ok' && bestAvailable && scene && scene.player) {
        const offsetRad = scene.player.radius * scene.player.massScale * (STATE.isPlaying ? 1.0 : 3.0);
        spawnFloatingTextHTML("+STABLE", scene.player.x, scene.player.y - offsetRad - 45);
      }
    } else if (quality === 'worst') {
      STATE.currentStreak = 0;
      triggerScreenCompression();
    }
    
    audio.updateStreakHarmonics(STATE.currentStreak);
    
    this.updateHUD();
    this.checkDDAEffects();
  },
  
  checkDDAEffects() {
    const isCritical = STATE.health <= 25;
    const isThriving = STATE.currentStreak >= 7;
    const vigScale = isCritical ? '45%' : '100%';
    const vigOpacity = isCritical ? '0.90' : (isThriving ? '0.04' : '0.15');
    const vigColor = isCritical ? '35, 0, 0' : '0, 0, 0';
    
    document.documentElement.style.setProperty('--vignette-scale', vigScale);
    document.documentElement.style.setProperty('--vignette-opacity', vigOpacity);
    document.documentElement.style.setProperty('--vignette-color', vigColor);
    
    audio.setMuffle(STATE.health);
    
    if (!STATE.isThreatWarning) {
      audio.setTempo(1000 / (0.8 + (STATE.health / 100) * 1.2));
    }
    
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
      const scene = getGameScene();
      if (scene && scene.player) scene.generatePaths();
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
    
    // Save/update personal bests
    const sessionDuration = (Date.now() - STATE.sessionStartTime) / 1000;
    let pbUpdated = false;
    if (STATE.longestStreak > PERSONAL_BESTS.longestStreak) {
      PERSONAL_BESTS.longestStreak = STATE.longestStreak;
      pbUpdated = true;
    }
    if (STATE.peakHealth > PERSONAL_BESTS.peakHealth) {
      PERSONAL_BESTS.peakHealth = STATE.peakHealth;
      pbUpdated = true;
    }
    if (sessionDuration > PERSONAL_BESTS.duration) {
      PERSONAL_BESTS.duration = sessionDuration;
      pbUpdated = true;
    }
    if (pbUpdated) {
      savePersonalBests();
    }
    
    const titleEl = document.getElementById('chapter-title');
    const summaryEl = document.getElementById('chapter-summary');
    const btnCont = document.getElementById('btn-chapter-continue');
    
    const getDeltaStr = (val, bestVal, suffix = "") => {
      const diff = val - bestVal;
      if (diff > 0) return ` <span style="color: #2ecc71;">(+${Math.round(diff)}${suffix} vs Best)</span>`;
      if (diff < 0) return ` <span style="color: #95a5a6;">(${Math.round(diff)}${suffix} vs Best)</span>`;
      return ` <span style="color: #f1c40f;">(Match Best)</span>`;
    };
    
    const streakDelta = getDeltaStr(STATE.longestStreak, PERSONAL_BESTS.longestStreak);
    const healthDelta = getDeltaStr(STATE.peakHealth, PERSONAL_BESTS.peakHealth, "%");
    const durationDelta = getDeltaStr(sessionDuration, PERSONAL_BESTS.duration, "s");
    
    if (STATE.chapter === 1) {
      audio.playMitosis();
      titleEl.textContent = "CHAPTER 1 COMPLETE: THE SPARK";
      summaryEl.innerHTML = `
        <strong>Cellular Status Summary:</strong><br>
        • Generation: Gen-${STATE.generation}<br>
        • Survival Instinct: ${Math.round(STATE.survival)}%<br>
        • Final Health: ${Math.round(STATE.health)}%<br>
        • Peak Health: ${Math.round(STATE.peakHealth)}%${healthDelta}<br>
        • Longest Streak: ${STATE.longestStreak}${streakDelta}<br>
        • Distance Traveled: ${Math.round(STATE.distanceTraveled)}m<br>
        • Choice Breakdown: ${STATE.bestChoicesCount} best, ${STATE.okChoicesCount} ok, ${STATE.worstChoicesCount} worst<br>
        • Session Duration: ${Math.round(sessionDuration)}s${durationDelta}<br><br>
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
        • Peak Health: ${Math.round(STATE.peakHealth)}%${healthDelta}<br>
        • Longest Streak: ${STATE.longestStreak}${streakDelta}<br>
        • Distance Traveled: ${Math.round(STATE.distanceTraveled)}m<br>
        • Choice Breakdown: ${STATE.bestChoicesCount} best, ${STATE.okChoicesCount} ok, ${STATE.worstChoicesCount} worst<br>
        • Session Duration: ${Math.round(sessionDuration)}s${durationDelta}<br><br>
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
    
    const scene = getGameScene();
    if (scene && scene.scale) {
      const height = scene.scale.height;
      if (scene.player) {
        scene.player.y = height / 2;
        scene.player.targetY = height / 2;
        scene.player.steerOffset = 0;
      }
    }
    
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
    if (scene && scene.player) scene.generatePaths();
    this.resetForkTimer();
    this.triggerThreatLoop();
  },
  
  triggerGameEnd() {
    audio.playMitosis();
    document.getElementById('ui-layer').classList.add('hidden');
    
    // Save/update personal bests
    const sessionDuration = (Date.now() - STATE.sessionStartTime) / 1000;
    let pbUpdated = false;
    if (STATE.longestStreak > PERSONAL_BESTS.longestStreak) {
      PERSONAL_BESTS.longestStreak = STATE.longestStreak;
      pbUpdated = true;
    }
    if (STATE.peakHealth > PERSONAL_BESTS.peakHealth) {
      PERSONAL_BESTS.peakHealth = STATE.peakHealth;
      pbUpdated = true;
    }
    if (sessionDuration > PERSONAL_BESTS.duration) {
      PERSONAL_BESTS.duration = sessionDuration;
      pbUpdated = true;
    }
    if (pbUpdated) {
      savePersonalBests();
    }
    
    const getDeltaStr = (val, bestVal, suffix = "") => {
      const diff = val - bestVal;
      if (diff > 0) return ` <span style="color: #2ecc71;">(+${Math.round(diff)}${suffix} vs Best)</span>`;
      if (diff < 0) return ` <span style="color: #95a5a6;">(${Math.round(diff)}${suffix} vs Best)</span>`;
      return ` <span style="color: #f1c40f;">(Match Best)</span>`;
    };
    
    const streakDelta = getDeltaStr(STATE.longestStreak, PERSONAL_BESTS.longestStreak);
    const healthDelta = getDeltaStr(STATE.peakHealth, PERSONAL_BESTS.peakHealth, "%");
    const durationDelta = getDeltaStr(sessionDuration, PERSONAL_BESTS.duration, "s");

    const modalEnd = document.getElementById('modal-end');
    const endStory = modalEnd.querySelector('.modal-story');
    endStory.innerHTML = `
      Through hunger, tide, and hazard, you have endured.<br>
      Your membrane expands. Your nucleus vibrates. You begin to divide.<br><br>
      One cell becomes two. Two becomes many.<br>
      The seed of tomorrow is planted in the deep.<br><br>
      <strong>Final Evolution Session Logs (Gen-${STATE.generation}):</strong><br>
      • Peak Health: ${Math.round(STATE.peakHealth)}%${healthDelta}<br>
      • Longest Streak: ${STATE.longestStreak}${streakDelta}<br>
      • Distance Traveled: ${Math.round(STATE.distanceTraveled)}m<br>
      • Choice Breakdown: ${STATE.bestChoicesCount} best, ${STATE.okChoicesCount} ok, ${STATE.worstChoicesCount} worst<br>
      • Final Time: ${Math.round(sessionDuration)}s${durationDelta}
    `;
    
    // Rename CTA and add epigenetics subtitle
    const restartBtn = document.getElementById('btn-loop-restart');
    restartBtn.textContent = "EVOLVE AGAIN";
    
    let subtitle = document.getElementById('epigenetics-subtitle');
    if (!subtitle) {
      subtitle = document.createElement('div');
      subtitle.id = 'epigenetics-subtitle';
      subtitle.className = 'credits';
      subtitle.style.fontSize = '0.9em';
      subtitle.style.marginTop = '10px';
      subtitle.style.color = '#a78bfa';
      subtitle.textContent = "Retain epigenetic adaptations in the next generation (+2% base health)";
      restartBtn.parentNode.insertBefore(subtitle, restartBtn.nextSibling);
    }
    
    modalEnd.classList.remove('hidden');
  },
  
  restartCycle() {
    STATE.generation++;
    // Roguelite epigenetic health buff
    CONFIG.outcomes.best.health = CONFIG.outcomes.best.health + 1;
    document.getElementById('modal-end').classList.add('hidden');
    this.startGame();
  }
};
