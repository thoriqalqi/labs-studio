// Pola titik gaya editorial: bidang halftone berlubang, deretan titik bergelombang,
// atau jalur putus-putus dengan titik yang berjalan. Titik isi & titik garis dicampur (acak dengan seed tetap).
const rnd = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function dot(ctx, x, y, r, filled, p) {
  if (r <= 0.2) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = p.color;
    ctx.fill();
  } else {
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.strokeStyle = p.color;
    ctx.stroke();
  }
}

// titik pada kurva jalur (S melengkung), u = 0..1
function pathPoint(p, u) {
  const x = -p.w / 2 + p.w * u;
  const y = Math.sin(u * Math.PI * 2 * p.waves + p.phase) * p.h * 0.32 + Math.sin(u * Math.PI * 1.3) * p.h * 0.12;
  return [x, y];
}

const ICONS = ['diamond', 'square', 'play', 'note', 'gear', 'cube'];
function icon(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, s * 0.08);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'diamond') {
    ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, 0); ctx.lineTo(0, s / 2); ctx.lineTo(-s / 2, 0); ctx.closePath(); ctx.fill();
  } else if (kind === 'square') {
    ctx.roundRect(-s / 2, -s * 0.4, s, s * 0.8, s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s / 2, -s * 0.1); ctx.lineTo(s / 2, -s * 0.1); ctx.stroke();
  } else if (kind === 'play') {
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.22); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = '#ffffff';
    ctx.moveTo(-s * 0.14, -s * 0.2); ctx.lineTo(s * 0.22, 0); ctx.lineTo(-s * 0.14, s * 0.2); ctx.closePath(); ctx.fill();
  } else if (kind === 'note') {
    ctx.arc(-s * 0.15, s * 0.25, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-s * 0.02, -s * 0.45, s * 0.1, s * 0.7);
  } else if (kind === 'gear') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
      ctx.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, -s / 4); ctx.lineTo(s / 2, s / 4); ctx.lineTo(0, s / 2);
    ctx.lineTo(-s / 2, s / 4); ctx.lineTo(-s / 2, -s / 4); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(0, s / 2); ctx.moveTo(0, 0); ctx.lineTo(s / 2, -s / 4); ctx.moveTo(0, 0); ctx.lineTo(-s / 2, -s / 4);
    ctx.stroke();
  }
  ctx.restore();
}

