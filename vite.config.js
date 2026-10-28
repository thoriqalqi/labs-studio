import { defineConfig } from 'vite';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

// Server lokal Labs Studio:
//   /api/projects      semua proyek (untuk beranda)
//   /api/docs/<col>    daftar, buka, simpan, hapus dokumen proyek (episodes/, motion/)
//   /api/episodes      alias /api/docs/episodes untuk editor chibi
//   /api/poster        poster kartu beranda → posters/
//   /api/settings      simpan API key (settings.local.json), hanya status yang dikirim balik
//   /api/eleven/...    voices, quota, tts → ElevenLabs; hasil mp3 ke media/uploads
//   /api/upload        unggah audio/video → media/uploads (video: audionya saja)
//   /media/...         menyajikan file unggahan
//   /api/library       pustaka audio (media/library/sfx|music, subfolder = kategori) untuk menu Audio
//   /api/export/...    frame/H.264 + audio → output/<id>.mp4 via ffmpeg
//   /api/export-audio  WAV → output/<id>.mp3 + .wav
//   /api/save-image    thumbnail / branding → output/
//   /api/ae/...        ekspor After Effects → output/<id>-after-effects/ (skrip .jsx + media/)
//   /api/bridge        perintah ke tab studio yang terbuka (render frame, ekspor, template) — dipakai MCP server

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ffmpeg wajib untuk ekspor & impor video. Kalau belum terpasang, server tetap jalan dan memberi pesan jelas.
const FFMPEG_MISSING = 'ffmpeg tidak ditemukan. Pasang ffmpeg lalu pastikan ada di PATH (lihat README).';
const hasFfmpeg = (() => {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
})();
if (!hasFfmpeg) console.warn(`
[Labs Studio] ${FFMPEG_MISSING} Editor tetap bisa dipakai, tapi ekspor MP4 & impor video belum bisa.
`);

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    p.on('error', () => reject(new Error(FFMPEG_MISSING)));
    let err = '';
    p.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err))));
  });
}

// info stream sebuah file media (ffprobe, keluaran JSON)
function probe(file) {
  return new Promise((resolve) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { stdio: ['ignore', 'pipe', 'ignore'] });
    p.on('error', () => resolve({}));
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => {
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve({});
      }
    });
  });
}

// nama file aman; ekstensi tetap dipertahankan walau nama dipendekkan
const safeName = (s) => {
  const clean = String(s || '').replace(/[^\w.-]+/g, '_');
  const ext = (clean.match(/\.[a-z0-9]{1,5}$/i) || [''])[0];
  return clean.slice(0, clean.length - ext.length).slice(0, 70) + ext;
};
const safeId = (s) => String(s || '').replace(/[^\w-]/g, '').slice(0, 40);
const query = (req, key) => new URL(req.url, 'http://x').searchParams.get(key);

// pengaturan pribadi (API key) — file ini tidak ikut dibagikan (.gitignore)
const SETTINGS_FILE = path.resolve('settings.local.json');
const readSettings = () => {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
};

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

// Koleksi dokumen proyek: tiap jenis proyek punya folder sendiri.
//   episodes/  → episode karakter chibi 3D (editor chibi.html)
//   motion/    → komposisi motion graphics (editor motion.html)
const COLLECTIONS = { episodes: 'episodes', motion: 'motion' };

function summarize(col, d) {
  if (col === 'episodes') {
    const dur = (d.timeline?.video || []).reduce((a, v) => a + (v.out - v.in) / v.speed, 0);
    return { col, kind: 'chibi', id: d.id, name: d.title, label: d.episodeLabel, updated: d.updated, duration: dur, size: '1920×1080', info: `${d.scenes?.length || 0} adegan` };
  }
  return { col, kind: 'motion', id: d.id, name: d.name, updated: d.updated, duration: d.comp?.duration || 0, size: `${d.comp?.width}×${d.comp?.height}`, info: `${d.layers?.length || 0} layer` };
}

