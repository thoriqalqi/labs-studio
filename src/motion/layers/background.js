// Latar penuh satu layar: warna rata atau gradien.
export default {
  type: 'background',
  name: 'Latar',
  icon: '▦',
  category: 'Dasar',
  order: 1,
  fullFrame: true,
  defaults: { mode: 'radial', color1: '#2b1c12', color2: '#07070a', angle: 90 },
  schema: [
    { key: 'mode', label: 'Jenis', kind: 'select', options: { solid: 'Warna rata', linear: 'Gradien lurus', radial: 'Gradien melingkar' } },
    { key: 'color1', label: 'Warna 1', kind: 'color', animatable: true },
    { key: 'color2', label: 'Warna 2', kind: 'color', animatable: true },
    { key: 'angle', label: 'Sudut gradien °', kind: 'number', step: 1, animatable: true }
  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const W = env.comp.width;
    const H = env.comp.height;
    let fill = p.color1;
    if (p.mode === 'linear') {
      const a = (p.angle * Math.PI) / 180;
      const r = Math.hypot(W, H) / 2;
      fill = ctx.createLinearGradient(-Math.cos(a) * r, -Math.sin(a) * r, Math.cos(a) * r, Math.sin(a) * r);
      fill.addColorStop(0, p.color1);
      fill.addColorStop(1, p.color2);
    } else if (p.mode === 'radial') {
      fill = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(W, H) * 0.75);
      fill.addColorStop(0, p.color1);
      fill.addColorStop(1, p.color2);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(-W / 2, -H / 2, W, H);
  }
};
