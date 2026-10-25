// Dunia yang "dibangun" di depan kamera, satu shot: grid kosong → pegunungan terangkat (grid → tanah liat → warna asli)
// → laut membanjiri → sungai menyala dari hulu → hutan tumbuh → kota muncul → kamera naik ke orbit → kepulauan Indonesia.
// Dekat tanah: render "voxel terrain" (raycast per kolom) dari peta tinggi. Di orbit: peta utuh dilihat dari atas.
// Peta tinggi dihitung sekali dari garis pantai Natural Earth (data/indonesia.js) + deretan gunung & gunung berapi asli.
// Semua tahap adalah "front" (jari-jari yang membesar), jadi ribuan hal bergerak dari beberapa angka saja.
import * as THREE from 'three';
import { ISLANDS } from '../data/indonesia.js';
import { editorViewport } from './editorui.js';

// ---------- dunia (piksel peta) ----------
const GW = 2560;
const GH = 1000;
const MAPW = 2200; // lebar Indonesia (95.0°–141.0° BT) dalam piksel dunia → 1 px ≈ 2,3 km
const MX = (GW - MAPW) / 2;
const MY = 97;
const LON0 = 95.015;
const LAT0 = 5.905;
const SPAN = 45.962;
export const lonlat = (lon, lat) => [MX + ((lon - LON0) / SPAN) * MAPW, MY + ((LAT0 - lat) / SPAN) * MAPW];
const HS = 14; // skala tinggi (dibesarkan supaya gunung terasa)

// gunung berapi & puncak: [bujur, lintang, tinggi 0–1, jari-jari px]
const PEAKS = [
  [97.2, 3.75, 0.8, 9], [98.39, 3.17, 0.75, 7], [101.27, -1.7, 1, 10], [100.47, -0.38, 0.75, 7], [103.13, -4.03, 0.8, 8], [104.5, -5.0, 0.6, 7],
  [106.73, -6.72, 0.78, 6], [106.98, -6.79, 0.88, 7], [107.6, -7.2, 0.7, 7], [108.4, -6.89, 0.8, 6], [109.21, -7.24, 0.88, 7],
  [109.92, -7.2, 0.72, 6], [110.44, -7.54, 0.85, 6], [111.19, -7.63, 0.8, 6], [112.92, -8.1, 0.95, 7], [112.95, -7.94, 0.6, 5],
  [114.04, -8.12, 0.8, 7], [115.5, -8.34, 0.85, 6], [116.46, -8.41, 0.95, 7], [118.0, -8.25, 0.8, 8], [121.7, -8.7, 0.62, 6],
  [124.79, 1.36, 0.62, 6], [120.03, -3.38, 0.85, 9], [121.6, -1.4, 0.6, 9], [127.9, 1.5, 0.6, 7], [129.9, -3.1, 0.65, 7],
  [137.16, -4.08, 1, 12], [138.9, -4.3, 0.9, 11], [114.2, 0.9, 0.55, 12], [116.2, 1.3, 0.5, 12]
];
// punggung pegunungan: [bujur1, lintang1, bujur2, lintang2, tinggi, lebar px]
const RIDGES = [
  [95.6, 5.2, 101.6, -2.2, 0.55, 9], [101.6, -2.2, 105.6, -5.7, 0.5, 8],
  [105.9, -6.9, 114.4, -8.1, 0.38, 7], [114.9, -8.4, 122.8, -8.6, 0.3, 5],
  [119.6, -2.0, 121.2, -4.5, 0.5, 10], [120.4, 0.6, 124.6, 0.9, 0.35, 6],
  [113.0, 0.6, 117.2, 2.0, 0.4, 16], [134.0, -3.4, 140.9, -4.7, 0.75, 13]
];

// Danau Toba (diperbesar ±1,4× supaya terbaca dari udara): kaldera memanjang barat laut–tenggara, Pulau Samosir
// di sisi barat, dan kota di ujung tenggara. Di sinilah kamera terbang rendah.
const TOBA = { cx: 363, cy: 255, ax: 0.759, ay: 0.651, A: 32, B: 11 };
const LL = 0.3; // permukaan danau (satuan tinggi peta)
const tobaUV = (x, y) => {
  const dx = x - TOBA.cx;
  const dy = y - TOBA.cy;
  return [dx * TOBA.ax + dy * TOBA.ay, -dx * TOBA.ay + dy * TOBA.ax]; // u: sepanjang danau (ke tenggara), v: melintang (+ = barat daya)
};
// kota (Balige) di ujung tenggara danau
export const CITY_X = TOBA.cx + TOBA.ax * 36;
export const CITY_Y = TOBA.cy + TOBA.ay * 36;
const CITY_R = 5.5;
// puncak di bibir kaldera (px dunia): yang pertama muncul dari lantai grid
const RIM_PEAKS = [[405, 302, 0.3, 6], [344, 230, 0.16, 5]];
export const TOBA_INFO = { cx: TOBA.cx, cy: TOBA.cy, city: [CITY_X, CITY_Y], firstPeak: RIM_PEAKS[0].slice(0, 2) };

// kota: [bujur, lintang, jari-jari px, nama]
export const CITIES = [
  [106.85, -6.2, 7, 'Jakarta'], [112.75, -7.25, 5, 'Surabaya'], [107.61, -6.91, 4, 'Bandung'], [110.42, -6.97, 3.5, 'Semarang'],
  [98.67, 3.6, 4.5, 'Medan'], [119.42, -5.14, 4, 'Makassar'], [104.75, -2.98, 3.5, 'Palembang'], [115.21, -8.65, 3, 'Denpasar'],
  [116.83, -1.27, 3, 'Balikpapan'], [109.33, -0.03, 3, 'Pontianak'], [124.84, 1.47, 3, 'Manado'], [140.7, -2.53, 3, 'Jayapura'],
  [128.18, -3.7, 2.5, 'Ambon'], [123.6, -10.17, 2.5, 'Kupang'], [100.35, -0.95, 3, 'Padang'], [101.45, 0.51, 3, 'Pekanbaru'],
  [114.59, -3.32, 3, 'Banjarmasin'], [110.37, -7.8, 3, 'Yogyakarta'], [116.12, -8.58, 2.5, 'Mataram'], [131.25, -0.88, 2.5, 'Sorong']
];

// ---------- noise (pasti sama tiap kali) ----------
function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 5) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    sum += (vnoise(x * f, y * f, s + i * 17) * 2 - 1) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
function ridged(x, y, s) {
  let sum = 0;
  let amp = 0.55;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    const n = 1 - Math.abs(vnoise(x * f, y * f, s + i * 31) * 2 - 1);
    sum += n * n * amp;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum;
}
// punggungan lebar & lembut (dua oktaf): lereng mulus, puncak tetap tegas
function ridgedSoft(x, y, s) {
  const a = 1 - Math.abs(vnoise(x, y, s) * 2 - 1);
  const b = 1 - Math.abs(vnoise(x * 2.3 + 7.1, y * 2.3 + 3.7, s + 5) * 2 - 1);
  return a * a * 0.72 + b * b * 0.28;
}
// kelompok hutan (0–1): pohon tumbuh berkelompok, bukan rata
const forestCluster = (x, y) => 0.65 * vnoise(x / 2.2, y / 2.2, 21) + 0.35 * vnoise(x / 0.8, y / 0.8, 23);
const sstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - dx * k, py - ay - dy * k);
};

// jarak chamfer: untuk sel dengan mask === inside, jarak ke sel terdekat yang mask !== inside
function chamfer(mask, inside) {
  const N = GW * GH;
  const d = new Float32Array(N);
  for (let i = 0; i < N; i++) d[i] = mask[i] === inside ? 1e6 : 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) {
      v = Math.min(v, d[i - GW] + 1);
      if (x > 0) v = Math.min(v, d[i - GW - 1] + 1.414);
      if (x < GW - 1) v = Math.min(v, d[i - GW + 1] + 1.414);
    }
    d[i] = v;
  }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
    const i = y * GW + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x < GW - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < GH - 1) {
      v = Math.min(v, d[i + GW] + 1);
      if (x < GW - 1) v = Math.min(v, d[i + GW + 1] + 1.414);
      if (x > 0) v = Math.min(v, d[i + GW - 1] + 1.414);
    }
    d[i] = v;
  }
  return d;
}

