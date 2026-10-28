// Daftar menu melengkung dengan titik penunjuk (gaya roda): item tetap di tempat, tersusun di lengkung yang
// cembung ke kiri. Item aktif paling dekat & paling terang, tetangganya melengkung ke kanan dan memudar.
// Titik kecil bergerak mengikuti "active" (boleh pecahan → titik meluncur di antara item).
// "reveal" 0 → 1 = item masuk satu per satu (meluncur dari kanan, melengkung, lalu tajam).

import { drawGlassText, glassFont, GLASS_FONTS } from '../glasstext.js';

function sizeOf(p) {
  const n = String(p.items || '').split(',').filter((s) => s.trim()).length || 1;
  return { w: p.size * 7 + p.curve * 2 + p.dotGap * 2, h: p.gap * n };
}

export default {
  type: 'dotlist',
  name: 'Daftar titik melengkung',
  icon: '⋮',
  category: 'Demo UI',
  order: 39,
  defaults: {
    items: 'Infografis, Motion, Demo UI, Dunia 3D, Tipografi',
    active: 1, reveal: 1,
    size: 56, weight: 500, gap: 118, curve: 70,
    color: '#ffffff', ghost: 0.38, edge: 0.12,
    font: 'Inter', glassText: true, textBottom: '#b6d3f5', textGlow: 0.5,
    dot: 14, dotGap: 34, dotColor: '#9fd8ff'
  },
  schema: [
    { key: 'items', label: 'Isi daftar (pisahkan koma)', kind: 'textarea' },
    { key: 'active', label: 'Item aktif (urutan dari 0)', kind: 'number', min: 0, step: 0.05, animatable: true },
    { key: 'reveal', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 6, step: 1, animatable: true },
    { key: 'weight', label: 'Tebal', kind: 'select', options: { 400: 'Biasa', 500: 'Sedang', 600: 'Tebal' } },
    { key: 'gap', label: 'Jarak baris', kind: 'number', min: 10, step: 1, animatable: true },
    { key: 'curve', label: 'Lengkung', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'color', label: 'Warna teks', kind: 'color', animatable: true },
    { key: 'font', label: 'Font', kind: 'select', options: GLASS_FONTS },
    { key: 'glassText', label: 'Teks kaca (liquid glass)', kind: 'checkbox' },
    { key: 'textBottom', label: 'Warna bawah teks kaca', kind: 'color', animatable: true },
    { key: 'textGlow', label: 'Pendar teks (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'ghost', label: 'Kecerahan item tetangga (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'edge', label: 'Kecerahan item ujung (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'dot', label: 'Ukuran titik', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'dotGap', label: 'Jarak titik ke teks', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'dotColor', label: 'Warna titik', kind: 'color', animatable: true }
  ],
  size: (p) => sizeOf(p),
  draw(ctx, p, env) {
    const items = String(p.items || '').split(',').map((s) => s.trim()).filter(Boolean);
    const n = items.length;
    if (!n) return;
    const box = sizeOf(p);
    const left = -box.w / 2 + p.dotGap + p.dot; // titik x dasar teks (kiri)
    const mid = (n - 1) / 2;
    const act = Math.max(0, Math.min(n - 1, p.active));
    const arcX = (d) => p.curve * (1 - Math.cos(Math.min(Math.abs(d) * 0.62, 1.4)));
    ctx.save();
    ctx.font = glassFont({ size: p.size, weight: p.weight, font: p.font });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.02 * p.size}px`;
    for (let i = 0; i < n; i++) {
      // masuk bertahap dari atas ke bawah
      const r = Math.max(0, Math.min(1, p.reveal * (1 + n * 0.18) - i * 0.18));
      if (r <= 0) continue;
      const e = 1 - Math.pow(1 - r, 3);
      const d = i - act;
      const y = (i - mid) * p.gap;
      const x = left + arcX(d) + (1 - e) * p.size * 2.2;
      const near = Math.max(0, 1 - Math.abs(d)); // 1 = aktif
      const ends = i === 0 || i === n - 1 ? p.edge : p.ghost;
      const a = (Math.abs(d) <= 1 ? ends + (1 - ends) * near : Math.max(0.05, ends * (1.6 - Math.abs(d) * 0.35))) * e;
      ctx.save();
      ctx.globalAlpha *= Math.max(0, Math.min(1, a));
      ctx.translate(x, y);
      // saat masuk, huruf sedikit melengkung/miring seperti tergulung
      if (e < 1) ctx.transform(1, (1 - e) * 0.35, (1 - e) * -0.3, 1, 0, 0);
      if (p.glassText !== false) {
        drawGlassText(ctx, items[i], 0, 0, { size: p.size, weight: p.weight, font: p.font, top: p.color, bottom: p.textBottom, glowAmount: p.textGlow * near, align: 'left', tracking: -0.01 });
      } else {
        ctx.fillStyle = p.color;
        ctx.fillText(items[i], 0, 0);
      }
      ctx.restore();
    }
    // titik penunjuk
    if (p.dot > 0 && p.reveal > 0.05) {
      const ya = (act - mid) * p.gap;
      const xa = left - p.dotGap + arcX(0);
      ctx.globalAlpha *= Math.min(1, (p.reveal - 0.05) * 3);
      ctx.fillStyle = p.dotColor;
      ctx.shadowColor = p.dotColor;
      ctx.shadowBlur = p.dot * 1.2;
      ctx.beginPath();
      ctx.arc(xa, ya, p.dot / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};
