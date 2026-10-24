// Promo editorial "Labs Motion", ±54 detik, bahasa Inggris.
// Alur meniru video brand bergaya editorial: kertas krem + titik halftone + tipografi besar (masalah)
// → "Well… there is." → lanskap alam + logo (solusi) → diagram kaca & UI di atas lanskap
// → latar hijau tua, kata bergulir, serif miring → logo.
// VO tidak ikut template (berbayar). Naskahnya ada di VO_SCRIPT; setelah suaranya dibuat,
// fitToVoice(doc, klip) memasang VO dan memanjangkan adegan yang kalimatnya lebih panjang.
import { newMotionDoc, newLayer } from '../motion/doc.js';

const PAPER = '#eeebe6';
const INK = '#2a2827';
const MUTED = '#a29e97';
const RED = '#c42a40';
const MINT = '#8ff0c0';
const DARK = '#0c1c18';
const FONT = 'Geist';
const SERIF = 'Instrument Serif';

const k = (list) => list.map(([t, v, ease]) => ({ t, v, ease: ease || 'easeInOut' }));
const none = { preset: 'none', dur: 0.3 };
const fade = (d = 0.3) => ({ preset: 'fade', dur: d });
// transisi mengalir: keluar naik + blur, masuk dari bawah + menajam
const flowIn = (d = 0.45) => ({ preset: 'flowIn', dur: d });
const flowOut = (d = 0.32) => ({ preset: 'flowOut', dur: d });

// naskah VO per adegan: [awal adegan, jeda sebelum bicara, kalimat] (suara cewek, tenang & yakin).
// Narasi mengisi setiap adegan dan ikut membacakan teks yang tampil di layar.
export const VO_SCRIPT = [
  [0, 0.5, "Let's talk about motion. The kind that actually moves people."],
  [4.2, 0.3, "It's everywhere now. Launching. Posting. Pitching. Scrolling."],
  [8.8, 0.3, 'Except making it is still painfully slow, and way too expensive.'],
  [12.9, 0.2, 'Keyframes get skipped. Revisions pile up. And the final render? Failed. Again.'],
  [17.2, 0.3, 'Meanwhile, the budget keeps burning, while you wait on export.'],
  [20.4, 0.2, 'But what if there was a studio that worked on your terms?'],
  [24.4, 0.2, 'Well... there is.'],
  [27.0, 0.3, 'Meet Labs Motion. The motion studio that lives right on your machine. No cloud queue. No waiting.'],
  [32.6, 0.2, 'Layers, keyframes, 3D scenes, voice over, sound effects, and export. Everything you need, all in one place.'],
  [38.2, 0.2, 'Just describe what you want with a prompt. Fine-tune every detail by hand. Then export to MP4, in a single click.'],
  [44.4, 0.3, 'So your ideas keep growing, shipping, rendering, and moving.'],
  [47.2, 0.2, 'The future of motion work arrived early.'],
  [50.6, 0.4, 'Labs Motion. Your studio. Your machine.']
];

