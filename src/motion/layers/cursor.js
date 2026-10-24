// Kursor panah bergradien untuk demo aplikasi. Gerakkan dengan keyframe posisi;
// animasikan "Klik" 0 → 1 → 0 untuk efek menekan (mengecil + riak).
export default {
  type: 'cursor',
  name: 'Kursor',
  icon: '➤',
  category: 'Demo UI',
  order: 30,
  defaults: { size: 64, color1: '#7cc4ff', color2: '#2f6bff', click: 0, glow: 30 },
  schema: [
    { key: 'size', label: 'Ukuran', kind: 'number', min: 8, step: 1, animatable: true },
    { key: 'color1', label: 'Warna atas', kind: 'color' },
    { key: 'color2', label: 'Warna bawah', kind: 'color' },
    { key: 'click', label: 'Klik (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'glow', label: 'Pendar', kind: 'number', min: 0, step: 1 }
  ],
  size: (p) => ({ w: p.size, h: p.size }),
  draw(ctx, p) {
    const s = p.size;
    const c = Math.min(1, Math.max(0, p.click));
    if (c > 0) {
      // riak klik
      ctx.save();
      ctx.globalAlpha *= (1 - c) * 0.9 + 0.1;
      ctx.strokeStyle = p.color1;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-s * 0.3, -s * 0.3, s * (0.3 + c * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.scale(1 - c * 0.18, 1 - c * 0.18);
    // ujung panah di kiri atas (titik 0,0 sedikit ke kiri atas pusat)
    ctx.translate(-s * 0.3, -s * 0.3);
    const g = ctx.createLinearGradient(0, 0, s * 0.7, s * 0.8);
    g.addColorStop(0, p.color1);
    g.addColorStop(1, p.color2);
    ctx.shadowColor = p.color2;
    ctx.shadowBlur = p.glow;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.86, s * 0.34);
    ctx.quadraticCurveTo(s * 0.46, s * 0.44, s * 0.38, s * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};
