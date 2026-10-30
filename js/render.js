/* ═══════════════════════════════════════════════════════════════
   RENDERER — synthwave skies, neon geometry, particles, menu scene.
   ═══════════════════════════════════════════════════════════════ */

import { THEMES } from './levels.js';
import { drawCube, drawShip, drawBall } from './icons.js';
import {
  drawBlock, drawSpike, drawSaw, drawPad, drawOrb, drawCoin,
  drawPortal, drawFinish, drawCheckpoint, drawCeiling, alpha, rr
} from './objects.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function makeCity(hmax, count) {
  const out = [];
  let x = 0;
  while (x < 1.22 && out.length < count) {
    const w = 0.018 + Math.random() * 0.052;
    const h = 0.025 + Math.random() * hmax;
    out.push({ x, w, h, antenna: Math.random() < 0.16, light: Math.random() });
    x += w + 0.0035;
  }
  return out;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.W = 0;
    this.H = 0;
    this.dpr = 1;
    this.scale = 1;
    this.groundScreen = 0;
    this.viewW = 17;
    this.viewH = 10;

    this.stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.68,
      r: 0.4 + Math.random() * 1.5,
      depth: 0.01 + Math.random() * 0.09,
      phase: Math.random() * TAU
    }));

    this.city = [
      { parallax: 0.06, hmax: 0.16, buildings: makeCity(0.16, 34), glow: 0.05 },
      { parallax: 0.13, hmax: 0.12, buildings: makeCity(0.12, 30), glow: 0.08 },
      { parallax: 0.23, hmax: 0.085, buildings: makeCity(0.085, 26), glow: 0.12 }
    ];

    this.shapes = Array.from({ length: 9 }, () => ({
      x: Math.random(),
      y: 0.08 + Math.random() * 0.55,
      size: 0.02 + Math.random() * 0.05,
      depth: 0.04 + Math.random() * 0.18,
      phase: Math.random() * TAU,
      kind: Math.random() < 0.5 ? 0 : 1
    }));

    this.speedLines = Array.from({ length: 16 }, () => ({
      y: Math.random(),
      len: 0.03 + Math.random() * 0.1,
      speed: 0.4 + Math.random() * 0.8,
      alpha: 0.05 + Math.random() * 0.12
    }));
  }

  resize(W, H, dpr, scale, groundScreen) {
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.scale = scale;
    this.groundScreen = groundScreen;
    this.viewW = W / scale;
    this.viewH = H / scale;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';

    const ctx = this.ctx;
    this.vignette = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.26, W / 2, H * 0.52, Math.max(W, H) * 0.82);
    this.vignette.addColorStop(0, 'rgba(0,0,0,0)');
    this.vignette.addColorStop(0.62, 'rgba(3,2,12,.18)');
    this.vignette.addColorStop(1, 'rgba(3,2,12,.72)');
  }

  render(game, now) {
    const ctx = this.ctx;
    const { W, H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const theme = game.theme || game.menuTheme || THEMES.neon;
    const t = game.animTime;
    const menu = game.state === 'menu';
    const camX = menu ? game.menuScroll : game.cameraX;

    this.drawBackground(theme, camX, t, game.beatPulse, menu);
    this.drawGround(theme, camX, t, game.beatPulse, game.player);

    if (menu) {
      this.drawMenuScene(game, theme, t);
      ctx.fillStyle = this.vignette;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const shake = game.settings.shake ? game.shake : 0;
    ctx.save();
    if (shake > 0.15) {
      ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
    }

    // ceiling tunnel for ball sections
    if (game.player && game.player.ceilingActive) {
      drawCeiling(ctx, this.groundScreen - game.level.ceilingY * this.scale, W, this.scale, theme);
    }

    this.drawObjects(game, theme, t);
    this.drawTrail(game);
    this.drawPlayer(game, theme, t);
    this.drawParticles(game);
    this.drawSpeedLines(game, theme);

    ctx.restore();

    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, W, H);

    if (game.flash && game.flash.a > 0.002) {
      const f = game.flash;
      ctx.fillStyle = f.color.replace('ALPHA', String(clamp(f.a, 0, 1)));
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ───────────────────────── background ───────────────────────── */
  drawBackground(theme, camX, t, pulse, menu) {
    const ctx = this.ctx;
    const { W, H } = this;

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky1);
    sky.addColorStop(0.44, theme.sky2);
    sky.addColorStop(0.78, theme.sky3);
    sky.addColorStop(1, theme.sky1);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // stars
    ctx.save();
    for (const s of this.stars) {
      const sx = ((s.x * W - camX * this.scale * s.depth) % W + W) % W;
      const sy = s.y * H * 0.78;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + s.phase));
      ctx.globalAlpha = (menu ? 0.7 : 0.55) * tw;
      ctx.fillStyle = '#e9f6ff';
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * (menu ? 1.2 : 1), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // sun
    const sunX = W * 0.72;
    const sunY = this.groundScreen - this.viewH * this.scale * 0.6;
    const sunR = Math.min(W, H) * (menu ? 0.19 : 0.155) * (1 + pulse * 0.035);
    ctx.save();
    const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.2);
    halo.addColorStop(0, alpha(theme.sun, 0.32));
    halo.addColorStop(0.5, alpha(theme.sun, 0.08));
    halo.addColorStop(1, alpha(theme.sun, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 2.2, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, TAU);
    ctx.clip();
    const sg = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    sg.addColorStop(0, '#fff4d9');
    sg.addColorStop(0.35, theme.sun);
    sg.addColorStop(1, theme.accent2);
    ctx.fillStyle = sg;
    ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

    // synthwave slats
    ctx.fillStyle = theme.sky2;
    for (let i = 0; i < 9; i++) {
      const yy = sunY + sunR * (0.06 + i * 0.11);
      const hh = sunR * (0.012 + i * 0.014);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(sunX - sunR, yy, sunR * 2, hh);
    }
    ctx.restore();

    // skyline
    for (let l = 0; l < this.city.length; l++) {
      const layer = this.city[l];
      const pw = W * 1.22;
      const off = ((camX * this.scale * layer.parallax * 0.4) % pw + pw) % pw;
      ctx.fillStyle = `rgba(5,4,18,${0.4 + l * 0.16})`;
      for (let k = -1; k <= 1; k++) {
        for (const b of layer.buildings) {
          const bx = b.x * pw - off + k * pw;
          if (bx > W + 40 || bx + b.w * pw < -40) continue;
          const bh = b.h * H;
          const by = this.groundScreen - bh;
          ctx.fillStyle = `rgba(4,3,16,${0.34 + l * 0.17})`;
          ctx.fillRect(bx, by, b.w * pw, bh);
          ctx.fillStyle = alpha(theme.accent, layer.glow + (b.light > 0.86 ? 0.13 : 0));
          ctx.fillRect(bx, by, b.w * pw, Math.max(1, 1.2));
          if (b.antenna) {
            ctx.fillRect(bx + b.w * pw * 0.48, by - bh * 0.18, 1, bh * 0.18);
          }
        }
      }
    }

    // floating wireframe shapes
    ctx.save();
    for (const s of this.shapes) {
      const sx = ((s.x * W - camX * this.scale * s.depth) % (W + 200) + W + 200) % (W + 200) - 100;
      const sy = s.y * H + Math.sin(t * 0.6 + s.phase) * this.scale * 0.5;
      const size = s.size * Math.min(W, H);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(t * 0.25 + s.phase);
      ctx.globalAlpha = menu ? 0.22 : 0.13;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1;
      if (s.kind === 0) {
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.strokeRect(-size / 4, -size / 4, size / 2, size / 2);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2, size / 2);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // horizon fog
    const fog = ctx.createLinearGradient(0, this.groundScreen - this.scale * 3.5, 0, this.groundScreen + this.scale);
    fog.addColorStop(0, alpha(theme.accent, 0));
    fog.addColorStop(0.72, alpha(theme.accent, 0.055 + pulse * 0.025));
    fog.addColorStop(1, alpha(theme.accent2, 0.09));
    ctx.fillStyle = fog;
    ctx.fillRect(0, this.groundScreen - this.scale * 3.5, W, this.scale * 4.5);
  }

  /* ───────────────────────── ground ───────────────────────── */
  drawGround(theme, camX, t, pulse, player) {
    const ctx = this.ctx;
    const { W, H, scale } = this;
    const gy = this.groundScreen;

    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, theme.ground);
    g.addColorStop(0.35, '#050412');
    g.addColorStop(1, '#02020a');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, W, H - gy);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, gy, W, H - gy);
    ctx.clip();

    // horizontal perspective lines
    for (let i = 1; i <= 6; i++) {
      const p = Math.pow(i / 6, 1.7);
      const y = gy + (H - gy) * p;
      ctx.strokeStyle = alpha(theme.grid, 0.22 - i * 0.02);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // vertical grid
    const step = scale * 1.6;
    const off = ((-camX * scale) % step + step) % step;
    ctx.strokeStyle = alpha(theme.grid, 0.42);
    ctx.lineWidth = 1;
    for (let x = off; x < W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x - (W / 2 - x) * 0.06, H);
      ctx.stroke();
    }

    // dancing light ticks on the floor
    const tick = (t * 0.5) % 1;
    for (let i = 0; i < 5; i++) {
      const p = (tick + i / 5) % 1;
      const x = p * W;
      ctx.fillStyle = alpha(theme.accent, 0.1 * (1 - p));
      ctx.fillRect(x, gy, scale * 0.9, 1.5);
    }
    ctx.restore();

    // neon ground line
    ctx.save();
    ctx.strokeStyle = alpha(theme.accent, 0.95);
    ctx.lineWidth = Math.max(1.5, scale * 0.05);
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = scale * 0.42 + pulse * 10;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = alpha(theme.accent2, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, gy + Math.max(2, scale * 0.09));
    ctx.lineTo(W, gy + Math.max(2, scale * 0.09));
    ctx.stroke();
    ctx.restore();
  }

  /* ───────────────────────── objects ───────────────────────── */
  drawObjects(game, theme, t) {
    const ctx = this.ctx;
    const { scale, groundScreen: gy } = this;
    const cam = game.cameraX;
    const level = game.level;
    if (!level) return;

    const left = cam - 3;
    const right = cam + this.viewW + 3;
    const toY = (y) => gy - y * scale;
    const toX = (x) => (x - cam) * scale;

    for (const o of level.objects) {
      if (o.x < left || o.x > right) continue;
      switch (o.type) {
        case 'block':
          drawBlock(ctx, toX(o.x), toY(o.y + o.h), o.w * scale, o.h * scale, theme, scale);
          break;
        case 'spike':
          drawSpike(ctx, toX(o.x), toY(o.y), o.dir, scale, theme);
          break;
        case 'saw':
          drawSaw(ctx, toX(o.x), toY(o.y), o.r * scale, t * 2.4 + o.x, theme, scale);
          break;
        case 'pad':
          drawPad(ctx, toX(o.x), toY(o.y), scale, scale, theme, t);
          break;
        case 'orb':
          drawOrb(ctx, toX(o.x), toY(o.y), scale, theme, t, game.usedOrbs.has(o));
          break;
        case 'coin':
          drawCoin(ctx, toX(o.x), toY(o.y), scale, t, o.id, game.coins[o.id]);
          break;
        case 'portal':
          drawPortal(ctx, toX(o.x), toY(o.y), scale, o.mode, theme, t);
          break;
        case 'finish':
          drawFinish(ctx, toX(o.x), gy, scale, theme, t);
          break;
        default: break;
      }
    }

    if (game.practice && game.checkpointFlag) {
      const cp = game.checkpointFlag;
      drawCheckpoint(ctx, toX(cp.x), toY(cp.y), scale, t);
    }
  }

  /* ───────────────────────── player ───────────────────────── */
  drawTrail(game) {
    const p = game.player;
    if (!p || game.state === 'dead' || !game.trail.length) return;
    const ctx = this.ctx;
    const { scale, groundScreen: gy } = this;
    const cam = game.cameraX;
    const trailColor = game.trailColor;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = game.trail.length;
    for (let i = 0; i < n; i++) {
      const q = game.trail[i];
      const f = (i + 1) / n;
      const size = scale * (0.36 + f * 0.3);
      const sx = (q.x - cam) * scale;
      const sy = gy - q.y * scale;
      ctx.globalAlpha = 0.05 + f * 0.2;
      ctx.fillStyle = trailColor;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(q.angle || 0);
      rr(ctx, -size / 2, -size / 2, size, size, size * 0.24);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawPlayer(game, theme, t) {
    const p = game.player;
    if (!p || game.state === 'dead' || game.state === 'over') return;
    const ctx = this.ctx;
    const { scale, groundScreen: gy } = this;
    const sx = (p.x - game.cameraX) * scale;
    const sy = gy - p.y * scale;
    const size = scale * 0.94;

    // ground shadow
    if (p.y < 3.6) {
      const a = clamp(1 - p.y / 3.6, 0, 1) * 0.32;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.beginPath();
      ctx.ellipse(sx, gy + 2, scale * 0.4, scale * 0.1, 0, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(sx, sy);

    if (p.mode === 'ship') {
      drawShip(ctx, size, game.icon, clamp(-p.vy * 0.045, -0.48, 0.48), { thrust: game.input.holding });
    } else if (p.mode === 'ball') {
      drawBall(ctx, size, game.icon, p.angle, { gravity: p.gravityDir });
    } else {
      drawCube(ctx, size, game.icon, p.angle, { gravity: p.gravityDir });
    }
    ctx.restore();

    // active orb highlight around player
    if (p.mode === 'cube' && !p.dead) {
      const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, scale * 1.2);
      glow.addColorStop(0, alpha(game.trailColor, 0.1));
      glow.addColorStop(1, alpha(game.trailColor, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, scale * 1.2, 0, TAU);
      ctx.fill();
    }
  }

  /* ───────────────────────── particles ───────────────────────── */
  drawParticles(game) {
    const ctx = this.ctx;
    const { scale, groundScreen: gy } = this;
    const cam = game.cameraX;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of game.particles) {
      const life = p.life / p.maxLife;
      if (life <= 0) continue;
      const sx = (p.x - cam) * scale;
      const sy = gy - p.y * scale;
      const size = Math.max(0.7, p.size * scale * (0.4 + life * 0.9));
      ctx.globalAlpha = clamp(life, 0, 1) * (p.alpha || 0.9);
      ctx.fillStyle = p.color;
      if (p.shard) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.angle + game.time * 3);
        ctx.fillRect(-size / 2, -size / 4, size, size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, size / 2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawSpeedLines(game, theme) {
    const ctx = this.ctx;
    const { W, H, scale } = this;
    const speed = (game.player ? game.currentSpeed : 10) / 10.5;
    if (speed < 1.02) return;
    const t = game.animTime;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.speedLines) {
      const x = ((t * l.speed * 0.35 + l.y) % 1.2 - 0.1) * W;
      const y = l.y * H;
      ctx.globalAlpha = l.alpha * (speed - 1) * 1.4;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - l.len * W, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ───────────────────────── menu ───────────────────────── */
  drawMenuScene(game, theme, t) {
    const ctx = this.ctx;
    const { scale, groundScreen: gy, W } = this;
    const cam = game.menuScroll;

    // decorative level furniture behind the title
    const toX = (x) => (x - cam) * scale;
    const spikeXs = [cam + 11.5, cam + 12.5, cam + 13.5, cam + 20.5];
    for (const x of spikeXs) drawSpike(ctx, toX(x), gy, 1, scale, theme);
    drawBlock(ctx, toX(cam + 17), gy - scale * 2, scale * 2, scale * 2, theme, scale);
    drawSaw(ctx, toX(cam + 26), gy - scale * 2.2, scale * 0.9, t * 1.8, theme, scale);
    drawPortal(ctx, toX(cam + 32), gy - scale * 3.3, scale, 'ship', theme, t);

    // ghost trail
    const playerX = W * 0.2;
    const jump = Math.max(0, Math.sin(t * 2.1));
    const playerY = gy - scale * (0.5 + jump * 2.2);
    const icon = game.icon;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 6; i >= 1; i--) {
      const a = 0.18 * (1 - i / 7);
      const s = scale * (0.5 - i * 0.03);
      ctx.globalAlpha = a;
      ctx.fillStyle = game.trailColor;
      rr(ctx, playerX - i * scale * 0.34 - s / 2, playerY - s / 2 + i * 2, s, s, s * 0.25);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(playerX, playerY);
    drawCube(ctx, scale * 0.94, icon, t * 2.2 + 0.3, { glowScale: 0.3 });
    ctx.restore();

    // floating ship in the distance
    const shipX = W * 0.78 + Math.sin(t * 0.7) * 20;
    const shipY = gy - scale * 5.2 + Math.sin(t * 1.2) * scale * 0.35;
    ctx.save();
    ctx.translate(shipX, shipY);
    drawShip(ctx, scale * 0.72, icon, Math.sin(t * 1.1) * 0.18, { thrust: true });
    ctx.restore();

    // title-screen horizon tag
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(8, scale * 0.16)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('N E O N   R U S H', W * 0.04, gy + scale * 0.7);
    ctx.restore();
  }
}
