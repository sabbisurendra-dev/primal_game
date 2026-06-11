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
    type: Phaser.AUTO,
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
}

function bindInputEvents() {
  document.getElementById('btn-up').addEventListener('click', () => STATE_CONTROLLER.choosePath(0));
  document.getElementById('btn-forward').addEventListener('click', () => STATE_CONTROLLER.choosePath(1));
  document.getElementById('btn-down').addEventListener('click', () => STATE_CONTROLLER.choosePath(2));

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

    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      STATE_CONTROLLER.choosePath(0);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Space') {
      STATE_CONTROLLER.choosePath(1);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      STATE_CONTROLLER.choosePath(2);
    } else if (e.key === '/') {
      document.getElementById('dev-tweaks').classList.toggle('hidden');
    } else if (e.code === 'Escape') {
      document.getElementById('dev-tweaks').classList.add('hidden');
    }
  });

  // Mobile Touch Swipe Zones
  const canvasElement = document.getElementById('game-canvas');
  canvasElement.addEventListener('touchstart', (e) => {
    if (!STATE.isPlaying || STATE.isTransitioning) return;
    const touchY = e.touches[0].clientY;
    const zoneHeight = window.innerHeight / 3;
    if (touchY < zoneHeight) {
      STATE_CONTROLLER.choosePath(0);
    } else if (touchY > zoneHeight * 2) {
      STATE_CONTROLLER.choosePath(2);
    } else {
      STATE_CONTROLLER.choosePath(1);
    }
  }, { passive: true });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  window.addEventListener('load', init);
}
