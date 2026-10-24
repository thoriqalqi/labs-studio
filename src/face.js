// Wajah digambar di canvas lalu dipasang sebagai tekstur di kepala (bola).
// Tekstur memakai pemetaan equirectangular: tengah wajah ada di u = 0.25, garis
// khatulistiwa di tengah tinggi canvas. 1 derajat = W/360 px ke dua arah.
import * as THREE from 'three';

const W = 1024;
const H = 512;
const D = W / 360;
const CX = W * 0.25;
const CY = H / 2;
const SKIN = '#f4c4a0';

export const EXPRESSIONS = {
  normal:  { brow: [0.14, 0.14], browY: 0,   lid: [0.14, 0.14], mouth: 'smile', iris: 1,    blush: 0.35 },
  senyum:  { brow: [-0.12, -0.12], browY: -5, lid: [0.2, 0.2],  mouth: 'grin',  iris: 1,    blush: 0.6 },
  serius:  { brow: [0.34, 0.34], browY: 6,   lid: [0.32, 0.32], mouth: 'flat',  iris: 1,    blush: 0.15 },
  marah:   { brow: [0.58, 0.58], browY: 10,  lid: [0.26, 0.26], mouth: 'shout', iris: 0.78, blush: 0.6 },
  sinis:   { brow: [0.4, -0.16], browY: 4,   lid: [0.44, 0.24], mouth: 'smirk', iris: 1,    blush: 0.2 },
  tertawa: { brow: [-0.22, -0.22], browY: -8, lid: [0, 0], closed: true, mouth: 'laugh', iris: 1, blush: 0.7 },
  sedih:   { brow: [-0.42, -0.42], browY: 0, lid: [0.3, 0.3],   mouth: 'frown', iris: 1,    blush: 0.3, wet: true },
  kaget:   { brow: [-0.16, -0.16], browY: -12, lid: [0, 0],     mouth: 'o',     iris: 0.74, blush: 0.2 }
};

