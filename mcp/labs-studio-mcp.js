#!/usr/bin/env node
// MCP server Labs Studio (stdio, tanpa dependensi): Claude bisa membuka proyek, mengedit layer & keyframe,
// me-render frame untuk DILIHAT, mengekspor MP4/audio, dan membuat voice over.
//
// Cara kerja: semua perintah diteruskan ke server lokal Labs Studio (npm run dev, default http://localhost:5173).
// Edit dokumen dilakukan di sini lalu disimpan lewat /api/docs; hal yang butuh browser (render, ekspor,
// template, info jenis layer) diteruskan lewat /api/bridge ke tab studio yang sedang terbuka.
//
// Protokol: mendukung MCP modern (2026-07-28: server/discover + _meta per request) dan lama (initialize).
import http from 'node:http';
import https from 'node:https';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.LABS_STUDIO_URL || 'http://localhost:5173').replace(/\/$/, '');
const SERVER_INFO = { name: 'labs-studio', version: '0.1.0' };
const MODERN = ['2026-07-28'];
const LEGACY = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const log = (...a) => process.stderr.write(`[labs-studio-mcp] ${a.join(' ')}\n`);

const INSTRUCTIONS = `Labs Studio is a local motion-graphics studio (After Effects-like) running at ${BASE}.
Workflow: list_projects / create_project → get_project → add_layer / update_layer / set_keyframes → render_frames to LOOK at the result (always check visually after edits) → export_video.
Times are in seconds. Layer order: index 0 is the front-most layer. Keyframe times are relative to the layer's start (content time).
Use list_layer_types to see each layer type's properties before adding layers.
Rendering, exporting and templates need a Labs Studio tab open in a browser; if a tool says none is open, call start_studio or ask the user to open ${BASE}.
generate_voice spends the user's paid ElevenLabs character quota: confirm the text and character count with the user first.`;

// ---------- HTTP ke server studio (tanpa batas waktu: ekspor bisa lama) ----------
function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + url);
    const data = body === undefined ? null : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const req = (u.protocol === 'https:' ? https : http).request(u, {
      method,
      headers: { ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}), ...headers }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let json;
        try { json = JSON.parse(text); } catch { json = { raw: text }; }
        if (res.statusCode >= 400) reject(new Error(json.error || `HTTP ${res.statusCode}`));
        else resolve(json);
      });
    });
    req.on('error', (err) => reject(err.code === 'ECONNREFUSED'
      ? new Error(`Labs Studio server is not running at ${BASE}. Call start_studio, or run "npm run dev" in the Labs Studio folder.`)
      : err));
    if (data) req.write(data);
    req.end();
  });
}
const api = {
  get: (url) => request('GET', url),
  post: (url, body, headers) => request('POST', url, body, headers),
  bridge: async (op, args = {}, timeout = 120) => (await request('POST', '/api/bridge', { op, args, timeout })).result
};

// ---------- dokumen motion ----------
async function loadDoc(project) {
  if (!project) throw new Error('project is required (project id from list_projects)');
  return api.get(`/api/docs/motion/${encodeURIComponent(project)}`);
}
async function saveDoc(doc) {
  doc.updated = new Date().toISOString();
  // header ini membuat editor yang sedang membuka proyek memuat ulang (bisa di-undo di sana)
  await api.post(`/api/docs/motion/${encodeURIComponent(doc.id)}`, doc, { 'x-labs-source': 'mcp' });
  return doc;
}
function findLayer(doc, ref) {
  if (ref === undefined || ref === null || ref === '') throw new Error('layer is required (layer id or exact name)');
  const byId = doc.layers.find((l) => l.id === ref);
  if (byId) return byId;
  const byName = doc.layers.filter((l) => l.name.toLowerCase() === String(ref).toLowerCase());
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) throw new Error(`Several layers are named "${ref}": ${byName.map((l) => l.id).join(', ')}. Use the id.`);
  throw new Error(`Layer "${ref}" not found. Use get_project to see layer ids.`);
}
let uid = 0;
const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;
const round = (x) => Math.round(x * 1000) / 1000;
const normKeys = (list) => (list || []).map((k) => ({ t: round(Number(k.t) || 0), v: k.v, ease: k.ease || 'easeInOut' })).sort((a, b) => a.t - b.t);
const describeAnim = (a) => (a ? `in ${a.in?.preset || 'none'} ${round(a.in?.dur ?? 0)}s, out ${a.out?.preset || 'none'} ${round(a.out?.dur ?? 0)}s` : 'none');

