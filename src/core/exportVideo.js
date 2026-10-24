// Ekspor video umum: render frame demi frame ke canvas, encode H.264 di browser (WebCodecs)
// atau kirim JPEG per frame, lalu server menggabungkannya dengan audio jadi output/<nama>.mp4.

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

const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

// renderFrame(t) harus menggambar frame ke `canvas`; audioWav = Blob WAV sepanjang video
export async function exportVideo({ canvas, name, fps, total, renderFrame, audioWav, status }) {
  const width = canvas.width;
  const height = canvas.height;
  const vcfg = {
    codec: width * height > 1920 * 1088 ? 'avc1.640033' : 'avc1.640028',
    width, height, bitrate: 14_000_000, framerate: fps, avc: { format: 'annexb' }
  };
  const useCodecs = 'VideoEncoder' in window && (await VideoEncoder.isConfigSupported(vcfg)).supported;
  await post('/api/export/start', { name, fps, mode: useCodecs ? 'h264' : 'jpeg' }, true);
  await post('/api/export/audio', audioWav);
  const frames = Math.ceil(total * fps);
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
      await renderFrame(f / fps);
      const vf = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
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
      await renderFrame(f / fps);
      await post('/api/export/frame', await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92)));
      if (f % 10 === 0) progress(f);
    }
  }
  status('Menggabungkan video + audio…');
  const done = await post('/api/export/finish', {}, true);
  return done.file;
}

// poster kecil untuk kartu beranda
export async function savePoster(canvas, col, id) {
  const w = 480;
  const h = Math.round((w * canvas.height) / canvas.width);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, w, h);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
  await fetch(`/api/poster?col=${col}&id=${encodeURIComponent(id)}`, { method: 'POST', body: blob });
}