function docHandler(colFixed) {
  return async (req, res) => {
    try {
      const parts = req.url.split('?')[0].split('/').filter(Boolean);
      const col = colFixed || parts.shift();
      if (!COLLECTIONS[col]) return json(res, 404, { error: 'Koleksi tidak dikenal' });
      const dir = path.resolve(COLLECTIONS[col]);
      fs.mkdirSync(dir, { recursive: true });
      const id = safeId(parts[0]);
      if (!id) {
        const list = fs.readdirSync(dir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f))))
          .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        // editor chibi lama memakai bentuk ringkas ini
        if (colFixed === 'episodes') {
          return json(res, 200, list.map((d) => ({ id: d.id, title: d.title, episodeLabel: d.episodeLabel, updated: d.updated })));
        }
        return json(res, 200, list.map((d) => summarize(col, d)));
      }
      const file = path.join(dir, `${id}.json`);
      if (req.method === 'POST' && query(req, 'delete')) {
        if (fs.existsSync(file)) {
          const trash = path.join(dir, '.trash');
          fs.mkdirSync(trash, { recursive: true });
          fs.renameSync(file, path.join(trash, `${id}-${Date.now()}.json`));
          fs.rmSync(path.resolve('posters', `${col}-${id}.jpg`), { force: true });
        }
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST') {
        const doc = JSON.parse((await readBody(req)).toString());
        doc.id = id;
        doc.updated = new Date().toISOString();
        fs.writeFileSync(file, JSON.stringify(doc, null, 1));
        // diubah dari luar editor (mis. MCP) → editor yang membuka proyek ini memuat ulang
        if (req.headers['x-labs-source']) broadcast('labs:doc-changed', { col, id, source: String(req.headers['x-labs-source']) });
        return json(res, 200, { ok: true, updated: doc.updated });
      }
      if (!fs.existsSync(file)) return json(res, 404, { error: 'Proyek tidak ditemukan' });
      res.setHeader('Content-Type', 'application/json');
      res.end(fs.readFileSync(file));
    } catch (err) {
      json(res, 500, { error: err.message });
    }
  };
}

// diisi saat server jalan: kirim event ke semua tab studio (lewat WebSocket Vite)
let broadcast = () => {};

