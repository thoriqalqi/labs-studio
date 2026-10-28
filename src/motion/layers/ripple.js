// Gelombang riak (efek klik): cincin yang melebar dari titik layer dan membiaskan apa yang sudah tergambar di
// belakangnya, seperti riak air. Latar di dalam pita gelombang digambar ulang sedikit diperbesar/diperkecil per
// cincin tipis (pergeseran radial), lalu diberi garis cahaya lembut. Taruh layer ini DI ATAS isi yang mau ikut beriak.
// Murni dari waktu: atur "progress" 0 → 1 dengan keyframe.

let snap = null;
const tmp = () => (snap ||= document.createElement('canvas'));

export default {
  type: 'ripple',
  name: 'Gelombang riak',
  icon: '◎',
  category: 'Demo UI',
  order: 38,
  defaults: { progress: 0, radius: 700, band: 140, strength: 26, waves: 2, glow: 0.5, glowColor: '#5fc3ff' },
  schema: [
    { key: 'progress', label: 'Jalannya gelombang (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'radius', label: 'Jari-jari akhir', kind: 'number', min: 10, step: 10, animatable: true },
    { key: 'band', label: 'Lebar pita gelombang', kind: 'number', min: 10, step: 5, animatable: true },
    { key: 'strength', label: 'Kekuatan bias', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'waves', label: 'Jumlah gelombang', kind: 'number', min: 1, max: 4, step: 1 },
    { key: 'glow', label: 'Cahaya cincin (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'glowColor', label: 'Warna cahaya cincin', kind: 'color' }
  ],
  size: (p) => ({ w: p.radius * 2, h: p.radius * 2 }),
  draw(ctx, p, env) {
    const k = Math.max(0, Math.min(1, p.progress));
    if (k <= 0 || k >= 1) return;
    const back = env?.ctx?.canvas;
    if (!back || !back.width) return;
    // kuat di awal, hilang perlahan di akhir
    const fade = Math.min(1, k / 0.08) * Math.pow(1 - k, 1.3);
    const m = ctx.getTransform();
    const kf = back.width / ctx.canvas.width;
    const cx = m.e * kf;
    const cy = m.f * kf;
    const sc = Math.hypot(m.a, m.b) * kf;
    const band = Math.max(4, p.band * sc);
    const amp = p.strength * sc * fade;

    // salinan latar saat ini (sebelum riak) supaya bisa dibaca sambil digambar ulang
    const c = tmp();
    if (c.width !== back.width || c.height !== back.height) {
      c.width = back.width;
      c.height = back.height;
    }
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(back, 0, 0);

    ctx.save();
    ctx.setTransform(1 / kf, 0, 0, 1 / kf, 0, 0);
    const waves = Math.max(1, Math.round(p.waves));
    for (let wv = 0; wv < waves; wv++) {
      // gelombang berikutnya sedikit tertinggal dan lebih lemah
      const R = (k - wv * 0.12) * p.radius * sc;
      if (R <= band * 0.2) continue;
      const a = amp * Math.pow(0.55, wv);
      const steps = 18;
      for (let i = 0; i < steps; i++) {
        const r0 = Math.max(0, R - band + (2 * band * i) / steps);
        const r1 = Math.max(0, R - band + (2 * band * (i + 1)) / steps);
        if (r1 <= 1) continue;
        const rm = (r0 + r1) / 2;
        const u = (rm - R) / band; // -1..1 di dalam pita
        const d = a * Math.sin(u * Math.PI) * (1 - Math.abs(u));
        const f = rm / Math.max(1, rm - d); // > 1 = latar ditarik ke luar
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r1, 0, Math.PI * 2);
        ctx.arc(cx, cy, r0, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.translate(cx, cy);
        ctx.scale(f, f);
        ctx.translate(-cx, -cy);
        ctx.drawImage(c, 0, 0);
        ctx.restore();
      }
      // garis cahaya lembut di puncak gelombang
      const ga = p.glow * fade * Math.pow(0.6, wv);
      if (ga > 0.002) {
        ctx.strokeStyle = p.glowColor;
        for (const [lw, al] of [[band * 0.9, 0.06], [band * 0.45, 0.1], [band * 0.12, 0.22]]) {
          ctx.globalAlpha = ga * al * 2;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(cx, cy, R + band * 0.15, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
};
