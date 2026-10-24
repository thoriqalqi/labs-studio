// Karakter chibi 3D (dari engine Mode Ustadz) sebagai layer. Latar panggung bisa dimatikan
// supaya karakter transparan di atas layer lain.
import * as THREE from 'three';
import { createCharacter } from '../../character.js';
import { createWorld } from '../../world.js';
import { resolvePose } from '../../poses.js';
import { EXPRS, POSES, PROPS, MOODS_LABEL } from '../../catalog.js';

// kamera dipusatkan ke karakter (berbeda dari editor episode yang menaruh karakter di kanan)
const SHOTS = {
  full: { pos: [0, 1.4, 6.2], tgt: [0, 1.25, 0], fov: 34, label: 'Seluruh badan' },
  medium: { pos: [0.2, 1.7, 4.2], tgt: [0, 1.55, 0], fov: 34, label: 'Setengah badan' },
  close: { pos: [0.1, 1.95, 2.8], tgt: [0, 1.88, 0], fov: 32, label: 'Close-up wajah' },
  low: { pos: [0.4, 0.7, 4.0], tgt: [0, 1.6, 0], fov: 38, label: 'Low angle' }
};

let eng = null;
function engine() {
  if (eng) return eng;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  const world = createWorld(scene);
  const hero = createCharacter();
  scene.add(hero.root);
  eng = { renderer, scene, camera, world, hero, w: 0, h: 0 };
  return eng;
}

export default {
  type: 'chibi3d',
  name: 'Karakter chibi 3D',
  icon: '☺',
  category: '3D',
  order: 20,
  defaults: { w: 1080, h: 1080, expr: 'normal', pose: 'idle', shot: 'medium', mood: 'hook', prop: '', stage: false, talking: false, magic: false },
  schema: [
    { key: 'expr', label: 'Ekspresi', kind: 'select', options: EXPRS },
    { key: 'pose', label: 'Pose', kind: 'select', options: POSES },
    { key: 'shot', label: 'Kamera', kind: 'select', options: Object.fromEntries(Object.entries(SHOTS).map(([k, v]) => [k, v.label])) },
    { key: 'mood', label: 'Cahaya', kind: 'select', options: MOODS_LABEL },
    { key: 'prop', label: 'Properti', kind: 'select', options: PROPS },
    { key: 'stage', label: 'Tampilkan panggung catur', kind: 'checkbox' },
    { key: 'talking', label: 'Mulut bergerak (bicara)', kind: 'checkbox' },
    { key: 'magic', label: 'Efek sihir', kind: 'checkbox' },
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
    const t = env.contentT;
    e.world.setStage(!!p.stage);
    e.hero.setPose(resolvePose(p.pose));
    e.hero.update(t, { talking: !!p.talking });
    e.hero.updateFace(t, { expr: p.expr, talking: !!p.talking });
    e.world.applyMood(p.mood, p.mood, 1);
    e.world.update(t, { magicK: p.magic ? 1 : 0, throneK: p.pose === 'sit' ? 1 : 0 });
    e.world.props.show(p.prop, p.prop ? 1 : 0, t);
    const s = SHOTS[p.shot] || SHOTS.medium;
    e.camera.aspect = w / h;
    e.camera.fov = s.fov;
    e.camera.position.set(...s.pos);
    e.camera.updateProjectionMatrix();
    e.camera.lookAt(...s.tgt);
    e.renderer.render(e.scene, e.camera);
    ctx.drawImage(e.renderer.domElement, -w / 2, -h / 2, w, h);
  }
};