function summarizeLayer(l, i, detail) {
  const props = {};
  for (const [k, v] of Object.entries(l.props || {})) props[k] = typeof v === 'string' && v.length > 160 && !detail ? `${v.slice(0, 160)}…` : v;
  const out = { index: i, id: l.id, type: l.type, name: l.name, start: round(l.start), dur: round(l.dur), end: round(l.start + l.dur) };
  if (l.offset) out.offset = round(l.offset);
  if (l.hidden) out.hidden = true;
  if (l.locked) out.locked = true;
  out.props = props;
  const keys = Object.entries(l.keys || {}).filter(([, v]) => v?.length);
  if (keys.length) out.keys = detail ? Object.fromEntries(keys) : Object.fromEntries(keys.map(([k, v]) => [k, `${v.length} keys, t ${round(v[0].t)}–${round(v[v.length - 1].t)}`]));
  out.anim = describeAnim(l.anim);
  return out;
}

// ---------- membuka studio ----------
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
}
async function isUp() {
  try { return await api.get('/api/info'); } catch { return null; }
}

// ---------- alat ----------
const S = {
  project: { type: 'string', description: 'Motion project id (from list_projects / create_project)' },
  layer: { type: 'string', description: 'Layer id or exact layer name' },
  props: { type: 'object', description: 'Property values, e.g. {"text":"Hello","size":96,"x":960,"y":540}. Common props on every layer: x, y, scale (%), rotation (deg), opacity (%), blur, shadow, shadowColor, blend, cropTop/cropBottom/cropLeft/cropRight (%).', additionalProperties: true },
  anim: { type: 'object', description: 'Entry/exit animation, e.g. {"in":{"preset":"flowIn","dur":0.45},"out":{"preset":"flowOut","dur":0.3}}. Presets: see list_layer_types.', additionalProperties: true },
  keyframes: { type: 'array', description: 'Keyframes [{t, v, ease}] — t in seconds relative to the layer start; ease one of easeInOut, easeOut, easeIn, linear, back, bounce, hold.', items: { type: 'object', properties: { t: { type: 'number' }, v: {}, ease: { type: 'string' } }, required: ['t', 'v'] } }
};

