// Karakter agen bergaya maskot (seperti avatar agen di aplikasi cue): tetes, hantu, segitiga, bintang,
// hati, dan bunga abu-abu "cue". Mata berkedip sendiri, badan sedikit melayang, pupil bisa melirik.
// drawAgent() juga dipakai layer gelembung chat untuk avatar kecil.

export const AGENT_KINDS = { drop: 'Tetes', ghost: 'Hantu', triangle: 'Segitiga', star: 'Bintang', heart: 'Hati', cue: 'Bunga cue' };

function shapePath(g, kind, s) {
  g.beginPath();
  if (kind === 'triangle') {
    const pts = [[0, -0.5], [0.56, 0.42], [-0.56, 0.42]].map(([x, y]) => [x * s, y * s]);
    const r = s * 0.15;
    g.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (let i = 1; i <= 3; i++) {
      const a = pts[i % 3];
      const b = pts[(i + 1) % 3];
      g.arcTo(a[0], a[1], b[0], b[1], r);
    }
    g.closePath();
  } else if (kind === 'drop') {
    // tetes: ujung atas sedikit melengkung ke kanan, badan bulat di bawah
    const R = s * 0.43;
    const cy = s * 0.1;
    g.moveTo(s * 0.02, -s * 0.56);
    g.bezierCurveTo(s * 0.12, -s * 0.36, R * 1.02, -s * 0.2, R, cy);
    g.arc(0, cy, R, 0, Math.PI, false);
    g.bezierCurveTo(-R * 1.0, -s * 0.18, -s * 0.12, -s * 0.36, -s * 0.03, -s * 0.52);
    g.quadraticCurveTo(-s * 0.005, -s * 0.6, s * 0.02, -s * 0.56);
    g.moveTo(s * 0.06, -s * 0.47);
    g.quadraticCurveTo(s * 0.17, -s * 0.5, s * 0.2, -s * 0.6);
    g.quadraticCurveTo(s * 0.24, -s * 0.45, s * 0.1, -s * 0.4);
    g.closePath();
  } else if (kind === 'ghost') {
    // hantu: kepala bulat, sisi lurus, bawah bergelombang tiga
    const R = s * 0.4;
    const top = -s * 0.08;
    const bot = s * 0.44;
    g.moveTo(-R, top);
    g.arc(0, top, R, Math.PI, 0, false);
    g.lineTo(R, bot - s * 0.06);
    const n = 3;
    const w = (R * 2) / n;
    for (let i = 0; i < n; i++) {
      const x0 = R - i * w;
      g.quadraticCurveTo(x0 - w * 0.5, bot + s * 0.08, x0 - w, bot - s * 0.06);
    }
    g.closePath();
  } else if (kind === 'star') {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = (i % 2 ? 0.27 : 0.56) * s;
      pts.push([Math.cos(a) * r, Math.sin(a) * r + s * 0.04]);
    }
    const r = s * 0.08;
    g.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    for (let i = 1; i <= 10; i++) g.arcTo(pts[i % 10][0], pts[i % 10][1], pts[(i + 1) % 10][0], pts[(i + 1) % 10][1], r);
    g.closePath();
  } else if (kind === 'heart') {
    const k = s * 0.5;
    g.moveTo(0, k * 0.9);
    g.bezierCurveTo(-k * 1.25, k * 0.05, -k * 0.95, -k * 0.95, 0, -k * 0.45);
    g.bezierCurveTo(k * 0.95, -k * 0.95, k * 1.25, k * 0.05, 0, k * 0.9);
    g.closePath();
  } else {
    // bunga cue: lingkaran bergelombang 9 kelopak
    const n = 9;
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r = s * (0.47 + 0.055 * Math.cos(a * n));
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  }
}

