// Keyframe & easing. Keyframe disimpan per properti di layer.keys[nama] = [{ t, v, ease }],
// t = detik di dalam layer (waktu konten), ease = easing menuju keyframe berikutnya.

const backOut = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
const bounceOut = (x) => {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

export const EASINGS = {
  easeInOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  easeOut: (x) => 1 - Math.pow(1 - x, 3),
  easeIn: (x) => x * x * x,
  linear: (x) => x,
  back: backOut,
  bounce: bounceOut,
  hold: () => 0
};

export const EASE_LABEL = {
  easeInOut: 'Halus (masuk & keluar)',
  easeOut: 'Melambat di akhir',
  easeIn: 'Mempercepat',
  linear: 'Linear',
  back: 'Membal (overshoot)',
  bounce: 'Memantul',
  hold: 'Tahan (lompat)'
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));

function lerpColor(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const mix = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * k);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`;
}

export function interpolate(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (typeof a === 'string' && /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b)) return lerpColor(a, b, clamp01(k));
  return k < 1 ? a : b;
}

export function valueAt(keys, t, fallback) {
  if (!keys || !keys.length) return fallback;
  if (t <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.t && t < b.t) {
      const e = EASINGS[a.ease] || EASINGS.easeInOut;
      return interpolate(a.v, b.v, e((t - a.t) / (b.t - a.t)));
    }
  }
  return last.v;
}

const SAME = 1 / 120;

export function keyIndex(layer, prop, t) {
  return (layer.keys?.[prop] || []).findIndex((k) => Math.abs(k.t - t) < SAME);
}

export function setKey(layer, prop, t, v, ease) {
  layer.keys = layer.keys || {};
  const list = (layer.keys[prop] = layer.keys[prop] || []);
  const i = list.findIndex((k) => Math.abs(k.t - t) < SAME);
  if (i >= 0) {
    list[i].v = v;
    if (ease) list[i].ease = ease;
  } else {
    list.push({ t: Math.round(t * 1000) / 1000, v, ease: ease || 'easeInOut' });
    list.sort((a, b) => a.t - b.t);
  }
}

export function removeKey(layer, prop, t) {
  const list = layer.keys?.[prop];
  if (!list) return;
  const i = list.findIndex((k) => Math.abs(k.t - t) < SAME);
  if (i >= 0) list.splice(i, 1);
  if (!list.length) delete layer.keys[prop];
}

// semua waktu keyframe layer (untuk titik di timeline & navigasi)
export function allKeyTimes(layer) {
  const set = new Set();
  for (const list of Object.values(layer.keys || {})) for (const k of list) set.add(k.t);
  return [...set].sort((a, b) => a - b);
}
