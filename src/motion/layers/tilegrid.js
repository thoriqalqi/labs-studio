// Grid ubin modul (seperti papan sistem): ubin muncul bergiliran, satu ubin bisa disorot warna,
// baris terakhir bisa diredupkan. Animasikan "Muncul" 0 → 1 dan "Ubin disorot".
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const backOut = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

export default {
  type: 'tilegrid',
  name: 'Grid modul',
  icon: '▦',
  category: 'Promo',
  order: 49,
  defaults: {
    cols: 3, rows: 3, tile: 130, gap: 18, radius: 24, reveal: 1, active: 0, dimRows: 1, collapse: 0,
    labels: 'ui, api, auth, data, infra, deploy, cache, queue, logs',
    fill: '#e9ebf0', activeColor: '#f6c799', dimFill: '#16181d', labelColor: '#5d6170', font: 'Geist', labelSize: 15
  },
  schema: [
    { key: 'reveal', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'active', label: 'Ubin disorot (-1 = tidak)', kind: 'number', min: -1, step: 1, animatable: true },
    { key: 'collapse', label: 'Menyatu ke tengah (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'labels', label: 'Label ubin (pisahkan koma)', kind: 'textarea' },
    { key: 'cols', label: 'Kolom', kind: 'number', min: 1, max: 8, step: 1 },
    { key: 'rows', label: 'Baris', kind: 'number', min: 1, max: 8, step: 1 },
    { key: 'dimRows', label: 'Baris redup di bawah', kind: 'number', min: 0, max: 8, step: 1 },
    { key: 'tile', label: 'Ukuran ubin', kind: 'number', min: 10, step: 1, animatable: true },
    { key: 'gap', label: 'Jarak', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1 },
    { key: 'fill', label: 'Warna ubin', kind: 'color', animatable: true },
    { key: 'activeColor', label: 'Warna sorotan', kind: 'color', animatable: true },
    { key: 'dimFill', label: 'Warna ubin redup', kind: 'color' },
    { key: 'labelColor', label: 'Warna label', kind: 'color' },
    { key: 'labelSize', label: 'Ukuran label', kind: 'number', min: 4, step: 1 }
  ],
  size: (p) => ({ w: p.cols * p.tile + (p.cols - 1) * p.gap, h: p.rows * p.tile + (p.rows - 1) * p.gap }),
  draw(ctx, p) {
    const cols = Math.max(1, Math.round(p.cols));
    const rows = Math.max(1, Math.round(p.rows));
    const n = cols * rows;
    const labels = String(p.labels || '').split(',').map((s) => s.trim());
    const T = p.tile;
    const step = T + p.gap;
    const col = clamp01(p.collapse);
    const reveal = clamp01(p.reveal);
    const act = Math.round(p.active);
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      // tiap ubin muncul bergiliran (diagonal)
      const order = (c + r) / (cols + rows - 2 || 1);
      const e = clamp01((reveal - order * 0.55) / 0.45);
      if (e <= 0) continue;
      const s = backOut(e);
      let x = (c - (cols - 1) / 2) * step;
      let y = (r - (rows - 1) / 2) * step;
      x *= 1 - col;
      y *= 1 - col;
      const dim = r >= rows - Math.round(p.dimRows);
      ctx.save();
      ctx.translate(x, y + (1 - e) * T * 0.3);
      ctx.scale(s, s);
      ctx.globalAlpha *= e * (col > 0 && i !== Math.floor(n / 2) ? 1 - col : 1);
      if (!dim) {
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = T * 0.18;
        ctx.shadowOffsetY = T * 0.06;
      }
      const g = ctx.createLinearGradient(0, -T / 2, 0, T / 2);
      const base = i === act ? p.activeColor : dim ? p.dimFill : p.fill;
      g.addColorStop(0, base);
      g.addColorStop(1, dim ? base : i === act ? base : '#cfd3db');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-T / 2, -T / 2, T, T, p.radius);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      if (!dim) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      if (labels[i]) {
        ctx.fillStyle = dim ? 'rgba(255,255,255,0.35)' : i === act ? 'rgba(80,45,10,0.7)' : p.labelColor;
        ctx.font = `500 ${p.labelSize}px "${p.font}", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(labels[i], -T / 2 + T * 0.11, T / 2 - T * 0.12);
      }
      ctx.restore();
    }
  }
};