// mata & alis; blink 0..1 (1 = tertutup), look = [-1..1, -1..1]
function face(g, kind, s, { blink = 0, lookX = 0, lookY = 0, brows = 'none', wink = false }) {
  const ey = kind === 'triangle' ? s * 0.13 : kind === 'drop' ? s * 0.12 : kind === 'star' ? s * 0.08 : kind === 'heart' ? -s * 0.08 : kind === 'ghost' ? s * 0.0 : 0;
  const ex = s * (kind === 'triangle' ? 0.15 : 0.14);
  const er = s * (kind === 'triangle' ? 0.115 : 0.105);
  const pr = er * 0.58;
  for (const side of [-1, 1]) {
    const cx = side * ex;
    if (wink && side === 1) {
      // mata kanan mengedip: tanda "<"
      g.beginPath();
      g.moveTo(cx + er * 0.6, ey - er * 0.7);
      g.lineTo(cx - er * 0.55, ey);
      g.lineTo(cx + er * 0.6, ey + er * 0.7);
      g.lineWidth = er * 0.42;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = '#111111';
      g.stroke();
      continue;
    }
    const sy = Math.max(0.08, 1 - blink);
    g.save();
    g.translate(cx, ey);
    g.scale(1, sy);
    g.beginPath();
    g.arc(0, 0, er, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.beginPath();
    g.arc(lookX * er * 0.38, lookY * er * 0.38, pr, 0, Math.PI * 2);
    g.fillStyle = '#111111';
    g.fill();
    g.restore();
  }
  if (brows === 'flat' || brows === 'raised') {
    g.lineCap = 'round';
    g.strokeStyle = '#111111';
    g.lineWidth = s * 0.06;
    const by = ey - er * 1.35;
    if (brows === 'flat') {
      g.beginPath();
      g.moveTo(-ex - er * 1.35, by - s * 0.01);
      g.lineTo(ex + er * 1.35, by - s * 0.01);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(-ex - er * 1.0, by + s * 0.005);
      g.quadraticCurveTo(-ex, by - s * 0.07, -ex + er * 1.0, by - s * 0.02);
      g.stroke();
      g.beginPath();
      g.moveTo(ex - er * 0.95, by - s * 0.03);
      g.lineTo(ex + er * 1.0, by - s * 0.01);
      g.stroke();
    }
  }
}

// gambar satu karakter di titik (0,0) berukuran s
export function drawAgent(g, { kind = 'triangle', color = '#3d8ef0', size = 200, blink = 0, lookX = 0, lookY = 0, brows = 'none', squash = 0 }) {
  g.save();
  g.scale(1 + squash * 0.5, 1 - squash);
  shapePath(g, kind, size);
  g.fillStyle = color;
  g.fill();
  face(g, kind, size, { blink, lookX, lookY, brows, wink: kind === 'cue' });
  g.restore();
}

// kedipan otomatis: tiap ~3–4 dtk (acak tetap per layer), tertutup ±0,14 dtk
function autoBlink(vt, seed) {
  const period = 3.1 + (seed % 7) * 0.17;
  const ph = (vt + (seed % 11) * 0.37) % period;
  const d = 0.14;
  return ph < d ? Math.sin((ph / d) * Math.PI) : 0;
}

const seedOf = (id) => [...String(id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);

export default {
  type: 'agent',
  name: 'Karakter agen',
  icon: '◭',
  category: 'Demo UI',
  order: 35,
  defaults: {
    kind: 'triangle', color: '#3d8ef0', size: 220, brows: 'none', lookX: 0, lookY: 0, float: 1, blinks: true,
    label: '', labelColor: '#6f7280', labelSize: 30, labelFont: 'Geist'
  },
  schema: [
    { key: 'kind', label: 'Bentuk', kind: 'select', options: AGENT_KINDS },
    { key: 'color', label: 'Warna', kind: 'color', animatable: true },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 8, step: 1, animatable: true },
    { key: 'brows', label: 'Alis', kind: 'select', options: { none: 'Tanpa alis', flat: 'Lurus tebal', raised: 'Satu terangkat' } },
    { key: 'lookX', label: 'Lirik kiri/kanan', kind: 'number', min: -1, max: 1, step: 0.05, animatable: true },
    { key: 'lookY', label: 'Lirik atas/bawah', kind: 'number', min: -1, max: 1, step: 0.05, animatable: true },
    { key: 'float', label: 'Gerak melayang', kind: 'number', min: 0, max: 3, step: 0.1, animatable: true },
    { key: 'blinks', label: 'Berkedip sendiri', kind: 'checkbox' },
    { key: 'label', label: 'Label di bawah', kind: 'text' },
    { key: 'labelColor', label: 'Warna label', kind: 'color' },
    { key: 'labelSize', label: 'Ukuran label', kind: 'number', min: 6, step: 1 }
  ],
  size: (p) => ({ w: p.size * 1.25, h: p.size * (p.label ? 1.55 : 1.25) }),
  draw(ctx, p, env) {
    const seed = seedOf(env.layer.id);
    const vt = env.vt;
    const s = p.size;
    const bob = Math.sin(vt * 2.2 + seed) * s * 0.025 * p.float;
    const squash = Math.sin(vt * 4.4 + seed) * 0.012 * p.float;
    const oy = p.label ? -s * 0.15 : 0;
    ctx.save();
    ctx.translate(0, oy + bob);
    drawAgent(ctx, {
      kind: p.kind, color: p.color, size: s, brows: p.brows, lookX: p.lookX, lookY: p.lookY, squash,
      blink: p.blinks ? autoBlink(vt, seed) : 0
    });
    ctx.restore();
    if (p.label) {
      ctx.fillStyle = p.labelColor;
      ctx.font = `500 ${p.labelSize}px "${p.labelFont}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, 0, oy + s * 0.72);
    }
  }
};
