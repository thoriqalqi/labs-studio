// Langit cerah bergradien dengan awan lembut yang hanyut. "Terbuka" < 1 = langit hanya tampak di dalam
// gumpalan cair (blob) yang bisa membesar memenuhi layar (transisi dari gumpalan biru ke langit penuh).
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sprites = new Map();

function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// gambar awan dibuat sekali per variasi lalu cukup ditempel tiap frame
function cloudSprite(v) {
  if (sprites.has(v)) return sprites.get(v);
  const cv = document.createElement('canvas');
  cv.width = 640;
  cv.height = 320;
  const g = cv.getContext('2d');
  const R = rand(v * 977 + 13);
  const puffs = 16;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < puffs; i++) {
      const t = i / (puffs - 1);
      const x = 120 + t * 400 + (R() - 0.5) * 40;
      const hump = Math.sin(t * Math.PI);
      const y = 210 - hump * 70 + (R() - 0.5) * 30 + (pass ? -12 : 10);
      const r = 50 + hump * 55 + R() * 30;
      const rg = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
      if (pass === 0) {
        // bayangan kebiruan di bagian bawah awan
        rg.addColorStop(0, 'rgba(170,205,235,0.55)');
        rg.addColorStop(1, 'rgba(170,205,235,0)');
      } else {
        rg.addColorStop(0, 'rgba(255,255,255,0.95)');
        rg.addColorStop(0.6, 'rgba(255,255,255,0.55)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
      }
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  sprites.set(v, cv);
  return cv;
}

export default {
  type: 'sky',
  name: 'Langit berawan',
  icon: '☁',
  category: 'Promo',
  order: 47,
  fullFrame: true,
  defaults: {
    top: '#63f2ff', bottom: '#1ca8f2', clouds: 6, cloudSize: 1, drift: 0, seed: 3,
    reveal: 1, blobX: 0, blobY: 0, wobble: 1, outside: '', url: '', imgZoom: 100
  },
  schema: [
    { key: 'top', label: 'Warna langit atas', kind: 'color', animatable: true },
    { key: 'bottom', label: 'Warna langit bawah', kind: 'color', animatable: true },
    { key: 'clouds', label: 'Jumlah awan', kind: 'number', min: 0, max: 20, step: 1 },
    { key: 'cloudSize', label: 'Ukuran awan', kind: 'number', min: 0.1, step: 0.05, animatable: true },
    { key: 'drift', label: 'Hanyut awan (px)', kind: 'number', step: 1, animatable: true },
    { key: 'seed', label: 'Variasi susunan', kind: 'number', min: 0, max: 999, step: 1 },
    { key: 'reveal', label: 'Terbuka (0–1; < 1 = gumpalan)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'blobX', label: 'Gumpalan X (dari tengah)', kind: 'number', step: 1, animatable: true },
    { key: 'blobY', label: 'Gumpalan Y (dari tengah)', kind: 'number', step: 1, animatable: true },
    { key: 'wobble', label: 'Liuk gumpalan (0–2)', kind: 'number', min: 0, max: 2, step: 0.05, animatable: true },
    { key: 'outside', label: 'Warna di luar gumpalan (kosong = tembus)', kind: 'color' },
    { key: 'url', label: 'Foto pengganti langit (opsional)', kind: 'asset', accept: 'image/*' },
    { key: 'imgZoom', label: 'Zoom foto %', kind: 'number', min: 10, step: 1, animatable: true }
  ],
  size: (p, env) => ({ w: env.comp.width, h: env.comp.height }),
  draw(ctx, p, env) {
    const W = env.comp.width;
    const H = env.comp.height;
    const reveal = clamp01(p.reveal);
    if (reveal <= 0) return;
    if (p.outside && reveal < 1) {
      ctx.fillStyle = p.outside;
      ctx.fillRect(-W / 2, -H / 2, W, H);
    }
    ctx.save();
    if (reveal < 1) {
      // gumpalan cair: jari-jari bergelombang pelan mengikuti waktu
      const maxR = Math.hypot(W / 2 + Math.abs(p.blobX), H / 2 + Math.abs(p.blobY)) * 1.15;
      const R = maxR * reveal;
      const ph = (env.vt || 0) * 0.9;
      const wb = p.wobble * (1 - reveal * 0.7);
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const rr = R * (1 + wb * (0.07 * Math.sin(3 * a + ph) + 0.05 * Math.sin(5 * a - ph * 1.3) + 0.03 * Math.sin(2 * a + ph * 0.6)));
        const x = p.blobX + Math.cos(a) * rr;
        const y = p.blobY + Math.sin(a) * rr;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.clip();
    }
    // foto (opsional) menggantikan langit & awan, menutupi layar penuh
    const img = p.url && env.assets.image(p.url);
    if (img) {
      const s = (Math.max(W / img.naturalWidth, H / img.naturalHeight) * p.imgZoom) / 100;
      const iw = img.naturalWidth * s;
      const ih = img.naturalHeight * s;
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
      ctx.restore();
      return;
    }
    const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
    g.addColorStop(0, p.top);
    g.addColorStop(1, p.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    // awan
    const n = Math.round(p.clouds);
    const R = rand(p.seed * 7919 + 1);
    const span = W + 900;
    for (let i = 0; i < n; i++) {
      const bx = R() * span;
      const by = (R() - 0.5) * H * 0.95;
      const sc = (0.55 + R() * 0.75) * p.cloudSize;
      const sp = 0.6 + R() * 0.8;
      const flip = R() < 0.5;
      const v = Math.floor(R() * 4);
      const x = (((bx + p.drift * sp) % span) + span) % span - span / 2;
      const cw = 640 * sc;
      const chh = 320 * sc;
      ctx.save();
      ctx.translate(x, by);
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(cloudSprite(v), -cw / 2, -chh / 2, cw, chh);
      ctx.restore();
    }
    ctx.restore();
  }
};
