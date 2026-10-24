// Logo aplikasi: kotak membulat berisi segitiga play + nama di sampingnya.
export function drawMark(ctx, x, y, s, box, tri) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.24);
  ctx.fillStyle = box;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.16, -s * 0.22);
  ctx.lineTo(s * 0.24, 0);
  ctx.lineTo(-s * 0.16, s * 0.22);
  ctx.closePath();
  ctx.fillStyle = tri;
  ctx.fill();
  ctx.restore();
}

function measure(ctx, p) {
  ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
  // ukur dengan jarak huruf yang sama seperti saat digambar
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${-p.size * 0.03}px`;
  const tw = p.showText && p.text ? ctx.measureText(p.text).width : 0;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const mark = p.size * 0.95;
  const gap = tw ? p.size * 0.32 : 0;
  const reg = p.showReg && tw ? p.size * 0.32 : 0;
  return { tw, mark, gap, reg, w: mark + gap + tw + reg, h: p.size * 1.2 };
}

export default {
  type: 'logo',
  name: 'Logo aplikasi',
  icon: '▶',
  category: 'Demo UI',
  order: 32,
  defaults: { text: 'motion studio', font: 'Plus Jakarta Sans', weight: 600, size: 140, color: '#ffffff', box: '#ffffff', tri: '#0b1838', showText: true, showReg: true, markSpin: 0 },
  schema: [
    { key: 'text', label: 'Nama', kind: 'text' },
    { key: 'showText', label: 'Tampilkan nama', kind: 'checkbox' },
    { key: 'showReg', label: 'Tanda ©', kind: 'checkbox' },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 8, step: 1, animatable: true },
    { key: 'color', label: 'Warna nama', kind: 'color', animatable: true },
    { key: 'box', label: 'Warna kotak', kind: 'color', animatable: true },
    { key: 'tri', label: 'Warna segitiga', kind: 'color', animatable: true },
    { key: 'markSpin', label: 'Putaran ikon °', kind: 'number', step: 1, animatable: true }
  ],
  size(p, env) {
    const m = measure(env.ctx, p);
    return { w: m.w, h: m.h };
  },
  draw(ctx, p) {
    const m = measure(ctx, p);
    const x0 = -m.w / 2;
    ctx.save();
    ctx.translate(x0 + m.mark / 2, 0);
    ctx.rotate((p.markSpin * Math.PI) / 180);
    drawMark(ctx, 0, 0, m.mark, p.box, p.tri);
    ctx.restore();
    if (m.tw) {
      ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
      ctx.fillStyle = p.color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${-p.size * 0.03}px`;
      ctx.fillText(p.text, x0 + m.mark + m.gap, p.size * 0.02);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      if (m.reg) {
        ctx.font = `500 ${p.size * 0.2}px "${p.font}"`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * 0.012);
        const rx = x0 + m.mark + m.gap + m.tw + m.reg * 0.6;
        const ry = p.size * 0.32;
        ctx.beginPath();
        ctx.arc(rx, ry, p.size * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText('c', rx, ry + p.size * 0.005);
      }
    }
  }
};