const TOOLS = [
  {
    name: 'studio_status',
    description: 'Check whether the Labs Studio server is running, whether a studio browser tab is open (needed for rendering/export) and whether ffmpeg is installed.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
    async run() {
      const info = await isUp();
      if (!info) return text(`Server: not running at ${BASE}. Call start_studio.`);
      return text(`Server: running at ${BASE}\nStudio tabs open: ${info.studioTabs ?? 'unknown'}${info.studioTabs === 0 ? ' (open the studio in a browser to render/export)' : ''}\nffmpeg: ${info.ffmpeg === false ? 'NOT installed (MP4 export and video import unavailable)' : 'ok'}\nFolder: ${info.folder}`);
    }
  },
  {
    name: 'start_studio',
    description: 'Start the Labs Studio server (npm run dev) if it is not running, and open the studio in the default browser (an open tab is required for rendering and export).',
    inputSchema: { type: 'object', properties: { open_browser: { type: 'boolean', default: true } } },
    async run({ open_browser = true }) {
      let info = await isUp();
      let started = false;
      if (!info) {
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        spawn(npm, ['run', 'dev'], { cwd: ROOT, detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
        started = true;
        for (let i = 0; i < 30 && !info; i++) {
          await new Promise((r) => setTimeout(r, 500));
          info = await isUp();
        }
        if (!info) throw new Error(`Started "npm run dev" in ${ROOT} but the server did not answer at ${BASE} within 15 s.`);
      }
      if (open_browser && !info.studioTabs) {
        openBrowser(BASE);
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 500));
          info = await isUp();
          if (info?.studioTabs) break;
        }
      }
      return text(`${started ? 'Started' : 'Already running'}: ${BASE}. Studio tabs open: ${info?.studioTabs ?? 0}.`);
    }
  },
  {
    name: 'list_projects',
    description: 'List all projects (motion compositions and chibi episodes), newest first.',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
    async run() {
      const list = await api.get('/api/projects');
      if (!list.length) return text('No projects yet. Use create_project.');
      return text(list.map((p) => `- ${p.id} [${p.kind}] "${p.name}" · ${p.size || ''} · ${p.duration ? `${Math.round(p.duration * 10) / 10}s · ` : ''}${p.info} · updated ${p.updated}`).join('\n'));
    }
  },
  {
    name: 'list_templates',
    description: 'List project templates available for create_project (needs an open studio tab).',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
    async run() {
      const list = await api.bridge('templates');
      return text(list.map((t) => `- ${t.id} [${t.kind}] ${t.name}: ${t.description}`).join('\n'));
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project from a template (default "kosong" = blank motion composition). Returns the new project id. Needs an open studio tab.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        template: { type: 'string', description: 'Template id from list_templates', default: 'kosong' },
        size: { type: 'string', enum: ['landscape', 'portrait', 'square', 'feed'], default: 'landscape', description: 'landscape 1920×1080, portrait 1080×1920, square 1080×1080, feed 1080×1350' },
        script: { type: 'string', description: 'Script text (only for the chibi episode template)' }
      },
      required: ['name']
    },
    async run(a) {
      const r = await api.bridge('createProject', { template: a.template || 'kosong', name: a.name, size: a.size || 'landscape', script: a.script || '' });
      return text(`Created ${r.kind} project "${r.name}" with id ${r.id}. Open it at ${BASE}${r.url}`);
    }
  },
  {
    name: 'get_project',
    description: 'Read a motion project: composition settings and every layer (index, id, type, name, timing, props, keyframes, animation). Index 0 is the front-most layer.',
    inputSchema: {
      type: 'object',
      properties: {
        project: S.project,
        detail: { type: 'boolean', description: 'Include full keyframe lists and untruncated text', default: false },
        include_audio: { type: 'boolean', description: 'Include audio and sfx layers', default: true }
      },
      required: ['project']
    },
    readOnly: true,
    async run({ project, detail = false, include_audio = true }) {
      const doc = await loadDoc(project);
      const layers = doc.layers.map((l, i) => summarizeLayer(l, i, detail)).filter((l) => include_audio || !['audio', 'sfx'].includes(l.type));
      return text(JSON.stringify({ id: doc.id, name: doc.name, comp: doc.comp, layerCount: doc.layers.length, layers }, null, 1));
    }
  },
  {
    name: 'list_layer_types',
    description: 'List layer types with their properties (key, kind, options, animatable), plus common properties, animation presets and easings. Pass "type" for one layer type in full. Needs an open studio tab.',
    inputSchema: { type: 'object', properties: { type: { type: 'string', description: 'Only this layer type' } } },
    readOnly: true,
    async run({ type }) {
      const info = await api.bridge('layerTypes');
      if (type) {
        const d = info.types.find((x) => x.type === type);
        if (!d) throw new Error(`Unknown layer type "${type}". Known: ${info.types.map((x) => x.type).join(', ')}`);
        return text(JSON.stringify(d, null, 1));
      }
      const lines = info.types.map((d) => `- ${d.type} (${d.name}, ${d.category}${d.fullFrame ? ', full-frame' : ''}): ${d.schema.map((f) => f.key + (f.animatable ? '*' : '')).join(', ') || '(no props)'}`);
      return text(`Layer types (* = animatable with keyframes):\n${lines.join('\n')}\n\nCommon props on every layer: ${info.common.map((f) => f.key).join(', ')}\nAnimation presets: ${Object.entries(info.presets).map(([k, v]) => `${k} (${v})`).join(', ')}\nEasings: ${info.easings.join(', ')}`);
    }
  },
  {
    name: 'add_layer',
    description: 'Add a layer to a motion project. Unset props use the layer type defaults; x/y default to the canvas centre. Text supports *accent*, [pill] and {logo} markup.',
    inputSchema: {
      type: 'object',
      properties: {
        project: S.project,
        type: { type: 'string', description: 'Layer type (see list_layer_types), e.g. text, shape, image, video, audio, sfx, liquid, landscape' },
        name: { type: 'string' },
        start: { type: 'number', description: 'Start time in seconds', default: 0 },
        dur: { type: 'number', description: 'Duration in seconds (default: until the end of the composition)' },
        props: S.props,
        keys: { type: 'object', description: 'Keyframes per property: {"x":[{"t":0,"v":200},{"t":1,"v":960,"ease":"easeOut"}]}', additionalProperties: true },
        anim: S.anim,
        index: { type: 'integer', description: 'Stack position: 0 = front-most (default), -1 = back-most' }
      },
      required: ['project', 'type']
    },
    async run(a) {
      const doc = await loadDoc(a.project);
      const c = doc.comp;
      const start = Math.max(0, Number(a.start) || 0);
      const dur = a.dur > 0 ? a.dur : Math.max(0.1, c.duration - start);
      const keys = Object.fromEntries(Object.entries(a.keys || {}).map(([k, v]) => [k, normKeys(v)]));
      const layer = {
        id: newId('l'), type: a.type, name: a.name || a.type, start, dur, offset: 0, hidden: false, locked: false,
        props: { x: c.width / 2, y: c.height / 2, ...(a.props || {}) },
        keys,
        anim: a.anim || { in: { preset: a.type === 'text' ? 'fadeUp' : 'none', dur: 0.6 }, out: { preset: 'none', dur: 0.4 } }
      };
      const idx = a.index === undefined ? 0 : a.index < 0 ? doc.layers.length : Math.min(a.index, doc.layers.length);
      doc.layers.splice(idx, 0, layer);
      await saveDoc(doc);
      return text(`Added ${a.type} layer "${layer.name}" (id ${layer.id}) at index ${idx}, ${round(start)}–${round(start + dur)}s.`);
    }
  },
  {
    name: 'update_layer',
    description: 'Change a layer: merge props, rename, retime (start/dur/offset), hide/lock, or replace its entry/exit animation. To animate a property over time use set_keyframes instead.',
    inputSchema: {
      type: 'object',
      properties: {
        project: S.project,
        layer: S.layer,
        name: { type: 'string' },
        start: { type: 'number' },
        dur: { type: 'number' },
        offset: { type: 'number', description: 'Content offset in seconds (trims the beginning without moving the content)' },
        hidden: { type: 'boolean' },
        locked: { type: 'boolean' },
        props: S.props,
        unset_props: { type: 'array', items: { type: 'string' }, description: 'Props to remove (fall back to defaults)' },
        anim: S.anim
      },
      required: ['project', 'layer']
    },
    async run(a) {
      const doc = await loadDoc(a.project);
      const l = findLayer(doc, a.layer);
      if (a.name !== undefined) l.name = a.name;
      if (a.start !== undefined) l.start = Math.max(0, a.start);
      if (a.dur !== undefined) l.dur = Math.max(0.05, a.dur);
      if (a.offset !== undefined) l.offset = Math.max(0, a.offset);
      if (a.hidden !== undefined) l.hidden = a.hidden;
      if (a.locked !== undefined) l.locked = a.locked;
      if (a.props) Object.assign(l.props, a.props);
      for (const k of a.unset_props || []) delete l.props[k];
      if (a.anim) l.anim = { in: { preset: 'none', dur: 0.4 }, out: { preset: 'none', dur: 0.4 }, ...l.anim, ...a.anim };
      const animated = Object.keys(a.props || {}).filter((k) => l.keys?.[k]?.length);
      await saveDoc(doc);
      return text(`Updated "${l.name}" (${l.id}).${animated.length ? ` Note: ${animated.join(', ')} ha${animated.length > 1 ? 've' : 's'} keyframes, which override the static value — use set_keyframes.` : ''}`);
    }
  },
  {
    name: 'set_keyframes',
    description: 'Replace the keyframes of one property of a layer (an empty list removes the animation). Times are relative to the layer start.',
    inputSchema: { type: 'object', properties: { project: S.project, layer: S.layer, prop: { type: 'string', description: 'Property key, e.g. x, opacity, scale, size, progress' }, keyframes: S.keyframes }, required: ['project', 'layer', 'prop', 'keyframes'] },
    async run(a) {
      const doc = await loadDoc(a.project);
      const l = findLayer(doc, a.layer);
      l.keys ||= {};
      if (!a.keyframes.length) delete l.keys[a.prop];
      else l.keys[a.prop] = normKeys(a.keyframes);
      await saveDoc(doc);
      return text(a.keyframes.length ? `Set ${a.keyframes.length} keyframes on ${l.name}.${a.prop}.` : `Removed animation of ${l.name}.${a.prop}.`);
    }
  },
  {
    name: 'remove_layer',
    description: 'Remove a layer from a project (the user can undo it in the open editor).',
    inputSchema: { type: 'object', properties: { project: S.project, layer: S.layer }, required: ['project', 'layer'] },
    async run(a) {
      const doc = await loadDoc(a.project);
      const l = findLayer(doc, a.layer);
      doc.layers = doc.layers.filter((x) => x !== l);
      await saveDoc(doc);
      return text(`Removed "${l.name}" (${l.id}).`);
    }
  },
  {
    name: 'move_layer',
    description: 'Move a layer in the stack. index 0 = front-most, -1 = back-most.',
    inputSchema: { type: 'object', properties: { project: S.project, layer: S.layer, index: { type: 'integer' } }, required: ['project', 'layer', 'index'] },
    async run(a) {
      const doc = await loadDoc(a.project);
      const l = findLayer(doc, a.layer);
      doc.layers = doc.layers.filter((x) => x !== l);
      const idx = a.index < 0 ? doc.layers.length : Math.min(a.index, doc.layers.length);
      doc.layers.splice(idx, 0, l);
      await saveDoc(doc);
      return text(`Moved "${l.name}" to index ${idx}.`);
    }
  },
  {
    name: 'update_composition',
    description: 'Change project name or composition settings (duration in seconds, fps, background colour, width/height).',
    inputSchema: { type: 'object', properties: { project: S.project, name: { type: 'string' }, duration: { type: 'number' }, fps: { type: 'integer' }, background: { type: 'string' }, width: { type: 'integer' }, height: { type: 'integer' } }, required: ['project'] },
    async run(a) {
      const doc = await loadDoc(a.project);
      if (a.name) doc.name = a.name;
      for (const k of ['duration', 'fps', 'background', 'width', 'height']) if (a[k] !== undefined) doc.comp[k] = a[k];
      await saveDoc(doc);
      return text(`Composition: ${doc.comp.width}×${doc.comp.height}, ${doc.comp.fps} fps, ${doc.comp.duration}s, background ${doc.comp.background}.`);
    }
  },
  {
    name: 'render_frames',
    description: 'Render frames of a motion project and return them as an image so you can SEE the result. One time = a single frame; several times = a labelled contact sheet. Use after edits to check layout, text overlap and timing. Needs an open studio tab.',
    inputSchema: {
      type: 'object',
      properties: {
        project: S.project,
        times: { type: 'array', items: { type: 'number' }, description: 'Times in seconds (max 16)', minItems: 1, maxItems: 16 },
        width: { type: 'integer', description: 'Output image width in px (default 1280 for one frame, 1600 for a sheet)' }
      },
      required: ['project', 'times']
    },
    readOnly: true,
    async run(a) {
      const r = await api.bridge('render', { id: a.project, times: a.times.slice(0, 16), width: a.width }, 180);
      return {
        content: [
          { type: 'image', data: r.data, mimeType: r.mimeType },
          { type: 'text', text: `${a.times.length} frame(s) of "${a.project}" (duration ${r.duration}s), image ${r.width}×${r.height}.` }
        ]
      };
    }
  },
  {
    name: 'export_video',
    description: 'Export the motion project to MP4 (output/<id>.mp4) with all audio. Can take several minutes. Needs an open studio tab and ffmpeg.',
    inputSchema: { type: 'object', properties: { project: S.project }, required: ['project'] },
    async run(a) {
      const r = await api.bridge('exportVideo', { id: a.project }, 3600);
      return text(`Exported ${r.duration}s video: ${r.file}`);
    }
  },
  {
    name: 'export_audio',
    description: 'Export only the mixed audio (voice, audio layers, SFX) as MP3 + WAV in output/. Needs an open studio tab.',
    inputSchema: { type: 'object', properties: { project: S.project }, required: ['project'] },
    async run(a) {
      const r = await api.bridge('exportAudio', { id: a.project }, 600);
      return text(`Exported audio: ${r.files.join(', ')}`);
    }
  },
  {
    name: 'list_voices',
    description: 'List ElevenLabs voices available to the user (needs the API key saved in Labs Studio).',
    inputSchema: { type: 'object', properties: {} },
    readOnly: true,
    async run() {
      const [voices, quota] = await Promise.all([api.get('/api/eleven/voices'), api.get('/api/eleven/quota').catch(() => null)]);
      const q = quota ? `Character quota left: ${quota.limit - quota.used} of ${quota.limit}\n` : '';
      return text(q + voices.map((v) => `- ${v.id} · ${v.name}${v.category ? ` (${v.category})` : ''}`).join('\n'));
    }
  },
  {
    name: 'generate_voice',
    description: 'Generate a voice-over clip with ElevenLabs (spends the user\'s PAID character quota — confirm the text and character count with the user first). Saves an mp3 in media/uploads and, if "project" is given, adds it as an audio layer at "start".',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        voice_id: { type: 'string', description: 'Voice id from list_voices' },
        model: { type: 'string', default: 'eleven_multilingual_v2' },
        stability: { type: 'number', minimum: 0, maximum: 1 },
        speed: { type: 'number', minimum: 0.7, maximum: 1.2 },
        project: S.project,
        start: { type: 'number', description: 'Start time of the audio layer in seconds', default: 0 },
        name: { type: 'string', description: 'Audio layer name' }
      },
      required: ['text', 'voice_id']
    },
    async run(a) {
      const r = await api.post('/api/eleven/tts', { text: a.text, voiceId: a.voice_id, modelId: a.model, stability: a.stability, speed: a.speed });
      let msg = `Voice saved: ${r.url} (${r.chars} characters${r.duration ? `, ${round(r.duration)}s` : ''}).`;
      if (a.project) {
        const doc = await loadDoc(a.project);
        const start = Math.max(0, Number(a.start) || 0);
        const layer = {
          id: newId('l'), type: 'audio', name: a.name || r.name, start, dur: r.duration || 3, offset: 0, hidden: false, locked: false,
          props: { x: doc.comp.width / 2, y: doc.comp.height / 2, url: r.url, volume: 100 }, keys: {},
          anim: { in: { preset: 'none', dur: 0.3 }, out: { preset: 'none', dur: 0.3 } }
        };
        const firstAudio = doc.layers.findIndex((l) => l.type === 'audio' || l.type === 'sfx');
        doc.layers.splice(firstAudio < 0 ? doc.layers.length : firstAudio, 0, layer);
        await saveDoc(doc);
        msg += ` Added audio layer ${layer.id} at ${round(start)}s.`;
      }
      return text(msg);
    }
  }
];

