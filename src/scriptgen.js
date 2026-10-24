// Naskah → adegan. Tiap kalimat/baris jadi satu adegan, lalu ekspresi, pose, kamera,
// properti, dan SFX ditebak dari isi kalimat. Hasilnya titik awal; rapikan di inspector.
// Penanda arahan seperti [NADA MULAI TEGAS], [EMOSIONAL], [PENUTUP] mengganti bagian.
import { newId, defaultVideo } from './timeline.js';

const MARKERS = [
  [/tegas|marah|keras|menampar/i, 't'],
  [/jeda|turunkan|lembut|pelan|tenang/i, 'd'],
  [/emosional|sedih|haru|diperlambat/i, 'e'],
  [/penutup|closing|akhir/i, 'p'],
  [/lucu|sindir|santai|nyindir/i, 'l'],
  [/pembuka|hook|intro|renung/i, 'h']
];

const PROP_WORDS = [
  ['kitab', /\b(surah|surat|ayat|firman|al-\w+|hadis|hadits|rasulullah|nabi)\b/i],
  ['masjid', /\b(azan|adzan|salat|shalat|sholat|masjid|sujud|subuh|magrib|maghrib)\b/i],
  ['uang', /\b(uang|kaya|saldo|rekening|gaji|harta|duit|bisnis|cuan)\b/i],
  ['hp', /\b(hp|handphone|notifikasi|notif|pesan|chat|followers|pengikut|sosmed|story|scroll)\b/i],
  ['jam', /\b(waktu|jam|umur|begadang|telat|terlambat|detik|menit|sebelum)\b/i],
  ['kalender', /\b(tahun|bulan|rencana|merencanakan|target|besok)\b/i],
  ['hati', /\b(hati|tobat|taubat|rahmat|ampun|ampunan|cinta)\b/i]
];

const PROP_SFX = { uang: 'coin', hp: 'notif', jam: 'tick*6', kitab: 'chime', kalender: 'pop', hati: '', masjid: '' };

const CYCLE = {
  h: { pose: ['explain', 'idle', 'think', 'shrug'], shot: ['medium', 'close', 'medium', 'side'] },
  l: { pose: ['shrug', 'explain', 'idle', 'explain'], shot: ['medium', 'close', 'medium', 'wide'] },
  t: { pose: ['explain', 'control', 'idle', 'lookBack', 'think'], shot: ['medium', 'low', 'close', 'medium', 'wide'] },
  d: { pose: ['explain', 'heart', 'idle', 'shrug'], shot: ['medium', 'close', 'medium', 'side'] },
  e: { pose: ['idle', 'heart', 'sit', 'explain'], shot: ['wide', 'medium', 'close', 'medium'] },
  p: { pose: ['idle', 'explain', 'lookBack', 'heart'], shot: ['close', 'medium', 'wide', 'low'] }
};

const BASE_EXPR = { h: 'normal', l: 'sinis', t: 'serius', d: 'serius', e: 'sedih', p: 'serius' };