// ---------- membangun dunia (sekali, lalu disimpan) ----------
let WORLD = null;
function buildWorld() {
  if (WORLD) return WORLD;
  const N = GW * GH;
  // 1. daratan dari poligon
  const cv = document.createElement('canvas');
  cv.width = GW;
  cv.height = GH;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  g.fillRect(0, 0, GW, GH);
  g.fillStyle = '#fff';
  for (const r of ISLANDS) {
    g.beginPath();
    for (let i = 0; i < r.length; i += 2) {
      const x = MX + (r[i] / 10000) * MAPW;
      const y = MY + (r[i + 1] / 10000) * MAPW;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
  }
  const px = g.getImageData(0, 0, GW, GH).data;
  const land = new Uint8Array(N);
  for (let i = 0; i < N; i++) land[i] = px[i * 4] > 127 ? 1 : 0;

  // 2. Danau Toba & Samosir (garis pantai sedikit berliku)
  const lake = new Uint8Array(N);
  const isle = new Uint8Array(N);
  for (let y = TOBA.cy - 40; y <= TOBA.cy + 40; y++) for (let x = TOBA.cx - 45; x <= TOBA.cx + 45; x++) {
    const [u, v] = tobaUV(x, y);
    const wob = 1 + 0.14 * (vnoise(x / 3.5, y / 3.5, 81) - 0.5) + 0.08 * (vnoise(x / 1.5, y / 1.5, 83) - 0.5);
    if (Math.hypot(u / TOBA.A, v / TOBA.B) * wob >= 1) continue;
    if (Math.hypot((u + 2) / 17, (v - 3.6) / 6.6) * wob < 1) isle[y * GW + x] = 1;
    else lake[y * GW + x] = 1;
  }

  // 3. jarak ke pantai (darat & laut) dan ke tepi danau
  const dIn = chamfer(land, 1);
  const dOut = chamfer(land, 0);
  const dLake = chamfer(lake, 0);
  const dLakeIn = chamfer(lake, 1);
  // jarak bertanda ke tepi danau (+ darat, − air), dihaluskan supaya garis pantai danau & Samosir tidak bergerigi
  const SB = { x0: TOBA.cx - 48, y0: TOBA.cy - 44, w: 96, h: 88 };
  let sdf = new Float32Array(SB.w * SB.h);
  for (let j = 0; j < SB.h; j++) for (let i = 0; i < SB.w; i++) {
    const k = (SB.y0 + j) * GW + SB.x0 + i;
    sdf[j * SB.w + i] = lake[k] ? 0.5 - dLakeIn[k] : dLake[k] - 0.5;
  }
  for (let pass = 0; pass < 3; pass++) {
    const out = new Float32Array(sdf);
    for (let j = 1; j < SB.h - 1; j++) for (let i = 1; i < SB.w - 1; i++) {
      let sum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) sum += sdf[(j + dj) * SB.w + i + di];
      out[j * SB.w + i] = sum / 9;
    }
    sdf = out;
  }
  const shoreSD = (x, y, fallback) => {
    const i = x - SB.x0;
    const j = y - SB.y0;
    return i > 0 && j > 0 && i < SB.w - 1 && j < SB.h - 1 ? sdf[j * SB.w + i] : fallback;
  };

  // 4. tinggi: dataran pantai → perbukitan → punggung gunung & kerucut gunung berapi → kaldera Toba
  const peaks = PEAKS.map(([lo, la, h, r]) => [...lonlat(lo, la), h, r]);
  const ridges = RIDGES.map(([a, b, c, d, h, w]) => [...lonlat(a, b), ...lonlat(c, d), h, w]);
  const H = new Float32Array(N);
  const river = new Uint8Array(N);
  const basin = new Uint8Array(N);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      if (!land[i]) {
        H[i] = -Math.min(1, 0.06 + (dOut[i] / 70) ** 1.4) * 0.7;
        continue;
      }
      const inland = 1 - Math.exp(-dIn[i] / 9);
      let h = inland * (0.05 + 0.22 * ridged(x / 70, y / 70, 3));
      for (const [ax, ay, bx, by, rh, w] of ridges) {
        const sd = segDist(x, y, ax, ay, bx, by);
        if (sd < w * 3) h += rh * Math.exp(-((sd / w) ** 2)) * (0.55 + 0.45 * ridged(x / 26, y / 26, 7)) * inland;
      }
      for (const [cx, cy, ph, r] of peaks) {
        const dd = Math.hypot(x - cx, y - cy);
        if (dd < r * 4) h += ph * Math.exp(-((dd / r) ** 1.25)) - ph * 0.08 * Math.exp(-((dd / (r * 0.18)) ** 2));
      }
      // kaldera Toba: dinding curam dari tepi danau, dataran tinggi bergelombang di sekelilingnya
      const dl = dLake[i];
      const sd = shoreSD(x, y, lake[i] ? 0.5 - dLakeIn[i] : dl - 0.5);
      if (sd < 0) h = LL - 0.15 * (1 - Math.exp(sd / 3));
      else if (dl < 80) {
        let t = LL + 0.3 * (1 - Math.exp(-sd / 2.4)) - 0.0026 * Math.max(0, dl - 7) + 0.03 * ridged(x / 16, y / 16, 85) * (1 - Math.exp(-sd / 4));
        if (isle[i]) t = LL + 0.22 * sstep(sd / 2.6) + 0.04 * ridged(x / 9, y / 9, 87) * sstep(sd / 3);
        h += (t - h) * (1 - sstep((dl - 42) / 38));
        for (const [cx, cy, ph, r] of RIM_PEAKS) {
          const dd = Math.hypot(x - cx, y - cy);
          if (dd < r * 4) h += ph * Math.exp(-((dd / r) ** 1.6));
        }
        // kota di tepi danau: dataran pantai yang rata
        const dc = Math.hypot(x - CITY_X, y - CITY_Y);
        if (dc < CITY_R + 12) h += (LL + 0.012 - h) * sstep((CITY_R + 12 - dc) / 8);
      }
      if (lake[i] || dl < 2.5) basin[i] = 1;
      H[i] = Math.max(0.006, h);
      // sungai: garis berliku dari noise, hanya di darat yang cukup jauh dari pantai & bukan danau
      const n = fbm(x / 38, y / 38, 11, 4);
      if (Math.abs(n) < 0.016 && dIn[i] > 1.5 && !basin[i]) river[i] = 1;
    }
  }

  // 5. bayangan bukit (sinar dari barat laut)
  const shade = new Float32Array(N);
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const i = y * GW + x;
    const dx = (H[i + 1] - H[i - 1]) * HS;
    const dy = (H[i + GW] - H[i - GW]) * HS;
    shade[i] = Math.max(0.35, Math.min(1.35, 1 + (-dx * 0.55 - dy * 0.45) * 0.9));
  }

  // 6. kota (kota fokus di tepi Toba + kota besar lain untuk lampu di orbit)
  const city = new Uint8Array(N);
  const cityPts = [[CITY_X, CITY_Y, CITY_R], ...CITIES.map(([lo, la, r]) => [...lonlat(lo, la), r])];
  for (const [cx, cy, r] of cityPts) {
    for (let y = Math.floor(cy - r * 2); y <= cy + r * 2; y++) for (let x = Math.floor(cx - r * 2); x <= cx + r * 2; x++) {
      const i = y * GW + x;
      if (land[i] && !lake[i] && Math.hypot(x - cx, y - cy) < r * (0.75 + 0.5 * vnoise(x / 3, y / 3, 5))) city[i] = 1;
    }
  }

  // 7. tekstur akhir untuk tampilan orbit (semua tahap selesai)
  const tex3d = document.createElement('canvas');
  tex3d.width = GW;
  tex3d.height = GH;
  const t3 = tex3d.getContext('2d');
  const img3 = t3.createImageData(GW, GH);
  const out3 = new Uint32Array(img3.data.buffer);
  for (let i = 0; i < N; i++) out3[i] = finalColor(i, H, land, lake, river, city, shade, dOut);
  t3.putImageData(img3, 0, 0);

  WORLD = { land, lake, basin, H, river, shade, city, tex3d, cityPts, dOut };
  return WORLD;
}

