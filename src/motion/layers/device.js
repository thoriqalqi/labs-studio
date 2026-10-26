import { t } from '../../core/i18n.js';

// Mockup perangkat: HP (bingkai + pulau dinamis) atau jendela browser, layarnya diisi screenshot
// atau rekaman layar (mp4/webm). Screenshot yang lebih tinggi dari layar bisa digulir lewat "Gulir".
const isVideo = (url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || ''));

// ukuran layar & bingkai dari lebar perangkat
function geom(p, env) {
  if (p.device === 'browser') {
    const bar = Math.round(p.w * 0.034) + 10;
    const media = mediaSize(p, env);
    const sh = media ? (p.w * media.h) / media.w : p.w * 0.5;
    return { W: p.w, H: bar + sh, sx: 0, sy: bar, sw: p.w, sh, r: Math.max(8, p.w * 0.012), bar };
  }
  const W = p.w;
  const H = p.w * p.aspect;
  const bez = W * 0.034;
  return { W, H, sx: -W / 2 + bez, sy: -H / 2 + bez, sw: W - bez * 2, sh: H - bez * 2, r: W * 0.16, bez };
}

function mediaSize(p, env) {
  if (!p.url) return null;
  if (isVideo(p.url)) {
    const e = env.assets.video(env.layer.id, p.url);
    return e?.ready ? { w: e.el.videoWidth, h: e.el.videoHeight, el: e.el, e } : null;
  }
  const img = env.assets.image(p.url);
  return img ? { w: img.naturalWidth, h: img.naturalHeight, el: img } : null;
}

const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
};

// isi layar: lebar media = lebar layar, sisanya digulir (scroll 0 = atas, 1 = bawah)
function drawScreen(ctx, p, env, x, y, w, h) {
  ctx.fillStyle = p.screen;
  ctx.fillRect(x, y, w, h);
  const m = mediaSize(p, env);
  if (!m) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = `500 ${Math.max(12, w * 0.05)}px "Geist", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t(p.url ? 'Memuat…' : 'Pilih screenshot di inspector'), x + w / 2, y + h / 2);
    return;
  }
  if (m.e) env.assets.syncVideo(m.e, (p.in || 0) + env.contentT * (p.speed || 1));
  const mh = (w * m.h) / m.w;
  const off = Math.max(0, mh - h) * Math.min(1, Math.max(0, p.scroll));
  ctx.drawImage(m.el, x, y - off, w, mh);
}

export default {
  type: 'device',
  name: 'Mockup HP / browser',
  icon: '▯',
  category: 'Demo UI',
  order: 34,
  defaults: {
    device: 'phone', url: '', w: 420, aspect: 2.08, scroll: 0, in: 0, speed: 1,
    frame: '#111114', screen: '#ffffff', title: '', softShadow: 0.18
  },
  schema: [
    { key: 'device', label: 'Perangkat', kind: 'select', options: { phone: 'HP', browser: 'Jendela browser' } },
    { key: 'url', label: 'Isi layar (screenshot / rekaman)', kind: 'asset', accept: 'image/*,video/*' },
    { key: 'w', label: 'Lebar', kind: 'number', min: 40, step: 1, animatable: true },
    { key: 'aspect', label: 'Tinggi ÷ lebar (HP)', kind: 'number', min: 1, max: 3, step: 0.01 },
    { key: 'scroll', label: 'Gulir isi (0 atas – 1 bawah)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'in', label: 'Rekaman mulai dari detik ke-', kind: 'number', min: 0, step: 0.1 },
    { key: 'speed', label: 'Kecepatan rekaman ×', kind: 'number', min: 0.25, max: 4, step: 0.05 },
    { key: 'frame', label: 'Warna bingkai', kind: 'color' },
    { key: 'screen', label: 'Warna layar kosong', kind: 'color' },
    { key: 'title', label: 'Alamat di bilah browser', kind: 'text' },
    { key: 'softShadow', label: 'Bayangan lembut', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true }
  ],
  usesVideo: (p) => isVideo(p.url),
  size(p, env) {
    const g = geom(p, env);
    return { w: g.W, h: g.H };
  },
  draw(ctx, p, env) {
    const g = geom(p, env);
    const shadow = ctx.shadowBlur;
    if (p.device === 'browser') {
      const x = -g.W / 2;
      const y = -g.H / 2;
      // jendela + bayangan lembut
      ctx.save();
      if (p.softShadow > 0) {
        ctx.shadowColor = `rgba(20,24,40,${p.softShadow})`;
        ctx.shadowBlur = g.W * 0.06;
        ctx.shadowOffsetY = g.W * 0.025;
      }
      rr(ctx, x, y, g.W, g.H, g.r);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
      ctx.save();
      rr(ctx, x, y, g.W, g.H, g.r);
      ctx.clip();
      ctx.fillStyle = '#f1f2f4';
      ctx.fillRect(x, y, g.W, g.bar);
      const d = g.bar * 0.22;
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(x + g.bar * 0.55 + i * d * 3, y + g.bar / 2, d, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      });
      const uw = g.W * 0.36;
      rr(ctx, -uw / 2, y + g.bar * 0.2, uw, g.bar * 0.6, g.bar * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      if (p.title) {
        ctx.fillStyle = '#6b7080';
        ctx.font = `500 ${g.bar * 0.32}px "Geist", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.title, 0, y + g.bar / 2);
      }
      drawScreen(ctx, p, env, x, y + g.bar, g.W, g.sh);
      ctx.restore();
      ctx.save();
      rr(ctx, x + 0.5, y + 0.5, g.W - 1, g.H - 1, g.r);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      ctx.shadowBlur = shadow;
      return;
    }
    // ----- HP -----
    const x = -g.W / 2;
    const y = -g.H / 2;
    ctx.save();
    if (p.softShadow > 0) {
      ctx.shadowColor = `rgba(20,24,40,${p.softShadow})`;
      ctx.shadowBlur = g.W * 0.16;
      ctx.shadowOffsetY = g.W * 0.07;
    }
    rr(ctx, x, y, g.W, g.H, g.r);
    ctx.fillStyle = p.frame;
    ctx.fill();
    ctx.restore();
    // kilau tepi bingkai
    ctx.save();
    rr(ctx, x + 1.5, y + 1.5, g.W - 3, g.H - 3, g.r - 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = Math.max(1, g.W * 0.006);
    ctx.stroke();
    ctx.restore();
    // layar
    ctx.save();
    rr(ctx, g.sx, g.sy, g.sw, g.sh, g.r - g.bez);
    ctx.clip();
    drawScreen(ctx, p, env, g.sx, g.sy, g.sw, g.sh);
    ctx.restore();
    // pulau dinamis
    const iw = g.W * 0.27;
    const ih = g.W * 0.075;
    rr(ctx, -iw / 2, g.sy + g.W * 0.028, iw, ih, ih / 2);
    ctx.fillStyle = '#050506';
    ctx.fill();
    ctx.shadowBlur = shadow;
  }
};
