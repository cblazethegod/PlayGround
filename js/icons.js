/* ═══════════════════════════════════════════════════════════════
   ICONS — cube / ship / ball artwork, drawn with canvas paths.
   ═══════════════════════════════════════════════════════════════ */

export const ICONS = [
  { id: 'cyan', name: 'VOLT', colors: ['#00f0ff', '#0066ff', '#b8fcff'], face: 'smile', trail: '#00e5ff' },
  { id: 'magenta', name: 'BLAZE', colors: ['#ff5edb', '#7b2ff7', '#ffd6f7'], face: 'angry', trail: '#ff2d95' },
  { id: 'lime', name: 'TOXIC', colors: ['#dcff70', '#11b26b', '#f6ffd0'], face: 'wink', trail: '#a3ff12' },
  { id: 'gold', name: 'SOLAR', colors: ['#ffd166', '#ff7a00', '#fff0bd'], face: 'smile', trail: '#ffd166' },
  { id: 'ice', name: 'GLACIER', colors: ['#e6f8ff', '#3a86ff', '#ffffff'], face: 'cool', trail: '#a8d8ff' },
  { id: 'ghost', name: 'PHANTOM', colors: ['#f4f4ff', '#6c63ff', '#ffffff'], face: 'hollow', trail: '#c7c7ff' },
  { id: 'ember', name: 'EMBER', colors: ['#ffb347', '#ff2d55', '#ffd6b8'], face: 'angry', trail: '#ff5e3a' },
  { id: 'venom', name: 'VENOM', colors: ['#a3ff12', '#006d2c', '#eaffc2'], face: 'grin', trail: '#7cffb2' }
];

export const TRAILS = [
  { id: 'cyan', color: '#00e5ff' },
  { id: 'pink', color: '#ff2d95' },
  { id: 'violet', color: '#a78bfa' },
  { id: 'lime', color: '#a3ff12' },
  { id: 'gold', color: '#ffd166' },
  { id: 'ice', color: '#a8d8ff' },
  { id: 'ember', color: '#ff5e3a' },
  { id: 'white', color: '#f4f4ff' }
];

export function getIcon(id) {
  return ICONS.find((i) => i.id === id) || ICONS[0];
}
export function getTrail(id) {
  return TRAILS.find((t) => t.id === id) || TRAILS[0];
}

