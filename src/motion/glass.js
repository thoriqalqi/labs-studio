// Kaca untuk kartu UI (mirip CSS backdrop-filter, gaya Liquid Glass): membaca apa yang sudah tergambar di
// belakang layer (kanvas komposisi = env.ctx.canvas), lalu menggambar kotak membulat dari kaca: isi di
// belakangnya dibiaskan (melengkung di dekat tepi, tengah hampir 1:1), dicampur versi buram & warna kaca,
// diberi pelangi tipis, garis kilau, cahaya lembut, dan bayangan. Dihitung di shader WebGL.
//
// drawGlassRect(ctx, env, x, y, w, h, r, opts): x, y, w, h, r di koordinat ctx saat ini (setelah transform layer).
// opts: { tint: '#ffffff', tintAmount: 0.3, frost: 0.5, refract: 0.8, bevel: 0.45, chroma: 0.4, rim: 0.9, shadow: 0.14 }
// Tanpa WebGL / tanpa latar → kotak berwarna biasa.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uSrc;
uniform sampler2D uBlur;
uniform vec2 uRes;
uniform vec2 uC;
uniform vec2 uHB;
uniform float uRad;
uniform float uRot;
uniform float uBevel;
uniform float uRefract;
uniform float uFrost;
uniform float uChroma;
uniform float uRim;
uniform float uShadow;
uniform vec4 uTint;
varying vec2 vUv;

