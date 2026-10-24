// Pose = kumpulan sudut (radian). Untuk lengan: sz positif = ke luar badan,
// sx negatif = maju ke depan, el negatif = siku menekuk. Nilai yang tidak
// disebut memakai DEFAULT_POSE.

export const DEFAULT_POSE = {
  'root.x': 0, 'root.y': 0, 'root.z': 0, 'root.ry': 0,
  'spine.x': 0, 'spine.y': 0, 'spine.z': 0,
  'head.x': 0, 'head.y': 0, 'head.z': 0,
  'aP.sx': 0.05, 'aP.sy': 0, 'aP.sz': 0.14, 'aP.el': -0.18, 'aP.wx': 0, 'aP.wy': 0, 'aP.wz': 0, 'aP.curl': 0.6, 'aP.idx': 0.6,
  'aN.sx': 0.05, 'aN.sy': 0, 'aN.sz': 0.14, 'aN.el': -0.18, 'aN.wx': 0, 'aN.wy': 0, 'aN.wz': 0, 'aN.curl': 0.6, 'aN.idx': 0.6,
  'lP.hx': 0, 'lP.hz': 0.02, 'lP.kx': 0, 'lP.ax': 0,
  'lN.hx': 0, 'lN.hz': 0.02, 'lN.kx': 0, 'lN.ax': 0
};

const arm = (side, o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`${side}.${k}`, v]));

export const POSES = {
  idle: {},

  explain: {
    'spine.y': -0.08,
    ...arm('aN', { sx: -0.75, sz: 0.38, sy: 0.35, el: -1.15, curl: 0.15, idx: 0.1, wz: 0.3 }),
    ...arm('aP', { sx: -0.55, sz: 0.42, sy: 0.25, el: -1.0, curl: 0.15, idx: 0.1, wz: 0.3 }),
    'head.z': 0.05
  },

  point: {
    'spine.y': 0.22, 'head.y': -0.2, 'head.z': 0.06, 'head.x': 0.04,
    ...arm('aN', { sx: -1.2, sz: 0.55, el: -0.12, curl: 1.4, idx: 0, wy: 0.2 }),
    ...arm('aP', { sx: 0.1, sz: 0.2, el: -0.3 })
  },

  control: {
    'spine.x': 0.08, 'spine.y': 0.25, 'head.y': -0.22, 'head.x': 0.05,
    ...arm('aN', { sx: -1.25, sz: 0.5, el: -0.25, curl: 0.12, idx: 0.05, wx: 0, wz: 0.9 }),
    ...arm('aP', { sx: 0.25, sz: 0.3, el: -0.6, curl: 1.2, idx: 1.2 })
  },

  think: {
    'head.z': 0.12, 'head.x': -0.06, 'head.y': -0.1,
    ...arm('aN', { sx: -1.0, sz: -0.1, sy: -0.6, el: -1.95, curl: 1.3, idx: 0.25, wx: 0.3 }),
    ...arm('aP', { sx: -0.55, sz: 0.1, sy: -0.9, el: -1.55, curl: 1.0 })
  },

  sit: {
    'root.y': -0.16,
    'lP.hx': -1.5, 'lP.kx': 1.45, 'lP.hz': 0.08,
    'lN.hx': -1.5, 'lN.kx': 1.45, 'lN.hz': 0.08,
    'spine.x': -0.05,
    ...arm('aP', { sx: -0.7, sz: 0.18, el: -0.35, curl: 0.5 }),
    ...arm('aN', { sx: -1.0, sz: -0.1, sy: -0.6, el: -1.95, curl: 1.3, idx: 0.3, wx: 0.3 }),
    'head.z': 0.08
  },

  lookBack: {
    'root.ry': Math.PI, 'spine.y': 0.45, 'head.y': 1.1, 'head.x': 0.05,
    ...arm('aP', { sx: 0.12, sz: 0.1, el: -0.4 }),
    ...arm('aN', { sx: 0.12, sz: 0.1, el: -0.4 })
  },

  doa: {
    'head.x': 0.22,
    ...arm('aN', { sx: -0.85, sz: 0.2, sy: 0.6, el: -1.25, curl: 0.25, idx: 0.2, wx: -0.3 }),
    ...arm('aP', { sx: -0.85, sz: 0.2, sy: 0.6, el: -1.25, curl: 0.25, idx: 0.2, wx: -0.3 })
  },

  shrug: {
    'head.z': 0.16, 'head.x': -0.03,
    ...arm('aN', { sx: -0.35, sz: 0.7, sy: 0.4, el: -1.35, curl: 0.1, idx: 0.1, wz: 0.4 }),
    ...arm('aP', { sx: -0.35, sz: 0.7, sy: 0.4, el: -1.35, curl: 0.1, idx: 0.1, wz: 0.4 })
  },

  heart: {
    'head.x': 0.1, 'head.z': -0.08,
    ...arm('aN', { sx: -0.65, sz: -0.12, sy: -0.6, el: -1.75, curl: 0.2, idx: 0.2 }),
    ...arm('aP', { sx: 0.05, sz: 0.14, el: -0.2 })
  },

  float: {
    'root.y': 0.35, 'spine.x': 0.06, 'spine.y': 0.2, 'head.y': -0.18,
    'lN.hx': -0.9, 'lN.kx': 1.4, 'lP.hx': 0.15, 'lP.kx': 0.55,
    ...arm('aN', { sx: -1.25, sz: 0.5, el: -0.25, curl: 0.12, idx: 0.05, wz: 0.9 }),
    ...arm('aP', { sx: 0.2, sz: 0.55, el: -0.6, curl: 1.1, idx: 1.1 })
  }
};

export function resolvePose(name) {
  return { ...DEFAULT_POSE, ...(POSES[name] || {}) };
}

export function blendPose(a, b, k) {
  const out = {};
  for (const key in DEFAULT_POSE) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}
