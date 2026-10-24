// Editor motion graphics: kanvas + inspector + timeline layer.
import { t as tr, langToggle } from '../core/i18n.js';
import { createStore } from '../store.js';
import { createAudio } from '../audio.js';
import { exportVideo, savePoster } from '../core/exportVideo.js';
import { LAYER_TYPES, getLayerDef } from './registry.js';
import { renderComp, layerCorners, layerFrame, hitTest, isActive, setAssetListener, assets } from './engine.js';
import { setKey } from './keys.js';
import { newLayer, newId } from './doc.js';
import { SNIPPETS } from './snippets.js';
import { createInspector } from './ui/inspector.js';
import { ask } from '../core/dialog.js';
import { openVoiceDialog } from '../core/voiceover.js';
import { createTimeline } from './ui/timeline.js';
import { audioTimeline as buildAudioTimeline } from './audioTimeline.js';
import '../core/bridge.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}.${String(Math.floor((x % 1) * 100)).padStart(2, '0')}`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const stage = $('stage');
const ctx = stage.getContext('2d');
const over = $('overlay');
const octx = over.getContext('2d');
const store = createStore();
const audio = createAudio();

let t = 0;
let playing = false;
let busy = false;
let dirty = true;

const doc = () => store.doc;
const status = (m) => { $('status').textContent = m; };

// ---------- audio: layer audio → bentuk timeline yang dipakai audio.js ----------
const audioTimeline = () => buildAudioTimeline(doc());

// ---------- gambar ----------
// zoom tampilan kanvas (tidak mengubah dokumen). 0 = pas dengan layar
let zoom = 0;
const ZOOMS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4];

function fitScale() {
  const c = doc().comp;
  const box = $('frame').getBoundingClientRect();
  return Math.max(0.02, Math.min((box.width - 24) / c.width, (box.height - 24) / c.height));
}

function fitStage() {
  if (!doc()) return;
  const c = doc().comp;
  if (stage.width !== c.width || stage.height !== c.height) {
    stage.width = over.width = c.width;
    stage.height = over.height = c.height;
  }
  const s = zoom || fitScale();
  const w = Math.max(10, Math.floor(c.width * s));
  const h = Math.max(10, Math.floor(c.height * s));
  for (const cv of [stage, over]) {
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
  }
  $('stage-wrap').style.width = `${w}px`;
  $('stage-wrap').style.height = `${h}px`;
  $('frame').classList.toggle('zoomed', !!zoom);
  $('zoom-label').textContent = zoom ? `${Math.round(zoom * 100)}%` : `Pas ${Math.round(s * 100)}%`;
  dirty = true;
}

// ganti zoom; titik di bawah kursor (bila ada) tetap di tempatnya
function setZoom(z, anchor) {
  const fr = $('frame');
  const r0 = over.getBoundingClientRect();
  const ax = anchor ? anchor[0] : r0.left + r0.width / 2;
  const ay = anchor ? anchor[1] : r0.top + r0.height / 2;
  const fx = (ax - r0.left) / r0.width;
  const fy = (ay - r0.top) / r0.height;
  zoom = z;
  fitStage();
  const r1 = over.getBoundingClientRect();
  fr.scrollLeft += r1.left + fx * r1.width - ax;
  fr.scrollTop += r1.top + fy * r1.height - ay;
}

function stepZoom(dir, anchor) {
  const cur = zoom || fitScale();
  const next = dir > 0 ? ZOOMS.find((z) => z > cur * 1.01) : [...ZOOMS].reverse().find((z) => z < cur * 0.99);
  if (next) setZoom(next, anchor);
}

$('zoom-in').onclick = () => stepZoom(1);
$('zoom-out').onclick = () => stepZoom(-1);
$('zoom-label').onclick = () => setZoom(zoom ? 0 : 1);
$('frame').addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  stepZoom(e.deltaY < 0 ? 1 : -1, [e.clientX, e.clientY]);
}, { passive: false });

function draw() {
  renderComp(ctx, doc(), t);
  drawOverlay();
}

// garis bantu saat menyeret (nempel ke tengah/tepi layar & layer lain)
let guides = [];
let dragMode = null;

