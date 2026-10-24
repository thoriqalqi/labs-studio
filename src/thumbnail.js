// Thumbnail YouTube dirender dari adegan 3D yang sama dengan video.
// Pengaturan teks & pose ada di episode (`thumbnail`).
import { resolvePose } from './poses.js';
import { OUT_W, OUT_H } from './overlay.js';

const CREAM = '#f6f0e6';
const AMBER = '#f0973f';

export function renderThumbnail({ renderer, scene, camera, hero, world, stage, episode }) {
  const th = episode.thumbnail;
  const t = 2.2; // waktu tetap supaya hasilnya selalu sama

  hero.setPose(resolvePose(th.pose));
  hero.update(t, { talking: false });
  hero.updateFace(t, { expr: th.expr, talking: false });
  world.applyMood(th.mood, th.mood, 1);
  world.update(t, { magicK: 0, throneK: 0 });
  // properti melayang di antara teks dan wajah
  const pg = world.props.group;
  const keep = { pos: pg.position.clone(), scale: pg.scale.x };
  pg.position.set(-0.68, 1.98, 1.05);
  pg.scale.setScalar(0.55);
  world.props.show(th.prop, 1, t);

  camera.position.set(-0.45, 1.55, 3.45);
  camera.fov = 36;
  camera.updateProjectionMatrix();
  camera.lookAt(-1.0, 1.66, 0);
  renderer.render(scene, camera);
  pg.position.copy(keep.pos);
  pg.scale.setScalar(keep.scale);

  const ctx = stage.getContext('2d');
  ctx.save();
  ctx.drawImage(renderer.domElement, 0, 0, OUT_W, OUT_H);

  const lg = ctx.createLinearGradient(0, 0, 1250, 0);
  lg.addColorStop(0, 'rgba(4,4,6,0.85)');
  lg.addColorStop(0.6, 'rgba(4,4,6,0.45)');
  lg.addColorStop(1, 'rgba(4,4,6,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  const vg = ctx.createRadialGradient(OUT_W * 0.6, OUT_H / 2, OUT_H * 0.4, OUT_W / 2, OUT_H / 2, OUT_H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // logo
  ctx.fillStyle = '#d9822b';
  ctx.beginPath();
  ctx.roundRect(90, 70, 62, 50, 13);
  ctx.fill();
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.moveTo(114, 83);
  ctx.lineTo(133, 95);
  ctx.lineTo(114, 107);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.font = '800 44px "Baloo 2"';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mode Ustadz', 170, 98);

  // judul besar, ukuran menyesuaikan lebar
  const maxW = 1020;
  let size = 190;
  ctx.font = `800 ${size}px "Baloo 2"`;
  const widest = Math.max(...th.lines.map((l) => ctx.measureText(l).width));
  size = Math.floor(Math.min(size, (size * maxW) / widest));
  ctx.font = `800 ${size}px "Baloo 2"`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const lh = size * 0.92;
  let y = OUT_H / 2 - (th.lines.length * lh) / 2 + size * 0.78 + 40;

  if (th.chip) {
    ctx.save();
    ctx.font = '700 46px "Plus Jakarta Sans"';
    const w = ctx.measureText(th.chip).width + 56;
    ctx.translate(96, y - size - 70);
    ctx.rotate(-0.04);
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.roundRect(0, -54, w, 78, [24, 24, 24, 6]);
    ctx.fill();
    ctx.fillStyle = '#141416';
    ctx.textBaseline = 'middle';
    ctx.fillText(th.chip, 28, -14);
    ctx.restore();
  }

  th.lines.forEach((line, i) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.lineWidth = size * 0.09;
    ctx.strokeStyle = '#0a0a0c';
    ctx.strokeText(line, 90, y);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = i >= th.accentFrom ? AMBER : CREAM;
    ctx.fillText(line, 90, y);
    ctx.restore();
    y += lh;
  });
  ctx.restore();

  // versi 1280×720 JPEG untuk diunggah ke YouTube (batas 2 MB)
  const small = document.createElement('canvas');
  small.width = 1280;
  small.height = 720;
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(stage, 0, 0, 1280, 720);
  return new Promise((resolve) => small.toBlob(resolve, 'image/jpeg', 0.92));
}
