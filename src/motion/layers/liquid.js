// Latar "liquid gradient": gumpalan warna besar yang mengalir pelan, digambar di kanvas kecil
// lalu diperbesar supaya sangat halus. "Gelap" menurunkan tirai hitam dari atas (seperti adegan malam).
const SMALL_W = 256;
let small = null;
let grain = null;

function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function grainCanvas() {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = grain.height = 200;
  const g = grain.getContext('2d');
  const img = g.createImageData(200, 200);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = seeded(i) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

export default {
  type: 'liquid',
  name: 'Liquid gradient',
  icon: '◍',
  category: 'Dasar',
  order: 2,
  fullFrame: true,
  defaults: {
    base: '#081633', color1: '#1e4fd6', color2: '#6fb6ff', color3: '#eaf4ff', color4: '#0d2a7a',
    speed: 0.35, blobSize: 1, dark: 0, glow: '#2b6bff', grain: 0.05, seed: 3
  },
  schema: [
    { key: 'base', label: 'Warna dasar', kind: 'color', animatable: true },
    { key: 'color1', label: 'Warna 1', kind: 'color', animatable: true },
    { key: 'color2', label: 'Warna 2', kind: 'color', animatable: true },
    { key: 'color3', label: 'Warna 3 (sorotan)', kind: 'color', animatable: true },
    { key: 'color4', label: 'Warna 4', kind: 'color', animatable: true },
    { key: 'speed', label: 'Kecepatan aliran', kind: 'number', min: 0, max: 3, step: 0.05 },
    { key: 'blobSize', label: 'Ukuran gumpalan', kind: 'number', min: 0.3, max: 3, step: 0.05, animatable: true },
    { key: 'dark', label: 'Gelap (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'glow', label: 'Pendar bawah saat gelap', kind: 'color', animatable: true },
    { key: 'grain', label: 'Butiran film', kind: 'number', min: 0, max: 0.3, step: 0.01 },
    { key: 'seed', label: 'Variasi pola', kind: 'number', min: 0, max: 99, step: 1 }
  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const W = env.comp.width;
    const H = env.comp.height;
    const sw = SMALL_W;
    const sh = Math.max(16, Math.round((SMALL_W * H) / W));
    if (!small) small = document.createElement('canvas');
    if (small.width !== sw || small.height !== sh) {
      small.width = sw;
      small.height = sh;
    }
    const g = small.getContext('2d');
    const t = env.contentT * p.speed;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = p.base;
    g.fillRect(0, 0, sw, sh);
    const colors = [p.color1, p.color3, p.color2, p.color4, p.color1, p.color3];
    const R = Math.max(sw, sh) * 0.55 * p.blobSize;
    colors.forEach((c, i) => {
      const k = i + p.seed * 7;
      const fx = 0.6 + seeded(k) * 0.9;
      const fy = 0.5 + seeded(k + 3) * 0.9;
      const cx = sw * (0.5 + 0.42 * Math.sin(t * fx + seeded(k + 1) * 6.28));
      const cy = sh * (0.5 + 0.42 * Math.cos(t * fy + seeded(k + 2) * 6.28));
      const r = R * (0.6 + seeded(k + 4) * 0.6) * (1 + 0.12 * Math.sin(t * 1.3 + i));
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, c);
      grad.addColorStop(1, `${c}00`);
      g.fillStyle = grad;
      g.fillRect(0, 0, sw, sh);
    });
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, -W / 2, -H / 2, W, H);

    if (p.dark > 0.001) {
      // tirai gelap dari atas + pendar warna dari bawah (meniru bagian akhir video referensi)
      const d = Math.min(1, p.dark);
      const top = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
      top.addColorStop(0, `rgba(2,4,10,${d})`);
      top.addColorStop(0.55, `rgba(2,4,10,${d * 0.85})`);
      top.addColorStop(1, `rgba(2,4,10,${d * 0.15})`);
      ctx.fillStyle = top;
      ctx.fillRect(-W / 2, -H / 2, W, H);
      const glow = ctx.createRadialGradient(0, H * 0.75, 0, 0, H * 0.75, W * 0.6);
      glow.addColorStop(0, `${p.glow}${Math.round(d * 160).toString(16).padStart(2, '0')}`);
      glow.addColorStop(1, `${p.glow}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(-W / 2, -H / 2, W, H);
    }

    if (p.grain > 0) {
      ctx.globalAlpha *= p.grain;
      ctx.globalCompositeOperation = 'overlay';
      const pat = ctx.createPattern(grainCanvas(), 'repeat');
      const off = Math.floor(env.contentT * 24) * 53;
      ctx.translate((off % 200) - W / 2 - 200, ((off * 7) % 200) - H / 2 - 200);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W + 400, H + 400);
    }
    ctx.restore();
  }
};
