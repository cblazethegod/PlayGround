/* ═══════════════════════════════════════════════════════════════
   APP — screens, save data, settings, level select, HUD wiring.
   ═══════════════════════════════════════════════════════════════ */

import { LEVELS, ENDLESS, THEMES, buildLevelById } from './levels.js';
import { ICONS, TRAILS, getIcon, getTrail, drawIconPreview } from './icons.js';
import { AudioEngine } from './audio.js';
import { Game } from './game.js';

const SAVE_KEY = 'geodash.neon.v1';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ───────────────────────── save data ───────────────────────── */

function freshLevels() {
  const out = {};
  for (const l of LEVELS) out[l.id] = { best: 0, completed: false, coins: [false, false, false], attempts: 0 };
  return out;
}

const defaults = () => ({
  version: 1,
  icon: 'cyan',
  trail: 'cyan',
  lastLevel: 'neon',
  settings: { music: 0.7, sfx: 0.8, shake: true, particles: true, haptics: true, muted: false },
  levels: freshLevels(),
  endless: { best: 0, runs: 0 }
});

function loadSave() {
  const base = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return base;
    const merged = {
      ...base,
      ...raw,
      settings: { ...base.settings, ...(raw.settings || {}) },
      levels: { ...base.levels },
      endless: { ...base.endless, ...(raw.endless || {}) }
    };
    for (const l of LEVELS) {
      const s = raw.levels?.[l.id];
      if (s) merged.levels[l.id] = {
        best: Math.max(0, Math.min(100, Number(s.best) || 0)),
        completed: !!s.completed,
        coins: Array.isArray(s.coins) ? [!!s.coins[0], !!s.coins[1], !!s.coins[2]] : [false, false, false],
        attempts: Number(s.attempts) || 0
      };
    }
    return merged;
  } catch {
    return base;
  }
}

const save = loadSave();
let levelCache = new Map();
let endlessLevel = null;

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* private mode */ }
}

/* ───────────────────────── engine boot ───────────────────────── */

const audio = new AudioEngine();
const game = new Game($('stage'), audio, {});

const themeOf = (id) => THEMES[LEVELS.find((l) => l.id === id)?.theme] || THEMES.neon;
const levelById = (id) => (id === 'endless' ? endlessLevel : levelCache.get(id));

function unlocked(index) {
  if (index <= 0) return true;
  return !!save.levels[LEVELS[index - 1].id]?.completed;
}

function continueLevel() {
  const last = LEVELS.find((l) => l.id === save.lastLevel);
  if (last) {
    const idx = LEVELS.indexOf(last);
    if (unlocked(idx)) return last;
  }
  for (let i = 0; i < LEVELS.length; i++) {
    if (unlocked(i) && !save.levels[LEVELS[i].id].completed) return LEVELS[i];
  }
  return LEVELS[LEVELS.length - 1];
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  root.setProperty('--accent', theme.accent);
  root.setProperty('--accent-2', theme.accent2);
  root.setProperty('--accent-3', theme.accent3);
}

function setSoundIcon() {
  const btn = $('btn-sound');
  btn.classList.toggle('muted', !!save.settings.muted);
  btn.setAttribute('aria-label', save.settings.muted ? 'Unmute sound' : 'Mute sound');
  btn.title = save.settings.muted ? 'Unmute' : 'Mute';
}

function applySettings() {
  audio.setMusicVolume(save.settings.music);
  audio.setSfxVolume(save.settings.sfx);
  audio.setMasterMuted(!!save.settings.muted);
  game.setSettings(save.settings);
}

function applyStyle() {
  game.setIcon(getIcon(save.icon), getTrail(save.trail).color);
}

/* ───────────────────────── screen nav ───────────────────────── */

const screens = ['screen-title', 'screen-levels', 'screen-customize', 'screen-game'];

function showScreen(id) {
  for (const s of screens) {
    const el = $(s);
    el.classList.toggle('is-active', s === id);
    el.classList.toggle('is-leaving', false);
  }
}

function openOverlay(id) {
  const el = $(id);
  if (el) el.classList.add('is-open');
}
function closeOverlay(id) {
  const el = $(id);
  if (el) el.classList.remove('is-open');
}
function closeAllOverlays() {
  document.querySelectorAll('.overlay').forEach((el) => el.classList.remove('is-open'));
}
function anyOverlayOpen() {
  return [...document.querySelectorAll('.overlay')].some((el) => el.classList.contains('is-open'));
}

