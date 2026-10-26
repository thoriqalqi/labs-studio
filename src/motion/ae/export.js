// Ekspor ke After Effects: proyek motion → folder output/<id>-after-effects/ berisi
//   <id>.jsx      skrip yang menyusun ulang komposisi di AE (File → Scripts → Run Script File…)
//   media/        file gambar/video/audio + layer khusus yang dirender jadi video ProRes 4444 transparan
//   BACA-SAYA.txt cara membuka & catatan
//
// Layer dasar (teks, bentuk, gambar, video, audio, latar) jadi layer AE asli yang bisa diedit, lengkap dengan
// keyframe & easing. Layer khusus studio (liquid, 3D, halftone, …) dirender per layer lalu ditaruh sebagai footage.
import { getLayerDef, COMMON_DEFAULTS } from '../registry.js';
import { layerState, resolveProps, renderComp, assets } from '../engine.js';
import { PRESETS } from '../presets.js';
import { wrappedText } from '../layers/text.js';
import { audioTimeline } from '../audioTimeline.js';
import { createAudio } from '../../audio.js';
import { RUNTIME } from './runtime.js';

async function post(path, body, isJson = false) {
  const res = await fetch(path, {
    method: 'POST',
    headers: isJson ? { 'Content-Type': 'application/json' } : {},
    body: isJson ? JSON.stringify(body) : body
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || res.statusText);
  return out;
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const rgb = (hex) => {
  const m = /^#?([0-9a-f]{6})/i.exec(String(hex || '#000000'));
  const n = parseInt(m ? m[1] : '000000', 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((x) => Math.round(x * 1000) / 1000);
};
const rgba = (hex) => [...rgb(hex), 1];
const slug = (s) => String(s || 'layer').normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'layer';

// ---------- easing studio → bezier (x1, y1, x2, y2) ----------
const BEZ = {
  easeInOut: [0.65, 0, 0.35, 1],
  easeOut: [0.33, 1, 0.68, 1],
  easeIn: [0.32, 0, 0.67, 0],
  back: [0.34, 1.56, 0.64, 1]
};
// 'L' linear, 'H' tahan, array = bezier, null = tidak bisa (disampel rapat: bounce, flow)
function easeShape(k) {
  if (k.ease === 'linear') return 'L';
  if (k.ease === 'hold') return 'H';
  if (k.ease === 'custom') return Array.isArray(k.bz) && k.bz.length === 4 ? k.bz : [0.42, 0, 0.58, 1];
  if (k.ease === 'bounce' || k.ease === 'flow') return null;
  return BEZ[k.ease] || BEZ.easeInOut;
}

// ---------- font: keluarga + tebal → nama PostScript ----------
const WEIGHT = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' };
function psFont(family, weight, italic) {
  if (family === 'Bebas Neue') return 'BebasNeue-Regular';
  if (family === 'Instrument Serif') return italic ? 'InstrumentSerif-Italic' : 'InstrumentSerif-Regular';
  let w = WEIGHT[weight] || 'Regular';
  if (family === 'Caveat' && !['Regular', 'Medium', 'SemiBold', 'Bold'].includes(w)) w = 'Bold';
  if (italic) w = w === 'Regular' ? 'Italic' : `${w}Italic`;
  return `${family.replace(/\s+/g, '')}-${w}`;
}

const TRANSFORM_KEYS = new Set(['x', 'y', 'scale', 'rotation', 'opacity', 'blur', 'shadow', 'shadowColor']);
const BLUR_K = 2; // blur kanvas (px) → Blurriness AE kira-kira dua kalinya

// ---------- pilah layer ----------
function hasCrop(l) {
  const crop = ['cropTop', 'cropBottom', 'cropLeft', 'cropRight'];
  return crop.some((k) => (l.props?.[k] || 0) > 0 || l.keys?.[k]?.length);
}
const textOnlyAnim = (l) => ['in', 'out'].some((s) => PRESETS[l.anim?.[s]?.preset]?.textOnly);

// 'text' | 'shape' | 'image' | 'video' | 'background' | 'audio' | 'sfx' | 'raster' | 'skip', plus alasan bila dirender
export function classify(l) {
  const def = getLayerDef(l.type);
  if (!def || l.hidden) return { kind: 'skip' };
  if (l.type === 'audio') return l.props?.url ? { kind: 'audio' } : { kind: 'skip' };
  if (l.type === 'sfx') return { kind: 'sfx' };
  if (!def.draw) return { kind: 'skip' };
  if (hasCrop(l)) return { kind: 'raster', why: 'crop' };
  const p = { ...def.defaults, ...l.props };
  const keyed = Object.keys(l.keys || {}).filter((k) => l.keys[k]?.length && !TRANSFORM_KEYS.has(k));
  switch (l.type) {
    case 'text':
      if (p.pill || /\[[^\]]+\]|\{logo\}/.test(p.text) || textOnlyAnim(l) || keyed.length) return { kind: 'raster', why: 'teks khusus' };
      return { kind: 'text' };
    case 'shape':
      if ((p.shape === 'triangle' || p.shape === 'line') && keyed.some((k) => k === 'w' || k === 'h')) return { kind: 'raster', why: 'bentuk beranimasi' };
      return { kind: 'shape' };
    case 'image':
      if (p.radius > 0 || keyed.some((k) => k !== 'w')) return { kind: 'raster', why: 'sudut membulat' };
      return p.url ? { kind: 'image' } : { kind: 'skip' };
    case 'video':
      if (p.radius > 0 || keyed.some((k) => k !== 'w')) return { kind: 'raster', why: 'sudut membulat' };
      return p.url ? { kind: 'video' } : { kind: 'skip' };
    case 'background':
      return { kind: 'background' };
    default:
      return { kind: 'raster', why: 'layer khusus studio' };
  }
}

// ---------- saluran nilai (keyframe AE) ----------
// fn(t) = nilai akhir pada waktu komposisi t (termasuk animasi masuk/keluar), dalam satuan AE.
// keys = keyframe studio milik properti utama saluran ini; dense = rentang waktu yang disampel rapat (linear).
function channel({ fn, layer, keys = [], dense = [], fps }) {
  const start = layer.start;
  const end = layer.start + layer.dur;
  const step = Math.max(1 / fps, 1 / 30);
  const toG = (ct) => layer.start + ct - (layer.offset || 0);
  const userT = keys.map((k) => toG(k.t));
  const ranges = dense.map(([a, b]) => [Math.max(start, a), Math.min(end, b)]).filter(([a, b]) => b > a);
  // segmen easing yang tidak bisa jadi bezier → disampel rapat juga
  keys.forEach((k, i) => {
    if (i < keys.length - 1 && easeShape(k) === null) ranges.push([userT[i], userT[i + 1]]);
  });
  let times = [...userT];
  for (const [a, b] of ranges) {
    for (let t = a; t < b - 1e-6; t += step) times.push(t);
    times.push(b);
  }
  times = times.map(r3).sort((a, b) => a - b).filter((t, i, arr) => i === 0 || t - arr[i - 1] > 1e-3);
  if (times.length < 2) return { v: r3(fn(times.length ? times[0] : start)) };
  const vals = times.map((t) => fn(t));
  if (vals.every((v) => Math.abs(v - vals[0]) < 1e-4)) return { v: r3(vals[0]) };
  const inDense = (a, b) => ranges.some(([x, y]) => a < y - 1e-6 && b > x + 1e-6);
  const out = times.map((t, i) => [t, r3(vals[i]), 'L', 'L', 0, 33.3, 0, 33.3]);
  for (let i = 0; i < times.length - 1; i++) {
    const a = times[i];
    const b = times[i + 1];
    const ki = userT.findIndex((u) => Math.abs(u - a) < 1e-3);
    if (ki < 0 || ki >= keys.length - 1 || Math.abs(userT[ki + 1] - b) > 1e-3 || inDense(a, b)) continue;
    const shape = easeShape(keys[ki]);
    if (shape === 'H') out[i][3] = 'H';
    else if (Array.isArray(shape)) {
      const [x1, y1, x2, y2] = shape;
      const slope = (vals[i + 1] - vals[i]) / (b - a);
      out[i][3] = 'B';
      out[i][6] = r3(x1 > 1e-4 ? (y1 / x1) * slope : 0);
      out[i][7] = r3(Math.max(0.1, x1 * 100));
      out[i + 1][2] = 'B';
      out[i + 1][4] = r3(x2 < 1 - 1e-4 ? ((1 - y2) / (1 - x2)) * slope : 0);
      out[i + 1][5] = r3(Math.max(0.1, (1 - x2) * 100));
    }
  }
  return { k: out };
}

// saluran untuk nilai non-angka atau properti khusus jenis layer: disampel rapat & linear di rentang keyframe-nya
function denseChannel({ fn, layer, props, fps }) {
  const list = props.flatMap((p) => layer.keys?.[p] || []);
  const t0 = layer.start;
  if (!list.length) return { v: fn(t0) };
  const toG = (ct) => layer.start + ct - (layer.offset || 0);
  const a = Math.max(layer.start, Math.min(...list.map((k) => toG(k.t))));
  const b = Math.min(layer.start + layer.dur, Math.max(...list.map((k) => toG(k.t))));
  if (!(b > a)) return { v: fn(a) };
  const step = Math.max(1 / fps, 1 / 30);
  const k = [];
  for (let t = a; t < b - 1e-6; t += step) k.push([r3(t), fn(t), 'L', 'L']);
  k.push([r3(b), fn(b), 'L', 'L']);
  // nilai tidak berubah sama sekali → cukup nilai tetap
  const same = JSON.stringify(k[0][1]);
  if (k.every((x) => JSON.stringify(x[1]) === same)) return { v: k[0][1] };
  return { k };
}

// rentang animasi masuk/keluar (dari preset) dalam waktu komposisi
function presetWindows(l) {
  const w = [];
  const a = l.anim?.in;
  if (a && a.preset !== 'none' && PRESETS[a.preset]?.apply && a.dur > 0) w.push([l.start, l.start + Math.min(a.dur, l.dur)]);
  const b = l.anim?.out;
  if (b && b.preset !== 'none' && PRESETS[b.preset]?.apply && b.dur > 0) w.push([l.start + l.dur - Math.min(b.dur, l.dur), l.start + l.dur]);
  return w;
}

// ---------- ekspor ----------
export async function exportAfterEffects(doc, { status = () => {}, ctx } = {}) {
  const fps = doc.comp.fps || 30;
  const W = doc.comp.width;
  const H = doc.comp.height;
  ctx ||= document.createElement('canvas').getContext('2d');
  status('Menyiapkan ekspor After Effects…');
  await assets.preload(doc);
  const start = await post('/api/ae/start', { name: doc.id }, true);
  const report = { dir: start.dir, native: 0, rendered: [], fonts: new Set(), notes: [] };

  const used = new Set();
  const mediaName = (base, ext) => {
    let n = `${slug(base)}${ext}`;
    for (let i = 2; used.has(n); i++) n = `${slug(base)}-${i}${ext}`;
    used.add(n);
    return n;
  };
  const extOf = (url) => (String(url).split('?')[0].match(/\.[a-z0-9]{2,5}$/i) || ['.bin'])[0].toLowerCase();
  const copied = new Map();
  // salin file media ke folder ekspor (sekali per url)
  async function copyMedia(url, base) {
    if (copied.has(url)) return copied.get(url);
    const name = mediaName(base, extOf(url));
    let file;
    if (String(url).startsWith('/media/')) file = (await post('/api/ae/copy', { url, as: name }, true)).file;
    else file = (await post(`/api/ae/file?name=${encodeURIComponent(name)}`, await (await fetch(url)).blob())).file;
    copied.set(url, file);
    return file;
  }

  const layers = [];
  const classes = doc.layers.map((l) => classify(l));
  const nRaster = classes.filter((c) => c.kind === 'raster').length;
  let rasterDone = 0;

  for (let i = 0; i < doc.layers.length; i++) {
    const l = doc.layers[i];
    const c = classes[i];
    if (c.kind === 'skip' || c.kind === 'sfx') continue;
    const def = getLayerDef(l.type);
    const end = l.start + l.dur;
    const st = (t) => layerState(doc, l, Math.min(end - 1e-4, Math.max(l.start, t)), ctx);
    const p0 = st(l.start).p;
    const spec = { name: l.name, start: r3(l.start), end: r3(end) };

    if (c.kind === 'audio') {
      const p = { ...def.defaults, ...l.props };
      const speed = p.speed || 1;
      Object.assign(spec, {
        kind: 'footage', file: await copyMedia(p.url, l.name), startTime: r3(l.start - (p.in || 0) / speed),
        stretch: r3(100 / speed), db: r3(20 * Math.log10(Math.max(0.001, (p.volume ?? 100) / 100)))
      });
      if (speed !== 1) report.notes.push(`${l.name}: kecepatan ${speed}× di AE tidak mengubah nada seperti di studio`);
      layers.push(spec);
      report.native++;
      continue;
    }

    if (c.kind === 'raster') {
      rasterDone++;
      const file = await renderLayer(doc, l, fps, mediaName(`${l.name}-render`, ''), (k) =>
        status(`Merender layer ${rasterDone}/${nRaster} untuk After Effects: ${l.name} ${Math.round(k * 100)}%`));
      if (!file) continue;
      Object.assign(spec, { kind: 'footage', file: file.file, straight: file.alpha, startTime: r3(file.t0), blend: p0.blend, label: 11, comment: 'Dirender dari Labs Studio (tidak bisa diedit isinya)' });
      layers.push(spec);
      report.rendered.push({ name: l.name, why: c.why });
      continue;
    }

    // ----- layer asli: transform -----
    const windows = presetWindows(l);
    let factor = 1; // skala sumber (gambar/video): lebar di studio ÷ lebar piksel file
    const footW = (p) => p.w;
    if (c.kind === 'image') factor = 1 / Math.max(1, assets.image(p0.url)?.naturalWidth || p0.w);
    if (c.kind === 'video') factor = 1 / Math.max(1, assets.video(l.id, p0.url)?.el.videoWidth || p0.srcW || p0.w);
    const scaled = c.kind === 'image' || c.kind === 'video';
    const extra = scaled && l.keys?.w?.length ? [[Math.min(...l.keys.w.map((k) => l.start + k.t - (l.offset || 0))), Math.max(...l.keys.w.map((k) => l.start + k.t - (l.offset || 0)))]] : [];
    const ch = (prop, fn, more = []) => channel({ fn, layer: l, keys: l.keys?.[prop] || [], dense: [...windows, ...more], fps });
    Object.assign(spec, {
      x: ch('x', (t) => { const s = st(t); return s.p.x + s.m.dx; }),
      y: ch('y', (t) => { const s = st(t); return s.p.y + s.m.dy; }),
      scale: ch('scale', (t) => { const s = st(t); return s.p.scale * s.m.scale * (scaled ? footW(s.p) * factor : 1); }, extra),
      rot: ch('rotation', (t) => { const s = st(t); return s.p.rotation + s.m.rotation; }),
      op: ch('opacity', (t) => { const s = st(t); return Math.max(0, Math.min(100, s.p.opacity * s.m.opacity)); }),
      blend: p0.blend
    });
    const blur = ch('blur', (t) => { const s = st(t); return (s.p.blur + s.m.blur) * BLUR_K; });
    if (blur.k || blur.v > 0.01) spec.blur = blur;
    const soft = ch('shadow', (t) => st(t).p.shadow);
    if (soft.k || soft.v > 0.01) spec.shadow = { soft, color: denseChannel({ fn: (t) => rgba(st(t).p.shadowColor), layer: l, props: ['shadowColor'], fps }) };

    const dense = (props, fn) => denseChannel({ fn, layer: l, props, fps });
    if (c.kind === 'text') {
      const p = p0;
      const { text, ranges } = wrappedText(ctx, p);
      const font = psFont(p.font, Number(p.weight), false);
      report.fonts.add(p.font);
      Object.assign(spec, {
        kind: 'text', text, font, size: Number(p.size), color: rgb(p.color), align: p.align, box: p.boxWidth,
        tracking: r3((p.letterSpacing / p.size) * 1000), leading: r3(p.size * p.lineHeight),
        stroke: p.stroke > 0 ? { color: rgb(p.strokeColor), width: p.stroke } : null
      });
      if (ranges.length) {
        spec.accents = ranges;
        spec.accentColor = rgb(p.accent);
        if (p.accentFont) {
          spec.accentFont = psFont(p.accentFont, 400, !!p.accentItalic);
          report.fonts.add(p.accentFont);
        }
      }
    } else if (c.kind === 'shape') {
      const p = p0;
      spec.kind = 'shape';
      spec.shape = p.shape;
      spec.w = p.w;
      spec.h = p.h;
      spec.size = dense(['w', 'h'], (t) => { const q = st(t).p; return [r3(q.w), r3(q.h)]; });
      spec.round = dense(['w', 'h', 'radius'], (t) => { const q = st(t).p; return r3(Math.min(q.radius, q.w / 2, q.h / 2)); });
      if (p.shape === 'line') {
        spec.stroke = {
          width: dense(['strokeWidth'], (t) => Math.max(1, st(t).p.strokeWidth || 8)),
          color: dense(['strokeWidth', 'strokeColor', 'fill'], (t) => { const q = st(t).p; return rgba(q.strokeWidth ? q.strokeColor : q.fill); })
        };
      } else {
        if (p.fillOn) spec.fill = dense(['fill'], (t) => rgba(st(t).p.fill));
        if (p.strokeWidth > 0 || l.keys?.strokeWidth?.length) spec.stroke = { width: dense(['strokeWidth'], (t) => st(t).p.strokeWidth), color: dense(['strokeColor'], (t) => rgba(st(t).p.strokeColor)) };
      }
    } else if (c.kind === 'image') {
      const url = p0.url;
      const ext = extOf(url);
      let file;
      if (['.png', '.jpg', '.jpeg'].includes(ext)) file = await copyMedia(url, l.name);
      else {
        // svg/webp/gif → PNG supaya pasti bisa diimpor AE
        const img = assets.image(url);
        const cv = document.createElement('canvas');
        cv.width = img?.naturalWidth || p0.w;
        cv.height = img?.naturalHeight || Math.round(p0.w * 0.5625);
        if (img) cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        const name = mediaName(l.name, '.png');
        file = (await post(`/api/ae/file?name=${encodeURIComponent(name)}`, await new Promise((r) => cv.toBlob(r, 'image/png')))).file;
      }
      Object.assign(spec, { kind: 'footage', file });
    } else if (c.kind === 'video') {
      const speed = p0.speed || 1;
      Object.assign(spec, {
        kind: 'footage', file: await copyMedia(p0.url, l.name), mute: true,
        startTime: r3(l.start - (l.offset || 0) - (p0.in || 0) / speed), stretch: r3(100 / speed)
      });
    } else if (c.kind === 'background') {
      const p = p0;
      const cx = W / 2;
      const cy = H / 2;
      spec.kind = 'solid';
      spec.color = rgb(p.color1);
      if (p.mode === 'solid') {
        if (l.keys?.color1?.length) spec.fill = dense(['color1'], (t) => rgba(st(t).p.color1));
      } else {
        const pts = (t) => {
          const q = st(t).p;
          if (q.mode === 'radial') return [[cx, cy], [cx + Math.max(W, H) * 0.75, cy]];
          const a = (q.angle * Math.PI) / 180;
          const r = Math.hypot(W, H) / 2;
          return [[cx - Math.cos(a) * r, cy - Math.sin(a) * r], [cx + Math.cos(a) * r, cy + Math.sin(a) * r]];
        };
        spec.ramp = {
          shape: p.mode === 'radial' ? 2 : 1,
          p1: dense(['angle'], (t) => pts(t)[0].map(r3)),
          p2: dense(['angle'], (t) => pts(t)[1].map(r3)),
          c1: dense(['color1'], (t) => rgba(st(t).p.color1)),
          c2: dense(['color2'], (t) => rgba(st(t).p.color2))
        };
      }
    }
    layers.push(spec);
    report.native++;
  }

  // efek suara sintetis → satu file WAV gabungan
  if (doc.layers.some((l, i) => classes[i].kind === 'sfx')) {
    status('Merender efek suara…');
    const a = createAudio();
    a.setTimeline({ ...audioTimeline(doc), audio: [] });
    await a.ensureLoaded();
    const wav = await a.renderOffline(doc.comp.duration);
    const file = (await post(`/api/ae/file?name=${encodeURIComponent(mediaName('efek-suara', '.wav'))}`, wav)).file;
    layers.push({ kind: 'footage', name: 'Efek suara (gabungan)', file, start: 0, end: r3(doc.comp.duration), startTime: 0, comment: 'Semua layer efek suara studio' });
  }

  // ----- tulis skrip -----
  const data = {
    name: doc.name || doc.id,
    comp: { w: W, h: H, fps, dur: r3(doc.comp.duration), bg: rgb(doc.comp.background), bgLayer: true },
    layers
  };
  // ExtendScript membaca file paling aman dalam ASCII: huruf non-ASCII ditulis sebagai \uXXXX
  const json = JSON.stringify(data).replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const script = `// Dibuat oleh Labs Studio (${new Date().toISOString().slice(0, 10)}).\n// After Effects: File > Scripts > Run Script File... lalu pilih file ini.\nvar D = ${json};\n${RUNTIME}`;
  const scriptName = `${slug(doc.id)}.jsx`;
  await post(`/api/ae/file?root=1&name=${encodeURIComponent(scriptName)}`, new Blob([script], { type: 'text/plain' }));
  await post(`/api/ae/file?root=1&name=BACA-SAYA.txt`, new Blob([readme(doc, scriptName, report)], { type: 'text/plain' }));
  return { dir: report.dir, script: `${report.dir}/${scriptName}`.replace(/\\/g, '/'), native: report.native, rendered: report.rendered, fonts: [...report.fonts], notes: report.notes };
}

// render satu layer sendirian (latar transparan) frame demi frame → ProRes 4444 bertransparansi
async function renderLayer(doc, l, fps, name, progress) {
  const cv = document.createElement('canvas');
  cv.width = doc.comp.width;
  cv.height = doc.comp.height;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const solo = { ...doc, comp: { ...doc.comp, background: 'transparent' }, layers: [{ ...l, hidden: false, props: { ...l.props, blend: 'source-over' } }] };
  const f0 = Math.ceil(l.start * fps - 1e-6);
  const f1 = Math.ceil(Math.min(l.start + l.dur, doc.comp.duration) * fps - 1e-6);
  if (f1 <= f0) return null;
  const alpha = await needsAlpha(solo, l, g, f0, f1, fps);
  await post('/api/ae/seq-start', { name, fps, width: cv.width, height: cv.height, alpha }, true);
  assets.exporting = true;
  try {
    for (let f = f0; f < f1; f++) {
      const t = f / fps;
      await assets.seekAll(solo, t);
      renderComp(g, solo, t);
      // piksel RGBA mentah (alpha lurus) langsung ke ffmpeg; jauh lebih cepat daripada encode PNG
      await post('/api/ae/seq-frame', new Blob([g.getImageData(0, 0, cv.width, cv.height).data]));
      if ((f - f0) % 10 === 0) progress((f - f0) / (f1 - f0));
    }
  } finally {
    assets.exporting = false;
  }
  const out = await post('/api/ae/seq-finish', {}, true);
  return { file: out.file, t0: f0 / fps, alpha };
}

// Apakah layer ini butuh transparansi? Layer yang selalu menutupi seluruh layar (mis. latar liquid)
// cukup disimpan sebagai H.264, jauh lebih kecil daripada ProRes 4444.
async function needsAlpha(solo, l, g, f0, f1, fps) {
  const p = l.props || {};
  if ((p.opacity ?? 100) < 100 || l.keys?.opacity?.length) return true;
  if (['in', 'out'].some((s) => l.anim?.[s]?.preset && l.anim[s].preset !== 'none')) return true;
  const W = g.canvas.width;
  const H = g.canvas.height;
  const n = Math.min(16, f1 - f0);
  for (let i = 0; i < n; i++) {
    const f = f0 + Math.round((i * (f1 - 1 - f0)) / Math.max(1, n - 1));
    await assets.seekAll(solo, f / fps);
    renderComp(g, solo, f / fps);
    const px = g.getImageData(0, 0, W, H).data;
    for (let j = 3; j < px.length; j += 4 * 97) if (px[j] < 250) return true;
  }
  return false;
}

function readme(doc, scriptName, report) {
  const fonts = [...report.fonts];
  return [
    `Proyek "${doc.name || doc.id}" dari Labs Studio, siap dibuka di After Effects.`,
    '',
    'CARA MEMBUKA',
    `1. Buka After Effects (versi 2020 ke atas; warna kata aksen otomatis butuh 24.3+).`,
    `2. File > Scripts > Run Script File... lalu pilih ${scriptName} di folder ini.`,
    '3. Komposisi tersusun otomatis. Simpan proyeknya (File > Save) supaya jadi file .aep.',
    '   Jangan pindahkan folder media/ sebelum proyek disimpan.',
    '',
    `Layer yang bisa diedit di AE: ${report.native}`,
    report.rendered.length ? `Layer yang dirender jadi video (tampilan sama, isi tidak bisa diedit):\n  - ${report.rendered.map((r) => `${r.name} (${r.why})`).join('\n  - ')}` : 'Semua layer bisa diedit.',
    fonts.length ? `\nFONT yang dipakai (pasang dulu dari fonts.google.com bila belum ada): ${fonts.join(', ')}` : '',
    report.notes.length ? `\nCATATAN:\n  - ${report.notes.join('\n  - ')}` : '',
    '',
    '---',
    `Project "${doc.name || doc.id}" from Labs Studio, ready for After Effects.`,
    `Open AE, choose File > Scripts > Run Script File... and pick ${scriptName}. Then save the project as .aep.`,
    'Basic layers stay editable with their keyframes; studio-only layers come in as pre-rendered transparent video.',
    ''
  ].join('\n');
}
