// Intro aplikasi bergaya "liquid gradient" (navy), 20 detik, bahasa Inggris.
// Alur meniru video promo produk: garis & bingkai tergambar → judul per kata → logo →
// layar aplikasi 3D naik → fitur demi fitur dengan kursor → latar menggelap → kalimat penutup → logo.
import { newMotionDoc, newLayer } from '../motion/doc.js';

const WHITE = '#ffffff';
const SOFT = '#cfe3ff';
const ACCENT = '#9fd0ff'; // aksen di latar gelap
const ACCENT_LIGHT = '#0e2f8f'; // aksen di latar terang (navy pekat supaya terbaca)
const FONT = 'Plus Jakarta Sans';

// keyframe singkat: k([[t, v, ease], ...]) → t relatif terhadap awal layer
const k = (list) => list.map(([t, v, ease]) => ({ t, v, ease: ease || 'easeInOut' }));
const none = { preset: 'none', dur: 0.4 };

// efek suara yang menempel pada setiap transisi: [detik, suara, volume %, nama, durasi]
const SFX = [
  [0.0, 'whoosh', 45, 'Garis tergambar'],
  [0.3, 'whoosh', 35, 'Garis kedua'],
  [1.0, 'pop', 70, 'Bingkai judul'],
  [1.2, 'click', 70, 'Balok aksen kiri'],
  [1.45, 'click', 60, 'Balok aksen kanan'],
  [2.25, 'shimmer', 55, '"arrived."'],
  [2.95, 'whoosh', 80, 'Bingkai menyusut'],
  [3.6, 'shimmer', 70, 'Meet the new'],
  [4.45, 'whooshUp', 85, 'Layar editor naik'],
  [7.75, 'whoosh', 75, 'Ganti ke timeline'],
  [8.65, 'click', 90, 'Kursor ambil keyframe'],
  [9.8, 'click', 70, 'Kursor lepas keyframe'],
  [9.4, 'riser', 45, 'Latar menggelap', 1.3],
  [10.7, 'sub', 80, 'Masuk adegan gelap'],
  [10.65, 'whoosh', 70, 'Ganti ke daftar layer'],
  [11.75, 'click', 90, 'Kursor pilih layer'],
  [13.35, 'whoosh', 75, 'Ganti ke ekspor'],
  [13.9, 'pop', 70, 'Pil resolusi'],
  [14.2, 'pop', 70, 'Pil MP4'],
  [14.12, 'click', 85, 'Klik Export di layar'],
  [15.25, 'click', 90, 'Klik pil MP4'],
  [15.85, 'chime', 60, 'Render selesai'],
  [16.0, 'whoosh', 50, 'Kalimat penutup'],
  [17.1, 'riser', 55, 'Menjelang logo', 0.7],
  [17.8, 'sub', 90, 'Logo muncul'],
  [17.85, 'chime', 80, 'Logo berkilau'],
  [17.9, 'shimmer', 60, 'Kilau logo']
];

export function introSfxLayers(comp) {
  return SFX.map(([t, sound, volume, label, dur]) =>
    newLayer('sfx', comp, { name: `SFX · ${label}`, start: t, dur: dur || 1, props: { sound, volume }, anim: { in: none, out: none } }));
}

