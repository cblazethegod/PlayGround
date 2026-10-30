/* ═══════════════════════════════════════════════════════════════
   LEVELS — hand-tuned pattern pools assembled by a seeded builder.
   Every hazard is spaced against the jump arc, so every run is fair.
   ═══════════════════════════════════════════════════════════════ */

import { MINOR, MAJOR } from './audio.js';

const TAU = Math.PI * 2;

/* ── deterministic RNG ── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = (rng, a, b) => a + rng() * (b - a);
const pickOne = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/* ── visual themes ── */
export const THEMES = {
  neon: {
    id: 'neon',
    sky1: '#05051c', sky2: '#111a5e', sky3: '#2a0b48',
    accent: '#00e5ff', accent2: '#ff2d95', accent3: '#7b61ff',
    block: '#241b6e', blockEdge: '#7df9ff', blockTop: '#39e6ff',
    spike: '#ff2d95', spikeEdge: '#ffd1f0',
    ground: '#08071f', grid: '#21328f', horizon: '#8a2cff',
    player: ['#00f0ff', '#0066ff', '#a8fbff'],
    particle: '#66f6ff', sun: '#ff2d95', fog: 'rgba(0,229,255,.12)',
    audio: { bpm: 128, root: 45, scale: MINOR, progression: [0, 5, 3, 7] }
  },
  crimson: {
    id: 'crimson',
    sky1: '#14030a', sky2: '#4a0b20', sky3: '#7a1a18',
    accent: '#ff9f1c', accent2: '#ff2d55', accent3: '#ff5e3a',
    block: '#5c1027', blockEdge: '#ffb347', blockTop: '#ff7a1a',
    spike: '#ff2d55', spikeEdge: '#ffd6b8',
    ground: '#160410', grid: '#7e1d32', horizon: '#ff4d00',
    player: ['#ffb347', '#ff3d00', '#ffe0a3'],
    particle: '#ffb347', sun: '#ff5e3a', fog: 'rgba(255,77,0,.13)',
    audio: { bpm: 140, root: 43, scale: MINOR, progression: [0, 3, 5, 6] }
  },
  electric: {
    id: 'electric',
    sky1: '#06031c', sky2: '#241064', sky3: '#3d0d5e',
    accent: '#a78bfa', accent2: '#22d3ee', accent3: '#f472b6',
    block: '#241c72', blockEdge: '#c4b5fd', blockTop: '#8b5cf6',
    spike: '#22d3ee', spikeEdge: '#d8ffff',
    ground: '#08051f', grid: '#312795', horizon: '#7c3aed',
    player: ['#c4b5fd', '#7c3aed', '#f0abfc'],
    particle: '#c4b5fd', sun: '#22d3ee', fog: 'rgba(167,139,250,.14)',
    audio: { bpm: 148, root: 44, scale: MINOR, progression: [0, 5, 1, 6] }
  },
  void: {
    id: 'void',
    sky1: '#020a06', sky2: '#073322', sky3: '#0a4a2a',
    accent: '#7cffb2', accent2: '#e9ff70', accent3: '#00e5ff',
    block: '#0c3a25', blockEdge: '#aaffcf', blockTop: '#3dff9a',
    spike: '#e9ff70', spikeEdge: '#feffd6',
    ground: '#020d08', grid: '#10603c', horizon: '#00ffa3',
    player: ['#e9ff70', '#00c977', '#f7ffd0'],
    particle: '#7cffb2', sun: '#e9ff70', fog: 'rgba(124,255,178,.12)',
    audio: { bpm: 160, root: 42, scale: MINOR, progression: [0, 2, 5, 6] }
  },
  endless: {
    id: 'endless',
    sky1: '#06021c', sky2: '#2b0a55', sky3: '#4e0a3d',
    accent: '#ff2d95', accent2: '#00e5ff', accent3: '#a78bfa',
    block: '#3a1160', blockEdge: '#ff9fe0', blockTop: '#ff2d95',
    spike: '#00e5ff', spikeEdge: '#d6ffff',
    ground: '#07031b', grid: '#48198f', horizon: '#ff2d95',
    player: ['#ff2d95', '#7b61ff', '#ffd6f2'],
    particle: '#ff9fe0', sun: '#00e5ff', fog: 'rgba(255,45,149,.13)',
    audio: { bpm: 152, root: 46, scale: MINOR, progression: [0, 5, 3, 6] }
  }
};

