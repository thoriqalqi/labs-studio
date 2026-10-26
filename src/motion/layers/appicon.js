// Ikon aplikasi & ikon tugas dalam kotak membulat (gaya kartu bersih): Instagram, Canva, dan
// ikon garis (cari, tulis, kirim, centang, kutip, kalender, musik, gambar). Label opsional di bawahnya.
import { drawGlassRect } from '../glass.js';

export const ICONS = {
  instagram: 'Instagram', canva: 'Canva', search: 'Cari', pen: 'Tulis', send: 'Kirim', check: 'Centang',
  quote: 'Kutipan', calendar: 'Kalender', music: 'Musik', image: 'Gambar', link: 'Tautan'
};

const rr = (g, x, y, w, h, r) => {
  g.beginPath();
  g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
};

function glyph(g, kind, s, color) {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = s * 0.075;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const u = s / 2;
  g.beginPath();
  switch (kind) {
    case 'search':
      g.arc(-u * 0.12, -u * 0.12, u * 0.38, 0, Math.PI * 2);
      g.moveTo(u * 0.17, u * 0.17);
      g.lineTo(u * 0.45, u * 0.45);
      break;
    case 'pen':
      g.moveTo(-u * 0.42, u * 0.42);
      g.lineTo(-u * 0.32, u * 0.1);
      g.lineTo(u * 0.22, -u * 0.44);
      g.lineTo(u * 0.44, -u * 0.22);
      g.lineTo(-u * 0.1, u * 0.32);
      g.closePath();
      g.moveTo(u * 0.08, -u * 0.3);
      g.lineTo(u * 0.3, -u * 0.08);
      break;
    case 'send':
      g.moveTo(-u * 0.45, -u * 0.05);
      g.lineTo(u * 0.48, -u * 0.42);
      g.lineTo(u * 0.12, u * 0.48);
      g.lineTo(-u * 0.02, u * 0.06);
      g.closePath();
      g.moveTo(-u * 0.02, u * 0.06);
      g.lineTo(u * 0.48, -u * 0.42);
      break;
    case 'check':
      g.moveTo(-u * 0.38, u * 0.02);
      g.lineTo(-u * 0.1, u * 0.3);
      g.lineTo(u * 0.42, -u * 0.28);
      g.lineWidth = s * 0.1;
      break;
    case 'quote':
      for (const dx of [-0.2, 0.22]) {
        g.moveTo(u * (dx + 0.12), -u * 0.28);
        g.quadraticCurveTo(u * (dx - 0.2), -u * 0.12, u * (dx - 0.16), u * 0.2);
        g.arc(u * (dx - 0.04), u * 0.18, u * 0.12, Math.PI, Math.PI * 3, false);
      }
      break;
    case 'calendar':
      rr(g, -u * 0.42, -u * 0.34, u * 0.84, u * 0.76, u * 0.12);
      g.moveTo(-u * 0.42, -u * 0.08);
      g.lineTo(u * 0.42, -u * 0.08);
      g.moveTo(-u * 0.18, -u * 0.48);
      g.lineTo(-u * 0.18, -u * 0.24);
      g.moveTo(u * 0.18, -u * 0.48);
      g.lineTo(u * 0.18, -u * 0.24);
      break;
    case 'music':
      g.moveTo(-u * 0.14, u * 0.28);
      g.lineTo(-u * 0.14, -u * 0.38);
      g.lineTo(u * 0.36, -u * 0.48);
      g.lineTo(u * 0.36, u * 0.16);
      g.stroke();
      g.beginPath();
      g.ellipse(-u * 0.27, u * 0.3, u * 0.15, u * 0.12, -0.3, 0, Math.PI * 2);
      g.ellipse(u * 0.23, u * 0.18, u * 0.15, u * 0.12, -0.3, 0, Math.PI * 2);
      g.fill();
      return;
    case 'image':
      rr(g, -u * 0.44, -u * 0.36, u * 0.88, u * 0.72, u * 0.12);
      g.moveTo(-u * 0.44, u * 0.22);
      g.lineTo(-u * 0.1, -u * 0.06);
      g.lineTo(u * 0.12, u * 0.14);
      g.lineTo(u * 0.24, u * 0.04);
      g.lineTo(u * 0.44, u * 0.22);
      g.moveTo(u * 0.3, -u * 0.14);
      g.arc(u * 0.2, -u * 0.14, u * 0.09, 0, Math.PI * 2);
      break;
    case 'link':
      for (const sgn of [-1, 1]) {
        g.save();
        g.translate(sgn * u * 0.14, -sgn * u * 0.14);
        g.rotate(-Math.PI / 4);
        rr(g, -u * 0.3, -u * 0.13, u * 0.6, u * 0.26, u * 0.13);
        g.stroke();
        g.restore();
      }
      return;
    default:
      break;
  }
  g.stroke();
}

