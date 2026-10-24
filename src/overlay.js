// Menggabungkan render 3D + teks kinetik ke satu canvas 1920×1080 (yang juga direkam/diekspor).
export const OUT_W = 1920;
export const OUT_H = 1080;

const CREAM = '#f3ede2';
const AMBER = '#ec9a45';

function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 256);
  let s = 12345;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const v = (s / 2147483647) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

function layoutWords(ctx, text, maxW) {
  const words = text.split(' ').filter(Boolean);
  const lines = [];
  let line = [];
  let w = 0;
  const space = ctx.measureText(' ').width;
  for (const word of words) {
    const ww = ctx.measureText(word).width;
    if (line.length && w + space + ww > maxW) {
      lines.push(line);
      line = [];
      w = 0;
    }
    line.push({ word, x: line.length ? w + space : 0, w: ww });
    w += (line.length > 1 ? space : 0) + ww;
  }
  if (line.length) lines.push(line);
  return lines;
}

function wrapText(ctx, text, maxW) {
  return layoutWords(ctx, text, maxW).map((l) => l.map((w) => w.word).join(' '));
}

export function createOverlay(canvas) {
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  const grain = makeGrain();
  let grainPattern = null;

  function brand(x, y, scale = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#d9822b';
    ctx.beginPath();
    ctx.roundRect(0, 0, 50, 40, 11);
    ctx.fill();
    ctx.fillStyle = '#fff8ee';
    ctx.beginPath();
    ctx.moveTo(19, 11);
    ctx.lineTo(34, 20);
    ctx.lineTo(19, 29);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = '800 36px "Baloo 2"';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mode Ustadz', 64, 22);
    ctx.restore();
  }

  function draw(glCanvas, st, { subtitles = true } = {}) {
    const { s, local } = st;
    ctx.drawImage(glCanvas, 0, 0, OUT_W, OUT_H);

    // area teks kiri lebih gelap supaya terbaca
    const lg = ctx.createLinearGradient(0, 0, 1150, 0);
    lg.addColorStop(0, 'rgba(4,4,6,0.72)');
    lg.addColorStop(0.55, 'rgba(4,4,6,0.35)');
    lg.addColorStop(1, 'rgba(4,4,6,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const vg = ctx.createRadialGradient(OUT_W / 2, OUT_H / 2, OUT_H * 0.45, OUT_W / 2, OUT_H / 2, OUT_H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    const exit = Math.min(1, (st.dur - local) / 0.3);

    if (s.end) {
      const k = easeOut(local / 0.8);
      ctx.fillStyle = `rgba(6,6,8,${0.55 * k})`;
      ctx.fillRect(0, 0, OUT_W, OUT_H);
      ctx.save();
      ctx.globalAlpha = k;
      brand(150, 400 - (1 - k) * 30, 2.4, 1);
      ctx.fillStyle = '#c9c1b3';
      ctx.font = '600 38px "Plus Jakarta Sans"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(s.b, 160, 600);
      ctx.restore();
    } else {
      if (!s.title) brand(96, 70, 0.9, 0.92);
      drawBig(st, exit);
    }

    if (subtitles && s.sub) drawSub(s.sub, local, exit);

    // grain halus
    if (!grainPattern) grainPattern = ctx.createPattern(grain, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.globalCompositeOperation = 'overlay';
    const off = Math.floor(st.t * 30) * 37;
    ctx.translate(off % 256, (off * 3) % 256);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(-256, -256, OUT_W + 512, OUT_H + 512);
    ctx.restore();
  }

  function drawBig(st, exit) {
    const { s, local, kicker } = st;
    const left = 120;
    const maxW = 900;
    let size = s.title ? 124 : 104;
    ctx.font = `800 ${size}px "Baloo 2"`;
    let la = s.a ? layoutWords(ctx, s.a, maxW) : [];
    let lb = s.b ? layoutWords(ctx, s.b, maxW) : [];
    if (la.length + lb.length > 4) {
      size = 84;
      ctx.font = `800 ${size}px "Baloo 2"`;
      la = s.a ? layoutWords(ctx, s.a, maxW) : [];
      lb = s.b ? layoutWords(ctx, s.b, maxW) : [];
    }
    const lh = size * 1.02;
    const blockH = (la.length + lb.length) * lh;
    let y = 560 - blockH / 2 + size * 0.8;

    if (kicker) {
      const k = easeOut(local / 0.4) * exit;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = '#d9822b';
      ctx.font = '700 28px "Plus Jakarta Sans"';
      ctx.letterSpacing = '6px';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(kicker, left + 4, y - size - 18);
      ctx.fillRect(left + 4, y - size - 6, 56 * k, 4);
      ctx.restore();
    }

    let n = 0;
    const drawLines = (lines, color, delay) => {
      for (const line of lines) {
        for (const w of line) {
          const appear = delay + n * 0.075;
          const k = easeOut((local - appear) / 0.38);
          n++;
          if (k <= 0) continue;
          ctx.save();
          ctx.globalAlpha = k * exit;
          ctx.font = `800 ${size}px "Baloo 2"`;
          ctx.textBaseline = 'alphabetic';
          ctx.shadowColor = 'rgba(0,0,0,0.65)';
          ctx.shadowBlur = 28;
          ctx.shadowOffsetY = 6;
          ctx.fillStyle = color;
          const dy = (1 - k) * 46;
          const sc = 0.92 + 0.08 * k;
          ctx.translate(left + w.x, y + dy);
          ctx.scale(sc, sc);
          ctx.fillText(w.word, 0, 0);
          ctx.restore();
        }
        y += lh;
      }
    };
    drawLines(la, CREAM, 0.1);
    drawLines(lb, AMBER, 0.28);
  }

  function drawSub(text, local, exit) {
    ctx.save();
    ctx.font = '600 36px "Plus Jakarta Sans"';
    const lines = wrapText(ctx, text, 1460);
    const lh = 48;
    const padX = 30;
    const padY = 16;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
    const h = lines.length * lh + padY * 2;
    const x = (OUT_W - w) / 2;
    const y = OUT_H - 64 - h;
    ctx.globalAlpha = easeOut(local / 0.3) * exit;
    ctx.fillStyle = 'rgba(8,8,10,0.74)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, OUT_W / 2, y + padY + i * lh + 4));
    ctx.restore();
  }

  return { draw, ctx };
}