// tinggi medan akhir (satuan kamera) di titik dunia — untuk tabel clearance jalur kamera
export function terrainHeight(x, y) {
  const W = buildWorld();
  const { x0, y0, s } = CORRIDOR;
  const T = corridorTile();
  const tx = Math.round((x - x0) * s);
  const ty = Math.round((y - y0) * s);
  if (tx >= 0 && ty >= 0 && tx < T.TW && ty < T.TH) return Math.max(LL, T.th[ty * T.TW + tx]) * HS;
  const i = Math.round(y) * GW + Math.round(x);
  return Math.max(0, W.H[i] || 0) * HS;
}

// ---------- warna ----------
const rgb = (r, g, b) => (255 << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, r | 0));
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const SAND = [218, 196, 160];
const JUNGLE = [52, 96, 50];
const TERRA_LO = [180, 94, 70];
const TERRA_MID = [188, 104, 80];
const TERRA_HI = [200, 134, 114];
const DEEP = [22, 58, 76];
const SHELF = [44, 156, 152];

// tanah laterit (terakota) menurut tinggi
function terrainRGB(h) {
  if (h < 0.02) return SAND;
  if (h < 0.08) return mixc(SAND, TERRA_LO, (h - 0.02) / 0.06);
  if (h < 0.5) return mixc(TERRA_LO, TERRA_MID, (h - 0.08) / 0.42);
  return mixc(TERRA_MID, TERRA_HI, Math.min(1, (h - 0.5) / 0.35));
}
function finalColor(i, H, land, lake, river, city, shade, dOut) {
  const h = H[i];
  if (!land[i]) {
    // paparan dangkal pirus yang tegas di sekeliling pulau, lalu laut dalam
    const k = sstep((dOut[i] - 1.5) / 6);
    const c = mixc(SHELF, DEEP, k);
    return rgb(c[0], c[1], c[2]);
  }
  if (lake[i]) return rgb(40, 132, 170);
  let c = terrainRGB(h);
  const x = i % GW;
  const y = (i / GW) | 0;
  // hutan: petak-petak hijau di dataran rendah & lereng tengah
  const fc = 0.7 * vnoise(x / 24, y / 24, 25) + 0.3 * vnoise(x / 8, y / 8, 27);
  if (h > 0.02 && h < 0.6) c = mixc(c, JUNGLE, 0.22 * sstep((fc - 0.5) / 0.16));
  if (river[i] && h < 0.7) c = mixc(c, [60, 130, 170], 0.6);
  if (city[i]) c = mixc(c, [176, 170, 160], 0.55);
  const s = 1 + (Math.max(0.7, shade[i]) - 1) * 0.4;
  return rgb(c[0] * s * 1.12, c[1] * s * 1.12, c[2] * s * 1.1);
}

// ---------- petak detail tinggi di koridor terbang (sekitar Danau Toba) ----------
// Peta dasar 1 px ≈ 2,3 km terlalu kasar untuk terbang rendah. Di sepanjang jalur kamera dibuat petak 8× lebih rapat:
// punggungan lebar yang mulus (ridged noise lembut di atas peta dasar) dan bayangan jatuh dari matahari rendah.
// Detail memudar ke tepi petak supaya menyambung mulus dengan medan di luarnya.
export const CORRIDOR = { x0: 318, y0: 214, w: 140, h: 116, s: 8 };
let CTILE = null;
function corridorTile() {
  if (CTILE) return CTILE;
  const W = buildWorld();
  const { x0, y0, w, h, s } = CORRIDOR;
  const TW = w * s;
  const TH = h * s;
  const th = new Float32Array(TW * TH);
  const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const base = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const row = (j) => {
      const i = (iy + j) * GW + ix;
      return cr(W.H[i - 1], W.H[i], W.H[i + 1], W.H[i + 2], fx);
    };
    return cr(row(-1), row(0), row(1), row(2), fy);
  };
  const edgeFade = (i, j) => sstep(Math.min(i, TW - 1 - i, j, TH - 1 - j) / s / 10);
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const wx = x0 + i / s;
      const wy = y0 + j / s;
      let hb = base(wx, wy);
      if (hb < 0) {
        th[j * TW + i] = hb; // laut: dasar tetap di bawah permukaan air
        continue;
      }
      // punggungan: kuat di dataran tinggi, hilang di tepi danau & dataran kota
      const m = sstep((hb - LL - 0.03) / 0.22) * edgeFade(i, j);
      const amp = 0.012 + 0.34 * m;
      hb += (ridgedSoft(wx * 0.17, wy * 0.17, 61) - 0.4) * amp + fbm(wx * 0.06, wy * 0.06, 75, 2) * 0.16 * m + fbm(wx * 1.6, wy * 1.6, 71, 3) * 0.004;
      th[j * TW + i] = Math.max(0.004, hb);
    }
  }
  // bayangan jatuh: matahari rendah dari tenggara (di belakang-kiri kamera yang menghadap barat)
  const { Lx, Ly, el } = SUN;
  const tlit = new Float32Array(TW * TH).fill(1);
  const cell = 1 / s;
  const tanEl = Math.tan(el);
  const stx = Lx / Math.cos(el);
  const sty = Ly / Math.cos(el);
  for (let j = 1; j < TH - 1; j++) {
    for (let i = 1; i < TW - 1; i++) {
      const k = j * TW + i;
      const h0 = th[k] * HS;
      let lit = 1;
      for (let st = 2; st < 120; st += 2) {
        const ii = Math.round(i + stx * st);
        const jj = Math.round(j + sty * st);
        if (ii < 0 || jj < 0 || ii >= TW || jj >= TH) break;
        if (th[jj * TW + ii] * HS > h0 + st * cell * tanEl) { lit = 0; break; }
      }
      tlit[k] = 1 - (1 - lit) * edgeFade(i, j);
    }
  }
  CTILE = { th, tlit, TW, TH };
  return CTILE;
}
// arah matahari (peta: x timur, y selatan, z atas)
const SUN = (() => {
  const az = (62 * Math.PI) / 180;
  const el = (27 * Math.PI) / 180;
  return { el, Lx: Math.cos(el) * Math.cos(az), Ly: Math.cos(el) * Math.sin(az), Lz: Math.sin(el) };
})();
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- renderer WebGL bersama (tanah 3D & orbit memakai satu konteks) ----------
let GLR = null;
function getGL(w, h) {
  if (!GLR) {
    GLR = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    GLR.setPixelRatio(1);
    GLR.outputColorSpace = THREE.SRGBColorSpace;
    GLR.toneMapping = THREE.ACESFilmicToneMapping; // hanya berlaku untuk material bawaan (orbit)
    GLR.toneMappingExposure = 1.3;
  }
  const s = GLR.getSize(new THREE.Vector2());
  if (s.x !== w || s.y !== h) GLR.setSize(w, h, false);
  return GLR;
}

// ---------- tanah 3D (Three.js): medan, grid editor, air, pohon, gedung ----------
// Mesh sungguhan dengan anti-aliasing: tidak bergerigi/berkedip saat kamera bergerak. Semua front (gunung, warna, air,
// hutan, kota) dihitung di shader dari beberapa uniform, jadi tetap murni dari waktu (seek & ekspor konsisten).
const VS = 0.75; // skala tegak: proporsi gunung sama dengan render lama (fokus vertikal 0,95 × tinggi layar)
const FAR = { x0: 0, y0: 0, x1: 800, y1: 700, step: 2 }; // medan dasar di sekitar koridor

const GLSL_COMMON = `
uniform vec3 uCam;
uniform float uCurve;
uniform vec2 uFront;
uniform float uRT;
uniform float uWater;
const float HS = ${HS.toFixed(1)};
const float VS = ${VS.toFixed(2)};
float tKAt(vec2 p) { return smoothstep(0.0, 1.0, (uRT - distance(p, uFront)) / 50.0); }
// tinggi tampil: medan muncul dari lantai grid (puncak dulu); dasar laut turun saat air datang
float shownH(float h, float tK) { return h < 0.0 ? h * uWater : max(h - (1.0 - tK) * 1.6, 0.0); }
// titik peta (px) + tinggi (px) → ruang 3D, dengan lengkung planet relatif ke kamera
vec3 place(vec2 p, float y) { vec2 d = p - uCam.xy; return vec3(p.x, (y - dot(d, d) * uCurve / 1e5) * VS, p.y); }
`;
const GLSL_FOG = `
uniform vec3 uHz;
uniform float uZFar;
uniform float uHaze;
vec3 fogged(vec3 c, float depth) { return mix(c, uHz, min(1.0, pow(depth / uZFar, 1.5) * uHaze)); }
`;

