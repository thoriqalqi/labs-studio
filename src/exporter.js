// Semua keluaran: MP4, audio saja, thumbnail, foto profil + banner.
import { OUT_W, OUT_H } from './overlay.js';
import { renderThumbnail } from './thumbnail.js';
import { renderProfile, renderBanner } from './branding.js';

const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

async function post(path, body, json = false) {
  const res = await fetch(path, {
    method: 'POST',
    headers: json ? { 'Content-Type': 'application/json' } : {},
    body: json ? JSON.stringify(body) : body
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || res.statusText);
  return out;
}

export function createExporter({ engine, stage, renderAt, getTl, getDoc, audio, status, busy, setTime }) {
  async function guard(label, fn) {
    if (busy.get()) return;
    busy.set(true);
    try {
      await fn();
    } catch (err) {
      status(`${label} gagal: ${err.message}`);
      console.error(err);
    } finally {
      busy.set(false);
    }
  }

  const video = (fps, until) => guard('Ekspor video', async () => {
    const tl = getTl();
    const id = getDoc().id;
    // WebCodecs (H.264 di browser) jauh lebih cepat; kalau tidak didukung, kirim JPEG per frame
    const vcfg = { codec: 'avc1.640028', width: OUT_W, height: OUT_H, bitrate: 14_000_000, framerate: fps, avc: { format: 'annexb' } };
    const useCodecs = 'VideoEncoder' in window && (await VideoEncoder.isConfigSupported(vcfg)).supported;
    await post('/api/export/start', { name: id, fps, mode: useCodecs ? 'h264' : 'jpeg' }, true);
    status('Merender audio…');
    await audio.ensureLoaded();
    await post('/api/export/audio', await audio.renderOffline(tl.total));
    const end = Math.min(tl.total, until || tl.total);
    const frames = Math.ceil(end * fps);
    const t0 = performance.now();
    const progress = (f) => {
      const el = (performance.now() - t0) / 1000;
      status(`Merender video ${Math.round(((f + 1) / frames) * 100)}% · sisa ±${fmt((el / (f + 1)) * (frames - f - 1))}`);
    };

    if (useCodecs) {
      let chunks = [];
      let encError = null;
      const enc = new VideoEncoder({
        output: (chunk) => {
          const buf = new Uint8Array(chunk.byteLength);
          chunk.copyTo(buf);
          chunks.push(buf);
        },
        error: (e) => { encError = e; }
      });
      enc.configure(vcfg);
      const flush = async () => {
        if (!chunks.length) return;
        const body = new Blob(chunks);
        chunks = [];
        await post('/api/export/chunk', body);
      };
      for (let f = 0; f < frames; f++) {
        if (encError) throw encError;
        setTime(f / fps);
        renderAt(f / fps);
        const vf = new VideoFrame(stage, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
        enc.encode(vf, { keyFrame: f % (fps * 2) === 0 });
        vf.close();
        while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 1));
        if (f % 30 === 29) {
          await flush();
          progress(f);
        }
      }
      await enc.flush();
      enc.close();
      await flush();
    } else {
      for (let f = 0; f < frames; f++) {
        setTime(f / fps);
        renderAt(f / fps);
        await post('/api/export/frame', await new Promise((r) => stage.toBlob(r, 'image/jpeg', 0.92)));
        if (f % 10 === 0) progress(f);
      }
    }
    status('Menggabungkan video + audio…');
    const done = await post('/api/export/finish', {}, true);
    status(`Video selesai: ${done.file}`);
  });

  const audioOnly = () => guard('Ekspor audio', async () => {
    status('Merender audio…');
    await audio.ensureLoaded();
    const wav = await audio.renderOffline(getTl().total);
    status('Menyimpan MP3 + WAV…');
    const out = await post(`/api/export-audio?name=${getDoc().id}`, wav);
    status(`Audio selesai: ${out.files.join(' · ')}`);
  });

  // gambar diam (thumbnail/branding) tetap tampil di layar sampai pratinjau diputar lagi
  const thumbnail = () => guard('Thumbnail', async () => {
    const doc = getDoc();
    const blob = await renderThumbnail({ ...engine, stage, episode: doc });
    const out = await post(`/api/save-image?name=${doc.id}-thumbnail.jpg`, blob);
    status(`Thumbnail tersimpan: ${out.file} (${Math.round(blob.size / 1024)} KB)`);
    return 'still';
  });

  const branding = () => guard('Profil + banner', async () => {
    const profile = await renderProfile(engine);
    const banner = await renderBanner(engine);
    const saved = [];
    for (const [name, blob] of [['branding-profil.jpg', profile.blob], ['branding-banner.jpg', banner.blob]]) {
      const out = await post(`/api/save-image?name=${name}`, blob);
      saved.push(out.file);
    }
    const g = stage.getContext('2d');
    g.drawImage(banner.canvas, 0, 0, OUT_W, OUT_H);
    const k = OUT_W / 2560;
    g.save();
    g.setLineDash([16, 10]);
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.strokeRect(507 * k, 508 * k, 1546 * k, 423 * k);
    g.setLineDash([]);
    g.beginPath();
    g.arc(OUT_W - 190, 190, 150, 0, Math.PI * 2);
    g.clip();
    g.drawImage(profile.canvas, OUT_W - 340, 40, 300, 300);
    g.restore();
    status(`Tersimpan: ${saved.join(' · ')} (garis putus-putus = area yang selalu terlihat)`);
  });

  return { video, audioOnly, thumbnail, branding };
}
