// Menggambar komposisi pada waktu t. Fungsi murni dari (dokumen, t) → bisa di-seek & diekspor.
// Urutan layer: doc.layers[0] = paling depan (seperti After Effects), digambar terakhir.
import { getLayerDef, COMMON_DEFAULTS } from './registry.js';
import { valueAt } from './keys.js';
import { applyAnim } from './presets.js';

// ---------- aset gambar ----------
const images = new Map();
let onAssetLoad = () => {};
export function setAssetListener(fn) { onAssetLoad = fn; }

export const assets = {
  image(url) {
    if (!url) return null;
    let e = images.get(url);
    if (!e) {
      const img = new Image();
      e = { img, ready: false };
      img.onload = () => { e.ready = true; onAssetLoad(); };
      img.src = url;
      images.set(url, e);
    }
    return e.ready ? e.img : null;
  },
  async preload(doc) {
    // gambar dari layer apa pun yang punya url (image, lanskap, layar 3D, …), kecuali media bersuara/video
    const urls = doc.layers.filter((l) => l.props?.url && !['audio', 'video', 'sfx'].includes(l.type)).map((l) => l.props.url);
    await Promise.all(urls.map((u) => new Promise((r) => {
      assets.image(u);
      const e = images.get(u);
      if (e.ready) return r();
      e.img.addEventListener('load', r, { once: true });
      e.img.addEventListener('error', r, { once: true });
    })));
    await Promise.all(doc.layers.filter((l) => l.type === 'video' && l.props?.url).map((l) => videoReady(l.id, l.props.url)));
  },

  // ---------- video ----------
  // Satu elemen <video> (bisu) per layer. Saat diputar, video ikut berjalan dan hanya dikoreksi
  // bila melenceng; saat diam/ekspor, video di-seek tepat ke frame yang diminta.
  playing: false,
  exporting: false,
  video(key, url) {
    if (!url) return null;
    let e = videos.get(key);
    if (!e || e.url !== url) {
      e?.el.pause();
      const el = document.createElement('video');
      el.muted = true;
      el.playsInline = true;
      el.preload = 'auto';
      e = { el, url, ready: false };
      el.addEventListener('loadeddata', () => { e.ready = true; onAssetLoad(); });
      el.addEventListener('seeked', () => onAssetLoad());
      el.src = url;
      videos.set(key, e);
    }
    return e;
  },
  syncVideo(e, time) {
    const el = e.el;
    const target = Math.min(Math.max(0, time), Math.max(0, (el.duration || 0) - 0.04));
    if (assets.playing && !assets.exporting) {
      if (el.paused) {
        el.currentTime = target;
        el.play().catch(() => {});
      } else if (Math.abs(el.currentTime - target) > 0.25) el.currentTime = target;
    } else {
      if (!el.paused) el.pause();
      if (Math.abs(el.currentTime - target) > 0.01 && !el.seeking) el.currentTime = target;
    }
  },
  pauseAll() {
    for (const e of videos.values()) e.el.pause();
  },
  // tunggu semua video aktif berada di frame waktu t (dipakai saat ekspor)
  async seekAll(doc, t) {
    const jobs = [];
    for (const l of doc.layers) {
      if (l.type !== 'video' || !isActive(l, t)) continue;
      const e = assets.video(l.id, l.props?.url);
      if (!e) continue;
      const time = videoTime(l, t, e.el.duration);
      if (Math.abs(e.el.currentTime - time) < 0.001 && !e.el.seeking) continue;
      jobs.push(new Promise((r) => {
        const done = () => { clearTimeout(timer); r(); };
        const timer = setTimeout(done, 3000);
        e.el.addEventListener('seeked', done, { once: true });
        e.el.currentTime = time;
      }));
    }
    await Promise.all(jobs);
  }
};

const videos = new Map();

function videoReady(key, url) {
  const e = assets.video(key, url);
  if (e.ready) return Promise.resolve();
  return new Promise((r) => {
    e.el.addEventListener('loadeddata', r, { once: true });
    e.el.addEventListener('error', r, { once: true });
    setTimeout(r, 8000);
  });
}

// detik di file video untuk layer pada waktu komposisi t
export function videoTime(layer, t, duration = Infinity) {
  const contentT = t - layer.start + (layer.offset || 0);
  const time = (layer.props?.in || 0) + contentT * (layer.props?.speed || 1);
  return Math.min(Math.max(0, time), Math.max(0, (duration || Infinity) - 0.04));
}

// ---------- keadaan layer ----------
export function isActive(layer, t) {
  return !layer.hidden && t >= layer.start && t < layer.start + layer.dur;
}

export function resolveProps(layer, def, contentT, comp) {
  const p = { ...COMMON_DEFAULTS, x: comp.width / 2, y: comp.height / 2, ...def.defaults, ...layer.props };
  for (const [key, list] of Object.entries(layer.keys || {})) p[key] = valueAt(list, contentT, p[key]);
  return p;
}

export function layerState(doc, layer, t, ctx) {
  const def = getLayerDef(layer.type);
  if (!def) return null;
  const vt = t - layer.start;
  const contentT = vt + (layer.offset || 0);
  const p = resolveProps(layer, def, contentT, doc.comp);
  const m = applyAnim(layer.anim, vt, layer.dur, { opacity: 1, dx: 0, dy: 0, scale: 1, rotation: 0, blur: 0, reveal: null });
  const env = { t, vt, contentT, layer, comp: doc.comp, reveal: m.reveal, assets, ctx };
  const size = def.size ? def.size(p, env) : { w: 200, h: 200 };
  return { def, p, m, env, size };
}

