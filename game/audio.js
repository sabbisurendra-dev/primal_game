// --- PROCEDURAL WEB AUDIO CONTROLLER ---
export class AudioController {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.lowPass = null;
    
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientLFO = null;
    
    this.warningDroneOsc = null;
    this.warningDroneGain = null;
    this.warningDroneFilter = null;
    
    this.streakOsc1 = null;
    this.streakOsc2 = null;
    this.streakGain = null;
    
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
    
    // Sweep oscillator from 70Hz to 1100Hz over 2.8 seconds
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 2.8);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 2.8);
    
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.24, now + 2.4);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 3.0);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 3.0);
  }
  
  playAwakeningBoom() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    // Sub-bass impact boom
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
      this.ambientOsc1.frequency.value = 55;
      
      this.ambientOsc2.type = 'sine';
      this.ambientOsc2.frequency.value = 55.4;
      
      gainNode.gain.value = 0.12;
      
      this.ambientLFO = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.ambientLFO.frequency.value = 0.15;
      lfoGain.gain.value = 4;
      
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
    
    // Heartbeat double thump frequency reactive to health
    // Health 100% -> freq 58Hz, Health 0% -> freq 42Hz
    const baseFreq = 42 + (window.STATE?.health || 50) / 100 * 16;
    
    this.triggerThumpNode(now, baseFreq, 0.45);
    this.triggerThumpNode(now + 0.22, baseFreq * 0.75, 0.35);
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
    const cutoff = 220 + (healthPercent / 100) * 1780;
    this.lowPass.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.25);
  }
  
  playSelect(type) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    
    if (type === 'best') {
      // swooping liquid drop chime (+3 semitones)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(622.25, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.22);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'worst') {
      // dry scrape / membrane scrape
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.linearRampToValueAtTime(35, now + 0.38);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(120, now);
      filter.frequency.linearRampToValueAtTime(60, now + 0.38);
      
      osc.disconnect(gain);
      osc.connect(filter);
      filter.connect(gain);
      
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.42);
    } else {
      // bubble pop
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
      
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }
  
  playGrazingEat() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
  }
  
  playHazardHit() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.15);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    
    osc.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }
  
  playMitosis() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25];
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
  
  startWarningDrone() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    this.stopWarningDrone();
    
    const now = this.ctx.currentTime;
    this.warningDroneOsc = this.ctx.createOscillator();
    this.warningDroneGain = this.ctx.createGain();
    
    this.warningDroneOsc.type = 'sawtooth';
    this.warningDroneOsc.frequency.setValueAtTime(65, now);
    
    this.warningDroneFilter = this.ctx.createBiquadFilter();
    this.warningDroneFilter.type = 'lowpass';
    this.warningDroneFilter.frequency.setValueAtTime(120, now);
    this.warningDroneFilter.frequency.linearRampToValueAtTime(250, now + 3.0);
    
    this.warningDroneGain.gain.setValueAtTime(0.001, now);
    this.warningDroneGain.gain.linearRampToValueAtTime(0.18, now + 3.0);
    
    this.warningDroneOsc.connect(this.warningDroneFilter);
    this.warningDroneFilter.connect(this.warningDroneGain);
    this.warningDroneGain.connect(this.masterVolume);
    
    this.warningDroneOsc.start(now);
  }
  
  stopWarningDrone() {
    if (this.warningDroneOsc) {
      try {
        this.warningDroneOsc.stop();
      } catch(e) {}
      this.warningDroneOsc = null;
    }
    this.warningDroneGain = null;
    this.warningDroneFilter = null;
  }
  
  updateStreakHarmonics(streak) {
    if (!this.ctx || !this.isPlaying) return;
    
    if (!this.streakGain) {
      this.streakGain = this.ctx.createGain();
      this.streakGain.gain.value = 0.0;
      this.streakGain.connect(this.lowPass);
      
      this.streakOsc1 = this.ctx.createOscillator();
      this.streakOsc1.type = 'sine';
      this.streakOsc1.frequency.value = 110;
      
      this.streakOsc2 = this.ctx.createOscillator();
      this.streakOsc2.type = 'sine';
      this.streakOsc2.frequency.value = 165;
      
      this.streakOsc1.connect(this.streakGain);
      this.streakOsc2.connect(this.streakGain);
      
      this.streakOsc1.start();
      this.streakOsc2.start();
    }
    
    const now = this.ctx.currentTime;
    let targetGain = 0.0;
    if (streak >= 7) {
      targetGain = 0.09;
    } else if (streak >= 5) {
      targetGain = 0.06;
    } else if (streak >= 3) {
      targetGain = 0.03;
    }
    
    this.streakGain.gain.setTargetAtTime(targetGain, now, 0.5);
  }
  
  stop() {
    this.isPlaying = false;
    clearTimeout(this.heartbeatTimer);
    try {
      if (this.ambientOsc1) this.ambientOsc1.stop();
      if (this.ambientOsc2) this.ambientOsc2.stop();
      if (this.ambientLFO) this.ambientLFO.stop();
      if (this.warningDroneOsc) this.warningDroneOsc.stop();
      if (this.streakOsc1) this.streakOsc1.stop();
      if (this.streakOsc2) this.streakOsc2.stop();
    } catch(e) {}
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
    this.ambientLFO = null;
    this.warningDroneOsc = null;
    this.streakOsc1 = null;
    this.streakOsc2 = null;
    this.streakGain = null;
    this.ctx = null;
  }
}

export const audio = new AudioController();
