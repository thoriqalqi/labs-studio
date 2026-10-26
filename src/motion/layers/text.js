// Teks dengan bungkus otomatis. Kata di antara *bintang* memakai warna aksen,
// [kata] jadi pil bergaris (seperti tombol), {logo} jadi ikon logo aplikasi.
// Mendukung animasi "per kata" dan "mesin ketik" dari preset.
import { drawMark } from './logo.js';

export const FONTS = {
  Geist: 'Geist (bersih, modern)',
  'Instrument Serif': 'Instrument Serif (serif elegan)',
  'Baloo 2': 'Baloo 2 (tebal, ramah)',
  'Plus Jakarta Sans': 'Plus Jakarta Sans',
  'Bebas Neue': 'Bebas Neue (judul tegak)',
  Poppins: 'Poppins',
  'Playfair Display': 'Playfair Display (serif)',
  Caveat: 'Caveat (tulisan tangan)'
};

function tokens(text) {
  const out = [];
  let accent = false;
  for (const line of String(text).split('\n')) {
    const words = [];
    for (const raw of line.match(/\[[^\]]+\]|\{logo\}|\S+/g) || []) {
      if (raw === '{logo}') {
        words.push({ text: '', kind: 'logo' });
        continue;
      }
      if (raw.startsWith('[') && raw.endsWith(']')) {
        words.push({ text: raw.slice(1, -1), kind: 'pill', accent });
        continue;
      }
      let w = raw;
      let a = accent;
      if (w.startsWith('*')) { a = true; accent = true; w = w.slice(1); }
      if (w.endsWith('*')) { accent = false; w = w.slice(0, -1); }
      if (w) words.push({ text: w, accent: a, kind: 'word' });
    }
    out.push(words);
  }
  return out;
}

// font kata aksen bisa berbeda (mis. serif miring) dari font utama
function fontFor(p, accent) {
  const fam = accent && p.accentFont ? p.accentFont : p.font;
  const italic = accent && p.accentItalic ? 'italic ' : '';
  const w = accent && p.accentFont ? 400 : p.weight;
  return `${italic}${w} ${p.size}px "${fam}"`;
}

function tokenWidth(ctx, tk, p) {
  if (tk.kind === 'logo') return p.size * 0.82;
  ctx.font = fontFor(p, tk.accent && tk.kind === 'word');
  const tw = ctx.measureText(tk.text).width;
  return tk.kind === 'pill' ? tw + p.size * 0.64 : tw;
}