function showTitle() {
  closeAllOverlays();
  game.showMenu(themeOf(continueLevel().id));
  applyTheme(themeOf(continueLevel().id));
  updatePlaySub();
  setSoundIcon();
  showScreen('screen-title');
}

function showLevels() {
  closeAllOverlays();
  game.showMenu(themeOf(continueLevel().id));
  applyTheme(themeOf(continueLevel().id));
  buildLevelCards();
  showScreen('screen-levels');
}

function showCustomize() {
  closeAllOverlays();
  game.showMenu(themeOf(continueLevel().id));
  applyTheme(themeOf(continueLevel().id));
  buildCustomize();
  showScreen('screen-customize');
}

function updatePlaySub() {
  const l = continueLevel();
  const st = save.levels[l.id];
  const sub = st.completed ? 'ALL CLEAR · REPLAY' : `CONTINUE · ${l.name}`;
  $('play-sub').textContent = sub;
}

/* ───────────────────────── title actions ───────────────────────── */

$('btn-play').addEventListener('click', () => {
  audio.init();
  audio.resume();
  startLevel(continueLevel().id, false);
});
$('btn-levels').addEventListener('click', () => { audio.sfx('click'); showLevels(); });
$('btn-customize').addEventListener('click', () => { audio.sfx('click'); showCustomize(); });
$('btn-how').addEventListener('click', () => { audio.sfx('click'); openOverlay('overlay-how'); });
$('btn-settings').addEventListener('click', () => { audio.sfx('click'); syncSettingsUI(); openOverlay('overlay-settings'); });
$('btn-sound').addEventListener('click', () => {
  save.settings.muted = !save.settings.muted;
  applySettings();
  setSoundIcon();
  persist();
  if (!save.settings.muted) audio.sfx('click');
});

document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
  audio.sfx('click');
  if ($('screen-customize').classList.contains('is-active')) showTitle();
  else showTitle();
}));

/* ───────────────────────── level select ───────────────────────── */

const ART_SPIKES = [16, 34, 52, 70, 86];