export function renderComp(ctx, doc, t) {
  const { width: W, height: H, background } = doc.comp;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  // 'transparent' = tanpa latar (dipakai ekspor After Effects untuk merender satu layer bertransparansi)
  if (background === 'transparent') ctx.clearRect(0, 0, W, H);
  else {
    ctx.fillStyle = background || '#000000';
    ctx.fillRect(0, 0, W, H);
  }
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const layer = doc.layers[i];
    if (!isActive(layer, t)) continue;
    const st = layerState(doc, layer, t, ctx);
    if (!st || !st.def.draw) continue;
    const { p, m, def, env, size } = st;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (p.opacity / 100) * m.opacity));
    if (ctx.globalAlpha <= 0) {
      ctx.restore();
      continue;
    }
    ctx.globalCompositeOperation = p.blend || 'source-over';
    const blur = p.blur + m.blur;
    // f = skala kanvas tempat menggambar (1 = langsung; >1 = kanvas kecil untuk blur)
    const paint = (g, f) => {
      if (p.shadow > 0) {
        g.shadowBlur = p.shadow / f;
        g.shadowColor = p.shadowColor;
      }
      g.translate(p.x + m.dx, p.y + m.dy);
      g.rotate(((p.rotation + m.rotation) * Math.PI) / 180);
      const s = (p.scale / 100) * m.scale;
      g.scale(s, s);
      const cr = cropRect(p, size);
      if (cr.cropped) {
        g.beginPath();
        g.rect(cr.x0, cr.y0, cr.x1 - cr.x0, cr.y1 - cr.y0);
        g.clip();
      }
      try {
        def.draw(g, p, env);
      } catch (err) {
        console.warn(`Layer ${layer.name} gagal digambar`, err);
      }
    };
    if (blur > 0.05) drawBlurred(ctx, W, H, blur, paint);
    else paint(ctx, 1);
    ctx.restore();
  }
  ctx.restore();
}

// Filter blur di kanvas penuh sangat lambat (bisa >100 ms/frame → pemutaran patah-patah).
// Layer yang di-blur digambar di kanvas yang diperkecil sesuai besar blur, di-blur di sana, lalu ditempel.
// Hasilnya nyaris sama (blur menyamarkan resolusi) tapi jauh lebih cepat.
const blurBuf = [];
function drawBlurred(ctx, W, H, blur, paint) {
  const f = Math.min(8, Math.max(1.5, blur / 3));
  const w = Math.ceil(W / f);
  const h = Math.ceil(H / f);
  if (!blurBuf.length) blurBuf.push(document.createElement('canvas'), document.createElement('canvas'));
  for (const c of blurBuf) if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const [a, b] = blurBuf;
  const ga = a.getContext('2d');
  ga.setTransform(1, 0, 0, 1, 0, 0);
  ga.clearRect(0, 0, w, h);
  ga.save();
  ga.setTransform(1 / f, 0, 0, 1 / f, 0, 0);
  paint(ga, f);
  ga.restore();
  const gb = b.getContext('2d');
  gb.setTransform(1, 0, 0, 1, 0, 0);
  gb.clearRect(0, 0, w, h);
  gb.filter = `blur(${blur / f}px)`;
  gb.drawImage(a, 0, 0);
  gb.filter = 'none';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(b, 0, 0, W, H);
  ctx.restore();
}

// kotak terlihat setelah crop, di koordinat lokal layer (sebelum skala)
export function cropRect(p, size) {
  const c = (v) => Math.min(100, Math.max(0, v || 0)) / 100;
  const l = c(p.cropLeft);
  const r = Math.min(c(p.cropRight), 1 - l);
  const tp = c(p.cropTop);
  const b = Math.min(c(p.cropBottom), 1 - tp);
  return {
    x0: size.w * (l - 0.5), x1: size.w * (0.5 - r),
    y0: size.h * (tp - 0.5), y1: size.h * (0.5 - b),
    cropped: l + r + tp + b > 0
  };
}

// sudut kotak layer (yang terlihat setelah crop) di koordinat komposisi (untuk kotak pilihan & klik)
export function layerCorners(doc, layer, t, ctx) {
  const st = layerState(doc, layer, t, ctx);
  if (!st) return null;
  const { p, m, size } = st;
  const s = (p.scale / 100) * m.scale;
  const r = ((p.rotation + m.rotation) * Math.PI) / 180;
  const cx = p.x + m.dx;
  const cy = p.y + m.dy;
  const { x0, x1, y0, y1 } = cropRect(p, size);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [
    cx + x * s * Math.cos(r) - y * s * Math.sin(r),
    cy + x * s * Math.sin(r) + y * s * Math.cos(r)
  ]);
}

// transform layer saat ini (untuk menyeret titik skala/crop di kanvas)
export function layerFrame(doc, layer, t, ctx) {
  const st = layerState(doc, layer, t, ctx);
  if (!st) return null;
  const { p, m, size } = st;
  return { cx: p.x + m.dx, cy: p.y + m.dy, s: (p.scale / 100) * m.scale, r: ((p.rotation + m.rotation) * Math.PI) / 180, size, p, animScale: m.scale };
}

export function hitTest(doc, t, x, y, ctx) {
  for (const layer of doc.layers) {
    if (!isActive(layer, t) || layer.locked) continue;
    const def = getLayerDef(layer.type);
    if (!def?.draw || def.fullFrame) continue;
    const c = layerCorners(doc, layer, t, ctx);
    if (c && insidePoly(c, x, y)) return layer;
  }
  return null;
}

function insidePoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