const TERRAIN_VS = `${GLSL_COMMON}
attribute float aH;
attribute float aShadow;
uniform vec4 uTile;
varying vec2 vXY;
varying float vH;
varying float vEm;
varying vec3 vN;
varying float vShadow;
varying float vDepth;
varying vec2 vUV;
void main() {
  vec2 p = position.xz;
  float tK = tKAt(p);
  vH = aH;
  vEm = aH < 0.0 ? aH : aH - (1.0 - tK) * 1.6;
  vec3 wp = place(p, shownH(aH, tK) * HS);
  vXY = p;
  vN = normal;
  vShadow = aShadow;
  vUV = (p - uTile.xy) / uTile.zw;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const TERRAIN_FS = `${GLSL_COMMON}${GLSL_FOG}
uniform sampler2D uData;
uniform float uTileMode;
uniform vec4 uHole;
uniform float uRFull;
uniform float uRForest;
uniform float uRCity;
uniform float uRiver;
uniform float uGrid;
uniform float uLL;
uniform float uShore;
uniform vec2 uCity;
uniform vec3 uSun;
varying vec2 vXY;
varying float vH;
varying float vEm;
varying vec3 vN;
varying float vShadow;
varying float vDepth;
varying vec2 vUV;
float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 terra(float h) {
  vec3 SAND = vec3(218.0, 196.0, 160.0) / 255.0;
  vec3 LO = vec3(180.0, 94.0, 70.0) / 255.0;
  vec3 MID = vec3(188.0, 104.0, 80.0) / 255.0;
  vec3 HI = vec3(200.0, 134.0, 114.0) / 255.0;
  if (h < 0.008) return SAND;
  if (h < 0.035) return mix(SAND, LO, (h - 0.008) / 0.027);
  if (h < 0.5) return mix(LO, MID, (h - 0.035) / 0.465);
  return mix(MID, HI, min(1.0, (h - 0.5) / 0.35));
}
// garis grid anti-alias (lebar ±1 piksel layar), memudar kalau terlalu rapat supaya tidak moire
float gridLine(vec2 p, float size, float wpx) {
  vec2 g = p / size;
  vec2 w = fwidth(g);
  vec2 l = abs(fract(g - 0.5) - 0.5) / max(w, vec2(1e-5));
  float line = 1.0 - min(min(l.x, l.y) / wpx, 1.0);
  return line * (1.0 - smoothstep(0.2, 0.45, max(w.x, w.y)));
}
void main() {
  if (vXY.x > uHole.x && vXY.y > uHole.y && vXY.x < uHole.z && vXY.y < uHole.w) discard;
  float df = distance(vXY, uFront);
  float major = gridLine(vXY, uGrid, 1.1);
  float minor = gridLine(vXY, uGrid * 0.25, 0.9);
  vec3 floorC = vec3(48.0, 53.0, 60.0) / 255.0 + minor * vec3(18.0, 19.0, 22.0) / 255.0 + major * vec3(74.0, 76.0, 80.0) / 255.0;
  vec4 dat = uTileMode > 0.5 ? texture2D(uData, vUV) : vec4(0.0);
  float h = vH;
  vec3 c;
  if (h < 0.004) c = vec3(150.0, 146.0, 138.0) / 255.0; // dasar laut kering
  else if (dat.a > 0.004 && h < uLL + 0.003) c = vec3(214.0, 208.0, 196.0) / 255.0; // dasar danau kering
  else {
    c = terra(h);
    // medan dasar (di luar petak koridor): variasi warna lembut supaya tidak polos
    if (uTileMode < 0.5) c *= 0.9 + 0.12 * vn(vXY * 0.35) + 0.06 * vn(vXY * 1.3);
    vec3 n = normalize(vN);
    float slope = 1.0 - n.y;
    // pita lapisan batu di lereng curam
    c *= 1.0 + 0.035 * clamp((slope - 0.3) * 4.0, 0.0, 1.0) * sin(h * 120.0 + sin(vXY.x * 0.4) * 1.3 + sin(vXY.y * 0.37) * 1.2);
    // pantai pasir pucat di tepi danau setelah air datang
    if (h > uLL - 0.003 && h < uLL + 0.02) c = mix(c, vec3(226.0, 214.0, 192.0) / 255.0, uShore * (1.0 - (h - uLL) / 0.02) * 0.8);
    float fk = smoothstep(0.0, 1.0, (uRForest - df) / 18.0);
    c *= 1.0 - 0.16 * dat.g * fk; // tanah teduh di bawah hutan
    if (h > uRiver && h < 0.75) c = mix(c, vec3(58.0, 120.0, 156.0) / 255.0, 0.7 * smoothstep(0.35, 0.9, dat.r));
    // tanah kota: beton & jalan bergrid (jalan = sepertiga tiap blok)
    float ck = smoothstep(0.0, 1.0, (uRCity - distance(vXY, uCity)) / 2.0) * dat.b;
    if (ck > 0.0) {
      vec2 cell = vXY * 2.0;
      vec2 cw = fwidth(cell);
      float sx = 1.0 - smoothstep(0.333 - cw.x, 0.333 + cw.x, fract(cell.x));
      float sy = 1.0 - smoothstep(0.333 - cw.y, 0.333 + cw.y, fract(cell.y));
      vec3 ground = mix(vec3(132.0, 132.0, 136.0) / 255.0, vec3(78.0, 80.0, 86.0) / 255.0, max(sx, sy));
      // marka putus-putus di tengah jalan
      vec2 mc = abs(fract(cell) - 0.1667);
      float dashX = (1.0 - smoothstep(0.006, 0.006 + cw.x, mc.x)) * step(0.5, fract(vXY.y * 18.0)) * sx;
      float dashY = (1.0 - smoothstep(0.006, 0.006 + cw.y, mc.y)) * step(0.5, fract(vXY.x * 18.0)) * sy;
      ground = mix(ground, vec3(0.86, 0.84, 0.74), max(dashX, dashY) * (1.0 - smoothstep(0.02, 0.05, max(cw.x, cw.y))));
      c = mix(c, ground, ck);
    }
  }
  // tanah liat abu-abu → warna asli, garis grid masih tergambar di atas tanah liat
  float fK = smoothstep(0.0, 1.0, (uRFull - df) / 14.0);
  c = mix(vec3(112.0, 114.0, 118.0) / 255.0, c, fK);
  c = mix(c, vec3(226.0, 230.0, 238.0) / 255.0, 0.45 * (1.0 - fK) * major);
  // cahaya: difus + bayangan jatuh (lembut)
  float sh = 0.36 + 1.02 * max(0.0, dot(normalize(vN), uSun)) * mix(0.22, 1.0, vShadow);
  c *= sh;
  // pita pindai putih menyala di tepi front warna
  float scanW = 0.45 + vDepth * 0.006;
  if (uRFull < 2600.0) c = mix(c, vec3(1.0, 0.99, 0.965), 0.9 * max(0.0, 1.0 - abs(df - uRFull) / scanW));
  c = mix(floorC, c, smoothstep(0.0, 0.006, vEm));
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;

const WATER_VS = `${GLSL_COMMON}
uniform float uLevel;
uniform vec4 uTile;
varying vec2 vXY;
varying vec2 vUV;
varying float vDepth;
varying vec3 vView;
void main() {
  vec2 p = position.xz;
  vec3 wp = place(p, uLevel * HS);
  vXY = p;
  vUV = (p - uTile.xy) / uTile.zw;
  vView = wp - cameraPosition;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

// air: lake = kedalaman dari petak data (alpha), sea = jarak dari pantai (tekstur dunia)
const WATER_FS = `${GLSL_COMMON}${GLSL_FOG}
uniform float uLevel;
uniform float uLL;
uniform float uLake;
uniform sampler2D uData;
uniform sampler2D uCoast;
uniform vec2 uWorld;
uniform vec3 uSun;
varying vec2 vXY;
varying vec2 vUV;
varying float vDepth;
varying vec3 vView;
void main() {
  vec3 c;
  if (uLake > 0.5) {
    if (tKAt(vXY) < 0.9) discard;
    float dep = texture2D(uData, vUV).a + (uLevel - uLL) / 0.15;
    if (dep <= 0.0) discard;
    c = mix(vec3(112.0, 204.0, 208.0) / 255.0, vec3(30.0, 118.0, 172.0) / 255.0, sqrt(clamp(dep * 1.4, 0.0, 1.0)));
    c = mix(vec3(0.92, 0.96, 0.95), c, smoothstep(0.0, 0.04, dep)); // buih tipis di tepi
  } else {
    vec2 q = vXY / uWorld;
    float d = (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) ? 1.0 : texture2D(uCoast, q).r;
    c = mix(vec3(64.0, 190.0, 194.0) / 255.0, vec3(22.0, 64.0, 104.0) / 255.0, smoothstep(0.02, 0.6, d));
  }
  vec3 v = normalize(vView);
  c = mix(c, uHz, pow(1.0 - abs(v.y), 5.0) * 0.55); // pantulan langit di sudut landai
  vec3 r = reflect(v, vec3(0.0, 1.0, 0.0));
  c += vec3(1.0, 0.96, 0.88) * pow(max(dot(r, uSun), 0.0), 90.0) * 0.35; // kilau matahari
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;

const SKY_VS = `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
}`;
const SKY_FS = `
uniform vec3 uHz;
uniform vec3 uTop;
varying vec3 vDir;
void main() {
  float e = normalize(vDir).y;
  float k = sqrt(clamp(tan(max(e, 0.0)) * 1.12, 0.0, 1.0));
  gl_FragColor = vec4(mix(uHz, uTop, k), 1.0);
}`;

// pohon: kerucut kecil per instans (x, y, tinggi tanah, acak); tumbuh mengikuti front hutan
const TREE_VS = `${GLSL_COMMON}
attribute vec4 iT;
uniform float uRForest;
varying float vTone;
varying vec3 vNrm;
varying float vDepth;
varying float vY;
void main() {
  vec2 p = iT.xy;
  float fk = smoothstep(0.0, 1.0, (uRForest - distance(p, uFront)) / 18.0 - iT.w * 0.6);
  float s = (0.6 + iT.w * 0.7) * fk;
  float tK = tKAt(p);
  float base = shownH(iT.z, tK) * HS;
  vec2 q = p + position.xz * 0.034 * s;
  vec3 wp = place(q, base + position.y * 0.12 * s / VS - 0.01);
  vTone = 0.7 + fract(iT.w * 37.0) * 0.45;
  vNrm = normal;
  vY = position.y;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const TREE_FS = `${GLSL_FOG}
uniform vec3 uSun;
varying float vTone;
varying vec3 vNrm;
varying float vDepth;
varying float vY;
void main() {
  vec3 c = vec3(34.0, 78.0, 40.0) / 255.0 * vTone;
  c *= 0.5 + 0.75 * max(0.0, dot(normalize(vNrm), uSun));
  c *= 0.75 + 0.25 * vY; // pangkal lebih gelap
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;

// gedung: kotak per instans (x, y, lebar, dalam) + (tinggi tanah, tinggi, acak, menara); tumbuh dari pusat kota
const BLD_VS = `${GLSL_COMMON}
attribute vec4 iP;
attribute vec4 iI;
uniform vec2 uCity;
uniform float uRCity;
varying vec3 vLocal;
varying vec3 vNrm;
varying float vDepth;
varying float vSeed;
varying float vTall;
varying float vHeight;
void main() {
  float ck = smoothstep(0.0, 1.0, (uRCity - distance(iP.xy, uCity)) / 2.0);
  float tK = tKAt(iP.xy);
  float base = shownH(iI.x, tK) * HS;
  float hgt = iI.y * HS * ck;
  vec2 q = iP.xy + vec2(position.x * iP.z, position.z * iP.w);
  vec3 wp = place(q, base + position.y * hgt - 0.02);
  vLocal = vec3(position.x * iP.z, position.y * hgt, position.z * iP.w);
  vNrm = normal;
  vSeed = iI.z;
  vTall = iI.w;
  vHeight = hgt;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDepth = -mv.z;
  gl_Position = ck > 0.001 ? projectionMatrix * mv : vec4(0.0, 0.0, -2.0, 1.0);
}`;
const BLD_FS = `${GLSL_FOG}
uniform vec3 uSun;
varying vec3 vLocal;
varying vec3 vNrm;
varying float vDepth;
varying float vSeed;
varying float vTall;
varying float vHeight;
float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + vSeed * 91.7) * 43758.5453); }
void main() {
  vec3 n = normalize(vNrm);
  // fasad per gedung: menara (kaca biru / kaca toska / kaca gelap / beton terang), bangunan rendah (beton, krem, putih, abu)
  float s = vSeed;
  vec3 base;
  float glassy;
  if (vTall > 0.5) {
    base = s < 0.35 ? vec3(62.0, 80.0, 104.0) : s < 0.6 ? vec3(54.0, 90.0, 96.0) : s < 0.82 ? vec3(38.0, 44.0, 56.0) : vec3(176.0, 170.0, 158.0);
    glassy = s < 0.82 ? 1.0 : 0.0;
  } else {
    base = s < 0.3 ? vec3(180.0, 176.0, 168.0) : s < 0.55 ? vec3(150.0, 148.0, 144.0) : s < 0.8 ? vec3(200.0, 190.0, 168.0) : vec3(122.0, 128.0, 136.0);
    glassy = 0.0;
  }
  base /= 255.0;
  vec3 c;
  if (n.y > 0.5) {
    // atap: sedikit lebih terang, dengan bingkai tepi
    c = base * (glassy > 0.5 ? 0.9 : 1.08);
  } else {
    float along = abs(n.x) > 0.5 ? vLocal.z : vLocal.x;
    float rel = clamp(vLocal.y / max(vHeight, 0.01), 0.0, 1.0);
    // jendela: kaca = pita jendela lebar per lantai; beton = jendela berlubang lebih kecil
    vec2 g = vec2(along / (glassy > 0.5 ? 0.018 : 0.024), vLocal.y / 0.028);
    vec2 w = fwidth(g);
    vec2 f = abs(fract(g) - 0.5);
    vec2 hw = glassy > 0.5 ? vec2(0.44, 0.34) : vec2(0.26, 0.26);
    float win = (1.0 - smoothstep(hw.x - w.x, hw.x + w.x, f.x)) * (1.0 - smoothstep(hw.y - w.y, hw.y + w.y, f.y));
    win *= 1.0 - smoothstep(0.35, 0.6, max(w.x, w.y)); // jauh → rata
    float lit = 0.8 + 0.4 * rnd(floor(g)); // tiap jendela sedikit beda terang
    vec3 glass = glassy > 0.5 ? mix(base * 0.8, vec3(150.0, 178.0, 206.0) / 255.0, 0.25 + 0.45 * rel) : vec3(64.0, 72.0, 84.0) / 255.0;
    vec3 frame = glassy > 0.5 ? base * 0.55 : base * 0.86;
    c = mix(frame, glass * lit, win);
    c *= mix(0.6, 1.0, smoothstep(0.0, 0.1, vLocal.y)); // bayangan di pangkal
  }
  c *= 0.48 + 0.85 * max(0.0, dot(n, uSun));
  gl_FragColor = vec4(fogged(c, vDepth), 1.0);
}`;

let GROUND = null;
function buildGround() {
  if (GROUND) return GROUND;
  const W = buildWorld();
  const T = corridorTile();
  const { x0, y0, w: cw, h: chh, s } = CORRIDOR;
  const { th, tlit, TW, TH } = T;
  const sun3 = new THREE.Vector3(SUN.Lx, SUN.Lz, SUN.Ly);

  // --- data per teksel petak: R sungai, G hutan, B tanah kota, A kedalaman danau ---
  const data = new Uint8Array(TW * TH * 4);
  const cityTest = (x, y) => Math.hypot(x - CITY_X, y - CITY_Y) < CITY_R * (0.75 + 0.5 * vnoise(x / 3, y / 3, 5));
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const k = j * TW + i;
      const wx = x0 + i / s;
      const wy = y0 + j / s;
      const wi = (wy | 0) * GW + (wx | 0);
      const hh = th[k];
      let r = 0;
      let gg = 0;
      let b = 0;
      let a = 0;
      if (W.basin[wi] && hh < LL) a = Math.min(1, (LL - hh) / 0.15);
      const inCity = hh > LL + 0.004 && cityTest(wx, wy);
      if (inCity) b = 1;
      if (W.river[wi] && !W.basin[wi]) {
        const rn = Math.abs(fbm(wx / 38, wy / 38, 11, 4));
        if (rn < 0.004) r = 1 - rn / 0.004;
      }
      if (!inCity && !a && hh > 0.012 && hh < 0.66 && !(W.basin[wi] && hh < LL + 0.02)) {
        const thr = 0.56 + Math.max(0, hh - LL) * 0.25;
        gg = sstep((forestCluster(wx, wy) - thr) / 0.05);
      }
      data[k * 4] = r * 255;
      data[k * 4 + 1] = gg * 255;
      data[k * 4 + 2] = b * 255;
      data[k * 4 + 3] = a * 255;
    }
  }
  const dataTex = new THREE.DataTexture(data, TW, TH, THREE.RGBAFormat);
  dataTex.magFilter = THREE.LinearFilter;
  dataTex.minFilter = THREE.LinearFilter;
  dataTex.needsUpdate = true;
  // jarak dari pantai untuk warna laut (paparan pirus → laut dalam)
  const coast = new Uint8Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) coast[i] = Math.min(255, (W.dOut[i] / 30) * 255);
  const coastTex = new THREE.DataTexture(coast, GW, GH, THREE.RedFormat);
  coastTex.magFilter = THREE.LinearFilter;
  coastTex.minFilter = THREE.LinearFilter;
  coastTex.needsUpdate = true;

  const U = {
    uCam: { value: new THREE.Vector3() }, uCurve: { value: 2.2 }, uFront: { value: new THREE.Vector2() },
    uRT: { value: 0 }, uWater: { value: 0 }, uHz: { value: new THREE.Color() }, uTop: { value: new THREE.Color() },
    uZFar: { value: 720 }, uHaze: { value: 1 }, uRFull: { value: 0 }, uRForest: { value: 0 }, uRCity: { value: 0 },
    uRiver: { value: 1 }, uGrid: { value: 6 }, uLL: { value: LL }, uShore: { value: 0 }, uCity: { value: new THREE.Vector2(CITY_X, CITY_Y) },
    uSun: { value: sun3 }, uData: { value: dataTex }, uCoast: { value: coastTex }, uWorld: { value: new THREE.Vector2(GW, GH) },
    uTile: { value: new THREE.Vector4(x0, y0, cw, chh) }
  };
  const terrainMat = (tileMode, hole) => new THREE.ShaderMaterial({
    uniforms: { ...U, uTileMode: { value: tileMode }, uHole: { value: new THREE.Vector4(...hole) } },
    vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS
  });

  // mesh grid umum: posisi (x, 0, y), tinggi & bayangan sebagai atribut, normal dari fungsi tinggi
  const gridMesh = (gx0, gy0, nx, ny, step, hAt, litAt, mat) => {
    const n = (nx + 1) * (ny + 1);
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const hA = new Float32Array(n);
    const sA = new Float32Array(n);
    let v = 0;
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++, v++) {
        const x = gx0 + i * step;
        const y = gy0 + j * step;
        const h = hAt(x, y);
        pos[v * 3] = x;
        pos[v * 3 + 2] = y;
        hA[v] = h;
        sA[v] = litAt(x, y);
        const e = Math.max(step, 0.17);
        const dx = ((Math.max(0, hAt(x + e, y)) - Math.max(0, hAt(x - e, y))) * HS) / (2 * e);
        const dy = ((Math.max(0, hAt(x, y + e)) - Math.max(0, hAt(x, y - e))) * HS) / (2 * e);
        const il = 1 / Math.sqrt(dx * dx + dy * dy + 1);
        nor[v * 3] = -dx * il;
        nor[v * 3 + 1] = il;
        nor[v * 3 + 2] = -dy * il;
      }
    }
    const idx = new Uint32Array(nx * ny * 6);
    let q = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('aH', new THREE.BufferAttribute(hA, 1));
    geo.setAttribute('aShadow', new THREE.BufferAttribute(sA, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    return m;
  };
  const tileH = (x, y) => {
    const tx = Math.min(TW - 1.001, Math.max(0, (x - x0) * s));
    const ty = Math.min(TH - 1.001, Math.max(0, (y - y0) * s));
    const i = tx | 0;
    const j = ty | 0;
    const fx = tx - i;
    const fy = ty - j;
    const k = j * TW + i;
    return th[k] + (th[k + 1] - th[k]) * fx + (th[k + TW] - th[k]) * fy + (th[k] - th[k + 1] - th[k + TW] + th[k + TW + 1]) * fx * fy;
  };
  const tileLit = (x, y) => {
    // rata-rata 5×5 teksel → tepi bayangan lembut, tanpa gerigi di punggungan
    const i0 = Math.round((x - x0) * s);
    const j0 = Math.round((y - y0) * s);
    let sum = 0;
    let n = 0;
    for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 2; i <= i0 + 2; i++) {
      if (i < 0 || j < 0 || i >= TW || j >= TH) continue;
      sum += tlit[j * TW + i];
      n++;
    }
    return n ? sum / n : 1;
  };
  const worldH = (x, y) => {
    const ix = Math.max(0, Math.min(GW - 2, Math.floor(x)));
    const iy = Math.max(0, Math.min(GH - 2, Math.floor(y)));
    const fx = Math.min(1, Math.max(0, x - ix));
    const fy = Math.min(1, Math.max(0, y - iy));
    const i = iy * GW + ix;
    const H = W.H;
    return H[i] + (H[i + 1] - H[i]) * fx + (H[i + GW] - H[i]) * fy + (H[i] - H[i + 1] - H[i + GW] + H[i + GW + 1]) * fx * fy;
  };
  const scene = new THREE.Scene();
  // langit: kubah yang selalu berpusat di kamera
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uHz: U.uHz, uTop: U.uTop }, vertexShader: SKY_VS, fragmentShader: SKY_FS,
    side: THREE.BackSide, depthWrite: false, depthTest: false
  }));
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);
  // petak koridor: 6 verteks per px dunia
  const ts = 1 / 6;
  scene.add(gridMesh(x0, y0, Math.round(cw / ts), Math.round(chh / ts), ts, tileH, tileLit, terrainMat(1, [0, 0, 0, 0])));
  // medan dasar di sekitarnya (lubang di petak koridor)
  const F = FAR;
  scene.add(gridMesh(F.x0, F.y0, (F.x1 - F.x0) / F.step, (F.y1 - F.y0) / F.step, F.step, worldH, () => 1,
    terrainMat(0, [x0 + 0.3, y0 + 0.3, x0 + cw - 0.3, y0 + chh - 0.3])));
  // dasar laut sampai cakrawala (lubang di area medan dasar)
  const SEA = 4000;
  scene.add(gridMesh(-SEA, -SEA, 128, 128, (2 * SEA) / 128, () => -0.7, () => 1,
    terrainMat(0, [F.x0 + 1, F.y0 + 1, F.x1 - 1, F.y1 - 1])));

  // air: danau (kotak di sekitar kaldera) & laut (bidang luas)
  const waterMat = (lake) => new THREE.ShaderMaterial({
    uniforms: { ...U, uLevel: { value: 0 }, uLake: { value: lake } }, vertexShader: WATER_VS, fragmentShader: WATER_FS
  });
  const plane = (px0, py0, px1, py1, seg, mat) => {
    const g = new THREE.PlaneGeometry(px1 - px0, py1 - py0, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate((px0 + px1) / 2, 0, (py0 + py1) / 2);
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    return m;
  };
  const lakeMesh = plane(TOBA.cx - 36, TOBA.cy - 30, TOBA.cx + 36, TOBA.cy + 30, 72, waterMat(1));
  const seaMesh = plane(-SEA, -SEA, SEA, SEA, 160, waterMat(0));
  scene.add(lakeMesh, seaMesh);

  // pohon (instans) dari teksel hutan
  const trees = [];
  const step = 1 / 12;
  for (let y = y0 + 0.5; y < y0 + chh - 0.5; y += step) {
    for (let x = x0 + 0.5; x < x0 + cw - 0.5; x += step) {
      const ix = (x * 12) | 0;
      const iy = (y * 12) | 0;
      const jx = x + (hash(ix, iy, 31) - 0.5) * step;
      const jy = y + (hash(ix, iy, 37) - 0.5) * step;
      const k = (Math.round((jy - y0) * s) * TW + Math.round((jx - x0) * s)) * 4;
      const gcov = data[k + 1] / 255;
      if (gcov <= 0 || hash(ix, iy, 9) > 0.85 * gcov) continue;
      trees.push(jx, jy, tileH(jx, jy), hash(ix, iy, 12));
    }
  }
  const coneGeo = new THREE.ConeGeometry(1, 1, 6, 1, true);
  coneGeo.translate(0, 0.5, 0);
  const treeGeo = new THREE.InstancedBufferGeometry().copy(coneGeo);
  treeGeo.instanceCount = trees.length / 4;
  treeGeo.setAttribute('iT', new THREE.InstancedBufferAttribute(new Float32Array(trees), 4));
  const treeMesh = new THREE.Mesh(treeGeo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: TREE_VS, fragmentShader: TREE_FS }));
  treeMesh.frustumCulled = false;
  scene.add(treeMesh);

  // gedung: satu kavling per blok 1/6 px (jalan tiap blok ke-3), kadang dibagi dua; menara kaca di pusat
  const bP = [];
  const bI = [];
  const B = 6;
  const R = CITY_R * 1.3;
  for (let by = Math.floor((CITY_Y - R) * B); by <= (CITY_Y + R) * B; by++) {
    for (let bx = Math.floor((CITY_X - R) * B); bx <= (CITY_X + R) * B; bx++) {
      if (bx % 3 === 0 || by % 3 === 0) continue;
      const cx = (bx + 0.5) / B;
      const cy = (by + 0.5) / B;
      const g0 = tileH(cx, cy);
      if (g0 <= LL + 0.004 || !cityTest(cx, cy)) continue;
      const dj = Math.hypot(cx - CITY_X, cy - CITY_Y);
      const down = Math.exp(-((dj / 2.8) ** 2));
      const parts = hash(bx, by, 14) < 0.45 && down < 0.5 ? 2 : 1;
      for (let q = 0; q < parts; q++) {
        const hb = hash(bx * 2 + q, by, 4);
        const tall = down * hb > 0.16 ? 1 : 0;
        const bh = 0.003 + hb * 0.007 + down * (0.025 + hb * hb * 0.13);
        const inset = 0.016;
        let w = 1 / B - inset * 2;
        let d = w;
        let px = bx / B + inset;
        let py = by / B + inset;
        if (parts === 2) {
          w = w / 2 - 0.006;
          px += q * (w + 0.012);
        }
        if (tall) { d *= 0.9; w *= 0.9; }
        bP.push(px, py, w, d);
        bI.push(g0, bh, hash(bx, by * 3 + q, 6), tall);
      }
    }
  }
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0.5, 0.5, 0.5);
  const bldGeo = new THREE.InstancedBufferGeometry().copy(boxGeo);
  bldGeo.instanceCount = bP.length / 4;
  bldGeo.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(bP), 4));
  bldGeo.setAttribute('iI', new THREE.InstancedBufferAttribute(new Float32Array(bI), 4));
  const bldMesh = new THREE.Mesh(bldGeo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: BLD_VS, fragmentShader: BLD_FS }));
  bldMesh.frustumCulled = false;
  scene.add(bldMesh);

  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.08, 4000);
  GROUND = { scene, camera, U, lakeMesh, seaMesh, trees: trees.length / 4, buildings: bP.length / 4 };
  return GROUND;
}

