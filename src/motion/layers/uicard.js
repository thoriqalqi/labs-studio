// Kartu UI berisi judul + baris berstatus (seperti tabel aplikasi). Tiga gaya: kertas, kaca, gelap.
// Baris ditulis satu per baris: "Nama | Status | warna" (warna: red, amber, green, mint, gray, violet).
const TONES = {
  red: ['#fde7ea', '#d6334c'], amber: ['#fdf1cf', '#a8730a'], green: ['#dff5e6', '#1f8a4c'],
  mint: ['#d8fbe9', '#0f7a52'], gray: ['#ececea', '#6b6966'], violet: ['#ece6ff', '#5b43c9']
};
const THEMES = {
  paper: { bg: '#fbfaf8', line: 'rgba(40,38,36,0.14)', title: '#2a2827', text: '#3b3936', muted: '#9a9792', glass: false },
  glass: { bg: 'rgba(255,255,255,0.72)', line: 'rgba(255,255,255,0.9)', title: '#1f2a24', text: '#2b3530', muted: '#7b8580', glass: true },
  dark: { bg: '#10211c', line: 'rgba(255,255,255,0.1)', title: '#f2f5f3', text: '#dbe4df', muted: '#7f938a', glass: false }
};
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default {
  type: 'uicard',
  name: 'Kartu UI',
  icon: '▤',
  category: 'Promo',
  order: 44,
  defaults: {
    theme: 'paper', w: 760, rowH: 76, title: 'Render queue', subtitle: '',
    rows: 'Keyframes | Skipped | red\nRevisions | Waiting | amber\nExport | Failed | red',
    progress: 1, highlight: -1, font: 'Geist', size: 26, icon: true
  },
  schema: [
    { key: 'theme', label: 'Gaya', kind: 'select', options: { paper: 'Kertas', glass: 'Kaca', dark: 'Gelap' } },
    { key: 'title', label: 'Judul', kind: 'text' },
    { key: 'subtitle', label: 'Subjudul', kind: 'text' },
    { key: 'rows', label: 'Baris (Nama | Status | warna)', kind: 'textarea' },
    { key: 'progress', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'highlight', label: 'Sorot baris ke- (-1 = tidak)', kind: 'number', min: -1, step: 1, animatable: true },
    { key: 'w', label: 'Lebar', kind: 'number', min: 100, step: 2, animatable: true },
    { key: 'rowH', label: 'Tinggi baris', kind: 'number', min: 20, step: 1 },
    { key: 'size', label: 'Ukuran huruf', kind: 'number', min: 8, step: 1 },
    { key: 'icon', label: 'Ikon di judul', kind: 'checkbox' }
  ],
  size(p) {
    const n = String(p.rows).split('\n').filter((r) => r.trim()).length;
    return { w: p.w, h: p.size * (p.subtitle ? 3.6 : 2.8) + n * p.rowH + p.size * 0.8 };
  },
  draw(ctx, p) {
    const T = THEMES[p.theme] || THEMES.paper;
    const rows = String(p.rows).split('\n').filter((r) => r.trim()).map((r) => r.split('|').map((s) => s.trim()));
    const head = p.size * (p.subtitle ? 3.6 : 2.8);
    const H = head + rows.length * p.rowH + p.size * 0.8;
    const x0 = -p.w / 2;
    const y0 = -H / 2;
    const pad = p.size * 1.1;
    const k = smooth(p.progress / 0.3);
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.translate(0, (1 - k) * 30);
    // kartu
    const shadow = ctx.shadowBlur;
    ctx.shadowBlur = T.glass ? 40 : 18;
    ctx.shadowColor = T.glass ? 'rgba(20,40,30,0.25)' : 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.roundRect(x0, y0, p.w, H, p.size * 0.9);
    ctx.fillStyle = T.bg;
    ctx.fill();
    ctx.shadowBlur = shadow;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = T.line;
    ctx.stroke();
    // judul
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let tx = x0 + pad;
    const ty = y0 + p.size * 1.5;
    if (p.icon) {
      ctx.beginPath();
      ctx.roundRect(tx, ty - p.size * 0.5, p.size, p.size, p.size * 0.25);
      ctx.lineWidth = 2;
      ctx.strokeStyle = T.title;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx + p.size * 0.25, ty);
      ctx.lineTo(tx + p.size * 0.75, ty);
      ctx.stroke();
      tx += p.size * 1.5;
    }
    ctx.font = `600 ${p.size * 1.05}px "${p.font}"`;
    ctx.fillStyle = T.title;
    ctx.fillText(p.title, tx, ty);
    if (p.subtitle) {
      ctx.font = `400 ${p.size * 0.72}px "${p.font}"`;
      ctx.fillStyle = T.muted;
      ctx.fillText(p.subtitle, x0 + pad, ty + p.size * 1.3);
    }
    // baris
    rows.forEach(([name = '', status = '', tone = 'gray'], i) => {
      const kr = smooth((p.progress - 0.15 - i * 0.12) / 0.2);
      if (kr <= 0) return;
      const ry = y0 + head + i * p.rowH;
      ctx.save();
      ctx.globalAlpha *= kr;
      ctx.translate((1 - kr) * 24, 0);
      if (Math.round(p.highlight) === i) {
        ctx.fillStyle = p.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(40,38,36,0.05)';
        ctx.fillRect(x0 + 2, ry, p.w - 4, p.rowH);
      }
      ctx.strokeStyle = T.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 + pad * 0.6, ry);
      ctx.lineTo(x0 + p.w - pad * 0.6, ry);
      ctx.stroke();
      const cy = ry + p.rowH / 2;
      ctx.font = `400 ${p.size}px "${p.font}"`;
      ctx.fillStyle = T.text;
      ctx.textAlign = 'left';
      ctx.fillText(name, x0 + pad, cy);
      if (status) {
        const [bg, fg] = TONES[tone] || TONES.gray;
        ctx.font = `500 ${p.size * 0.72}px "${p.font}"`;
        const label = status.toUpperCase();
        const tw = ctx.measureText(label).width;
        const cw = tw + p.size * 0.9;
        const ch = p.size * 1.25;
        const cx = x0 + p.w - pad - cw;
        ctx.beginPath();
        ctx.roundRect(cx, cy - ch / 2, cw, ch, ch * 0.25);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx + cw / 2, cy + 1);
      }
      ctx.restore();
    });
    ctx.restore();
  }
};
