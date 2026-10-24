// Efek suara sintetis (whoosh, klik, chime, dll.) — tidak perlu file audio.
// Berbunyi di awal layer; untuk suara panjang (riser, dengung, angin) panjangnya = durasi layer.
import { SFX_LIST } from '../../catalog.js';

const SOUNDS = Object.fromEntries(Object.entries(SFX_LIST).filter(([k]) => k !== 'azan'));

export default {
  type: 'sfx',
  name: 'Efek suara',
  icon: '✦',
  category: 'Media',
  order: 12,
  audio: true,
  defaultDur: 1,
  defaults: { sound: 'whoosh', volume: 100, count: 1 },
  schema: [
    { key: 'sound', label: 'Suara', kind: 'select', options: SOUNDS },
    { key: 'volume', label: 'Volume %', kind: 'number', min: 0, max: 200, step: 5 },
    { key: 'count', label: 'Ulang (detak jam / jantung)', kind: 'number', min: 1, max: 20, step: 1 }
  ],
  size: () => ({ w: 0, h: 0 })
};
