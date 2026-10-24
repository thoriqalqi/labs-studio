// Pemandangan alam prosedural (tanpa foto): langit, matahari, awan, gunung, bukit, danau, pohon.
// Bisa jadi jendela membulat atau memenuhi layar; `pan` menggeser lapisan dengan parallax.
// Isi "Gambar sendiri" untuk memakai foto/gambar milikmu (diisi penuh seperti cover, ikut digeser & di-zoom).

// gambar menutupi kotak (cover), bisa di-zoom & digeser
export function drawCover(ctx, img, w, h, zoom = 1, dx = 0, dy = 0) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * Math.max(1, zoom);
  const iw = img.naturalWidth * s;
  const ih = img.naturalHeight * s;
  const mx = (iw - w) / 2;
  const my = (ih - h) / 2;
  const ox = Math.max(-mx, Math.min(mx, dx));
  const oy = Math.max(-my, Math.min(my, dy));
  ctx.drawImage(img, -iw / 2 + ox, -ih / 2 + oy, iw, ih);
}
const PALETTES = {
  day: {
    label: 'Siang (bukit hijau)',
    sky: ['#9fb9d6', '#c9d6e2', '#e7e9e6'], sun: 'rgba(255,255,245,0.55)', mount: '#9eb3c4', lake: '#a9c3d4',
    hills: ['#8fae6a', '#6f9448', '#557c35', '#3f6526'], tree: '#24391c', cloud: 'rgba(255,255,255,0.7)'
  },
  golden: {
    label: 'Senja keemasan',
    sky: ['#6f8fb3', '#e9b98a', '#f6d7a8'], sun: 'rgba(255,236,190,0.9)', mount: '#8e8aa0', lake: '#e6c39a',
    hills: ['#a7a463', '#7f8a43', '#5b6e30', '#3c5222'], tree: '#1f2e17', cloud: 'rgba(255,230,205,0.55)'
  },
  dusk: {
    label: 'Fajar sejuk',
    sky: ['#58708f', '#9fb0c2', '#d9d4c8'], sun: 'rgba(255,248,230,0.6)', mount: '#7e90a3', lake: '#b4c2cc',
    hills: ['#7f9a74', '#5f7d55', '#486641', '#33502f'], tree: '#1d2e1b', cloud: 'rgba(240,244,250,0.6)'
  },
  mountain: {
    label: 'Gunung & hutan pinus',
    sky: ['#6e98c9', '#a9c4e0', '#e3ebf2'], sun: 'rgba(255,255,250,0.7)', mount: '#6e7f8f', lake: '#a9c3d4',
    hills: ['#73866b', '#4f6849', '#334c33', '#1f3520'], tree: '#16271a', cloud: 'rgba(255,255,255,0.85)'
  }
};
const OPTIONS = Object.fromEntries(Object.entries(PALETTES).map(([k, v]) => [k, v.label]));

// garis punggung bukit/gunung yang mulus dari jumlah gelombang sinus (pasti sama tiap frame)
function ridge(x, seed, amp, freq) {
  return (
    Math.sin(x * freq + seed) * amp +
    Math.sin(x * freq * 2.3 + seed * 1.7) * amp * 0.35 +
    Math.sin(x * freq * 5.1 + seed * 0.3) * amp * 0.12
  );
}

const mix = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// pita bukit/gunung selebar rentang x0..x1 (koordinat dunia; ridge dihitung terhadap lebar acuan RW)
function band(ctx, x0, x1, h, yBase, amp, seed, colorTop, colorBottom) {
  const g = ctx.createLinearGradient(0, yBase - amp, 0, h / 2);
  g.addColorStop(0, colorTop);
  g.addColorStop(1, colorBottom);
  ctx.beginPath();
  ctx.moveTo(x0 - 10, h / 2 + 10);
  for (let x = x0 - 10; x <= x1 + 10; x += 12) ctx.lineTo(x, yBase + ridge(x / RW, seed, amp, 6));
  ctx.lineTo(x1 + 10, h / 2 + 10);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
}

// Ilustrasi digambar sekali per suasana ke 3 lapisan (belakang/tengah/depan) di ukuran acuan,
// lalu tiap frame hanya digeser (parallax) & diskalakan. Menggambar ulang tiap frame ±23 ms → patah-patah.
const RW = 1920;
const RH = 1080;
const M = 320; // ruang geser kiri-kanan
const Q = 0.8; // resolusi cache (ilustrasi lembut, tidak perlu penuh)
const PAR = [0.1, 0.45, 0.9];
const cache = new Map();