export default {
  id: 'intro-liquid',
  name: 'Intro aplikasi (liquid gradient)',
  description: 'Promo 20 detik gaya liquid gradient navy: judul per kata, layar aplikasi 3D, fitur, dan logo penutup.',
  kind: 'motion',
  order: 3,
  create({ id, name }) {
    const doc = newMotionDoc({ id, name, size: 'landscape', duration: 20, fps: 30, background: '#050b1c' });
    const c = doc.comp;
    const L = [];
    const add = (type, o) => {
      const l = newLayer(type, c, o);
      L.push(l);
      return l;
    };
    const text = (o, props) => add('text', {
      ...o,
      props: { font: FONT, weight: 600, color: WHITE, accent: ACCENT, chipStroke: SOFT, chipFill: '#ffffff14', ...props }
    });

    // ---------- 1. garis & bingkai (0–3.3 dtk) ----------
    const boxL = 430;
    const lineA = add('lines', { name: 'Garis silang 1', start: 0, dur: 3.1, props: { mode: 'cross', x: 1250, y: 330, width: 1.5, color: WHITE, opacity: 55 }, anim: { in: none, out: { preset: 'fade', dur: 0.3 } } });
    lineA.keys = { progress: k([[0, 0, 'easeOut'], [1.0, 1]]), x: k([[0, 1250], [1.2, 1250], [1.9, boxL]]), y: k([[0, 330], [1.2, 330], [1.9, 465]]) };
    const lineB = add('lines', { name: 'Garis silang 2', start: 0.25, dur: 2.85, props: { mode: 'cross', x: 640, y: 760, width: 1.5, color: WHITE, opacity: 45 }, anim: { in: none, out: { preset: 'fade', dur: 0.3 } } });
    lineB.keys = { progress: k([[0, 0, 'easeOut'], [1.0, 1]]), x: k([[0, 640], [0.95, 640], [1.65, boxL + 1060]]), y: k([[0, 760], [0.95, 760], [1.65, 615]]) };

    const box = add('lines', { name: 'Bingkai judul', start: 0.9, dur: 2.15, props: { mode: 'box', x: boxL + 260, y: 540, w: 520, h: 150, width: 2, color: WHITE, opacity: 85 }, anim: { in: none, out: { preset: 'fade', dur: 0.2 } } });
    box.keys = { progress: k([[0, 0, 'easeOut'], [0.7, 1]]), w: k([[0.6, 520], [1.5, 1060]]), x: k([[0.6, boxL + 260], [1.5, boxL + 530]]) };
    text({ name: 'Judul: Motion Studio has arrived.', start: 1.05, dur: 2.0, anim: { in: { preset: 'words', dur: 1.3 }, out: { preset: 'blur', dur: 0.3 } } },
      { text: 'Motion Studio has *arrived.*', size: 84, align: 'left', boxWidth: 1100, x: boxL + 40 + 550, y: 540, accent: ACCENT_LIGHT });
    const blockA = add('shape', { name: 'Balok aksen kiri', start: 1.2, dur: 1.85, props: { w: 46, h: 36, radius: 6, fill: '#7cc4ff', x: boxL - 18, y: 455, opacity: 85 }, anim: { in: { preset: 'pop', dur: 0.4 }, out: { preset: 'fade', dur: 0.2 } } });
    blockA.keys = { x: k([[0, boxL - 18], [0.6, boxL + 6]]) };
    const blockB = add('shape', { name: 'Balok aksen kanan', start: 1.45, dur: 1.6, props: { w: 150, h: 40, radius: 6, fill: '#3d7bff', x: boxL + 600, y: 612, opacity: 80 }, anim: { in: { preset: 'slideLeft', dur: 0.45 }, out: { preset: 'fade', dur: 0.2 } } });
    blockB.keys = { x: k([[0, boxL + 600], [1.3, boxL + 930]]) };

    // bingkai menyusut jadi balok lalu jadi kotak kecil (calon logo)
    const morph = add('shape', { name: 'Morf ke logo', start: 2.95, dur: 0.9, props: { w: 1000, h: 110, radius: 14, fill: '#ffffff', x: 960, y: 540, opacity: 30 }, anim: { in: none, out: { preset: 'fade', dur: 0.15 } } });
    morph.keys = {
      w: k([[0, 1000, 'easeIn'], [0.35, 560, 'easeOut'], [0.75, 70]]),
      h: k([[0, 110], [0.35, 64], [0.75, 70]]),
      opacity: k([[0, 30], [0.75, 95]]),
      blur: k([[0, 0], [0.3, 6], [0.75, 0]])
    };

    // ---------- 2. "Meet the new [logo] motion studio" (3.6–6.6) ----------
    const meet = text({ name: 'Meet the new motion studio', start: 3.6, dur: 3.0, anim: { in: { preset: 'words', dur: 0.8 }, out: { preset: 'fade', dur: 0.35 } } },
      { text: 'Meet the new {logo} motion studio', size: 78, weight: 400, boxWidth: 1600, x: 960, y: 540, logoTri: '#0b1838' });
    meet.keys = { blur: k([[0, 16], [0.5, 0]]), y: k([[0, 540], [1.1, 540], [1.9, 230]]) };

    const scr1 = add('screen3d', { name: 'Layar editor 3D', start: 4.5, dur: 3.6, props: { content: 'editor', x: 960, y: 1500 }, anim: { in: none, out: none } });
    scr1.keys = {
      y: k([[0, 1500, 'easeOut'], [1.1, 690], [3.6, 640]]),
      rotX: k([[0, 42], [1.3, 18], [3.6, 9]]),
      zoom: k([[0, 1.3], [3.6, 1.42]]),
      blur: k([[0, 14], [0.7, 0], [3.1, 0], [3.6, 22]]),
      opacity: k([[3.2, 100], [3.6, 0]])
    };

    // ---------- 3. keyframe (8.0–10.8) ----------
    const scr2 = add('screen3d', { name: 'Layar timeline 3D', start: 7.9, dur: 3.0, props: { content: 'timeline', x: 700, y: 560 }, anim: { in: none, out: none } });
    scr2.keys = {
      rotY: k([[0, 34], [3.0, 16]]),
      rotX: k([[0, 8], [3.0, 4]]),
      zoom: k([[0, 1.05], [3.0, 1.18]]),
      x: k([[0, 760], [3.0, 680]]),
      blur: k([[0, 18], [0.5, 0], [2.6, 0], [3.0, 20]]),
      opacity: k([[0, 0], [0.35, 100], [2.7, 100], [3.0, 0]])
    };
    text({ name: 'Keyframe every detail', start: 8.4, dur: 2.4, anim: { in: { preset: 'words', dur: 0.9 }, out: { preset: 'blur', dur: 0.35 } } },
      { text: 'Keyframe\n*every* detail', size: 70, weight: 600, boxWidth: 640, align: 'left', x: 1560, y: 540, accent: ACCENT_LIGHT });

    // ---------- 4. layer (10.8–13.4), latar mulai gelap ----------
    const scr3 = add('screen3d', { name: 'Layar daftar layer 3D', start: 10.7, dur: 2.8, props: { content: 'layers', x: 760, y: 560 }, anim: { in: none, out: none } });
    scr3.keys = {
      rotY: k([[0, -26], [2.8, -12]]),
      rotX: k([[0, 10], [2.8, 4]]),
      zoom: k([[0, 1.0], [2.8, 1.12]]),
      x: k([[0, 1240], [2.8, 1180]]),
      blur: k([[0, 18], [0.5, 0], [2.4, 0], [2.8, 20]]),
      opacity: k([[0, 0], [0.35, 100], [2.5, 100], [2.8, 0]])
    };
    text({ name: 'Text, shapes, 3D & voice', start: 11.2, dur: 2.2, anim: { in: { preset: 'words', dur: 0.9 }, out: { preset: 'blur', dur: 0.35 } } },
      { text: 'Text, shapes,\n*3D* & voice', size: 70, weight: 600, boxWidth: 640, align: 'left', x: 560, y: 540 });

    // ---------- 5. ekspor (13.5–16.0) ----------
    const scr4 = add('screen3d', { name: 'Layar ekspor 3D', start: 13.4, dur: 2.7, props: { content: 'export', x: 1100, y: 560 }, anim: { in: none, out: none } });
    scr4.keys = {
      rotY: k([[0, -18], [2.7, -8]]),
      rotX: k([[0, 12], [2.7, 6]]),
      zoom: k([[0, 1.02], [2.7, 1.14]]),
      blur: k([[0, 16], [0.45, 0], [2.3, 0], [2.7, 18]]),
      opacity: k([[0, 0], [0.3, 100], [2.4, 100], [2.7, 0]])
    };
    add('pill', { name: 'Pil resolusi', start: 13.9, dur: 2.1, props: { text: '1920 × 1080 · 60 fps', icon: 'sparkle', size: 30, x: 380, y: 440, fill: '#0c1838', stroke: '#6fa8ff' }, anim: { in: { preset: 'pop', dur: 0.5 }, out: { preset: 'fade', dur: 0.3 } } });
    add('pill', { name: 'Pil MP4', start: 14.2, dur: 1.8, props: { text: 'Export MP4', icon: 'download', size: 30, x: 380, y: 540, fill: '#2f6bff', stroke: '#9fd0ff' }, anim: { in: { preset: 'pop', dur: 0.5 }, out: { preset: 'fade', dur: 0.3 } } });
    const cur = add('cursor', { name: 'Kursor klik MP4', start: 14.5, dur: 1.5, props: { x: 640, y: 760, size: 60 }, anim: { in: { preset: 'fade', dur: 0.2 }, out: { preset: 'fade', dur: 0.3 } } });
    cur.keys = { x: k([[0, 640], [0.6, 450]]), y: k([[0, 760], [0.6, 560]]), click: k([[0.6, 0], [0.75, 1], [1.0, 0]]) };

    // ---------- 6. kalimat penutup (16.0–17.8) ----------
    text({ name: 'Built for creators', start: 16.0, dur: 1.85, anim: { in: { preset: 'words', dur: 0.9 }, out: { preset: 'blur', dur: 0.35 } } },
      { text: 'The Motion Studio {logo} editor, built for [creators]', size: 58, weight: 400, boxWidth: 1700, x: 960, y: 540, logoTri: '#0b1838' });

    // ---------- 7. logo penutup (17.8–20) ----------
    const logo = add('logo', { name: 'Logo penutup', start: 17.8, dur: 2.2, props: { text: 'motion studio', size: 150, x: 960, y: 540 }, anim: { in: { preset: 'zoom', dur: 0.8 }, out: none } });
    logo.keys = { blur: k([[0, 24], [0.6, 0]]), markSpin: k([[0, -120], [0.8, 0]]), scale: k([[0, 100], [2.2, 104]]) };

    // ---------- latar ----------
    const bg = add('liquid', { name: 'Liquid gradient navy', start: 0, dur: 20, anim: { in: none, out: none } });
    bg.keys = {
      dark: k([[0, 0], [9.4, 0], [11.2, 0.93], [20, 0.93]]),
      blobSize: k([[0, 1.15], [20, 0.85]])
    };

    // urutan: yang dibuat lebih dulu di atas, latar paling bawah; kursor selalu paling depan
    const visual = L.filter((l) => l !== cur && l !== bg);
    doc.layers = [cur, ...visual, ...introSfxLayers(c), bg];
    return doc;
  }
};
