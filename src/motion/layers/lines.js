// Garis yang "tergambar": garis silang selebar layar, atau kotak bingkai dengan titik di sudut.
// Animasikan "Progres" 0 → 1 dengan keyframe untuk efek menggambar.
export default {
  type: 'lines',
  name: 'Garis gambar',
  icon: '┼',
  category: 'Dasar',
  order: 5,
  defaults: { mode: 'box', w: 700, h: 140, progress: 1, color: '#ffffff', width: 2, dots: true },
  schema: [
    { key: 'mode', label: 'Bentuk', kind: 'select', options: { box: 'Kotak bingkai', cross: 'Garis silang (selebar layar)', h: 'Garis datar', v: 'Garis tegak' } },
    { key: 'progress', label: 'Progres gambar (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'w', label: 'Lebar', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'color', label: 'Warna', kind: 'color', animatable: true },
    { key: 'width', label: 'Tebal', kind: 'number', min: 0.5, step: 0.5 },
    { key: 'dots', label: 'Titik di sudut', kind: 'checkbox' }
  ],
  size: (p) => ({ w: p.mode === 'box' || p.mode === 'h' ? p.w : 20, h: p.mode === 'box' || p.mode === 'v' ? p.h : 20 }),
  draw(ctx, p, env) {
    const k = Math.min(1, Math.max(0, p.progress));
    if (k <= 0) return;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.lineWidth = p.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (p.mode === 'cross' || p.mode === 'h' || p.mode === 'v') {
      // garis selebar/setinggi layar, digambar dari tepi ke tepi
      const W = env.comp.width;
      const H = env.comp.height;
      const left = -p.x - 50;
      const top = -p.y - 50;
      if (p.mode !== 'v') {
        ctx.moveTo(left, 0);
        ctx.lineTo(left + (W + 100) * k, 0);
      }
      if (p.mode !== 'h') {
        ctx.moveTo(0, top);
        ctx.lineTo(0, top + (H + 100) * k);
      }
      ctx.stroke();
      return;
    }
    const { w, h } = p;
    const per = 2 * (w + h);
    let left = per * k;
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]];
    ctx.moveTo(...pts[0]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const f = Math.min(1, left / len);
      ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
      left -= len;
    }
    ctx.stroke();
    if (p.dots && k > 0.85) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * Math.min(1, (k - 0.85) / 0.15);
      const r = p.width * 1.6;
      for (const [x, y] of pts.slice(0, 4)) {
        ctx.beginPath();
        ctx.arc(x + Math.sign(x) * -r * 3, y + Math.sign(y) * -r * 3, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = a;
    }
  }
};
