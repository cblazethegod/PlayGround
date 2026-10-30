/* ═══════════════════════════════════════════════════════════════
   WORLD OBJECTS — every hazard and pickup, drawn in screen space.
   ═══════════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;

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
function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function drawBlock(ctx, left, top, w, h, theme, scale) {
  if (w < 0.5 || h < 0.5) return;
  const r = Math.min(scale * 0.14, w * 0.16, h * 0.16);

  const g = ctx.createLinearGradient(left, top, left, top + h);
  g.addColorStop(0, theme.blockEdge);
  g.addColorStop(0.06, theme.blockTop);
  g.addColorStop(0.22, theme.block);
  g.addColorStop(1, '#07061a');
  ctx.fillStyle = g;
  rr(ctx, left, top, w, h, r);
  ctx.fill();

  ctx.strokeStyle = alpha(theme.blockEdge, 0.5);
  ctx.lineWidth = Math.max(1, scale * 0.025);
  rr(ctx, left + 0.5, top + 0.5, w - 1, h - 1, Math.max(1, r - 0.5));
  ctx.stroke();

  // inner circuitry
  ctx.save();
  rr(ctx, left, top, w, h, r);
  ctx.clip();
  ctx.strokeStyle = alpha(theme.blockEdge, 0.12);
  ctx.lineWidth = Math.max(1, scale * 0.02);
  const step = Math.max(10, scale * 0.42);
  for (let x = left + step; x < left + w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + h); ctx.stroke();
  }
  for (let y = top + step; y < top + h; y += step) {
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke();
  }
  ctx.restore();

  // top light
  const tg = ctx.createLinearGradient(left, top, left + w, top);
  tg.addColorStop(0, alpha(theme.accent, 0));
  tg.addColorStop(0.5, alpha(theme.accent, 0.95));
  tg.addColorStop(1, alpha(theme.accent, 0));
  ctx.strokeStyle = tg;
  ctx.lineWidth = Math.max(1.5, scale * 0.045);
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = scale * 0.18;
  ctx.beginPath();
  ctx.moveTo(left + r, top + 1);
  ctx.lineTo(left + w - r, top + 1);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function drawSpike(ctx, x, baseY, dir, scale, theme) {
  const w = scale;
  const h = scale;
  const tipY = baseY - dir * h;
  const grad = ctx.createLinearGradient(x, baseY, x, tipY);
  grad.addColorStop(0, theme.block);
  grad.addColorStop(0.55, theme.spike);
  grad.addColorStop(1, theme.spikeEdge);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.02, baseY);
  ctx.lineTo(x + w * 0.52, tipY);
  ctx.lineTo(x + w * 1.02, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = alpha(theme.spikeEdge, 0.75);
  ctx.lineWidth = Math.max(1, scale * 0.022);
  ctx.stroke();

  // inner blade
  ctx.fillStyle = alpha(theme.spikeEdge, 0.22);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, baseY);
  ctx.lineTo(x + w * 0.52, baseY - dir * h * 0.68);
  ctx.lineTo(x + w * 0.8, baseY);
  ctx.closePath();
  ctx.fill();

  // glow at base
  const gg = ctx.createLinearGradient(x, baseY, x, baseY - dir * h * 0.35);
  gg.addColorStop(0, alpha(theme.spike, 0.5));
  gg.addColorStop(1, alpha(theme.spike, 0));
  ctx.fillStyle = gg;
  ctx.fillRect(x, Math.min(baseY, baseY - dir * h * 0.35), w, h * 0.35);
}

export function drawSaw(ctx, cx, cy, radius, rotation, theme, scale) {
  const teeth = 10;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  ctx.shadowColor = theme.spike;
  ctx.shadowBlur = radius * 0.5;
  const g = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
  g.addColorStop(0, '#0b0820');
  g.addColorStop(0.45, theme.block);
  g.addColorStop(0.82, theme.spike);
  g.addColorStop(1, theme.spikeEdge);
  ctx.fillStyle = g;

  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * TAU;
    const r = i % 2 === 0 ? radius : radius * 0.76;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = alpha(theme.spikeEdge, 0.5);
  ctx.lineWidth = Math.max(1, scale * 0.02);
  ctx.stroke();

  ctx.fillStyle = '#08071c';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.45, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = alpha(theme.accent, 0.8);
  ctx.lineWidth = Math.max(1, scale * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.45, 0, TAU);
  ctx.stroke();

  // hub cross
  ctx.strokeStyle = alpha(theme.accent, 0.8);
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.22, 0); ctx.lineTo(radius * 0.22, 0);
  ctx.moveTo(0, -radius * 0.22); ctx.lineTo(0, radius * 0.22);
  ctx.stroke();

  ctx.restore();
}

export function drawPad(ctx, left, topY, width, scale, theme, t) {
  const h = scale * 0.26;
  ctx.save();
  const g = ctx.createLinearGradient(left, topY - h, left, topY + h * 0.4);
  g.addColorStop(0, '#fff3a8');
  g.addColorStop(0.5, '#ffd166');
  g.addColorStop(1, '#ff9f1c');
  ctx.fillStyle = g;
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = scale * 0.28;
  rr(ctx, left, topY - h, width, h, h * 0.4);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = Math.max(1, scale * 0.02);
  rr(ctx, left + 1, topY - h + 1, width - 2, h - 2, h * 0.35);
  ctx.stroke();

  // chevrons
  ctx.strokeStyle = 'rgba(70,30,0,.55)';
  ctx.lineWidth = Math.max(1, scale * 0.045);
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  for (let i = 0; i < 2; i++) {
    const cx = left + width * (0.32 + i * 0.36);
    const cy = topY - h * 0.52;
    const s = scale * 0.09;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy + s * 0.6);
    ctx.lineTo(cx, cy - s * 0.7 - pulse * s * 0.2);
    ctx.lineTo(cx + s, cy + s * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawOrb(ctx, cx, cy, scale, theme, t, used) {
  const r = scale * 0.46;
  const pulse = 0.85 + Math.sin(t * 4.2) * 0.12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = used ? 0.28 : 1;

  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = r * 0.9 * pulse;
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = Math.max(2, scale * 0.075);
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,209,102,.42)';
  ctx.lineWidth = Math.max(1, scale * 0.025);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.32, 0, TAU);
  ctx.stroke();

  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.5, '#ffd166');
  g.addColorStop(1, 'rgba(255,159,28,.1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, TAU);
  ctx.fill();

  // spark ring
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = Math.max(1, scale * 0.02);
  for (let i = 0; i < 4; i++) {
    const a = t * 1.8 + (i / 4) * TAU;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, a, a + 0.36);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCoin(ctx, cx, cy, scale, t, id, collected) {
  const r = scale * 0.34;
  const spin = Math.cos(t * 3.4 + id * 2.1);
  const sx = Math.max(0.16, Math.abs(spin));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, 1);
  ctx.globalAlpha = collected ? 0.18 : 1;

  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = r * 1.2;
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.42, '#ffd166');
  g.addColorStop(1, '#b46b00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#fff2b8';
  ctx.lineWidth = Math.max(1, scale * 0.035);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, TAU);
  ctx.stroke();

  // star
  ctx.fillStyle = 'rgba(120,60,0,.8)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const rad = i % 2 === 0 ? r * 0.5 : r * 0.22;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPortal(ctx, cx, cy, scale, mode, theme, t) {
  const color = mode === 'ship' ? theme.accent2 : mode === 'ball' ? '#3dff9a' : theme.accent;
  const rx = scale * 0.82;
  const ry = scale * 2.05;
  ctx.save();
  ctx.translate(cx, cy);

  // halo
  const hg = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, ry);
  hg.addColorStop(0, alpha(color, 0.24));
  hg.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 2.2, ry * 1.3, 0, 0, TAU);
  ctx.fill();

  ctx.shadowColor = color;
  ctx.shadowBlur = scale * 0.5;

  // outer ring
  ctx.strokeStyle = alpha(color, 0.9);
  ctx.lineWidth = Math.max(2, scale * 0.09);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.stroke();

  // inner ring
  ctx.shadowBlur = 0;
  ctx.strokeStyle = alpha('#ffffff', 0.55);
  ctx.lineWidth = Math.max(1, scale * 0.03);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.78, ry * 0.86, 0, 0, TAU);
  ctx.stroke();

  // swirls
  ctx.lineWidth = Math.max(1.5, scale * 0.05);
  for (let i = 0; i < 3; i++) {
    const a = t * 2.2 + (i / 3) * TAU;
    ctx.strokeStyle = alpha(color, 0.55 - i * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * (0.86 + i * 0.09), ry * (0.9 + i * 0.05), 0, a, a + 0.8);
    ctx.stroke();
  }

  // mode glyph
  ctx.fillStyle = alpha(color, 0.95);
  ctx.strokeStyle = alpha(color, 0.95);
  if (mode === 'ship') {
    ctx.beginPath();
    ctx.moveTo(scale * 0.28, 0);
    ctx.lineTo(-scale * 0.24, -scale * 0.26);
    ctx.lineTo(-scale * 0.1, 0);
    ctx.lineTo(-scale * 0.24, scale * 0.26);
    ctx.closePath();
    ctx.fill();
  } else if (mode === 'ball') {
    ctx.lineWidth = Math.max(2, scale * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, scale * 0.22, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, scale * 0.06, 0, TAU);
    ctx.fill();
  } else {
    const s = scale * 0.24;
    ctx.lineWidth = Math.max(2, scale * 0.055);
    ctx.strokeRect(-s, -s, s * 2, s * 2);
    ctx.fillRect(-s * 0.45, -s * 0.4, s * 0.3, s * 0.45);
    ctx.fillRect(s * 0.15, -s * 0.4, s * 0.3, s * 0.45);
  }

  ctx.restore();
}

export function drawFinish(ctx, cx, groundY, scale, theme, t) {
  const top = groundY - scale * 7.1;
  const w = scale * 0.26;
  ctx.save();

  // beam
  const bg = ctx.createLinearGradient(cx, top, cx, groundY);
  bg.addColorStop(0, alpha(theme.accent, 0));
  bg.addColorStop(0.5, alpha(theme.accent, 0.11));
  bg.addColorStop(1, alpha(theme.accent, 0.25));
  ctx.fillStyle = bg;
  ctx.fillRect(cx - scale * 0.9, top, scale * 1.8, groundY - top);

  // pillars
  for (const side of [-1, 1]) {
    const x = cx + side * scale * 0.86;
    ctx.strokeStyle = alpha(theme.accent, 0.85);
    ctx.lineWidth = Math.max(2, scale * 0.06);
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = scale * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, top);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // top light
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, top, scale * 0.09, 0, TAU);
    ctx.fill();
  }

  // checkered banner
  const rows = 5;
  const cols = 4;
  const bw = scale * 1.7 / cols;
  const bh = scale * 0.34;
  const by = top + scale * 0.25;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.92)' : 'rgba(10,8,32,.9)';
      ctx.fillRect(cx - scale * 0.85 + c * bw, by + r * bh, bw, bh);
    }
  }
  const bg2 = ctx.createLinearGradient(cx - scale * 0.85, by, cx + scale * 0.85, by + rows * bh);
  bg2.addColorStop(0, alpha(theme.accent, 0.18));
  bg2.addColorStop(1, alpha(theme.accent2, 0.25));
  ctx.fillStyle = bg2;
  ctx.fillRect(cx - scale * 0.85, by, scale * 1.7, rows * bh);

  // shimmer
  const sh = (t * 0.5) % 1;
  ctx.fillStyle = alpha(theme.accent, 0.16);
  ctx.fillRect(cx - scale * 0.85, by + sh * rows * bh, scale * 1.7, scale * 0.06);

  // label
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(8, scale * 0.18)}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('FINISH', cx, top - scale * 0.24);
  ctx.restore();
}

export function drawCheckpoint(ctx, cx, baseY, scale, t) {
  const h = scale * 1.55;
  ctx.save();
  ctx.strokeStyle = '#7dffb4';
  ctx.lineWidth = Math.max(2, scale * 0.035);
  ctx.shadowColor = '#42ffa3';
  ctx.shadowBlur = scale * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.lineTo(cx, baseY - h);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const wave = Math.sin(t * 5) * scale * 0.04;
  ctx.fillStyle = 'rgba(66,255,163,.92)';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h);
  ctx.lineTo(cx + scale * 0.62, baseY - h + scale * 0.2 + wave);
  ctx.lineTo(cx, baseY - h + scale * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9ffe9';
  ctx.beginPath();
  ctx.arc(cx, baseY - h, scale * 0.055, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawCeiling(ctx, y, W, scale, theme) {
  ctx.save();
  const g = ctx.createLinearGradient(0, y - scale * 0.5, 0, y);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, alpha(theme.accent, 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - scale * 0.5, W, scale * 0.5);

  ctx.strokeStyle = alpha(theme.accent, 0.75);
  ctx.lineWidth = Math.max(2, scale * 0.045);
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = scale * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = alpha(theme.accent, 0.12);
  ctx.lineWidth = 1;
  const step = scale * 1.5;
  for (let x = 0; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, y - scale * 0.5);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.restore();
}

export { rr, alpha, TAU };
