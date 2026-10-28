// Kolom pencarian / komentar berbentuk pil (seperti bilah alamat HP): teks diketik huruf demi huruf,
// tombol samping (kembali & salin) bisa menggeser keluar, dan tombol kirim bisa muncul di kanan.
// Animasikan "Teks terketik" 0 → 1 untuk efek mengetik.
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function sideButton(ctx, x, r, kind, ink, fill, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowColor = 'rgba(20,30,60,0.14)';
  ctx.shadowBlur = r * 0.7;
  ctx.shadowOffsetY = r * 0.18;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const s = r * 0.32;
  if (kind === 'back') {
    ctx.moveTo(x + s * 0.4, -s);
    ctx.lineTo(x - s * 0.5, 0);
    ctx.lineTo(x + s * 0.4, s);
  } else {
    ctx.roundRect(x - s * 0.9, -s * 0.5, s * 1.3, s * 1.4, s * 0.2);
    ctx.moveTo(x - s * 0.4, -s * 0.9);
    ctx.lineTo(x + s * 0.7, -s * 0.9);
    ctx.lineTo(x + s * 0.7, s * 0.4);
  }
  ctx.stroke();
  ctx.restore();
}

export default {
  type: 'searchbar',
  name: 'Kolom cari / komentar',
  icon: '⌕',
  category: 'Demo UI',
  order: 38,
  defaults: {
    w: 640, h: 96, text: 'Labs Studio', typed: 1, placeholder: 'search...', lead: 'menu', refresh: true,
    sides: 0, send: 0, underline: 0, caret: true, font: 'Geist', size: 34,
    fill: '#ffffff', ink: '#1d1f24', muted: '#9a9ca3', sendColor: '#111214', softShadow: 0.16
  },
  schema: [
    { key: 'text', label: 'Teks', kind: 'text' },
    { key: 'typed', label: 'Teks terketik (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'placeholder', label: 'Teks bayangan (saat kosong)', kind: 'text' },
    { key: 'lead', label: 'Ikon kiri', kind: 'select', options: { menu: 'Menu (garis)', search: 'Kaca pembesar', none: 'Tanpa ikon' } },
    { key: 'refresh', label: 'Ikon muat ulang di kanan', kind: 'checkbox' },
    { key: 'w', label: 'Lebar', kind: 'number', min: 60, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 20, step: 1, animatable: true },
    { key: 'sides', label: 'Tombol samping keluar (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'send', label: 'Tombol kirim (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'underline', label: 'Garis bawah (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'caret', label: 'Kursor teks berkedip', kind: 'checkbox' },
    { key: 'font', label: 'Font', kind: 'select', options: { Geist: 'Geist', Inter: 'Inter', 'Baloo 2': 'Baloo 2', Poppins: 'Poppins' } },
    { key: 'size', label: 'Ukuran huruf', kind: 'number', min: 6, step: 1, animatable: true },
    { key: 'fill', label: 'Warna kolom', kind: 'color', animatable: true },
    { key: 'ink', label: 'Warna teks & ikon', kind: 'color', animatable: true },
    { key: 'muted', label: 'Warna teks bayangan', kind: 'color' },
    { key: 'sendColor', label: 'Warna tombol kirim', kind: 'color' },
    { key: 'softShadow', label: 'Bayangan (0–1)', kind: 'number', min: 0, max: 1, step: 0.01 }
  ],
  size: (p) => {
    const r = p.h * 0.36;
    const side = clamp01(p.sides) * (r * 2 + p.h * 0.35);
    return { w: p.w + side * 2, h: p.h };
  },
  draw(ctx, p, env) {
    const { w, h } = p;
    const r = h / 2;
    const sides = clamp01(p.sides);
    // tombol samping keluar dari balik kolom
    if (sides > 0) {
      const br = h * 0.36;
      const off = w / 2 + (br + h * 0.35) * sides;
      sideButton(ctx, -off, br, 'back', p.ink, p.fill, sides);
      sideButton(ctx, off, br, 'copy', p.ink, p.fill, sides);
    }
    // kolom
    ctx.save();
    if (p.softShadow > 0) {
      ctx.shadowColor = `rgba(20,30,60,${0.9 * p.softShadow})`;
      ctx.shadowBlur = h * 0.5;
      ctx.shadowOffsetY = h * 0.14;
    }
    ctx.fillStyle = p.fill;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.clip();
    // garis tepi tipis
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const pad = h * 0.42;
    let x = -w / 2 + pad;
    ctx.strokeStyle = p.ink;
    ctx.fillStyle = p.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, h * 0.035);
    const is = h * 0.2;
    if (p.lead === 'menu') {
      ctx.beginPath();
      for (const dy of [-0.55, 0, 0.55]) {
        ctx.moveTo(x, dy * is);
        ctx.lineTo(x + is * (dy > 0 ? 1.1 : 1.6), dy * is);
      }
      ctx.stroke();
      x += is * 1.6 + h * 0.28;
    } else if (p.lead === 'search') {
      ctx.save();
      ctx.strokeStyle = p.muted;
      ctx.beginPath();
      ctx.arc(x + is * 0.6, -is * 0.15, is * 0.62, 0, Math.PI * 2);
      ctx.moveTo(x + is * 1.05, is * 0.3);
      ctx.lineTo(x + is * 1.5, is * 0.75);
      ctx.stroke();
      ctx.restore();
      x += is * 1.6 + h * 0.3;
    }
    // ikon kanan: muat ulang atau tombol kirim
    const send = clamp01(p.send);
    let right = w / 2 - pad;
    if (p.refresh && send < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - send;
      ctx.beginPath();
      ctx.arc(right - is * 0.6, 0, is * 0.6, -Math.PI * 0.35, Math.PI * 1.45);
      ctx.stroke();
      const a = -Math.PI * 0.35;
      const ax = right - is * 0.6 + Math.cos(a) * is * 0.6;
      const ay = Math.sin(a) * is * 0.6;
      ctx.beginPath();
      ctx.moveTo(ax - is * 0.4, ay - is * 0.12);
      ctx.lineTo(ax + is * 0.05, ay + is * 0.05);
      ctx.lineTo(ax + is * 0.05, ay - is * 0.42);
      ctx.stroke();
      ctx.restore();
    }
    if (send > 0) {
      const sr = h * 0.27 * (0.5 + 0.5 * send);
      const sx = w / 2 - h * 0.18 - h * 0.27;
      ctx.save();
      ctx.globalAlpha *= send;
      ctx.fillStyle = p.sendColor;
      ctx.beginPath();
      ctx.roundRect(sx - sr, -sr, sr * 2, sr * 2, sr * 0.38);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, sr * 0.14);
      ctx.beginPath();
      ctx.moveTo(sx, sr * 0.45);
      ctx.lineTo(sx, -sr * 0.45);
      ctx.moveTo(sx - sr * 0.4, -sr * 0.05);
      ctx.lineTo(sx, -sr * 0.45);
      ctx.lineTo(sx + sr * 0.4, -sr * 0.05);
      ctx.stroke();
      ctx.restore();
      right = sx - h * 0.4;
    }
    if (p.refresh || send > 0) right -= is * 1.6;
    // teks terketik
    const full = String(p.text || '');
    const n = Math.round(clamp01(p.typed) * full.length);
    const shown = full.slice(0, n);
    ctx.font = `500 ${p.size}px "${p.font}", "Geist", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const maxW = right - x;
    let tx = x;
    let caretX = x;
    if (shown) {
      const tw = ctx.measureText(shown).width;
      if (tw > maxW) tx = x - (tw - maxW); // teks panjang bergeser ke kiri seperti kolom asli
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 2, -h / 2, maxW + 4, h);
      ctx.clip();
      ctx.fillStyle = p.ink;
      ctx.fillText(shown, tx, h * 0.02);
      ctx.restore();
      caretX = x + Math.min(tw, maxW);
    } else if (p.placeholder) {
      ctx.fillStyle = p.muted;
      ctx.font = `400 ${p.size * 0.86}px "${p.font}", "Geist", sans-serif`;
      ctx.fillText(p.placeholder, x, h * 0.02);
    }
    // kursor teks: berkedip saat diam, menyala saat mengetik
    if (p.caret && (shown || p.typed > 0)) {
      const typing = n > 0 && n < full.length;
      if (typing || Math.floor((env.vt || 0) * 2.2) % 2 === 0) {
        ctx.fillStyle = p.ink;
        ctx.fillRect(caretX + 3, -p.size * 0.55, Math.max(2, p.size * 0.08), p.size * 1.1);
      }
    }
    ctx.restore();
    // garis bawah (seperti indikator beranda HP)
    const u = clamp01(p.underline);
    if (u > 0) {
      ctx.fillStyle = p.ink;
      const uw = w * 0.32 * u;
      ctx.beginPath();
      ctx.roundRect(-uw / 2, h / 2 + h * 0.2, uw, Math.max(3, h * 0.07), h);
      ctx.fill();
    }
  }
};