function rr(ctx, x, y, w, h, r) {
  const q = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

function drawFace(ctx, s, face) {
  const ink = 'rgba(5,4,20,.88)';
  const eyeY = -s * 0.06;
  const eyeX = s * 0.19;
  const ew = s * 0.13;
  const eh = s * 0.17;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';

  if (face === 'cool') {
    rr(ctx, -s * 0.34, eyeY - eh * 0.42, s * 0.68, eh * 0.82, s * 0.04);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,250,255,.55)';
    rr(ctx, -s * 0.28, eyeY - eh * 0.34, s * 0.22, eh * 0.28, s * 0.02);
    ctx.fill();
  } else if (face === 'hollow') {
    ctx.lineWidth = s * 0.055;
    ctx.beginPath(); ctx.arc(-eyeX, eyeY, ew * 0.78, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(eyeX, eyeY, ew * 0.78, 0, Math.PI * 2); ctx.stroke();
  } else {
    if (face === 'wink') {
      ctx.fillRect(-eyeX - ew / 2, eyeY - eh / 2, ew, eh);
      ctx.lineWidth = s * 0.055;
      ctx.beginPath();
      ctx.moveTo(eyeX - ew * 0.7, eyeY);
      ctx.lineTo(eyeX + ew * 0.7, eyeY);
      ctx.stroke();
    } else if (face === 'angry') {
      ctx.save();
      ctx.translate(-eyeX, eyeY);
      ctx.rotate(0.24);
      ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
      ctx.restore();
      ctx.save();
      ctx.translate(eyeX, eyeY);
      ctx.rotate(-0.24);
      ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
      ctx.restore();
    } else {
      rr(ctx, -eyeX - ew / 2, eyeY - eh / 2, ew, eh, ew * 0.35);
      ctx.fill();
      rr(ctx, eyeX - ew / 2, eyeY - eh / 2, ew, eh, ew * 0.35);
      ctx.fill();
    }
  }

  // mouth
  ctx.beginPath();
  if (face === 'angry') {
    ctx.lineWidth = s * 0.05;
    ctx.moveTo(-s * 0.13, s * 0.23);
    ctx.lineTo(s * 0.13, s * 0.19);
    ctx.stroke();
  } else if (face === 'grin') {
    rr(ctx, -s * 0.18, s * 0.13, s * 0.36, s * 0.13, s * 0.03);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(-s * 0.14, s * 0.13, s * 0.28, s * 0.035);
  } else if (face === 'wink') {
    ctx.lineWidth = s * 0.05;
    ctx.arc(0, s * 0.13, s * 0.15, 0.25, Math.PI - 0.25);
    ctx.stroke();
  } else {
    ctx.lineWidth = s * 0.05;
    ctx.arc(0, s * 0.14, s * 0.15, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
}

export function drawCube(ctx, size, icon, angle = 0, opts = {}) {
  const s = size;
  ctx.save();
  ctx.rotate(angle);
  if (opts.gravity === -1) ctx.scale(1, -1);

  if (opts.glow !== false) {
    ctx.shadowColor = icon.colors[0];
    ctx.shadowBlur = size * (opts.glowScale || 0.34);
  }
  const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
  g.addColorStop(0, icon.colors[2]);
  g.addColorStop(0.42, icon.colors[0]);
  g.addColorStop(1, icon.colors[1]);
  ctx.fillStyle = g;
  rr(ctx, -s / 2, -s / 2, s, s, s * 0.17);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,.72)';
  ctx.lineWidth = Math.max(1, s * 0.028);
  rr(ctx, -s / 2 + s * 0.02, -s / 2 + s * 0.02, s * 0.96, s * 0.96, s * 0.15);
  ctx.stroke();

  // inner panel
  ctx.fillStyle = 'rgba(6,4,24,.16)';
  rr(ctx, -s * 0.37, -s * 0.37, s * 0.74, s * 0.74, s * 0.11);
  ctx.fill();

  // glossy corner
  const shine = ctx.createLinearGradient(-s / 2, -s / 2, -s / 2 + s * 0.5, -s / 2 + s * 0.5);
  shine.addColorStop(0, 'rgba(255,255,255,.65)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.moveTo(-s * 0.45, -s * 0.45);
  ctx.lineTo(s * 0.08, -s * 0.46);
  ctx.lineTo(-s * 0.46, s * 0.08);
  ctx.closePath();
  ctx.fill();

  drawFace(ctx, s, icon.face);
  ctx.restore();
}

export function drawShip(ctx, size, icon, tilt = 0, opts = {}) {
  const s = size;
  ctx.save();
  ctx.rotate(tilt);

  // thruster
  if (opts.thrust) {
    const flick = 0.7 + Math.random() * 0.5;
    const fg = ctx.createLinearGradient(-s * 0.5, 0, -s * 1.25, 0);
    fg.addColorStop(0, 'rgba(255,255,255,.95)');
    fg.addColorStop(0.35, icon.colors[0]);
    fg.addColorStop(1, 'rgba(255,45,149,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-s * 0.44, -s * 0.12);
    ctx.lineTo(-s * (0.9 + flick * 0.35), 0);
    ctx.lineTo(-s * 0.44, s * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowColor = icon.colors[0];
  ctx.shadowBlur = s * 0.3;
  const g = ctx.createLinearGradient(-s * 0.5, -s * 0.3, s * 0.5, s * 0.3);
  g.addColorStop(0, icon.colors[2]);
  g.addColorStop(0.45, icon.colors[0]);
  g.addColorStop(1, icon.colors[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(s * 0.52, s * 0.02);
  ctx.quadraticCurveTo(s * 0.24, -s * 0.3, -s * 0.3, -s * 0.26);
  ctx.quadraticCurveTo(-s * 0.55, -s * 0.24, -s * 0.52, 0);
  ctx.quadraticCurveTo(-s * 0.55, s * 0.24, -s * 0.3, s * 0.26);
  ctx.quadraticCurveTo(s * 0.24, s * 0.3, s * 0.52, s * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = Math.max(1, s * 0.026);
  ctx.stroke();

  // wing
  ctx.fillStyle = 'rgba(6,4,24,.35)';
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, s * 0.05);
  ctx.lineTo(-s * 0.44, s * 0.34);
  ctx.lineTo(-s * 0.02, s * 0.2);
  ctx.closePath();
  ctx.fill();

  // cockpit
  const cg = ctx.createRadialGradient(s * 0.12, -s * 0.1, s * 0.01, s * 0.12, -s * 0.06, s * 0.19);
  cg.addColorStop(0, '#ffffff');
  cg.addColorStop(0.45, icon.colors[2]);
  cg.addColorStop(1, 'rgba(10,8,40,.65)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.ellipse(s * 0.12, -s * 0.03, s * 0.2, s * 0.14, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke();

  // little face light
  ctx.fillStyle = icon.colors[2];
  ctx.beginPath();
  ctx.arc(-s * 0.26, -s * 0.02, s * 0.045, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawBall(ctx, size, icon, angle = 0, opts = {}) {
  const s = size;
  ctx.save();
  ctx.rotate(angle);
  ctx.shadowColor = icon.colors[0];
  ctx.shadowBlur = s * 0.32;
  const g = ctx.createRadialGradient(-s * 0.16, -s * 0.18, s * 0.02, 0, 0, s * 0.52);
  g.addColorStop(0, icon.colors[2]);
  g.addColorStop(0.5, icon.colors[0]);
  g.addColorStop(1, icon.colors[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,.65)';
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
  ctx.stroke();

  // rotating inner band
  ctx.strokeStyle = 'rgba(6,4,24,.55)';
  ctx.lineWidth = s * 0.1;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, Math.PI + 0.25, Math.PI * 2 - 0.25);
  ctx.stroke();

  // eyes
  ctx.fillStyle = 'rgba(5,4,20,.88)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, -s * 0.1, s * 0.055, s * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.15, -s * 0.1, s * 0.055, s * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(5,4,20,.88)';
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.arc(0, s * 0.0, s * 0.1, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}

/* large icon card preview */
export function drawIconPreview(canvas, icon, trail, angle = -0.16) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const S = Math.min(W, H);

  ctx.clearRect(0, 0, W, H);

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, 'rgba(20,17,54,.9)');
  bg.addColorStop(1, 'rgba(8,7,24,.96)');
  ctx.fillStyle = bg;
  rr(ctx, 0, 0, W, H, S * 0.09);
  ctx.fill();

  ctx.save();
  rr(ctx, 0, 0, W, H, S * 0.09);
  ctx.clip();

  // rays
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = icon.colors[0];
  ctx.lineWidth = S * 0.012;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + angle;
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.lineTo(W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // floor ellipse
  const eg = ctx.createRadialGradient(W / 2, H * 0.76, S * 0.02, W / 2, H * 0.76, S * 0.43);
  eg.addColorStop(0, withAlpha(icon.colors[0], 0.34));
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.76, S * 0.4, S * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // trail
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const a = 0.05 + i * 0.035;
    const r = S * (0.05 + i * 0.012);
    ctx.fillStyle = withAlpha(trail.color, a);
    rr(ctx, W * 0.18 - i * S * 0.035, H * 0.56 + Math.sin(i * 0.9) * S * 0.04, r, r, r * 0.25);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  drawCube(ctx, S * 0.42, icon, angle, { glowScale: 0.3 });

  ctx.restore();

  ctx.strokeStyle = withAlpha(icon.colors[0], 0.36);
  ctx.lineWidth = Math.max(1, S * 0.012);
  rr(ctx, 0.5, 0.5, W - 1, H - 1, S * 0.09);
  ctx.stroke();
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
