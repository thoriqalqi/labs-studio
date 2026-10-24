// Bola gradien pastel (iridescent) yang lembut, bisa diberi label kecil di bawahnya.
export default {
  type: 'orb',
  name: 'Bola gradien',
  icon: '◉',
  category: 'Promo',
  order: 41,
  defaults: {
    d: 140, c1: '#cfe9a8', c2: '#c9a7f2', c3: '#f6c7d9', hue: 0, soft: 0.25,
    label: '', labelSize: 30, labelColor: '#2a2827', font: 'Geist'
  },
  schema: [
    { key: 'd', label: 'Diameter', kind: 'number', min: 2, step: 1, animatable: true },
    { key: 'c1', label: 'Warna atas', kind: 'color', animatable: true },
    { key: 'c2', label: 'Warna bawah', kind: 'color', animatable: true },
    { key: 'c3', label: 'Warna kilau', kind: 'color', animatable: true },
    { key: 'hue', label: 'Putar warna °', kind: 'number', step: 1, animatable: true },
    { key: 'soft', label: 'Kelembutan tepi (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'label', label: 'Label di bawah', kind: 'text' },
    { key: 'labelSize', label: 'Ukuran label', kind: 'number', min: 6, step: 1 },
    { key: 'labelColor', label: 'Warna label', kind: 'color' }
  ],
  size: (p) => ({ w: Math.max(p.d, p.label ? p.labelSize * p.label.length * 0.55 : 0), h: p.d + (p.label ? p.labelSize * 1.8 : 0) }),
  draw(ctx, p) {
    const r = p.d / 2;
    const cy = p.label ? -p.labelSize * 0.9 : 0;
    const a = (p.hue * Math.PI) / 180;
    ctx.save();
    ctx.translate(0, cy);
    // dasar: gradien linear berputar
    const g = ctx.createLinearGradient(Math.sin(a) * -r, Math.cos(a) * -r, Math.sin(a) * r, Math.cos(a) * r);
    g.addColorStop(0, p.c1);
    g.addColorStop(0.55, p.c2);
    g.addColorStop(1, p.c3);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    // kilau & tepi lembut
    const hl = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 0, -r * 0.35, -r * 0.4, r * 1.1);
    hl.addColorStop(0, 'rgba(255,255,255,0.75)');
    hl.addColorStop(0.45, 'rgba(255,255,255,0.12)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fill();
    if (p.soft > 0) {
      const edge = ctx.createRadialGradient(0, 0, r * (1 - p.soft * 0.6), 0, 0, r);
      edge.addColorStop(0, 'rgba(255,255,255,0)');
      edge.addColorStop(1, 'rgba(255,255,255,0.55)');
      ctx.fillStyle = edge;
      ctx.fill();
    }
    ctx.restore();
    if (p.label) {
      ctx.font = `400 ${p.labelSize}px "${p.font}"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.labelColor;
      ctx.fillText(p.label, 0, cy + r + p.labelSize * 0.95);
    }
  }
};
