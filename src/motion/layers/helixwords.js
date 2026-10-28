// Heliks kata 3D: kata-kata berputar mengelilingi sumbu tegak sambil bergulir naik, masing-masing di atas
// kapsul biru bercahaya yang memanjang ke kanan. Kata di depan besar & tajam, di belakang kecil, buram, redup.
// "scroll" = posisi gulir (dalam satuan kata; animasikan linear untuk gulir terus-menerus),
// "reveal" 0 → 1 = muncul dari buram (dan sebaliknya untuk larut), "trail" = jejak gerak ke samping.

import { drawGlassText, glassFont, GLASS_FONTS } from '../glasstext.js';

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default {
  type: 'helixwords',
  name: 'Heliks kata',
  icon: '∫',
  category: 'Promo',
  order: 46,
  defaults: {
    words: 'Motion, Infografis, Demo UI, Dunia 3D, Tipografi',
    slots: 10, scroll: 0, reveal: 1, trail: 0.5,
    size: 84, weight: 500, pitch: 118, radius: 120, twist: 112, h: 820,
    color: '#ffffff', font: 'Inter', glassText: true, textBottom: '#b6d3f5', textGlow: 0.5, capsule: true, c1: '#0b2bd6', c2: '#2fa8ff', glow: 0.8, backBlur: 22
  },
  schema: [
    { key: 'words', label: 'Kata (pisahkan koma)', kind: 'textarea' },
    { key: 'scroll', label: 'Posisi gulir (kata)', kind: 'number', step: 0.05, animatable: true },
    { key: 'reveal', label: 'Muncul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'trail', label: 'Jejak gerak (0–1)', kind: 'number', min: 0, max: 1, step: 0.05, animatable: true },
    { key: 'slots', label: 'Jumlah kata di heliks', kind: 'number', min: 2, max: 30, step: 1 },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 6, step: 1, animatable: true },
    { key: 'weight', label: 'Tebal', kind: 'select', options: { 400: 'Biasa', 500: 'Sedang', 600: 'Tebal' } },
    { key: 'pitch', label: 'Jarak baris', kind: 'number', min: 10, step: 1, animatable: true },
    { key: 'radius', label: 'Lebar putaran', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'twist', label: 'Putaran per kata (°)', kind: 'number', step: 1, animatable: true },
    { key: 'h', label: 'Tinggi area tampil', kind: 'number', min: 50, step: 10, animatable: true },
    { key: 'color', label: 'Warna teks', kind: 'color', animatable: true },
    { key: 'font', label: 'Font', kind: 'select', options: GLASS_FONTS },
    { key: 'glassText', label: 'Teks kaca (liquid glass)', kind: 'checkbox' },
    { key: 'textBottom', label: 'Warna bawah teks kaca', kind: 'color', animatable: true },
    { key: 'textGlow', label: 'Pendar teks (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'capsule', label: 'Kapsul bercahaya', kind: 'checkbox' },
    { key: 'c1', label: 'Warna kapsul gelap', kind: 'color', animatable: true },
    { key: 'c2', label: 'Warna kapsul terang', kind: 'color', animatable: true },
    { key: 'glow', label: 'Pendar kapsul (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'backBlur', label: 'Buram kata belakang', kind: 'number', min: 0, step: 1, animatable: true }
  ],
  size: (p) => ({ w: p.size * 6 + p.radius * 2, h: p.h }),
  draw(ctx, p) {
    const list = String(p.words || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!list.length) return;
    const M = Math.max(2, Math.round(p.slots));
    const rev = Math.max(0, Math.min(1, p.reveal));
    if (rev <= 0) return;
    const tw = (p.twist * Math.PI) / 180;
    const gopt = { size: p.size, weight: p.weight, font: p.font, top: p.color, bottom: p.textBottom, glowAmount: p.textGlow, tracking: -0.01 };
    const font = glassFont(gopt);
    ctx.save();
    ctx.font = font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.01 * p.size}px`;

    // posisi tiap kata pada heliks (bisa dihitung ulang untuk jejak gerak)
    const place = (i, sc) => {
      let u = i - sc;
      u = ((u % M) + M) % M; // 0..M
      if (u > M / 2) u -= M; // -M/2..M/2
      const th = u * tw;
      return { u, y: u * p.pitch, x: p.radius * Math.sin(th), z: Math.cos(th) };
    };
    const items = [];
    for (let i = 0; i < M; i++) {
      const pos = place(i, p.scroll);
      items.push({ i, ...pos, word: list[i % list.length] });
    }
    items.sort((a, b) => a.z - b.z); // belakang dulu

    const half = p.h / 2;
    for (const it of items) {
      const front = (it.z + 1) / 2; // 0 belakang .. 1 depan
      const edge = 1 - smooth(half * 0.62, half, Math.abs(it.y));
      if (edge <= 0.002) continue;
      const s = (0.62 + 0.38 * front) * (0.9 + 0.1 * rev);
      const a = (0.16 + 0.84 * Math.pow(front, 1.8)) * edge * rev;
      const blur = (1 - front) * p.backBlur + (1 - rev) * 26;
      const w = ctx.measureText(it.word).width;
      const capW = w + p.size * 1.6;
      const capH = p.size * 1.05;

      const drawOne = (x, y, alpha, extraBlur) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        const b = blur + extraBlur;
        const mt = ctx.getTransform();
        const sx0 = Math.hypot(mt.a, mt.b) || 1;
        // kapsul bercahaya (ujung kanan paling terang)
        if (p.capsule) {
          // tabung cahaya lembut: beberapa lapis membesar & memudar (tepi lunak tanpa ctx.filter)
          const x0 = -w * 0.15;
          const g = ctx.createLinearGradient(x0, 0, x0 + capW, 0);
          g.addColorStop(0, 'rgba(10,30,160,0)');
          g.addColorStop(0.35, p.c1);
          g.addColorStop(0.85, p.c2);
          g.addColorStop(1, p.c2);
          ctx.fillStyle = g;
          const soft = 1 + b / 18;
          for (const [inf, al] of [[0.6 * soft, 0.05], [0.42 * soft, 0.08], [0.26 * soft, 0.13], [0.12 * soft, 0.22], [0, 0.6]]) {
            const e = capH * inf;
            ctx.globalAlpha = alpha * al * (0.55 + 0.45 * front);
            ctx.shadowColor = p.c2;
            ctx.shadowBlur = inf === 0 ? 30 * p.glow * sx0 : 0;
            ctx.beginPath();
            ctx.roundRect(x0 - e, -capH / 2 - e, capW + e * 2, capH + e * 2, capH / 2 + e);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          // kilau tipis di punggung tabung
          const hl = ctx.createLinearGradient(x0, 0, x0 + capW, 0);
          hl.addColorStop(0, 'rgba(191,230,255,0)');
          hl.addColorStop(0.8, 'rgba(191,230,255,0.9)');
          hl.addColorStop(1, 'rgba(191,230,255,0.2)');
          ctx.globalAlpha = alpha * 0.45 * front * front;
          ctx.strokeStyle = hl;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x0 + capW * 0.3, -capH / 2 + 3);
          ctx.lineTo(x0 + capW - capH / 2, -capH / 2 + 3);
          ctx.stroke();
        }
        // teks: kata belakang diburamkan lewat bayangan (lebih ringan dari ctx.filter)
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (b > 0.6) {
          // geseran bayangan dihitung di piksel layar, jadi teksnya digeser sejauh itu di koordinat lokal
          const m = ctx.getTransform();
          const sx = Math.hypot(m.a, m.b) || 1;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = b * sx;
          ctx.shadowOffsetX = 20000;
          ctx.fillText(it.word, -20000 / sx - p.size * 0.15, 0);
        } else {
          ctx.shadowBlur = 0;
          if (p.glassText !== false) drawGlassText(ctx, it.word, -p.size * 0.15, 0, { ...gopt, pixelScale: sx0 });
          else ctx.fillText(it.word, -p.size * 0.15, 0);
        }
        ctx.restore();
      };

      // jejak gerak: salinan samar di posisi sebelumnya (searah putaran)
      if (p.trail > 0) {
        for (let k = 3; k >= 1; k--) {
          const prev = place(it.i, p.scroll - k * 0.06);
          if (Math.abs(prev.u - it.u) > 1) continue; // lompat karena wrap
          drawOne(prev.x, prev.y, a * p.trail * 0.18 * (1 - k / 4), 6);
        }
      }
      drawOne(it.x, it.y, a, 0);
    }
    ctx.restore();
  }
};
