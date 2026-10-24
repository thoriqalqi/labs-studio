// Karakter chibi Mode Ustadz, dirakit dari bentuk dasar + rig sederhana.
// Menghadap +z. Sisi P = +x (tangan kiri karakter), sisi N = -x (tangan kanan).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFace } from './face.js';
import { DEFAULT_POSE } from './poses.js';

const OUTLINE = 0.014;

function toonRamp() {
  const data = new Uint8Array([85, 145, 200, 232]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// cahaya tepi (fresnel) supaya karakter hitam tetap terbaca di latar gelap
export const rimUniform = { value: new THREE.Color('#ff9a3c') };
function withRim(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = rimUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 rimColor;\nvoid main() {')
      .replace('#include <dithering_fragment>', `
        float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
        gl_FragColor.rgb += rimColor * smoothstep(0.35, 0.75, rimF) * 0.55;
        #include <dithering_fragment>`);
  };
  return material;
}

export function createCharacter() {
  const ramp = toonRamp();
  const toon = (color, extra = {}) => withRim(new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra }));
  const mat = {
    skin: toon('#f2bf98'),
    hoodie: toon('#2a2a31'),
    hoodieDark: toon('#1d1d22'),
    pants: toon('#24242a'),
    shoe: toon('#1b1b20'),
    sole: toon('#f1ede4'),
    peci: toon('#17171b'),
    hair: toon('#16161b'),
    shirt: toon('#6c6c75'),
    amber: toon('#d9822b'),
    outline: new THREE.MeshBasicMaterial({ color: '#060607', side: THREE.BackSide })
  };

  function add(parent, geo, material, { outline = true, pos, rot, scale } = {}) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (pos) mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    if (scale) mesh.scale.set(...scale);
    parent.add(mesh);
    if (outline) {
      geo.computeBoundingSphere();
      const r = geo.boundingSphere.radius;
      const o = new THREE.Mesh(geo, mat.outline);
      o.scale.setScalar(1 + OUTLINE / Math.max(r, 0.03));
      mesh.add(o);
    }
    return mesh;
  }

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.74;
  root.add(hips);

  // ---------- kaki ----------
  const legs = {};
  for (const [key, s] of [['lP', 1], ['lN', -1]]) {
    const hip = new THREE.Group();
    hip.position.set(0.13 * s, 0, 0);
    hips.add(hip);
    add(hip, new THREE.CapsuleGeometry(0.125, 0.16, 6, 16), mat.pants, { pos: [0, -0.15, 0] });
    add(hip, new RoundedBoxGeometry(0.06, 0.13, 0.13, 2, 0.02), mat.pants, { pos: [0.12 * s, -0.17, 0] });
    const knee = new THREE.Group();
    knee.position.y = -0.3;
    hip.add(knee);
    add(knee, new THREE.CapsuleGeometry(0.115, 0.12, 6, 16), mat.pants, { pos: [0, -0.13, 0] });
    add(knee, new THREE.TorusGeometry(0.105, 0.035, 8, 20), mat.pants, { pos: [0, -0.24, 0], rot: [Math.PI / 2, 0, 0], outline: false });
    const ankle = new THREE.Group();
    ankle.position.y = -0.29;
    knee.add(ankle);
    add(ankle, new RoundedBoxGeometry(0.22, 0.13, 0.36, 4, 0.06), mat.shoe, { pos: [0, -0.07, 0.05] });
    add(ankle, new RoundedBoxGeometry(0.235, 0.045, 0.375, 3, 0.02), mat.sole, { pos: [0, -0.13, 0.05] });
    for (let i = 0; i < 3; i++) {
      add(ankle, new THREE.BoxGeometry(0.1, 0.012, 0.02), mat.sole, { pos: [0, -0.003, 0.1 + i * 0.045], outline: false });
    }
    legs[key] = { hip, knee, ankle };
  }
  add(hips, new THREE.SphereGeometry(0.2, 20, 16), mat.pants, { pos: [0, 0.02, 0], scale: [1.35, 0.7, 1] });

  // ---------- badan (hoodie) ----------
  const spine = new THREE.Group();
  hips.add(spine);
  const prof = [
    [0.0, -0.1], [0.34, -0.1], [0.37, -0.06], [0.375, 0.05], [0.37, 0.2], [0.35, 0.34],
    [0.32, 0.44], [0.25, 0.53], [0.15, 0.58], [0.0, 0.59]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = add(spine, new THREE.LatheGeometry(prof, 40), mat.hoodie, { scale: [1, 1, 0.74] });
  torso.geometry.computeVertexNormals();
  add(spine, new THREE.TorusGeometry(0.355, 0.035, 8, 40), mat.hoodieDark, { pos: [0, -0.08, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 0.74, 1], outline: false });
  add(spine, new RoundedBoxGeometry(0.44, 0.19, 0.05, 3, 0.02), mat.hoodieDark, { pos: [0, 0.1, 0.262], rot: [-0.05, 0, 0] });
  // kerah kaos + tudung
  add(spine, new THREE.CylinderGeometry(0.105, 0.11, 0.06, 20), mat.shirt, { pos: [0, 0.56, 0.02], outline: false });
  add(spine, new THREE.TorusGeometry(0.17, 0.075, 12, 32), mat.hoodie, { pos: [0, 0.56, -0.02], rot: [Math.PI / 2 + 0.25, 0, 0], scale: [1.05, 1, 1] });
  add(spine, new THREE.SphereGeometry(0.3, 20, 16), mat.hoodieDark, { pos: [0, 0.48, -0.2], scale: [1, 0.72, 0.55] });
  // tali hoodie
  for (const s of [-1, 1]) {
    add(spine, new THREE.CylinderGeometry(0.011, 0.011, 0.2, 8), mat.amber, { pos: [0.06 * s, 0.44, 0.22], rot: [0.12, 0, 0], outline: false });
    add(spine, new THREE.CylinderGeometry(0.016, 0.016, 0.04, 8), mat.amber, { pos: [0.06 * s, 0.33, 0.235], outline: false });
  }

  // ---------- lengan ----------
  const arms = {};
  for (const [key, s] of [['aP', 1], ['aN', -1]]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.3 * s, 0.46, 0);
    spine.add(shoulder);
    add(shoulder, new THREE.SphereGeometry(0.11, 16, 12), mat.hoodie, { outline: false });
    add(shoulder, new THREE.CapsuleGeometry(0.1, 0.16, 6, 16), mat.hoodie, { pos: [0, -0.13, 0] });
    const elbow = new THREE.Group();
    elbow.position.y = -0.27;
    shoulder.add(elbow);
    add(elbow, new THREE.CapsuleGeometry(0.093, 0.14, 6, 16), mat.hoodie, { pos: [0, -0.11, 0] });
    add(elbow, new THREE.CylinderGeometry(0.098, 0.094, 0.06, 18), mat.hoodieDark, { pos: [0, -0.22, 0], outline: false });
    const wrist = new THREE.Group();
    wrist.position.y = -0.25;
    elbow.add(wrist);
    const hand = new THREE.Group();
    hand.rotation.y = -s * Math.PI / 2;
    wrist.add(hand);
    add(hand, new THREE.SphereGeometry(0.075, 16, 12), mat.skin, { pos: [0, -0.06, 0], scale: [1, 1.05, 0.68] });
    const fingers = [];
    [-0.042, -0.014, 0.014, 0.042].forEach((fx, i) => {
      const f = new THREE.Group();
      f.position.set(fx, -0.11, 0.005);
      hand.add(f);
      add(f, new THREE.CapsuleGeometry(0.019, i === 3 ? 0.035 : 0.05, 4, 8), mat.skin, { pos: [0, -0.035, 0] });
      fingers.push(f);
    });
    const thumb = new THREE.Group();
    thumb.position.set(0.06 * s, -0.05, 0.02);
    thumb.rotation.z = 0.5 * s;
    hand.add(thumb);
    add(thumb, new THREE.CapsuleGeometry(0.021, 0.04, 4, 8), mat.skin, { pos: [0, -0.035, 0] });
    arms[key] = { shoulder, elbow, wrist, hand, fingers, thumb, s };
  }

  // ---------- kepala ----------
  const neck = new THREE.Group();
  neck.position.y = 0.58;
  spine.add(neck);
  add(neck, new THREE.CylinderGeometry(0.075, 0.08, 0.14, 16), mat.skin, { pos: [0, 0.02, 0], outline: false });
  const head = new THREE.Group();
  head.position.y = 0.06;
  neck.add(head);

  const face = createFace();
  const headMat = withRim(new THREE.MeshToonMaterial({ map: face.texture, gradientMap: ramp }));
  const HC = 0.47; // pusat bola kepala
  add(head, new THREE.SphereGeometry(0.56, 64, 48), headMat, { pos: [0, HC, 0], scale: [1, 0.94, 0.97] });

  // telinga
  for (const s of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.1, 16, 12), mat.skin, { pos: [0.55 * s, HC - 0.02, -0.02], scale: [0.55, 1, 0.8] });
  }
  // rambut belakang
  const deg = Math.PI / 180;
  add(head, new THREE.SphereGeometry(0.578, 48, 32, Math.PI / 2 + 72 * deg, 216 * deg, 0, 2.05), mat.hair, { pos: [0, HC, 0], scale: [1, 0.95, 0.98] });
  // jambang
  for (const s of [-1, 1]) {
    const a = 76 * deg;
    add(head, new THREE.SphereGeometry(0.07, 12, 10), mat.hair, {
      pos: [Math.sin(a) * 0.545 * s, HC + 0.04, Math.cos(a) * 0.53], scale: [0.7, 2.2, 1]
    });
  }
  // poni
  const bangs = [-58, -40, -22, -5, 12, 30, 48, 62];
  bangs.forEach((d, i) => {
    const a = d * deg;
    const len = 0.17 + (i % 2) * 0.04;
    const spike = add(head, new THREE.ConeGeometry(0.095, len, 10), mat.hair, {
      pos: [Math.sin(a) * 0.56, HC + 0.2, Math.cos(a) * 0.545],
      scale: [1, 1, 0.42]
    });
    spike.rotation.order = 'YXZ';
    spike.rotation.set(Math.PI - 0.25, a, 0.28);
  });

  // peci
  const peciProf = [
    [0.0, 0.0], [0.545, 0.0], [0.548, 0.02], [0.53, 0.36], [0.51, 0.405], [0.47, 0.425], [0.0, 0.43]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const peciMat = withRim(new THREE.MeshToonMaterial({ color: '#232329', gradientMap: ramp }));
  const peci = add(head, new THREE.LatheGeometry(peciProf, 56), peciMat, { pos: [0, HC + 0.18, -0.02], rot: [-0.1, 0, 0], scale: [1, 1, 0.97] });
  // garis tipis di bawah peci
  add(peci, new THREE.TorusGeometry(0.545, 0.012, 6, 56), mat.hoodieDark, { pos: [0, 0.03, 0], rot: [Math.PI / 2, 0, 0], outline: false });
  // pin ▶ amber khas Mode Ustadz
  const pinA = 28 * deg;
  const pin = new THREE.Group();
  pin.position.set(Math.sin(pinA) * 0.535, 0.22, Math.cos(pinA) * 0.52);
  pin.rotation.y = pinA;
  peci.add(pin);
  add(pin, new RoundedBoxGeometry(0.13, 0.1, 0.03, 3, 0.012), mat.amber);
  const tri = new THREE.Shape();
  tri.moveTo(-0.02, -0.03);
  tri.lineTo(0.035, 0);
  tri.lineTo(-0.02, 0.03);
  tri.closePath();
  add(pin, new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: '#fff8ee' }), { pos: [0, 0, 0.0161], outline: false });

  // ---------- pose ----------
  const pose = { ...DEFAULT_POSE };

  function setPose(p) {
    Object.assign(pose, DEFAULT_POSE, p);
  }

  function update(t, { talking = false, expr = 'normal' } = {}) {
    const p = pose;
    const breathe = Math.sin(t * 2.1);
    root.position.set(p['root.x'] + Math.sin(t * 0.7) * 0.015, p['root.y'], p['root.z']);
    root.rotation.y = p['root.ry'];
    hips.position.y = 0.74 + breathe * 0.004;

    spine.rotation.set(p['spine.x'] + breathe * 0.012, p['spine.y'] + Math.sin(t * 0.6) * 0.03, p['spine.z']);
    const nod = talking ? Math.sin(t * 5.2) * 0.035 + Math.sin(t * 2.7) * 0.02 : 0;
    head.rotation.set(
      p['head.x'] + nod + Math.sin(t * 0.9) * 0.015,
      p['head.y'] + Math.sin(t * 0.5) * 0.04,
      p['head.z'] + Math.sin(t * 0.8) * 0.02
    );

    for (const key of ['aP', 'aN']) {
      const a = arms[key];
      const s = a.s;
      const sway = talking ? Math.sin(t * 3.1 + s) * 0.05 : Math.sin(t * 1.3 + s) * 0.015;
      a.shoulder.rotation.set(p[`${key}.sx`] + sway, p[`${key}.sy`] * s, p[`${key}.sz`] * s);
      a.elbow.rotation.x = p[`${key}.el`] + sway * 0.6;
      a.wrist.rotation.set(p[`${key}.wx`], p[`${key}.wy`] * s, p[`${key}.wz`] * s);
      const curl = p[`${key}.curl`];
      a.fingers.forEach((f, i) => {
        const c = i === 0 ? p[`${key}.idx`] : curl;
        f.rotation.x = -c * 1.5;
        f.rotation.z = (i - 1.5) * 0.08 * (1 - curl);
      });
      a.thumb.rotation.x = -curl * 0.6;
    }
    for (const key of ['lP', 'lN']) {
      const l = legs[key];
      l.hip.rotation.set(p[`${key}.hx`], 0, p[`${key}.hz`] * (key === 'lP' ? 1 : -1));
      l.knee.rotation.x = p[`${key}.kx`];
      l.ankle.rotation.x = p[`${key}.ax`];
    }
  }

  // kedip + bicara: fungsi murni dari waktu, supaya ekspor frame-by-frame konsisten
  function updateFace(t, { expr, talking, look = [0, 0] }) {
    const bp = t % 3.7;
    const blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0;
    const mouth = talking
      ? Math.max(0, Math.abs(Math.sin(t * 11.3)) * 0.8 + Math.sin(t * 4.1) * 0.3)
      : 0;
    face.draw({ expr, mouth: Math.min(1, mouth), blink, lookX: look[0], lookY: look[1] });
  }

  return { root, head, setPose, update, updateFace };
}
