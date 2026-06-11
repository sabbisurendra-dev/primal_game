// --- PROCEDURAL WEB AUDIO CONTROLLER ---
export class AudioController {
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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.28);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'worst') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.35);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
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

export const audio = new AudioController();
