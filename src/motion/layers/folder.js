// Folder kaca bergaya aplikasi berkas: sampul berwarna mengintip di belakang, panel depan seperti kaca buram,
// dan saat "Terbuka" naik, kartu-kartu (bisa berisi gambar) keluar dari dalam folder menyebar seperti kipas.
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function coverImage(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * s;
  const ih = img.naturalHeight * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function folderPath(ctx, x, y, w, h, r, tabW, tabH) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + tabW - tabH * 0.6, y);
  ctx.quadraticCurveTo(x + tabW - tabH * 0.2, y, x + tabW, y + tabH * 0.6);
  ctx.quadraticCurveTo(x + tabW + tabH * 0.2, y + tabH, x + tabW + tabH * 0.8, y + tabH);
  ctx.lineTo(x + w - r, y + tabH);
  ctx.quadraticCurveTo(x + w, y + tabH, x + w, y + tabH + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default {
  type: 'folder',
  name: 'Folder kaca',
  icon: '▱',
  category: 'Demo UI',
  order: 39,
  defaults: {
    w: 420, h: 300, open: 0, theme: 'light', title: 'Proyek', subtitle: '3 berkas',
    c1: '#d93b3b', c2: '#2f4f9e', c3: '#f2efe9', cover: '', img1: '', img2: '', img3: '',
    button: 'plus', font: 'Geist', softShadow: 0.25
  },
  schema: [
    { key: 'open', label: 'Terbuka (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'theme', label: 'Panel depan', kind: 'select', options: { light: 'Kaca terang', dark: 'Kaca gelap' } },
    { key: 'title', label: 'Nama folder', kind: 'text' },
    { key: 'subtitle', label: 'Keterangan', kind: 'text' },
    { key: 'w', label: 'Lebar', kind: 'number', min: 40, step: 1, animatable: true },
    { key: 'h', label: 'Tinggi', kind: 'number', min: 40, step: 1, animatable: true },
    { key: 'c1', label: 'Warna sampul 1', kind: 'color', animatable: true },
    { key: 'c2', label: 'Warna sampul 2', kind: 'color', animatable: true },
    { key: 'c3', label: 'Warna sampul 3', kind: 'color', animatable: true },
    { key: 'cover', label: 'Gambar sampul (opsional)', kind: 'asset', accept: 'image/*' },
    { key: 'img1', label: 'Gambar kartu 1', kind: 'asset', accept: 'image/*' },
    { key: 'img2', label: 'Gambar kartu 2', kind: 'asset', accept: 'image/*' },
    { key: 'img3', label: 'Gambar kartu 3', kind: 'asset', accept: 'image/*' },
    { key: 'button', label: 'Tombol', kind: 'select', options: { plus: 'Tambah (+)', more: 'Lainnya (•••)', none: 'Tanpa tombol' } },
    { key: 'font', label: 'Font', kind: 'select', options: { Geist: 'Geist', Inter: 'Inter' } },
    { key: 'softShadow', label: 'Bayangan (0–1)', kind: 'number', min: 0, max: 1, step: 0.01 }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p, env) {
    const { w, h } = p;
    const open = clamp01(p.open);
    const dark = p.theme === 'dark';
    const x = -w / 2;
    const y = -h / 2;
    const r = Math.min(w, h) * 0.07;
    const tabW = w * 0.4;
    const tabH = h * 0.08;
    // bayangan & pelat belakang
    ctx.save();
    if (p.softShadow > 0) {
      ctx.shadowColor = `rgba(10,15,30,${0.55 * p.softShadow})`;
      ctx.shadowBlur = h * 0.1;
      ctx.shadowOffsetY = h * 0.05;
    }
    folderPath(ctx, x, y, w, h, r, tabW, tabH);
    ctx.fillStyle = dark ? '#2a1d20' : '#e6e7ec';
    ctx.fill();
    ctx.restore();
    // sampul (gambar atau garis-garis diagonal berwarna)
    ctx.save();
    folderPath(ctx, x, y, w, h, r, tabW, tabH);
    ctx.clip();
    const cover = p.cover && env.assets.image(p.cover);
    if (cover) coverImage(ctx, cover, x, y, w, h * 0.6);
    else {
      ctx.save();
      ctx.translate(0, y + h * 0.25);
      ctx.rotate(-0.42);
      const cols = [p.c3, p.c1, p.c3, p.c2, p.c1, p.c3];
      const band = w * 0.16;
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(-w, -band * 3 + i * band, w * 2, band + 1);
      });
      ctx.restore();
      const sh = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
      sh.addColorStop(0, 'rgba(255,255,255,0.15)');
      sh.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = sh;
      ctx.fillRect(x, y, w, h * 0.6);
    }
    ctx.restore();
    // kartu keluar dari folder
    if (open > 0) {
      const imgs = [p.img1, p.img2, p.img3];
      const cw = w * 0.82;
      const ch = h * 0.6;
      for (let k = 2; k >= 0; k--) {
        const e = clamp01(open * 1.25 - k * 0.12);
        if (e <= 0) continue;
        const lift = e * (h * 0.36 + k * h * 0.06);
        ctx.save();
        ctx.translate((k - 1) * w * 0.07 * e, y + h * 0.42 - lift);
        ctx.rotate(((k - 1) * 6 * e * Math.PI) / 180);
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = h * 0.06;
        ctx.shadowOffsetY = h * 0.02;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-cw / 2, -ch / 2, cw, ch, r * 0.8);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        const img = imgs[k] && env.assets.image(imgs[k]);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 12, r * 0.6);
        ctx.clip();
        if (img) coverImage(ctx, img, -cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 12);
        else {
          ctx.fillStyle = '#eef0f4';
          ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
          ctx.fillStyle = '#d6d9e0';
          for (let i = 0; i < 4; i++) ctx.fillRect(-cw * 0.4, -ch * 0.3 + i * ch * 0.14, cw * (i === 3 ? 0.4 : 0.8), ch * 0.05);
        }
        ctx.restore();
        ctx.restore();
      }
    }
    // panel depan kaca: sedikit turun & miring ke depan saat terbuka
    const top = y + h * 0.3 + open * h * 0.06;
    const ph = y + h - top;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, top, w, ph, r);
    const g = ctx.createLinearGradient(0, top, 0, y + h);
    if (dark) {
      g.addColorStop(0, 'rgba(70,40,44,0.72)');
      g.addColorStop(0.5, 'rgba(38,22,26,0.9)');
      g.addColorStop(1, 'rgba(22,14,16,0.97)');
    } else {
      g.addColorStop(0, 'rgba(255,255,255,0.7)');
      g.addColorStop(0.45, 'rgba(250,250,252,0.9)');
      g.addColorStop(1, 'rgba(240,241,245,0.98)');
    }
    ctx.fillStyle = g;
    ctx.fill();
    // kilau tepi atas
    ctx.strokeStyle = dark ? 'rgba(255,200,200,0.25)' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + r, top + 1);
    ctx.lineTo(x + w - r, top + 1);
    ctx.stroke();
    ctx.restore();
    // label
    const fs = h * 0.075;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = dark ? '#ffffff' : '#1d1f24';
    ctx.font = `600 ${fs}px "${p.font}", sans-serif`;
    const ly = y + h - h * 0.17;
    ctx.fillText(p.title || '', x + w * 0.07, ly);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(29,31,36,0.45)';
    ctx.font = `400 ${fs * 0.72}px "${p.font}", sans-serif`;
    ctx.fillText(p.subtitle || '', x + w * 0.07, ly + fs * 1.05);
    if (p.button !== 'none') {
      const br = h * 0.07;
      const bx = x + w - w * 0.07 - br;
      const by = y + h - h * 0.17 - br * 0.2;
      ctx.fillStyle = p.button === 'plus' ? '#151619' : dark ? 'rgba(255,255,255,0.12)' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(bx - br, by - br, br * 2, br * 2, br * 0.5);
      ctx.fill();
      ctx.strokeStyle = p.button === 'plus' ? '#ffffff' : dark ? '#ffffff' : '#1d1f24';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = Math.max(1.5, br * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (p.button === 'plus') {
        ctx.moveTo(bx - br * 0.4, by);
        ctx.lineTo(bx + br * 0.4, by);
        ctx.moveTo(bx, by - br * 0.4);
        ctx.lineTo(bx, by + br * 0.4);
        ctx.stroke();
      } else {
        for (const dx of [-0.42, 0, 0.42]) {
          ctx.moveTo(bx + dx * br + br * 0.1, by);
          ctx.arc(bx + dx * br, by, br * 0.1, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
  }
};