function text(t) {
  return { content: [{ type: 'text', text: t }] };
}

// ---------- protokol MCP (JSON-RPC lewat stdio, satu pesan per baris) ----------
const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message, data) => send({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });

const toolList = () => TOOLS.map(({ name, description, inputSchema, readOnly }) => ({
  name, description, inputSchema, annotations: { readOnlyHint: !!readOnly, openWorldHint: name === 'generate_voice' || name === 'list_voices' }
}));

async function callTool(params) {
  const tool = TOOLS.find((t) => t.name === params?.name);
  if (!tool) return { content: [{ type: 'text', text: `Unknown tool "${params?.name}"` }], isError: true };
  try {
    return await tool.run(params.arguments || {});
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

async function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  if (!method) return; // respons dari klien (tidak dipakai server ini)
  if (!isRequest) return; // notifikasi: initialized, cancelled, dll.
  const meta = params?._meta || {};
  const version = meta['io.modelcontextprotocol/protocolVersion'];
  const modern = version !== undefined || method === 'server/discover';

  // era modern: setiap request membawa versi & kapabilitas di _meta
  if (modern) {
    if (version !== undefined && !MODERN.includes(version)) {
      return fail(id, -32022, 'Unsupported protocol version', { supported: [...MODERN, ...LEGACY], requested: version });
    }
    if (version === undefined || meta['io.modelcontextprotocol/clientCapabilities'] === undefined) {
      return fail(id, -32602, 'Missing required _meta fields (io.modelcontextprotocol/protocolVersion, io.modelcontextprotocol/clientCapabilities)');
    }
  }
  const done = (result) => reply(id, modern ? { resultType: 'complete', ...result, _meta: { 'io.modelcontextprotocol/serverInfo': SERVER_INFO } } : result);

  switch (method) {
    case 'server/discover':
      return done({ supportedVersions: MODERN, capabilities: { tools: {} }, instructions: INSTRUCTIONS });
    case 'initialize': {
      const asked = params?.protocolVersion;
      return reply(id, {
        protocolVersion: LEGACY.includes(asked) ? asked : LEGACY[0],
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS
      });
    }
    case 'ping':
      return done({});
    case 'tools/list':
      return done({ tools: toolList() });
    case 'tools/call':
      return done(await callTool(params));
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      fail(null, -32700, 'Parse error');
      continue;
    }
    handle(msg).catch((err) => {
      log('error', err.stack || err.message);
      if (msg.id !== undefined) fail(msg.id, -32603, err.message);
    });
  }
});
process.stdin.on('end', () => process.exit(0));
log(`ready (studio: ${BASE})`);