/* ── builder ── */
class Builder {
  constructor(seed, theme) {
    this.rng = mulberry32(seed);
    this.theme = theme;
    this.objects = [];
    this.x = 0;
    this.mode = 'cube';
    this.coinCount = 0;
    this.lastId = '';
    this.lastHazardEnd = 0;
  }

  hazardEnd(o) {
    if (o.type === 'block') return o.x + o.w;
    if (o.type === 'saw') return o.x + o.r;
    if (o.type === 'spike') return o.x + 0.55;
    return 0;
  }

  noteHazards(from) {
    for (let i = from; i < this.objects.length; i++) {
      this.lastHazardEnd = Math.max(this.lastHazardEnd, this.hazardEnd(this.objects[i]));
    }
  }
  add(o) { this.objects.push(o); return o; }
  spike(x, y = 0, dir = 1) { return this.add({ type: 'spike', x, y, dir }); }
  block(x, y, w = 1, h = 1) { return this.add({ type: 'block', x, y, w, h }); }
  saw(x, y, r = 0.72) { return this.add({ type: 'saw', x, y, r }); }
  pad(x, y = 0, power = 1.42) { return this.add({ type: 'pad', x, y, power }); }
  orb(x, y) { return this.add({ type: 'orb', x, y }); }
  coin(x, y) { return this.add({ type: 'coin', x, y, id: this.coinCount++ }); }
  portal(x, mode) { return this.add({ type: 'portal', x, y: 4, mode }); }
  finish(x) { return this.add({ type: 'finish', x }); }

  pattern(p, diff) {
    const x = this.x;
    const start = this.objects.length;
    const w = p.make(this, x, this.rng, diff);
    const fresh = this.objects.slice(start);

    // Keep consecutive hazards at least one jump-arc apart. Patterns are
    // authored with their own buffer, but two buffers can still add up to a
    // landing directly on the next hazard.
    const gap = this.mode === 'cube' ? 7.6 : this.mode === 'ship' ? 5.8 : 7.2;
    const first = fresh.find((o) => o.type === 'spike' || o.type === 'saw' || o.type === 'block');
    if (first && this.lastHazardEnd > 0) {
      const left = first.type === 'block' ? first.x : first.type === 'saw' ? first.x - first.r : first.x;
      const shift = Math.max(0, this.lastHazardEnd + gap - left);
      if (shift > 0) for (const o of fresh) o.x += shift;
      this.x = x + shift + w;
    } else {
      this.x = x + w;
    }

    this.noteHazards(start);
    this.lastId = p.id;
  }

  transition(mode) {
    if (mode === this.mode) return;
    this.x += 2;
    this.portal(this.x, mode);
    this.mode = mode;
    // mode portals get a generous clear runway on both sides
    this.x += mode === 'ship' ? 13 : 12;
    this.lastHazardEnd = 0;
  }
}

/* ═══════════════════════════════════════════════════════════════
   CUBE PATTERNS
   width includes a trailing buffer of at least 3 tiles.
   ═══════════════════════════════════════════════════════════════ */
