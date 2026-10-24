// Jembatan tab studio ↔ server, dipakai MCP server (Claude) untuk hal yang butuh browser:
// render frame jadi gambar, ekspor MP4/audio, info jenis layer & template, membuat proyek dari template.
// Server menawarkan perintah ke semua tab (labs:bridge-offer); tab pertama yang mengklaim mengerjakannya.
import { renderComp, assets } from '../motion/engine.js';
import { LAYER_TYPES, COMMON_SCHEMA } from '../motion/registry.js';
import { PRESETS } from '../motion/presets.js';
import { EASINGS } from '../motion/keys.js';
import { TEMPLATES } from '../templates/index.js';
import { audioTimeline } from '../motion/audioTimeline.js';
import { exportVideo } from './exportVideo.js';
import { createAudio } from '../audio.js';

const getDoc = async (id) => {
  const res = await fetch(`/api/docs/motion/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Proyek motion "${id}" tidak ditemukan`);
  return res.json();
};

let audio = null;
const getAudio = () => (audio ||= createAudio());

// satu kanvas ukuran penuh untuk semua pekerjaan jembatan
let stage = null;
function stageFor(doc) {
  stage ||= document.createElement('canvas');
  if (stage.width !== doc.comp.width || stage.height !== doc.comp.height) {
    stage.width = doc.comp.width;
    stage.height = doc.comp.height;
  }
  return stage;
}

// supaya hanya satu render/ekspor berjalan di tab ini pada satu waktu
let queue = Promise.resolve();
const exclusive = (fn) => (queue = queue.then(fn, fn));

const ops = {
  ping: () => ({ page: location.pathname, title: document.title }),

  layerTypes: () => ({
    common: COMMON_SCHEMA.map(({ key, label, kind, options, animatable }) => ({ key, label, kind, options, animatable })),
    types: LAYER_TYPES.map((d) => ({
      type: d.type, name: d.name, category: d.category, fullFrame: !!d.fullFrame, defaults: d.defaults || {},
      schema: (d.schema || []).map(({ key, label, kind, options, min, max, step, animatable }) => ({ key, label, kind, options, min, max, step, animatable }))
    })),
    presets: Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.label + (v.textOnly ? ' (khusus teks)' : '')])),
    easings: Object.keys(EASINGS)
  }),

  templates: () => TEMPLATES.map(({ id, name, description, kind }) => ({ id, name, description, kind })),

  async createProject({ template = 'kosong', name, size = 'landscape', script = '', label = '' }) {
    const t = TEMPLATES.find((x) => x.id === template);
    if (!t) throw new Error(`Template "${template}" tidak ada. Pilihan: ${TEMPLATES.map((x) => x.id).join(', ')}`);
    const isChibi = t.kind === 'chibi';
    let id = `m${Date.now().toString(36)}`;
    if (isChibi) {
      const all = await (await fetch('/api/projects')).json();
      const n = all.filter((p) => p.kind === 'chibi').reduce((m, p) => Math.max(m, parseInt((p.id.match(/\d+/) || ['0'])[0], 10)), 0) + 1;
      id = `ep${String(n).padStart(2, '0')}`;
    }
    const doc = t.create({ id, name: name || t.name, size, script, label: label || id.toUpperCase() });
    const col = isChibi ? 'episodes' : 'motion';
    const res = await fetch(`/api/docs/${col}/${id}`, { method: 'POST', headers: { 'x-labs-source': 'mcp' }, body: JSON.stringify(doc) });
    if (!res.ok) throw new Error('Gagal menyimpan proyek baru');
    return { id, col, kind: t.kind, name: doc.name || doc.title, url: isChibi ? `/chibi.html?ep=${id}` : `/motion.html?p=${id}` };
  },

  // render satu frame atau lembar beberapa frame (dengan label waktu) → JPEG base64
  render: ({ id, times = [0], width }) => exclusive(async () => {
    const doc = await getDoc(id);
    const cv = stageFor(doc);
    const ctx = cv.getContext('2d');
    await assets.preload(doc);
    const list = times.map((t) => Math.max(0, Math.min(doc.comp.duration - 0.001, Number(t) || 0)));
    const n = list.length;
    const cols = n === 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const W = Math.round(width || (n === 1 ? 1280 : 1600));
    const tw = Math.floor(W / cols);
    const th = Math.round((tw * doc.comp.height) / doc.comp.width);
    const out = document.createElement('canvas');
    out.width = tw * cols;
    out.height = th * rows;
    const g = out.getContext('2d');
    g.imageSmoothingQuality = 'high';
    assets.exporting = true;
    try {
      for (let i = 0; i < n; i++) {
        await assets.seekAll(doc, list[i]);
        renderComp(ctx, doc, list[i]);
        const x = (i % cols) * tw;
        const y = Math.floor(i / cols) * th;
        g.drawImage(cv, x, y, tw, th);
        if (n > 1) {
          const label = `${list[i].toFixed(2)} s`;
          g.font = '600 15px Geist, sans-serif';
          const lw = g.measureText(label).width + 12;
          g.fillStyle = 'rgba(0,0,0,0.65)';
          g.fillRect(x, y, lw, 22);
          g.fillStyle = '#ffe14d';
          g.textBaseline = 'middle';
          g.fillText(label, x + 6, y + 11);
        }
      }
    } finally {
      assets.exporting = false;
    }
    const url = out.toDataURL('image/jpeg', 0.86);
    return { mimeType: 'image/jpeg', data: url.slice(url.indexOf(',') + 1), width: out.width, height: out.height, duration: doc.comp.duration };
  }),

  exportVideo: ({ id }) => exclusive(async () => {
    const doc = await getDoc(id);
    const cv = stageFor(doc);
    const ctx = cv.getContext('2d');
    const a = getAudio();
    await assets.preload(doc);
    a.setTimeline(audioTimeline(doc));
    await a.ensureLoaded();
    const wav = await a.renderOffline(doc.comp.duration);
    assets.exporting = true;
    try {
      const file = await exportVideo({
        canvas: cv, name: doc.id, fps: doc.comp.fps, total: doc.comp.duration, audioWav: wav, status: () => {},
        renderFrame: async (time) => {
          await assets.seekAll(doc, time);
          renderComp(ctx, doc, time);
        }
      });
      return { file, duration: doc.comp.duration };
    } finally {
      assets.exporting = false;
    }
  }),

  exportAudio: ({ id }) => exclusive(async () => {
    const doc = await getDoc(id);
    const a = getAudio();
    a.setTimeline(audioTimeline(doc));
    await a.ensureLoaded();
    const wav = await a.renderOffline(doc.comp.duration);
    const res = await fetch(`/api/export-audio?name=${doc.id}`, { method: 'POST', body: wav });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error);
    return { files: out.files };
  })
};

if (import.meta.hot) {
  const hot = import.meta.hot;
  const hello = () => hot.send('labs:bridge-hello', { page: location.pathname });
  hello();
  hot.on('vite:ws:connect', hello);
  hot.on('labs:bridge-offer', ({ id, op }) => {
    if (ops[op]) hot.send('labs:bridge-claim', { id });
  });
  hot.on('labs:bridge-req', async ({ id, op, args }) => {
    try {
      hot.send('labs:bridge-res', { id, ok: true, result: await ops[op](args || {}) });
    } catch (err) {
      console.error('[jembatan]', op, err);
      hot.send('labs:bridge-res', { id, ok: false, error: err.message });
    }
  });
}