export function createFace() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  let lastKey = '';

  function draw({ expr = 'normal', mouth = 0, blink = 0, lookX = 0, lookY = 0 }) {
    const e = EXPRESSIONS[expr] || EXPRESSIONS.normal;
    const m = Math.round(mouth * 4) / 4;
    const b = blink > 0.85 ? 1 : blink > 0.4 ? 0.6 : 0;
    const key = [expr, m, b, lookX.toFixed(1), lookY.toFixed(1)].join('|');
    if (key === lastKey) return;
    lastKey = key;

    ctx.fillStyle = SKIN;
    ctx.fillRect(0, 0, W, H);

    // pipi merah
    for (const s of [-1, 1]) {
      const bx = CX + s * 32 * D;
      const by = CY + 16 * D;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 34);
      g.addColorStop(0, `rgba(255,110,100,${e.blush * 0.75})`);
      g.addColorStop(1, 'rgba(255,110,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(bx, by, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const eyeY = CY + 5 * D;
    const look = { x: lookX, y: lookY };
    [-1, 1].forEach((s, i) => {
      const ex = CX + s * 21 * D;
      const lid = Math.max(e.lid[i], b);
      if (e.closed) drawHappyEye(ex, eyeY);
      else if (lid > 0.9) drawClosedEye(ex, eyeY);
      else drawEye(ex, eyeY, lid, s, e, look);
      drawBrow(ex, eyeY - 15 * D + e.browY, e.brow[i], s);
    });

    // hidung
    ctx.fillStyle = 'rgba(170,90,50,0.45)';
    ctx.beginPath();
    ctx.ellipse(CX, CY + 15 * D, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    drawMouth(CX, CY + 24 * D, e.mouth, m);
    texture.needsUpdate = true;
  }

  function drawEye(cx, cy, lid, side, e, look) {
    const rx = 9.5 * D;
    const ry = 12 * D;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#fbf7f2';
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

    const ix = cx + look.x * 6;
    const iy = cy + 3 + look.y * 4;
    const irx = rx * 0.86 * e.iris;
    const iry = ry * 0.9 * e.iris;
    const g = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
    g.addColorStop(0, '#1b0f08');
    g.addColorStop(0.55, '#4a2814');
    g.addColorStop(1, '#a36a3c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120804';
    ctx.beginPath();
    ctx.ellipse(ix, iy + 2, irx * 0.45, iry * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ix - irx * 0.35, iy - iry * 0.42, 8, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ix + irx * 0.38, iy + iry * 0.38, 4, 0, Math.PI * 2);
    ctx.fill();
    if (e.wet) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ix, iy + iry * 0.6, irx * 0.6, 5, 0, 0, Math.PI);
      ctx.stroke();
    }

    const top = cy - ry;
    const lidY = top + ry * 2 * lid;
    if (lid > 0) {
      ctx.fillStyle = SKIN;
      ctx.fillRect(cx - rx - 2, top - 2, rx * 2 + 4, lidY - top + 2);
    }
    ctx.restore();

    // garis bulu mata atas
    ctx.strokeStyle = '#140c08';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath();
    if (lid < 0.12) {
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI + 0.25, Math.PI * 2 - 0.25);
    } else {
      const k = (lidY - cy) / ry;
      const hw = rx * Math.sqrt(Math.max(0, 1 - k * k));
      ctx.moveTo(cx - hw - 3, lidY + 2);
      ctx.quadraticCurveTo(cx, lidY - 4, cx + hw + 3, lidY + 1);
    }
    ctx.stroke();
    // sudut luar
    const ox = cx + side * rx * 0.95;
    const oy = lid < 0.12 ? cy - ry * 0.35 : lidY + 1;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ox - side * 4, oy);
    ctx.lineTo(ox + side * 7, oy - 6);
    ctx.stroke();
    // garis bawah tipis
    ctx.strokeStyle = 'rgba(80,40,25,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.8, ry, 0, 0.35, Math.PI - 0.35);
    ctx.stroke();
  }

  function drawClosedEye(cx, cy) {
    const rx = 9.5 * D;
    ctx.strokeStyle = '#140c08';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy + 4);
    ctx.quadraticCurveTo(cx, cy + 16, cx + rx, cy + 4);
    ctx.stroke();
  }

  function drawHappyEye(cx, cy) {
    const rx = 9.5 * D;
    ctx.strokeStyle = '#140c08';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy + 10);
    ctx.quadraticCurveTo(cx, cy - 22, cx + rx, cy + 10);
    ctx.stroke();
  }

  function drawBrow(cx, cy, angle, side) {
    const half = 27;
    const innerX = cx - side * half;
    const outerX = cx + side * half;
    ctx.strokeStyle = '#16100c';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(innerX, cy + angle * 30);
    ctx.quadraticCurveTo(cx, cy - 6 + angle * 8, outerX, cy - angle * 10);
    ctx.stroke();
  }

  function drawMouth(cx, y, shape, m) {
    const dark = '#5a1c18';
    const line = '#6a2a1c';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (m > 0.2 && shape !== 'laugh' && shape !== 'shout') {
      // mulut bicara
      const w = 26 + 8 * m;
      const h = 6 + 22 * m;
      const tilt = shape === 'smirk' ? -0.15 : 0;
      ctx.save();
      ctx.translate(cx + (shape === 'smirk' ? 6 : 0), y + 4);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.quadraticCurveTo(0, -h * 0.25, w / 2, 0);
      ctx.quadraticCurveTo(0, h * 1.25, -w / 2, 0);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#e07a6a';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.85, w * 0.32, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (m > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-w / 2, -h, w, h * 0.95 - 3);
      }
      ctx.restore();
      return;
    }
    switch (shape) {
      case 'smile':
        ctx.strokeStyle = line;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx - 20, y);
        ctx.quadraticCurveTo(cx, y + 14, cx + 20, y);
        ctx.stroke();
        break;
      case 'grin':
      case 'laugh': {
        const w = shape === 'laugh' ? 36 : 27;
        const d = shape === 'laugh' ? 44 : 28;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - w, y - 3);
        ctx.quadraticCurveTo(cx, y + 2, cx + w, y - 3);
        ctx.quadraticCurveTo(cx, y + d, cx - w, y - 3);
        ctx.fillStyle = dark;
        ctx.fill();
        ctx.clip();
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - w, y - 6, w * 2, 9);
        ctx.fillStyle = '#e07a6a';
        ctx.beginPath();
        ctx.ellipse(cx, y + d * 0.62, w * 0.55, d * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'flat':
        ctx.strokeStyle = line;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx - 16, y + 5);
        ctx.lineTo(cx + 16, y + 5);
        ctx.stroke();
        break;
      case 'smirk':
        ctx.strokeStyle = line;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx - 16, y + 5);
        ctx.quadraticCurveTo(cx + 8, y + 11, cx + 24, y - 6);
        ctx.stroke();
        break;
      case 'shout': {
        const open = 0.6 + m * 0.4;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 24, y + 18 * open);
        ctx.quadraticCurveTo(cx, y - 16 * open, cx + 24, y + 18 * open);
        ctx.closePath();
        ctx.fillStyle = dark;
        ctx.fill();
        ctx.clip();
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 24, y - 16, 48, 12);
        ctx.restore();
        break;
      }
      case 'frown':
        ctx.strokeStyle = line;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx - 15, y + 9);
        ctx.quadraticCurveTo(cx, y - 2, cx + 15, y + 9);
        ctx.stroke();
        break;
      case 'o':
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(cx, y + 6, 10, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  draw({});
  return { texture, draw };
}