// Pasang VO (clips[i] = { url, dur } sesuai VO_SCRIPT) dan atur tempo: setiap adegan dibuat
// sepanjang kalimatnya (jeda awal + suara + ekor), lalu seluruh isi adegan ikut dipadatkan/diregangkan
// (awal, durasi, keyframe, animasi masuk/keluar) — seperti time-remap per adegan.
export function fitToVoice(doc, clips, { lead = 0.22, tail = 0.3, hold = 1.2 } = {}) {
  const none = { preset: 'none', dur: 0.3 };
  const b = [...VO_SCRIPT.map(([s]) => s), doc.comp.duration];
  const n = [0];
  VO_SCRIPT.forEach(([, l], i) => {
    const last = i === VO_SCRIPT.length - 1;
    n.push(n[i] + Math.min(l, lead) + clips[i].dur + tail + (last ? hold : 0));
  });
  // adegan ke-i yang memuat waktu t (asli), dan pemetaan waktu asli → waktu baru
  const seg = (t) => {
    const i = b.findIndex((x, j) => j < b.length - 1 && t < b[j + 1]);
    return i < 0 ? b.length - 2 : i;
  };
  const slope = (i) => (n[i + 1] - n[i]) / (b[i + 1] - b[i]);
  const T = (t) => {
    const i = seg(t);
    return n[i] + (t - b[i]) * slope(i);
  };
  for (const l of doc.layers) {
    const s0 = l.start;
    const e0 = l.start + l.dur;
    const s1 = T(s0);
    const e1 = l.type === 'sfx' && l.dur <= 1.05 ? s1 + l.dur : T(e0);
    for (const list of Object.values(l.keys || {})) for (const key of list) key.t = T(s0 + key.t) - s1;
    // transisi ikut tempo, tapi tidak dibuat lebih singkat dari 0,25 dtk supaya tetap halus
    const fit = (a, k) => { if (a && a.dur) a.dur = Math.max(Math.min(a.dur, 0.25), a.dur * k); };
    fit(l.anim?.in, slope(seg(s0 + 1e-4)));
    fit(l.anim?.out, slope(seg(e0 - 1e-4)));
    l.start = s1;
    l.dur = Math.max(0.05, e1 - s1);
  }
  doc.comp.duration = Math.round(n[n.length - 1] * 100) / 100;
  const vo = VO_SCRIPT.map(([, l, line], i) =>
    newLayer('audio', doc.comp, { name: `VO · ${line}`, start: n[i] + Math.min(l, lead), dur: clips[i].dur, props: { url: clips[i].url, volume: 110 }, anim: { in: none, out: none } }));
  // kata bergulir mengikuti ucapan "growing, shipping, rendering, moving"
  const roll = doc.layers.find((l) => l.type === 'wordroll');
  const rv = vo[10];
  if (roll && rv) {
    const o = rv.start - roll.start;
    roll.keys.index = k([[0, 0, 'hold'], [o + rv.dur * 0.3, 0], [o + rv.dur * 0.45, 1], [o + rv.dur * 0.62, 2], [o + rv.dur * 0.82, 3, 'easeOut']]);
  }
  doc.layers.splice(doc.layers.findIndex((l) => l.type === 'sfx'), 0, ...vo);
  return doc;
}

// [detik, suara, volume %, nama, durasi, jumlah]
const SFX = [
  [0.2, 'click', 35, 'Daftar 1'], [0.45, 'click', 35, 'Daftar 2'], [0.7, 'click', 35, 'Daftar 3'],
  [1.5, 'whoosh', 55, '"Motion." masuk'],
  [4.2, 'whoosh', 45, 'Bidang titik'], [4.3, 'shimmer', 30, 'Titik berkilau'],
  [6.6, 'pop', 40, 'Bola 1'], [6.8, 'pop', 40, 'Bola 2'], [7.0, 'pop', 40, 'Bola 3'], [7.2, 'pop', 40, 'Bola 4'],
  [8.8, 'whoosh', 50, 'Kata berserakan'], [11.4, 'tick', 40, 'Kalimat kecil'],
  [12.9, 'whoosh', 50, 'Jalur titik'], [13.7, 'click', 40, 'Kartu muncul'], [14.1, 'tick', 30, 'Rendering'],
  [17.2, 'whoosh', 45, 'Angka merah'], [17.3, 'tick', 30, 'Angka berjalan', 2.2, 9],
  [20.4, 'whoosh', 35, 'Pertanyaan'], [23.6, 'riser', 40, 'Menjelang Well', 0.8],
  [24.4, 'sub', 70, '"Well..."'], [25.7, 'click', 35, 'there is'],
  [27.0, 'whooshUp', 60, 'Jendela lanskap'], [27.3, 'shimmer', 45, 'Logo muncul'], [27.4, 'wind', 22, 'Angin lanskap', 17],
  [32.6, 'whoosh', 45, 'Diagram lingkar'], [33.4, 'pop', 30, 'Label fitur'],
  [38.2, 'whoosh', 45, 'Prompt'], [38.5, 'tick', 22, 'Mengetik prompt', 1.6, 12],
  [40.3, 'whooshUp', 50, 'Layar editor'], [42.7, 'click', 60, 'Klik ekspor'], [42.9, 'chime', 45, 'Ekspor selesai'],
  [44.4, 'sub', 65, 'Masuk adegan gelap'], [44.5, 'whoosh', 40, 'Kata bergulir'],
  [47.2, 'shimmer', 40, 'Kalimat penutup'], [49.0, 'whoosh', 35, 'Jendela gunung'],
  [50.2, 'riser', 35, 'Menjelang logo', 0.5], [50.6, 'sub', 75, 'Logo'], [50.65, 'chime', 55, 'Logo berkilau']
];

