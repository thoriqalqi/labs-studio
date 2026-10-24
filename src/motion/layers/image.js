import { t } from '../../core/i18n.js';
// Gambar dari file (png/jpg/webp/svg). Tinggi mengikuti rasio gambar.
export default {
  type: 'image',
  name: 'Gambar',
  icon: '▣',
  category: 'Media',
  order: 10,
  defaults: { url: '', w: 600, radius: 0 },
  schema: [
    { key: 'url', label: 'File gambar', kind: 'asset', accept: 'image/*' },
    { key: 'w', label: 'Lebar', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1, animatable: true }
  ],
  size(p, env) {
    const img = env.assets.image(p.url);
    return { w: p.w, h: img ? (p.w * img.naturalHeight) / img.naturalWidth : p.w * 0.5625 };
  },
  draw(ctx, p, env) {
    const img = env.assets.image(p.url);
    const h = img ? (p.w * img.naturalHeight) / img.naturalWidth : p.w * 0.5625;
    if (!img) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 3;
      ctx.strokeRect(-p.w / 2, -h / 2, p.w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 28px "Plus Jakarta Sans"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t(p.url ? 'Memuat gambar…' : 'Pilih gambar di inspector'), 0, 0);
      return;
    }
    if (p.radius > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-p.w / 2, -h / 2, p.w, h, p.radius);
      ctx.clip();
      ctx.drawImage(img, -p.w / 2, -h / 2, p.w, h);
      ctx.restore();
    } else ctx.drawImage(img, -p.w / 2, -h / 2, p.w, h);
  }
};
