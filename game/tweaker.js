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
  
  // Repurposed sliders for vector physics coefficients (ESC dashboard)
  if (tSurv) {
    tSurv.min = "0.85"; tSurv.max = "0.99"; tSurv.step = "0.01"; tSurv.value = CONFIG.frictionFactor.toString();
    tSurvLbl.textContent = CONFIG.frictionFactor.toFixed(2);
    tSurv.previousSibling.textContent = "Friction Factor: ";
    tSurv.addEventListener('input', (e) => {
      CONFIG.frictionFactor = parseFloat(e.target.value);
      tSurvLbl.textContent = CONFIG.frictionFactor.toFixed(2);
    });
  }
  
  if (tHlth) {
    tHlth.min = "0.5"; tHlth.max = "4.0"; tHlth.step = "0.1"; tHlth.value = CONFIG.propulsionForce.toString();
    tHlthLbl.textContent = CONFIG.propulsionForce.toFixed(1);
    tHlth.previousSibling.textContent = "Propulsion Force: ";
    tHlth.addEventListener('input', (e) => {
      CONFIG.propulsionForce = parseFloat(e.target.value);
      tHlthLbl.textContent = CONFIG.propulsionForce.toFixed(1);
    });
  }
  
  if (tRep) {
    tRep.min = "0.1"; tRep.max = "2.5"; tRep.step = "0.1"; tRep.value = CONFIG.propulsionMassCost.toString();
    tRepLbl.textContent = CONFIG.propulsionMassCost.toFixed(1);
    tRep.previousSibling.textContent = "Propulsion Cost: ";
    tRep.addEventListener('input', (e) => {
      CONFIG.propulsionMassCost = parseFloat(e.target.value);
      tRepLbl.textContent = CONFIG.propulsionMassCost.toFixed(1);
    });
  }
  
  if (tSpd) {
    tSpd.addEventListener('input', (e) => {
      CONFIG.flowSpeed = parseFloat(e.target.value);
      tSpdLbl.textContent = CONFIG.flowSpeed.toFixed(1);
      STATE.targetSpeed = CONFIG.flowSpeed;
    });
  }
  
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
