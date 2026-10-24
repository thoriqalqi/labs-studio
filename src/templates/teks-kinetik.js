import { newMotionDoc, newLayer } from '../motion/doc.js';

export default {
  id: 'teks-kinetik',
  name: 'Teks kinetik',
  description: 'Kalimat muncul bergantian per kata, cocok untuk hook atau kutipan.',
  kind: 'motion',
  order: 2,
  create({ id, name, size }) {
    const doc = newMotionDoc({ id, name, size, duration: 9 });
    const c = doc.comp;
    const portrait = c.height > c.width;
    const big = portrait ? 120 : 140;
    const lines = [
      ['Kamu bilang', '*sibuk.*'],
      ['Padahal cuma', '*takut mulai.*'],
      ['Mulai hari ini.', '']
    ];
    const layers = [];
    lines.forEach(([a, b], i) => {
      layers.push(newLayer('text', c, {
        name: `Kalimat ${i + 1}`,
        start: i * 3,
        dur: 3,
        props: { text: b ? `${a}\n${b}` : a, size: big, boxWidth: Math.round(c.width * 0.85) },
        anim: { in: { preset: 'words', dur: 0.9 }, out: { preset: 'fadeUp', dur: 0.35 } }
      }));
    });
    // garis aksen yang memanjang (contoh keyframe)
    const line = newLayer('shape', c, {
      name: 'Garis aksen', start: 0, dur: 9,
      props: { shape: 'rect', w: 10, h: 8, radius: 4, fill: '#d9822b', y: c.height / 2 + (portrait ? 260 : 210) },
      anim: { in: { preset: 'none', dur: 0.5 }, out: { preset: 'fade', dur: 0.4 } }
    });
    line.keys = { w: [{ t: 0, v: 10, ease: 'easeOut' }, { t: 1.2, v: portrait ? 420 : 520, ease: 'easeInOut' }] };
    doc.layers.push(...layers.reverse(), line,
      newLayer('background', c, { name: 'Latar', props: { mode: 'radial', color1: '#2b1c12', color2: '#07070a' } }));
    return doc;
  }
};
