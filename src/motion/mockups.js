// Gambar tiruan tampilan Motion Studio (untuk video demo / intro). Semua digambar di
// ukuran desain 1600×1000 lalu diskalakan. t = detik (untuk animasi kecil di dalam layar).
import { drawMark } from './layers/logo.js';

export const THEME = {
  bg: '#0a1330', panel: '#0e1a3b', panel2: '#132350', line: '#24366a',
  text: '#e9f0ff', muted: '#8796bf', accent: '#3d7bff', accent2: '#7cc4ff', danger: '#ff5a6e'
};
const T = THEME;
const F = '"Plus Jakarta Sans", system-ui, sans-serif';
const DW = 1600;
const DH = 1000;
const ease = (x) => { const k = Math.min(1, Math.max(0, x)); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

function rr(g, x, y, w, h, r, fill, stroke, lw = 2) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function text(g, s, x, y, size, color = T.text, weight = 600, align = 'left') {
  g.font = `${weight} ${size}px ${F}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
function diamond(g, x, y, s, fill) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.PI / 4);
  g.fillStyle = fill;
  g.fillRect(-s / 2, -s / 2, s, s);
  g.restore();
}
export function cursor(g, x, y, s = 44, click = 0) {
  g.save();
  g.translate(x, y);
  if (click > 0) {
    g.globalAlpha = 1 - click;
    g.strokeStyle = T.accent2;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, 0, s * (0.3 + click * 0.7), 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
  const k = 1 - Math.sin(Math.min(1, click) * Math.PI) * 0.15;
  g.scale(k, k);
  const gr = g.createLinearGradient(0, 0, s * 0.7, s * 0.8);
  gr.addColorStop(0, T.accent2);
  gr.addColorStop(1, T.accent);
  g.shadowColor = T.accent;
  g.shadowBlur = 18;
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(s * 0.86, s * 0.34);
  g.quadraticCurveTo(s * 0.46, s * 0.44, s * 0.38, s * 0.86);
  g.closePath();
  g.fill();
  g.restore();
}
function miniGradient(g, x, y, w, h, t, r = 14) {
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.clip();
  g.fillStyle = '#0b1a44';
  g.fillRect(x, y, w, h);
  [['#2f6bff', 0.3, 0.4], ['#e8f3ff', 0.7, 0.6], ['#5aa8ff', 0.5, 0.2]].forEach(([c, fx, fy], i) => {
    const cx = x + w * (fx + 0.15 * Math.sin(t * 0.8 + i * 2));
    const cy = y + h * (fy + 0.15 * Math.cos(t * 0.7 + i));
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
    rg.addColorStop(0, c);
    rg.addColorStop(1, `${c}00`);
    g.fillStyle = rg;
    g.fillRect(x, y, w, h);
  });
  g.restore();
}
// interpolasi posisi kursor di sepanjang titik [t, x, y]
function path(points, t) {
  if (t <= points[0][0]) return points[0].slice(1);
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i][0]) {
      const [t0, x0, y0] = points[i - 1];
      const [t1, x1, y1] = points[i];
      const k = ease((t - t0) / (t1 - t0));
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  return points[points.length - 1].slice(1);
}
const clickAt = (t, at) => (t > at && t < at + 0.45 ? (t - at) / 0.45 : 0);

// ---------- seluruh editor ----------
function editor(g, t, opts = {}) {
  rr(g, 0, 0, DW, DH, 28, T.bg);
  // topbar
  g.fillStyle = T.panel;
  g.fillRect(0, 0, DW, 70);
  drawMark(g, 46, 35, 34, T.accent, '#ffffff');
  text(g, opts.brand || 'Motion Studio', 76, 36, 22, T.text, 700);
  rr(g, 290, 20, 74, 30, 9, T.panel2);
  text(g, 'Undo', 327, 36, 14, T.muted, 600, 'center');
  rr(g, 372, 20, 74, 30, 9, T.panel2);
  text(g, 'Redo', 409, 36, 14, T.muted, 600, 'center');
  rr(g, DW - 196, 18, 170, 34, 10, T.accent);
  text(g, 'Export MP4', DW - 111, 36, 15, '#ffffff', 700, 'center');
  // panel kiri: tambah layer
  g.fillStyle = T.panel;
  g.fillRect(0, 70, 250, 640);
  text(g, 'ADD', 24, 100, 13, T.muted, 700);
  const tiles = [['T', 'Text'], ['◼', 'Shape'], ['◍', 'Liquid'], ['☺', '3D'], ['▣', 'Image'], ['♪', 'Audio']];
  tiles.forEach(([ic, lb], i) => {
    const x = 20 + (i % 2) * 108;
    const y = 122 + Math.floor(i / 2) * 92;
    rr(g, x, y, 98, 80, 12, T.panel2, T.line, 1);
    text(g, ic, x + 49, y + 32, 24, T.accent2, 700, 'center');
    text(g, lb, x + 49, y + 60, 13, T.text, 600, 'center');
  });
  // inspector kanan
  g.fillStyle = T.panel;
  g.fillRect(DW - 300, 70, 300, 640);
  text(g, 'Inspector', DW - 276, 102, 16, T.text, 700);
  ['Position X', 'Position Y', 'Scale', 'Rotation', 'Opacity', 'Blur'].forEach((lb, i) => {
    const y = 140 + i * 50;
    diamond(g, DW - 270, y, 10, i < 3 ? T.accent2 : T.line);
    text(g, lb, DW - 252, y, 14, T.muted, 600);
    rr(g, DW - 130, y - 16, 104, 32, 8, T.panel2, T.line, 1);
    text(g, ['960', '540', '100%', '0°', '100%', '0'][i], DW - 78, y, 14, T.text, 600, 'center');
  });
  // kanvas pratinjau
  const px = 290;
  const py = 100;
  const pw = DW - 300 - 40 - px;
  const ph = pw * 9 / 16;
  miniGradient(g, px, py, pw, ph, t, 12);
  const pop = ease((t % 6) / 0.8);
  g.save();
  g.globalAlpha = pop;
  text(g, 'Your story,', px + pw / 2, py + ph * 0.42 + (1 - pop) * 20, 54, '#ffffff', 700, 'center');
  text(g, 'in motion.', px + pw / 2, py + ph * 0.58 + (1 - pop) * 20, 54, T.accent2, 700, 'center');
  g.restore();
  // timeline
  g.fillStyle = '#081029';
  g.fillRect(0, 710, DW, DH - 710);
  for (let i = 0; i <= 12; i++) {
    const x = 250 + i * 110;
    g.fillStyle = T.line;
    g.fillRect(x, 720, 1, 14);
    text(g, `0:${String(i * 2).padStart(2, '0')}`, x + 6, 728, 11, T.muted, 600);
  }
  const rows = [['Title', 0.05, 0.55, '#3d6bd6'], ['Logo', 0.3, 0.8, '#5a7fd8'], ['Shape', 0.1, 0.95, '#2f5aa8'], ['Liquid', 0, 1, '#22346a'], ['Music', 0, 1, '#1e3f66']];
  rows.forEach(([nm, a, b, col], i) => {
    const y = 748 + i * 46;
    text(g, nm, 24, y + 17, 14, T.text, 600);
    rr(g, 250 + a * 1320, y, (b - a) * 1320, 34, 8, col);
    if (i < 3) {
      diamond(g, 250 + (a + 0.05) * 1320, y + 17, 10, '#ffd7a8');
      diamond(g, 250 + (a + 0.2) * 1320, y + 17, 10, '#ffd7a8');
    }
  });
  const ph2 = 250 + ((t * 0.12) % 1) * 1320;
  g.fillStyle = T.danger;
  g.fillRect(ph2, 716, 2, DH - 730);
}

// ---------- timeline dekat, kursor menggeser keyframe ----------
function timeline(g, t) {
  rr(g, 0, 0, DW, DH, 28, '#081029');
  text(g, 'TIMELINE', 40, 50, 16, T.muted, 700);
  rr(g, 1260, 30, 300, 40, 12, T.panel2, T.line, 1);
  text(g, 'Ease: Smooth in & out', 1410, 50, 15, T.text, 600, 'center');
  for (let i = 0; i <= 10; i++) {
    const x = 340 + i * 120;
    g.fillStyle = T.line;
    g.fillRect(x, 90, 1, 20);
    text(g, `0:0${i}`.slice(-4), x + 8, 100, 13, T.muted, 600);
  }
  const rows = [['Headline', '#3d6bd6'], ['Subtitle', '#4a74d0'], ['Logo', '#5a7fd8'], ['Card', '#2f5aa8'], ['Liquid gradient', '#22346a'], ['Voice over', '#1e3f66']];
  const dragK = ease((t - 0.8) / 1.1);
  rows.forEach(([nm, col], i) => {
    const y = 130 + i * 140;
    const sel = i === 1;
    rr(g, 20, y, DW - 40, 120, 16, sel ? '#10204a' : T.panel, sel ? T.accent : null, 2);
    g.fillStyle = T.accent2;
    g.beginPath();
    g.arc(52, y + 60, 6, 0, Math.PI * 2);
    g.fill();
    text(g, nm, 76, y + 60, 22, T.text, 600);
    const a = 0.03 + (i % 3) * 0.08;
    rr(g, 340 + a * 1200, y + 30, (0.9 - a) * 1200, 60, 12, col);
    if (i < 4) {
      diamond(g, 340 + (a + 0.04) * 1200, y + 60, 20, '#ffd7a8');
      const kx = sel ? 340 + (0.32 + dragK * 0.18) * 1200 : 340 + (a + 0.3) * 1200;
      diamond(g, kx, y + 60, sel ? 24 : 20, sel && t > 0.8 && t < 2 ? '#ffffff' : '#ffd7a8');
    }
  });
  const [cx, cy] = path([[0, 1300, 900], [0.75, 340 + 0.32 * 1200 + 4, 130 + 140 + 64], [1.9, 340 + 0.5 * 1200 + 4, 130 + 140 + 64], [3, 340 + 0.5 * 1200 + 4, 130 + 140 + 64]], t);
  const ph = 340 + 0.12 * 1200 + ((t * 120) % 960);
  g.fillStyle = T.danger;
  g.fillRect(ph, 86, 3, DH - 110);
  cursor(g, cx, cy, 56, t > 0.75 && t < 1.9 ? 0.6 : clickAt(t, 0.7));
}

// ---------- daftar layer, kursor memilih satu ----------
function layers(g, t) {
  rr(g, 0, 0, DW, DH, 36, 'rgba(14,26,59,0.92)');
  drawMark(g, 70, 70, 40, T.accent, '#ffffff');
  text(g, 'Layers', 108, 72, 32, T.text, 700);
  const items = [['Headline', 'Text'], ['Hero', '3D character'], ['Card', 'Shape'], ['Backdrop', 'Liquid gradient'], ['Voice over', 'Audio · ElevenLabs']];
  const chosen = t > 1.15 ? 1 : -1;
  items.forEach(([nm, ty], i) => {
    const y = 140 + i * 166;
    const on = i === chosen;
    rr(g, 40, y, DW - 80, 146, 24, on ? '#16295c' : T.panel2, on ? T.accent2 : T.line, on ? 3 : 1);
    miniGradient(g, 70, y + 18, 190, 110, t + i, 14);
    if (i === 0) text(g, 'Aa', 165, y + 73, 44, '#ffffff', 700, 'center');
    if (i === 1) {
      g.fillStyle = '#f2c09a';
      g.beginPath();
      g.arc(165, y + 64, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#16161b';
      g.fillRect(140, y + 26, 50, 22);
    }
    if (i === 2) rr(g, 120, y + 48, 90, 50, 10, '#ffffff');
    if (i === 4) for (let k = 0; k < 18; k++) { const hh = 12 + 40 * Math.abs(Math.sin(k * 1.7 + t * 3)); rr(g, 86 + k * 9, y + 73 - hh / 2, 5, hh, 2, '#ffffff'); }
    text(g, nm, 300, y + 56, 34, T.text, 700);
    text(g, ty, 300, y + 98, 24, T.muted, 600);
    rr(g, DW - 260, y + 50, 170, 46, 23, on ? T.accent : 'transparent', on ? null : T.line, 2);
    text(g, on ? 'Selected' : 'Edit', DW - 175, y + 73, 20, on ? '#fff' : T.muted, 700, 'center');
  });
  const [cx, cy] = path([[0, 1100, 980], [1.0, 330, 140 + 166 + 70], [3, 330, 140 + 166 + 70]], t);
  cursor(g, cx, cy, 60, clickAt(t, 1.05));
}

// ---------- dialog ekspor dengan progres ----------
function exportView(g, t) {
  rr(g, 0, 0, DW, DH, 36, 'rgba(10,19,48,0.95)');
  text(g, 'Export', 80, 100, 56, T.text, 700);
  text(g, 'Render straight to MP4, right on your computer.', 80, 160, 26, T.muted, 600);
  [['Resolution', '1920 × 1080'], ['Format', 'MP4 · H.264'], ['Frame rate', '60 fps'], ['Audio', 'Voice + SFX']].forEach(([a, b], i) => {
    const y = 240 + i * 110;
    rr(g, 80, y, DW - 160, 86, 20, T.panel2, T.line, 1);
    text(g, a, 120, y + 43, 28, T.muted, 600);
    text(g, b, DW - 120, y + 43, 30, T.text, 700, 'right');
  });
  const k = ease((t - 0.9) / 1.8);
  const by = 700;
  rr(g, 80, by, DW - 160, 96, 48, T.panel, T.line, 2);
  g.save();
  g.beginPath();
  g.roundRect(80, by, DW - 160, 96, 48);
  g.clip();
  const bar = g.createLinearGradient(80, 0, DW - 80, 0);
  bar.addColorStop(0, T.accent);
  bar.addColorStop(1, T.accent2);
  g.fillStyle = bar;
  g.fillRect(80, by, (DW - 160) * k, 96);
  g.restore();
  const done = k >= 1;
  text(g, done ? 'Rendered  ✓' : t < 0.9 ? 'Export MP4' : `Rendering… ${Math.round(k * 100)}%`, DW / 2, by + 49, 34, '#ffffff', 700, 'center');
  const [cx, cy] = path([[0, 1250, 980], [0.7, DW / 2 + 30, by + 60], [3, DW / 2 + 30, by + 60]], t);
  if (t < 2.2) cursor(g, cx, cy, 60, clickAt(t, 0.72));
}

export const MOCKUPS = { editor, timeline, layers, export: exportView };
export const MOCKUP_LABELS = { editor: 'Seluruh editor', timeline: 'Timeline + keyframe', layers: 'Daftar layer', export: 'Dialog ekspor' };

export function drawMockup(g, name, w, h, t, opts = {}) {
  const fn = MOCKUPS[name] || editor;
  g.save();
  g.scale(w / DW, h / DH);
  fn(g, t, opts);
  g.restore();
}