const CUBE = [
  {
    id: 'single', min: 0, max: 9,
    make(b, x) { b.spike(x + 3.9); return 10.5; }
  },
  {
    id: 'stagger', min: 0.7, max: 9,
    make(b, x) { b.spike(x + 3.9); b.spike(x + 11.4); return 17.5; }
  },
  {
    id: 'double', min: 1.0, max: 9,
    make(b, x) { b.spike(x + 3.9); b.spike(x + 4.9); return 11.5; }
  },
  {
    id: 'triple', min: 1.5, max: 9,
    make(b, x) { b.spike(x + 3.9); b.spike(x + 4.9); b.spike(x + 5.9); return 13; }
  },
  {
    id: 'step', min: 0.5, max: 9,
    make(b, x) { b.block(x + 4.4, 0, 2.2, 1); return 11.5; }
  },
  {
    id: 'stepSpike', min: 1.2, max: 9,
    make(b, x, rng) {
      b.block(x + 4.2, 0, 2.4, 1);
      b.spike(x + 11.2 + rnd(rng, 0, 0.6));
      return 18;
    }
  },
  {
    id: 'twinSteps', min: 1.0, max: 9,
    make(b, x, rng) {
      b.block(x + 4.2, 0, 2.2, 1);
      b.block(x + 10.6 + rnd(rng, 0, 0.5), 0, 2.2, 1);
      return 17;
    }
  },
  {
    id: 'platform', min: 1.9, max: 9,
    make(b, x) {
      b.block(x + 3.8, 0, 3.6, 1);
      b.block(x + 8.2, 1, 3.4, 1);
      return 16.5;
    }
  },
  {
    id: 'tallStep', min: 2.4, max: 9,
    make(b, x) {
      b.block(x + 4.0, 0, 3.2, 1);
      b.block(x + 9.0, 0, 2, 2);
      b.spike(x + 15.0);
      return 21;
    }
  },
  {
    id: 'saw', min: 0.8, max: 9,
    make(b, x, rng) { b.saw(x + 4.6, 0.95 + rnd(rng, 0, 0.25), 0.72); return 11.5; }
  },
  {
    id: 'sawPair', min: 1.8, max: 9,
    make(b, x, rng) {
      b.saw(x + 4.4, 1.0, 0.7);
      b.saw(x + 11.8 + rnd(rng, 0, 0.6), 1.0, 0.7);
      return 19.5;
    }
  },
  {
    id: 'lowSaw', min: 2.2, max: 9,
    make(b, x) { b.saw(x + 4.6, 0.62, 0.55); return 12; }
  },
  {
    id: 'padWall', min: 1.0, max: 9,
    make(b, x) {
      b.pad(x + 3.6);
      b.spike(x + 7.0); b.spike(x + 8.0); b.spike(x + 9.0);
      return 18.5;
    }
  },
  {
    id: 'orbHop', min: 1.5, max: 9,
    make(b, x) {
      b.spike(x + 4.1);
      b.orb(x + 6.3, 3.15);
      b.spike(x + 11.0); b.spike(x + 12.0);
      return 19.5;
    }
  },
  {
    id: 'orbGap', min: 2.0, max: 9,
    make(b, x) {
      b.spike(x + 4.0); b.spike(x + 5.0);
      b.orb(x + 9.8, 2.5);
      b.spike(x + 14.0); b.spike(x + 15.0); b.spike(x + 16.0);
      return 24.5;
    }
  },
  {
    id: 'doubleBlock', min: 1.3, max: 9,
    make(b, x, rng) {
      b.block(x + 4.2, 0, 2.2, 1);
      b.block(x + 10.8 + rnd(rng, 0, 0.6), 0, 2.2, 1);
      return 17.5;
    }
  },
  {
    id: 'spikeSaw', min: 2.0, max: 9,
    make(b, x) {
      b.spike(x + 4.0);
      b.saw(x + 11.2, 1.05, 0.68);
      return 18;
    }
  },
  {
    id: 'stepSaw', min: 2.5, max: 9,
    make(b, x) {
      b.block(x + 4.0, 0, 2.2, 1);
      b.saw(x + 14.2, 1.25, 0.66);
      return 20.5;
    }
  }
];

/* ═══════════════════════════════════════════════════════════════
   SHIP PATTERNS
   ═══════════════════════════════════════════════════════════════ */
