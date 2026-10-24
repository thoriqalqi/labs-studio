// Panggung: papan catur, bidak raksasa, partikel, cahaya, properti, dan suasana per bagian.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rimUniform } from './character.js';

export const MOODS = {
  hook:   { top: '#2b1c12', bottom: '#07070a', fog: '#0c0a09', key: '#ffd2a1', keyI: 2.6, rim: '#ff9a3c', rimI: 3.2, fill: '#3a5a9a', fillI: 0.5, grid: 0.0, gridColor: '#3d7bff', spot: 3.0, dust: '#ffb066' },
  tegas:  { top: '#2a0f0d', bottom: '#060404', fog: '#0c0606', key: '#ffc2a8', keyI: 2.2, rim: '#ff4a2a', rimI: 3.6, fill: '#3d1010', fillI: 0.5, grid: 0.9, gridColor: '#ff5a3a', spot: 3.4, dust: '#ff7a55' },
  lembut: { top: '#1f2016', bottom: '#08080a', fog: '#0b0b09', key: '#fff0d6', keyI: 2.8, rim: '#d9b26b', rimI: 2.0, fill: '#556070', fillI: 0.5, grid: 0.0, gridColor: '#d9b26b', spot: 2.6, dust: '#f3e3b0' },
  malam:  { top: '#0d1730', bottom: '#03040a', fog: '#060914', key: '#a9c4ff', keyI: 1.7, rim: '#6ea0ff', rimI: 3.0, fill: '#1a2a5a', fillI: 0.8, grid: 0.55, gridColor: '#3d7bff', spot: 2.4, dust: '#9cc0ff' },
  fajar:  { top: '#2a2140', bottom: '#6a3818', fog: '#1a120d', key: '#ffcf9a', keyI: 3.0, rim: '#ffb060', rimI: 3.0, fill: '#6a4a7a', fillI: 0.6, grid: 0.0, gridColor: '#ffb060', spot: 2.2, dust: '#ffd59a' }
};

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
function lerpColor(target, a, b, k) {
  tmpA.set(a);
  tmpB.set(b);
  target.copy(tmpA).lerp(tmpB, k);
}

function lathe(points, segs = 40) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

const PIECES = {
  pawn: [[0, 0], [0.42, 0], [0.42, 0.08], [0.34, 0.12], [0.36, 0.16], [0.22, 0.22], [0.16, 0.45], [0.26, 0.5], [0.26, 0.53], [0.14, 0.56], [0.2, 0.62], [0.24, 0.72], [0.2, 0.84], [0.1, 0.91], [0, 0.93]],
  rook: [[0, 0], [0.45, 0], [0.45, 0.08], [0.36, 0.13], [0.38, 0.18], [0.26, 0.24], [0.24, 0.7], [0.34, 0.74], [0.34, 0.96], [0.26, 0.96], [0.26, 0.89], [0, 0.89]],
  bishop: [[0, 0], [0.42, 0], [0.42, 0.08], [0.34, 0.12], [0.36, 0.16], [0.22, 0.22], [0.15, 0.6], [0.26, 0.64], [0.26, 0.67], [0.15, 0.7], [0.22, 0.8], [0.23, 0.9], [0.16, 1.02], [0.06, 1.1], [0.08, 1.13], [0, 1.17]],
  king: [[0, 0], [0.46, 0], [0.46, 0.08], [0.37, 0.13], [0.39, 0.18], [0.25, 0.25], [0.17, 0.78], [0.3, 0.83], [0.3, 0.86], [0.18, 0.9], [0.27, 1.04], [0.22, 1.1], [0, 1.11]]
};

function makePiece(type, material) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(lathe(PIECES[type]), material);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  if (type === 'king') {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.08), material);
    v.position.y = 1.22;
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.08), material);
    h.position.y = 1.26;
    v.castShadow = h.castShadow = true;
    g.add(v, h);
  }
  return g;
}

function circleSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// generator acak dengan seed, supaya hasil ekspor selalu sama
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function createWorld(scene) {
  const rand = rng(7);
  const sprite = circleSprite();

  // langit gradien
  const skyU = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.35, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }'
    })
  );
  scene.add(sky);
  scene.fog = new THREE.Fog('#0c0a09', 9, 30);

  // lantai
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: '#0f1014', roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.081;
  ground.receiveShadow = true;
  scene.add(ground);

  // papan catur
  const N = 10;
  const tileGeo = new THREE.BoxGeometry(0.97, 0.08, 0.97);
  const light = new THREE.InstancedMesh(tileGeo, new THREE.MeshStandardMaterial({ color: '#c3c7d2', roughness: 0.32, metalness: 0.05 }), N * N / 2);
  const dark = new THREE.InstancedMesh(tileGeo, new THREE.MeshStandardMaterial({ color: '#232838', roughness: 0.3, metalness: 0.1 }), N * N / 2);
  light.receiveShadow = dark.receiveShadow = true;
  const mtx = new THREE.Matrix4();
  let li = 0;
  let di = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      mtx.setPosition(i - N / 2 + 0.5, -0.04, j - N / 2 + 0.5 - 1);
      if ((i + j) % 2 === 0) light.setMatrixAt(li++, mtx);
      else dark.setMatrixAt(di++, mtx);
    }
  }
  scene.add(light, dark);

  // garis menyala di sela ubin
  const gridMat = new THREE.MeshBasicMaterial({ color: '#3d7bff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const grid = new THREE.Group();
  for (let i = 0; i <= N; i++) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(N, 0.01, 0.03), gridMat);
    a.position.set(0, 0.002, i - N / 2 - 1);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, N), gridMat);
    b.position.set(i - N / 2, 0.002, -1);
    grid.add(a, b);
  }
  scene.add(grid);

  // bidak raksasa
  const darkPiece = new THREE.MeshStandardMaterial({ color: '#2b211c', roughness: 0.25, metalness: 0.15 });
  const lightPiece = new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.3, metalness: 0.05 });
  const placed = [
    ['king', -3.3, -2.8, 2.4, darkPiece], ['rook', -5.2, -5.5, 2.8, darkPiece], ['bishop', 3.9, -3.6, 2.5, darkPiece],
    ['pawn', 2.7, -1.4, 1.5, darkPiece], ['pawn', -2.4, 0.4, 1.1, darkPiece], ['pawn', 3.4, 1.0, 1.0, lightPiece],
    ['bishop', -1.2, -4.8, 1.6, lightPiece], ['pawn', 1.2, -3.5, 1.2, darkPiece]
  ];
  const pieces = placed.map(([type, x, z, s, m]) => {
    const p = makePiece(type, m);
    p.position.set(x, 0, z);
    p.scale.setScalar(s);
    p.rotation.y = rand() * Math.PI;
    scene.add(p);
    return p;
  });

  // bidak melayang + pusaran sihir (adegan "mengendalikan")
  const magic = new THREE.Group();
  scene.add(magic);
  const floaters = ['king', 'pawn', 'bishop', 'pawn'].map((type, i) => {
    const p = makePiece(type, darkPiece);
    p.scale.setScalar(0.45 - i * 0.04);
    magic.add(p);
    return p;
  });
  const swirlCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 40 }, (_, i) => {
      const k = i / 39;
      const a = k * Math.PI * 4.2;
      return new THREE.Vector3(Math.cos(a) * (1.25 - k * 0.3), 0.2 + k * 2.4, Math.sin(a) * (1.25 - k * 0.3));
    })
  );
  const swirlU = { time: { value: 0 }, strength: { value: 0 } };
  const swirl = new THREE.Mesh(
    new THREE.TubeGeometry(swirlCurve, 300, 0.018, 8, false),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: swirlU,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float time; uniform float strength; varying vec2 vUv; void main(){ float f = fract(vUv.x * 3.0 - time * 0.6); float a = smoothstep(0.0, 0.5, f) * (1.0 - smoothstep(0.5, 1.0, f)); gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * 1.6, a * strength); }'
    })
  );
  magic.add(swirl);
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.6 + rand() * 1.0;
    sp.set([Math.cos(a) * r, 0.2 + rand() * 2.6, Math.sin(a) * r], i * 3);
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparkMat = new THREE.PointsMaterial({ size: 0.07, map: sprite, color: '#9cc8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  magic.add(new THREE.Points(sparkGeo, sparkMat));

  // debu melayang
  const DUST = 500;
  const dustBase = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dustBase.set([(rand() - 0.5) * 14, rand() * 5, (rand() - 0.5) * 10 - 1], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustBase.slice(), 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.035, map: sprite, color: '#ffb066', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // bokeh jauh
  const bokeh = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.SpriteMaterial({ map: sprite, color: '#ff9a3c', transparent: true, opacity: 0.18 + rand() * 0.2, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const s = new THREE.Sprite(m);
    s.position.set((rand() - 0.5) * 30, 1 + rand() * 8, -14 - rand() * 10);
    s.scale.setScalar(1 + rand() * 2.5);
    scene.add(s);
    bokeh.push(s);
  }

  // kursi singgasana
  const throne = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#3a1f14', roughness: 0.5 });
  const velvet = new THREE.MeshStandardMaterial({ color: '#6e1a22', roughness: 0.85 });
  const tb = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; throne.add(o); };
  tb(new RoundedBoxGeometry(0.95, 0.12, 0.75, 3, 0.04), wood, 0, 0.36, 0);
  tb(new RoundedBoxGeometry(0.85, 0.1, 0.65, 3, 0.04), velvet, 0, 0.45, 0.02);
  tb(new RoundedBoxGeometry(1.0, 1.5, 0.12, 3, 0.05), wood, 0, 1.05, -0.36);
  tb(new RoundedBoxGeometry(0.75, 1.15, 0.06, 3, 0.03), velvet, 0, 1.08, -0.29);
  for (const s of [-1, 1]) {
    tb(new RoundedBoxGeometry(0.12, 0.42, 0.7, 2, 0.04), wood, 0.5 * s, 0.6, 0);
    tb(new RoundedBoxGeometry(0.1, 0.36, 0.1, 2, 0.03), wood, 0.42 * s, 0.15, 0.3);
    tb(new RoundedBoxGeometry(0.1, 0.36, 0.1, 2, 0.03), wood, 0.42 * s, 0.15, -0.3);
  }
  throne.position.set(0, 0, -0.22);
  scene.add(throne);

  // cahaya
  const hemi = new THREE.HemisphereLight('#8a90a8', '#1a1410', 0.55);
  const key = new THREE.DirectionalLight('#ffd2a1', 2.6);
  key.position.set(3.5, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.DirectionalLight('#ff9a3c', 3.2);
  rim.position.set(-4, 3.5, -5);
  const rim2 = new THREE.DirectionalLight('#ff9a3c', 1.6);
  rim2.position.set(4.5, 3, -4);
  const fill = new THREE.PointLight('#3a5a9a', 0.5, 0, 0);
  fill.position.set(-3, 2, 3);
  const spot = new THREE.SpotLight('#fff1dc', 3, 14, 0.5, 0.7, 1);
  spot.position.set(0, 7, 1.2);
  spot.target.position.set(0, 0, 0);
  scene.add(hemi, key, rim, rim2, fill, spot, spot.target);

  const props = createProps(sprite);
  props.group.position.set(0.82, 1.8, 0.45);
  props.group.scale.setScalar(0.75);
  scene.add(props.group);

  function applyMood(a, b, k) {
    const A = MOODS[a];
    const B = MOODS[b];
    const mix = (f) => A[f] + (B[f] - A[f]) * k;
    lerpColor(skyU.top.value, A.top, B.top, k);
    lerpColor(skyU.bottom.value, A.bottom, B.bottom, k);
    lerpColor(fog.color, A.fog, B.fog, k);
    lerpColor(key.color, A.key, B.key, k);
    key.intensity = mix('keyI');
    lerpColor(rim.color, A.rim, B.rim, k);
    rim2.color.copy(rim.color);
    rim.intensity = mix('rimI');
    rim2.intensity = mix('rimI') * 0.5;
    lerpColor(fill.color, A.fill, B.fill, k);
    fill.intensity = mix('fillI');
    spot.intensity = mix('spot');
    lerpColor(gridMat.color, A.gridColor, B.gridColor, k);
    gridMat.userData.base = mix('grid');
    lerpColor(dustMat.color, A.dust, B.dust, k);
    for (const s of bokeh) s.material.color.copy(rim.color);
    rimUniform.value.copy(rim.color);
  }

  function update(t, { magicK = 0, throneK = 0 }) {
    // debu naik pelan, fungsi murni dari t
    const pos = dust.geometry.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      pos[i * 3] = dustBase[i * 3] + Math.sin(t * 0.3 + i) * 0.15;
      pos[i * 3 + 1] = (dustBase[i * 3 + 1] + t * 0.12 * (0.5 + (i % 7) / 7)) % 5;
      pos[i * 3 + 2] = dustBase[i * 3 + 2];
    }
    dust.geometry.attributes.position.needsUpdate = true;

    gridMat.opacity = (gridMat.userData.base || 0) * (0.7 + 0.3 * Math.sin(t * 2.0));

    swirlU.time.value = t;
    swirlU.strength.value = magicK;
    sparkMat.opacity = magicK;
    magic.rotation.y = t * 0.4;
    floaters.forEach((p, i) => {
      const a = t * 0.6 + (i * Math.PI) / 2;
      const r = 1.5 + i * 0.15;
      p.position.set(Math.cos(a) * r, 0.9 + i * 0.45 + Math.sin(t * 1.3 + i) * 0.15, Math.sin(a) * r);
      p.rotation.set(Math.sin(t + i) * 0.4, t * 0.8 + i, Math.cos(t * 0.7 + i) * 0.3);
      p.scale.setScalar((0.45 - i * 0.04) * magicK);
      p.visible = magicK > 0.01;
    });
    magic.visible = magicK > 0.01;

    throne.visible = throneK > 0.01;
    throne.scale.setScalar(0.6 + 0.4 * throneK);
  }

  // panggung (langit, lantai, papan, bidak, debu) bisa disembunyikan untuk layer karakter transparan
  const stageParts = [sky, ground, light, dark, grid, dust, ...pieces, ...bokeh];
  function setStage(visible) {
    for (const o of stageParts) o.visible = visible;
    scene.fog = visible ? fog : null;
  }
  const fog = scene.fog;

  return { applyMood, update, props, setStage };
}

// ---------- properti melayang ----------
function createProps(sprite) {
  const group = new THREE.Group();
  const items = {};
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
  const mk = (geo, m, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...pos);
    o.rotation.set(...rot);
    o.castShadow = true;
    return o;
  };

  // HP
  {
    const g = new THREE.Group();
    g.add(mk(new RoundedBoxGeometry(0.34, 0.62, 0.04, 4, 0.05), std('#111114', { roughness: 0.25 })));
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 460;
    const x = c.getContext('2d');
    const grad = x.createLinearGradient(0, 0, 0, 460);
    grad.addColorStop(0, '#1f3a6a');
    grad.addColorStop(1, '#0b1428');
    x.fillStyle = grad;
    x.fillRect(0, 0, 256, 460);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = 'rgba(255,255,255,0.88)';
      x.beginPath();
      x.roundRect(18, 40 + i * 92, 220, 74, 16);
      x.fill();
      x.fillStyle = i === 0 ? '#d9822b' : '#6a7a9a';
      x.beginPath();
      x.arc(50, 77 + i * 92, 18, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#2a2f3a';
      x.fillRect(80, 62 + i * 92, 130, 10);
      x.fillStyle = '#9aa3b5';
      x.fillRect(80, 82 + i * 92, 100, 8);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screen = mk(new THREE.PlaneGeometry(0.3, 0.54), new THREE.MeshBasicMaterial({ map: tex }), [0, 0, 0.021]);
    g.add(screen);
    const badge = mk(new THREE.SphereGeometry(0.07, 16, 12), std('#e2483b', { emissive: '#e2483b', emissiveIntensity: 0.6 }), [0.16, 0.3, 0.04]);
    g.add(badge);
    items.hp = g;
  }

  // jam
  {
    const g = new THREE.Group();
    g.add(mk(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 48), std('#f3ede2'), [0, 0, 0], [Math.PI / 2, 0, 0]));
    g.add(mk(new THREE.TorusGeometry(0.3, 0.04, 12, 48), std('#d9822b', { metalness: 0.7, roughness: 0.3 })));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.add(mk(new THREE.BoxGeometry(0.02, i % 3 === 0 ? 0.06 : 0.035, 0.01), std('#2a2a30'), [Math.sin(a) * 0.24, Math.cos(a) * 0.24, 0.03], [0, 0, -a]));
    }
    const hourHand = new THREE.Group();
    hourHand.add(mk(new THREE.BoxGeometry(0.03, 0.14, 0.01), std('#141416'), [0, 0.06, 0.04]));
    const minHand = new THREE.Group();
    minHand.add(mk(new THREE.BoxGeometry(0.02, 0.21, 0.01), std('#d9822b'), [0, 0.09, 0.045]));
    g.add(hourHand, minHand);
    g.userData.tick = (t) => {
      minHand.rotation.z = -t * 2.5;
      hourHand.rotation.z = -t * 0.21;
    };
    items.jam = g;
  }

  // koin
  {
    const g = new THREE.Group();
    const gold = std('#e0a43a', { metalness: 0.85, roughness: 0.28 });
    const coinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.035, 32);
    for (let i = 0; i < 6; i++) g.add(mk(coinGeo, gold, [Math.sin(i * 1.7) * 0.012, -0.2 + i * 0.038, 0]));
    const flyers = [0, 1, 2].map(() => {
      const c = mk(coinGeo, gold);
      g.add(c);
      return c;
    });
    g.userData.tick = (t) => {
      flyers.forEach((c, i) => {
        const a = t * 1.6 + i * 2.1;
        c.position.set(Math.cos(a) * 0.32, 0.05 + Math.sin(t * 2 + i) * 0.1 + i * 0.08, Math.sin(a) * 0.32);
        c.rotation.set(t * 3 + i, 0, Math.PI / 2);
      });
    };
    items.uang = g;
  }

  // masjid
  {
    const g = new THREE.Group();
    const cream = std('#efe6d6');
    const gold = std('#d9a03a', { metalness: 0.6, roughness: 0.3 });
    g.add(mk(new RoundedBoxGeometry(0.7, 0.34, 0.42, 3, 0.03), cream, [0, -0.15, 0]));
    g.add(mk(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 32), cream, [0, 0.05, 0]));
    g.add(mk(new THREE.SphereGeometry(0.22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), gold, [0, 0.08, 0]));
    g.add(mk(new THREE.ConeGeometry(0.02, 0.12, 8), gold, [0, 0.36, 0]));
    for (const s of [-1, 1]) {
      g.add(mk(new THREE.CylinderGeometry(0.045, 0.05, 0.72, 16), cream, [0.42 * s, 0.04, 0]));
      g.add(mk(new THREE.ConeGeometry(0.06, 0.16, 16), gold, [0.42 * s, 0.48, 0]));
    }
    const win = new THREE.MeshBasicMaterial({ color: '#ffcf7a' });
    g.add(mk(new THREE.PlaneGeometry(0.1, 0.16), win, [0, -0.2, 0.212]));
    for (const s of [-1, 1]) g.add(mk(new THREE.PlaneGeometry(0.06, 0.1), win, [0.2 * s, -0.14, 0.212]));
    items.masjid = g;
  }

  // hati
  {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.25);
    shape.bezierCurveTo(-0.05, -0.18, -0.32, -0.05, -0.28, 0.1);
    shape.bezierCurveTo(-0.25, 0.25, -0.05, 0.27, 0, 0.12);
    shape.bezierCurveTo(0.05, 0.27, 0.25, 0.25, 0.28, 0.1);
    shape.bezierCurveTo(0.32, -0.05, 0.05, -0.18, 0, -0.25);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4 });
    geo.center();
    const g = new THREE.Group();
    const heart = mk(geo, std('#e2483b', { emissive: '#7a1410', emissiveIntensity: 0.6, roughness: 0.35 }));
    g.add(heart);
    g.userData.tick = (t) => {
      const beat = 1 + Math.max(0, Math.sin(t * 7)) * 0.08;
      heart.scale.setScalar(beat);
    };
    items.hati = g;
  }

  // kalender
  {
    const g = new THREE.Group();
    g.add(mk(new RoundedBoxGeometry(0.52, 0.52, 0.05, 3, 0.03), std('#f3ede2')));
    g.add(mk(new RoundedBoxGeometry(0.52, 0.12, 0.06, 3, 0.03), std('#c8432f'), [0, 0.21, 0.005]));
    for (const s of [-1, 1]) g.add(mk(new THREE.TorusGeometry(0.03, 0.01, 8, 16), std('#2a2a30', { metalness: 0.6 }), [0.14 * s, 0.28, 0.02], [0, Math.PI / 2, 0]));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const marked = r === 1 && c === 2;
        g.add(mk(new THREE.BoxGeometry(0.07, 0.06, 0.01), std(marked ? '#d9822b' : '#3a3a42'), [-0.165 + c * 0.11, 0.08 - r * 0.1, 0.03]));
      }
    }
    items.kalender = g;
  }

  // kitab
  {
    const g = new THREE.Group();
    const cover = std('#1f4a3a');
    const page = std('#f6efe0');
    for (const s of [-1, 1]) {
      const half = new THREE.Group();
      half.rotation.y = s * 0.35;
      half.add(mk(new THREE.BoxGeometry(0.32, 0.44, 0.02), cover, [0.16 * s, 0, -0.012]));
      half.add(mk(new THREE.BoxGeometry(0.3, 0.42, 0.03), page, [0.155 * s, 0, 0.012]));
      g.add(half);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: '#ffd38a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.9);
    glow.position.set(0, 0.05, 0.15);
    g.add(glow);
    g.rotation.x = -0.35;
    items.kitab = g;
  }

  for (const k in items) {
    items[k].visible = false;
    group.add(items[k]);
  }

  // k: 0..1 muncul (pegas kecil), t: waktu global
  function show(name, k, t) {
    for (const n in items) items[n].visible = false;
    const it = items[name];
    if (!it || k <= 0.001) return;
    it.visible = true;
    const spring = k >= 1 ? 1 : 1 - Math.cos(k * Math.PI * 2.5) * Math.exp(-k * 4) * (1 - k);
    it.scale.setScalar(Math.max(0.001, spring));
    it.position.y = Math.sin(t * 1.6) * 0.06;
    it.rotation.y = Math.sin(t * 0.9) * 0.35 + (name === 'kitab' ? 0 : -0.2);
    if (it.userData.tick) it.userData.tick(t);
  }

  return { group, show };
}