function drawOverlay() {
  octx.clearRect(0, 0, over.width, over.height);
  if (busy) return;
  const k = over.width / parseFloat(over.style.width);
  if (guides.length) {
    octx.strokeStyle = '#ff5fd2';
    octx.lineWidth = 1.5 * k;
    octx.beginPath();
    for (const g of guides) {
      if (g.axis === 'x') { octx.moveTo(g.v, 0); octx.lineTo(g.v, over.height); }
      else { octx.moveTo(0, g.v); octx.lineTo(over.width, g.v); }
    }
    octx.stroke();
  }
  const layer = selectedVisual();
  if (!layer) return;
  const c = layerCorners(doc(), layer, t, ctx);
  if (!c) return;
  // saat crop: kotak penuh tipis supaya kelihatan bagian yang terpotong
  if (dragMode === 'crop') {
    const f = layerFrame(doc(), layer, t, ctx);
    octx.strokeStyle = 'rgba(217, 215, 255, 0.35)';
    octx.lineWidth = 1 * k;
    octx.setLineDash([4 * k, 4 * k]);
    poly(boxCorners(f, -f.size.w / 2, -f.size.h / 2, f.size.w / 2, f.size.h / 2));
    octx.stroke();
  }
  octx.strokeStyle = '#d9d7ff';
  octx.lineWidth = 2 * k;
  octx.setLineDash([8 * k, 5 * k]);
  poly(c);
  octx.stroke();
  octx.setLineDash([]);
  if (layer.locked) return;
  // sudut = skala, tengah sisi = crop
  octx.fillStyle = '#d9d7ff';
  for (const [x, y] of c) octx.fillRect(x - 5 * k, y - 5 * k, 10 * k, 10 * k);
  octx.strokeStyle = '#0a0a16';
  octx.lineWidth = 1.5 * k;
  for (const h of handles(c)) {
    if (h.mode !== 'crop') continue;
    octx.beginPath();
    octx.arc(h.x, h.y, 5.5 * k, 0, Math.PI * 2);
    octx.fill();
    octx.stroke();
  }
}

function poly(pts) {
  octx.beginPath();
  pts.forEach(([x, y], i) => (i ? octx.lineTo(x, y) : octx.moveTo(x, y)));
  octx.closePath();
}

function boxCorners(f, x0, y0, x1, y1) {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [
    f.cx + x * f.s * Math.cos(f.r) - y * f.s * Math.sin(f.r),
    f.cy + x * f.s * Math.sin(f.r) + y * f.s * Math.cos(f.r)
  ]);
}

// layer yang bisa diseret di kanvas (tampil, bukan audio/latar penuh)
function canvasLayer(layer) {
  if (!layer || !isActive(layer, t) || layer.type === 'audio' || layer.type === 'sfx') return false;
  const def = getLayerDef(layer.type);
  return !!def?.draw && !def.fullFrame;
}

function selectedVisual() {
  const layer = doc().layers.find((l) => l.id === store.sel?.id);
  return canvasLayer(layer) ? layer : null;
}

function handles(c) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const list = c.map(([x, y], i) => ({ mode: 'scale', x, y, cursor: i % 2 ? 'nesw-resize' : 'nwse-resize' }));
  [['cropTop', mid(c[0], c[1]), 'ns-resize'], ['cropRight', mid(c[1], c[2]), 'ew-resize'],
    ['cropBottom', mid(c[2], c[3]), 'ns-resize'], ['cropLeft', mid(c[3], c[0]), 'ew-resize']]
    .forEach(([key, [x, y], cursor]) => list.push({ mode: 'crop', key, x, y, cursor }));
  return list;
}

function handleAt(x, y) {
  const layer = selectedVisual();
  if (!layer || layer.locked) return null;
  const c = layerCorners(doc(), layer, t, ctx);
  if (!c) return null;
  const tol = 10 * (over.width / parseFloat(over.style.width));
  // layer kecil: titik yang lebih dekat ke tengah kotak tetap dianggap geser
  const cx = (c[0][0] + c[2][0]) / 2;
  const cy = (c[0][1] + c[2][1]) / 2;
  let best = null;
  for (const h of handles(c)) {
    const dist = Math.hypot(h.x - x, h.y - y);
    if (dist <= tol && dist < Math.hypot(cx - x, cy - y) && (!best || dist < best.dist)) best = { ...h, dist };
  }
  return best ? { ...best, layer } : null;
}