function renderGround(p, Wd, Ht) {
  const G = buildGround();
  const r = getGL(Wd, Ht);
  const { U, camera } = G;
  const sk = p.sky;
  const sp = p.space;
  U.uHz.value.setRGB(lerp(lerp(150, 214, sk), 40, sp) / 255, lerp(lerp(158, 224, sk), 70, sp) / 255, lerp(lerp(166, 232, sk), 120, sp) / 255);
  U.uTop.value.setRGB(lerp(lerp(84, 92, sk), 4, sp) / 255, lerp(lerp(96, 140, sk), 6, sp) / 255, lerp(lerp(112, 198, sk), 14, sp) / 255);
  U.uCam.value.set(p.camX, p.camY, p.camZ);
  U.uCurve.value = p.curve;
  U.uFront.value.set(p.frontX, p.frontY);
  U.uRT.value = p.rTerrain;
  U.uWater.value = p.water;
  U.uZFar.value = p.zFar;
  U.uHaze.value = p.haze;
  U.uRFull.value = p.rFull;
  U.uRForest.value = p.rForest;
  U.uRCity.value = p.rCity;
  U.uRiver.value = p.riverLevel;
  U.uGrid.value = p.gridSize;
  U.uShore.value = sstep((p.water - 0.6) / 0.4);
  G.lakeMesh.material.uniforms.uLevel.value = p.rWater > 0 ? LL - 0.17 * (1 - p.water) : -1;
  G.seaMesh.material.uniforms.uLevel.value = p.rWater > 0 ? -0.015 - 0.75 * (1 - p.water) : -1; // sedikit di bawah lantai grid (tanpa z-fighting)
  // kamera: sudut pandang horizontal p.fov; cakrawala di p.horizon (0 = atas, 1 = bawah) + menunduk tambahan
  const aspect = Wd / Ht;
  const tanV = Math.tan((p.fov * Math.PI) / 360) / aspect;
  camera.fov = (2 * Math.atan(tanV) * 180) / Math.PI;
  camera.aspect = aspect;
  camera.near = Math.max(0.05, p.camZ * 0.006);
  camera.updateProjectionMatrix();
  const pitch = Math.min(1.5, Math.atan((0.5 - p.horizon) * 2 * tanV) + (p.tiltDown * Math.PI) / 180);
  const yaw = (p.yaw * Math.PI) / 180;
  camera.position.set(p.camX, p.camZ * VS, p.camY);
  camera.up.set(0, 1, 0);
  camera.lookAt(p.camX + Math.cos(yaw) * Math.cos(pitch), p.camZ * VS - Math.sin(pitch), p.camY + Math.sin(yaw) * Math.cos(pitch));
  camera.rotateZ((p.roll * Math.PI) / 180);
  r.setClearColor(0x000000, 1);
  r.render(G.scene, camera);
  return r.domElement;
}

