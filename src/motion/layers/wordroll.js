// Kalimat dengan satu kata yang bergulir vertikal: "awalan [kata] akhiran".
// Animasikan "Posisi gulung" (0 = kata pertama, 1 = kata kedua, …); kata tetangga tampil pudar.
export default {
  type: 'wordroll',
  name: 'Gulungan kata',
  icon: '⇕',
  category: 'Promo',
  order: 46,
  defaults: {
    prefix: 'So your ideas keep', words: 'moving, rendering, shipping, growing', suffix: '',
    index: 0, size: 64, color: '#f2f5f3', accent: '#8ff0c0', ghost: 0.22, font: 'Geist', weight: 400, spread: 3
  },
  schema: [
    { key: 'prefix', label: 'Awalan', kind: 'text' },
    { key: 'words', label: 'Kata bergulir (pisahkan koma)', kind: 'textarea' },
    { key: 'suffix', label: 'Akhiran', kind: 'text' },
    { key: 'index', label: 'Posisi gulung', kind: 'number', step: 0.05, animatable: true },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 6, step: 1, animatable: true },
    { key: 'color', label: 'Warna teks', kind: 'color', animatable: true },
    { key: 'accent', label: 'Warna kata aktif', kind: 'color', animatable: true },
    { key: 'ghost', label: 'Kecerahan kata tetangga', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'spread', label: 'Jumlah tetangga terlihat', kind: 'number', min: 0, max: 6, step: 1 }
  ],
  size(p, env) {
    const m = measure(env.ctx, p);
    return { w: m.total, h: p.size * 1.4 };
  },
  draw(ctx, p) {
    const m = measure(ctx, p);
    const words = m.words;
    const lh = p.size * 1.15;
    let x = -m.total / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = p.color;
    if (p.prefix) {
      ctx.fillText(p.prefix, x, 0);
      x += m.pre + m.space;
    }
    const colX = x;
    words.forEach((w, i) => {
      const off = i - p.index;
      const dist = Math.abs(off);
      if (dist > p.spread + 0.5) return;
      const active = Math.max(0, 1 - dist);
      ctx.save();
      ctx.globalAlpha *= active + (1 - active) * p.ghost * Math.max(0, 1 - dist / (p.spread + 1));
      ctx.fillStyle = active > 0.5 ? p.accent : p.color;
      ctx.fillText(w, colX + (m.col - ctx.measureText(w).width) / 2, off * lh);
      ctx.restore();
    });
    if (p.suffix) ctx.fillText(p.suffix, colX + m.col + m.space, 0);
  }
};

function measure(ctx, p) {
  ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
  const words = String(p.words).split(',').map((s) => s.trim()).filter(Boolean);
  const space = ctx.measureText(' ').width * 1.6;
  const pre = p.prefix ? ctx.measureText(p.prefix).width : 0;
  const suf = p.suffix ? ctx.measureText(p.suffix).width : 0;
  const col = Math.max(1, ...words.map((w) => ctx.measureText(w).width));
  const total = (pre ? pre + space : 0) + col + (suf ? space + suf : 0);
  return { words, space, pre, suf, col, total };
}
