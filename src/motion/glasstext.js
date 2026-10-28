// Teks "liquid glass" seperti di video promo aplikasi: putih di atas yang bergradasi ke biru muda di bawah,
// tepi bawah sedikit cyan (seperti kaca membiaskan cahaya), dan pendar biru tipis di sekelilingnya.
// drawGlassText(ctx, teks, x, y, opsi) — x, y = titik jangkar (textAlign & baseline 'middle').

export const GLASS_FONTS = { Inter: 'Inter (seperti referensi)', Geist: 'Geist' };

export function glassFont(o) {
  return `${o.weight || 500} ${o.size}px "${o.font || 'Inter'}", "Geist", sans-serif`;
}

export function drawGlassText(ctx, text, x, y, o = {}) {
  const size = o.size || 80;
  const top = o.top || '#ffffff';
  const bottom = o.bottom || '#b6d3f5';
  const glow = o.glow || '#3d8bff';
  const glowAmount = o.glowAmount ?? 0.6;
  ctx.save();
  ctx.font = glassFont({ ...o, size });
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(o.tracking ?? -0.01) * size}px`;
  const base = ctx.globalAlpha;
  // 1. pendar lembut di belakang huruf
  if (glowAmount > 0) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.45 * glowAmount * (o.pixelScale || 1);
    ctx.globalAlpha = base * 0.55;
    ctx.fillStyle = glow;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
  // 2. tepi bawah kebiruan (sedikit turun) seperti pembiasan kaca
  ctx.globalAlpha = base * 0.5;
  ctx.fillStyle = '#7cc4ff';
  ctx.fillText(text, x, y + size * 0.018);
  // 3. isi gradasi putih → biru muda
  const g = ctx.createLinearGradient(0, y - size * 0.42, 0, y + size * 0.4);
  g.addColorStop(0, top);
  g.addColorStop(0.5, top);
  g.addColorStop(1, bottom);
  ctx.globalAlpha = base;
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.restore();
}
