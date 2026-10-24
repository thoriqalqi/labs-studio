// Diagram lingkar kaca: cincin tembus pandang, logo di tengah, label fitur mengelilingi.
import { drawMark } from './logo.js';

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default {
  type: 'radial',
  name: 'Diagram lingkar',
  icon: '◎',
  category: 'Promo',
  order: 43,
  defaults: {
    d: 760, items: 'Layers, Keyframes, 3D scenes, Voice over, Sound, Export', progress: 1, spin: 0,
    glass: '#ffffff', text: '#ffffff', font: 'Geist', labelSize: 22, mark: true, markTri: '#1d3b2c'
  },
  schema: [
    { key: 'items', label: 'Label (pisahkan koma)', kind: 'textarea' },
    { key: 'progress', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'spin', label: 'Putaran °', kind: 'number', step: 1, animatable: true },
    { key: 'd', label: 'Diameter', kind: 'number', min: 50, step: 2, animatable: true },
    { key: 'glass', label: 'Warna kaca', kind: 'color' },
    { key: 'text', label: 'Warna teks', kind: 'color' },
    { key: 'labelSize', label: 'Ukuran label', kind: 'number', min: 6, step: 1 },
    { key: 'mark', label: 'Logo di tengah', kind: 'checkbox' },
    { key: 'markTri', label: 'Warna segitiga logo', kind: 'color' }
  ],
  size: (p) => ({ w: p.d, h: p.d }),
  draw(ctx, p) {
    const R = p.d / 2;
    const k = smooth(p.progress / 0.45);
    const items = String(p.items).split(',').map((s) => s.trim()).filter(Boolean);
    const rgba = (a) => {
      const n = parseInt(p.glass.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    ctx.save();
    ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
    ctx.globalAlpha *= k;
    // cakram luar & dalam (kaca)
    const ring = ctx.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R);
    ring.addColorStop(0, rgba(0.28));
    ring.addColorStop(1, rgba(0.12));
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.arc(0, 0, R * 0.56, 0, Math.PI * 2, true);
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(0.55);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    // cincin tengah
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0.22);
    ctx.fill();
    ctx.strokeStyle = rgba(0.7);
    ctx.stroke();
    if (p.mark) drawMark(ctx, 0, 0, R * 0.26, rgba(0.95), p.markTri);

    // label fitur di sekeliling (muncul satu per satu)
    ctx.font = `500 ${p.labelSize}px "${p.font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    items.forEach((label, i) => {
      const ki = smooth((p.progress - 0.3 - (i / items.length) * 0.5) / 0.15);
      if (ki <= 0) return;
      const a = ((i / items.length) * 360 + p.spin - 90) * (Math.PI / 180);
      const x = Math.cos(a) * R * 0.78;
      const y = Math.sin(a) * R * 0.78;
      ctx.save();
      ctx.globalAlpha *= ki;
      // titik ikon kecil + label
      ctx.beginPath();
      ctx.arc(x, y - p.labelSize * 0.9, p.labelSize * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.35);
      ctx.fill();
      ctx.strokeStyle = rgba(0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = p.text;
      ctx.fillText(label, x, y + p.labelSize * 0.45);
      ctx.restore();
    });
    ctx.restore();
  }
};