const SHIP = [
  {
    id: 'floorPillar', min: 0, max: 9,
    make(b, x, rng) {
      b.block(x + 5.2, 0, 1.5, 3.1 + rnd(rng, 0, 0.4));
      return 14;
    }
  },
  {
    id: 'ceilingPillar', min: 0.8, max: 9,
    make(b, x, rng) {
      b.block(x + 5.2, 5.3 + rnd(rng, -0.2, 0.2), 1.5, 2.7);
      return 14;
    }
  },
  {
    id: 'pillarPair', min: 1.1, max: 9,
    make(b, x, rng) {
      b.block(x + 5.0, 0, 1.5, 2.9 + rnd(rng, 0, 0.5));
      b.block(x + 13.0 + rnd(rng, 0, 1), 5.2, 1.5, 2.8);
      return 22;
    }
  },
  {
    id: 'gate', min: 1.4, max: 9,
    make(b, x) {
      b.block(x + 5.2, 0, 1.5, 2);
      b.block(x + 5.2, 6.6, 1.5, 1.4);
      return 15;
    }
  },
  {
    id: 'saw', min: 1.0, max: 9,
    make(b, x, rng) {
      b.saw(x + 6.2, 3.8 + rnd(rng, -0.4, 0.4), 0.88);
      return 14.5;
    }
  },
  {
    id: 'floorSpikes', min: 0.6, max: 9,
    make(b, x) {
      b.spike(x + 5.2); b.spike(x + 6.2); b.spike(x + 7.2);
      return 15;
    }
  },
  {
    id: 'ceilingSpikes', min: 1.5, max: 9,
    make(b, x) {
      b.spike(x + 5.2, 8, -1); b.spike(x + 6.2, 8, -1); b.spike(x + 7.2, 8, -1);
      return 15.5;
    }
  },
  {
    id: 'zigzag', min: 2.0, max: 9,
    make(b, x) {
      b.block(x + 5.0, 0, 1.5, 3.2);
      b.block(x + 12.0, 5.0, 1.5, 3);
      b.block(x + 19.0, 0, 1.5, 3.2);
      return 27;
    }
  },
  {
    id: 'tunnel', min: 1.7, max: 9,
    make(b, x) {
      b.block(x + 5.0, 0, 10, 2.1);
      b.block(x + 5.0, 6.3, 10, 1.7);
      return 21;
    }
  },
  {
    id: 'slalom', min: 2.5, max: 9,
    make(b, x) {
      b.block(x + 4.8, 0, 1.4, 3.1);
      b.block(x + 10.0, 4.9, 1.4, 3.1);
      b.block(x + 15.2, 0, 1.4, 3.3);
      b.block(x + 20.4, 5.0, 1.4, 3.0);
      return 28;
    }
  }
];

/* ═══════════════════════════════════════════════════════════════
   BALL PATTERNS — ceiling sits at y = 8
   ═══════════════════════════════════════════════════════════════ */
const BALL = [
  {
    id: 'flipSpike', min: 0, max: 9,
    make(b, x) { b.spike(x + 6.2); return 15; }
  },
  {
    id: 'floorRow', min: 0.6, max: 9,
    make(b, x) { b.spike(x + 6.2); b.spike(x + 7.2); return 15.5; }
  },
  {
    id: 'ceilingRow', min: 1.0, max: 9,
    make(b, x) { b.spike(x + 6.2, 8, -1); b.spike(x + 7.2, 8, -1); return 16; }
  },
  {
    id: 'alternate', min: 1.2, max: 9,
    make(b, x) {
      b.spike(x + 6.2);
      b.spike(x + 15.2, 8, -1);
      b.spike(x + 24.2);
      return 32;
    }
  },
  {
    id: 'sawCenter', min: 1.4, max: 9,
    make(b, x, rng) {
      b.saw(x + 8.0, 3.9 + rnd(rng, -0.15, 0.15), 0.95);
      return 18;
    }
  },
  {
    id: 'doubleFlip', min: 2.2, max: 9,
    make(b, x) {
      b.spike(x + 6.0);
      b.spike(x + 14.0, 8, -1);
      b.spike(x + 22.0);
      b.spike(x + 30.0, 8, -1);
      return 38;
    }
  },
  {
    id: 'sawSpike', min: 2.6, max: 9,
    make(b, x) {
      b.spike(x + 5.8);
      b.saw(x + 13.0, 4.0, 0.9);
      b.spike(x + 20.4, 8, -1);
      return 28;
    }
  }
];

