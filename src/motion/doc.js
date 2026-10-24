// Membuat dokumen komposisi & layer baru.
import { getLayerDef } from './registry.js';

let uid = 0;
export const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export const SIZES = {
  landscape: { width: 1920, height: 1080, label: 'YouTube 16:9 (1920×1080)' },
  portrait: { width: 1080, height: 1920, label: 'Shorts / Reels / TikTok 9:16 (1080×1920)' },
  square: { width: 1080, height: 1080, label: 'Kotak 1:1 (1080×1080)' },
  feed: { width: 1080, height: 1350, label: 'Feed Instagram 4:5 (1080×1350)' }
};

export function newMotionDoc({ id, name, size = 'landscape', fps = 30, duration = 10, background = '#0c0c0e' }) {
  const s = SIZES[size] || SIZES.landscape;
  const now = new Date().toISOString();
  return {
    version: 1,
    type: 'motion',
    id,
    name,
    created: now,
    updated: now,
    comp: { width: s.width, height: s.height, fps, duration, background },
    layers: []
  };
}

export function newLayer(type, comp, { name, start = 0, dur, props = {}, keys, anim } = {}) {
  const def = getLayerDef(type);
  return {
    id: newId('l'),
    type,
    name: name || def?.name || type,
    start,
    dur: dur ?? comp.duration - start,
    offset: 0,
    hidden: false,
    locked: false,
    props: { x: comp.width / 2, y: comp.height / 2, ...props },
    keys: keys || {},
    anim: anim || { in: { preset: type === 'text' ? 'fadeUp' : 'none', dur: 0.6 }, out: { preset: 'none', dur: 0.4 } }
  };
}