function layout(ctx, p) {
  ctx.font = `${p.weight} ${p.size}px "${p.font}"`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${p.letterSpacing}px`;
  const space = ctx.measureText(' ').width;
  const fixedFont = ctx.font;
  const lines = [];
  for (const para of tokens(p.text)) {
    let line = [];
    let w = 0;
    for (const tk of para) {
      const tw = tokenWidth(ctx, tk, p);
      ctx.font = fixedFont;
      if (line.length && w + space + tw > p.boxWidth) {
        lines.push({ words: line, w });
        line = [];
        w = 0;
      }
      line.push({ ...tk, x: line.length ? w + space : 0, w: tw });
      w += (line.length > 1 ? space : 0) + tw;
    }
    lines.push({ words: line, w });
  }
  const lh = p.size * p.lineHeight;
  return { lines, lh, w: Math.max(1, ...lines.map((l) => l.w)), h: lines.length * lh };
}

// baris teks setelah dibungkus, tanpa tanda *aksen* (untuk ekspor After Effects).
// ranges = rentang huruf kata aksen di teks gabungan (baris dipisah satu karakter \r).
export function wrappedText(ctx, p) {
  const L = layout(ctx, p);
  let text = '';
  const ranges = [];
  L.lines.forEach((line, i) => {
    if (i) text += '\r';
    line.words.forEach((w, j) => {
      if (j) text += ' ';
      if (w.accent && w.kind === 'word') ranges.push([text.length, text.length + w.text.length]);
      text += w.text;
    });
  });
  return { text, ranges };
}

export default {
  type: 'text',
  name: 'Teks',
  icon: 'T',
  category: 'Dasar',
  order: 2,
  defaults: {
    text: 'Teks *baru*', font: 'Baloo 2', weight: 800, size: 110, color: '#f3ede2', accent: '#ec9a45',
    align: 'center', boxWidth: 1400, lineHeight: 1.05, letterSpacing: 0, stroke: 0, strokeColor: '#0a0a0c',
    accentFont: '', accentItalic: false,
    pill: false, pillColor: '#08080a', pillPad: 24,
    chipStroke: '#ffffff', chipFill: '#ffffff1a', logoBox: '#ffffff', logoTri: '#0b1838'
  },
  schema: [
    { key: 'text', label: 'Isi (pakai *bintang* untuk warna aksen)', kind: 'textarea' },
    { key: 'font', label: 'Font', kind: 'select', options: FONTS },
    { key: 'weight', label: 'Tebal', kind: 'select', options: { 300: 'Tipis', 400: 'Biasa', 500: 'Sedang', 600: 'Semi tebal', 700: 'Tebal', 800: 'Ekstra tebal' } },
    { key: 'size', label: 'Ukuran', kind: 'number', min: 8, step: 1, animatable: true },
    { key: 'color', label: 'Warna', kind: 'color', animatable: true },
    { key: 'accent', label: 'Warna aksen', kind: 'color', animatable: true },
    { key: 'accentFont', label: 'Font kata aksen', kind: 'select', options: { '': 'Sama dengan font utama', ...FONTS } },
    { key: 'accentItalic', label: 'Kata aksen miring', kind: 'checkbox' },
    { key: 'align', label: 'Rata', kind: 'select', options: { left: 'Kiri', center: 'Tengah', right: 'Kanan' } },
    { key: 'boxWidth', label: 'Lebar kotak teks', kind: 'number', min: 50, step: 10, animatable: true },
    { key: 'lineHeight', label: 'Jarak baris', kind: 'number', min: 0.6, max: 3, step: 0.05 },
    { key: 'letterSpacing', label: 'Jarak huruf', kind: 'number', step: 0.5, animatable: true },
    { key: 'stroke', label: 'Garis tepi', kind: 'number', min: 0, step: 1, animatable: true },
    { key: 'strokeColor', label: 'Warna garis tepi', kind: 'color' },
    { key: 'pill', label: 'Kotak latar (seperti subtitle)', kind: 'checkbox' },
    { key: 'pillColor', label: 'Warna kotak', kind: 'color' },
    { key: 'pillPad', label: 'Jarak dalam kotak', kind: 'number', min: 0, step: 1 },
    { key: 'chipStroke', label: 'Garis [pil kata]', kind: 'color' },
    { key: 'chipFill', label: 'Isi [pil kata]', kind: 'text' },
    { key: 'logoBox', label: 'Kotak {logo}', kind: 'color' },
    { key: 'logoTri', label: 'Segitiga {logo}', kind: 'color' }
  ],
  size(p, env) {
    const L = layout(env.ctx, p);
    return { w: (p.align === 'center' ? L.w : p.boxWidth) + (p.pill ? p.pillPad * 2 : 0), h: L.h + (p.pill ? p.pillPad * 2 : 0) };
  },
  draw(ctx, p, env) {
    const L = layout(ctx, p);
    const reveal = env.reveal;
    const total = L.lines.reduce((n, l) => n + l.words.reduce((m, w) => m + w.text.length + 1, 0), 0);
    const nWords = L.lines.reduce((n, l) => n + l.words.length, 0);
    const lineX = (l) => (p.align === 'left' ? -p.boxWidth / 2 : p.align === 'right' ? p.boxWidth / 2 - l.w : -l.w / 2);

    if (p.pill) {
      const shadow = ctx.shadowBlur;
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.pillColor;
      const w = (p.align === 'center' ? L.w : p.boxWidth) + p.pillPad * 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -L.h / 2 - p.pillPad, w, L.h + p.pillPad * 2, Math.min(28, p.pillPad + 8));
      ctx.fill();
      ctx.shadowBlur = shadow;
    }

    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    let y = -L.h / 2 + L.lh / 2;
    let chars = 0;
    let wi = 0;
    for (const line of L.lines) {
      const x0 = lineX(line);
      for (const w of line.words) {
        let text = w.text;
        let alpha = 1;
        let dy = 0;
        let visible = true;
        let scatter = null;
        let clipLine = false;
        if (reveal?.mode === 'chars') {
          const shown = Math.floor(reveal.k * total) - chars;
          if (w.kind === 'word') text = shown <= 0 ? '' : w.text.slice(0, shown);
          else visible = shown > 0;
        } else if (reveal?.mode === 'scatter') {
          // kata datang dari posisi acak (seed tetap per kata), berputar, lalu tersusun
          const k = Math.min(1, Math.max(0, reveal.k * 1.6 - (wi / Math.max(1, nWords)) * 0.6));
          const e = 1 - Math.pow(1 - k, 3);
          const r1 = Math.sin(wi * 12.9898 + 4.1) * 43758.5453;
          const r2 = Math.sin(wi * 78.233 + 1.7) * 43758.5453;
          const fx = (r1 - Math.floor(r1)) * 2 - 1;
          const fy = (r2 - Math.floor(r2)) * 2 - 1;
          scatter = { dx: fx * p.size * 2.4 * (1 - e), dy: fy * p.size * 1.3 * (1 - e), rot: fx * fy * 0.35 * (1 - e) };
          alpha = Math.min(1, k * 1.6);
        } else if (reveal?.mode === 'rise') {
          // tiap kata menyusul ±0,16 bagian setelah kata sebelumnya, naik dari bawah garis baris
          const gap = 0.16;
          const x = Math.min(1, Math.max(0, reveal.k * (1 + gap * (nWords - 1)) - wi * gap));
          const e = 1 - Math.pow(1 - x, 4);
          dy = (1 - e) * L.lh * 0.95;
          alpha = Math.min(1, x * 3);
          clipLine = true;
        } else if (reveal?.mode === 'words') {
          const k = Math.min(1, Math.max(0, reveal.k * (nWords + 2) - wi * 1.0));
          alpha = k;
          dy = (1 - k) * p.size * 0.35;
        }
        chars += w.text.length + 1;
        wi++;
        if (!visible || alpha <= 0 || (w.kind === 'word' && !text)) continue;
        ctx.save();
        if (clipLine) {
          ctx.beginPath();
          ctx.rect(-1e5, y - L.lh * 0.62, 2e5, L.lh * 1.24);
          ctx.clip();
        }
        ctx.globalAlpha *= alpha;
        ctx.textAlign = 'left';
        ctx.font = fontFor(p, w.accent && w.kind === 'word');
        if (scatter) {
          const cx = x0 + w.x + w.w / 2;
          ctx.translate(cx + scatter.dx, y + scatter.dy);
          ctx.rotate(scatter.rot);
          ctx.translate(-cx, -y);
        }
        if (w.kind === 'logo') {
          drawMark(ctx, x0 + w.x + w.w / 2, y + dy, p.size * 0.74, p.logoBox, p.logoTri);
          ctx.restore();
          continue;
        }
        if (w.kind === 'pill') {
          const ph = p.size * 1.12;
          const shadow = ctx.shadowBlur;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.roundRect(x0 + w.x, y + dy - ph / 2, w.w, ph, ph / 2);
          ctx.fillStyle = p.chipFill;
          ctx.fill();
          ctx.lineWidth = Math.max(1.5, p.size * 0.035);
          ctx.strokeStyle = p.chipStroke;
          ctx.stroke();
          ctx.shadowBlur = shadow;
          ctx.fillStyle = w.accent ? p.accent : p.color;
          ctx.fillText(text, x0 + w.x + p.size * 0.32, y + dy);
          ctx.restore();
          continue;
        }
        if (p.stroke > 0) {
          ctx.lineWidth = p.stroke;
          ctx.strokeStyle = p.strokeColor;
          ctx.strokeText(text, x0 + w.x, y + dy);
        }
        ctx.fillStyle = w.accent ? p.accent : p.color;
        ctx.fillText(text, x0 + w.x, y + dy);
        ctx.restore();
      }
      y += L.lh;
    }
  }
};