// ---------- orbit 3D (Three.js): dunia yang sama ditempel di bola planet, relief sungguhan, atmosfer ----------
// Kepulauan dibangun dari peta tinggi yang sama dengan terbang rendah, jadi benua di akhir = dunia yang baru dibangun.
const PR = 1000; // jari-jari planet (satuan 3D)
const ANG = 2.32 / 13000; // sudut per piksel dunia: planet ±2× bumi supaya kepulauan terlihat utuh di depan (±22°)
const GSTEP = 3; // satu verteks per 3 px dunia
const RELIEF = 3; // tinggi relief (dibesarkan secukupnya supaya terbaca dari orbit)
let GLOBE = null;

// titik dunia (px) → arah di bola (lintang/bujur dihitung dari pusat peta)
function sphereDir(x, y) {
  const a = (x - GW / 2) * ANG;
  const b = -(y - GH / 2) * ANG;
  return new THREE.Vector3(Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a));
}

function softDot(size, inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.25, outer);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildGlobe() {
  if (GLOBE) return GLOBE;
  const world = buildWorld();
  const renderer = getGL(1920, 1080);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.5, 60000);

  // permukaan: grid melengkung mengikuti bola + relief dari peta tinggi
  const nx = Math.floor(GW / GSTEP);
  const ny = Math.floor(GH / GSTEP);
  const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
  const uv = new Float32Array((nx + 1) * (ny + 1) * 2);
  let o = 0;
  let u = 0;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = Math.min(GW - 1, i * GSTEP);
      const y = Math.min(GH - 1, j * GSTEP);
      let h = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) h += Math.max(0, world.H[Math.min(GH - 1, Math.max(0, y + dy)) * GW + Math.min(GW - 1, Math.max(0, x + dx))]);
      h = Math.min(h / 25, 0.45); // puncak dipangkas: dari orbit relief cukup terasa, tanpa kerucut gelap
      const d = sphereDir(x, y).multiplyScalar(PR + h * RELIEF);
      pos[o++] = d.x;
      pos[o++] = d.y;
      pos[o++] = d.z;
      uv[u++] = x / GW;
      uv[u++] = 1 - y / GH;
    }
  }
  const idx = new Uint32Array(nx * ny * 6);
  let q = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const tex = new THREE.CanvasTexture(world.tex3d);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.68, metalness: 0 }));
  scene.add(land);

  // sisa planet: laut dalam
  const sea = new THREE.Mesh(new THREE.SphereGeometry(PR - 0.6, 160, 96), new THREE.MeshStandardMaterial({ color: 0x163a4c, roughness: 0.68, metalness: 0 }));
  scene.add(sea);

  // atmosfer: kabut tipis di permukaan + pendar tebal di tepi (limb)
  const glowMat = (strength, power, side) => new THREE.ShaderMaterial({
    uniforms: { strength: { value: strength }, power: { value: power } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float strength; uniform float power; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), power); gl_FragColor = vec4(vec3(0.72,0.86,1.0) * f * strength, f * strength); }',
    side, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const haze = new THREE.Mesh(new THREE.SphereGeometry(PR + 14, 160, 96), glowMat(1.15, 2.6, THREE.FrontSide));
  // pendar di luar tepi planet: paling terang tepat di tepi, memudar ke angkasa (tanpa celah gelap)
  const edge = Math.sqrt(1 - 1 / (1.05 * 1.05)); // nilai dot di arah tepi planet
  const rimMat = new THREE.ShaderMaterial({
    uniforms: { strength: { value: 1 }, edge: { value: edge } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float strength; uniform float edge; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(abs(dot(vN, vV)) / edge, 0.0, 1.0), 4.5); gl_FragColor = vec4(vec3(0.55,0.76,1.0) * f * strength, f * strength); }',
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(PR * 1.05, 160, 96), rimMat);
  scene.add(haze, rim);

  // bintang
  const sp = new Float32Array(2400 * 3);
  for (let i = 0; i < 2400; i++) {
    const v = new THREE.Vector3(hash(i, 1, 33) * 2 - 1, hash(i, 2, 33) * 2 - 1, hash(i, 3, 33) * 2 - 1).normalize().multiplyScalar(40000);
    sp.set([v.x, v.y, v.z], i * 3);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 }));
  scene.add(stars);

  // lampu kota
  const lp = new Float32Array(world.cityPts.length * 3);
  world.cityPts.forEach(([x, y], i) => {
    const d = sphereDir(x, y).multiplyScalar(PR + RELIEF * 0.3 + 1);
    lp.set([d.x, d.y, d.z], i * 3);
  });
  const lightsMat = new THREE.PointsMaterial({ map: softDot(64, 'rgba(255,240,200,1)', 'rgba(255,170,70,0.55)'), size: 40, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lights = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lp, 3)), lightsMat);
  scene.add(lights);

  // matahari dari kiri atas depan
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.6);
  sun.position.set(-0.6, 0.55, 0.75).multiplyScalar(5000);
  const amb = new THREE.HemisphereLight(0xbfd8ff, 0x403040, 0.8);
  scene.add(sun, amb);

  GLOBE = { renderer, scene, camera, sun, amb, lightsMat, haze, rim };
  return GLOBE;
}