function buildLevelCards() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  let completed = 0;

  LEVELS.forEach((l, i) => {
    const st = save.levels[l.id];
    const theme = THEMES[l.theme];
    const open = unlocked(i);
    if (st.completed) completed++;

    const card = document.createElement('div');
    card.className = `level-card${open ? '' : ' locked'}`;
    card.style.setProperty('--card-accent', theme.accent);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', open ? '0' : '-1');
    card.setAttribute('aria-label', `${l.name}${open ? '' : ' (locked)'}`);
    card.dataset.level = l.id;

    const spikes = ART_SPIKES.map((p, k) => `<i class="art-spike" style="left:${p}%;bottom:2px"></i>`).join('');
    const blocks = [30, 60].map((p) => `<i class="art-block" style="left:${p}%;bottom:1px"></i>`).join('');

    card.innerHTML = `
      <div class="card-top">
        <span class="card-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="card-diff">${esc(l.difficulty)}</span>
      </div>
      <h3 class="card-title">${esc(l.name)}</h3>
      <div class="card-sub">${esc(l.subtitle)}</div>
      <div class="card-art">
        <i class="art-ground"></i>${blocks}${spikes}
        <i class="art-cube" style="left:${st.best >= 100 ? 82 : 8}%;bottom:2px"></i>
      </div>
      <div class="card-foot">
        <div class="card-progress"><span style="width:${Math.max(st.best, st.completed ? 100 : 0)}%"></span></div>
        <b>${st.completed ? 'DONE' : `${Math.floor(st.best)}%`}</b>
      </div>
      <div class="card-meta">
        <span class="card-coins">${st.coins.map((c) => `<i class="${c ? 'on' : ''}"></i>`).join('')}</span>
        <span>${st.completed ? 'COMPLETED' : `BEST ${Math.floor(st.best)}%`}</span>
        ${open ? '<span class="card-practice" role="button" tabindex="0">PRACTICE</span>' : ''}
      </div>
      ${open ? '' : `<div class="card-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>`}
    `;

    const activate = (practice) => {
      if (!open) return;
      audio.sfx('click');
      startLevel(l.id, practice);
    };
    card.addEventListener('click', (e) => {
      const prac = e.target.closest('.card-practice');
      activate(!!prac);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(false); }
    });
    grid.appendChild(card);
  });

  // endless card
  const ec = document.createElement('div');
  ec.className = 'level-card endless';
  ec.setAttribute('role', 'button');
  ec.setAttribute('tabindex', '0');
  ec.innerHTML = `
    <div class="card-main">
      <div class="card-top" style="justify-content:flex-start;gap:12px">
        <span class="card-num">∞</span>
        <span class="card-diff" style="color:var(--accent-2);border-color:rgba(255,45,149,.42);background:rgba(255,45,149,.09)">ENDLESS</span>
      </div>
      <h3 class="card-title">${esc(ENDLESS.name)}</h3>
      <div class="card-sub">${esc(ENDLESS.subtitle)} · BEST ${Number(save.endless.best) || 0} m</div>
    </div>
    <span class="card-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
  `;
  ec.addEventListener('click', () => { audio.sfx('click'); startEndless(); });
  ec.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEndless(); }
  });
  grid.appendChild(ec);

  $('levels-total').textContent = `${completed}/${LEVELS.length}`;
}

/* ───────────────────────── start / flow ───────────────────────── */

function prepareLevelUI(level, practice) {
  closeAllOverlays();
  applyTheme(level.theme);
  $('hud-level').textContent = level.name;
  $('hud-attempt').textContent = 'ATTEMPT 01';
  $('hud-percent').textContent = '0%';
  $('hud-best').textContent = practice ? 'PRACTICE RUN' : `BEST ${Math.floor(save.levels[level.id]?.best || 0)}%`;
  $('progress-fill').style.width = '0%';
  document.querySelectorAll('#hud-coins i').forEach((el) => el.classList.remove('on'));
  $('practice-strip').classList.toggle('show', practice);
  $('btn-practice-toggle').textContent = `PRACTICE MODE: ${practice ? 'ON' : 'OFF'}`;
  $('tap-prompt').classList.remove('hide');
  $('attempt-toast').classList.remove('show');
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => $('tap-prompt').classList.add('hide'), 5200);
  showScreen('screen-game');
}

function startLevel(id, practice) {
  const level = levelById(id);
  if (!level) return;
  applyStyle();
  applySettings();
  save.lastLevel = id;
  persist();
  prepareLevelUI(level, practice);
  game.loadLevel(level, { practice });
}

function startEndless() {
  applyStyle();
  applySettings();
  ajaxEndless();
  prepareLevelUI(endlessLevel, false);
  game.loadLevel(endlessLevel, { practice: false });
  $('hud-best').textContent = `BEST ${Number(save.endless.best) || 0} m`;
}

// (kept as a tiny named function so the random-seeded level is built once)
function ajaxEndless() {
  if (!endlessLevel) endlessLevel = buildLevelById('endless');
}

/* ───────────────────────── HUD callbacks ───────────────────────── */

let toastTimer = 0;
let tapTimer = 0;
let completeTimer = 0;

function toast(text, duration = 1100) {
  const el = $('attempt-toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

Object.assign(game.callbacks, {
  firstInput() {
    $('tap-prompt').classList.add('hide');
  },
  attempt({ attempt, practice, endless }) {
    $('hud-attempt').textContent = `ATTEMPT ${String(attempt).padStart(2, '0')}`;
    if (attempt > 1) {
      toast(endless ? `RUN ${String(attempt).padStart(2, '0')}` : `ATTEMPT ${String(attempt).padStart(2, '0')}`);
    } else if (practice) {
      toast('PRACTICE MODE', 1400);
    }
  },
  progress(p) {
    const endless = p.endless;
    $('hud-percent').textContent = endless ? `${p.score} m` : `${p.intPercent}%`;
    $('progress-fill').style.width = `${endless ? Math.min(100, (p.score / 2600) * 100) : p.percent}%`;
    const dots = document.querySelectorAll('#hud-coins i');
    dots.forEach((d, i) => d.classList.toggle('on', !!p.coins[i]));
    if (!endless) {
      const best = Math.max(Number(save.levels[game.level?.id]?.best) || 0, p.maxPercent);
      $('hud-best').textContent = p.practice ? 'PRACTICE RUN' : `BEST ${Math.floor(best)}%`;
    }
  },
  coin({ coins }) {
    const n = coins.filter(Boolean).length;
    toast(`COIN ${n}/3`, 900);
  },
  checkpoint({ ok, tooSoon }) {
    if (ok) toast('CHECKPOINT SET', 900);
    else if (tooSoon) toast('TOO SOON', 700);
  },
  death(d) {
    const id = game.level?.id;
    if (id && save.levels[id] && !d.practice) {
      save.levels[id].best = Math.max(save.levels[id].best, d.maxPercent);
      save.levels[id].attempts = (save.levels[id].attempts || 0) + 1;
      persist();
      $('hud-best').textContent = `BEST ${Math.floor(save.levels[id].best)}%`;
    }
    if (d.endless && d.score > (save.endless.best || 0)) {
      // best is committed on game-over screen, but show live
      $('hud-best').textContent = `BEST ${Number(save.endless.best) || 0} m`;
    }
  },
  complete(stats) {
    const level = stats.level;
    const st = save.levels[level.id];
    if (st && !stats.practice) {
      const wasCompleted = st.completed;
      st.completed = true;
      st.best = 100;
      st.coins = st.coins.map((c, i) => c || !!stats.coins[i]);
      st.attempts = (st.attempts || 0) + 1;
      if (!wasCompleted) audio.sfx('unlock');
      persist();
    }
    $('progress-fill').style.width = '100%';
    $('hud-percent').textContent = '100%';
    document.querySelectorAll('#hud-coins i').forEach((d, i) => d.classList.toggle('on', !!stats.coins[i]));

    const allCoins = stats.coins.every(Boolean);
    $('complete-kicker').textContent = stats.practice
      ? 'PRACTICE RUN CLEAR · NO PROGRESS SAVED'
      : allCoins ? '100% COMPLETE · ALL COINS' : '100% COMPLETE';
    $('complete-level').textContent = level.name;
    document.querySelectorAll('#complete-coins i').forEach((d, i) => {
      d.classList.remove('on');
      if (stats.coins[i]) {
        setTimeout(() => d.classList.add('on'), 200 + i * 130);
      }
    });
    $('stat-attempts').textContent = stats.attempts;
    $('stat-jumps').textContent = stats.jumps;
    $('stat-time').textContent = fmtTime(stats.time);
    $('stat-best').textContent = stats.practice ? '—' : '100%';

    const idx = LEVELS.findIndex((l) => l.id === level.id);
    const next = LEVELS[idx + 1];
    const nextBtn = $('btn-next');
    if (stats.practice || !next) {
      nextBtn.disabled = true;
      nextBtn.textContent = !next ? 'ALL CLEAR' : 'PRACTICE ONLY';
    } else {
      nextBtn.disabled = false;
      nextBtn.textContent = `NEXT: ${next.name}`;
    }
    nextBtn.dataset.next = next ? next.id : '';

    clearTimeout(completeTimer);
    completeTimer = setTimeout(() => openOverlay('overlay-complete'), 520);
  },
  endlessOver(data) {
    const best = Math.max(Number(save.endless.best) || 0, data.score);
    save.endless.best = best;
    save.endless.runs = (save.endless.runs || 0) + 1;
    persist();
    $('gameover-score').textContent = data.score;
    $('gameover-best').textContent = `BEST · ${best} m`;
    openOverlay('overlay-gameover');
  },
  mode({ mode }) {
    if (mode !== 'cube') toast(mode.toUpperCase(), 800);
  },
  autoPause() {
    if (game.state !== 'playing') return;
    game.pause();
    syncPause();
    openOverlay('overlay-pause');
  }
});

/* ───────────────────────── pause ───────────────────────── */

function syncPause() {
  const level = game.level;
  if (!level) return;
  $('pause-level').textContent = level.name;
  $('pause-percent').textContent = game.endless ? `${game.score} m` : `${Math.floor(game.percent)}%`;
  $('pause-fill').style.width = `${game.endless ? Math.min(100, (game.score / 2600) * 100) : game.percent}%`;
  $('btn-practice-toggle').textContent = `PRACTICE MODE: ${game.practice ? 'ON' : 'OFF'}`;
  $('btn-practice-toggle').style.display = game.endless ? 'none' : '';
}

$('btn-pause').addEventListener('click', () => {
  if (game.state !== 'playing') return;
  audio.sfx('click');
  game.pause();
  syncPause();
  openOverlay('overlay-pause');
});
$('btn-resume').addEventListener('click', () => {
  audio.sfx('click');
  closeOverlay('overlay-pause');
  game.resume();
});
$('btn-restart').addEventListener('click', () => {
  audio.sfx('click');
  closeOverlay('overlay-pause');
  game.restartRun(false);
  $('tap-prompt').classList.add('hide');
});
$('btn-practice-toggle').addEventListener('click', () => {
  if (game.endless) return;
  audio.sfx('click');
  const on = !game.practice;
  game.setPractice(on);
  audio.duck(false);
  closeOverlay('overlay-pause');
  $('practice-strip').classList.toggle('show', on);
  $('tap-prompt').classList.toggle('hide', on);
  toast(on ? 'PRACTICE MODE ON' : 'PRACTICE MODE OFF', 1200);
});
$('btn-quit').addEventListener('click', () => {
  audio.sfx('click');
  closeAllOverlays();
  quitToTitle();
});
$('btn-checkpoint').addEventListener('click', () => {
  if (game.state !== 'playing') return;
  game.placeCheckpoint();
});

/* ───────────────────────── complete / game over ───────────────────────── */

$('btn-complete-replay').addEventListener('click', () => {
  audio.sfx('click');
  closeAllOverlays();
  game.restartRun(true);
  $('tap-prompt').classList.add('hide');
});
$('btn-next').addEventListener('click', () => {
  const id = $('btn-next').dataset.next;
  if (!id || $('btn-next').disabled) return;
  audio.sfx('click');
  closeAllOverlays();
  startLevel(id, false);
});
$('btn-complete-levels').addEventListener('click', () => { audio.sfx('click'); showLevels(); });
$('btn-endless-retry').addEventListener('click', () => {
  audio.sfx('click');
  closeAllOverlays();
  game.restartRun(true);
  $('tap-prompt').classList.add('hide');
});
$('btn-endless-quit').addEventListener('click', () => { audio.sfx('click'); quitToTitle(); });

function quitToTitle() {
  game.quitToMenu();
  showTitle();
}

/* ───────────────────────── customize ───────────────────────── */

let previewRAF = 0;

function buildCustomize() {
  const grid = $('icon-grid');
  grid.innerHTML = '';
  ICONS.forEach((icon) => {
    const btn = document.createElement('button');
    btn.className = `icon-option${icon.id === save.icon ? ' selected' : ''}`;
    btn.setAttribute('aria-label', icon.name);
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 128;
    btn.appendChild(cv);
    drawIconPreview(cv, icon, getTrail(save.trail), -0.16);
    btn.addEventListener('click', () => {
      save.icon = icon.id;
      applyStyle();
      persist();
      audio.sfx('click');
      buildCustomize();
    });
    grid.appendChild(btn);
  });

  const row = $('trail-row');
  row.innerHTML = '';
  TRAILS.forEach((trail) => {
    const btn = document.createElement('button');
    btn.className = `trail-option${trail.id === save.trail ? ' selected' : ''}`;
    btn.style.setProperty('--swatch', trail.color);
    btn.setAttribute('aria-label', `${trail.id} trail`);
    btn.innerHTML = '<i></i>';
    btn.addEventListener('click', () => {
      save.trail = trail.id;
      applyStyle();
      persist();
      audio.sfx('click');
      buildCustomize();
    });
    row.appendChild(btn);
  });

  const icon = getIcon(save.icon);
  $('icon-count').textContent = `${ICONS.indexOf(icon) + 1}/${ICONS.length}`;
  $('icon-preview').parentElement?.querySelector('.preview-label')?.replaceChildren(document.createTextNode(icon.name));

  cancelAnimationFrame(previewRAF);
  const canvas = $('icon-preview');
  const loop = (now) => {
    if (!$('screen-customize').classList.contains('is-active')) return;
    const angle = -0.16 + Math.sin(now / 800) * 0.12;
    drawIconPreview(canvas, getIcon(save.icon), getTrail(save.trail), angle);
    previewRAF = requestAnimationFrame(loop);
  };
  previewRAF = requestAnimationFrame(loop);
}

/* ───────────────────────── settings ───────────────────────── */

const musicSlider = $('set-music');
const sfxSlider = $('set-sfx');

function syncSettingsUI() {
  musicSlider.value = Math.round(save.settings.music * 100);
  sfxSlider.value = Math.round(save.settings.sfx * 100);
  $('out-music').textContent = musicSlider.value;
  $('out-sfx').textContent = sfxSlider.value;
  setToggle('set-shake', save.settings.shake);
  setToggle('set-particles', save.settings.particles);
  setToggle('set-vibe', save.settings.haptics);
}

function setToggle(id, on) {
  const el = $(id);
  el.setAttribute('aria-checked', on ? 'true' : 'false');
}

function bindToggle(id, key, after) {
  $(id).addEventListener('click', () => {
    save.settings[key] = !save.settings[key];
    setToggle(id, save.settings[key]);
    applySettings();
    persist();
    audio.sfx('click');
    after?.();
  });
}

musicSlider.addEventListener('input', () => {
  save.settings.music = Number(musicSlider.value) / 100;
  $('out-music').textContent = musicSlider.value;
  audio.setMusicVolume(save.settings.music);
  persist();
});
sfxSlider.addEventListener('input', () => {
  save.settings.sfx = Number(sfxSlider.value) / 100;
  $('out-sfx').textContent = sfxSlider.value;
  audio.setSfxVolume(save.settings.sfx);
  persist();
});
sfxSlider.addEventListener('change', () => audio.sfx('coin'));
bindToggle('set-shake', 'shake');
bindToggle('set-particles', 'particles');
bindToggle('set-vibe', 'haptics');

$('btn-reset-progress').addEventListener('click', () => {
  audio.sfx('click');
  closeAllOverlays();
  openOverlay('overlay-confirm');
});
$('btn-confirm-reset').addEventListener('click', () => {
  save.levels = freshLevels();
  save.endless = { best: 0, runs: 0 };
  save.lastLevel = 'neon';
  persist();
  closeAllOverlays();
  updatePlaySub();
  showTitle();
  audio.sfx('unlock');
});

/* overlay close buttons + backdrop */
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', (e) => {
  const overlay = e.target.closest('.overlay');
  if (overlay) { overlay.classList.remove('is-open'); audio.sfx('click'); }
}));
document.querySelectorAll('.overlay').forEach((overlay) => {
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) overlay.classList.remove('is-open');
  });
});

/* keyboard shortcuts */
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    const open = [...document.querySelectorAll('.overlay.is-open')];
    if (open.length) {
      open[open.length - 1].classList.remove('is-open');
      return;
    }
    if (game.state === 'playing') {
      game.pause();
      syncPause();
      openOverlay('overlay-pause');
    } else if (game.state === 'paused') {
      closeOverlay('overlay-pause');
      game.resume();
    }
  }
  if (e.code === 'KeyR' && (game.state === 'playing' || game.state === 'paused')) {
    closeAllOverlays();
    game.restartRun(false);
  }
  if (e.code === 'KeyC' && game.state === 'playing' && game.practice) {
    game.placeCheckpoint();
  }
});

/* ───────────────────────── utils ───────────────────────── */

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ───────────────────────── boot ───────────────────────── */

levelCache = new Map(LEVELS.map((l) => [l.id, buildLevelById(l.id)]));
ajaxEndless();

applyStyle();
applySettings();
setSoundIcon();
updatePlaySub();
syncSettingsUI();

const theme = themeOf(continueLevel().id);
applyTheme(theme);
game.setMenuTheme(theme);
game.setSettings(save.settings);

// initial paint behind the title
showScreen('screen-title');

// unlock audio on the first gesture anywhere
document.addEventListener('pointerdown', () => {
  audio.init();
  audio.resume();
}, { once: true });

window.addEventListener('pagehide', persist);

// Opt-in test/debug handle. Keeps the production global namespace clean.
if (new URLSearchParams(location.search).has('debug')) {
  window.__geodash = { game, audio, save, LEVELS, levelById, startLevel, startEndless, persist };
}