// ---------- transport ----------
function seek(x) {
  t = clamp(x, 0, doc().comp.duration);
  if (playing) audio.play(t);
  dirty = true;
  inspector.render();
}

function setPlaying(p) {
  if (busy) return;
  playing = p;
  assets.playing = p;
  dirty = true;
  if (p) {
    if (t >= doc().comp.duration - 0.02) t = 0;
    audio.setTimeline(audioTimeline());
    audio.play(t);
  } else {
    audio.stop();
    assets.pauseAll();
    inspector.render();
  }
}

$('play').onclick = () => setPlaying(!playing);
$('to-start').onclick = () => seek(0);
$('seek').oninput = () => seek(parseFloat($('seek').value));

// ---------- tambah layer ----------
function addLayers(layers, { select = true } = {}) {
  store.mutate((d) => {
    for (const l of [...layers].reverse()) {
      if (l.type === 'background') d.layers.push(l);
      else d.layers.unshift(l);
    }
    if (select) store.setSel({ kind: 'layer', id: layers[layers.length - 1].id });
  });
}

function addType(type) {
  const d = doc();
  const def = getLayerDef(type);
  const start = def.fullFrame ? 0 : clamp(t, 0, Math.max(0, d.comp.duration - 0.5));
  const props = {};
  if (type === 'chibi3d') Object.assign(props, { w: Math.min(d.comp.width, d.comp.height), h: Math.min(d.comp.width, d.comp.height) });
  if (type === 'text') props.boxWidth = Math.round(d.comp.width * 0.8);
  const dur = def.fullFrame ? d.comp.duration : def.defaultDur || Math.max(0.5, d.comp.duration - start);
  addLayers([newLayer(type, d.comp, { start, dur, props })]);
}

async function upload(file) {
  const isVideo = /^video\//.test(file.type) || /\.(mp4|mov|mkv|avi|m4v|3gp|webm)$/i.test(file.name);
  status(isVideo ? `Mengunggah & menyiapkan video ${file.name}…` : `Mengunggah ${file.name}…`);
  // video disimpan utuh (gambar + audio terpisah); keep=1 mencegah server hanya mengambil audionya
  const res = await fetch(`/api/upload?name=${encodeURIComponent(file.name)}${isVideo ? '&keep=1' : ''}`, { method: 'POST', body: file });
  const out = await res.json();
  if (out.error) {
    status(`${file.name}: ${out.error}`);
    return null;
  }
  status(`${file.name} siap`);
  return out;
}

