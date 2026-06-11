import { CONFIG, STATE } from './state.js';

export function setupDesignerTweaker() {
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
export function setupUrgentStartHook() {
  const cta = document.querySelector('.modal-cta-main');
  if (cta) {
    cta.textContent = "READY. CLICK OR PRESS SPACEBAR TO START.";
  }
}
