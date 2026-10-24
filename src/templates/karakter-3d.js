import { newMotionDoc, newLayer } from '../motion/doc.js';

export default {
  id: 'karakter-3d',
  name: 'Karakter 3D + teks',
  description: 'Karakter chibi 3D transparan di atas latar, plus judul beranimasi.',
  kind: 'motion',
  order: 3,
  create({ id, name, size }) {
    const doc = newMotionDoc({ id, name, size, duration: 8 });
    const c = doc.comp;
    const portrait = c.height > c.width;
    const charSize = portrait ? c.width : Math.round(c.height * 0.95);
    const chibi = newLayer('chibi3d', c, {
      name: 'Karakter',
      props: {
        w: charSize, h: charSize, expr: 'sinis', pose: 'point', shot: 'medium', talking: true,
        x: portrait ? c.width / 2 : c.width * 0.7, y: portrait ? c.height * 0.62 : c.height / 2
      },
      anim: { in: { preset: 'pop', dur: 0.7 }, out: { preset: 'none', dur: 0.4 } }
    });
    const title = newLayer('text', c, {
      name: 'Judul', start: 0.4, dur: 7.6,
      props: {
        text: 'Ngejar dunia,\n*lupa pulang?*', size: portrait ? 120 : 130, align: portrait ? 'center' : 'left',
        boxWidth: portrait ? Math.round(c.width * 0.86) : Math.round(c.width * 0.45),
        x: portrait ? c.width / 2 : c.width * 0.29, y: portrait ? c.height * 0.22 : c.height / 2, stroke: 10
      },
      anim: { in: { preset: 'words', dur: 1 }, out: { preset: 'fade', dur: 0.4 } }
    });
    doc.layers.push(title, chibi, newLayer('background', c, { name: 'Latar', props: { mode: 'radial', color1: '#3a2817', color2: '#07070a' } }));
    return doc;
  }
};