async function importFiles(files) {
  for (const f of files) {
    const isImage = /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name);
    const isAudio = /^(audio|video)\//.test(f.type) || /\.(mp3|wav|m4a|aac|ogg|flac|mp4|mov|mkv|webm)$/i.test(f.name);
    if (!isImage && !isAudio) {
      status(`${f.name} tidak didukung`);
      continue;
    }
    const res = await upload(f);
    if (!res) continue;
    const d = doc();
    if (res.video) {
      // gambar video + suaranya sebagai layer audio pendamping, mulai di waktu yang sama
      const scale = Math.min(1, d.comp.width / res.width, d.comp.height / res.height);
      const dur = Math.max(0.1, res.duration || 5);
      const layers = [newLayer('video', d.comp, {
        name: f.name, start: t, dur,
        props: { url: res.url, srcW: res.width, srcH: res.height, w: Math.round(res.width * scale) },
        anim: { in: { preset: 'none', dur: 0.4 }, out: { preset: 'none', dur: 0.4 } }
      })];
      if (res.audioUrl) {
        await audio.getBuffer(res.audioUrl);
        layers.push(newLayer('audio', d.comp, { name: `Audio · ${f.name}`, start: t, dur, props: { url: res.audioUrl } }));
      }
      store.mutate((dd) => {
        // video di paling depan, audionya tepat di bawahnya
        dd.layers.unshift(...layers);
        store.setSel({ kind: 'layer', id: layers[0].id });
      });
      status(`${f.name} ditambahkan (${dur.toFixed(1)} dtk${res.audioUrl ? ', dengan audio' : ', tanpa audio'})`);
      if (t + dur > d.comp.duration && (await ask(`Video lebih panjang dari komposisi. Perpanjang komposisi jadi ${Math.ceil(t + dur)} detik?`, { ok: 'Perpanjang', cancel: 'Biarkan' }))) {
        store.mutate((dd) => { dd.comp.duration = Math.ceil(t + dur); });
      }
      continue;
    }
    if (isImage) {
      const img = new Image();
      await new Promise((r) => { img.onload = r; img.onerror = r; img.src = res.url; });
      const w = Math.round(Math.min(img.naturalWidth || 600, d.comp.width * 0.6));
      addLayers([newLayer('image', d.comp, { name: f.name, start: t, dur: Math.max(0.5, d.comp.duration - t), props: { url: res.url, w }, anim: { in: { preset: 'fade', dur: 0.4 }, out: { preset: 'none', dur: 0.4 } } })]);
    } else {
      const buf = await audio.getBuffer(res.url);
      if (!buf) {
        status(`Gagal membaca ${f.name}`);
        continue;
      }
      addLayers([newLayer('audio', d.comp, { name: f.name, start: t, dur: buf.duration, props: { url: res.url } })]);
      if (t + buf.duration > d.comp.duration && (await ask(`Audio lebih panjang dari komposisi. Perpanjang komposisi jadi ${Math.ceil(t + buf.duration)} detik?`, { ok: 'Perpanjang', cancel: 'Biarkan' }))) {
        store.mutate((dd) => { dd.comp.duration = Math.ceil(t + buf.duration); });
      }
    }
  }
}

// voice over ElevenLabs → layer audio di posisi playhead
async function addVoiceOver() {
  const res = await openVoiceDialog({ mode: 'single' });
  if (!res) return;
  const buf = await audio.getBuffer(res.url);
  if (!buf) return status('Suara dibuat tapi gagal dibaca');
  const d = doc();
  addLayers([newLayer('audio', d.comp, { name: res.name, start: t, dur: buf.duration, props: { url: res.url } })]);
  status(`Voice over ditambahkan (${buf.duration.toFixed(1)} dtk)`);
  if (t + buf.duration > d.comp.duration && (await ask(`Voice over lebih panjang dari komposisi. Perpanjang komposisi jadi ${Math.ceil(t + buf.duration)} detik?`, { ok: 'Perpanjang', cancel: 'Biarkan' }))) {
    store.mutate((dd) => { dd.comp.duration = Math.ceil(t + buf.duration); });
  }
}

function renderPalette() {
  const cats = {};
  for (const def of LAYER_TYPES) (cats[def.category || 'Lainnya'] = cats[def.category || 'Lainnya'] || []).push(def);
  $('palette').innerHTML = `
    <div class="panel-head"><span>Tambah</span></div>
    <div class="pal">
      ${Object.entries(cats).map(([cat, defs]) => `<h5>${cat}</h5><div class="pal-grid">${defs.map((d) => `<button type="button" data-type="${d.type}"><b>${d.icon || '+'}</b>${d.name}</button>`).join('')}</div>`).join('')}
      <h5>Rakitan</h5>
      <div class="pal-list">${SNIPPETS.map((s) => `<button type="button" data-snippet="${s.id}">${s.name}</button>`).join('')}</div>
      <h5>Suara</h5>
      <button type="button" class="wide" data-act="voice">Voice over (ElevenLabs)…</button>
      <h5>File</h5>
      <button type="button" class="wide" data-act="import">Impor gambar / audio / video…</button>
      <p class="meta wrap">Atau seret file ke jendela ini.</p>
    </div>`;
}

