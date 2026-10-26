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
    const urls = doc.layers.filter((l) => l.props?.url && !['audio', 'video', 'sfx'].includes(l.type) && !usesVideo(l)).map((l) => l.props.url);
    await Promise.all(urls.map((u) => new Promise((r) => {
      assets.image(u);
      const e = images.get(u);
      if (e.ready) return r();
      e.img.addEventListener('load', r, { once: true });
      e.img.addEventListener('error', r, { once: true });
    })));
    await Promise.all(doc.layers.filter((l) => usesVideo(l) && l.props?.url).map((l) => videoReady(l.id, l.props.url)));
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
      if (!usesVideo(l) || !isActive(l, t)) continue;
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

// layer yang memutar video: jenis 'video', atau jenis lain yang definisinya punya usesVideo(props)
// (mis. mockup HP berisi rekaman layar). Video-nya memakai props.in & props.speed seperti layer Video.
export function usesVideo(l) {
  if (l.type === 'video') return true;
  const def = getLayerDef(l.type);
  return !!def?.usesVideo?.({ ...def.defaults, ...l.props });
}

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
  // size() boleh mengukur teks dengan ctx; simpan/pulihkan supaya font & jarak huruf tidak bocor ke layer lain
  let size = { w: 200, h: 200 };
  if (def.size) {
    ctx?.save();
    try {
      size = def.size(p, env);
    } finally {
      ctx?.restore();
    }
  }
  return { def, p, m, env, size };
}

// ---------- kamera ----------
// Layer jenis 'camera' (tanpa gambar) menggerakkan semua layer yang ada DI BAWAHNYA di daftar layer selama
// ia aktif: zoom, geser, miring (roll), getar halus. Layer layar penuh (latar) hanya ikut sebagian (bgDepth),
// jadi ada kesan kedalaman. Matriks [a, b, c, d, e, f] seperti ctx.transform().
const mul = (A, B) => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]
];

function cameraList(doc, t) {
  const out = [];
  const def = getLayerDef('camera');
  if (!def) return out;
  doc.layers.forEach((c, index) => {
    if (c.type !== 'camera' || !isActive(c, t)) return;
    const p = resolveProps(c, def, t - c.start + (c.offset || 0), doc.comp);
    const mk = (k) => {
      // getar halus: jumlah gelombang sinus (pasti sama tiap kali dihitung → aman untuk ekspor)
      const sh = (p.shake || 0) * k;
      const sx = sh * (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 11.7 + 1.3)) * 4;
      const sy = sh * (Math.sin(t * 6.1 + 0.7) + 0.6 * Math.sin(t * 13.3 + 2.1)) * 4;
      const z = Math.max(0.05, 1 + (p.zoom / 100 - 1) * k);
      const rot = ((p.roll * k + sh * Math.sin(t * 5.3 + 0.4) * 0.25) * Math.PI) / 180;
      const cx = doc.comp.width / 2;
      const cy = doc.comp.height / 2;
      const a = Math.cos(rot) * z;
      const b = Math.sin(rot) * z;
      // geser kamera ke kanan = isi bergeser ke kiri
      const ex = cx - p.panX * k + sx;
      const ey = cy - p.panY * k + sy;
      return [a, b, -b, a, ex - (a * cx - b * cy), ey - (b * cx + a * cy)];
    };
    out.push({ index, full: mk(1), bg: mk(Math.max(0, Math.min(1, p.bgDepth))) });
  });
  return out;
}

function composeCam(cams, index, fullFrame) {
  let M = null;
  for (const c of cams) {
    if (c.index >= index) break;
    const m = fullFrame ? c.bg : c.full;
    M = M ? mul(M, m) : m;
  }
  return M;
}

// transform kamera untuk layer di posisi index pada waktu t (null = tanpa kamera)
export function cameraMatrix(doc, index, t) {
  const cams = cameraList(doc, t);
  if (!cams.length) return null;
  return composeCam(cams, index, !!getLayerDef(doc.layers[index]?.type)?.fullFrame);
}
const applyCam = (M, x, y) => (M ? [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]] : [x, y]);

export function renderComp(ctx, doc, t) {
  const { width: W, height: H, background } = doc.comp;
  const cams = cameraList(doc, t);
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
    const cam = cams.length ? composeCam(cams, i, !!def.fullFrame) : null;
    // f = skala kanvas tempat menggambar (1 = langsung; >1 = kanvas kecil untuk blur)
    const paint = (g, f) => {
      if (p.shadow > 0) {
        g.shadowBlur = p.shadow / f;
        g.shadowColor = p.shadowColor;
      }
      if (cam) g.transform(...cam);
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
  const cam = cameraMatrix(doc, doc.layers.indexOf(layer), t);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => applyCam(cam,
    cx + x * s * Math.cos(r) - y * s * Math.sin(r),
    cy + x * s * Math.sin(r) + y * s * Math.cos(r)
  ));
}

// transform layer saat ini (untuk menyeret titik skala/crop di kanvas), sudah termasuk kamera
export function layerFrame(doc, layer, t, ctx) {
  const st = layerState(doc, layer, t, ctx);
  if (!st) return null;
  const { p, m, size } = st;
  const cam = cameraMatrix(doc, doc.layers.indexOf(layer), t);
  const [cx, cy] = applyCam(cam, p.x + m.dx, p.y + m.dy);
  const cs = cam ? Math.hypot(cam[0], cam[1]) : 1;
  const cr = cam ? Math.atan2(cam[1], cam[0]) : 0;
  return { cx, cy, s: (p.scale / 100) * m.scale * cs, r: ((p.rotation + m.rotation) * Math.PI) / 180 + cr, size, p, animScale: m.scale * cs };
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
