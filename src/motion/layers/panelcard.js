// Kartu UI gelap yang bercahaya untuk demo alur aplikasi: tombol "+ Baru", menu pilihan, kolom isian,
// kotak unggah, dan daftar progres yang berubah hijau. "Miring" memberi kesan 3D (kartu terbalik/condong).
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (x) => 1 - Math.pow(1 - clamp01(x), 3);

function hexRgb(hex) {
  const h = String(hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a) => { const c = hexRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

function glyph(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'upload') {
    ctx.moveTo(0, s * 0.3);
    ctx.lineTo(0, -s * 0.35);
    ctx.moveTo(-s * 0.3, -s * 0.08);
    ctx.lineTo(0, -s * 0.38);
    ctx.lineTo(s * 0.3, -s * 0.08);
    ctx.moveTo(-s * 0.42, s * 0.45);
    ctx.lineTo(s * 0.42, s * 0.45);
    ctx.stroke();
  } else if (kind === 'video') {
    ctx.roundRect(-s * 0.45, -s * 0.32, s * 0.62, s * 0.64, s * 0.1);
    ctx.moveTo(s * 0.22, -s * 0.1);
    ctx.lineTo(s * 0.45, -s * 0.26);
    ctx.lineTo(s * 0.45, s * 0.26);
    ctx.lineTo(s * 0.22, s * 0.1);
    ctx.stroke();
  } else if (kind === 'audio') {
    for (const [dx, hh] of [[-0.36, 0.2], [-0.12, 0.42], [0.12, 0.3], [0.36, 0.16]]) {
      ctx.moveTo(dx * s, -hh * s);
      ctx.lineTo(dx * s, hh * s);
    }
    ctx.stroke();
  } else if (kind === 'image') {
    ctx.roundRect(-s * 0.42, -s * 0.36, s * 0.84, s * 0.72, s * 0.1);
    ctx.moveTo(-s * 0.3, s * 0.22);
    ctx.lineTo(-s * 0.05, -s * 0.05);
    ctx.lineTo(s * 0.12, s * 0.12);
    ctx.lineTo(s * 0.22, s * 0.02);
    ctx.lineTo(s * 0.34, s * 0.2);
    ctx.stroke();
  } else if (kind === 'ae') {
    ctx.roundRect(-s * 0.42, -s * 0.38, s * 0.84, s * 0.76, s * 0.14);
    ctx.stroke();
    ctx.font = `700 ${s * 0.42}px "Geist", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ae', 0, s * 0.02);
  } else if (kind === 'folder') {
    ctx.moveTo(-s * 0.45, -s * 0.3);
    ctx.lineTo(-s * 0.1, -s * 0.3);
    ctx.lineTo(0, -s * 0.18);
    ctx.lineTo(s * 0.45, -s * 0.18);
    ctx.lineTo(s * 0.45, s * 0.32);
    ctx.lineTo(-s * 0.45, s * 0.32);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'check') {
    ctx.moveTo(-s * 0.3, 0);
    ctx.lineTo(-s * 0.08, s * 0.24);
    ctx.lineTo(s * 0.32, -s * 0.24);
    ctx.stroke();
  } else if (kind === 'plus') {
    ctx.moveTo(-s * 0.35, 0);
    ctx.lineTo(s * 0.35, 0);
    ctx.moveTo(0, -s * 0.35);
    ctx.lineTo(0, s * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

// "Teks|ikon" → { text, icon }
const parseItems = (s) => String(s || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const [text, icon] = l.split('|').map((v) => v.trim());
  return { text, icon: icon || '' };
});

export default {
  type: 'panelcard',
  name: 'Kartu UI gelap',
  icon: '▤',
  category: 'Demo UI',
  order: 40,
  defaults: {
    mode: 'menu', w: 520, h: 360, radius: 36, tiltX: 0, tiltY: 0, title: 'Ekspor',
    items: 'Video MP4|video\nAudio MP3 + WAV|audio\nFrame PNG|image\nAfter Effects|ae',
    highlight: -1, typed: 1, value: 'promo-labs', ok: 'Ekspor', cancel: 'Batal', press: 0,
    progress: 0, done: 0, glow: 0.6, glowColor: '#3d5bff', okColor: '#2ee06b', tone: 'color',
    fill: '#17181c', ink: '#f4f5f8', font: 'Geist', size: 30
  },
  schema: [
    { key: 'mode', label: 'Jenis', kind: 'select', options: { button: 'Tombol "+ Baru"', menu: 'Menu pilihan', input: 'Kolom isian', upload: 'Kotak unggah', progress: 'Daftar progres', success: 'Centang berhasil' } },
    { key: 'title', label: 'Judul / teks tombol', kind: 'text' },
    { key: 'items', label: 'Isi (satu per baris, "Teks|ikon")', kind: 'textarea' },
    { key: 'highlight', label: 'Baris disorot (-1 = tidak)', kind: 'number', min: -1, step: 0.05, animatable: true },
    { key: 'value', label: 'Isi kolom isian', kind: 'text' },
    { key: 'typed', label: 'Isian terketik (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'ok', label: 'Tombol setuju', kind: 'text' },
    { key: 'cancel', label: 'Tombol batal', kind: 'text' },
    { key: 'press', label: 'Tombol ditekan (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'progress', label: 'Progres (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'done', label: 'Selesai / hijau (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'w', label: 'Lebar', kind: 'number', min: 40, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 40, step: 1, animatable: true },
    { key: 'radius', label: 'Sudut membulat', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'tiltX', label: 'Miring kiri/kanan (-1–1)', kind: 'number', min: -1, max: 1, step: 0.01, animatable: true },
    { key: 'tiltY', label: 'Miring atas/bawah (-1–1)', kind: 'number', min: -1, max: 1, step: 0.01, animatable: true },
    { key: 'glow', label: 'Pendar (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'glowColor', label: 'Warna pendar', kind: 'color', animatable: true },
    { key: 'tone', label: 'Warna tombol & progres', kind: 'select', options: { color: 'Warna-warni (biru, pelangi)', accent: 'Satu warna (warna pendar)' } },
    { key: 'okColor', label: 'Warna berhasil', kind: 'color' },
    { key: 'fill', label: 'Warna kartu', kind: 'color' },
    { key: 'ink', label: 'Warna teks', kind: 'color' },
    { key: 'size', label: 'Ukuran huruf', kind: 'number', min: 6, step: 1 }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p) {
    const { w, h } = p;
    const S = p.size;
    const font = (wt, s) => `${wt} ${s}px "${p.font}", "Geist", sans-serif`;
    // kesan 3D: miring (skew) + menyempit di sisi yang menjauh
    const tx = Math.max(-1, Math.min(1, p.tiltX));
    const ty = Math.max(-1, Math.min(1, p.tiltY));
    if (tx || ty) ctx.transform(1 - Math.abs(tx) * 0.3, tx * 0.15, -ty * 0.25, 1 - Math.abs(ty) * 0.3, 0, 0);
    const done = clamp01(p.done);
    // tone 'accent': semua warna tombol/progres memakai warna pendar (palet konsisten)
    const one = p.tone === 'accent';
    const tint = (c) => (one ? p.glowColor : c);
    const glowC = p.glowColor;
    const r = Math.min(p.radius, w / 2, h / 2);

    if (p.mode === 'success') {
      const k = ease(done);
      const R = Math.min(w, h) * 0.32 * (0.6 + 0.4 * k);
      ctx.save();
      ctx.shadowColor = p.okColor;
      ctx.shadowBlur = R * 1.2 * p.glow;
      ctx.fillStyle = p.okColor;
      ctx.beginPath();
      ctx.arc(0, -h * 0.08, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(-R, -h * 0.08 - R, R * 2 * clamp01(done * 1.4), R * 2);
      ctx.clip();
      glyph(ctx, 'check', 0, -h * 0.08, R * 1.3, '#08140c');
      ctx.restore();
      if (p.title) {
        ctx.globalAlpha *= clamp01((done - 0.4) / 0.4);
        ctx.fillStyle = p.okColor;
        ctx.shadowColor = p.okColor;
        ctx.shadowBlur = S * 0.6 * p.glow;
        ctx.font = font(700, S);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.title, 0, -h * 0.08 + R + S * 1.1);
      }
      return;
    }

    // pendar di belakang kartu
    if (p.glow > 0) {
      ctx.save();
      ctx.shadowColor = rgba(glowC, 0.9 * p.glow);
      ctx.shadowBlur = Math.min(w, h) * 0.45;
      ctx.fillStyle = p.fill;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, r);
      ctx.fill();
      ctx.restore();
    }
    // kartu
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#26272d');
    g.addColorStop(1, p.fill);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.fill();
    // tepi: tombol "+ Baru" bertepi pelangi, lainnya garis halus
    if (p.mode === 'button') {
      const rg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      rg.addColorStop(0, tint('#4c7dff'));
      rg.addColorStop(0.5, tint('#a259ff'));
      rg.addColorStop(1, tint('#4c7dff'));
      ctx.strokeStyle = rg;
      ctx.lineWidth = Math.max(2, h * 0.05);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
    }
    ctx.stroke();
    // kilau atas
    ctx.save();
    ctx.clip();
    const hl = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 + h * 0.3);
    hl.addColorStop(0, 'rgba(255,255,255,0.07)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(-w / 2, -h / 2, w, h * 0.3);
    ctx.restore();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const pad = Math.min(w, h) * 0.1;

    if (p.mode === 'button') {
      const press = clamp01(p.press);
      ctx.save();
      ctx.scale(1 - press * 0.06, 1 - press * 0.06);
      ctx.font = font(600, S);
      const tw = ctx.measureText(p.title).width;
      const x0 = -(tw + S * 1.1) / 2;
      // plus 4 warna
      const pc = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'].map(tint);
      ctx.lineWidth = S * 0.16;
      ctx.lineCap = 'round';
      const cx = x0 + S * 0.35;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy], i) => {
        ctx.strokeStyle = pc[i];
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx + dx * S * 0.36, dy * S * 0.36);
        ctx.stroke();
      });
      ctx.fillStyle = tint('#8fb0ff');
      ctx.fillText(p.title, x0 + S * 1.1, S * 0.03);
      ctx.restore();
      return;
    }

    if (p.mode === 'upload') {
      glyph(ctx, 'upload', 0, -S * 0.7, S * 1.4, p.ink);
      ctx.fillStyle = p.ink;
      ctx.font = font(600, S);
      ctx.textAlign = 'center';
      ctx.fillText(p.title, 0, S * 1.0);
      return;
    }

    if (p.mode === 'menu') {
      const items = parseItems(p.items);
      const rowH = (h - pad * 1.2) / Math.max(1, items.length);
      const y0 = -h / 2 + pad * 0.6;
      const hi = p.highlight;
      if (hi >= 0 && hi <= items.length - 1) {
        ctx.fillStyle = rgba(glowC, 0.32);
        ctx.beginPath();
        ctx.roundRect(-w / 2 + pad * 0.4, y0 + hi * rowH + rowH * 0.08, w - pad * 0.8, rowH * 0.84, rowH * 0.3);
        ctx.fill();
      }
      items.forEach((it, i) => {
        const yy = y0 + i * rowH + rowH / 2;
        const near = hi >= 0 ? clamp01(1 - Math.abs(hi - i)) : 0;
        glyph(ctx, it.icon, -w / 2 + pad + S * 0.5, yy, S * 1.05, p.ink);
        ctx.fillStyle = p.ink;
        ctx.font = font(500 + Math.round(near) * 100, S);
        ctx.fillText(it.text, -w / 2 + pad + S * 1.6, yy + S * 0.03);
      });
      return;
    }

    if (p.mode === 'input') {
      ctx.fillStyle = p.ink;
      ctx.font = font(600, S);
      ctx.fillText(p.title, -w / 2 + pad, -h / 2 + pad + S * 0.5);
      // kolom
      const fy = -h / 2 + pad + S * 1.5;
      const fh = S * 1.9;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = rgba(glowC, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + pad, fy, w - pad * 2, fh, fh / 2);
      ctx.fill();
      ctx.stroke();
      const full = String(p.value || '');
      const shown = full.slice(0, Math.round(clamp01(p.typed) * full.length));
      ctx.font = font(500, S * 0.9);
      ctx.fillStyle = p.ink;
      const ix = -w / 2 + pad + fh * 0.45;
      ctx.fillText(shown, ix, fy + fh / 2 + S * 0.03);
      const cw = ctx.measureText(shown).width;
      ctx.fillRect(ix + cw + 3, fy + fh * 0.25, 2.5, fh * 0.5);
      // tombol
      const by = fy + fh + S * 1.35;
      ctx.font = font(600, S * 0.85);
      ctx.textAlign = 'center';
      const okW = ctx.measureText(p.ok).width + S * 1.4;
      const okX = w / 2 - pad - okW / 2;
      const press = clamp01(p.press);
      ctx.fillStyle = rgba(glowC, 0.2 + press * 0.7);
      ctx.beginPath();
      ctx.roundRect(okX - okW / 2, by - S * 0.8, okW, S * 1.6, S * 0.8);
      ctx.fill();
      ctx.fillStyle = tint('#9ab5ff');
      ctx.fillText(p.ok, okX, by + S * 0.03);
      ctx.fillStyle = one ? rgba(p.ink, 0.6) : 'rgba(154,181,255,0.75)';
      ctx.fillText(p.cancel, okX - okW / 2 - ctx.measureText(p.cancel).width / 2 - S * 0.9, by + S * 0.03);
      return;
    }

    if (p.mode === 'progress') {
      ctx.fillStyle = p.ink;
      ctx.font = font(600, S * 0.85);
      ctx.fillText(p.title, -w / 2 + pad, -h / 2 + pad + S * 0.3);
      const items = parseItems(p.items);
      const y0 = -h / 2 + pad + S * 1.5;
      const rowH = (h / 2 - pad * 0.6 - y0) / Math.max(1, items.length);
      items.forEach((it, i) => {
        const yy = y0 + rowH * (i + 0.5);
        const prog = clamp01(p.progress * 1.25 - i * 0.25);
        const ok = clamp01((done - i * 0.2) / 0.6);
        glyph(ctx, 'folder', -w / 2 + pad + S * 0.4, yy, S * 0.95, tint('#39b8ff'));
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = font(500, S * 0.62);
        ctx.fillText(it.text, -w / 2 + pad + S * 1.1, yy - S * 0.42);
        const bx = -w / 2 + pad + S * 1.1;
        const bw = w - pad * 2 - S * 2.6;
        const bh = Math.max(4, S * 0.18);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.roundRect(bx, yy + S * 0.15, bw, bh, bh);
        ctx.fill();
        const bc = ok > 0 ? p.okColor : tint('#39b8ff');
        ctx.save();
        ctx.shadowColor = bc;
        ctx.shadowBlur = S * 0.5 * (0.3 + ok) * p.glow;
        ctx.fillStyle = bc;
        ctx.beginPath();
        ctx.roundRect(bx, yy + S * 0.15, Math.max(bh, bw * prog), bh, bh);
        ctx.fill();
        if (ok > 0) {
          const cx = w / 2 - pad - S * 0.45;
          const cr = S * 0.42 * ease(ok);
          ctx.beginPath();
          ctx.arc(cx, yy + S * 0.15 + bh / 2, cr, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          glyph(ctx, 'check', cx, yy + S * 0.15 + bh / 2, cr * 1.4, '#08140c');
        }
        ctx.restore();
      });
    }
  }
};
