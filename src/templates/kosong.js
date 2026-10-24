import { newMotionDoc, newLayer } from '../motion/doc.js';

export default {
  id: 'kosong',
  name: 'Komposisi kosong',
  description: 'Mulai dari nol dengan satu latar.',
  kind: 'motion',
  order: 1,
  create({ id, name, size }) {
    const doc = newMotionDoc({ id, name, size, duration: 10 });
    doc.layers.push(newLayer('background', doc.comp, { name: 'Latar', props: { mode: 'radial', color1: '#1d1d24', color2: '#08080a' } }));
    return doc;
  }
};
