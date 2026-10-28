// Tumpukan lapisan isometrik (infografis "anatomi adegan"): bidang-bidang miring bertumpuk dari bawah ke atas
// (latar → pendar → kaca → kursor → teks), masing-masing dengan garis penunjuk dan label di kanan.
// "spread" = jarak antar bidang (0 = rapat, besar = meledak terbuka), "reveal" = bidang muncul satu per satu
// dari bawah, "active" = bidang yang disorot (boleh pecahan; -1 = tanpa sorotan).

// bidang dasar (lebar 440, tinggi 120), titik tengah (220, 60)
const PLANE = [[0, 60], [240, 0], [440, 60], [200, 120]];

function plane(ctx, k) {
  ctx.beginPath();
  PLANE.forEach(([x, y], i) => {
    const px = (x - 220) * k;
    const py = (y - 60) * k;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.closePath();
}

const split = (s) => String(s || '').split(',').map((x) => x.trim());

export default {
  type: 'isostack',
  name: 'Tumpukan lapisan',
  icon: '≣',
  category: 'Promo',
  order: 44,
  defaults: {
    size: 440, spread: 110, reveal: 1, active: -1, labels: 1,
    names: '01 · LATAR, 02 · PENDAR, 03 · KACA, 04 · KURSOR, 05 · TEKS',
    notes: 'Navy gelap sebagai panggung, Cahaya biru yang bergerak pelan, Kartu kaca yang membiaskan cahaya, Gerak klik yang memandu mata, Judul dan kata aksen',
    word: 'Labs', labelX: 120, accent: '#3d8bff', ink: '#f3f1ec', nameColor: '#9fd8ff', noteColor: '#c9ccd8'
  },
  schema: [
    { key: 'spread', label: 'Jarak antar lapisan', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'reveal', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'active', label: 'Lapisan disorot (0 = bawah, -1 = tidak ada)', kind: 'number', min: -1, step: 0.05, animatable: true },
    { key: 'labels', label: 'Label tampil (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'size', label: 'Lebar bidang', kind: 'number', min: 40, step: 1, animatable: true },
    { key: 'names', label: 'Nama lapisan, bawah → atas (pisahkan koma)', kind: 'textarea' },
    { key: 'notes', label: 'Keterangan, bawah → atas (pisahkan koma)', kind: 'textarea' },
    { key: 'word', label: 'Teks di lapisan atas', kind: 'text' },
    { key: 'labelX', label: 'Jarak label dari bidang', kind: 'number', min: 0, step: 1 },
    { key: 'accent', label: 'Warna aksen', kind: 'color', animatable: true },
    { key: 'ink', label: 'Warna garis', kind: 'color' },
    { key: 'nameColor', label: 'Warna nama', kind: 'color' },
    { key: 'noteColor', label: 'Warna keterangan', kind: 'color' }
  ],
  size: (p) => ({ w: p.size * 1.15 + p.labelX + 420, h: p.spread * 4 + p.size * 0.3 + 60 }),
  draw(ctx, p) {
    const k = p.size / 440;
    const names = split(p.names);
    const notes = split(p.notes);
    const n = 5;
    const boxW = p.size * 1.15 + p.labelX + 420;
    const cx = -boxW / 2 + p.size / 2 + 10; // titik tengah bidang
    const labelLeft = cx + p.size / 2 + p.labelX;
    const hasActive = p.active > -0.5;
    for (let i = 0; i < n; i++) {
      const r = Math.max(0, Math.min(1, p.reveal * (1 + n * 0.22) - i * 0.22));
      if (r <= 0) continue;
      const e = 1 - Math.pow(1 - r, 3);
      const y = (2 - i) * p.spread - (1 - e) * 90 * k;
      const near = hasActive ? Math.max(0, 1 - Math.abs(i - p.active)) : 0;
      const dim = hasActive ? 0.4 + 0.6 * near : 1;
      const dx = near * 18 * k;
      ctx.save();
      ctx.globalAlpha *= e * dim;
      ctx.translate(cx + dx, y);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.6;
      plane(ctx, k);
      if (i === 0) {
        ctx.fillStyle = '#0a0e2e';
        ctx.fill();
        ctx.strokeStyle = 'rgba(243,241,236,0.35)';
        ctx.stroke();
      } else if (i === 1) {
        ctx.save();
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 40 * k;
        ctx.globalAlpha *= 0.6;
        ctx.fillStyle = p.accent;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = p.accent;
        ctx.stroke();
      } else if (i === 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(243,241,236,0.65)';
        ctx.stroke();
      } else if (i === 3) {
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(243,241,236,0.5)';
        ctx.stroke();
        ctx.setLineDash([]);
        // panah kursor kecil di atas bidang
        ctx.beginPath();
        ctx.moveTo(12 * k, -20 * k);
        ctx.lineTo(42 * k, -4 * k);
        ctx.lineTo(29 * k, -1 * k);
        ctx.lineTo(23 * k, 12 * k);
        ctx.closePath();
        ctx.fillStyle = p.ink;
        ctx.fill();
      } else {
        ctx.strokeStyle = p.ink;
        ctx.stroke();
        if (p.word) {
          ctx.save();
          ctx.transform(1, -0.25, 0.55, 0.5, 0, 0); // tulisan rebah di bidang
          ctx.fillStyle = p.ink;
          ctx.font = `600 ${Math.round(64 * k)}px "Geist", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.word, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();

      // garis penunjuk + label
      const la = Math.max(0, Math.min(1, p.labels * (1 + n * 0.15) - (n - 1 - i) * 0.15)) * e;
      if (la > 0.001 && (names[i] || notes[i])) {
        const ly = y;
        const x0 = cx + dx + 220 * k;
        ctx.save();
        ctx.globalAlpha *= la * (hasActive ? 0.35 + 0.65 * near : 1);
        ctx.strokeStyle = 'rgba(243,241,236,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + 10, ly);
        ctx.lineTo(x0 + 10 + (labelLeft - x0 - 24) * la, ly);
        ctx.stroke();
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.arc(x0 + 10, ly, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = p.nameColor;
        ctx.font = `500 17px "Geist Mono", monospace`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.4px';
        ctx.fillText(names[i] || '', labelLeft + (1 - la) * 20, ly - 8);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.fillStyle = p.noteColor;
        ctx.font = `400 23px "Geist", sans-serif`;
        ctx.fillText(notes[i] || '', labelLeft + (1 - la) * 20, ly + 24);
        ctx.restore();
      }
    }
  }
};