function buildLayers(p) {
  const P = PALETTES[p.palette] || PALETTES.day;
  const s = p.seed;
  const mountain = p.palette === 'mountain';
  const x0 = -RW / 2 - M;
  const x1 = RW / 2 + M;
  const span = x1 - x0;
  const W = RW;
  const H = RH;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = Math.ceil((RW + 2 * M) * Q);
    c.height = Math.ceil(RH * Q);
    const g = c.getContext('2d');
    g.setTransform(Q, 0, 0, Q, (M + RW / 2) * Q, (RH / 2) * Q);
    return { c, g };
  };
  const back = make();
  const mid = make();
  const front = make();

  // --- belakang: langit, matahari, awan, gunung, danau ---
  let g = back.g;
  const sky = g.createLinearGradient(0, -H / 2, 0, H * 0.1);
  sky.addColorStop(0, P.sky[0]);
  sky.addColorStop(0.6, P.sky[1]);
  sky.addColorStop(1, P.sky[2]);
  g.fillStyle = sky;
  g.fillRect(x0, -H / 2, span, H);
  const sx = -W / 2 + W * p.sunX;
  const sy = -H / 2 + H * p.sunY;
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55);
  sun.addColorStop(0, P.sun);
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sun;
  g.fillRect(x0, -H / 2, span, H);
  for (let i = 0; i < 9; i++) {
    const cx = x0 + ((i * 0.173 + s * 0.07) % 1) * span;
    const cy = -H / 2 + H * (0.08 + ((i * 0.37 + s * 0.11) % 1) * 0.22);
    const cw = W * (0.12 + ((i * 0.29) % 1) * 0.12);
    for (let j = 0; j < 4; j++) {
      const bx = cx + (j - 1.5) * cw * 0.35;
      const by = cy + Math.sin(j * 2 + i) * cw * 0.05;
      const rr = cw * (0.28 + ((j * 0.31 + i * 0.13) % 1) * 0.18);
      const cg = g.createRadialGradient(bx, by, 0, bx, by, rr);
      cg.addColorStop(0, P.cloud);
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cg;
      g.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
    }
  }
  g.save();
  g.globalAlpha = mountain ? 1 : 0.75;
  band(g, x0, x1, H, H * (mountain ? -0.02 : 0.06), H * (mountain ? 0.2 : 0.06), s, P.mount, mix(P.mount, P.sky[2], 0.4));
  g.restore();
  if (mountain) {
    g.save();
    g.globalAlpha = 0.25;
    band(g, x0, x1, H, H * 0.02, H * 0.18, s, '#ffffff', P.mount);
    g.restore();
  }
  if (p.lake && !mountain) {
    const lg = g.createLinearGradient(0, H * 0.08, 0, H * 0.2);
    lg.addColorStop(0, P.lake);
    lg.addColorStop(1, mix(P.lake, '#ffffff', 0.3));
    g.fillStyle = lg;
    g.fillRect(x0, H * 0.09, span, H * 0.12);
  }

  // --- bukit: 2 pertama di lapisan tengah, 2 terdekat di depan ---
  const hills = [
    [H * 0.13, H * 0.035, 0],
    [H * 0.2, H * 0.06, 1],
    [H * 0.3, H * 0.08, 2],
    [H * 0.42, H * 0.07, 3]
  ];
  hills.forEach(([y, amp, i]) => {
    if (mountain && i === 0) return;
    g = i < 2 ? mid.g : front.g;
    band(g, x0, x1, H, y, amp, s + i * 2.1, P.hills[i], mix(P.hills[i], '#000000', 0.18));
    // pohon bulat kecil (atau pinus) di punggung bukit
    if (i === 1 || (i === 2 && !mountain)) {
      for (let k = 0; k < 34; k++) {
        const tx = x0 + ((k * 0.0731 + s * 0.013 + i * 0.3) % 1) * span;
        const ty = y + ridge(tx / RW, s + i * 2.1, amp, 6) + 4;
        const tr = H * (0.008 + ((k * 0.17) % 1) * 0.008) * (i === 2 ? 1.3 : 1);
        g.beginPath();
        if (mountain) {
          g.moveTo(tx, ty - tr * 3.2); g.lineTo(tx + tr, ty); g.lineTo(tx - tr, ty); g.closePath();
        } else g.ellipse(tx, ty - tr * 0.8, tr * 1.1, tr, 0, 0, Math.PI * 2);
        g.fillStyle = P.tree;
        g.fill();
      }
    }
  });

  g = front.g;
  if (mountain) {
    for (let k = 0; k < 90; k++) {
      const tx = x0 + ((k * 0.0113 + ((k * 0.61) % 1) * 0.01) % 1) * span;
      const th = H * (0.1 + ((k * 0.37) % 1) * 0.12);
      const base = H / 2 + 6;
      g.beginPath();
      g.moveTo(tx, base - th);
      g.lineTo(tx + th * 0.18, base);
      g.lineTo(tx - th * 0.18, base);
      g.closePath();
      g.fillStyle = mix(P.tree, '#000000', ((k * 0.23) % 1) * 0.4);
      g.fill();
    }
  }
  if (p.cypress && !mountain) {
    const cx = -W / 2 + W * (p.treeX ?? 0.28);
    const base = H * 0.3 + ridge(cx / RW, s + 4.2, H * 0.08, 6);
    const th = H * 0.62;
    const cw = H * 0.07;
    g.fillStyle = '#3b2a1c';
    g.fillRect(cx - 4, base - th * 0.08, 8, th * 0.1);
    const cg = g.createLinearGradient(cx - cw, 0, cx + cw, 0);
    cg.addColorStop(0, mix(P.tree, '#000000', 0.2));
    cg.addColorStop(0.6, mix(P.tree, P.hills[2], 0.5));
    cg.addColorStop(1, P.tree);
    g.fillStyle = cg;
    g.beginPath();
    g.moveTo(cx, base - th);
    g.bezierCurveTo(cx + cw * 1.1, base - th * 0.7, cx + cw * 1.05, base - th * 0.2, cx + cw * 0.4, base - th * 0.05);
    g.lineTo(cx - cw * 0.4, base - th * 0.05);
    g.bezierCurveTo(cx - cw * 1.05, base - th * 0.2, cx - cw * 1.1, base - th * 0.7, cx, base - th);
    g.fill();
  }
  return [back.c, mid.c, front.c];
}