export default {
  id: 'promo-editorial',
  name: 'Promo editorial (Labs Motion)',
  description: 'Promo ±60 detik gaya editorial (tempo cepat, transisi mengalir): kertas krem & titik halftone, lalu lanskap alam, diagram kaca, dan penutup hijau tua.',
  kind: 'motion',
  order: 4,
  create({ id, name }) {
    const doc = newMotionDoc({ id, name, size: 'landscape', duration: 54, fps: 30, background: DARK });
    const c = doc.comp;
    const L = [];
    const add = (type, o) => {
      const l = newLayer(type, c, o);
      L.push(l);
      return l;
    };
    const text = (name, start, dur, props, anim) => add('text', {
      name, start, dur, anim: anim || { in: flowIn(), out: flowOut() },
      props: { font: FONT, weight: 400, size: 36, color: INK, accent: RED, boxWidth: 1600, lineHeight: 1.1, ...props }
    });

    // ---------- 1. "Let's talk about" → "Motion." (0–4.2) ----------
    [['○ Let’s', 0.2, MUTED], ['○ talk', 0.45, '#6f6b66'], ['● about', 0.7, INK]].forEach(([t, s, col], i) => {
      const l = text(`Daftar: ${t.slice(2)}`, s, 1.5 - s + 0.2, { text: t, size: 40, color: col, align: 'left', boxWidth: 400, x: 1020, y: 470 + i * 52 },
        { in: flowIn(), out: flowOut() });
      l.keys = { y: k([[0, 470 + i * 52], [1.4 - s, 470 + i * 52 - 70]]) };
    });
    const big = text('"Motion."', 1.5, 2.7, { text: 'Motion', size: 430, weight: 500, letterSpacing: -20, x: 1500, y: 520 }, { in: none, out: flowOut() });
    big.keys = { x: k([[0, 1500, 'easeOut'], [0.8, 820], [2.7, 700]]), blur: k([[0, 12], [0.4, 0]]) };
    const dotOrb = add('orb', { name: 'Titik "Motion."', start: 1.5, dur: 2.7, props: { d: 120, x: 2120, y: 650 }, anim: { in: none, out: flowOut() } });
    dotOrb.keys = { x: k([[0, 2120, 'easeOut'], [0.8, 1440], [2.7, 1320]]), hue: k([[0, 0], [2.7, 140]]) };

    // ---------- 2. bidang titik + bola berlabel (4.2–8.8) ----------
    const grid = add('dots', { name: 'Bidang halftone', start: 4.2, dur: 2.5, props: { mode: 'grid', holeW: 760, holeH: 190, spacing: 40, dotSize: 19, hollow: 0.18, color: INK }, anim: { in: none, out: flowOut() } });
    grid.keys = { progress: k([[0, 0, 'easeOut'], [1.0, 1]]), flow: k([[0, 0, 'linear'], [2.5, 3]]) };
    text('Everywhere now', 4.5, 2.2, { text: 'It’s everywhere now.', size: 34 }, { in: flowIn(), out: flowOut() });
    [[520, 330, 'Launching.', 0], [880, 280, 'Posting.', 0.2], [1420, 300, 'Pitching.', 0.4], [1080, 600, 'Scrolling.', 0.6], [1260, 900, '', 0.8]].forEach(([x, y, label, d], i) => {
      const o = add('orb', {
        name: `Bola ${label || 'tanpa label'}`, start: 6.6 + d, dur: 2.2 - d,
        props: { x, y, d: label ? 150 : 120, label, labelSize: 30, labelColor: INK, hue: i * 70 }, anim: { in: { preset: 'pop', dur: 0.5 }, out: flowOut() }
      });
      o.keys = { y: k([[0, y + 20], [2.2 - d, y - 20]]), hue: k([[0, i * 70], [2.2 - d, i * 70 + 90]]) };
    });

    // ---------- 3. kata berserakan (8.8–12.9) ----------
    text('Kata berserakan', 8.8, 2.6, { text: 'Except making it is still painfully slow.', size: 74, boxWidth: 1000 }, { in: { preset: 'scatter', dur: 1.8 }, out: flowOut() });
    text('Except … *still* slow', 11.4, 1.5, { text: 'Except making it is *still* slow.', size: 36 }, { in: flowIn(), out: flowOut() });

    // ---------- 4. jalur titik + kartu gagal (12.9–17.2) ----------
    const path = add('dots', {
      name: 'Jalur keyframe', start: 12.9, dur: 4.3,
      props: { mode: 'path', w: 1760, h: 420, y: 330, count: 11, dotSize: 46, hollow: 0.3, icons: true, iconColor: '#e0566b', waves: 1, color: INK }, anim: { in: none, out: flowOut() }
    });
    path.keys = { progress: k([[0, 0, 'easeOut'], [1.3, 1]]), flow: k([[0, 0, 'linear'], [4.3, 5]]) };
    const card = add('uicard', {
      name: 'Kartu render gagal', start: 13.6, dur: 3.6,
      props: { theme: 'paper', title: 'This week', subtitle: 'Launch video · v12', rows: 'Keyframes | Skipped | red\nRevisions | Skipped | red\nFinal render | Failed | red', x: 1330, y: 780, w: 640, size: 26, rowH: 72 },
      anim: { in: none, out: flowOut() }
    });
    card.keys = { progress: k([[0, 0, 'linear'], [1.2, 1]]) };
    text('Rendering…', 14.1, 1.6, { text: '● Rendering…', size: 26, x: 560, y: 780, align: 'left', boxWidth: 500 }, { in: flowIn(), out: flowOut() });
    text('Re-rendering…', 15.7, 1.5, { text: '● Re-rendering again…', size: 26, x: 560, y: 780, align: 'left', boxWidth: 500 }, { in: flowIn(), out: flowOut() });

    // ---------- 5. angka merah (17.2–20.4) ----------
    const cost = add('counter', { name: 'Biaya berjalan', start: 17.2, dur: 3.2, props: { x: 1180, y: 540, size: 210, color: '#a3192f', lines: 3, ratio: 0.52, fade: 0.42 }, anim: { in: flowIn(), out: flowOut() } });
    cost.keys = { value: k([[0, -380, 'easeOut'], [2.4, -2240]]) };
    text('Menunggu ekspor', 17.4, 3.0, { text: '● Waiting on export…', size: 26, x: 480, y: 540, align: 'left', boxWidth: 500 }, { in: flowIn(), out: flowOut() });

    // ---------- 6. pertanyaan (20.4–24.4) ----------
    text('But what if', 20.4, 2.0, { text: 'But what if there was a studio', size: 42 }, { in: { preset: 'words', dur: 0.8 }, out: flowOut() });
    text('your terms?', 22.4, 2.0, { text: 'that worked on *your terms?*', size: 42, accent: MUTED }, { in: { preset: 'words', dur: 0.6 }, out: flowOut() });

    // ---------- 7. "Well..." (24.4–27.0) ----------
    text('"Well..."', 24.4, 1.3, { text: 'Well...', size: 380, weight: 500, letterSpacing: -14, y: 500 }, { in: { preset: 'zoom', dur: 0.35 }, out: flowOut() });
    text('well… there is.', 25.7, 1.3, { text: 'well… there is.', size: 42 }, { in: flowIn(), out: flowOut() });

    // ---------- latar kertas (0–28.4) ----------
    const paper = add('background', { name: 'Latar kertas', start: 0, dur: 28.4, props: { mode: 'solid', color1: PAPER, color2: PAPER }, anim: { in: none, out: none } });

    // ---------- 8. lanskap + logo (27.0–32.6) ----------
    const landA = add('landscape', { name: 'Lanskap siang', start: 27.0, dur: 5.6, props: { palette: 'day', w: 1000, h: 562, radius: 28, treeX: 0.1 }, anim: { in: { preset: 'fade', dur: 0.25 }, out: none } });
    landA.keys = {
      w: k([[0, 1000], [0.5, 1000], [1.4, 1920, 'easeInOut']]),
      h: k([[0, 562], [0.5, 562], [1.4, 1080, 'easeInOut']]),
      radius: k([[0.5, 28], [1.4, 0]]),
      pan: k([[0, 0, 'linear'], [5.6, -160]])
    };
    const logoA = add('logo', { name: 'Logo Labs Motion (lanskap)', start: 27.3, dur: 2.0, props: { text: 'Labs Motion', size: 110, color: '#ffffff', box: '#ffffff', tri: '#2b4a3a', showReg: false, shadow: 30, shadowColor: '#1d2b22' }, anim: { in: { preset: 'blur', dur: 0.6 }, out: flowOut() } });
    logoA.keys = { scale: k([[0, 92], [2.0, 100]]) };
    text('Motion studio di mesinmu', 29.3, 3.3, {
      text: 'The *motion studio* that lives\non your machine.', size: 76, weight: 500, color: '#ffffff', accent: '#ffffff', accentFont: SERIF, accentItalic: true, shadow: 36, shadowColor: '#1c2a1a'
    }, { in: { preset: 'words', dur: 1.0 }, out: flowOut() });

    // ---------- 9. diagram lingkar (32.6–38.2) ----------
    const landB = add('landscape', { name: 'Lanskap fajar', start: 32.0, dur: 6.2, props: { palette: 'dusk', seed: 9, cypress: false }, anim: { in: fade(0.6), out: none } });
    landB.keys = { pan: k([[0, 60, 'linear'], [6.2, -220]]) };
    const radial = add('radial', { name: 'Diagram fitur', start: 32.6, dur: 5.6, props: { d: 860, labelSize: 30, items: 'Layers, Keyframes, 3D scenes, Voice over, Sound FX, Export', markTri: '#2b4a3a' }, anim: { in: none, out: flowOut() } });
    radial.keys = { progress: k([[0, 0, 'linear'], [2.2, 1]]), spin: k([[0, -20, 'linear'], [5.6, 25]]) };

    // ---------- 10. prompt → editor → ekspor (38.2–44.4) ----------
    const landC = add('landscape', { name: 'Lanskap senja', start: 37.6, dur: 6.8, props: { palette: 'golden', seed: 2, sunX: 0.7, sunY: 0.32, cypress: false }, anim: { in: fade(0.6), out: fade(0.6) } });
    landC.keys = { pan: k([[0, 60, 'linear'], [6.8, -200]]) };
    const prompt = text('Prompt', 38.4, 2.0, {
      text: 'Make a 20-second launch intro with a liquid gradient', size: 32, pill: true, pillColor: '#fbfaf8', pillPad: 26, color: INK, shadow: 30, shadowColor: '#5a3b1c'
    }, { in: { preset: 'typewriter', dur: 1.5 }, out: flowOut() });
    // kotak prompt muncul halus (mesin ketik hanya mengatur huruf)
    prompt.keys = { opacity: k([[0, 0], [0.25, 100]]), scale: k([[0, 96, 'easeOut'], [0.3, 100]]) };
    const screen = add('screen3d', { name: 'Layar editor', start: 40.2, dur: 4.2, props: { content: 'editor', brand: 'Labs Motion', zoom: 1.0, glow: '#fff3e0', glowSize: 40, y: 500 }, anim: { in: flowIn(), out: flowOut() } });
    // tanpa miring → digambar tanpa WebGL, jadi pemutaran tetap mulus; masuknya cukup mengalir + membesar pelan
    screen.keys = { zoom: k([[0, 0.9, 'easeOut'], [0.8, 0.98], [4.2, 1.02]]) };
    const exp = add('uicard', {
      name: 'Kartu ekspor', start: 42.4, dur: 2.0,
      props: { theme: 'glass', title: 'Export', rows: 'launch-intro.mp4 | Ready | mint\n1920 × 1080 · 30 fps | H.264 | gray', x: 1450, y: 830, w: 620, size: 24, rowH: 64, highlight: -1 },
      anim: { in: none, out: flowOut() }
    });
    exp.keys = { progress: k([[0, 0, 'linear'], [0.7, 1]]), highlight: k([[0.3, -1, 'hold'], [0.32, 0, 'hold']]) };
    const cur = add('cursor', { name: 'Kursor', start: 41.6, dur: 2.6, props: { x: 1100, y: 980, size: 54, color1: '#ffffff', color2: '#e9e4dc', glow: 12 }, anim: { in: flowIn(), out: flowOut() } });
    cur.keys = { x: k([[0, 1100], [1.0, 1380]]), y: k([[0, 980], [1.0, 870]]), click: k([[1.05, 0], [1.2, 1], [1.45, 0]]) };

    // ---------- 11. kata bergulir (44.4–47.2) ----------
    const roll = add('wordroll', { name: 'Kata bergulir', start: 44.4, dur: 2.8, props: { prefix: 'So your ideas keep', words: 'growing, shipping, rendering, moving', size: 64, color: '#eef3f0', accent: MINT, ghost: 0.25 }, anim: { in: flowIn(), out: flowOut() } });
    roll.keys = { index: k([[0, 0], [0.35, 0], [1.25, 3, 'easeOut']]) };

    // ---------- 12. kalimat penutup (47.2–50.6) ----------
    const future = text('The future of motion work', 47.2, 3.4, {
      text: 'The future of *motion work*\narrived early.', size: 66, color: '#eef3f0', accent: MINT, accentFont: SERIF, accentItalic: true
    }, { in: { preset: 'words', dur: 1.0 }, out: flowOut() });
    // kalimat naik saat jendela gunung muncul di bawahnya, jadi tidak bertumpuk
    future.keys = { y: k([[1.6, 540], [2.3, 290]]) };
    const win = add('landscape', { name: 'Jendela gunung', start: 49.0, dur: 1.6, props: { palette: 'mountain', w: 820, h: 460, radius: 24, seed: 6, y: 690 }, anim: { in: flowIn(), out: flowOut() } });
    win.keys = { scale: k([[0, 96], [1.6, 100]]), pan: k([[0, 0, 'linear'], [1.6, -60]]) };

    // ---------- 13. logo penutup (50.6–54) ----------
    const logo = add('logo', { name: 'Logo penutup', start: 50.6, dur: 3.4, props: { text: 'Labs Motion', size: 110, color: '#ffffff', box: '#ffffff', tri: DARK, showReg: false, y: 520 }, anim: { in: { preset: 'blur', dur: 0.6 }, out: none } });
    logo.keys = { scale: k([[0, 96], [3.4, 101]]) };
    text('Tagline', 51.8, 2.2, { text: 'Your studio. Your machine.', size: 30, color: '#9fb3aa', y: 640 }, { in: flowIn(), out: none });

    // ---------- latar gelap (44.4–54) ----------
    const dark = add('background', { name: 'Latar hijau tua', start: 44.4, dur: 9.6, props: { mode: 'radial', color1: '#12281f', color2: DARK }, anim: { in: none, out: none } });

    // urutan: kursor paling depan; jendela gunung di belakang kalimat penutup; latar paling belakang
    const front = L.filter((l) => ![cur, paper, dark, landA, landB, landC, win].includes(l));
    const closing = front.find((l) => l.name === 'The future of motion work');
    const rest = front.filter((l) => l !== closing);
    const sfx = SFX.map(([t, sound, volume, label, dur, count]) =>
      newLayer('sfx', c, { name: `SFX · ${label}`, start: t, dur: dur || 1, props: { sound, volume, ...(count ? { count } : {}) }, anim: { in: none, out: none } }));
    // kartu ekspor di depan layar editor
    doc.layers = [cur, exp, closing, win, ...rest.filter((l) => l !== exp), ...sfx, landC, landB, landA, paper, dark];
    return doc;
  }
};