function studioPlugin() {
  let job = null;

  return {
    name: 'labs-studio',
    configureServer(server) {
      // ---------- proyek ----------
      server.middlewares.use('/api/episodes', docHandler('episodes'));
      server.middlewares.use('/api/docs', docHandler(null));

      // semua proyek untuk beranda, terbaru di atas
      server.middlewares.use('/api/projects', (req, res) => {
        const all = [];
        for (const [col, dirName] of Object.entries(COLLECTIONS)) {
          const dir = path.resolve(dirName);
          if (!fs.existsSync(dir)) continue;
          for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
            try {
              const s = summarize(col, JSON.parse(fs.readFileSync(path.join(dir, f))));
              const poster = path.resolve('posters', `${col}-${s.id}.jpg`);
              s.poster = fs.existsSync(poster) ? `/posters/${col}-${s.id}.jpg?v=${fs.statSync(poster).mtimeMs | 0}` : null;
              all.push(s);
            } catch {}
          }
        }
        all.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
        json(res, 200, all);
      });

      server.middlewares.use('/api/info', (req, res) => json(res, 200, { folder: process.cwd(), ffmpeg: hasFfmpeg, studioTabs: bridgeClients.size }));

      // ---------- jembatan ke tab studio ----------
      // Render & ekspor butuh browser (canvas, WebCodecs, Three.js). Server menawarkan perintah ke semua tab
      // (labs:bridge-offer); tab pertama yang mengklaim mengerjakannya lalu mengirim hasil (labs:bridge-res).
      broadcast = (event, payload) => server.ws.send(event, payload);
      const bridgeClients = new Set();
      const pending = new Map();
      let seq = 0;
      server.ws.on('labs:bridge-hello', (_data, client) => bridgeClients.add(client));
      server.ws.on('connection', (socket) => socket.on('close', () => {
        for (const c of bridgeClients) if (c.socket === socket) bridgeClients.delete(c);
      }));
      server.ws.on('labs:bridge-claim', ({ id }, client) => {
        const p = pending.get(id);
        if (!p || p.claimed) return;
        p.claimed = true;
        clearTimeout(p.claimTimer);
        client.send('labs:bridge-req', { id, op: p.op, args: p.args });
      });
      server.ws.on('labs:bridge-res', ({ id, ok, result, error }) => {
        const p = pending.get(id);
        if (!p) return;
        pending.delete(id);
        clearTimeout(p.timer);
        if (ok) p.resolve(result);
        else p.reject(new Error(error || 'Perintah gagal di tab studio'));
      });
      server.middlewares.use('/api/bridge', async (req, res) => {
        try {
          const { op, args = {}, timeout = 120 } = JSON.parse((await readBody(req)).toString() || '{}');
          if (!op) return json(res, 400, { error: 'op kosong' });
          const id = `b${++seq}`;
          const result = await new Promise((resolve, reject) => {
            const p = { op, args, resolve, reject, claimed: false };
            p.claimTimer = setTimeout(() => {
              pending.delete(id);
              reject(Object.assign(new Error('Tidak ada tab Labs Studio yang terbuka. Buka http://localhost:5173 di browser, lalu coba lagi.'), { code: 'no_studio' }));
            }, 5000);
            p.timer = setTimeout(() => {
              pending.delete(id);
              reject(new Error(`Waktu habis (${timeout} dtk) menunggu tab studio`));
            }, timeout * 1000);
            pending.set(id, p);
            server.ws.send('labs:bridge-offer', { id, op });
          });
          json(res, 200, { ok: true, result });
        } catch (err) {
          json(res, err.code === 'no_studio' ? 503 : 500, { error: err.message, code: err.code });
        }
      });

      // ---------- pengaturan lokal (API key tidak pernah dikirim balik ke browser) ----------
      server.middlewares.use('/api/settings', async (req, res) => {
        try {
          if (req.method === 'POST') {
            const body = JSON.parse((await readBody(req)).toString() || '{}');
            const s = readSettings();
            if ('elevenKey' in body) s.elevenKey = String(body.elevenKey || '').trim();
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 1));
          }
          json(res, 200, { elevenKey: !!readSettings().elevenKey });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });

      // ---------- ElevenLabs (voice over) ----------
      server.middlewares.use('/api/eleven/', async (req, res) => {
        try {
          const key = readSettings().elevenKey;
          if (!key) return json(res, 400, { error: 'API key ElevenLabs belum diisi.', needKey: true });
          const route = req.url.split('?')[0].replace(/^\//, '');
          const headers = { 'xi-api-key': key };
          const fail = async (r) => {
            let msg = `ElevenLabs menolak permintaan (${r.status})`;
            let detail = null;
            try {
              const j = await r.json();
              detail = j.detail;
              msg = j.detail?.message || j.detail?.status || (typeof j.detail === 'string' ? j.detail : msg);
            } catch {}
            // key valid tapi izinnya dibatasi (mis. hanya text-to-speech): bukan alasan minta key baru
            if (detail?.status === 'missing_permissions') {
              const perm = (msg.match(/permission (\w+)/) || [])[1] || '';
              return json(res, 403, { error: `Key ini belum punya izin "${perm}" di ElevenLabs.`, missing: perm });
            }
            if (r.status === 401) msg = 'API key ditolak ElevenLabs (401). Cek lagi key-nya.';
            if (detail?.status === 'voice_not_found') msg = 'Voice ID tidak ditemukan di akun ElevenLabs-mu.';
            if (detail?.status === 'quota_exceeded') msg = 'Kuota karakter ElevenLabs habis.';
            return json(res, r.status === 401 ? 401 : 502, { error: msg, needKey: r.status === 401 });
          };

          if (route === 'voices') {
            const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers });
            if (!r.ok) return fail(r);
            const j = await r.json();
            return json(res, 200, (j.voices || []).map((v) => ({
              id: v.voice_id, name: v.name, category: v.category, preview: v.preview_url,
              desc: [v.labels?.gender, v.labels?.age, v.labels?.accent, v.labels?.description || v.labels?.descriptive].filter(Boolean).join(' · ')
            })));
          }

          if (route === 'quota') {
            const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers });
            if (!r.ok) return fail(r);
            const j = await r.json();
            return json(res, 200, { used: j.character_count, limit: j.character_limit, tier: j.tier, reset: j.next_character_count_reset_unix });
          }

          if (route === 'tts') {
            const b = JSON.parse((await readBody(req)).toString() || '{}');
            const text = String(b.text || '').trim();
            if (!text) return json(res, 400, { error: 'Teks kosong' });
            if (!b.voiceId) return json(res, 400, { error: 'Pilih suara dulu' });
            const model = b.modelId || 'eleven_multilingual_v2';
            const settings = {
              stability: b.stability ?? 0.5,
              similarity_boost: b.similarity ?? 0.75,
              style: b.style ?? 0,
              use_speaker_boost: b.boost ?? true
            };
            if (b.speed && b.speed !== 1) settings.speed = b.speed;
            const payload = { text, model_id: model, voice_settings: settings };
            // konteks kalimat sebelum/sesudah supaya intonasi antar-potongan nyambung (tidak didukung v3)
            if (model !== 'eleven_v3') {
              if (b.previousText) payload.previous_text = String(b.previousText).slice(0, 1000);
              if (b.nextText) payload.next_text = String(b.nextText).slice(0, 1000);
            }
            const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(b.voiceId)}?output_format=mp3_44100_128`, {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
              body: JSON.stringify(payload)
            });
            if (!r.ok) return fail(r);
            const dir = path.resolve('media/uploads');
            fs.mkdirSync(dir, { recursive: true });
            const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'vo';
            const file = `${Date.now().toString(36)}-vo-${slug}.mp3`;
            fs.writeFileSync(path.join(dir, file), Buffer.from(await r.arrayBuffer()));
            const info = await probe(path.join(dir, file));
            const duration = Number(info.format?.duration) || null;
            return json(res, 200, { url: `/media/uploads/${file}`, name: `VO · ${text.slice(0, 40)}`, chars: text.length, duration });
          }
          return json(res, 404, { error: 'Tidak dikenal' });
        } catch (err) {
          json(res, 500, { error: `Gagal menghubungi ElevenLabs: ${err.message}` });
        }
      });

      // poster kecil untuk kartu beranda
      server.middlewares.use('/api/poster', async (req, res) => {
        try {
          const col = query(req, 'col');
          const id = safeId(query(req, 'id'));
          if (!COLLECTIONS[col] || !id) return json(res, 400, { error: 'col/id salah' });
          fs.mkdirSync(path.resolve('posters'), { recursive: true });
          fs.writeFileSync(path.resolve('posters', `${col}-${id}.jpg`), await readBody(req));
          json(res, 200, { ok: true });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });
      server.middlewares.use('/posters/', (req, res, next) => {
        const file = path.resolve('posters', safeName(decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''))));
        if (!fs.existsSync(file)) return next();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });

      // ---------- media ----------
      server.middlewares.use('/api/upload', async (req, res) => {
        try {
          const name = safeName(query(req, 'name')) || 'audio';
          const dir = path.resolve('media/uploads');
          fs.mkdirSync(dir, { recursive: true });
          let file = `${Date.now().toString(36)}-${name}`;
          fs.writeFileSync(path.join(dir, file), await readBody(req));
          const isVideo = /\.(mp4|mov|mkv|webm|avi|m4v|3gp)$/i.test(name);
          // ?keep=1 (editor motion): video tetap disimpan sebagai gambar bergerak + audionya diambil terpisah
          if (isVideo && query(req, 'keep')) {
            const src = path.join(dir, file);
            const info = await probe(src);
            const v = info.streams?.find((s) => s.codec_type === 'video');
            if (!v) throw new Error('File ini tidak punya gambar video');
            const hasAudio = info.streams?.some((s) => s.codec_type === 'audio');
            const base = file.replace(/\.[^.]+$/, '');
            // audio diambil dulu dari file asli, jadi layer audio pendamping
            let audioFile = null;
            if (hasAudio) {
              audioFile = `${base}.audio.m4a`;
              await run(['-y', '-i', src, '-vn', '-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k', path.join(dir, audioFile)]).catch(() => { audioFile = null; });
            }
            // browser hanya pasti bisa memutar H.264/VP8/VP9/AV1 dalam mp4/webm; selain itu dikonversi
            let videoFile = file;
            const playable = /\.(mp4|m4v|webm)$/i.test(name) && ['h264', 'vp8', 'vp9', 'av1'].includes(v.codec_name);
            if (!playable) {
              videoFile = `${base}.mp4`;
              await run(['-y', '-i', src, '-map', '0:v:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', path.join(dir, videoFile)]);
              if (videoFile !== file) fs.rmSync(src, { force: true });
            }
            return json(res, 200, {
              url: `/media/uploads/${videoFile}`,
              audioUrl: audioFile ? `/media/uploads/${audioFile}` : null,
              name, video: true,
              width: v.width, height: v.height, duration: parseFloat(info.format?.duration) || 0
            });
          }
          // file video tanpa ?keep (editor chibi): ambil trek audionya saja (m4a), video aslinya dibuang
          if (isVideo) {
            const src = path.join(dir, file);
            file = file.replace(/\.[^.]+$/, '') + '.m4a';
            try {
              await run(['-y', '-i', src, '-vn', '-map', '0:a:0', '-c:a', 'aac', '-b:a', '192k', path.join(dir, file)]);
            } catch {
              throw new Error('Video ini tidak punya trek audio');
            } finally {
              fs.rmSync(src, { force: true });
            }
          }
          json(res, 200, { url: `/media/uploads/${file}`, name });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });

      // ---------- pustaka audio untuk menu Audio: media/library/{sfx,music}/<kategori>/<nama>.mp3 ----------
      server.middlewares.use('/api/library', (req, res) => {
        const media = path.resolve('media');
        const AUD = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
        const walk = (kind) => {
          const out = [];
          const visit = (dir, cat) => {
            if (!fs.existsSync(dir)) return;
            // awalan angka ("1 Transisi") hanya untuk mengatur urutan; tidak ikut ditampilkan
            const label = (n) => n.replace(AUD, '').replace(/^\d+[\s._-]+/, '');
            const entries = fs.readdirSync(dir, { withFileTypes: true })
              .sort((a, b) => a.name.replace(AUD, '').localeCompare(b.name.replace(AUD, ''), undefined, { numeric: true }));
            for (const e of entries) {
              const p = path.join(dir, e.name);
              if (e.isDirectory()) visit(p, cat ? `${cat} / ${label(e.name)}` : label(e.name));
              else if (AUD.test(e.name)) {
                const rel = path.relative(media, p).split(path.sep).map(encodeURIComponent).join('/');
                out.push({ cat, name: label(e.name), url: `/media/${rel}` });
              }
            }
          };
          visit(path.join(media, 'library', kind), '');
          return out;
        };
        json(res, 200, { sfx: walk('sfx'), music: walk('music'), folder: 'media/library' });
      });

      server.middlewares.use('/media/', (req, res, next) => {
        const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
        const root = path.resolve('media');
        const file = path.resolve(root, rel);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return next();
        const types = {
          '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.webm': 'video/webm',
          '.mp4': 'video/mp4', '.m4v': 'video/mp4',
          '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'
        };
        res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        // dukungan Range: wajib supaya video bisa di-seek di browser
        const size = fs.statSync(file).size;
        const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : Math.max(0, size - parseInt(m[2], 10));
          const end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
          if (start >= size || start > end) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          res.setHeader('Content-Length', end - start + 1);
          return fs.createReadStream(file, { start, end }).pipe(res);
        }
        res.setHeader('Content-Length', size);
        fs.createReadStream(file).pipe(res);
      });

      // ---------- keluaran ----------
      server.middlewares.use('/api/save-image', async (req, res) => {
        try {
          const name = safeName(query(req, 'name')) || 'gambar.jpg';
          const outDir = path.resolve('output');
          fs.mkdirSync(outDir, { recursive: true });
          const file = path.join(outDir, name);
          fs.writeFileSync(file, await readBody(req));
          json(res, 200, { ok: true, file: path.relative(process.cwd(), file) });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });

      server.middlewares.use('/api/export-audio', async (req, res) => {
        try {
          const name = safeName(query(req, 'name')) || 'audio';
          const outDir = path.resolve('output');
          fs.mkdirSync(outDir, { recursive: true });
          const wav = path.join(outDir, `${name}.wav`);
          const mp3 = path.join(outDir, `${name}.mp3`);
          fs.writeFileSync(wav, await readBody(req));
          await run(['-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', mp3]);
          json(res, 200, { ok: true, files: [path.relative(process.cwd(), mp3), path.relative(process.cwd(), wav)] });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });

      // ---------- ekspor After Effects ----------
      // Browser menerjemahkan proyek jadi skrip .jsx; server menyiapkan foldernya, menyalin media,
      // dan mengubah frame PNG layer khusus jadi video ProRes 4444 bertransparansi.
      let ae = null;
      server.middlewares.use('/api/ae/', async (req, res) => {
        try {
          const route = req.url.split('?')[0].replace(/^\//, '');
          if (route === 'start') {
            const cfg = JSON.parse((await readBody(req)).toString() || '{}');
            const dir = path.resolve('output', `${safeId(cfg.name) || 'proyek'}-after-effects`);
            ae?.seq?.ff?.kill();
            try {
              fs.rmSync(dir, { recursive: true, force: true });
            } catch (e) {
              if (e.code === 'EBUSY' || e.code === 'EPERM') {
                return json(res, 409, { error: `Folder ${path.relative(process.cwd(), dir)} sedang dipakai program lain (mis. After Effects). Tutup dulu, lalu ekspor lagi.` });
              }
              throw e;
            }
            fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
            ae = { dir };
            return json(res, 200, { ok: true, dir: path.relative(process.cwd(), dir), ffmpeg: hasFfmpeg });
          }
          if (!ae) return json(res, 400, { error: 'Ekspor After Effects belum dimulai' });
          // salin file dari media/ (unggahan) ke folder ekspor
          if (route === 'copy') {
            const { url, as } = JSON.parse((await readBody(req)).toString() || '{}');
            const root = path.resolve('media');
            const src = path.resolve(root, decodeURIComponent(String(url).replace(/^\/media\//, '').split('?')[0]));
            if (!src.startsWith(root + path.sep) || !fs.existsSync(src)) return json(res, 404, { error: `File tidak ditemukan: ${url}` });
            const name = safeName(as);
            fs.copyFileSync(src, path.join(ae.dir, 'media', name));
            return json(res, 200, { ok: true, file: `media/${name}` });
          }
          // tulis file (media/<nama>, atau di akar folder bila root=1)
          if (route === 'file') {
            const name = safeName(query(req, 'name'));
            if (!name) return json(res, 400, { error: 'Nama file kosong' });
            const rel = query(req, 'root') ? name : `media/${name}`;
            fs.writeFileSync(path.join(ae.dir, rel), await readBody(req));
            return json(res, 200, { ok: true, file: rel });
          }
          if (route === 'seq-start') {
            if (!hasFfmpeg) return json(res, 500, { error: FFMPEG_MISSING });
            const cfg = JSON.parse((await readBody(req)).toString() || '{}');
            // butuh transparansi → ProRes 4444 (alpha); layer yang menutupi penuh → H.264 (jauh lebih kecil)
            const alpha = cfg.alpha !== false;
            const name = `${safeId(cfg.name) || 'render'}.${alpha ? 'mov' : 'mp4'}`;
            const fps = Math.max(1, Math.min(60, Number(cfg.fps) || 30));
            const w = Math.max(2, Math.min(8192, parseInt(cfg.width, 10) || 1920));
            const h = Math.max(2, Math.min(8192, parseInt(cfg.height, 10) || 1080));
            // frame dikirim sebagai piksel RGBA mentah (encode PNG di browser terlalu lambat untuk gradien)
            const ff = spawn('ffmpeg', [
              '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(fps), '-i', '-',
              ...(alpha
                ? ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-qscale:v', '6', '-vendor', 'apl0']
                : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']),
              path.join(ae.dir, 'media', name)
            ], { stdio: ['pipe', 'ignore', 'pipe'] });
            let err = '';
            ff.stderr.on('data', (d) => { err = (err + d).slice(-3000); });
            ff.on('error', () => {});
            ff.stdin.on('error', () => {}); // EPIPE bila ffmpeg berhenti duluan; ditangani di seq-frame
            ae.seq = { ff, file: `media/${name}`, done: once(ff, 'close'), err: () => err };
            return json(res, 200, { ok: true });
          }
          if (route === 'seq-frame') {
            const body = await readBody(req);
            if (!ae.seq) return json(res, 400, { error: 'Render layer belum dimulai' });
            const { ff } = ae.seq;
            // ffmpeg sudah berhenti → laporkan, jangan menunggu selamanya
            const dead = () => json(res, 500, { error: `ffmpeg berhenti: ${ae.seq.err().split(/\r?\n/).slice(-3).join(' ')}` });
            if (ff.exitCode !== null) return dead();
            if (!ff.stdin.write(body)) await Promise.race([once(ff.stdin, 'drain'), ae.seq.done]);
            if (ff.exitCode !== null) return dead();
            return json(res, 200, { ok: true });
          }
          if (route === 'seq-finish') {
            const seq = ae.seq;
            if (!seq) return json(res, 400, { error: 'Render layer belum dimulai' });
            seq.ff.stdin.end();
            const [code] = await seq.done;
            ae.seq = null;
            if (code !== 0) return json(res, 500, { error: `ffmpeg gagal membuat ${seq.file}: ${seq.err().split(/\r?\n/).slice(-4).join(' ')}` });
            return json(res, 200, { ok: true, file: seq.file });
          }
          return json(res, 404, { error: 'Tidak dikenal' });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });

      server.middlewares.use('/api/export/', async (req, res) => {
        try {
          const route = req.url.split('?')[0].replace(/^\//, '');
          const body = await readBody(req);
          const outDir = path.resolve('output');
          fs.mkdirSync(outDir, { recursive: true });

          if (route === 'start') {
            const cfg = JSON.parse(body.toString() || '{}');
            const name = safeId(cfg.name) || 'video';
            const fps = Math.max(1, Math.min(60, parseInt(cfg.fps, 10) || 30));
            if (job?.ff) job.ff.kill();
            job = {
              fps,
              mode: cfg.mode === 'h264' ? 'h264' : 'jpeg',
              video: path.join(outDir, `${name}.video.${cfg.mode === 'h264' ? 'h264' : 'mp4'}`),
              audio: path.join(outDir, `${name}.audio.wav`),
              final: path.join(outDir, `${name}.mp4`)
            };
            if (job.mode === 'h264') {
              // browser sudah meng-encode H.264 (WebCodecs); server cukup menyimpan stream-nya
              job.stream = fs.createWriteStream(job.video);
              return json(res, 200, { ok: true });
            }
            if (!hasFfmpeg) return json(res, 500, { error: FFMPEG_MISSING });
            job.ff = spawn('ffmpeg', [
              '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
              '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', job.video
            ], { stdio: ['pipe', 'ignore', 'pipe'] });
            job.ff.stderr.on('data', () => {});
            job.ff.on('error', () => {});
            job.done = once(job.ff, 'close');
            return json(res, 200, { ok: true });
          }
          if (!job) return json(res, 400, { error: 'Ekspor belum dimulai' });
          if (route === 'audio') {
            fs.writeFileSync(job.audio, body);
            return json(res, 200, { ok: true });
          }
          if (route === 'frame') {
            if (!job.ff.stdin.write(body)) await once(job.ff.stdin, 'drain');
            return json(res, 200, { ok: true });
          }
          if (route === 'chunk') {
            if (!job.stream.write(body)) await once(job.stream, 'drain');
            return json(res, 200, { ok: true });
          }
          if (route === 'finish') {
            if (job.mode === 'h264') {
              job.stream.end();
              await once(job.stream, 'finish');
              // stream H.264 mentah belum punya timestamp: bungkus dulu ke MP4, baru digabung dengan audio
              const raw = job.video;
              job.video = raw.replace(/\.h264$/, '.mp4');
              await run(['-y', '-framerate', String(job.fps), '-i', raw, '-c:v', 'copy', job.video]);
              fs.rmSync(raw, { force: true });
            } else {
              job.ff.stdin.end();
              await job.done;
            }
            await run(['-y', '-i', job.video, '-i', job.audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', job.final]);
            fs.rmSync(job.video, { force: true });
            fs.rmSync(job.audio, { force: true });
            const file = path.relative(process.cwd(), job.final);
            job = null;
            return json(res, 200, { ok: true, file });
          }
          return json(res, 404, { error: 'Tidak dikenal' });
        } catch (err) {
          json(res, 500, { error: err.message });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [studioPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    // hanya folder data di root yang diabaikan (bukan src/motion dsb.)
    watch: { ignored: ['output', 'media', 'episodes', 'motion', 'posters', 'projects', 'sfx'].map((d) => `${path.resolve(d).replace(/\\/g, '/')}/**`) }
  },
  build: {
    rollupOptions: { input: { home: 'index.html', motion: 'motion.html', chibi: 'chibi.html' } }
  }
});