// kamera: melihat titik (orbitX, orbitY) dari ketinggian alt, dimiringkan tilt° ke arah selatan (menghadap utara)
function renderGlobe(p, Wd, Ht) {
  const G = buildGlobe();
  getGL(Wd, Ht);
  G.camera.aspect = Wd / Ht;
  const n = sphereDir(p.orbitX, p.orbitY);
  const target = n.clone().multiplyScalar(PR);
  const north = new THREE.Vector3(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).normalize();
  const tilt = (p.tilt * Math.PI) / 180;
  const back = n.clone().multiplyScalar(Math.cos(tilt)).sub(north.clone().multiplyScalar(Math.sin(tilt)));
  G.camera.position.copy(target).add(back.multiplyScalar(p.alt));
  G.camera.up.copy(north);
  G.camera.fov = p.gfov;
  G.camera.near = Math.max(0.05, p.alt * 0.02);
  G.camera.updateProjectionMatrix();
  G.camera.lookAt(target.clone().add(north.clone().multiplyScalar(p.alt * p.lookAhead)));
  // malam & lampu kota
  G.sun.intensity = 2.6 * (1 - p.night * 0.85);
  G.amb.intensity = 0.8 * (1 - p.night * 0.6);
  G.lightsMat.opacity = p.lights;
  G.lightsMat.size = 18 + 30 * p.lights;
  G.haze.material.uniforms.strength.value = 1.15 * p.space;
  G.rim.material.uniforms.strength.value = 0.85 * p.space;
  G.renderer.setClearColor(0x020309, 1);
  G.renderer.render(G.scene, G.camera);
  return G.renderer.domElement;
}

