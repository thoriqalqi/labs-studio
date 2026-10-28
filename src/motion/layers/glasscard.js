// Kartu kaca (liquid glass) yang bisa berubah bentuk: pil lebar → kotak ikon, dengan teks dan/atau
// tanda logo Labs (huruf L miring terbelah) di dalamnya. Kacanya membiaskan apa yang ada di belakangnya
// (drawGlassRect), jadi taruh layer ini DI ATAS pendar/latar.
import { drawGlassRect } from '../glass.js';
import { drawGlassText, glassFont, GLASS_FONTS } from '../glasstext.js';

// Tanda Labs (logo 01 "Miring") di kotak 200×200, titik tengah tanda ≈ (102, 98), lebar ≈ 88.
const MARK = [
  [[58, 140], [82, 140], [124, 56], [100, 56]],
  [[92, 140], [138, 140], [146, 124], [100, 124]]
];

let wobCanvas = null;

function drawMark(ctx, size, color) {
  const k = size / 88;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * k;
  ctx.lineJoin = 'round';
  for (const poly of MARK) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      const px = (x - 102) * k;
      const py = (y - 98) * k;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export default {
  type: 'glasscard',
  name: 'Kartu kaca',
  icon: '▢',
  category: 'Demo UI',
  order: 37,
  defaults: {
    w: 560, h: 240, radius: 120,
    tint: '#ffffff', tintAmount: 0.06, frost: 0.55, refract: 0.9, chroma: 0.5, rim: 0.9, drop: 0.12,
    text: 'Labs', textSize: 150, textColor: '#f3f1ec', textWeight: 600, textAlpha: 1, textStretch: 100, textReveal: 1, wobble: 0,
    font: 'Inter', glassText: true, textBottom: '#b6d3f5', textGlow: 0.6, textStroke: 0, textStrokeColor: '#000000',
    mark: 0, markSize: 110, markColor: '#f3f1ec'
  },
  schema: [
    { key: 'w', label: 'Lebar', kind: 'number', min: 2, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 2, step: 1, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'tint', label: 'Warna kaca', kind: 'color' },
    { key: 'tintAmount', label: 'Kepekatan warna kaca (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'frost', label: 'Buram kaca (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'refract', label: 'Lengkung tepi kaca (0–2)', kind: 'number', min: 0, max: 2, step: 0.05, animatable: true },
    { key: 'chroma', label: 'Pelangi di tepi (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'rim', label: 'Pantulan tepi (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'drop', label: 'Bayangan kaca (0–1)', kind: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'text', label: 'Teks', kind: 'text' },
    { key: 'textSize', label: 'Ukuran teks', kind: 'number', min: 6, step: 1, animatable: true },
    { key: 'textColor', label: 'Warna teks', kind: 'color', animatable: true },
    { key: 'textStroke', label: 'Garis tepi teks', kind: 'number', min: 0, step: 0.5, animatable: true },
    { key: 'textStrokeColor', label: 'Warna garis tepi teks', kind: 'color' },
    { key: 'textWeight', label: 'Tebal teks', kind: 'select', options: { 400: 'Biasa', 500: 'Sedang', 600: 'Tebal', 700: 'Sangat tebal' } },
    { key: 'font', label: 'Font', kind: 'select', options: GLASS_FONTS },
    { key: 'glassText', label: 'Teks kaca (liquid glass)', kind: 'checkbox' },
    { key: 'textBottom', label: 'Warna bawah teks kaca', kind: 'color', animatable: true },
    { key: 'textGlow', label: 'Pendar teks (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'textAlpha', label: 'Kejelasan teks (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'textStretch', label: 'Regang teks %', kind: 'number', min: 1, step: 1, animatable: true },
    { key: 'textReveal', label: 'Teks tampil dari kiri (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'wobble', label: 'Liuk cair teks (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'mark', label: 'Kejelasan logo Labs (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'markSize', label: 'Ukuran logo', kind: 'number', min: 4, step: 1, animatable: true },
    { key: 'markColor', label: 'Warna logo', kind: 'color', animatable: true }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p, env) {
    const w = Math.max(2, p.w);
    const h = Math.max(2, p.h);
    drawGlassRect(ctx, env, -w / 2, -h / 2, w, h, Math.min(p.radius, w / 2, h / 2), {
      tint: p.tint, tintAmount: p.tintAmount, frost: p.frost, refract: p.refract, chroma: p.chroma, rim: p.rim, shadow: p.drop
    });
    const ta = Math.max(0, Math.min(1, p.textAlpha));
    const rev = Math.max(0, Math.min(1, p.textReveal));
    if (p.text && ta > 0.001 && rev > 0.001) {
      ctx.save();
      ctx.globalAlpha *= ta;
      ctx.scale(Math.max(0.01, p.textStretch / 100), 1);
      const glassy = p.glassText !== false;
      const gopt = { size: p.textSize, weight: p.textWeight, font: p.font, top: p.textColor, bottom: p.textBottom, glowAmount: p.textGlow, tracking: glassy ? -0.01 : -0.05 };
      const font = glassFont(gopt);
      const ls = gopt.tracking * p.textSize;
      ctx.font = font;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${ls}px`;
      const tw = ctx.measureText(p.text).width;
      const put = (c, x, y) => {
        if (glassy) drawGlassText(c, p.text, x, y, gopt);
        else {
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          if (p.textStroke > 0) {
            c.lineWidth = p.textStroke;
            c.lineJoin = 'round';
            c.strokeStyle = p.textStrokeColor;
            c.strokeText(p.text, x, y);
          }
          c.fillStyle = p.textColor;
          c.fillText(p.text, x, y);
        }
      };
      // terhapus dari kanan ke kiri
      if (rev < 1) {
        ctx.beginPath();
        ctx.rect(-tw / 2 - p.textSize, -p.textSize, (tw + p.textSize) * rev + p.textSize * 0.2, p.textSize * 2);
        ctx.clip();
      }
      const wob = Math.max(0, Math.min(1, p.wobble));
      if (wob < 0.001) {
        put(ctx, 0, p.textSize * 0.04);
      } else {
        // huruf meliuk seperti cairan: teks digambar ke kanvas kecil, lalu ditempel per pita dengan geseran gelombang
        const pad = p.textSize * 0.4;
        const cw = Math.ceil(tw + pad * 2);
        const ch = Math.ceil(p.textSize * 1.6);
        const off = (wobCanvas ||= document.createElement('canvas'));
        if (off.width !== cw || off.height !== ch) {
          off.width = cw;
          off.height = ch;
        }
        const g = off.getContext('2d');
        g.clearRect(0, 0, cw, ch);
        g.font = font;
        if ('letterSpacing' in g) g.letterSpacing = `${ls}px`;
        put(g, cw / 2, ch / 2 + p.textSize * 0.04);
        const ph = (env.vt || 0) * 8;
        const A = wob * p.textSize * 0.13;
        const strip = Math.max(1, Math.round(p.textSize / 80));
        for (let y = 0; y < ch; y += strip) {
          const yy = y / ch;
          const dx = A * Math.sin(yy * 4.2 + ph) + A * 0.22 * Math.sin(yy * 9 - ph * 1.2);
          const sy = 1 + wob * 0.12 * Math.sin(yy * 3 + ph * 0.6);
          ctx.drawImage(off, 0, y, cw, strip, -cw / 2 + dx, -ch / 2 + y * sy - (sy - 1) * ch / 2, cw, strip + 0.6);
        }
      }
      ctx.restore();
    }
    const ma = Math.max(0, Math.min(1, p.mark));
    if (ma > 0.001) {
      ctx.save();
      ctx.globalAlpha *= ma;
      drawMark(ctx, p.markSize, p.markColor);
      ctx.restore();
    }
  }
};
