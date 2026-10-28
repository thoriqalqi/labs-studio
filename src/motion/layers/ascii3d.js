// Bentuk 3D dari karakter ASCII: bentuk dihitung dengan raymarch (SDF), tiap sel grid diukur terangnya lalu
// diganti huruf . / 1 X @ ; tepi yang membelakangi lampu jadi # biru (cahaya tepi).
// "morph" 0 → 1 = berubah dari "shape" ke "shape2". "reveal" 0 → 1 = sel muncul acak (seed tetap) dengan
// kilatan huruf di garis depannya. Hasil hitungan di-cache per kombinasi sudut/morph supaya pemutaran ringan.

const SHAPES = { hand: 'Tangan', blob: 'Bola cair', torus: 'Donat', twist: 'Prisma terpilin', cross: 'Salib 3D', cube: 'Kubus' };
const RAMP = ['.', '/', '1', 'X', '@'];

const abs = Math.abs, max = Math.max, min = Math.min, hyp = Math.hypot, sin = Math.sin, cos = Math.cos;
function box(x, y, z, bx, by, bz, r) {
  const qx = abs(x) - bx + r, qy = abs(y) - by + r, qz = abs(z) - bz + r;
  return hyp(max(qx, 0), max(qy, 0), max(qz, 0)) + min(max(qx, max(qy, qz)), 0) - r;
}
function cap(x, y, z, ax, ay, az, bx, by, bz, r) {
  const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az;
  const h = max(0, min(1, (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz)));
  return hyp(px - dx * h, py - dy * h, pz - dz * h) - r;
}
function smin(a, b, k) {
  const h = max(k - abs(a - b), 0) / k;
  return min(a, b) - h * h * k * 0.25;
}
// jari tangan: [x pangkal, y pangkal, panjang, tebal, condong ke samping]
const FINGERS = [
  [-0.27, 0.02, 0.7, 0.085, -0.1],
  [-0.09, 0.06, 0.84, 0.088, -0.01],
  [0.09, 0.04, 0.78, 0.085, 0.04],
  [0.26, -0.02, 0.58, 0.075, 0.14]
];

const SDF = {
  blob: (x, y, z) => hyp(x, y, z) - 0.8 + 0.09 * sin(4 * x + 0.5) * sin(4 * y + 1) * sin(4 * z),
  torus: (x, y, z) => hyp(hyp(x, z) - 0.6, y) - 0.27,
  twist: (x, y, z) => {
    const a = y * 1.4, c = cos(a), s = sin(a);
    return box(c * x - s * z, y, s * x + c * z, 0.34, 0.95, 0.34, 0.04);
  },
  cross: (x, y, z) => min(box(x, y, z, 0.85, 0.25, 0.25, 0.04), min(box(x, y, z, 0.25, 0.85, 0.25, 0.04), box(x, y, z, 0.25, 0.25, 0.85, 0.04))),
  cube: (x, y, z) => box(x, y, z, 0.62, 0.62, 0.62, 0.06),
  hand: (x, y, z, g = 0) => {
    // tangan kanan, telapak menghadap kamera. g = genggam 0 (terbuka) → 1 (mengepal):
    // tiap jari menekuk di dua ruas ke arah kamera lalu ke bawah, jempol melipat menyilang di depan jari
    let d = box(x, y + 0.28, z, 0.38, 0.36, 0.1, 0.1);
    const a1 = g * 1.45, a2 = a1 + g * 1.65;
    for (const [bx, by, len, r, sx] of FINGERS) {
      const l1 = len * 0.48, l2 = len * 0.52, s = sx * (1 - g);
      const jx = bx + l1 * s, jy = by + l1 * cos(a1), jz = -l1 * sin(a1);
      const tx = jx + l2 * s, ty = jy + l2 * cos(a2), tz = jz - l2 * sin(a2);
      d = smin(d, cap(x, y, z, bx, by, 0, jx, jy, jz, r), 0.06);
      d = smin(d, cap(x, y, z, jx, jy, jz, tx, ty, tz, r * 0.96), 0.03);
    }
    const lerp = (a, b) => a + (b - a) * g;
    const jx = lerp(-0.53, -0.44), jy = lerp(-0.13, -0.14), jz = lerp(-0.03, -0.3);
    const tx = lerp(-0.72, -0.06), ty = lerp(0.06, -0.12), tz = lerp(-0.06, -0.47);
    d = smin(d, cap(x, y, z, -0.34, -0.32, 0, jx, jy, jz, 0.1), 0.08);
    d = smin(d, cap(x, y, z, jx, jy, jz, tx, ty, tz, 0.092), 0.03);
    d = smin(d, cap(x, y, z, 0, -0.62, 0, 0, -1.3, 0, 0.25), 0.12);
    return d;
  }
};

