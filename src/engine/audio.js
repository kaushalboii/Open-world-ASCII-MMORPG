/**
 * Procedural WebAudio soundscape: Master <- {Ambience, SFX} with bronze inharmonic synthesis.
 * Lazily unlocked on first user gesture; zero external audio assets required.
 */

export class BellAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambienceGain = null;
    this.sfxGain = null;
    this.rainNode = null;
    this.muted = false;
    this.volume = 0.7;
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

      this.ambienceGain.gain.value = 0.22;
      this.sfxGain.gain.value = 0.8;
      this.ambienceGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this._applyGain();
      this._startHarborRain();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this._applyGain();
    return this.muted;
  }

  setMistCalmness(rungCount) {
    if (!this.ambienceGain || !this.ctx) return;
    const level = Math.max(0.05, 0.24 - rungCount * 0.036);
    this.ambienceGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.4);
  }

  _applyGain() {
    if (!this.master || !this.ctx) return;
    const g = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.04);
  }

  _startHarborRain() {
    const sampleRate = this.ctx.sampleRate;
    const len = sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 2.2;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 920;
    filter.Q.value = 0.7;

    src.connect(filter);
    filter.connect(this.ambienceGain);
    src.start();
    this.rainNode = src;
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
    g.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  _noiseBurst(dur, cutoff, gainVal) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 1.4;
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
    const jitter = (Math.random() - 0.5) * 45;
    switch (cue) {
      case 'step':
        this._noiseBurst(0.045, 580 + jitter * 2, 0.06);
        break;
      case 'lamp':
        this._tone(440, 0.08, 0.06, 'triangle', jitter);
        break;
      case 'slash':
        this._noiseBurst(0.11, 1450 + jitter * 4, 0.16);
        this._tone(210, 0.09, 0.08, 'sawtooth', jitter);
        break;
      case 'hit':
        this._tone(110, 0.16, 0.25, 'triangle', jitter);
        this._noiseBurst(0.08, 920, 0.2);
        break;
      case 'hurt':
        this._tone(85, 0.24, 0.28, 'sawtooth', jitter);
        break;
      case 'parry_stance':
        this._tone(540, 0.12, 0.08, 'sine');
        break;
      case 'parry':
        this._tone(920, 0.45, 0.22, 'sine');
        this._tone(1380, 0.35, 0.14, 'triangle', 12);
        this._tone(2240, 0.28, 0.08, 'sine', -8);
        break;
      case 'fork':
        this._tone(220, 1.5, 0.19, 'sine');
        this._tone(607, 1.15, 0.10, 'sine', 6);
        this._tone(1188, 0.85, 0.05, 'sine', -6);
        break;
      case 'shatter':
        this._noiseBurst(0.22, 2400, 0.22);
        this._tone(780, 0.18, 0.11, 'triangle');
        break;
      case 'bell':
        this._tone(110, 2.8, 0.34, 'sine');
        this._tone(165, 2.4, 0.22, 'sine', 4);
        this._tone(275, 2.0, 0.14, 'triangle', -5);
        this._tone(418, 1.6, 0.08, 'sine', 9);
        break;
      case 'pickup':
        this._tone(587, 0.18, 0.11, 'sine');
        setTimeout(() => this._tone(784, 0.22, 0.11, 'sine'), 65);
        break;
      case 'temper':
        this._tone(660, 0.26, 0.15, 'triangle');
        setTimeout(() => this._tone(990, 0.32, 0.14, 'sine'), 90);
        break;
      case 'heal':
        this._tone(392, 0.24, 0.12, 'sine');
        setTimeout(() => this._tone(523, 0.28, 0.12, 'sine'), 90);
        break;
      case 'brazier':
        this._tone(294, 0.35, 0.14, 'sine');
        this._noiseBurst(0.18, 700, 0.08);
        break;
      case 'gate':
        this._tone(72, 0.55, 0.26, 'sawtooth');
        this._noiseBurst(0.32, 420, 0.16);
        break;
      default:
        break;
    }
  }
}