float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
vec2 rot(vec2 p, float a) {
  float c = cos(a); float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
// bagian latar yang transparan (mis. saat layer dirender sendirian) dianggap berwarna kaca
vec3 src(vec2 px) { vec4 c = texture2D(uSrc, clamp(px / uRes, 0.0, 1.0)); return mix(uTint.rgb, c.rgb, c.a); }
vec3 blr(vec2 px) { vec4 c = texture2D(uBlur, clamp(px / uRes, 0.0, 1.0)); return mix(uTint.rgb, c.rgb, c.a); }

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 q = rot(px - uC, -uRot);
  float d = sdBox(q, uHB, uRad);
  // bayangan lembut di luar kaca (sedikit ke bawah)
  float ds = sdBox(rot(px - uC - vec2(0.0, uHB.y * 0.12 + 4.0), -uRot), uHB, uRad);
  float soft = min(uHB.x, uHB.y) * 0.5 + 10.0;
  float shadowA = (1.0 - smoothstep(0.0, soft, ds)) * uShadow;
  float inside = clamp(0.5 - d, 0.0, 1.0);
  if (inside <= 0.0) { gl_FragColor = vec4(0.08, 0.1, 0.2, shadowA); return; }

  float e = 1.0;
  vec2 n = vec2(sdBox(q + vec2(e, 0.0), uHB, uRad) - sdBox(q - vec2(e, 0.0), uHB, uRad),
                sdBox(q + vec2(0.0, e), uHB, uRad) - sdBox(q - vec2(0.0, e), uHB, uRad));
  n = normalize(n + vec2(1e-5));
  vec2 nW = rot(n, uRot);
  float t = clamp(-d / uBevel, 0.0, 1.0);
  float k = pow(1.0 - t, 2.2);
  vec2 s = uC + (px - uC) / (1.0 + 0.03 * uRefract) + nW * k * uBevel * uRefract;
  vec2 ch = nW * k * uChroma * 6.0;
  vec3 g = vec3(src(s + ch).r, src(s).g, src(s - ch).b);
  g = mix(g, blr(s), clamp(uFrost, 0.0, 1.0));
  g = mix(g, uTint.rgb, uTint.a);
  vec2 L = normalize(vec2(-0.6, -0.8));
  float rimLine = exp(d / 1.3);
  float spec = rimLine * (pow(max(dot(nW, L), 0.0), 1.4) + 0.55 * pow(max(dot(nW, -L), 0.0), 1.4)) * uRim;
  float glow = k * (0.25 + 0.75 * max(dot(nW, L), 0.0)) * 0.14 * uRim;
  float shade = k * max(dot(nW, -L), 0.0) * 0.06;
  g = clamp(g + vec3(spec + glow) - vec3(shade), 0.0, 1.0);
  // tepi halus: campur kaca dengan bayangan di garis tepi
  float a = inside + shadowA * (1.0 - inside);
  vec3 col = mix(vec3(0.08, 0.1, 0.2), g, inside / max(a, 1e-4));
  gl_FragColor = vec4(col, a);
}`;

let eng = null;
function engine() {
  if (eng !== null) return eng || null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: true });
    if (!gl) throw new Error('WebGL tidak tersedia');
    const sh = (type, srcText) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, srcText);
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
    for (const n of ['uSrc', 'uBlur', 'uRes', 'uC', 'uHB', 'uRad', 'uRot', 'uBevel', 'uRefract', 'uFrost', 'uChroma', 'uRim', 'uShadow', 'uTint']) u[n] = gl.getUniformLocation(prog, n);
    const tex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const src = document.createElement('canvas');
    const blur = document.createElement('canvas');
    eng = { canvas, gl, u, srcTex: tex(), blurTex: tex(), src, blur };
  } catch (err) {
    console.warn('Kaca kartu: WebGL gagal, memakai kotak biasa', err);
    eng = false;
    return null;
  }
  return eng;
}

const rgb = (hex) => {
  const m = /^#?([0-9a-f]{6})/i.exec(String(hex || '#ffffff'));
  const n = parseInt(m ? m[1] : 'ffffff', 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function drawGlassRect(ctx, env, x, y, w, h, r, opts = {}) {
  const o = { tint: '#ffffff', tintAmount: 0.3, frost: 0.5, refract: 0.8, bevel: 0.45, chroma: 0.4, rim: 0.9, shadow: 0.14, ...opts };
  const back = env?.ctx?.canvas;
  const e = back && back.width > 0 ? engine() : null;
  if (!e || w < 2 || h < 2) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    ctx.fillStyle = o.tint;
    ctx.fill();
    return;
  }
  // kotak kartu → piksel kanvas komposisi (ctx bisa kanvas kecil untuk blur: diskalakan ke kanvas utama)
  const m = ctx.getTransform();
  const kf = back.width / ctx.canvas.width;
  const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [(m.a * px + m.c * py + m.e) * kf, (m.b * px + m.d * py + m.f) * kf]);
  const sc = Math.hypot(m.a, m.b) * kf;
  const ang = Math.atan2(m.b, m.a);
  const hw = (w / 2) * sc;
  const hh = (h / 2) * sc;
  const rad = Math.min(r * sc, hw, hh);
  const bevel = Math.max(2, Math.min(hw, hh) * o.bevel);
  const pad = Math.ceil(bevel * o.refract + Math.min(hw, hh) * 0.6 + 24);
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const rx0 = Math.max(0, Math.floor(Math.min(...xs) - pad));
  const ry0 = Math.max(0, Math.floor(Math.min(...ys) - pad));
  const rx1 = Math.min(back.width, Math.ceil(Math.max(...xs) + pad));
  const ry1 = Math.min(back.height, Math.ceil(Math.max(...ys) + pad));
  const rw = rx1 - rx0;
  const rh = ry1 - ry0;
  if (rw < 2 || rh < 2) return;
  const cx = (corners[0][0] + corners[3][0]) / 2 - rx0;
  const cy = (corners[0][1] + corners[3][1]) / 2 - ry0;

  // salin latar di belakang kartu + versi kecil yang diburamkan
  const { gl, u, canvas, src, blur } = e;
  if (src.width !== rw || src.height !== rh) {
    src.width = rw;
    src.height = rh;
  }
  const sg = src.getContext('2d');
  sg.clearRect(0, 0, rw, rh);
  sg.drawImage(back, rx0, ry0, rw, rh, 0, 0, rw, rh);
  const bw = Math.max(8, Math.round(rw / 6));
  const bh = Math.max(8, Math.round(rh / 6));
  if (blur.width !== bw || blur.height !== bh) {
    blur.width = bw;
    blur.height = bh;
  }
  const bg = blur.getContext('2d');
  bg.clearRect(0, 0, bw, bh);
  bg.filter = 'none';
  bg.drawImage(src, 0, 0, bw, bh); // alas tanpa blur supaya tepinya tidak memudar
  bg.filter = 'blur(3px)';
  bg.drawImage(src, 0, 0, bw, bh);
  bg.filter = 'none';

  if (canvas.width !== rw || canvas.height !== rh) {
    canvas.width = rw;
    canvas.height = rh;
  }
  gl.viewport(0, 0, rw, rh);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, e.srcTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, e.blurTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blur);
  gl.uniform1i(u.uSrc, 0);
  gl.uniform1i(u.uBlur, 1);
  gl.uniform2f(u.uRes, rw, rh);
  gl.uniform2f(u.uC, cx, cy);
  gl.uniform2f(u.uHB, hw, hh);
  gl.uniform1f(u.uRad, rad);
  gl.uniform1f(u.uRot, ang);
  gl.uniform1f(u.uBevel, bevel);
  gl.uniform1f(u.uRefract, o.refract);
  gl.uniform1f(u.uFrost, o.frost);
  gl.uniform1f(u.uChroma, o.chroma);
  gl.uniform1f(u.uRim, o.rim);
  gl.uniform1f(u.uShadow, o.shadow);
  gl.uniform4f(u.uTint, ...rgb(o.tint), o.tintAmount);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  ctx.save();
  ctx.setTransform(1 / kf, 0, 0, 1 / kf, 0, 0);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.drawImage(canvas, rx0, ry0);
  ctx.restore();
}