const words = (s) => s.split(/\s+/).filter(Boolean);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function units(script) {
  const out = [];
  let sec = 'h';
  for (const raw of script.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const marker = line.match(/^\[(.+)\]$/);
    if (marker) {
      for (const [re, s] of MARKERS) if (re.test(marker[1])) { sec = s; break; }
      continue;
    }
    const parts = (line.match(/[^.!?…]+(?:[.!?…]+["”’']?)?/g) || [line]).map((p) => p.trim()).filter(Boolean);
    let buf = '';
    for (const p of parts) {
      buf = buf ? `${buf} ${p}` : p;
      if (words(buf).length >= 4 || /\?["”’']?$/.test(buf)) {
        out.push({ text: buf, sec });
        buf = '';
      }
    }
    if (buf) out.push({ text: buf, sec });
  }
  return out;
}

// teks besar (a) + teks aksen (b): pecah di koma, atau di tengah kalimat
function punch(text) {
  const w = words(text);
  if (w.length <= 3) return { a: text, b: '' };
  const commas = text.split(/,\s*/);
  if (commas.length > 1 && words(commas[0]).length <= 6) {
    const last = words(commas.slice(1).join(', '));
    return { a: `${commas[0]},`, b: last.length > 6 ? `…${last.slice(-5).join(' ')}` : last.join(' ') };
  }
  if (w.length <= 8) {
    const k = Math.ceil(w.length / 2);
    return { a: w.slice(0, k).join(' '), b: w.slice(k).join(' ') };
  }
  return { a: w.slice(0, 4).join(' '), b: `…${w.slice(-4).join(' ')}` };
}

function guessExpr(text, sec, idxInSec) {
  if (/\b(lucu|haha|ketawa|ngakak)\b/i.test(text)) return 'tertawa';
  if (/\b(semoga|aamiin|amin|alhamdulillah|insya)/i.test(text)) return 'senyum';
  if (sec === 'e' && /\b(justru|mulai|bangkit|pulang|lanjut|kembali)/i.test(text)) return 'senyum';
  if (/\?["”’']?$/.test(text)) return sec === 'e' ? 'sedih' : 'sinis';
  if (/^(jangan|harus|dengar|ingat|sekarang)\b/i.test(text)) return 'serius';
  if (sec === 'e' && idxInSec > 3) return 'normal';
  return BASE_EXPR[sec] || 'normal';
}

function guessPose(text, sec, idxInSec, expr) {
  if (/\b(semoga|aamiin|amin|ya allah|ya rabb|doa)\b/i.test(text)) return 'doa';
  if (/\?["”’']?$/.test(text) && expr === 'sinis') return idxInSec % 2 ? 'shrug' : 'point';
  if (/\b(pikir|pikirkan|bayangkan|renungkan|coba)\b/i.test(text)) return 'think';
  if (/^(dengar|ingat)\b/i.test(text)) return 'point';
  if (/\b(hati|rahmat)\b/i.test(text)) return 'heart';
  const c = CYCLE[sec] || CYCLE.h;
  return c.pose[idxInSec % c.pose.length];
}

export function scenesFromScript(script, title) {
  const scenes = [];
  const [t1, ...rest] = title.split(',');
  scenes.push({
    id: newId('s'), dur: 6, sec: 'i', expr: 'normal', pose: 'float', shot: 'wide', prop: '',
    a: rest.length ? `${t1.trim()},` : title, b: rest.join(',').trim(), sub: '', sfx: ['whoosh', 'bass@0.4'], title: true, magic: true
  });

  let lastSec = null;
  let idxInSec = 0;
  let lastProp = '';
  for (const u of units(script)) {
    if (u.sec !== lastSec) idxInSec = 0;
    const first = u.sec !== lastSec;
    const expr = guessExpr(u.text, u.sec, idxInSec);
    const pose = guessPose(u.text, u.sec, idxInSec, expr);
    const c = CYCLE[u.sec] || CYCLE.h;
    let shot = first ? 'wide' : c.shot[idxInSec % c.shot.length];
    if (pose === 'point') shot = 'low';
    let prop = (PROP_WORDS.find(([, re]) => re.test(u.text)) || [''])[0];
    if (prop === lastProp && idxInSec % 3 === 2) prop = '';
    const sfx = [];
    if (first) sfx.push(u.sec === 'e' ? 'wind:40' : 'whoosh');
    if (/\?["”’']?$/.test(u.text) && u.sec !== 'e') sfx.push('bass@0.3');
    if (prop && PROP_SFX[prop]) sfx.push(PROP_SFX[prop]);
    const n = words(u.text).length;
    scenes.push({
      id: newId('s'),
      dur: clamp(Math.round((n / 2.4 + 0.9) * 2) / 2, 1.5, 12),
      sec: u.sec, expr, pose, shot, prop,
      ...punch(u.text),
      sub: u.text,
      sfx: [...new Set(sfx)],
      ...(pose === 'control' ? { magic: true } : {})
    });
    lastSec = u.sec;
    lastProp = prop;
    idxInSec++;
  }

  scenes.push({
    id: newId('s'), dur: 6, sec: 'p', expr: 'senyum', pose: 'explain', shot: 'wide', prop: '',
    a: 'Mode Ustadz', b: 'Dakwah · Motivasi · Self Improvement', sub: '', sfx: ['whoosh'], end: true
  });
  return scenes;
}

export function newEpisode({ id, title, label, script }) {
  const scenes = scenesFromScript(script || '', title);
  const firstProp = scenes.find((s) => s.prop)?.prop || 'hp';
  const [t1, ...rest] = title.split(',');
  const tail = words(rest.join(',')).slice(0, 4);
  const now = new Date().toISOString();
  return {
    version: 2,
    id,
    title,
    episodeLabel: label,
    created: now,
    updated: now,
    thumbnail: {
      lines: tail.length ? [`${t1.trim()},`, tail.join(' ')] : [title],
      accentFrom: 1,
      chip: '',
      expr: 'sinis', pose: 'point', prop: firstProp, mood: 'tegas'
    },
    scenes,
    timeline: { sfxVolume: 1, sfxMuted: false, voAdded: true, video: defaultVideo(scenes), audio: [] }
  };
}