export default {
  type: 'dots',
  name: 'Pola titik',
  icon: '⁘',
  category: 'Promo',
  order: 40,
  defaults: {
    mode: 'grid', w: 1920, h: 1080, color: '#2a2827', spacing: 36, dotSize: 13, hollow: 0.2,
    holeW: 900, holeH: 160, progress: 1, flow: 0, waves: 1, phase: 0, count: 9, icons: true, iconColor: '#e0566b', seed: 3
  },
  schema: [
    { key: 'mode', label: 'Bentuk', kind: 'select', options: { grid: 'Bidang halftone (berlubang)', row: 'Deretan titik', path: 'Jalur putus-putus' } },
    { key: 'progress', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'flow', label: 'Gerak titik (detik)', kind: 'number', step: 0.05, animatable: true },
    { key: 'w', label: 'Lebar', kind: 'number', min: 10, step: 10, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 10, step: 10, animatable: true },
    { key: 'color', label: 'Warna titik', kind: 'color', animatable: true },
    { key: 'spacing', label: 'Jarak (bidang)', kind: 'number', min: 8, step: 1 },
    { key: 'dotSize', label: 'Ukuran titik', kind: 'number', min: 1, step: 0.5, animatable: true },
    { key: 'hollow', label: 'Porsi titik kosong (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'holeW', label: 'Lebar lubang (bidang)', kind: 'number', min: 0, step: 10, animatable: true },
    { key: 'holeH', label: 'Tinggi lubang (bidang)', kind: 'number', min: 0, step: 10, animatable: true },
    { key: 'count', label: 'Jumlah titik (deret/jalur)', kind: 'number', min: 1, max: 60, step: 1 },
    { key: 'waves', label: 'Gelombang', kind: 'number', min: 0, max: 6, step: 0.1 },
    { key: 'phase', label: 'Fase gelombang', kind: 'number', step: 0.05, animatable: true },
    { key: 'icons', label: 'Ikon kecil di jalur', kind: 'checkbox' },
    { key: 'iconColor', label: 'Warna ikon', kind: 'color' },
    { key: 'seed', label: 'Variasi pola', kind: 'number', min: 0, max: 999, step: 1 }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p) {
    const r = rnd(p.seed * 7919 + 17);
    if (p.mode === 'grid') {
      const sp = Math.max(8, p.spacing);
      const cols = Math.floor(p.w / sp);
      const rows = Math.floor(p.h / sp);
      const ox = (-(cols - 1) * sp) / 2;
      const oy = (-(rows - 1) * sp) / 2;
      const hw = p.holeW / 2;
      const hh = p.holeH / 2;
      const maxD = Math.hypot(p.w / 2, p.h / 2);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = ox + i * sp;
          const y = oy + j * sp;
          const v = r();
          const hollowDot = r() < p.hollow;
          const jitter = r();
          // lubang elips di tengah (tepinya renggang secara acak)
          const e = hw > 0 && hh > 0 ? (x / hw) ** 2 + (y / hh) ** 2 : 9;
          if (e < 1 + jitter * 0.9) continue;
          if (v < 0.07) continue;
          // muncul bergelombang dari tengah ke luar
          const d = Math.hypot(x, y) / maxD;
          const k = smooth((p.progress * 1.6 - d - jitter * 0.25) / 0.35);
          const pulse = 1 + 0.12 * Math.sin(p.flow * 3 + d * 9 + jitter * 6);
          dot(ctx, x, y, (p.dotSize / 2) * k * pulse, !hollowDot, p);
        }
      }
      return;
    }
    if (p.mode === 'row') {
      const n = Math.max(1, Math.round(p.count));
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0.5 : i / (n - 1);
        const hollowDot = r() < p.hollow;
        const size = p.dotSize * (0.75 + r() * 0.5);
        const x = -p.w / 2 + p.w * u;
        const y = Math.sin(u * Math.PI * 2 * p.waves + p.phase + p.flow * 2) * p.h * 0.5;
        const k = smooth((p.progress * (n + 3) - i) / 2.5);
        dot(ctx, x, y, (size / 2) * k, !hollowDot, p);
      }
      return;
    }
    // jalur putus-putus
    const steps = 140;
    const shown = Math.max(0, Math.min(1, p.progress));
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.color;
    ctx.globalAlpha *= 0.45;
    ctx.beginPath();
    for (let s = 0; s <= steps * shown; s++) {
      const [x, y] = pathPoint(p, s / steps);
      if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    const n = Math.max(1, Math.round(p.count));
    for (let i = 0; i < n; i++) {
      const hollowDot = r() < p.hollow;
      const size = p.dotSize * (0.6 + r() * 0.9);
      // titik berjalan di sepanjang jalur (melingkar)
      const u = ((i / n + p.flow * 0.06) % 1 + 1) % 1;
      if (u > shown) continue;
      const [x, y] = pathPoint(p, u);
      const k = smooth((shown - u) / 0.08);
      dot(ctx, x, y, (size / 2) * k, !hollowDot, p);
    }
    if (p.icons) {
      const m = Math.round(n * 1.2);
      for (let i = 0; i < m; i++) {
        const u = (i + 0.5) / m + (r() - 0.5) * 0.05;
        if (u > shown) continue;
        const [x, y] = pathPoint(p, u);
        const off = (r() - 0.5) * p.h * 0.35;
        const kind = ICONS[Math.floor(r() * ICONS.length)];
        ctx.save();
        ctx.globalAlpha *= 0.85 * smooth((shown - u) / 0.1);
        icon(ctx, kind, x + (r() - 0.5) * 40, y + off, p.dotSize * 0.55, p.iconColor);
        ctx.restore();
      }
    }
  }
};