const patternFor = (pool, diff, last) => {
  let candidates = pool.filter((p) => diff >= p.min && diff <= p.max);
  if (!candidates.length) candidates = pool;
  const fresh = candidates.filter((p) => p.id !== last);
  return pickOne(builderRng, fresh.length ? fresh : candidates);
};

// `patternFor` needs the current builder's rng; swapped per call.
let builderRng = Math.random;

function makePattern(b, pool, diff) {
  builderRng = b.rng;
  const p = patternFor(pool, diff, b.lastId);
  b.pattern(p, diff);
}

/* ═══════════════════════════════════════════════════════════════
   COIN BONUS WINDOWS
   ═══════════════════════════════════════════════════════════════ */
function coinWindow(b) {
  // The cube coin sits over a spike, so reserve the same landing gap as a
  // regular pattern. Ship/ball coins float in open air.
  if (b.mode === 'cube') {
    if (b.lastHazardEnd + 7.6 > b.x + 5.2) b.x = b.lastHazardEnd + 7.6 - 5.2;
    const spike = b.spike(b.x + 5.2);
    b.coin(b.x + 5.2, 3.15);
    b.x += 12.5;
    b.lastHazardEnd = b.hazardEnd(spike);
  } else if (b.mode === 'ship') {
    b.coin(b.x + 5.5, 4.2);
    b.x += 12.5;
  } else {
    b.coin(b.x + 5.5, 4.0);
    b.x += 12.5;
  }
  b.lastId = 'coin';
}

/* ═══════════════════════════════════════════════════════════════
   LEVEL RECIPES
   ═══════════════════════════════════════════════════════════════ */
export const LEVELS = [
  {
    id: 'neon',
    name: 'NEON RUNNER',
    subtitle: 'STEREO SKYLINE',
    difficulty: 'EASY',
    diffBars: 1,
    theme: 'neon',
    seed: 0x5eed01,
    speed: 1,
    target: 0,
    acts: [
      { mode: 'cube', count: 22, diff: 1.05 },
      { mode: 'ship', count: 7, diff: 1.0 },
      { mode: 'cube', count: 16, diff: 1.55 },
      { mode: 'ball', count: 6, diff: 1.1 },
      { mode: 'cube', count: 15, diff: 1.85 }
    ]
  },
  {
    id: 'crimson',
    name: 'CRIMSON CIRCUIT',
    subtitle: 'BURN THE MIDNIGHT',
    difficulty: 'NORMAL',
    diffBars: 2,
    theme: 'crimson',
    seed: 0xc41f2a,
    speed: 1.05,
    acts: [
      { mode: 'cube', count: 20, diff: 1.6 },
      { mode: 'ship', count: 9, diff: 1.35 },
      { mode: 'cube', count: 18, diff: 2.0 },
      { mode: 'ball', count: 8, diff: 1.5 },
      { mode: 'cube', count: 18, diff: 2.25 }
    ]
  },
  {
    id: 'electric',
    name: 'ELECTRIC DREAM',
    subtitle: 'SLEEPWALK THE GRID',
    difficulty: 'HARD',
    diffBars: 3,
    theme: 'electric',
    seed: 0xe1ec7c,
    speed: 1.1,
    acts: [
      { mode: 'cube', count: 20, diff: 2.0 },
      { mode: 'ship', count: 11, diff: 1.8 },
      { mode: 'ball', count: 9, diff: 1.8 },
      { mode: 'cube', count: 20, diff: 2.45 },
      { mode: 'ship', count: 10, diff: 2.2 },
      { mode: 'cube', count: 20, diff: 2.65 }
    ]
  },
  {
    id: 'void',
    name: 'VOID OVERDRIVE',
    subtitle: 'NO SIGNAL · NO MERCY',
    difficulty: 'INSANE',
    diffBars: 4,
    theme: 'void',
    seed: 0x0b1ade,
    speed: 1.15,
    acts: [
      { mode: 'cube', count: 18, diff: 2.4 },
      { mode: 'ship', count: 12, diff: 2.3 },
      { mode: 'ball', count: 10, diff: 2.2 },
      { mode: 'cube', count: 18, diff: 2.8 },
      { mode: 'ship', count: 12, diff: 2.6 },
      { mode: 'cube', count: 22, diff: 3.1 }
    ]
  }
];