function instagram(g, s) {
  const x = -s / 2;
  const grad = g.createRadialGradient(x + s * 0.25, s * 0.55, 0, x + s * 0.25, s * 0.55, s * 1.25);
  grad.addColorStop(0, '#fdd16a');
  grad.addColorStop(0.2, '#fd8e3c');
  grad.addColorStop(0.45, '#e9356b');
  grad.addColorStop(0.7, '#b52fb1');
  grad.addColorStop(1, '#5a4ee0');
  rr(g, x, x, s, s, s * 0.26);
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = s * 0.075;
  rr(g, -s * 0.29, -s * 0.29, s * 0.58, s * 0.58, s * 0.17);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, s * 0.135, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(s * 0.165, -s * 0.165, s * 0.038, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
}

function canva(g, s) {
  const grad = g.createLinearGradient(-s / 2, s / 2, s / 2, -s / 2);
  grad.addColorStop(0, '#00c4cc');
  grad.addColorStop(0.55, '#5b6cf0');
  grad.addColorStop(1, '#7d2ae8');
  g.beginPath();
  g.arc(0, 0, s / 2, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
  // huruf C bergaya tulisan tangan
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  g.lineWidth = s * 0.085;
  g.beginPath();
  g.arc(-s * 0.01, 0, s * 0.2, Math.PI * 0.27, Math.PI * 1.73, false);
  g.stroke();
}

export default {
  type: 'appicon',
  name: 'Ikon aplikasi',
  icon: '◰',
  category: 'Demo UI',
  order: 36,
  defaults: { icon: 'instagram', size: 140, tile: '#ffffff', glyph: '#1d1d1f', label: '', labelColor: '#6f7280', labelSize: 26, softShadow: 0.12, glass: false },
  schema: [
    { key: 'icon', label: 'Ikon', kind: 'select', options: ICONS },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 8, step: 1, animatable: true },
    { key: 'tile', label: 'Warna kotak (ikon garis)', kind: 'color', animatable: true },
    { key: 'glyph', label: 'Warna garis ikon', kind: 'color', animatable: true },
    { key: 'label', label: 'Label di bawah', kind: 'text' },
    { key: 'labelColor', label: 'Warna label', kind: 'color' },
    { key: 'labelSize', label: 'Ukuran label', kind: 'number', min: 6, step: 1 },
    { key: 'softShadow', label: 'Bayangan lembut', kind: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'glass', label: 'Kotak dari kaca (liquid glass)', kind: 'checkbox' }
  ],
  size: (p) => ({ w: p.size * 1.2, h: p.size * (p.label ? 1.6 : 1.2) }),
  draw(ctx, p, env) {
    const s = p.size;
    const oy = p.label ? -s * 0.2 : 0;
    ctx.save();
    ctx.translate(0, oy);
    // kotak ikon garis dari kaca (liquid glass)
    if (p.glass && p.icon !== 'instagram' && p.icon !== 'canva') {
      drawGlassRect(ctx, env, -s / 2, -s / 2, s, s, s * 0.26, { tint: p.tile, tintAmount: 0.3, frost: 0.45, shadow: p.softShadow > 0 ? 0.16 : 0 });
      glyph(ctx, p.icon, s, p.glyph);
      ctx.restore();
      if (p.label) {
        ctx.fillStyle = p.labelColor;
        ctx.font = `500 ${p.labelSize}px "Geist", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.label, 0, oy + s * 0.78);
      }
      return;
    }
    ctx.save();
    if (p.softShadow > 0) {
      ctx.shadowColor = `rgba(20,24,40,${p.softShadow})`;
      ctx.shadowBlur = s * 0.28;
      ctx.shadowOffsetY = s * 0.1;
    }
    // alas berbayangan dulu, gambar ikonnya tanpa bayangan supaya garis putihnya tetap bersih
    if (p.icon === 'canva') {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    } else rr(ctx, -s / 2, -s / 2, s, s, s * 0.26);
    ctx.fillStyle = p.icon === 'instagram' ? '#e9356b' : p.icon === 'canva' ? '#5b6cf0' : p.tile;
    ctx.fill();
    ctx.restore();
    if (p.icon === 'instagram') instagram(ctx, s);
    else if (p.icon === 'canva') canva(ctx, s);
    else glyph(ctx, p.icon, s, p.glyph);
    ctx.restore();
    if (p.label) {
      ctx.fillStyle = p.labelColor;
      ctx.font = `500 ${p.labelSize}px "Geist", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, 0, oy + s * 0.78);
    }
  }
};
