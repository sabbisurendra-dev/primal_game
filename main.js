import { STATE, STATE_CONTROLLER } from './game/state.js';
import { audio } from './game/audio.js';
import { GameCanvasController } from './game/renderer.js';
import { setupDesignerTweaker, setupUrgentStartHook } from './game/tweaker.js';

// Expose modules to window for global coordination and dev-tools access
window.audio = audio;
window.STATE = STATE;
window.STATE_CONTROLLER = STATE_CONTROLLER;

function init() {
  window.renderer = new GameCanvasController();
  
  function loop() {
    if (STATE.isIntro) {
      const elapsed = Date.now() - STATE.introStartTime;
      if (elapsed >= 2000 && !STATE.hasTriggeredBoom) {
        STATE.hasTriggeredBoom = true;
        audio.playAwakeningBoom();
        if (window.renderer && typeof window.renderer.spawnAwakeningExplosion === 'function') {
          window.renderer.spawnAwakeningExplosion();
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
      if (!STATE.isTransitioning) {
        STATE.forkTimer -= 1 / 60;
        if (STATE.forkTimer <= 0) {
          const fallbackPathIndex = STATE.isThreatWarning ? 
            STATE.paths.findIndex(p => p.quality === 'best') : 1;
          STATE_CONTROLLER.choosePath(fallbackPathIndex !== -1 ? fallbackPathIndex : 1);
        }
      }
    }
    
    window.renderer.update();
    window.renderer.draw();
    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
  
  setupDesignerTweaker();
  bindInputEvents();
  
  document.getElementById('modal-awaken').addEventListener('click', () => {
    document.getElementById('modal-awaken').classList.add('hidden');
    audio.init();
    audio.playIntroSwell();
    
    STATE.isCoverScreen = false;
    STATE.isIntro = true;
    STATE.introStartTime = Date.now();
    window.renderer.initIntroParticles();
  });
  
  setupUrgentStartHook();
}

function bindInputEvents() {
  document.getElementById('btn-up').addEventListener('click', () => STATE_CONTROLLER.choosePath(0));
  document.getElementById('btn-forward').addEventListener('click', () => STATE_CONTROLLER.choosePath(1));
  document.getElementById('btn-down').addEventListener('click', () => STATE_CONTROLLER.choosePath(2));
  
  document.getElementById('btn-start').addEventListener('click', () => STATE_CONTROLLER.startGame());
  document.getElementById('btn-chapter-continue').addEventListener('click', () => STATE_CONTROLLER.proceedToNextChapter());
  document.getElementById('btn-loop-restart').addEventListener('click', () => STATE_CONTROLLER.restartCycle());
  
  window.addEventListener('keydown', (e) => {
    if (!STATE.isPlaying) {
      if (e.code === 'Space' && !document.getElementById('modal-start').classList.contains('hidden')) {
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
      document.getElementById('dev-tweaks').classList.toggle('hidden');
    } else if (e.code === 'Escape') {
      document.getElementById('dev-tweaks').classList.add('hidden');
    }
  });
  
  window.renderer.canvas.addEventListener('touchstart', (e) => {
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

window.addEventListener('load', init);
