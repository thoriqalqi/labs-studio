// Lorong bingkai persegi yang berputar (seperti terowongan kertas), dengan cahaya matahari & pantulan lensa.
// Animasikan "Maju" untuk terbang masuk; tiap kenaikan 1 = melewati satu bingkai.
// "Pintu" = bingkai ke-n yang bagian dalamnya gelap (untuk transisi masuk ke adegan berikutnya).
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function hexRgb(hex) {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function square(ctx, s, rot, rad) {
  const c = Math.cos(rot);
  const si = Math.sin(rot);
  const hs = s / 2;
  const pts = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map(([x, y]) => [x * c - y * si, x * si + y * c]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  return rad;
}

export default {
  type: 'tunnel',
  name: 'Lorong bingkai',
  icon: '◈',
  category: 'Promo',
  order: 48,
  fullFrame: true,
  defaults: {
    progress: 0, twist: 9, spin: 0, ratio: 0.8, count: 16, door: -1, doorColor: '#3a3128',
    wall: '#b7a48f', shade: '#2c241d', fog: '#f4ead8', bg: '#14110e',
    sun: 0.9, sunX: 520, sunY: -60, sunColor: '#ffd25a', flare: 0.6
  },
  schema: [
    { key: 'progress', label: 'Maju (bingkai)', kind: 'number', step: 0.01, animatable: true },
    { key: 'twist', label: 'Putar per bingkai °', kind: 'number', step: 0.5, animatable: true },
    { key: 'spin', label: 'Putar seluruh lorong °', kind: 'number', step: 1, animatable: true },
    { key: 'ratio', label: 'Rapat bingkai (0,6–0,95)', kind: 'number', min: 0.6, max: 0.95, step: 0.01 },
    { key: 'count', label: 'Jumlah bingkai', kind: 'number', min: 3, max: 40, step: 1 },
    { key: 'door', label: 'Pintu di bingkai ke- (-1 = tidak ada)', kind: 'number', min: -1, step: 1 },
    { key: 'doorColor', label: 'Warna pintu', kind: 'color', animatable: true },
    { key: 'wall', label: 'Warna dinding', kind: 'color', animatable: true },
    { key: 'shade', label: 'Warna bayangan', kind: 'color', animatable: true },
    { key: 'fog', label: 'Warna kabut jauh', kind: 'color', animatable: true },
    { key: 'bg', label: 'Warna latar', kind: 'color' },
    { key: 'sun', label: 'Cahaya matahari (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'sunX', label: 'Matahari X (dari tengah)', kind: 'number', step: 1, animatable: true },
    { key: 'sunY', label: 'Matahari Y (dari tengah)', kind: 'number', step: 1, animatable: true },
    { key: 'sunColor', label: 'Warna matahari', kind: 'color' },
    { key: 'flare', label: 'Pantulan lensa (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true }
  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const W = env.comp.width;
    const H = env.comp.height;
    const diag = Math.hypot(W, H);
    ctx.fillStyle = p.bg;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    const q = Math.min(0.95, Math.max(0.6, p.ratio));
    const S0 = diag * 1.1;
    const wall = hexRgb(p.wall);
    const shade = hexRgb(p.shade);
    const fog = hexRgb(p.fog);
    const first = Math.floor(p.progress) - 3;
    const door = p.door >= 0 ? Math.round(p.door) : Infinity;
    const last = Math.min(first + Math.round(p.count) + 3, door);
    const rotOf = (k) => ((p.twist * k + p.spin) * Math.PI) / 180;
    const sizeOf = (k) => S0 * Math.pow(q, k - p.progress);
    ctx.lineJoin = 'round';
    for (let k = first; k <= last; k++) {
      const s = sizeOf(k);
      if (s < 4) break;
      const depth = clamp01(1 - Math.log(s / 8) / Math.log(S0 / 8)); // 0 dekat … 1 jauh
      const base = mix(mix(wall, shade, 0.15), fog, Math.pow(depth, 1.6) * 0.85);
      const dim = mix(mix(wall, shade, 0.65), fog, Math.pow(depth, 1.6) * 0.8);
      const inner = sizeOf(k + 1);
      // cincin = bingkai k dikurangi bingkai k+1
      ctx.beginPath();
      square(ctx, s, rotOf(k));
      if (k < door) square(ctx, inner, rotOf(k + 1));
      const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      g.addColorStop(0, rgb(base));
      g.addColorStop(1, rgb(dim));
      ctx.fillStyle = g;
      ctx.fill('evenodd');
      // tepi dalam: garis terang tipis + bayangan lembut ke dalam
      if (k < door) {
        ctx.beginPath();
        square(ctx, inner, rotOf(k + 1));
        ctx.strokeStyle = rgb(mix(shade, fog, depth * 0.7), 0.35);
        ctx.lineWidth = Math.max(1, inner * 0.03);
        ctx.stroke();
        ctx.strokeStyle = rgb(mix([255, 250, 240], fog, depth), 0.75);
        ctx.lineWidth = Math.max(0.8, inner * 0.004);
        ctx.stroke();
      }
    }
    // pintu gelap di ujung
    if (Number.isFinite(door)) {
      const s = sizeOf(door + 1);
      ctx.beginPath();
      square(ctx, s, rotOf(door + 1));
      ctx.fillStyle = p.doorColor;
      ctx.fill();
    }
    // kabut terang di tengah
    const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, diag * 0.45);
    fg.addColorStop(0, rgb(fog, 0.35));
    fg.addColorStop(1, rgb(fog, 0));
    ctx.fillStyle = fg;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    // matahari + pantulan lensa
    const sun = clamp01(p.sun);
    if (sun > 0) {
      const sc = hexRgb(p.sunColor);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = diag * 0.11;
      const sg = ctx.createRadialGradient(p.sunX, p.sunY, 0, p.sunX, p.sunY, R * 3.2);
      sg.addColorStop(0, rgb(mix(sc, [255, 255, 255], 0.5), sun));
      sg.addColorStop(0.18, rgb(sc, 0.9 * sun));
      sg.addColorStop(0.3, rgb(sc, 0.35 * sun));
      sg.addColorStop(1, rgb(sc, 0));
      ctx.fillStyle = sg;
      ctx.fillRect(-W / 2, -H / 2, W, H);
      const fl = clamp01(p.flare) * sun;
      if (fl > 0) {
        for (const [t, r, a] of [[-0.35, 0.028, 0.5], [-0.75, 0.016, 0.6], [-1.2, 0.05, 0.25], [0.45, 0.012, 0.5]]) {
          const fx = p.sunX * (1 + t * 1.6);
          const fy = p.sunY * (1 + t * 1.6);
          const rr = diag * r;
          const gg = ctx.createRadialGradient(fx, fy, 0, fx, fy, rr);
          gg.addColorStop(0, rgb([200, 220, 255], a * fl));
          gg.addColorStop(1, rgb([200, 220, 255], 0));
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(fx, fy, rr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
};
