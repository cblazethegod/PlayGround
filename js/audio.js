/* ═══════════════════════════════════════════════════════════════
   AUDIO — all music and SFX are synthesised at runtime.
   No samples, no downloads, no licensing headaches.
   ═══════════════════════════════════════════════════════════════ */

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// scale = semitone offsets from root
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.delay = null;
    this.noiseBuffer = null;
    this.theme = null;
    this.running = false;
    this.paused = false;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this.startAt = 0;
    this.timer = null;
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
    this.muted = false;
    this.lastSfx = 0;
    this._beat = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(comp).connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicVolume * 0.55;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume * 0.9;
    this.sfxBus.connect(this.master);

    // dotted-eighth-ish delay for the lead
    this.delay = this.ctx.createDelay(1.4);
    this.delay.delayTime.value = 0.28;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.3;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.22;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.musicBus);

    this._buildNoise();
    this.setMusicVolume(this.musicVolume);
    this.setSfxVolume(this.sfxVolume);
  }

  _buildNoise() {
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMasterMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.03);
  }

  setMusicVolume(v) {
    this.musicVolume = clamp(v, 0, 1);
    if (this.ctx && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.paused ? 0.0001 : this.musicVolume * 0.55, this.ctx.currentTime, 0.04);
    }
  }

  setSfxVolume(v) {
    this.sfxVolume = clamp(v, 0, 1);
    if (this.ctx && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.sfxVolume * 0.9, this.ctx.currentTime, 0.04);
    }
  }

  duck(paused) {
    this.paused = paused;
    if (!this.ctx || !this.musicBus) return;
    this.musicBus.gain.setTargetAtTime(paused ? 0.0001 : this.musicVolume * 0.55, this.ctx.currentTime, 0.05);
  }

  /* ───────────── music ───────────── */

  startMusic(theme) {
    this.init();
    if (!this.ctx) return;
    this.stopMusic(0.06, true);
    this.theme = { ...theme, scale: theme.scale || MINOR };
    this.step = 0;
    this.bar = 0;
    this.startAt = this.ctx.currentTime + 0.08;
    this.nextTime = this.startAt;
    this.running = true;
    this.paused = false;
    this.duck(false);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 25);
    this._schedule();
  }

  stopMusic(fade = 0.15, keepTheme = false) {
    if (!this.ctx) return;
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (!keepTheme) this.theme = null;
    // A quick fade avoids clicks from killing scheduled oscillators.
    if (this.musicBus) {
      const t = this.ctx.currentTime;
      const g = this.musicBus.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.0001, t, fade / 3);
      setTimeout(() => {
        if (this.running || !this.ctx) return;
        g.setTargetAtTime(keepTheme ? this.musicVolume * 0.55 : this.musicVolume * 0.55, this.ctx.currentTime, 0.03);
      }, fade * 1000 + 80);
    }
  }

  _schedule() {
    if (!this.running || !this.ctx || this.paused) return;
    const ahead = 0.14;
    if (this.nextTime < this.ctx.currentTime - 0.25) {
      // tab was throttled — resync without dumping a wall of notes
      this.nextTime = this.ctx.currentTime + 0.02;
      this.step = Math.ceil(this.step / 16) * 16;
    }
    while (this.nextTime < this.ctx.currentTime + ahead) {
      this._playStep(this.step, this.nextTime);
      this.nextTime += 60 / this.theme.bpm / 4;
      this.step++;
    }
  }

  _playStep(step, t) {
    const th = this.theme;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const section = this._section(bar);
    const energy = section === 'intro' ? 0.35 : section === 'build' ? 0.7 : section === 'break' ? 0.25 : 1;
    const scale = th.scale;
    const prog = th.progression || [0, 5, 3, 7];
    const degree = prog[bar % prog.length];
    const chordRoot = th.root + scale[degree % scale.length] + (degree >= scale.length ? 12 : 0);

    // ── drums ──
    if (section !== 'break') {
      if (s === 0 || s === 8 || (energy > 0.8 && (s === 4 || s === 12))) this._kick(t, 0.9 * energy + 0.1);
      if (s === 4 || s === 12) this._snare(t, section === 'build' ? 0.35 : 0.5);
      if (s % 2 === 0) this._hat(t, s === 14 ? 0.4 : 0.18, s === 14);
      if (s === 0 && bar % 8 === 0) this._crash(t, 0.26);
    } else if (s % 4 === 0) {
      this._hat(t, 0.12, false);
    }

    // ── bass ──
    if (section === 'build' || section === 'drop') {
      const bassNotes = [0, 3, 6, 8, 10, 14];
      if (bassNotes.includes(s)) {
        const oct = s === 0 ? 0 : (s === 8 ? 0 : 12);
        this._bass(t, chordRoot - 24 + oct, 60 / th.bpm / 4 * (s === 0 ? 3 : 1.3), 0.42);
      }
    }

    // ── pad / chord ──
    if (s === 0 && section !== 'break') {
      const third = scale[(degree + 2) % scale.length] - scale[degree % scale.length];
      const fifth = scale[(degree + 4) % scale.length] - scale[degree % scale.length];
      const tones = [0, third < 0 ? third + 12 : third, fifth < 0 ? fifth + 12 : fifth];
      for (const tone of tones) {
        this._pad(t, chordRoot + tone, 60 / th.bpm * 2.2, 0.09 * energy + 0.02);
      }
    }

    // ── arp lead ──
    if (section === 'drop' || (section === 'build' && bar % 2 === 1)) {
      const arp = [0, 2, 4, 2, 4, 6, 4, 2];
      if (s % 2 === 0) {
        const idx = arp[(s / 2) % arp.length];
        const note = th.root + 24 + scale[(degree + idx) % scale.length] + (idx >= scale.length ? 12 : 0);
        const vel = s === 0 ? 0.12 : 0.085;
        this._lead(t, note, 60 / th.bpm / 4 * 1.4, vel);
      }
      if (section === 'drop' && bar % 4 === 2 && s === 15) {
        this._lead(t, th.root + 36 + scale[degree % scale.length], 0.12, 0.09);
      }
    }

    // ── sparkle fills ──
    if (section === 'drop' && bar % 4 === 3 && s >= 12) {
      this._bell(t, th.root + 48 + scale[(degree + (s - 12)) % scale.length], 0.09);
    }
  }

  _section(bar) {
    const cycle = bar % 32;
    if (cycle < 2) return 'intro';
    if (cycle < 4) return 'build';
    if (cycle >= 24 && cycle < 26) return 'break';
    return 'drop';
  }

  /* ───────────── instruments ───────────── */

  _env(gain, t, attack, hold, release, peak) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  _kick(t, vel) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g).connect(this.musicBus);
    o.start(t); o.stop(t + 0.36);

    const click = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1200, t);
    click.frequency.exponentialRampToValueAtTime(300, t + 0.02);
    cg.gain.setValueAtTime(0.2 * vel, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    click.connect(cg).connect(this.musicBus);
    click.start(t); click.stop(t + 0.04);
  }

  _snare(t, vel) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2100;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t); src.stop(t + 0.2);

    const body = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(185, t);
    body.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    bg.gain.setValueAtTime(vel * 0.55, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    body.connect(bg).connect(this.musicBus);
    body.start(t); body.stop(t + 0.14);
  }

  _hat(t, vel, open) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.16 : 0.045));
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t); src.stop(t + 0.18);
  }

  _crash(t, vel) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 4200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t); src.stop(t + 0.95);
  }

  _bass(t, note, dur, vel) {
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o2.type = 'square';
    o.frequency.value = midi(note);
    o2.frequency.value = midi(note) * 0.5;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1300, t);
    f.frequency.exponentialRampToValueAtTime(260, t + dur);
    f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.setValueAtTime(vel, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g).connect(this.musicBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  _pad(t, note, dur, vel) {
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = 'triangle';
    o2.type = 'sawtooth';
    o.frequency.value = midi(note);
    o2.frequency.value = midi(note) * 1.005;
    f.type = 'lowpass';
    f.frequency.value = 1500;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.18);
    g.gain.setValueAtTime(vel, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g).connect(this.musicBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  _lead(t, note, dur, vel) {
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = 'square';
    o2.type = 'sawtooth';
    o.frequency.value = midi(note);
    o2.frequency.value = midi(note + 12);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(1500, t + dur);
    f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g);
    g.connect(this.musicBus);
    g.connect(this.delay);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  _bell(t, note, vel) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = midi(note);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.musicBus);
    o.start(t); o.stop(t + 0.52);
  }

  /* ───────────── SFX ───────────── */

  sfx(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if (name === 'death' || name === 'complete') {
      // allowed to overlap
    } else if (t - this.lastSfx < 0.018) return;
    this.lastSfx = t;

    switch (name) {
      case 'jump': {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(480, t);
        o.frequency.exponentialRampToValueAtTime(820, t + 0.06);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.11, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g).connect(this.sfxBus);
        o.start(t); o.stop(t + 0.1);
        break;
      }
      case 'land': {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        o.connect(g).connect(this.sfxBus);
        o.start(t); o.stop(t + 0.11);
        break;
      }
      case 'orb': {
        this._sweep(t, 'triangle', 420, 1500, 0.16, 0.14);
        break;
      }
      case 'pad': {
        this._sweep(t, 'sawtooth', 260, 1250, 0.22, 0.1);
        break;
      }
      case 'portal': {
        this._sweep(t, 'sine', 260, 980, 0.28, 0.12);
        this._sweep(t + 0.03, 'triangle', 520, 1600, 0.22, 0.06);
        break;
      }
      case 'coin': {
        this._tone(t, 'sine', 1046, 0.09, 0.12);
        this._tone(t + 0.06, 'sine', 1568, 0.16, 0.12);
        this._tone(t + 0.06, 'triangle', 2093, 0.12, 0.04);
        break;
      }
      case 'checkpoint': {
        this._tone(t, 'sine', 880, 0.07, 0.09);
        this._tone(t + 0.07, 'sine', 1320, 0.12, 0.09);
        break;
      }
      case 'death': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(5000, t);
        f.frequency.exponentialRampToValueAtTime(300, t + 0.35);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.36, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        src.connect(f).connect(g).connect(this.sfxBus);
        src.start(t); src.stop(t + 0.45);
        this._sweep(t, 'sawtooth', 220, 42, 0.36, 0.18);
        break;
      }
      case 'complete': {
        const notes = [0, 4, 7, 12, 16, 19, 24];
        notes.forEach((n, i) => {
          this._tone(t + i * 0.075, i % 2 ? 'triangle' : 'square', midi(60 + n), 0.55, i === notes.length - 1 ? 0.13 : 0.07);
        });
        break;
      }
      case 'click': {
        this._tone(t, 'square', 660, 0.03, 0.035);
        break;
      }
      case 'unlock': {
        const notes = [0, 7, 12, 19];
        notes.forEach((n, i) => this._tone(t + i * 0.09, 'triangle', midi(64 + n), 0.4, 0.075));
        break;
      }
      default: break;
    }
  }

  _tone(t, type, freq, dur, vel) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _sweep(t, type, from, to, dur, vel) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  beatPulse() {
    if (!this.ctx || !this.running || this.paused || !this.theme) return 0;
    const bpm = this.theme.bpm;
    const beat = 60 / bpm;
    const elapsed = Math.max(0, this.ctx.currentTime - this.startAt);
    const phase = (elapsed % beat) / beat;
    return Math.pow(1 - phase, 3);
  }
}

export { MINOR, MAJOR };
