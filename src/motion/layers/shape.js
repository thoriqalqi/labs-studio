// Bentuk dasar: persegi (sudut bisa membulat), elips, segitiga, garis.
export default {
  type: 'shape',
  name: 'Bentuk',
  icon: '◼',
  category: 'Dasar',
  order: 3,
  defaults: { shape: 'rect', w: 500, h: 300, radius: 24, fill: '#d9822b', fillOn: true, strokeWidth: 0, strokeColor: '#f3ede2' },
  schema: [
    { key: 'shape', label: 'Bentuk', kind: 'select', options: { rect: 'Persegi', ellipse: 'Elips', triangle: 'Segitiga', line: 'Garis' } },
    { key: 'w', label: 'Lebar', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'fillOn', label: 'Isi warna', kind: 'checkbox' },
    { key: 'fill', label: 'Warna isi', kind: 'color', animatable: true },
    { key: 'strokeWidth', label: 'Tebal garis', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'strokeColor', label: 'Warna garis', kind: 'color', animatable: true }
  ],
  size: (p) => ({ w: p.w, h: p.shape === 'line' ? Math.max(p.strokeWidth, 10) : p.h }),
  draw(ctx, p) {
    const { w, h } = p;
    ctx.beginPath();
    if (p.shape === 'ellipse') ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (p.shape === 'triangle') {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
    } else if (p.shape === 'line') {
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1, p.strokeWidth || 8);
      ctx.strokeStyle = p.strokeWidth ? p.strokeColor : p.fill;
      ctx.stroke();
      return;
    } else ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(p.radius, w / 2, h / 2));
    if (p.fillOn) {
      ctx.fillStyle = p.fill;
      ctx.fill();
    }
    if (p.strokeWidth > 0) {
      ctx.lineWidth = p.strokeWidth;
      ctx.strokeStyle = p.strokeColor;
      ctx.stroke();
    }
  }
};
