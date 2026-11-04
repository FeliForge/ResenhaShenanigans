// @ts-nocheck
// Motor de audio procedural (Web Audio API). Sin assets externos.
// SFX + ambiente urbano. Inicializa bajo gesto de usuario.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientNodes = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  // ---- SFX ----
  env(node, peak, attack, decay) {
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    node.connect(g); g.connect(this.master);
    try { node.start(t); node.stop(t + attack + decay + 0.02); } catch {}
    return { g, stop: () => {} };
  }

  noiseBuffer(dur) {
    // Caché de 1s de ruido: evita asignar y llenar un buffer por cada SFX
    // (causa principal de los micro-congelamientos al atacar).
    if (this._noise) return this._noise;
    const len = Math.floor(this.ctx.sampleRate * 1.0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }

  playHit(intensity = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // tono
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(180 + intensity * 60, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    const e = this.env(osc, 0.25 * intensity, 0.005, 0.12);
    e.stop();
    // ruido
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.12);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.8;
    src.connect(bp);
    const e2 = this.env(src, 0.2 * intensity, 0.003, 0.1);
    e2.stop();
  }

  playWhoosh() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.18);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.setValueAtTime(300, this.ctx.currentTime);
    hp.frequency.exponentialRampToValueAtTime(2500, this.ctx.currentTime + 0.16);
    src.connect(hp);
    const e = this.env(src, 0.12, 0.01, 0.16);
    e.stop();
  }

  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.18);
    const e = this.env(osc, 0.18, 0.005, 0.18);
    e.stop();
  }

  playLand() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.14);
    const e = this.env(osc, 0.3, 0.003, 0.14);
    e.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.1);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
    src.connect(lp);
    const e2 = this.env(src, 0.15, 0.002, 0.1);
    e2.stop();
  }

  playUltimate() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.6);
    const e = this.env(osc, 0.3, 0.01, 0.6);
    e.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.6);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 800;
    src.connect(bp);
    const e2 = this.env(src, 0.25, 0.02, 0.6);
    e2.stop();
  }

  playBlip() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    const e = this.env(osc, 0.15, 0.005, 0.1);
    e.stop();
  }

  playBreak() {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.2);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500;
    src.connect(hp);
    const e = this.env(src, 0.18, 0.002, 0.18);
    e.stop();
  }

  // ---- Ambiente ----
  startAmbient() {
    if (!this.ctx || this.ambientNodes) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 2);
    g.connect(this.master);
    // drone
    const o1 = this.ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 55;
    const o2 = this.ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 82.5;
    o1.connect(g); o2.connect(g);
    o1.start(); o2.start();
    // viento/trafico
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2); src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
    const ng = this.ctx.createGain(); ng.gain.value = 0.04;
    src.connect(lp); lp.connect(ng); ng.connect(g);
    src.start();
    this.ambientNodes = { g, o1, o2, src };
  }

  stopAmbient() {
    if (!this.ambientNodes) return;
    const { g, o1, o2, src } = this.ambientNodes;
    const t = this.ctx.currentTime;
    g.gain.linearRampToValueAtTime(0, t + 0.5);
    setTimeout(() => { try { o1.stop(); o2.stop(); src.stop(); } catch {} }, 600);
    this.ambientNodes = null;
  }
}

export const audio = new AudioEngine();