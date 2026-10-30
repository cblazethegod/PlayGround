/* ═══════════════════════════════════════════════════════════════
   GAME ENGINE — fixed-step physics, modes, particles, audio hookup.
   ═══════════════════════════════════════════════════════════════ */

import { THEMES } from './levels.js';
import { getIcon } from './icons.js';
import { Renderer } from './render.js';

const GRAVITY = 70;
const BALL_GRAVITY = 82;
const JUMP_V = 19.2;
const ORB_V = 18.6;
const PAD_V = 28;
const BASE_SPEED = 10.5;
const SHIP_ACC = 46;
const SHIP_MAX = 11;
const HALF = 0.32;
const FIXED = 1 / 120;
const STAR_ATTEMPT = 0.62;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor(canvas, audio, callbacks = {}) {
    this.canvas = canvas;
    this.audio = audio;
    this.callbacks = callbacks;
    this.renderer = new Renderer(canvas);

    this.state = 'menu';
    this.animTime = 0;
    this.time = 0;
    this.menuScroll = 0;
    this.menuTheme = THEMES.neon;
    this.theme = THEMES.neon;

    this.icon = getIcon('cyan');
    this.trailColor = '#00e5ff';
    this.settings = { shake: true, particles: true, haptics: true };

    this.level = null;
    this.player = null;
    this.particles = [];
    this.trail = [];
    this.coins = [false, false, false];
    this.usedOrbs = new Set();
    this.usedPads = new Set();
    this.triggeredPortals = new Set();
    this.checkpoint = null;
    this.checkpointFlag = null;

    this.practice = false;
    this.endless = false;
    this.attempts = 0;
    this.maxPercent = 0;
    this.percent = 0;
    this.lastPct = -1;
    this.lastCoin = -1;
    this.elapsed = 0;
    this.jumps = 0;
    this.score = 0;

    this.cameraX = 0;
    this.viewW = 17;
    this.viewH = 10;
    this.scale = 1;
    this.groundScreen = 0;
    this.currentSpeed = BASE_SPEED;

    this.shake = 0;
    this.flash = { color: 'rgba(255,255,255,ALPHA)', a: 0 };
    this.beatPulse = 0;
    this.acc = 0;
    this.deathTimer = 0;
    this.deathCause = '';

    this.input = {
      pointers: new Set(),
      key: false,
      buffer: 0,
      tap: false,
      everPressed: false
    };

    this._last = 0;
    this._loop = this._loop.bind(this);
    this.resize = this.resize.bind(this);
    this.blur = this.blur.bind(this);

    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this.resize);
    window.addEventListener('blur', this.blur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.callbacks.autoPause?.();
    });

    this.bindInput();
    this.resize();
    requestAnimationFrame(this._loop);
  }

  /* ───────────────────────── setup ───────────────────────── */

  resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const aspect = W / Math.max(1, H);
    const desiredW = aspect < 0.8 ? 11 : aspect < 1.35 ? 13.5 : 17;
    const scale = Math.min(W / desiredW, H / 10.8);
    const ground = H - clamp(H * 0.13, 54, 130);

    this.scale = scale;
    this.groundScreen = ground;
    this.viewW = W / scale;
    this.viewH = H / scale;
    this.renderer.resize(W, H, dpr, scale, ground);
    if (this.player) this.cameraX = this.player.x - this.viewW * 0.3;
  }

  bindInput() {
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.state === 'menu' || this.state === 'paused' || this.state === 'complete' || this.state === 'over') return;
      e.preventDefault?.();
      this.input.pointers.add(e.pointerId);
      this.press();
    };
    const up = (e) => {
      this.input.pointers.delete(e.pointerId);
      if (!this.input.pointers.size) this.input.holding = false;
      this.syncHolding();
    };

    this.canvas.addEventListener('pointerdown', down, { passive: false });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (this.state === 'playing') {
          e.preventDefault();
          if (!this.input.key) {
            this.input.key = true;
            this.press();
          }
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.input.key = false;
        this.syncHolding();
      }
    });
  }

  syncHolding() {
    this.input.holding = this.input.key || this.input.pointers.size > 0;
  }

  blur() {
    this.input.pointers.clear();
    this.input.key = false;
    this.input.holding = false;
    this.input.buffer = 0;
    if (this.state === 'playing') this.callbacks.autoPause?.();
  }

  press() {
    this.input.holding = true;
    this.input.buffer = 0.14;
    this.input.tap = true;
    if (!this.input.everPressed) {
      this.input.everPressed = true;
      this.callbacks.firstInput?.();
    }
    if (this.state === 'dead' && !this.endless && this.deathTimer > 0.18) {
      this.deathTimer = 0.001;
    }
  }

  release() {
    this.input.pointers.clear();
    this.input.key = false;
    this.syncHolding();
  }

  setIcon(icon, trailColor) {
    this.icon = icon || getIcon('cyan');
    this.trailColor = trailColor || this.icon.trail;
  }

  setSettings(settings) {
    Object.assign(this.settings, settings || {});
    if (!this.settings.shake) this.shake = 0;
  }

  setMenuTheme(theme) {
    this.menuTheme = theme || THEMES.neon;
    this.theme = this.menuTheme;
  }

  showMenu(theme) {
    if (theme) this.menuTheme = theme;
    this.state = 'menu';
    this.theme = this.menuTheme;
    this.level = null;
    this.player = null;
    this.particles = [];
    this.trail = [];
    this.audio.stopMusic(0.12);
  }

  /* ───────────────────────── level flow ───────────────────────── */

  loadLevel(level, options = {}) {
    this.level = level;
    this.theme = level.theme;
    this.practice = !!options.practice;
    this.endless = !!level.endless;
    this.attempts = 0;
    this.maxPercent = 0;
    this.percent = 0;
    this.lastPct = -1;
    this.lastCoin = -1;
    this.checkpoint = null;
    this.checkpointFlag = null;
    this.score = 0;
    this.state = 'playing';
    this.animTime = 0;
    this.menuScroll = 0;
    this.input.everPressed = false;
    this.input.buffer = 0;
    this.input.tap = false;
    this.beginAttempt(false);
  }

  beginAttempt(fromCheckpoint) {
    const level = this.level;
    if (!level) return;
    this.state = 'playing';
    this.attempts++;
    this.elapsed = 0;
    this.jumps = 0;
    this.acc = 0;
    this.deathTimer = 0;
    this.deathCause = '';
    this.coins = [false, false, false];
    this.usedOrbs.clear();
    this.usedPads.clear();
    this.triggeredPortals.clear();
    this.particles = [];
    this.trail = [];
    this.lastPct = -1;
    this.lastCoin = -1;
    this.percent = 0;
    this.shake = 0;

    let spawn;
    if (this.practice && fromCheckpoint && this.checkpoint) {
      spawn = { ...this.checkpoint };
    } else {
      spawn = {
        x: level.spawnX,
        y: HALF + 0.02,
        vy: 0,
        mode: 'cube',
        gravityDir: 1,
        ceilingActive: false,
        grounded: true,
        angle: 0,
        targetAngle: 0,
        spin: 11.4
      };
    }

    this.player = {
      x: spawn.x,
      y: spawn.y,
      vy: 0,
      mode: spawn.mode || 'cube',
      gravityDir: spawn.gravityDir || 1,
      ceilingActive: !!spawn.ceilingActive,
      grounded: !!spawn.grounded,
      angle: spawn.angle || 0,
      targetAngle: spawn.targetAngle || 0,
      spin: 11.4,
      half: HALF
    };
    this.currentSpeed = BASE_SPEED * (level.speed || 1);
    this.cameraX = this.player.x - this.viewW * 0.3;
    this.beatPulse = 0;

    this.audio.startMusic(level.audio);
    this.flash = { color: 'rgba(255,255,255,ALPHA)', a: 0.12 };
    this.callbacks.attempt?.({ attempt: this.attempts, practice: this.practice, endless: this.endless, level });
    this.emitProgress(true);
  }

  restartRun(resetAttempts = false) {
    if (!this.level) return;
    if (resetAttempts) this.attempts = 0;
    this.checkpoint = null;
    this.checkpointFlag = null;
    this.state = 'playing';
    this.audio.duck(false);
    this.beginAttempt(false);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.holding = false;
    this.input.buffer = 0;
    this.audio.duck(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.audio.duck(false);
  }

  setPractice(on) {
    if (!this.level || this.endless) return;
    this.practice = !!on;
    this.checkpoint = null;
    this.checkpointFlag = null;
    if (this.state === 'paused') {
      this.beginAttempt(false);
    } else if (this.state === 'playing') {
      this.beginAttempt(false);
    }
  }

  placeCheckpoint() {
    if (!this.practice || !this.player || this.state !== 'playing') return false;
    const p = this.player;
    if (this.checkpoint && p.x - this.checkpoint.x < 2.5) {
      this.callbacks.checkpoint?.({ tooSoon: true, x: p.x });
      return false;
    }
    this.checkpoint = {
      x: p.x,
      y: p.y,
      mode: p.mode,
      gravityDir: p.gravityDir,
      ceilingActive: p.ceilingActive,
      grounded: p.grounded,
      angle: p.angle,
      targetAngle: p.targetAngle
    };
    this.checkpointFlag = { x: p.x, y: p.y - 0.25 };
    this.audio.sfx('checkpoint');
    this.emitBurst(p.x, p.y, 12, this.theme.accent, 2.5);
    this.callbacks.checkpoint?.({ ok: true, x: p.x });
    return true;
  }

  quitToMenu() {
    this.state = 'menu';
    this.level = null;
    this.player = null;
    this.particles = [];
    this.trail = [];
    this.audio.duck(false);
    this.audio.stopMusic(0.12);
  }

  /* ───────────────────────── loop ───────────────────────── */

  _loop(now) {
    const dtRaw = this._last ? (now - this._last) / 1000 : 1 / 60;
    this._last = now;
    const dt = clamp(dtRaw, 0, 0.05);

    this.animTime += dt;
    this.time += dt;
    this.beatPulse = this.state === 'playing' ? this.audio.beatPulse() : (0.5 + 0.5 * Math.sin(this.animTime * 3));

    if (this.state === 'menu') {
      this.menuScroll += dt * 2.1;
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'dead') {
      this.deathTimer -= dt;
      this.updateParticles(dt);
      if (this.deathTimer <= 0) {
        if (this.endless) {
          this.state = 'over';
          this.callbacks.endlessOver?.({
            score: this.score,
            percent: this.percent,
            time: this.elapsed,
            jumps: this.jumps,
            attempts: this.attempts
          });
        } else {
          this.beginAttempt(true);
        }
      }
    } else if (this.state === 'complete' || this.state === 'over') {
      this.updateParticles(dt);
    }

    this.shake = Math.max(0, this.shake - dt * 34);
    if (this.flash.a > 0) this.flash.a = Math.max(0, this.flash.a - dt * 2.1);

    if (this.player) {
      this.cameraX = this.player.x - this.viewW * 0.3;
    }
    this.renderer.render(this, now);
    requestAnimationFrame(this._loop);
  }

  updatePlaying(dt) {
    const p = this.player;
    if (!p) return;
    this.elapsed += dt;

    if (this.input.tap) {
      if (p.mode === 'ball') {
        p.gravityDir *= -1;
        p.vy = 0;
        p.grounded = false;
        this.audio.sfx('orb');
        this.emitBurst(p.x, p.y, 8, '#3dff9a', 2);
      }
      this.input.tap = false;
    }

    const target = this.currentSpeed;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED && steps < 8 && this.state === 'playing') {
      this.speed = target;
      this.step(FIXED);
      this.acc -= FIXED;
      steps++;
    }
    if (steps >= 8) this.acc = 0;

    // trail sampled once per frame
    if (this.state === 'playing' && p) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.09) {
        this.trail.push({ x: p.x, y: p.y, angle: p.angle, mode: p.mode });
        if (this.trail.length > 24) this.trail.shift();
      }
    }

    this.updateParticles(dt);
    this.emitProgress(false);

    if (p.x >= this.level.finishX) this.complete();
  }

  /* ───────────────────────── physics ───────────────────────── */

  step(dt) {
    const p = this.player;
    if (!p || this.state !== 'playing') return;
    const level = this.level;
    const dir = p.gravityDir;
    const speed = this.speed || this.currentSpeed;

    // jump input (hold = auto-jump)
    if (p.mode === 'cube') {
      if (p.grounded && (this.input.holding || this.input.buffer > 0)) {
        this.jump();
      }
    }

    // vertical forces
    if (p.mode === 'ship') {
      p.vy += (this.input.holding ? SHIP_ACC : -SHIP_ACC) * dt;
      p.vy = clamp(p.vy, -SHIP_MAX, SHIP_MAX);
    } else {
      const g = p.mode === 'ball' ? BALL_GRAVITY : GRAVITY;
      p.vy -= g * dir * dt;
      p.vy = clamp(p.vy, -34, 34);
    }

    p.x += speed * dt;
    const prevY = p.y;
    p.y += p.vy * dt;

    this.resolveVertical(prevY);
    if (this.state !== 'playing') return;

    this.checkHazards();
    if (this.state !== 'playing') return;

    this.checkInteractions();
    if (this.state !== 'playing') return;

    // spin / roll
    if (p.mode === 'cube') {
      if (p.grounded) {
        p.angle = lerp(p.angle, p.targetAngle, Math.min(1, dt * 24));
      } else {
        p.angle += p.spin * dt;
      }
    } else if (p.mode === 'ball') {
      p.angle += (speed / 0.46) * dt * dir;
    }

    this.input.buffer = Math.max(0, this.input.buffer - dt);
  }

  jump() {
    const p = this.player;
    if (!p || !p.grounded) return;
    p.vy = JUMP_V * (p.gravityDir === 1 ? 1 : -1);
    p.grounded = false;
    p.spin = 11.4 * (p.gravityDir === 1 ? 1 : -1);
    this.jumps++;
    this.audio.sfx('jump');
    this.emitDust(p.x, p.y - p.half * p.gravityDir, 5);
    this.input.buffer = 0;
  }

  resolveVertical(prevY) {
    const p = this.player;
    const level = this.level;
    const half = p.half;
    const dir = p.gravityDir;

    // blocks
    for (const o of level.objects) {
      if (o.type !== 'block') continue;
      if (Math.abs(o.x - p.x) > 7) continue;
      const left = o.x;
      const right = o.x + o.w;
      const bottom = o.y;
      const top = o.y + o.h;
      if (p.x + half <= left + 0.001 || p.x - half >= right - 0.001) continue;

      const prevBottom = prevY - half;
      const newBottom = p.y - half;
      const prevTop = prevY + half;
      const newTop = p.y + half;
      const overlap = p.y + half > bottom + 0.001 && p.y - half < top - 0.001;

      if (p.mode === 'ship') {
        if (overlap) return this.die('block');
        continue;
      }

      // land on top
      if (dir === 1 && p.vy <= 0 && prevBottom >= top - 0.09 && newBottom <= top + 0.03) {
        p.y = top + half;
        p.vy = 0;
        this.land();
        continue;
      }
      // land on underside (ball on ceiling / gravity flipped)
      if (dir === -1 && p.vy >= 0 && prevTop <= bottom + 0.09 && newTop >= bottom - 0.03) {
        p.y = bottom - half;
        p.vy = 0;
        this.land();
        continue;
      }
      // settle on a surface we are already touching
      if (dir === 1 && Math.abs(newBottom - top) < 0.07 && p.vy <= 0) {
        p.y = top + half;
        p.vy = 0;
        this.land();
        continue;
      }
      if (dir === -1 && Math.abs(newTop - bottom) < 0.07 && p.vy >= 0) {
        p.y = bottom - half;
        p.vy = 0;
        this.land();
        continue;
      }

      if (overlap) return this.die('block');
      // head-bump on a block above while rising
      if (p.vy > 0 && prevTop <= bottom + 0.001 && p.y + half > bottom) {
        return this.die('block');
      }
      if (p.vy < 0 && prevBottom >= top - 0.001 && p.y - half < top) {
        return this.die('block');
      }
    }

    // floor
    if (dir === 1) {
      if (p.y - half <= 0) {
        p.y = half;
        if (p.vy < 0) {
          if (p.mode === 'ship') {
            this.audio.sfx('land');
          } else {
            this.land(true);
          }
        }
        p.vy = Math.max(0, p.vy);
        p.grounded = true;
      }
    } else if (p.ceilingActive) {
      const ceil = level.ceilingY;
      if (p.y + half >= ceil) {
        p.y = ceil - half;
        if (p.vy > 0) this.land(true);
        p.vy = Math.min(0, p.vy);
        p.grounded = true;
      }
    }

    // support check
    if (p.mode !== 'ship') {
      this.updateSupport();
    }
  }

  updateSupport() {
    const p = this.player;
    if (!p.grounded) return;
    const half = p.half;
    const dir = p.gravityDir;
    let supported = false;

    if (dir === 1) {
      if (p.y - half <= 0.002) supported = true;
      if (!supported) {
        for (const o of this.level.objects) {
          if (o.type !== 'block') continue;
          if (Math.abs(o.x - p.x) > 7) continue;
          const top = o.y + o.h;
          if (Math.abs((p.y - half) - top) < 0.03 && p.x + half > o.x + 0.02 && p.x - half < o.x + o.w - 0.02) {
            supported = true;
            break;
          }
        }
      }
    } else if (p.ceilingActive) {
      if (p.y + half >= this.level.ceilingY - 0.002) supported = true;
      if (!supported) {
        for (const o of this.level.objects) {
          if (o.type !== 'block') continue;
          if (Math.abs(o.x - p.x) > 7) continue;
          if (Math.abs((p.y + half) - o.y) < 0.03 && p.x + half > o.x + 0.02 && p.x - half < o.x + o.w - 0.02) {
            supported = true;
            break;
          }
        }
      }
    }

    if (!supported) {
      p.grounded = false;
      p.targetAngle = Math.round(p.angle / (Math.PI / 2)) * (Math.PI / 2);
      if (dir === 1) p.spin = 11.4;
      else p.spin = -11.4;
    }
  }

  land(fromGround = false) {
    const p = this.player;
    p.grounded = true;
    p.targetAngle = Math.round(p.angle / (Math.PI / 2)) * (Math.PI / 2);
    if (!fromGround) {
      this.audio.sfx('land');
      this.emitDust(p.x, p.y - p.half * p.gravityDir, 6);
      this.shake = Math.max(this.shake, 1.6);
    }
  }

  checkHazards() {
    const p = this.player;
    for (const o of this.level.objects) {
      if (Math.abs(o.x - p.x) > 6) continue;
      if (o.type === 'spike') {
        const bottom = o.dir === 1 ? o.y : o.y - 0.68;
        const top = o.dir === 1 ? o.y + 0.68 : o.y;
        if (this.boxHit(o.x + 0.23, bottom, o.x + 0.77, top)) {
          return this.die('spike');
        }
      } else if (o.type === 'saw') {
        const r = o.r * 0.8;
        const cx = clamp(o.x, p.x - p.half, p.x + p.half);
        const cy = clamp(o.y, p.y - p.half, p.y + p.half);
        if (Math.hypot(o.x - cx, o.y - cy) < r) return this.die('saw');
      }
    }
  }

  boxHit(left, bottom, right, top) {
    const p = this.player;
    return p.x + p.half > left && p.x - p.half < right && p.y + p.half > bottom && p.y - p.half < top;
  }

  checkInteractions() {
    const p = this.player;
    if (!p) return;

    for (const o of this.level.objects) {
      if (Math.abs(o.x - p.x) > 6) continue;

      if (o.type === 'pad' && !this.usedPads.has(o)) {
        if (this.boxHit(o.x, o.y, o.x + 1, o.y + 0.34)) {
          this.usedPads.add(o);
          p.vy = PAD_V * (p.gravityDir === 1 ? 1 : -1);
          p.grounded = false;
          this.audio.sfx('pad');
          this.emitBurst(o.x + 0.5, o.y + 0.2, 12, '#ffd166', 4);
          this.flash = { color: 'rgba(255,209,102,ALPHA)', a: 0.14 };
        }
      }

      if (o.type === 'orb' && !this.usedOrbs.has(o)) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < 0.92 && (this.input.holding || this.input.buffer > 0)) {
          this.usedOrbs.add(o);
          p.vy = ORB_V * (p.gravityDir === 1 ? 1 : -1);
          p.grounded = false;
          this.input.buffer = 0;
          this.audio.sfx('orb');
          this.emitBurst(o.x, o.y, 14, '#ffd166', 3.5);
          this.shake = Math.max(this.shake, 2.2);
        }
      }

      if (o.type === 'coin' && !this.practice && !this.coins[o.id]) {
        if (Math.hypot(o.x - p.x, o.y - p.y) < 0.78) {
          this.coins[o.id] = true;
          this.audio.sfx('coin');
          this.emitBurst(o.x, o.y, 16, '#ffd166', 3);
          this.callbacks.coin?.({ id: o.id, coins: this.coins.map(Boolean) });
          this.emitProgress(true);
        }
      }

      if (o.type === 'portal' && !this.triggeredPortals.has(o)) {
        if (p.x >= o.x - 0.25) {
          this.triggeredPortals.add(o);
          this.applyPortal(o);
          if (this.state !== 'playing') return;
        }
      }
    }
  }

  applyPortal(portal) {
    const p = this.player;
    const mode = portal.mode;
    if (mode === p.mode) return;

    p.mode = mode;
    p.vy = 0;
    p.grounded = false;
    this.audio.sfx('portal');
    this.shake = Math.max(this.shake, 3.2);

    if (mode === 'ship') {
      p.ceilingActive = false;
      p.gravityDir = 1;
      p.y = clamp(p.y, 1.1, 6.6);
      this.flash = { color: 'rgba(255,45,149,ALPHA)', a: 0.22 };
    } else if (mode === 'ball') {
      p.ceilingActive = true;
      p.gravityDir = 1;
      p.y = clamp(p.y, 0.6, 7.2);
      p.angle = 0;
      this.flash = { color: 'rgba(61,255,154,ALPHA)', a: 0.22 };
    } else {
      p.ceilingActive = false;
      p.gravityDir = 1;
      p.targetAngle = Math.round(p.angle / (Math.PI / 2)) * (Math.PI / 2);
      p.spin = 11.4;
      this.flash = { color: 'rgba(0,229,255,ALPHA)', a: 0.22 };
    }

    this.emitBurst(portal.x, 4, 20, this.theme.accent, 4);
    this.callbacks.mode?.({ mode });
  }

  /* ───────────────────────── outcomes ───────────────────────── */

  die(cause) {
    if (this.state !== 'playing' || !this.player) return;
    const p = this.player;
    this.deathCause = cause || 'hit';
    this.state = 'dead';
    this.deathTimer = STAR_ATTEMPT;
    this.trail = [];
    this.shake = Math.max(this.shake, 14);
    this.flash = { color: 'rgba(255,45,90,ALPHA)', a: 0.5 };
    this.audio.sfx('death');
    this.audio.stopMusic(0.14);
    this.emitExplosion(p.x, p.y);

    if (this.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(55); } catch { /* noop */ }
    }

    const max = Math.max(this.maxPercent, Math.floor(this.percent));
    this.maxPercent = max;
    this.callbacks.death?.({
      percent: Math.floor(this.percent),
      maxPercent: max,
      endless: this.endless,
      score: this.score,
      cause: this.deathCause,
      attempts: this.attempts,
      practice: this.practice,
      coins: this.coins.map(Boolean)
    });
  }

  complete() {
    if (this.state !== 'playing') return;
    const p = this.player;
    this.state = 'complete';
    this.maxPercent = 100;
    this.percent = 100;
    this.audio.stopMusic(0.2);
    this.audio.sfx('complete');
    this.flash = { color: 'rgba(255,255,255,ALPHA)', a: 0.55 };
    this.shake = Math.max(this.shake, 7);
    this.emitBurst(p.x, p.y, 40, this.theme.accent, 7);
    this.emitBurst(p.x, p.y, 24, '#ffd166', 6);
    this.emitProgress(true);

    this.callbacks.complete?.({
      level: this.level,
      attempt: this.attempts,
      attempts: this.attempts,
      jumps: this.jumps,
      time: this.elapsed,
      coins: this.coins.map(Boolean),
      coinCount: this.coins.filter(Boolean).length,
      practice: this.practice,
      endless: this.endless,
      maxPercent: 100
    });
  }

  /* ───────────────────────── particles ───────────────────────── */

  emitDust(x, y, n) {
    if (!this.settings.particles) return;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + rand(-0.2, 0.2),
        y: y + rand(-0.05, 0.1),
        vx: rand(-1.8, -0.2),
        vy: rand(0.2, 1.8),
        life: rand(0.25, 0.55),
        maxLife: 0.55,
        size: rand(0.05, 0.12),
        color: this.theme.accent,
        alpha: 0.5
      });
    }
    this.trimParticles();
  }

  emitBurst(x, y, n, color, speed = 3) {
    if (!this.settings.particles) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.4, 1) * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(0.25, 0.7),
        maxLife: 0.7,
        size: rand(0.05, 0.14),
        color,
        alpha: 0.85
      });
    }
    this.trimParticles();
  }

  emitExplosion(x, y) {
    const colors = [this.icon.colors[0], this.icon.colors[1], this.icon.colors[2], this.theme.accent, '#ffffff'];
    for (let i = 0; i < 42; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(1.5, 8.5);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(0.35, 1),
        maxLife: 1,
        size: rand(0.07, 0.22),
        color: colors[i % colors.length],
        alpha: 0.95,
        shard: i % 3 === 0,
        angle: rand(0, Math.PI * 2)
      });
    }
    this.trimParticles(260);
  }

  updateParticles(dt) {
    const arr = this.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 9 * dt;
      p.vx *= 1 - dt * 1.4;
      p.vy *= 1 - dt * 0.6;
    }
  }

  trimParticles(max = 200) {
    if (this.particles.length > max) this.particles.splice(0, this.particles.length - max);
  }

  /* ───────────────────────── progress ───────────────────────── */

  emitProgress(force) {
    if (!this.level || !this.player) return;
    const pct = clamp((this.player.x / this.level.finishX) * 100, 0, 100);
    this.percent = pct;
    this.score = Math.max(0, Math.floor(this.player.x - this.level.spawnX));
    const ipct = Math.floor(pct);
    const coinCount = this.coins.filter(Boolean).length;
    this.maxPercent = Math.max(this.maxPercent, ipct);

    if (!force && ipct === this.lastPct && coinCount === this.lastCoin) return;
    this.lastPct = ipct;
    this.lastCoin = coinCount;

    this.callbacks.progress?.({
      percent: pct,
      intPercent: ipct,
      maxPercent: this.maxPercent,
      attempt: this.attempts,
      coins: this.coins.map(Boolean),
      coinCount,
      mode: this.player.mode,
      score: this.score,
      endless: this.endless,
      practice: this.practice,
      speed: this.currentSpeed
    });
  }
}
