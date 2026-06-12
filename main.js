const Phaser = window.Phaser;
import BootScene from './game/BootScene.js';
import CoverScene from './game/CoverScene.js';
import IntroScene from './game/IntroScene.js';
import GameScene from './game/GameScene.js';
import { STATE, STATE_CONTROLLER } from './game/state.js';
import { audio } from './game/audio.js';
import { setupDesignerTweaker, setupUrgentStartHook } from './game/tweaker.js';

// Expose modules globally for designer/dev-tools access
window.audio = audio;
window.STATE = STATE;
window.STATE_CONTROLLER = STATE_CONTROLLER;

function init() {
  const config = {
    type: Phaser.WEBGL,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    canvas: document.getElementById('game-canvas'),
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, CoverScene, IntroScene, GameScene]
  };

  const game = new Phaser.Game(config);
  window.phaserGame = game;

  // Listen for the intro complete event from Phaser
  game.events.on('intro-complete', () => {
    STATE.isIntro = false;
    STATE.hasTriggeredBoom = false;
    document.getElementById('modal-start').classList.remove('hidden');
    audio.startAmbientAndHeartbeat();
    game.scene.start('GameScene');
  });

  // Cover Screen click handler (Ignite the Spark)
  document.getElementById('modal-awaken').addEventListener('click', () => {
    document.getElementById('modal-awaken').classList.add('hidden');
    audio.init();
    audio.playIntroSwell();

    STATE.isCoverScreen = false;
    STATE.isIntro = true;
    STATE.introStartTime = Date.now();

    // Transition from CoverScene to IntroScene
    game.scene.stop('CoverScene');
    game.scene.start('IntroScene');

    // Trigger the awakening sequence inside the Phaser IntroScene
    game.events.emit('trigger-awaken');
  });

  setupDesignerTweaker();
  bindInputEvents();
  setupUrgentStartHook();
  animateButtonParticles();
}

function bindInputEvents() {
  const btnUp = document.getElementById('btn-up');
  const btnForward = document.getElementById('btn-forward');
  const btnDown = document.getElementById('btn-down');

  btnUp.addEventListener('click', () => STATE_CONTROLLER.choosePath(0));
  btnForward.addEventListener('click', () => STATE_CONTROLLER.choosePath(1));
  btnDown.addEventListener('click', () => STATE_CONTROLLER.choosePath(2));

  document.getElementById('btn-start').addEventListener('click', () => {
    STATE_CONTROLLER.startGame();
    // Launch/Wake the GameScene inside Phaser
    window.phaserGame.scene.start('GameScene');
  });
  
  document.getElementById('btn-chapter-continue').addEventListener('click', () => STATE_CONTROLLER.proceedToNextChapter());
  document.getElementById('btn-loop-restart').addEventListener('click', () => {
    STATE_CONTROLLER.restartCycle();
    window.phaserGame.scene.start('GameScene');
  });

  window.addEventListener('keydown', (e) => {
    if (!STATE.isPlaying) {
      if (e.code === 'Space' && !document.getElementById('modal-start').classList.contains('hidden')) {
        STATE_CONTROLLER.startGame();
        window.phaserGame.scene.start('GameScene');
      }
      return;
    }

    if (e.key === '/') {
      document.getElementById('dev-tweaks').classList.toggle('hidden');
    } else if (e.code === 'Escape') {
      document.getElementById('dev-tweaks').classList.add('hidden');
    }
  });

  // Mobile Touch Swipe Zones are deprecated as touch pointerdown steering is processed continuously inside GameScene.js
}

const buttonParticleMap = new Map();

function setupButtonParticles(canvas, quality) {
  let count = 0;
  let color = '#ffffff';
  let speedMult = 1.0;
  
  if (quality === 'best') {
    count = 14;
    color = 'rgba(46, 204, 113, ALPHA)';
    speedMult = 0.25;
  } else if (quality === 'ok') {
    count = 6;
    color = 'rgba(255, 255, 255, ALPHA)';
    speedMult = 0.5;
  } else if (quality === 'worst') {
    count = 2;
    color = 'rgba(231, 76, 60, ALPHA)';
    speedMult = 0.1;
  }
  
  const rect = canvas.getBoundingClientRect();
  const defaultSize = window.innerWidth <= 768 ? 80 : 96;
  canvas.width = rect.width || defaultSize;
  canvas.height = rect.height || defaultSize;
  
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * speedMult,
      vy: (Math.random() - 0.5) * speedMult,
      size: 1 + Math.random() * 2,
      color: color
    });
  }
  buttonParticleMap.set(canvas, { particles, color, quality });
}

export function updateButtonVisuals() {
  const buttons = [
    document.getElementById('btn-up'),
    document.getElementById('btn-forward'),
    document.getElementById('btn-down')
  ];
  if (!STATE.paths || STATE.paths.length < 3) return;
  
  buttons.forEach((btn, idx) => {
    if (!btn) return;
    const path = STATE.paths[idx];
    if (!path) return;
    btn.dataset.quality = path.quality;
    
    const canvas = btn.querySelector('.btn-particle-canvas');
    if (canvas) {
      setupButtonParticles(canvas, path.quality);
    }
  });
}
window.updateButtonVisuals = updateButtonVisuals;

function animateButtonParticles() {
  const canvases = document.querySelectorAll('.btn-particle-canvas');
  canvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const data = buttonParticleMap.get(canvas);
    if (!data) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    data.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      
      ctx.fillStyle = p.color.replace('ALPHA', '0.45');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  requestAnimationFrame(animateButtonParticles);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  window.addEventListener('load', init);
}