export default {
  type: 'worldbuild',
  name: 'Dunia dibangun (peta)',
  icon: '◍',
  category: 'Promo',
  order: 47,
  fullFrame: true,
  defaults: {
    frame: 0,
    rTerrain: 0, rFull: 0, rWater: 0, rForest: 0, rCity: 0, riverLevel: 1,
    camX: 438, camY: 290, camZ: 9, yaw: -90, fov: 70, horizon: 0.42, haze: 1, zFar: 720,
    view: 0, orbitX: 1280, orbitY: 500, alt: 1800, tilt: 38, gfov: 34, lookAhead: 0, space: 1, night: 0, lights: 0,
    frontX: 405, frontY: 302, gridSize: 6, roll: 0, tiltDown: 0, curve: 2.2, sky: 1, water: 1
  },
  schema: [
    { key: 'frame', label: 'Masuk viewport editor (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'rTerrain', label: 'Front gunung (px)', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'rFull', label: 'Front warna asli (px)', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'rWater', label: 'Front laut (px)', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'water', label: 'Air naik: danau & laut (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'sky', label: 'Langit: abu-abu editor → biru (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'riverLevel', label: 'Ambang sungai (1 = mati)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'rForest', label: 'Front hutan (px)', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'rCity', label: 'Front kota (px)', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'camX', label: 'Kamera X', kind: 'number', step: 0.5, animatable: true },
    { key: 'camY', label: 'Kamera Y', kind: 'number', step: 0.5, animatable: true },
    { key: 'camZ', label: 'Ketinggian kamera', kind: 'number', step: 0.1, animatable: true },
    { key: 'yaw', label: 'Arah kamera °', kind: 'number', step: 1, animatable: true },
    { key: 'fov', label: 'Sudut pandang °', kind: 'number', min: 20, max: 110, step: 1, animatable: true },
    { key: 'horizon', label: 'Posisi cakrawala (0–1)', kind: 'number', step: 0.01, animatable: true },
    { key: 'haze', label: 'Kabut', kind: 'number', min: 0, max: 2, step: 0.05, animatable: true },
    { key: 'roll', label: 'Kemiringan kamera (bank) °', kind: 'number', step: 0.1, animatable: true },
    { key: 'tiltDown', label: 'Kamera menunduk tambahan °', kind: 'number', min: 0, max: 85, step: 0.5, animatable: true },
    { key: 'curve', label: 'Kelengkungan cakrawala', kind: 'number', min: 0, step: 0.1, animatable: true },
    { key: 'view', label: 'Dekat → orbit (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'orbitX', label: 'Orbit pusat X', kind: 'number', step: 1, animatable: true },
    { key: 'orbitY', label: 'Orbit pusat Y', kind: 'number', step: 1, animatable: true },
    { key: 'alt', label: 'Orbit: ketinggian kamera', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'tilt', label: 'Orbit: kemiringan kamera °', kind: 'number', min: 0, max: 85, step: 0.5, animatable: true },
    { key: 'gfov', label: 'Orbit: sudut pandang °', kind: 'number', min: 10, max: 90, step: 0.5, animatable: true },
    { key: 'lookAhead', label: 'Orbit: pandang ke depan', kind: 'number', step: 0.01, animatable: true },
    { key: 'space', label: 'Angkasa (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'night', label: 'Malam (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'lights', label: 'Lampu kota (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },

  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const { width: W, height: H } = env.comp;
    const vp = editorViewport(W, H, p.frame);
    ctx.save();
    ctx.translate(-W / 2, -H / 2);
    ctx.beginPath();
    ctx.rect(vp.x, vp.y, vp.w, vp.h);
    ctx.clip();
    ctx.translate(vp.x, vp.y);
    ctx.scale(vp.w / W, vp.h / H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (p.view < 1) ctx.drawImage(renderGround(p, W, H), 0, 0, W, H);
    if (p.view > 0) {
      ctx.save();
      ctx.globalAlpha *= p.view;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(renderGlobe(p, W, H), 0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }
};