const norm = (v) => {
  const l = hyp(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

// kode warna per sel: 0 = latar, 1..5 = ramp, 6 = tepi biru terang, 7 = tepi biru gelap
function compute(shape, shape2, morph, cols, rows, yawDeg, pitchDeg, zoom, grip = 0) {
  const sa = SDF[shape] || SDF.hand;
  const sb = SDF[shape2] || sa;
  const fa = (x, y, z) => sa(x, y, z, grip);
  const fb = (x, y, z) => sb(x, y, z, grip);
  const k = Math.max(0, Math.min(1, morph));
  const sdf = k <= 0.001 ? fa : k >= 0.999 ? fb : (x, y, z) => fa(x, y, z) * (1 - k) + fb(x, y, z) * k;
  const ya = (yawDeg * Math.PI) / 180, pa = (pitchDeg * Math.PI) / 180;
  const c1 = cos(ya), s1 = sin(ya), c2 = cos(pa), s2 = sin(pa);
  const rot = (x, y, z) => {
    const x1 = c1 * x + s1 * z, z1 = -s1 * x + c1 * z;
    return [x1, c2 * y - s2 * z1, s2 * y + c2 * z1];
  };
  const L = norm(rot(...norm([-0.5, 0.65, -0.55])));
  const V = rot(0, 0, -1);
  const R = norm(rot(...norm([-0.65, -0.6, -0.2])));
  const H = norm([L[0] + V[0], L[1] + V[1], L[2] + V[2]]);
  const rd = rot(0, 0, 1);
  const E = 1.18 / zoom, m = max(cols, rows), ax = cols / m, ay = rows / m;
  const out = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const v = 1 - ((j + 0.5) / rows) * 2;
    for (let i = 0; i < cols; i++) {
      const u = ((i + 0.5) / cols) * 2 - 1;
      const ux = u * E * ax, vy = v * E * ay;
      if (ux * ux + vy * vy > 2.6) continue; // di luar bola batas: pasti latar
      const ro = rot(ux, vy, -3);
      let t = 1.4, hit = false, px = 0, py = 0, pz = 0;
      for (let s = 0; s < 56; s++) {
        px = ro[0] + rd[0] * t; py = ro[1] + rd[1] * t; pz = ro[2] + rd[2] * t;
        const d = sdf(px, py, pz);
        if (d < 0.003) { hit = true; break; }
        t += d * 0.9;
        if (t > 4.6) break;
      }
      if (!hit) continue;
      const e = 0.004;
      const n = norm([sdf(px + e, py, pz) - sdf(px - e, py, pz), sdf(px, py + e, pz) - sdf(px, py - e, pz), sdf(px, py, pz + e) - sdf(px, py, pz - e)]);
      const nl = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
      const nh = n[0] * H[0] + n[1] * H[1] + n[2] * H[2];
      const b = 0.1 + 0.85 * max(0, nl) + 0.3 * Math.pow(max(0, nh), 30);
      const fres = 1 - abs(n[0] * V[0] + n[1] * V[1] + n[2] * V[2]);
      const rim = n[0] * R[0] + n[1] * R[1] + n[2] * R[2];
      let code;
      if (fres > 0.5 && rim > 0.3) code = fres > 0.72 ? 6 : 7;
      else if (b < 0.15) code = 1;
      else if (b < 0.32) code = 2;
      else if (b < 0.52) code = 3;
      else if (b < 0.74) code = 4;
      else code = 5;
      out[j * cols + i] = code;
    }
  }
  return out;
}

// cache kecil (kunci = parameter yang sudah dibulatkan)
const cache = new Map();
function grid(p, cols, rows) {
  const gr = Math.round(Math.max(0, Math.min(1, p.grip || 0)) * 200);
  const key = [p.shape, p.shape2, Math.round(p.morph * 200), cols, rows, Math.round(p.yaw * 4), Math.round(p.pitch * 4), Math.round(p.zoom * 200), gr].join('|');
  let g = cache.get(key);
  if (!g) {
    g = compute(p.shape, p.shape2, Math.round(p.morph * 200) / 200, cols, rows, Math.round(p.yaw * 4) / 4, Math.round(p.pitch * 4) / 4, Math.round(p.zoom * 200) / 200, gr / 200);
    cache.set(key, g);
    if (cache.size > 240) cache.delete(cache.keys().next().value);
  }
  return g;
}

// angka acak tetap per sel
const hash = (i, j, seed) => {
  let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export default {
  type: 'ascii3d',
  name: 'Bentuk ASCII 3D',
  icon: '@',
  category: 'Promo',
  order: 47,
  defaults: {
    shape: 'hand', shape2: 'blob', morph: 0, grip: 0, yaw: -18, pitch: 8, zoom: 1,
    cols: 64, rows: 68, cell: 13, reveal: 1, seed: 7, bgDots: 1,
    c1: '#5a5f72', c2: '#9a9fb0', c3: '#c9ccd8', c4: '#e9ebf2', c5: '#ffffff', rimA: '#2f7bff', rimB: '#1b4fd0', bgColor: '#1a1e2c'
  },
  schema: [
    { key: 'shape', label: 'Bentuk', kind: 'select', options: SHAPES },
    { key: 'shape2', label: 'Berubah jadi', kind: 'select', options: SHAPES },
    { key: 'morph', label: 'Perubahan bentuk (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'grip', label: 'Genggam, khusus tangan (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'yaw', label: 'Putar kiri/kanan (°)', kind: 'number', step: 1, animatable: true },
    { key: 'pitch', label: 'Putar atas/bawah (°)', kind: 'number', step: 1, animatable: true },
    { key: 'zoom', label: 'Zoom', kind: 'number', min: 0.2, max: 3, step: 0.05, animatable: true },
    { key: 'reveal', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'bgDots', label: 'Titik latar (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'cols', label: 'Kolom', kind: 'number', min: 8, max: 120, step: 1 },
    { key: 'rows', label: 'Baris', kind: 'number', min: 8, max: 140, step: 1 },
    { key: 'cell', label: 'Ukuran sel (px)', kind: 'number', min: 4, max: 40, step: 1 },
    { key: 'seed', label: 'Variasi acak', kind: 'number', min: 0, max: 999, step: 1 },
    { key: 'c5', label: 'Warna paling terang (@)', kind: 'color' },
    { key: 'rimA', label: 'Warna cahaya tepi (#)', kind: 'color' },
    { key: 'bgColor', label: 'Warna titik latar', kind: 'color' }
  ],
  size: (p) => ({ w: p.cols * p.cell, h: p.rows * p.cell }),
  draw(ctx, p) {
    const cols = Math.max(4, Math.round(p.cols));
    const rows = Math.max(4, Math.round(p.rows));
    const cell = p.cell;
    const g = grid(p, cols, rows);
    const W = cols * cell, Hh = rows * cell;
    const colors = [p.bgColor, p.c1, p.c2, p.c3, p.c4, p.c5, p.rimA, p.rimB];
    const chars = ['.', ...RAMP, '#', '#'];
    const rev = Math.max(0, Math.min(1, p.reveal));
    const seed = Math.round(p.seed);
    // kelompokkan per warna supaya fillStyle jarang berganti
    const groups = colors.map(() => []);
    const spark = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const code = g[j * cols + i];
        if (code === 0) {
          if (p.bgDots > 0) groups[0].push(i, j, 0);
          continue;
        }
        if (rev < 1) {
          const h = hash(i, j, seed);
          if (h > rev) {
            if (p.bgDots > 0) groups[0].push(i, j, 0);
            continue;
          }
          if (h > rev - 0.06) {
            spark.push(i, j, Math.floor(hash(j, i, seed + Math.floor(rev * 40)) * RAMP.length));
            continue;
          }
        }
        groups[code].push(i, j, code);
      }
    }
    ctx.save();
    ctx.font = `500 ${cell * 0.92}px "Geist Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x0 = -W / 2 + cell / 2, y0 = -Hh / 2 + cell / 2;
    const base = ctx.globalAlpha;
    groups.forEach((arr, c) => {
      if (!arr.length) return;
      ctx.fillStyle = colors[c];
      ctx.globalAlpha = c === 0 ? base * p.bgDots : base;
      for (let q = 0; q < arr.length; q += 3) ctx.fillText(chars[arr[q + 2]], x0 + arr[q] * cell, y0 + arr[q + 1] * cell);
    });
    if (spark.length) {
      ctx.globalAlpha = base;
      ctx.fillStyle = p.rimA;
      for (let q = 0; q < spark.length; q += 3) ctx.fillText(RAMP[spark[q + 2]], x0 + spark[q] * cell, y0 + spark[q + 1] * cell);
    }
    ctx.restore();
  }
};