function layersFor(p) {
  const key = [p.palette, p.seed, p.sunX.toFixed(3), p.sunY.toFixed(3), p.cypress, (p.treeX ?? 0.28).toFixed(3), p.lake].join('|');
  let v = cache.get(key);
  if (!v) {
    v = buildLayers(p);
    cache.set(key, v);
    // simpan beberapa suasana saja supaya memori tidak membengkak
    if (cache.size > 6) cache.delete(cache.keys().next().value);
  }
  return v;
}

export default {
  type: 'landscape',
  name: 'Lanskap alam',
  icon: '⛰',
  category: 'Promo',
  order: 42,
  defaults: { url: '', imgZoom: 1.1, palette: 'day', w: 1920, h: 1080, radius: 0, pan: 0, sunX: 0.62, sunY: 0.2, cypress: true, treeX: 0.28, lake: true, haze: 0.25, seed: 4 },
  schema: [
    { key: 'url', label: 'Gambar sendiri (kosongkan = ilustrasi)', kind: 'asset', accept: 'image/*' },
    { key: 'imgZoom', label: 'Zoom gambar', kind: 'number', min: 1, max: 4, step: 0.01, animatable: true },
    { key: 'palette', label: 'Suasana (ilustrasi)', kind: 'select', options: OPTIONS },
    { key: 'w', label: 'Lebar', kind: 'number', min: 10, step: 2, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 10, step: 2, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'pan', label: 'Geser kamera (parallax)', kind: 'number', step: 1, animatable: true },
    { key: 'sunX', label: 'Posisi matahari X (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'sunY', label: 'Posisi matahari Y (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'cypress', label: 'Pohon cemara tinggi', kind: 'checkbox' },
    { key: 'treeX', label: 'Posisi cemara (0 = kiri, 1 = kanan)', kind: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'lake', label: 'Danau', kind: 'checkbox' },
    { key: 'haze', label: 'Kabut (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'seed', label: 'Variasi bentuk', kind: 'number', min: 0, max: 99, step: 1 }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p, env) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, Math.min(p.radius, p.w / 2, p.h / 2));
    ctx.clip();
    const img = p.url ? env.assets.image(p.url) : null;
    if (img) {
      // geser kamera = gambar bergeser pelan (efek parallax sederhana)
      drawCover(ctx, img, p.w, p.h, p.imgZoom, p.pan * 0.5, 0);
      ctx.restore();
      return;
    }
    // panggung 16:9 yang menutupi kotak (seperti object-fit: cover), lapisan digeser sesuai parallax
    const W = Math.max(p.w, (p.h * 16) / 9);
    const H = (W * 9) / 16;
    const k = W / RW;
    layersFor(p).forEach((c, i) => {
      const off = Math.max(-M, Math.min(M, -p.pan * PAR[i]));
      ctx.drawImage(c, (-RW / 2 - M + off) * k, (-RH / 2) * k, (RW + 2 * M) * k, RH * k);
    });
    // kabut atmosfer
    if (p.haze > 0) {
      const hz = ctx.createLinearGradient(0, -H * 0.1, 0, H * 0.25);
      hz.addColorStop(0, 'rgba(255,255,255,0)');
      hz.addColorStop(0.5, `rgba(255,255,255,${0.35 * p.haze})`);
      hz.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hz;
      ctx.fillRect(-W / 2, -H / 2, W, H);
    }
    ctx.restore();
  }
};
