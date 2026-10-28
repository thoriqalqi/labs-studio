// Cap tanggal kamera film: angka (dan sebagian huruf) LED 7-segmen oranye yang berpendar, sedikit miring,
// seperti tanggal yang tercetak di pojok foto kamera saku. Contoh isi: '24 10 28, +220, BEFORE, 29RB.
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// segmen: a atas, b kanan-atas, c kanan-bawah, d bawah, e kiri-bawah, f kiri-atas, g tengah
const SEG = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  A: 'abcefg', B: 'cdefg', C: 'adef', D: 'bcdeg', E: 'adefg', F: 'aefg', G: 'acdef', H: 'bcefg', I: 'ef', J: 'bcde',
  K: 'bcefg', L: 'def', M: 'aceg', N: 'ceg', O: 'abcdef', P: 'abefg', Q: 'abcfg', R: 'eg', S: 'acdfg', T: 'defg',
  U: 'bcdef', V: 'cde', W: 'bdf', X: 'bcefg', Y: 'bcdfg', Z: 'abdeg', '-': 'g', _: 'd'
};

function hexRgb(hex) {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// satu segmen sebagai segi enam memanjang
function seg(ctx, x0, y0, x1, y1, t) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * (t / 2);
  const ny = ux * (t / 2);
  const g = t * 0.55; // celah di ujung
  const ax = x0 + ux * g;
  const ay = y0 + uy * g;
  const bx = x1 - ux * g;
  const by = y1 - uy * g;
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + ux * t * 0.5 + nx, ay + uy * t * 0.5 + ny);
  ctx.lineTo(bx - ux * t * 0.5 + nx, by - uy * t * 0.5 + ny);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx - ux * t * 0.5 - nx, by - uy * t * 0.5 - ny);
  ctx.lineTo(ax + ux * t * 0.5 - nx, ay + uy * t * 0.5 - ny);
  ctx.closePath();
}

function charWidth(ch, s) {
  if (ch === ' ') return s * 0.42;
  if (ch === "'" || ch === '.' || ch === ':' || ch === ',') return s * 0.22;
  if (ch === '+') return s * 0.6;
  return s * 0.58;
}

function layout(text, s, gap) {
  const chars = [...String(text || '').toUpperCase()];
  let w = 0;
  const out = chars.map((ch) => {
    const cw = charWidth(ch, s);
    const c = { ch, x: w, w: cw };
    w += cw + gap;
    return c;
  });
  return { chars: out, w: Math.max(0, w - gap) };
}

function drawChar(ctx, ch, x, s, on) {
  const W = s * 0.5;
  const H = s;
  const t = s * 0.11;
  const top = -H / 2;
  const mid = 0;
  const bot = H / 2;
  if (ch === "'") { ctx.beginPath(); seg(ctx, x + s * 0.11, top, x + s * 0.06, top + s * 0.28, t); ctx.fill(); return; }
  if (ch === '.' || ch === ',') { ctx.beginPath(); ctx.arc(x + s * 0.1, bot - t * 0.6, t * 0.6, 0, Math.PI * 2); ctx.fill(); return; }
  if (ch === ':') { ctx.beginPath(); ctx.arc(x + s * 0.1, -s * 0.2, t * 0.6, 0, Math.PI * 2); ctx.arc(x + s * 0.1, s * 0.2, t * 0.6, 0, Math.PI * 2); ctx.fill(); return; }
  if (ch === '+') {
    if (!on) return;
    ctx.beginPath();
    seg(ctx, x + s * 0.05, mid, x + s * 0.55, mid, t);
    seg(ctx, x + s * 0.3, -s * 0.25, x + s * 0.3, s * 0.25, t);
    ctx.fill();
    return;
  }
  const code = on ? SEG[ch] ?? '' : 'abcdefg';
  const P = {
    a: [x, top, x + W, top], b: [x + W, top, x + W, mid], c: [x + W, mid, x + W, bot],
    d: [x, bot, x + W, bot], e: [x, mid, x, bot], f: [x, top, x, mid], g: [x, mid, x + W, mid]
  };
  ctx.beginPath();
  for (const k of code) {
    const [x0, y0, x1, y1] = P[k];
    seg(ctx, x0, y0, x1, y1, t);
  }
  ctx.fill();
}

export default {
  type: 'datestamp',
  name: 'Cap tanggal kamera',
  icon: '⁘',
  category: 'Promo',
  order: 50,
  defaults: { text: "'24 10 28", size: 64, color: '#ff7a1a', glow: 0.7, skew: -8, ghost: 0, reveal: 1, gap: 0.12 },
  schema: [
    { key: 'text', label: 'Teks (angka & huruf 7-segmen)', kind: 'text' },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 4, step: 1, animatable: true },
    { key: 'color', label: 'Warna', kind: 'color', animatable: true },
    { key: 'glow', label: 'Pendar LED (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'skew', label: 'Miring (°)', kind: 'number', step: 1, animatable: true },
    { key: 'ghost', label: 'Segmen mati samar (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'reveal', label: 'Muncul per karakter (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'gap', label: 'Jarak karakter', kind: 'number', min: 0, step: 0.01 }
  ],
  size: (p) => {
    const { w } = layout(p.text, p.size, p.size * p.gap);
    return { w: w + p.size * 0.3, h: p.size * 1.25 };
  },
  draw(ctx, p) {
    const s = p.size;
    const { chars, w } = layout(p.text, s, s * p.gap);
    const shown = Math.round(clamp01(p.reveal) * chars.length);
    const c = hexRgb(p.color);
    ctx.save();
    ctx.transform(1, 0, Math.tan((p.skew * Math.PI) / 180), 1, 0, 0);
    ctx.translate(-w / 2, 0);
    // segmen mati (samar) seperti layar LED asli
    if (p.ghost > 0) {
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.08 * p.ghost})`;
      for (const k of chars) if (SEG[k.ch] !== undefined) drawChar(ctx, k.ch, k.x, s, false);
    }
    const lit = () => chars.slice(0, shown).forEach((k) => drawChar(ctx, k.ch, k.x, s, true));
    if (p.glow > 0) {
      ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},${0.9 * p.glow})`;
      ctx.shadowBlur = s * 0.45 * p.glow;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.55)`;
      lit();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }
    // inti segmen sedikit lebih terang di tengah
    ctx.fillStyle = `rgb(${Math.min(255, c[0] + 20)},${Math.min(255, c[1] + 40)},${Math.min(255, c[2] + 40)})`;
    lit();
    ctx.restore();
  }
};
