// Voice over ElevenLabs untuk editor episode chibi.
//   voiceAtPlayhead: satu VO bebas di posisi playhead
//   voiceAllScenes:  VO tiap adegan dari subtitle-nya, ditaruh di awal klip adegan,
//                    durasi adegan bisa disamakan dengan panjang suara (teks & suara sinkron)
import { buildTimeline, newId } from '../timeline.js';
import { openVoiceDialog, generateVoice } from '../core/voiceover.js';
import { ask, tell } from '../core/dialog.js';

const LEAD = 0.3; // jeda sebelum suara mulai di tiap adegan
const TAIL = 0.5; // jeda setelah suara selesai

function freeTrack(timeline, start, end) {
  for (let k = 0; k < 20; k++) {
    if (!timeline.audio.some((a) => a.track === k && a.start < end && a.start + (a.out - a.in) / a.speed > start)) return k;
  }
  return 0;
}

export async function voiceAtPlayhead({ store, audio, getTime, status }) {
  const res = await openVoiceDialog({ mode: 'single' });
  if (!res) return;
  const buf = await audio.getBuffer(res.url);
  if (!buf) return status('Suara dibuat tapi gagal dibaca');
  const at = getTime();
  store.mutate((d) => {
    const a = { id: newId('a'), url: res.url, name: res.name, track: freeTrack(d.timeline, at, at + buf.duration), start: at, in: 0, out: buf.duration, speed: 1, volume: 1 };
    d.timeline.audio.push(a);
    store.setSel({ kind: 'audio', id: a.id });
  });
  status(`Voice over ditambahkan (${buf.duration.toFixed(1)} dtk)`);
}

export async function voiceAllScenes({ store, audio, getTl, status }) {
  // adegan sesuai urutan tampil di timeline, yang punya subtitle
  const order = [];
  const seen = new Set();
  for (const c of getTl().clips) {
    if (seen.has(c.scene)) continue;
    seen.add(c.scene);
    const s = store.doc.scenes.find((x) => x.id === c.scene);
    if (s?.sub?.trim()) order.push(s);
  }
  if (!order.length) return tell('Belum ada adegan yang punya subtitle. Isi subtitle adegan dulu, karena itu yang dibacakan.');
  const chars = order.reduce((n, s) => n + s.sub.trim().length, 0);

  const pick = await openVoiceDialog({
    mode: 'bulk',
    info: `${order.length} adegan akan dibacakan dari subtitle-nya (total ${chars.toLocaleString('id-ID')} karakter dari kuota ElevenLabs). Tiap suara ditaruh di trek audio baru, tepat di awal adegannya.`
  });
  if (!pick) return;
  if (!(await ask(`Buat ${order.length} voice over (${chars.toLocaleString('id-ID')} karakter)? Prosesnya bisa beberapa menit.`, { ok: 'Mulai' }))) return;

  const made = [];
  let error = null;
  for (let i = 0; i < order.length; i++) {
    const s = order[i];
    status(`Membuat voice over ${i + 1}/${order.length}: ${s.sub.slice(0, 50)}…`);
    try {
      const out = await generateVoice(pick.settings, s.sub.trim(), {
        previousText: order[i - 1]?.sub,
        nextText: order[i + 1]?.sub
      });
      const buf = await audio.getBuffer(out.url);
      if (!buf) throw new Error('file suara gagal dibaca');
      made.push({ sceneId: s.id, url: out.url, name: `VO ${i + 1} · ${s.sub.slice(0, 30)}`, dur: buf.duration });
    } catch (err) {
      error = err;
      break;
    }
  }
  if (!made.length) return tell(`Voice over gagal: ${error?.message}`);

  store.mutate((d) => {
    if (pick.sync) {
      for (const m of made) {
        const s = d.scenes.find((x) => x.id === m.sceneId);
        if (!s) continue;
        const nd = Math.round((m.dur + LEAD + TAIL) * 10) / 10;
        // klip yang memakai seluruh adegan ikut menyesuaikan
        for (const c of d.timeline.video) {
          if (c.scene === s.id && c.in === 0 && Math.abs(c.out - s.dur) < 0.01) c.out = nd;
        }
        s.dur = nd;
      }
    }
    // posisi klip dihitung setelah durasi disesuaikan; semua VO masuk satu trek baru
    const tl = buildTimeline(d);
    const track = d.timeline.audio.reduce((k, a) => Math.max(k, a.track + 1), 0);
    for (const m of made) {
      const clip = tl.clips.find((c) => c.scene === m.sceneId);
      if (!clip) continue;
      d.timeline.audio.push({ id: newId('a'), url: m.url, name: m.name, track, start: clip.start + (clip.in < LEAD ? LEAD - clip.in : 0), in: 0, out: m.dur, speed: 1, volume: 1 });
    }
  });

  const msg = `${made.length} voice over masuk ke trek Audio baru${pick.sync ? ', durasi adegan sudah disamakan' : ''}.`;
  if (error) tell(`${msg} Berhenti di adegan ke-${made.length + 1}: ${error.message}. Adegan yang sudah jadi tetap dipakai.`);
  else status(`${msg} Bisa di-undo (Ctrl+Z).`);
}
