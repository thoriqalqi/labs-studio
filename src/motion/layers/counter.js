// Angka besar yang berjalan (animasikan "Nilai"), bisa ditumpuk beberapa baris yang makin pudar.
const fmt = (v, p) => {
  const abs = Math.abs(v);
  let s = abs.toFixed(Math.max(0, Math.round(p.decimals)));
  if (p.thousands) {
    const [a, b] = s.split('.');
    s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? `.${b}` : '');
  }
  return `${v < 0 ? '-' : ''}${p.prefix}${s}${p.suffix}`;
};

export default {
  type: 'counter',
  name: 'Angka berjalan',
  icon: '#',
  category: 'Promo',
  order: 45,
  defaults: {
    value: -2240, prefix: '$', suffix: '', decimals: 0, thousands: true, size: 200, color: '#a3192f',
    font: 'Geist', weight: 500, lines: 3, ratio: 0.52, fade: 0.45, gap: 1.0, align: 'left'
  },
  schema: [
    { key: 'value', label: 'Nilai', kind: 'number', step: 1, animatable: true },
    { key: 'prefix', label: 'Awalan', kind: 'text' },
    { key: 'suffix', label: 'Akhiran', kind: 'text' },
    { key: 'decimals', label: 'Angka desimal', kind: 'number', min: 0, max: 4, step: 1 },
    { key: 'thousands', label: 'Pemisah ribuan', kind: 'checkbox' },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 8, step: 1, animatable: true },
    { key: 'color', label: 'Warna', kind: 'color', animatable: true },
    { key: 'weight', label: 'Tebal', kind: 'select', options: { 400: 'Biasa', 500: 'Sedang', 600: 'Semi tebal' } },
    { key: 'lines', label: 'Jumlah baris', kind: 'number', min: 1, max: 8, step: 1 },
    { key: 'ratio', label: 'Rasio nilai baris berikut', kind: 'number', min: 0, max: 2, step: 0.01 },
    { key: 'fade', label: 'Pudar per baris (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'gap', label: 'Jarak baris', kind: 'number', min: 0.5, max: 2, step: 0.05 },
    { key: 'align', label: 'Rata', kind: 'select', options: { left: 'Kiri', center: 'Tengah', right: 'Kanan' } }
  ],
  size: (p) => ({ w: p.size * 4.2, h: p.size * p.gap * Math.max(1, Math.round(p.lines)) }),
  draw(ctx, p) {
    const n = Math.max(1, Math.round(p.lines));
    const lh = p.size * p.gap;
    const w = p.size * 4.2;
    ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-p.size * 0.04}px`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = p.align;
    const x = p.align === 'left' ? -w / 2 : p.align === 'right' ? w / 2 : 0;
    ctx.fillStyle = p.color;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.globalAlpha *= Math.max(0, 1 - i * p.fade);
      ctx.fillText(fmt(p.value * Math.pow(p.ratio, i), p), x, -((n - 1) * lh) / 2 + i * lh);
      ctx.restore();
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
};
