// Klip video (mp4/webm; format lain dikonversi otomatis saat diimpor).
// Gambarnya saja — suaranya jadi layer Audio terpisah saat diimpor, jadi bisa diatur volumenya sendiri.
export default {
  type: 'video',
  name: 'Video',
  icon: '▶',
  category: 'Media',
  order: 9,
  defaults: { url: '', w: 1280, srcW: 1920, srcH: 1080, radius: 0, in: 0, speed: 1 },
  schema: [
    { key: 'url', label: 'File video', kind: 'asset', accept: 'video/*' },
    { key: 'w', label: 'Lebar', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'in', label: 'Mulai dari detik ke-', kind: 'number', min: 0, step: 0.1 },
    { key: 'speed', label: 'Kecepatan ×', kind: 'number', min: 0.25, max: 4, step: 0.05 }
  ],
  size(p) {
    return { w: p.w, h: (p.w * p.srcH) / p.srcW };
  },
  draw(ctx, p, env) {
    const w = p.w;
    const h = (p.w * p.srcH) / p.srcW;
    const e = env.assets.video(env.layer.id, p.url);
    if (!e || !e.ready) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '500 28px "Geist", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.url ? 'Memuat video…' : 'Pilih file video di inspector', 0, 0);
      return;
    }
    env.assets.syncVideo(e, (p.in || 0) + env.contentT * (p.speed || 1));
    if (p.radius > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, p.radius);
      ctx.clip();
      ctx.drawImage(e.el, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else ctx.drawImage(e.el, -w / 2, -h / 2, w, h);
  }
};
