/**
 * Procedural WebAudio war soundscape: Master <- {Ambience, SFX}.
 * Synthesizes winter gale drone, bronze war-horns, steel shield clashes,
 * bow volleys, battering ram thuds, wax-seal thumps, and rout drums.
 */

export class WarAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambienceGain = null;
    this.sfxGain = null;
    this.windFilter = null;
    this.muted = false;
    this.volume = 0.72;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.ambienceGain.gain.value = 0.2;
      this.sfxGain.gain.value = 0.82;
      this.ambienceGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this._applyGain();
      this._startWinterGale();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this._applyGain();
    return this.muted;
  }

  setWarTension(seasonIndex, inBattle) {
    if (!this.ctx || !this.ambienceGain || !this.windFilter) return;
    const cutoff = inBattle ? 1350 : 620 + seasonIndex * 220;
    const gain = inBattle ? 0.28 : 0.14 + seasonIndex * 0.03;
    this.windFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.35);
    this.ambienceGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.35);
  }

  _applyGain() {
    if (!this.master || !this.ctx) return;
    const g = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.04);
  }

  _startWinterGale() {
    const sr = this.ctx.sampleRate;
    const len = sr * 2;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.035 * w) / 1.035;
      data[i] = last * 2.1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    filter.Q.value = 0.9;
    src.connect(filter);
    filter.connect(this.ambienceGain);
    src.start();
    this.windFilter = filter;
  }

  _tone(freq, dur, gainVal, type = 'sine', detune = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detune, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.04);
  }

  _noise(dur, cutoff, gainVal, q = 1.3) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const len = Math.max(256, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
  }

  play(cue) {
    if (!this.ctx || this.muted) return;
    const jitter = (Math.random() - 0.5) * 38;
    switch (cue) {
      case 'step':
        this._noise(0.045, 520 + jitter * 2, 0.06);
        break;
      case 'scout':
        this._tone(310, 0.22, 0.1, 'triangle', jitter);
        setTimeout(() => this._tone(465, 0.24, 0.08, 'sine'), 65);
        break;
      case 'horn':
        this._tone(130, 0.95, 0.24, 'sawtooth', -8);
        this._tone(195, 0.85, 0.14, 'triangle', 6);
        break;
      case 'clash':
        this._noise(0.1, 2100 + jitter * 5, 0.18, 2.2);
        this._tone(160, 0.12, 0.16, 'triangle', jitter);
        break;
      case 'shield':
        this._tone(115, 0.14, 0.2, 'sine', jitter);
        this._noise(0.07, 680, 0.14, 1.0);
        break;
      case 'volley':
        this._noise(0.18, 1700 + jitter * 4, 0.15, 1.8);
        this._tone(380, 0.08, 0.06, 'triangle');
        break;
      case 'ram':
        this._tone(68, 0.42, 0.34, 'sawtooth');
        this._noise(0.28, 360, 0.26, 0.9);
        break;
      case 'rout':
        this._tone(96, 0.5, 0.22, 'sawtooth');
        setTimeout(() => this._tone(82, 0.55, 0.22, 'sawtooth'), 160);
        break;
      case 'raven':
        this._noise(0.14, 1180, 0.09);
        this._tone(620, 0.1, 0.08, 'triangle');
        break;
      case 'seal':
        this._tone(240, 0.18, 0.14, 'sine');
        this._tone(360, 0.22, 0.09, 'triangle');
        break;
      case 'muster':
        this._tone(196, 0.22, 0.16, 'triangle');
        setTimeout(() => this._tone(294, 0.28, 0.14, 'triangle'), 95);
        break;
      case 'victory':
        this._tone(196, 1.1, 0.22, 'triangle');
        setTimeout(() => this._tone(294, 1.2, 0.18, 'triangle'), 160);
        setTimeout(() => this._tone(392, 1.5, 0.2, 'sine'), 320);
        break;
      case 'defeat':
        this._tone(146, 0.9, 0.22, 'sawtooth');
        setTimeout(() => this._tone(110, 1.2, 0.24, 'sawtooth'), 220);
        break;
      default:
        break;
    }
  }
}

