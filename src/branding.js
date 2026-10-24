// Foto profil (800×800) & banner channel (2560×1440) dirender dari adegan 3D yang sama.
import { resolvePose } from './poses.js';
import { OUT_W, OUT_H } from './overlay.js';

const CREAM = '#f6f0e6';
const AMBER = '#f0973f';

// render adegan 3D pada ukuran tertentu lalu kembalikan renderer ke 1920×1080
function renderView({ renderer, scene, camera }, w, h, cam) {
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = cam.fov;
  camera.position.set(...cam.pos);
  camera.updateProjectionMatrix();
  camera.lookAt(...cam.tgt);
  renderer.render(scene, camera);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(renderer.domElement, 0, 0, w, h);
  renderer.setSize(OUT_W, OUT_H, false);
  camera.aspect = OUT_W / OUT_H;
  camera.updateProjectionMatrix();
  return c;
}

function setScene({ hero, world }, { pose, expr, mood, magic = 0, t = 2.2 }) {
  hero.setPose(resolvePose(pose));
  hero.update(t, { talking: false });
  hero.updateFace(t, { expr, talking: false });
  world.applyMood(mood, mood, 1);
  world.update(t, { magicK: magic, throneK: 0 });
  world.props.show('', 0, t);
}

function logoMark(ctx, x, y, s) {
  ctx.fillStyle = '#d9822b';
  ctx.beginPath();
  ctx.roundRect(x, y, 62 * s, 50 * s, 13 * s);
  ctx.fill();
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.moveTo(x + 24 * s, y + 13 * s);
  ctx.lineTo(x + 43 * s, y + 25 * s);
  ctx.lineTo(x + 24 * s, y + 37 * s);
  ctx.closePath();
  ctx.fill();
}

const toJpeg = (canvas, q = 0.92) => new Promise((r) => canvas.toBlob(r, 'image/jpeg', q));

export async function renderProfile(ctx3d) {
  setScene(ctx3d, { pose: 'idle', expr: 'normal', mood: 'hook' });
  const S = 800;
  const shot = renderView(ctx3d, S, S, { pos: [0.25, 1.92, 3.15], tgt: [0, 1.86, 0], fov: 32 });
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.drawImage(shot, 0, 0);
  // vinyet melingkar mengikuti potongan lingkaran YouTube
  const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#d9822b';
  g.lineWidth = 14;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 22, 0, Math.PI * 2);
  g.stroke();
  return { canvas: c, blob: await toJpeg(c) };
}

export async function renderBanner(ctx3d) {
  setScene(ctx3d, { pose: 'control', expr: 'normal', mood: 'hook', magic: 0, t: 3.1 });
  const W = 2560;
  const H = 1440;
  // area aman semua perangkat: 1546×423 di tengah (x 507–2053, y 508–931)
  const shot = renderView(ctx3d, W, H, { pos: [-1.2, 1.85, 8.3], tgt: [-1.62, 1.88, 0], fov: 34 });
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(shot, 0, 0);

  const lg = g.createLinearGradient(400, 0, 1700, 0);
  lg.addColorStop(0, 'rgba(4,4,6,0.8)');
  lg.addColorStop(0.7, 'rgba(4,4,6,0.35)');
  lg.addColorStop(1, 'rgba(4,4,6,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);

  const x = 580;
  logoMark(g, x, 578, 1.85);
  g.fillStyle = CREAM;
  g.font = '800 132px "Baloo 2"';
  g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 24;
  g.fillText('Mode Ustadz', x + 140, 672);
  g.font = '600 42px "Plus Jakarta Sans"';
  g.fillStyle = '#d8d0c2';
  g.fillText('Dakwah · Motivasi · Self Improvement', x + 6, 770);
  g.font = '800 68px "Baloo 2"';
  g.fillStyle = AMBER;
  g.fillText('Pahit, tapi fakta.', x + 4, 872);
  g.shadowColor = 'transparent';
  return { canvas: c, blob: await toJpeg(c, 0.9) };
}