export const ENDLESS = {
  id: 'endless',
  name: 'ENDLESS DRIVE',
  subtitle: 'HOW FAR CAN YOU GO?',
  difficulty: 'ENDLESS',
  diffBars: 5,
  theme: 'endless',
  seed: 0xdeadb33f,
  speed: 1.06,
  endless: true,
  acts: []
};

/* ═══════════════════════════════════════════════════════════════
   ASSEMBLE
   ═══════════════════════════════════════════════════════════════ */
function assemble(def) {
  const theme = THEMES[def.theme];
  const b = new Builder(def.seed, theme);

  // calm runway so players can find the beat
  b.x = 16;
  b.x += 24;

  const patterns = def.endless
    ? buildEndlessActs(b)
    : def.acts;

  // total pattern count, used to drop coins at musical thirds
  const totalPatterns = patterns.reduce((n, a) => n + a.count, 0);
  const coinMarks = [0.28, 0.54, 0.79];
  let patternIndex = 0;

  for (let a = 0; a < patterns.length; a++) {
    const act = patterns[a];
    b.transition(act.mode);
    for (let i = 0; i < act.count; i++) {
      const t = totalPatterns > 1 ? patternIndex / (totalPatterns - 1) : 0;
      if (b.coinCount < coinMarks.length && t >= coinMarks[b.coinCount]) {
        coinWindow(b);
      }
      const jitter = act.diff > 2 ? 1.06 : 1;
      // ramp the difficulty inside each act
      const local = act.diff + (i / Math.max(1, act.count - 1)) * (act.ramp || 0.35);
      const pool = act.mode === 'cube' ? CUBE : act.mode === 'ship' ? SHIP : BALL;
      makePattern(b, pool, Math.min(local, 3.4) * jitter);
      patternIndex++;
    }
  }

  // collect any coins we somehow skipped
  let guard = 0;
  while (b.coinCount < 3 && guard++ < 20) {
    b.transition('cube');
    coinWindow(b);
  }

  b.x += 14;
  const finishX = Math.round(b.x);
  b.finish(finishX);
  b.x += 18;

  // spawn just after the start line
  const spawnX = 2;
  const objects = b.objects;
  const coins = objects.filter((o) => o.type === 'coin').map((o) => o.id);

  return {
    ...def,
    theme,
    objects,
    finishX,
    spawnX,
    length: b.x,
    ceilingY: 8,
    coinTotal: coins.length,
    // audio config
    audio: { ...theme.audio, bpm: theme.audio.bpm }
  };
}

function buildEndlessActs(b) {
  const acts = [];
  const seq = ['cube', 'ship', 'ball', 'cube', 'cube', 'ship', 'ball', 'cube', 'ship', 'cube'];
  let i = 0;
  let tiles = 0;
  let seedAct = 0;
  while (tiles < 2400) {
    const mode = seq[i % seq.length];
    const count = mode === 'cube' ? 16 : mode === 'ship' ? 8 : 7;
    const diff = Math.min(3.3, 1.15 + seedAct * 0.23);
    acts.push({ mode, count, diff, ramp: 0.45 });
    tiles += count * 13;
    seedAct++;
    i++;
  }
  return acts;
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════ */
export function buildLevelById(id) {
  if (id === 'endless') return assemble(ENDLESS);
  const def = LEVELS.find((l) => l.id === id);
  if (!def) return assemble(LEVELS[0]);
  return assemble(def);
}

export function buildAllLevels() {
  return LEVELS.map((def) => assemble(def));
}

export function levelIndex(id) {
  return LEVELS.findIndex((l) => l.id === id);
}

export { TAU };