$('palette').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.type) addType(b.dataset.type);
  if (b.dataset.snippet) addLayers(SNIPPETS.find((s) => s.id === b.dataset.snippet).create(doc().comp, t));
  if (b.dataset.act === 'voice') addVoiceOver();
  if (b.dataset.act === 'import') {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,audio/*,video/*,.mov,.mkv';
    input.onchange = () => importFiles([...input.files]);
    input.click();
  }
});

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length) importFiles([...e.dataTransfer.files]);
});

// ---------- aksi layer ----------
const selected = (d = doc()) => d.layers.find((l) => l.id === store.sel?.id);
const actions = {
  delete() {
    if (!selected()) return;
    store.mutate((d) => {
      d.layers = d.layers.filter((l) => l.id !== store.sel.id);
      store.setSel(null);
    });
  },
  dup() {
    if (!selected()) return;
    store.mutate((d) => {
      const l = selected(d);
      const c = { ...structuredClone(l), id: newId('l'), name: `${l.name} ${tr('salinan')}` };
      d.layers.splice(d.layers.indexOf(l), 0, c);
      store.setSel({ kind: 'layer', id: c.id });
    });
  },
  split() {
    const l = selected();
    if (!l || t <= l.start + 0.02 || t >= l.start + l.dur - 0.02) return status('Taruh playhead di dalam layer yang dipilih');
    store.mutate((d) => {
      const a = selected(d);
      const cut = t - a.start;
      const b = { ...structuredClone(a), id: newId('l'), name: `${a.name} (2)`, start: t, dur: a.dur - cut };
      if (b.type === 'audio') b.props.in = (a.props.in || 0) + cut * (a.props.speed || 1);
      else b.offset = (a.offset || 0) + cut;
      // potongan pertama tidak perlu animasi keluar, potongan kedua tidak perlu animasi masuk
      a.dur = cut;
      if (a.anim?.out) a.anim.out.preset = 'none';
      if (b.anim?.in) b.anim.in.preset = 'none';
      d.layers.splice(d.layers.indexOf(a), 0, b);
      store.setSel({ kind: 'layer', id: b.id });
    });
  },
  up() { move(-1); },
  down() { move(1); }
};
function move(dir) {
  store.mutate((d) => {
    const l = selected(d);
    const i = d.layers.indexOf(l);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.layers.length) return;
    [d.layers[i], d.layers[j]] = [d.layers[j], d.layers[i]];
  });
}

// ---------- kanvas: klik pilih, seret pindah / skala / crop ----------
function compPoint(e) {
  const r = over.getBoundingClientRect();
  return [((e.clientX - r.left) * over.width) / r.width, ((e.clientY - r.top) * over.height) / r.height];
}

// ubah properti di waktu ini: ikut keyframe bila properti itu sudah beranimasi
function setProp(layer, key, contentT, v) {
  if (layer.keys?.[key]?.length) setKey(layer, key, contentT, v);
  else layer.props[key] = v;
}

// kotak sejajar sumbu dari sudut-sudut layer
function bbox(c) {
  const xs = c.map((p) => p[0]);
  const ys = c.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// titik tempel: tepi & tengah layar, plus tepi & tengah layer lain yang sedang tampil
function snapTargets(d, skipId) {
  const xs = [0, d.comp.width / 2, d.comp.width];
  const ys = [0, d.comp.height / 2, d.comp.height];
  for (const l of d.layers) {
    if (l.id === skipId || !canvasLayer(l)) continue;
    const c = layerCorners(d, l, t, ctx);
    if (!c) continue;
    const b = bbox(c);
    xs.push(b.x0, (b.x0 + b.x1) / 2, b.x1);
    ys.push(b.y0, (b.y0 + b.y1) / 2, b.y1);
  }
  return { xs, ys };
}

// cari geseran terkecil supaya salah satu titik (v + offset) menempel ke target
function snap1D(v, offsets, targets, tol) {
  let best = null;
  for (const o of offsets) {
    for (const tg of targets) {
      const diff = tg - (v + o);
      if (Math.abs(diff) <= tol && (!best || Math.abs(diff) < Math.abs(best.diff))) best = { diff, at: tg };
    }
  }
  return best;
}

over.addEventListener('pointerdown', (e) => {
  const [x, y] = compPoint(e);
  const d = doc();
  const handle = handleAt(x, y);
  const hit = handle ? handle.layer : hitTest(d, t, x, y, ctx);
  if (!hit) {
    if (store.sel) store.select(null);
    return;
  }
  if (!handle) store.select({ kind: 'layer', id: hit.id });
  const before = store.snapshot();
  const layer = d.layers.find((l) => l.id === hit.id);
  const contentT = t - layer.start + (layer.offset || 0);
  const f = layerFrame(d, layer, t, ctx);
  const k = over.width / parseFloat(over.style.width);
  const mode = handle ? handle.mode : 'move';

  // geser: posisi awal = nilai saat ini (termasuk keyframe); tepi & tengah kotak relatif ke posisi itu
  const base = { x: f.p.x, y: f.p.y };
  const b0 = bbox(layerCorners(d, layer, t, ctx));
  const ox = [b0.x0 - base.x, (b0.x0 + b0.x1) / 2 - base.x, b0.x1 - base.x];
  const oy = [b0.y0 - base.y, (b0.y0 + b0.y1) / 2 - base.y, b0.y1 - base.y];
  const targets = mode === 'move' ? snapTargets(d, layer.id) : null;
  const dist0 = Math.max(1, Math.hypot(x - f.cx, y - f.cy));

  let moved = false;
  over.setPointerCapture(e.pointerId);
  const mv = (ev) => {
    const [nx, ny] = compPoint(ev);
    if (!moved && Math.hypot(nx - x, ny - y) < 3 * k) return;
    moved = true;
    dragMode = mode;
    if (mode === 'move') {
      let px = base.x + nx - x;
      let py = base.y + ny - y;
      guides = [];
      // tahan Ctrl/Alt untuk menggeser bebas tanpa menempel
      if (!ev.ctrlKey && !ev.altKey) {
        const sx = snap1D(px, ox, targets.xs, 8 * k);
        const sy = snap1D(py, oy, targets.ys, 8 * k);
        if (sx) { px += sx.diff; guides.push({ axis: 'x', v: sx.at }); }
        if (sy) { py += sy.diff; guides.push({ axis: 'y', v: sy.at }); }
      }
      setProp(layer, 'x', contentT, Math.round(px * 10) / 10);
      setProp(layer, 'y', contentT, Math.round(py * 10) / 10);
    } else if (mode === 'scale') {
      const ratio = Math.hypot(nx - f.cx, ny - f.cy) / dist0;
      setProp(layer, 'scale', contentT, Math.max(1, Math.round(f.p.scale * ratio * 10) / 10));
    } else {
      // titik mouse ke koordinat lokal layer (sebelum rotasi & skala)
      const dx = nx - f.cx;
      const dy = ny - f.cy;
      const lx = (dx * Math.cos(-f.r) - dy * Math.sin(-f.r)) / f.s;
      const ly = (dx * Math.sin(-f.r) + dy * Math.cos(-f.r)) / f.s;
      const { w, h } = f.size;
      const pct = {
        cropTop: ((ly + h / 2) / h) * 100, cropBottom: ((h / 2 - ly) / h) * 100,
        cropLeft: ((lx + w / 2) / w) * 100, cropRight: ((w / 2 - lx) / w) * 100
      }[handle.key];
      const opposite = { cropTop: 'cropBottom', cropBottom: 'cropTop', cropLeft: 'cropRight', cropRight: 'cropLeft' }[handle.key];
      setProp(layer, handle.key, contentT, Math.round(clamp(pct, 0, 99 - (f.p[opposite] || 0)) * 10) / 10);
    }
    store.preview();
  };
  const up = () => {
    over.removeEventListener('pointermove', mv);
    over.removeEventListener('pointerup', up);
    guides = [];
    dragMode = null;
    dirty = true;
    if (moved) store.commit(before);
  };
  over.addEventListener('pointermove', mv);
  over.addEventListener('pointerup', up);
});

// kursor sesuai yang ada di bawah mouse
over.addEventListener('pointermove', (e) => {
  if (e.buttons) return;
  const [x, y] = compPoint(e);
  const h = handleAt(x, y);
  over.style.cursor = h ? h.cursor : hitTest(doc(), t, x, y, ctx) ? 'move' : 'default';
});

// ---------- keyboard ----------
// klik di kanvas/timeline melepas fokus dari kolom inspector, supaya pintasan (Delete, Spasi, …) langsung jalan
window.addEventListener('pointerdown', (e) => {
  const a = document.activeElement;
  if (!a || !['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName)) return;
  if (e.target.closest?.('input, textarea, select, label, dialog') || e.target.closest?.('#inspector')) return;
  a.blur();
}, true);

window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if ((tag === 'INPUT' && !['range', 'checkbox'].includes(e.target.type)) || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  const frame = 1 / doc().comp.fps;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); seek(t + (e.shiftKey ? 1 : frame)); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(t - (e.shiftKey ? 1 : frame)); }
  else if (e.key === 'Home') seek(0);
  else if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); }
  else if (ctrl && k === 'd') { e.preventDefault(); actions.dup(); }
  else if (ctrl && e.key === ']') { e.preventDefault(); actions.up(); }
  else if (ctrl && e.key === '[') { e.preventDefault(); actions.down(); }
  else if (!ctrl && k === 's') actions.split();
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); actions.delete(); }
  else if (e.key === 'Escape') store.select(null);
  else if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); stepZoom(1); }
  else if (ctrl && e.key === '-') { e.preventDefault(); stepZoom(-1); }
  else if (ctrl && e.key === '0') { e.preventDefault(); setZoom(0); }
});

// ---------- simpan ----------
let saveTimer = null;
let posterTimer = null;
function save() {
  clearTimeout(saveTimer);
  $('save-status').textContent = 'Menyimpan…';
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/docs/motion/${doc().id}`, { method: 'POST', body: JSON.stringify(doc()) });
      if (!res.ok) throw new Error();
      $('save-status').textContent = 'Tersimpan';
    } catch {
      $('save-status').textContent = 'Gagal menyimpan';
    }
  }, 500);
  clearTimeout(posterTimer);
  posterTimer = setTimeout(posterNow, 2500);
}

// poster = frame di 40% durasi (biasanya isi sudah tampil)
async function posterNow() {
  if (busy || playing) return;
  const keep = t;
  renderComp(ctx, doc(), doc().comp.duration * 0.4);
  await savePoster(stage, 'motion', doc().id);
  t = keep;
  dirty = true;
}

// ---------- ekspor ----------
async function guard(label, fn) {
  if (busy) return;
  setPlaying(false);
  busy = true;
  assets.exporting = true;
  document.body.classList.add('exporting');
  try {
    await fn();
  } catch (err) {
    status(`${label} gagal: ${err.message}`);
    console.error(err);
  } finally {
    busy = false;
    assets.exporting = false;
    document.body.classList.remove('exporting');
    dirty = true;
  }
}

$('export-video').onclick = () => guard('Ekspor video', async () => {
  const d = doc();
  status('Menyiapkan aset…');
  await assets.preload(d);
  audio.setTimeline(audioTimeline());
  await audio.ensureLoaded();
  const wav = await audio.renderOffline(d.comp.duration);
  const file = await exportVideo({
    canvas: stage, name: d.id, fps: d.comp.fps, total: d.comp.duration, audioWav: wav, status,
    // tiap frame: video di-seek tepat dulu, baru digambar
    renderFrame: async (time) => {
      t = time;
      await assets.seekAll(d, time);
      renderComp(ctx, d, time);
    }
  });
  status(`Video selesai: ${file}`);
});

$('export-audio').onclick = () => guard('Ekspor audio', async () => {
  audio.setTimeline(audioTimeline());
  await audio.ensureLoaded();
  const wav = await audio.renderOffline(doc().comp.duration);
  const res = await fetch(`/api/export-audio?name=${doc().id}`, { method: 'POST', body: wav });
  const out = await res.json();
  if (!res.ok) throw new Error(out.error);
  status(`Audio selesai: ${out.files.join(' · ')}`);
});

$('export-frame').onclick = () => guard('Simpan frame', async () => {
  renderComp(ctx, doc(), t);
  const blob = await new Promise((r) => stage.toBlob(r, 'image/png'));
  const name = `${doc().id}-frame-${t.toFixed(2).replace('.', '_')}.png`;
  const res = await fetch(`/api/save-image?name=${name}`, { method: 'POST', body: blob });
  const out = await res.json();
  status(`Frame tersimpan: ${out.file}`);
});

// ---------- panel ----------
const inspector = createInspector($('inspector'), { store, getTime: () => t, seek, upload, actions });
const timeline = createTimeline($('timeline'), { store, getTime: () => t, seek, audio, actions });

store.on((kind) => {
  dirty = true;
  if (kind === 'load') fitStage();
  timeline.render();
  if (kind !== 'preview') inspector.render();
  if (kind === 'change') {
    fitStage();
    save();
    document.title = `${doc().name} · Labs Studio`;
    $('proj-name').textContent = doc().name;
  }
  $('undo').disabled = !store.canUndo;
  $('redo').disabled = !store.canRedo;
});
// proyek diubah dari luar editor (MCP/Claude) → muat versi terbaru lewat mutate, jadi bisa di-undo
import.meta.hot?.on('labs:doc-changed', async ({ col, id }) => {
  if (col !== 'motion' || !doc() || id !== doc().id || busy) return;
  const fresh = await (await fetch(`/api/docs/motion/${encodeURIComponent(id)}`)).json();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (same(fresh.layers, doc().layers) && same(fresh.comp, doc().comp) && fresh.name === doc().name) return;
  clearTimeout(saveTimer); // perubahan dari luar menang atas simpanan lokal yang belum terkirim
  store.mutate((d) => {
    for (const k of Object.keys(d)) delete d[k];
    Object.assign(d, fresh);
  });
  t = clamp(t, 0, doc().comp.duration);
  status('Proyek diperbarui dari luar editor · Ctrl+Z untuk membatalkan');
});

$('undo').onclick = () => store.undo();
$('redo').onclick = () => store.redo();
setAssetListener(() => { dirty = true; });
new ResizeObserver(fitStage).observe($('frame'));

function loop() {
  if (!busy) {
    if (playing) {
      const at = audio.now();
      t = at ?? t + 1 / 60;
      if (t >= doc().comp.duration) {
        t = doc().comp.duration;
        setPlaying(false);
      }
      dirty = true;
    }
    if (dirty) {
      draw();
      dirty = false;
      $('seek').max = doc().comp.duration;
      $('seek').value = t;
      $('time').textContent = `${fmt(t)} / ${fmt(doc().comp.duration)}`;
      $('play').textContent = playing ? 'Jeda' : 'Putar';
      timeline.setTime(t, playing);
    }
  }
  requestAnimationFrame(loop);
}

// ---------- mulai ----------
(async () => {
  const id = params.get('p');
  const res = id && (await fetch(`/api/docs/motion/${encodeURIComponent(id)}`));
  if (!res || !res.ok) {
    document.body.innerHTML = '<p style="padding:40px">Proyek tidak ditemukan. <a href="/">Kembali ke beranda</a></p>';
    return;
  }
  const d = await res.json();
  await Promise.all(['400 40px "Geist"', '500 40px "Geist"', '600 40px "Geist"', 'italic 400 40px "Instrument Serif"', '400 40px "Instrument Serif"', '800 40px "Baloo 2"', '600 40px "Plus Jakarta Sans"', '400 40px "Bebas Neue"', '700 40px "Poppins"', '700 40px "Playfair Display"', '600 40px "Caveat"'].map((f) => document.fonts.load(f).catch(() => {})));
  renderPalette();
  store.load(d);
  document.title = `${d.name} · Labs Studio`;
  $('proj-name').textContent = d.name;
  $('save-status').textContent = 'Tersimpan';
  timeline.fit();
  audio.setTimeline(audioTimeline());
  requestAnimationFrame(loop);
  // proyek baru belum punya poster
  setTimeout(posterNow, 1500);
})();

window.motion = { store, seek, get t() { return t; } };

document.getElementById('lang-slot')?.replaceWith(langToggle());
