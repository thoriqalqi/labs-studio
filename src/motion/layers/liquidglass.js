// Latar "kaca cair" (liquid glass) ala Apple: latar berupa foto sendiri atau gradien pastel yang mengalir,
// ditimpa kepingan kaca bening (lensa bulat, lempengan membulat, dan opsional satu panel kaca besar).
// Kaca dihitung per piksel di shader WebGL: tengahnya hampir 1:1, dekat tepi gambar di belakangnya
// tertarik & melengkung (isi dari luar kaca tertekan masuk ke pinggiran), ada pelangi tipis (aberasi warna),
// garis kilau putih di tepi, cahaya lembut, dan bayangan. Semua murni dari waktu → aman untuk ekspor.
import { drawCover } from './landscape.js';

const SMALL_W = 240;
const MAX = 9; // panel + 8 keping
let small = null;

function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// letak keping dekoratif (dari tengah layar, ternormalisasi): di sudut & tepi, sebagian keluar layar
const SPOTS = [
  [-0.44, -0.4, 1.15], [0.42, -0.44, 1.0], [0.47, 0.36, 1.2], [-0.46, 0.42, 1.0],
  [0.04, -0.56, 0.85], [-0.06, 0.58, 0.9], [-0.2, -0.5, 0.6], [0.22, 0.52, 0.6]
];

