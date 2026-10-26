// Gelembung chat bergaya aplikasi pesan: pesan agen (avatar kecil + nama, gelembung abu terang) atau
// pesan pengguna (gelembung biru, rata kanan). Bisa diawali animasi "sedang mengetik" (titik tiga).
// Kotak layer selebar "Lebar"; gelembung menempel ke kiri (agen) atau kanan (pengguna) di dalamnya.
import { drawAgent, AGENT_KINDS } from './agent.js';
import { drawGlassRect } from '../glass.js';

function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of String(text || '').split('\n')) {
    let line = '';
    for (let word of para.split(/\s+/).filter(Boolean)) {
      // kata yang terlalu panjang (mis. tautan) dipotong per huruf
      while (ctx.measureText(word).width > maxW) {
        let n = word.length;
        while (n > 1 && ctx.measureText(word.slice(0, n)).width > maxW) n--;
        if (line) lines.push(line);
        lines.push(word.slice(0, n));
        line = '';
        word = word.slice(n);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

function layout(ctx, p) {
  const pad = p.fontSize * 0.95;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.font = `400 ${p.fontSize}px "${p.font}", sans-serif`;
  const lines = wrap(ctx, p.text, p.w - pad * 2);
  const lh = p.fontSize * 1.42;
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width), p.fontSize);
  const bw = p.fit ? Math.min(p.w, textW + pad * 2) : p.w;
  const bh = lines.length * lh + pad * 1.5;
  const head = p.who === 'agent' && p.name ? p.fontSize * 1.9 : 0;
  return { pad, lines, lh, bw, bh, head, h: head + bh };
}

export default {
  type: 'chatmsg',
  name: 'Gelembung chat',
  icon: '◫',
  category: 'Demo UI',
  order: 37,
  defaults: {
    who: 'agent', name: 'Kipli', text: 'Siap, aku pegang caption dan posting.', w: 620, fit: true,
    fontSize: 30, font: 'Geist', avatar: 'triangle', avatarColor: '#3d8ef0', avatarBrows: 'none',
    bubble: '#eef0f3', ink: '#1d1d1f', userBubble: '#1f6fe8', userInk: '#ffffff', nameColor: '#6f7280',
    link: '#2563eb', typing: 0, softShadow: 0.08, glass: false, glassTint: 0.35, glassFrost: 0.55
  },
  schema: [
    { key: 'who', label: 'Pengirim', kind: 'select', options: { agent: 'Agen (kiri)', user: 'Kamu (kanan, biru)' } },
    { key: 'name', label: 'Nama agen', kind: 'text' },
    { key: 'text', label: 'Isi pesan', kind: 'textarea' },
    { key: 'w', label: 'Lebar maksimal', kind: 'number', min: 80, step: 10 },
    { key: 'fit', label: 'Gelembung menyesuaikan isi', kind: 'checkbox' },
    { key: 'fontSize', label: 'Ukuran huruf', kind: 'number', min: 8, step: 1 },
    { key: 'avatar', label: 'Avatar', kind: 'select', options: AGENT_KINDS },
    { key: 'avatarColor', label: 'Warna avatar', kind: 'color' },
    { key: 'avatarBrows', label: 'Alis avatar', kind: 'select', options: { none: 'Tanpa alis', flat: 'Lurus tebal', raised: 'Satu terangkat' } },
    { key: 'bubble', label: 'Warna gelembung agen', kind: 'color' },
    { key: 'userBubble', label: 'Warna gelembung kamu', kind: 'color' },
    { key: 'typing', label: 'Mengetik dulu (dtk)', kind: 'number', min: 0, step: 0.1 },
    { key: 'softShadow', label: 'Bayangan lembut', kind: 'number', min: 0, max: 1, step: 0.01 },
    { key: 'glass', label: 'Kaca (liquid glass)', kind: 'checkbox' },
    { key: 'glassTint', label: 'Warna kaca (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true },
    { key: 'glassFrost', label: 'Buram kaca (0–1)', kind: 'number', min: 0, max: 1, step: 0.01, animatable: true }
  ],
  size(p, env) {
    const L = layout(env.ctx, p);
    return { w: p.w, h: L.h };
  },
  draw(ctx, p, env) {
    const L = layout(ctx, p);
    const user = p.who === 'user';
    const top = -L.h / 2;
    const left = -p.w / 2;
    const typing = env.vt < p.typing;
    // header agen: avatar + nama
    if (L.head) {
      const as = p.fontSize * 1.05;
      ctx.save();
      ctx.translate(left + as * 0.6, top + L.head * 0.42);
      drawAgent(ctx, { kind: p.avatar, color: p.avatarColor, size: as, brows: p.avatarBrows });
      ctx.restore();
      ctx.fillStyle = p.nameColor;
      ctx.font = `500 ${p.fontSize * 0.82}px "${p.font}", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, left + as * 1.45, top + L.head * 0.42);
    }
    const by = top + L.head;
    // gelembung "sedang mengetik": kecil, titik tiga naik-turun
    const bw = typing ? p.fontSize * 3.6 : L.bw;
    const bh = typing ? p.fontSize * 2.3 : L.bh;
    const bx = user ? -left - bw : left;
    const radius = Math.min(p.fontSize * 1.05, bh / 2);
    if (p.glass) {
      // gelembung kaca: membiaskan latar di belakangnya, diwarnai warna gelembung
      drawGlassRect(ctx, env, bx, by, bw, bh, radius, {
        tint: user ? p.userBubble : p.bubble,
        tintAmount: user ? Math.min(1, p.glassTint + 0.45) : p.glassTint,
        frost: p.glassFrost, shadow: p.softShadow > 0 ? Math.min(0.3, p.softShadow * 1.4) : 0
      });
    } else {
      ctx.save();
      if (p.softShadow > 0) {
        ctx.shadowColor = `rgba(20,24,40,${p.softShadow})`;
        ctx.shadowBlur = p.fontSize * 1.2;
        ctx.shadowOffsetY = p.fontSize * 0.35;
      }
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, radius);
      ctx.fillStyle = user ? p.userBubble : p.bubble;
      ctx.fill();
      ctx.restore();
    }
    if (typing) {
      for (let i = 0; i < 3; i++) {
        const ph = Math.sin(env.vt * 9 - i * 0.9);
        ctx.beginPath();
        ctx.arc(bx + bw / 2 + (i - 1) * p.fontSize * 0.62, by + bh / 2 - Math.max(0, ph) * p.fontSize * 0.18, p.fontSize * 0.17, 0, Math.PI * 2);
        ctx.fillStyle = user ? 'rgba(255,255,255,0.8)' : `rgba(110,114,128,${0.55 + 0.35 * Math.max(0, ph)})`;
        ctx.fill();
      }
      return;
    }
    // isi pesan; @sebutan & tautan berwarna
    const fade = p.typing > 0 ? Math.min(1, (env.vt - p.typing) / 0.18) : 1;
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.font = `400 ${p.fontSize}px "${p.font}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const space = ctx.measureText(' ').width;
    L.lines.forEach((line, i) => {
      let x = bx + L.pad;
      const y = by + L.pad * 0.75 + L.lh * (i + 0.5);
      for (const word of line.split(' ')) {
        const special = /^@|^https?:|^www\.|\.com/.test(word);
        ctx.fillStyle = user ? p.userInk : special ? p.link : p.ink;
        ctx.fillText(word, x, y);
        const ww = ctx.measureText(word).width;
        if (!user && /^https?:|^www\.|\.com/.test(word)) ctx.fillRect(x, y + p.fontSize * 0.55, ww, Math.max(1, p.fontSize * 0.05));
        x += ww + space;
      }
    });
    ctx.restore();
  }
};
