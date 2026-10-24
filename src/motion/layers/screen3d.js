// Layar aplikasi dalam ruang 3D (perspektif sungguhan lewat Three.js): miringkan dengan
// Rotasi X/Y/Z, dekatkan dengan Zoom. Isinya tiruan tampilan Motion Studio (lihat mockups.js).
import * as THREE from 'three';
import { drawMockup, MOCKUP_LABELS } from '../mockups.js';
import { drawCover } from './landscape.js';

const CW = 1600;
const CH = 1000;
const PAD = 90; // ruang untuk pendar di sekeliling layar
let eng = null;

function engine() {
  if (eng) return eng;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 50);
  const canvas = document.createElement('canvas');
  canvas.width = CW + PAD * 2;
  canvas.height = CH + PAD * 2;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(canvas.width / 1000, canvas.height / 1000),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  scene.add(mesh);
  eng = { renderer, scene, camera, canvas, texture, mesh, w: 0, h: 0 };
  return eng;
}

export default {
  type: 'screen3d',
  name: 'Layar aplikasi 3D',
  icon: '▭',
  category: 'Demo UI',
  order: 33,
  defaults: { url: '', content: 'editor', brand: 'Motion Studio', w: 1920, h: 1080, rotX: 0, rotY: 0, rotZ: 0, zoom: 1, glow: '#3d7bff', glowSize: 70, timeOffset: 0 },
  schema: [
    { key: 'url', label: 'Gambar isi layar (screenshot sendiri)', kind: 'asset', accept: 'image/*' },
    { key: 'content', label: 'Isi layar (bila tanpa gambar)', kind: 'select', options: MOCKUP_LABELS },
    { key: 'brand', label: 'Nama aplikasi di layar', kind: 'text' },
    { key: 'rotX', label: 'Miring depan/belakang °', kind: 'number', step: 1, animatable: true },
    { key: 'rotY', label: 'Miring kiri/kanan °', kind: 'number', step: 1, animatable: true },
    { key: 'rotZ', label: 'Putar °', kind: 'number', step: 1, animatable: true },
    { key: 'zoom', label: 'Zoom', kind: 'number', min: 0.1, max: 6, step: 0.01, animatable: true },
    { key: 'glow', label: 'Warna pendar', kind: 'color' },
    { key: 'glowSize', label: 'Besar pendar', kind: 'number', min: 0, max: 90, step: 1 },
    { key: 'timeOffset', label: 'Geser waktu isi (dtk)', kind: 'number', step: 0.1 },
    { key: 'w', label: 'Lebar area', kind: 'number', min: 64, step: 2 },
    { key: 'h', label: 'Tinggi area', kind: 'number', min: 64, step: 2 }
  ],
  size: (p) => ({ w: p.w, h: p.h }),
  draw(ctx, p, env) {
    const e = engine();
    const w = Math.max(64, Math.round(p.w));
    const h = Math.max(64, Math.round(p.h));
    if (e.w !== w || e.h !== h) {
      e.renderer.setSize(w, h, false);
      e.w = w;
      e.h = h;
    }
    // isi layar + pendar
    const g = e.canvas.getContext('2d');
    g.clearRect(0, 0, e.canvas.width, e.canvas.height);
    // pendar (shadowBlur besar) mahal → digambar sekali lalu dipakai ulang selama warna/besarnya sama
    const glowKey = `${p.glow}|${p.glowSize}`;
    if (e.glowKey !== glowKey) {
      e.glow = e.glow || document.createElement('canvas');
      e.glow.width = e.canvas.width;
      e.glow.height = e.canvas.height;
      const gg = e.glow.getContext('2d');
      gg.shadowColor = p.glow;
      gg.shadowBlur = p.glowSize;
      gg.fillStyle = '#0a1330';
      gg.beginPath();
      gg.roundRect(PAD, PAD, CW, CH, 30);
      gg.fill();
      e.glowKey = glowKey;
    }
    g.drawImage(e.glow, 0, 0);
    g.save();
    g.beginPath();
    g.roundRect(PAD, PAD, CW, CH, 30);
    g.clip();
    g.translate(PAD, PAD);
    const shot = p.url ? env.assets.image(p.url) : null;
    if (shot) {
      g.translate(CW / 2, CH / 2);
      drawCover(g, shot, CW, CH);
    } else drawMockup(g, p.content, CW, CH, env.contentT + (p.timeOffset || 0), { brand: p.brand });
    g.restore();
    g.strokeStyle = 'rgba(160,200,255,0.25)';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(PAD, PAD, CW, CH, 30);
    g.stroke();
    const d2r = Math.PI / 180;
    // tanpa miring depan/belakang/samping tidak perlu WebGL (yang lambat: ±50 ms/frame) —
    // gambar langsung dengan ukuran yang sama persis seperti hasil kamera 3D
    if (Math.abs(p.rotX) < 0.05 && Math.abs(p.rotY) < 0.05) {
      const unit = h / (2 * 3.4 * Math.tan(15 * d2r)); // piksel per satuan dunia di bidang z = 0
      const k = (p.zoom * unit) / 1000;
      ctx.save();
      ctx.rotate(p.rotZ * d2r);
      ctx.drawImage(e.canvas, (-e.canvas.width * k) / 2, (-e.canvas.height * k) / 2, e.canvas.width * k, e.canvas.height * k);
      ctx.restore();
      return;
    }
    e.texture.needsUpdate = true;

    e.mesh.rotation.set(p.rotX * d2r, p.rotY * d2r, p.rotZ * d2r);
    e.mesh.scale.setScalar(p.zoom);
    e.camera.aspect = w / h;
    e.camera.position.set(0, 0, 3.4);
    e.camera.updateProjectionMatrix();
    e.camera.lookAt(0, 0, 0);
    e.renderer.render(e.scene, e.camera);
    ctx.drawImage(e.renderer.domElement, -w / 2, -h / 2, w, h);
  }
};