// gradien pastel yang mengalir, digambar di kanvas kecil (CPU) lalu diperhalus saat diperbesar
function gradientCanvas(p, t, W, H) {
  const sw = SMALL_W;
  const sh = Math.max(16, Math.round((SMALL_W * H) / W));
  if (!small) small = document.createElement('canvas');
  if (small.width !== sw || small.height !== sh) {
    small.width = sw;
    small.height = sh;
  }
  const g = small.getContext('2d', { willReadFrequently: true });
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = p.base;
  g.fillRect(0, 0, sw, sh);
  const colors = [p.color1, p.color2, p.color3, p.color4, p.color2, p.color1];
  const R = Math.max(sw, sh) * 0.5 * p.blobSize;
  colors.forEach((c, i) => {
    const k = i + p.seed * 7;
    const cx = sw * (0.5 + 0.45 * Math.sin(t * (0.6 + seeded(k) * 0.9) + seeded(k + 1) * 6.28));
    const cy = sh * (0.5 + 0.45 * Math.cos(t * (0.5 + seeded(k + 3) * 0.9) + seeded(k + 2) * 6.28));
    const r = R * (0.55 + seeded(k + 4) * 0.6) * (1 + 0.12 * Math.sin(t * 1.3 + i));
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, c);
    grad.addColorStop(1, `${c}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, sw, sh);
  });
  return small;
}

// ---------- WebGL ----------
const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uSrc;
uniform sampler2D uBlur;  // salinan latar yang sudah diburamkan (untuk kaca buram)
uniform vec2 uRes;
uniform float uMode;      // 0 = gradien (direntang penuh), 1 = foto (cover)
uniform vec2 uImgSize;
uniform float uZoom;
uniform vec2 uPan;
uniform float uVeil;
uniform float uTint;
uniform float uChroma;
uniform float uRim;
uniform int uCount;
uniform float uTime;
uniform float uGrain;     // butiran film (berganti 24× per detik)
uniform float uTexture;   // tekstur doff diam (seperti kertas / beton halus)
uniform float uVignette;  // tepi layar lebih gelap
uniform vec4 uA[${MAX}];  // pusat x, y, setengah lebar, setengah tinggi (px, asal kiri atas)
uniform vec4 uB[${MAX}];  // radius sudut, rotasi, buram, posisi kilau
uniform vec4 uC[${MAX}];  // pembiasan, lebar bevel (px), kekuatan kilau sapu, bayangan
varying vec2 vUv;

vec2 coverUv(vec2 uv) {
  if (uMode < 0.5) return uv;
  float A = uRes.x / uRes.y;
  float a = uImgSize.x / max(1.0, uImgSize.y);
  vec2 s = vec2(min(1.0, A / a), min(1.0, a / A)) / uZoom;
  return clamp((uv - 0.5) * s + 0.5 + uPan * (1.0 - s) * 0.5, 0.0, 1.0);
}
vec3 bg(vec2 px) {
  vec3 c = texture2D(uSrc, coverUv(px / uRes)).rgb;
  return mix(c, vec3(1.0), uVeil);
}
vec3 bgBlur(vec2 px) {
  vec2 o = vec2(14.0, 9.0);
  vec3 c = texture2D(uBlur, coverUv(px / uRes)).rgb * 0.4
    + texture2D(uBlur, coverUv((px + o) / uRes)).rgb * 0.15 + texture2D(uBlur, coverUv((px - o) / uRes)).rgb * 0.15
    + texture2D(uBlur, coverUv((px + vec2(-o.y, o.x)) / uRes)).rgb * 0.15 + texture2D(uBlur, coverUv((px - vec2(-o.y, o.x)) / uRes)).rgb * 0.15;
  return mix(c, vec3(1.0), uVeil);
}
float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec2 rot(vec2 p, float a) {
  float c = cos(a); float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec3 col = bg(px);
  vec2 L = normalize(vec2(-0.6, -0.8));
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec4 A = uA[i]; vec4 B = uB[i]; vec4 C = uC[i];
    vec2 c = A.xy; vec2 hb = A.zw; float rad = B.x; float ang = B.y;
    vec2 q = rot(px - c, -ang);
    float d = sdBox(q, hb, rad);
    if (d > 0.0) {
      // bayangan lembut di luar kaca, sedikit ke bawah
      float ds = sdBox(rot(px - c - vec2(0.0, hb.y * 0.08 + 6.0), -ang), hb, rad);
      float soft = max(hb.x, hb.y) * 0.22 + 12.0;
      col *= 1.0 - (1.0 - smoothstep(0.0, soft, ds)) * C.w;
      continue;
    }
    float e = 1.0;
    vec2 n = vec2(sdBox(q + vec2(e, 0.0), hb, rad) - sdBox(q - vec2(e, 0.0), hb, rad),
                  sdBox(q + vec2(0.0, e), hb, rad) - sdBox(q - vec2(0.0, e), hb, rad));
    n = normalize(n + vec2(1e-5));
    vec2 nW = rot(n, ang);
    float bevel = C.y;
    float t = clamp(-d / bevel, 0.0, 1.0);   // 0 di tepi, 1 di bagian datar
    float k = pow(1.0 - t, 2.2);
    // pembiasan: tengah sedikit diperbesar, dekat tepi mengambil gambar dari luar kaca (tertekan masuk)
    vec2 s = c + (px - c) / (1.0 + 0.04 * C.x) + nW * k * bevel * C.x;
    vec2 ch = nW * k * uChroma * 7.0;
    vec3 g = vec3(bg(s + ch).r, bg(s).g, bg(s - ch).b);
    if (B.z > 0.001) g = mix(g, bgBlur(s), clamp(B.z * 1.2, 0.0, 1.0));
    g = mix(g, vec3(1.0), uTint + B.z * 0.16);
    // cahaya: garis kilau tipis di tepi (terang kiri atas, sedang kanan bawah), cahaya lembut, sisi gelap tipis
    float rimLine = exp(d / 1.4);
    float spec = rimLine * (pow(max(dot(nW, L), 0.0), 1.4) + 0.55 * pow(max(dot(nW, -L), 0.0), 1.4)) * uRim;
    float glow = k * (0.25 + 0.75 * max(dot(nW, L), 0.0)) * 0.12 * uRim;
    float shade = k * max(dot(nW, -L), 0.0) * 0.07;
    // kilau yang menyapu miring
    vec2 qn = q / max(hb.x, hb.y);
    float band = dot(qn, normalize(vec2(1.0, 0.55)));
    float sweep = exp(-pow((band - B.w) / 0.14, 2.0)) * C.z * 0.22;
    g = g + vec3(spec + glow + sweep) - vec3(shade);
    float alpha = clamp(0.5 - d, 0.0, 1.0);
    col = mix(col, clamp(g, 0.0, 1.0), alpha);
  }
  // permukaan doff: tekstur halus (besar + kecil), butiran film, vinyet
  if (uTexture > 0.0) {
    float tx = fbm(px / 170.0) * 0.55 + fbm(px / 7.0) * 0.45;
    col += (tx - 0.5) * uTexture * 0.11;
  }
  if (uGrain > 0.0) {
    float gr = hash(px + floor(uTime * 24.0) * vec2(17.0, 31.0)) - 0.5;
    col += gr * uGrain * 0.14;
  }
  if (uVignette > 0.0) {
    vec2 v = px / uRes - 0.5;
    col *= 1.0 - uVignette * smoothstep(0.2, 0.85, length(v * vec2(1.0, 1.2)));
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

let eng = null;
function engine() {
  if (eng !== null) return eng || null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: false });
    if (!gl) throw new Error('WebGL tidak tersedia');
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    for (const n of ['uSrc', 'uBlur', 'uRes', 'uMode', 'uImgSize', 'uZoom', 'uPan', 'uVeil', 'uTint', 'uChroma', 'uRim', 'uCount', 'uTime', 'uGrain', 'uTexture', 'uVignette']) u[n] = gl.getUniformLocation(prog, n);
    for (const n of ['uA', 'uB', 'uC']) u[n] = gl.getUniformLocation(prog, `${n}[0]`);
    const makeTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    eng = { canvas, gl, u, gradTex: makeTex(), images: new Map(), makeTex };
  } catch (err) {
    console.warn('Kaca cair: WebGL gagal, memakai latar tanpa kaca', err);
    eng = false;
    return null;
  }
  return eng;
}

// foto latar diunggah ke GPU sekali per url, bersama salinan kecil yang sudah diburamkan (untuk kaca buram)
function imageTexture(e, img, url) {
  let t = e.images.get(url);
  if (t?.img === img) return t;
  const { gl } = e;
  const tex = t?.tex || e.makeTex();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  const bw = 320;
  const bh = Math.max(8, Math.round((bw * img.naturalHeight) / img.naturalWidth));
  const bc = document.createElement('canvas');
  bc.width = bw;
  bc.height = bh;
  const bg = bc.getContext('2d');
  bg.drawImage(img, 0, 0, bw, bh); // alas tanpa blur supaya tepinya tidak menggelap
  bg.filter = 'blur(6px)';
  bg.drawImage(img, 0, 0, bw, bh);
  const blur = t?.blur || e.makeTex();
  gl.bindTexture(gl.TEXTURE_2D, blur);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bc);
  t = { tex, blur, img, w: img.naturalWidth, h: img.naturalHeight };
  e.images.set(url, t);
  return t;
}

// semua kepingan kaca pada waktu t → isi uniform
function pieces(p, t, W, H) {
  const list = [];
  if (p.panel) {
    const inset = Math.max(0, p.panelInset);
    const hw = W / 2 - inset;
    const hh = H / 2 - inset;
    list.push({ cx: W / 2, cy: H / 2, hw, hh, rad: Math.min(p.panelRadius, hw, hh), rot: 0, frost: p.panelFrost, bevel: Math.min(hw, hh) * 0.16, sweep: 0, shadow: 0.08 });
  }
  const n = Math.max(0, Math.min(SPOTS.length, Math.round(p.count)));
  for (let i = 0; i < n; i++) {
    const k = i * 13 + p.seed * 31;
    const [nx, ny, sz] = SPOTS[i];
    const circle = p.shapes === 'circle' || (p.shapes === 'mixed' && seeded(k + 1) < 0.45);
    const scale = sz * p.glassSize;
    let hw;
    let hh;
    let rad;
    if (circle) {
      hw = hh = rad = H * (0.15 + seeded(k + 2) * 0.07) * scale;
    } else {
      hw = (W * (0.2 + seeded(k + 2) * 0.1) * scale) / 2;
      hh = (H * (0.2 + seeded(k + 3) * 0.1) * scale) / 2;
      rad = Math.min(hw, hh) * (seeded(k + 4) < 0.5 ? 1 : 0.56);
    }
    const ph = seeded(k + 5) * 6.28;
    const cx = W / 2 + nx * W + Math.sin(t * 0.23 * (0.7 + seeded(k + 6)) + ph) * W * 0.025 * p.drift;
    const cy = H / 2 + ny * H + Math.cos(t * 0.19 * (0.7 + seeded(k + 7)) + ph) * H * 0.03 * p.drift;
    const rot = circle ? 0 : (seeded(k + 8) - 0.5) * 0.5 + Math.sin(t * 0.15 + ph) * 0.06 * p.drift;
    const sweep = (((t * 0.12 + seeded(k + 9)) % 1.6) - 0.3) * 3 - 1.5;
    list.push({ cx, cy, hw, hh, rad, rot, frost: p.frost, bevel: Math.min(hw, hh) * p.bevel, sweep, shadow: 0.12 });
  }
  return list.slice(0, MAX);
}

export default {
  type: 'liquidglass',
  name: 'Kaca cair (liquid glass)',
  icon: '◌',
  category: 'Dasar',
  order: 3,
  fullFrame: true,
  defaults: {
    url: '', imgZoom: 100, imgPanX: 0, imgPanY: 0,
    base: '#eef1f7', color1: '#8cc0ff', color2: '#c6b4ff', color3: '#a3eedb', color4: '#ffd3b4',
    speed: 0.22, blobSize: 1.1, veil: 0.42, count: 6, glassSize: 1, shapes: 'mixed',
    refract: 0.9, bevel: 0.45, frost: 0, chroma: 0.5, tint: 0.05, rim: 0.9, drift: 1, sheen: 0.5, seed: 4,
    panel: false, panelInset: 70, panelRadius: 56, panelFrost: 0.6,
    texture: 0, grain: 0, vignette: 0
  },
  schema: [
    { key: 'url', label: 'Gambar latar (kosong = gradien)', kind: 'asset', accept: 'image/*' },
    { key: 'imgZoom', label: 'Zoom gambar %', kind: 'number', min: 100, max: 400, step: 1, animatable: true },
    { key: 'imgPanX', label: 'Geser gambar kiri/kanan', kind: 'number', min: -1, max: 1, step: 0.01, animatable: true },
    { key: 'imgPanY', label: 'Geser gambar atas/bawah', kind: 'number', min: -1, max: 1, step: 0.01, animatable: true },
    { key: 'base', label: 'Warna dasar', kind: 'color', animatable: true },
    { key: 'color1', label: 'Warna 1', kind: 'color', animatable: true },
    { key: 'color2', label: 'Warna 2', kind: 'color', animatable: true },
    { key: 'color3', label: 'Warna 3', kind: 'color', animatable: true },
    { key: 'color4', label: 'Warna 4', kind: 'color', animatable: true },
    { key: 'speed', label: 'Kecepatan aliran', kind: 'number', min: 0, max: 3, step: 0.05 },
    { key: 'blobSize', label: 'Ukuran gumpalan', kind: 'number', min: 0.3, max: 3, step: 0.05, animatable: true },
    { key: 'veil', label: 'Lapisan terang di latar (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'texture', label: 'Tekstur doff (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'grain', label: 'Butiran film (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'vignette', label: 'Vinyet tepi (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'count', label: 'Jumlah kepingan kaca', kind: 'number', min: 0, max: 8, step: 1 },
    { key: 'glassSize', label: 'Ukuran kaca', kind: 'number', min: 0.2, max: 3, step: 0.05, animatable: true },
    { key: 'shapes', label: 'Bentuk kaca', kind: 'select', options: { mixed: 'Campur', circle: 'Lensa bulat', slab: 'Lempengan membulat' } },
    { key: 'refract', label: 'Lengkung tepi kaca (0–2)', kind: 'number', min: 0, max: 2, step: 0.05, animatable: true },
    { key: 'bevel', label: 'Lebar tepi melengkung (0–1)', kind: 'number', min: 0.05, max: 1, step: 0.01, animatable: true },
    { key: 'chroma', label: 'Pelangi di tepi (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'frost', label: 'Buram kaca (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'tint', label: 'Putih kaca (0–0,5)', kind: 'number', min: 0, max: 0.5, step: 0.01, animatable: true },
    { key: 'rim', label: 'Pantulan tepi (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'sheen', label: 'Kilau menyapu (0–1)', kind: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'drift', label: 'Gerak melayang', kind: 'number', min: 0, max: 3, step: 0.05, animatable: true },
    { key: 'seed', label: 'Variasi pola', kind: 'number', min: 0, max: 99, step: 1 },
    { key: 'panel', label: 'Panel kaca besar di tengah', kind: 'checkbox' },
    { key: 'panelInset', label: 'Jarak panel dari tepi layar', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'panelRadius', label: 'Sudut panel', kind: 'number', min: 0, step: 1 },
    { key: 'panelFrost', label: 'Buram panel (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true }
  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const W = env.comp.width;
    const H = env.comp.height;
    const t = env.contentT;
    const img = p.url ? env.assets.image(p.url) : null;
    const e = engine();
    if (!e) {
      // cadangan tanpa WebGL: latar saja
      if (img) drawCover(ctx, img, W, H, p.imgZoom / 100);
      else ctx.drawImage(gradientCanvas(p, t * p.speed, W, H), -W / 2, -H / 2, W, H);
      if (p.veil > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, p.veil)})`;
        ctx.fillRect(-W / 2, -H / 2, W, H);
      }
      return;
    }
    const { gl, u, canvas } = e;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
    let sharp;
    let blurred;
    if (img) {
      const tex = imageTexture(e, img, p.url);
      sharp = tex.tex;
      blurred = tex.blur;
      gl.uniform1f(u.uMode, 1);
      gl.uniform2f(u.uImgSize, tex.w, tex.h);
    } else {
      // gradien memang sudah buram: tekstur yang sama dipakai untuk versi tajam & buram
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, e.gradTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gradientCanvas(p, t * p.speed, W, H));
      sharp = blurred = e.gradTex;
      gl.uniform1f(u.uMode, 0);
      gl.uniform2f(u.uImgSize, W, H);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sharp);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurred);
    gl.uniform1i(u.uSrc, 0);
    gl.uniform1i(u.uBlur, 1);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uZoom, Math.max(1, p.imgZoom / 100));
    gl.uniform2f(u.uPan, p.imgPanX, p.imgPanY);
    gl.uniform1f(u.uVeil, Math.min(1, Math.max(0, p.veil)));
    gl.uniform1f(u.uTint, p.tint);
    gl.uniform1f(u.uChroma, p.chroma);
    gl.uniform1f(u.uRim, p.rim);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uGrain, p.grain);
    gl.uniform1f(u.uTexture, p.texture);
    gl.uniform1f(u.uVignette, p.vignette);
    const list = pieces(p, t, W, H);
    const A = new Float32Array(MAX * 4);
    const B = new Float32Array(MAX * 4);
    const C = new Float32Array(MAX * 4);
    list.forEach((s, i) => {
      A.set([s.cx, s.cy, s.hw, s.hh], i * 4);
      B.set([s.rad, s.rot, s.frost, s.sweep], i * 4);
      C.set([p.refract, Math.max(2, s.bevel), p.sheen * (s.sweep ? 1 : 0), s.shadow], i * 4);
    });
    gl.uniform1i(u.uCount, list.length);
    gl.uniform4fv(u.uA, A);
    gl.uniform4fv(u.uB, B);
    gl.uniform4fv(u.uC, C);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.drawImage(canvas, -W / 2, -H / 2, W, H);
  }
};
