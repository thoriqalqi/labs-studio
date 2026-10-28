// Infografis easing: grafik posisi terhadap waktu untuk linear, ease in-out, dan back (mode "Grafik"),
// atau tiga bola yang berlomba di lintasan masing-masing (mode "Lomba bola"). Kurvanya sama dengan easing
// di keys.js, jadi yang terlihat = yang dipakai studio. "draw" = garis tergambar 0 → 1, "play" = waktu 0 → 1
// (titik/bola bergerak). Murni dari props.
import { EASINGS } from '../keys.js';

const CURVES = [
  { ease: 'linear', dash: true },
  { ease: 'easeInOut' },
  { ease: 'back' }
];

export default {
  type: 'easechart',
  name: 'Grafik easing',
  icon: '∿',
  category: 'Promo',
  order: 45,
  defaults: {
    mode: 'chart', w: 950, h: 440, draw: 1, play: 0, trail: 0.6,
    names: 'Linear, Ease in-out, Back', axisX: 'WAKTU →', axisY: 'POSISI',
    c1: '#c9ccd8', c2: '#f3f1ec', c3: '#3d8bff', axis: '#f3f1ec', lineW: 5, ball: 15
  },
  schema: [
    { key: 'mode', label: 'Bentuk', kind: 'select', options: { chart: 'Grafik', race: 'Lomba bola' } },
    { key: 'draw', label: 'Garis tergambar (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'play', label: 'Waktu berjalan (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'trail', label: 'Jejak bola (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'w', label: 'Lebar', kind: 'number', min: 50, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 50, step: 1, animatable: true },
    { key: 'names', label: 'Nama kurva (pisahkan koma)', kind: 'text' },
    { key: 'axisX', label: 'Label sumbu waktu', kind: 'text' },
    { key: 'axisY', label: 'Label sumbu posisi', kind: 'text' },
    { key: 'c1', label: 'Warna linear', kind: 'color', animatable: true },
    { key: 'c2', label: 'Warna ease in-out', kind: 'color', animatable: true },
    { key: 'c3', label: 'Warna back', kind: 'color', animatable: true },
    { key: 'axis', label: 'Warna sumbu', kind: 'color' },
    { key: 'lineW', label: 'Tebal garis', kind: 'number', min: 1, step: 0.5 },
    { key: 'ball', label: 'Ukuran bola', kind: 'number', min: 2, step: 1, animatable: true }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p) {
    const cols = [p.c1, p.c2, p.c3];
    const names = String(p.names || '').split(',').map((s) => s.trim());
    const dr = Math.max(0, Math.min(1, p.draw));
    const pl = Math.max(0, Math.min(1, p.play));
    const W = p.w;
    const H = p.h;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (p.mode === 'race') {
      // tiga lintasan, bola bergerak dengan easing masing-masing
      const labelW = names.some(Boolean) ? Math.min(260, W * 0.3) : 0;
      const x0 = -W / 2 + labelW;
      // sisakan ruang untuk overshoot "back" (± 10% melewati garis finis)
      const x1 = x0 + (W / 2 - p.ball - x0) / 1.11;
      const rowH = H / 3;
      for (let i = 0; i < 3; i++) {
        const y = -H / 2 + rowH * (i + 0.5);
        const f = EASINGS[CURVES[i].ease] || EASINGS.linear;
        const len = (x1 - x0) * dr;
        ctx.globalAlpha = dr;
        ctx.fillStyle = cols[i];
        ctx.font = `500 26px "Geist", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(names[i] || '', -W / 2, y);
        ctx.strokeStyle = 'rgba(243,241,236,0.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash(CURVES[i].dash ? [6, 8] : []);
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + len, y);
        ctx.stroke();
        ctx.setLineDash([]);
        // garis finis
        ctx.strokeStyle = 'rgba(243,241,236,0.35)';
        ctx.beginPath();
        ctx.moveTo(x1, y - p.ball * 1.3);
        ctx.lineTo(x1, y + p.ball * 1.3);
        ctx.stroke();
        // jejak: beberapa bola samar di waktu sebelumnya
        const steps = 6;
        for (let s = steps; s >= 0; s--) {
          const tt = Math.max(0, pl - s * 0.035);
          const bx = x0 + (x1 - x0) * f(tt);
          const a = s === 0 ? 1 : p.trail * 0.35 * (1 - s / (steps + 1));
          if (a <= 0.002) continue;
          ctx.globalAlpha = dr * a;
          ctx.fillStyle = cols[i];
          if (s === 0) {
            ctx.shadowColor = cols[i];
            ctx.shadowBlur = p.ball * 1.4;
          }
          ctx.beginPath();
          ctx.arc(bx, y, p.ball, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.restore();
      return;
    }

    // grafik: sumbu, garis target, tiga kurva
    const L = -W / 2 + 40;
    const R = W / 2 - 20;
    const B = H / 2 - 40;
    const T = -H / 2 + H * 0.18; // posisi akhir (nilai 1)
    const X = (t) => L + (R - L) * t;
    const Y = (v) => B + (T - B) * v;
    ctx.globalAlpha = Math.min(1, dr * 3) * 0.3;
    ctx.strokeStyle = p.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L, -H / 2 + 10);
    ctx.lineTo(L, B);
    ctx.lineTo(L + (R - L) * Math.min(1, dr * 2), B);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, dr * 3) * 0.14;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(L, Y(1));
    ctx.lineTo(R, Y(1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = Math.min(1, dr * 3) * 0.8;
    ctx.fillStyle = '#c9ccd8';
    ctx.font = `500 15px "Geist Mono", monospace`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillText(p.axisY || '', -W / 2, -H / 2 + 4);
    ctx.textAlign = 'right';
    ctx.fillText(p.axisX || '', R, B + 32);

    const N = 90;
    CURVES.forEach((c, i) => {
      // kurva tergambar bergiliran sedikit
      const di = Math.max(0, Math.min(1, dr * 1.3 - i * 0.15));
      if (di <= 0) return;
      const f = EASINGS[c.ease] || EASINGS.linear;
      ctx.globalAlpha = c.dash ? 0.6 : 1;
      ctx.strokeStyle = cols[i];
      ctx.lineWidth = c.dash ? p.lineW * 0.6 : p.lineW;
      ctx.setLineDash(c.dash ? [8, 10] : []);
      ctx.beginPath();
      const m = Math.max(1, Math.round(N * di));
      for (let s = 0; s <= m; s++) {
        const t = s / N;
        if (s) ctx.lineTo(X(t), Y(f(t)));
        else ctx.moveTo(X(t), Y(f(t)));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // garis waktu + titik di tiap kurva
    if (pl > 0 && dr >= 0.99) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = p.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(pl), -H / 2 + 10);
      ctx.lineTo(X(pl), B);
      ctx.stroke();
      CURVES.forEach((c, i) => {
        const f = EASINGS[c.ease] || EASINGS.linear;
        ctx.globalAlpha = 1;
        ctx.fillStyle = cols[i];
        ctx.shadowColor = cols[i];
        ctx.shadowBlur = p.ball;
        ctx.beginPath();
        ctx.arc(X(pl), Y(f(pl)), p.ball * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }
    ctx.restore();
  }
};
