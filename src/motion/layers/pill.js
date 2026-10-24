// Tombol / pil berteks, bisa berisi ikon dan bilah progres (untuk demo UI).
const ICONS = {
  '': 'Tanpa ikon',
  check: 'Centang',
  play: 'Play',
  download: 'Unduh',
  sparkle: 'Kilau',
  plus: 'Tambah'
};

function icon(ctx, name, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (name === 'check') {
    ctx.moveTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.08, s * 0.28);
    ctx.lineTo(s * 0.38, -s * 0.3);
    ctx.stroke();
  } else if (name === 'play') {
    ctx.moveTo(-s * 0.25, -s * 0.32);
    ctx.lineTo(s * 0.35, 0);
    ctx.lineTo(-s * 0.25, s * 0.32);
    ctx.closePath();
    ctx.fill();
  } else if (name === 'download') {
    ctx.moveTo(0, -s * 0.38);
    ctx.lineTo(0, s * 0.18);
    ctx.moveTo(-s * 0.25, -s * 0.05);
    ctx.lineTo(0, s * 0.2);
    ctx.lineTo(s * 0.25, -s * 0.05);
    ctx.moveTo(-s * 0.35, s * 0.38);
    ctx.lineTo(s * 0.35, s * 0.38);
    ctx.stroke();
  } else if (name === 'sparkle') {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4);
    }
    ctx.stroke();
  } else if (name === 'plus') {
    ctx.moveTo(-s * 0.32, 0);
    ctx.lineTo(s * 0.32, 0);
    ctx.moveTo(0, -s * 0.32);
    ctx.lineTo(0, s * 0.32);
    ctx.stroke();
  }
  ctx.restore();
}

function measure(ctx, p) {
  ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
  const tw = p.text ? ctx.measureText(p.text).width : 0;
  const iw = p.icon ? p.size * 1.1 + (p.text ? p.size * 0.4 : 0) : 0;
  const h = p.size * 2.1;
  const w = p.w > 0 ? p.w : tw + iw + p.size * 1.6;
  return { w, h, tw, iw };
}

export default {
  type: 'pill',
  name: 'Tombol / pil',
  icon: '⬭',
  category: 'Demo UI',
  order: 31,
  defaults: {
    text: 'Export', icon: '', font: 'Plus Jakarta Sans', weight: 600, size: 30, w: 0,
    fill: '#0d1a3d', stroke: '#6fa8ff', textColor: '#eef4ff', progress: -1, barColor: '#3d7bff', radius: 999
  },
  schema: [
    { key: 'text', label: 'Teks', kind: 'text' },
    { key: 'icon', label: 'Ikon', kind: 'select', options: ICONS },
    { key: 'size', label: 'Ukuran huruf', kind: 'number', min: 6, step: 1, animatable: true },
    { key: 'w', label: 'Lebar (0 = otomatis)', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'fill', label: 'Warna isi', kind: 'color', animatable: true },
    { key: 'stroke', label: 'Warna garis', kind: 'color', animatable: true },
    { key: 'textColor', label: 'Warna teks', kind: 'color', animatable: true },
    { key: 'progress', label: 'Progres (-1 = tidak ada)', kind: 'number', min: -1, max: 1, step: 0.01, animatable: true },
    { key: 'barColor', label: 'Warna progres', kind: 'color' },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1 }
  ],
  size(p, env) {
    const m = measure(env.ctx, p);
    return { w: m.w, h: m.h };
  },
  draw(ctx, p) {
    const m = measure(ctx, p);
    const r = Math.min(p.radius, m.h / 2);
    ctx.beginPath();
    ctx.roundRect(-m.w / 2, -m.h / 2, m.w, m.h, r);
    ctx.fillStyle = p.fill;
    ctx.fill();
    if (p.progress >= 0) {
      ctx.save();
      ctx.clip();
      const shadow = ctx.shadowBlur;
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.barColor;
      ctx.fillRect(-m.w / 2, -m.h / 2, m.w * Math.min(1, p.progress), m.h);
      ctx.shadowBlur = shadow;
      ctx.restore();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.stroke;
    ctx.stroke();
    ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = p.textColor;
    let x = -(m.tw + m.iw) / 2;
    if (p.icon) {
      icon(ctx, p.icon, x + p.size * 0.55, 0, p.size, p.textColor);
      x += m.iw;
    }
    if (p.text) ctx.fillText(p.text, x, p.size * 0.04);
  }
};
