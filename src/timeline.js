// Mengubah dokumen episode menjadi keadaan per waktu t.
// Fungsi murni dari t → bisa di-seek & diekspor frame-by-frame.
//
// Dokumen episode (episodes/<id>.json):
//   scenes:   [{ id, dur, sec, expr, pose, shot, prop, a, b, sub, sfx, kicker?, magic?, title?, end? }]
//   timeline: { video: [{ id, scene (id adegan), in, out, speed }],   in/out = detik di dalam adegan
//               audio: [{ id, url, name, track, start, in, out, speed, volume }], sfxVolume, sfxMuted }
import * as THREE from 'three';
import { resolvePose, blendPose } from './poses.js';

export const SECTIONS = {
  i: { name: 'Pembuka', kicker: '', mood: 'hook', color: '#8a5a2b' },
  h: { name: 'Renungan', kicker: 'RENUNGAN', mood: 'hook', color: '#8a5a2b' },
  l: { name: 'Sindiran', kicker: 'JUJUR AJA', mood: 'hook', color: '#7a5a3b' },
  t: { name: 'Tegas', kicker: 'JAWAB DENGAN JUJUR', mood: 'tegas', color: '#8a3326' },
  d: { name: 'Lembut', kicker: 'DENGAR BAIK-BAIK', mood: 'lembut', color: '#6b6a4f' },
  e: { name: 'Emosional', kicker: 'PULANG', mood: 'malam', color: '#2f4a7a' },
  p: { name: 'Penutup', kicker: 'PENUTUP', mood: 'fajar', color: '#8a5a3a' }
};

// karakter di titik 0; target kamera digeser ke kiri supaya karakter di kanan layar (teks di kiri)
export const SHOTS = {
  wide:   { pos: [-0.9, 1.8, 7.4],  tgt: [-1.5, 1.35, 0], fov: 34, orbit: 0.18, push: 0.06 },
  medium: { pos: [-0.5, 1.75, 4.6], tgt: [-0.85, 1.5, 0], fov: 34, orbit: 0.14, push: 0.07 },
  close:  { pos: [-0.2, 2.05, 3.4], tgt: [-0.55, 1.92, 0], fov: 30, orbit: 0.08, push: 0.07 },
  low:    { pos: [0.1, 0.6, 3.9],   tgt: [-0.75, 1.65, 0], fov: 38, orbit: 0.12, push: 0.05 },
  side:   { pos: [2.6, 1.65, 3.9],  tgt: [-0.35, 1.45, 0], fov: 34, orbit: 0.16, push: 0.05 }
};

export const secOf = (s) => SECTIONS[s.sec] || SECTIONS.h;

export const ease = (x) => {
  const k = Math.min(1, Math.max(0, x));
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};

let uid = 0;
export const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export function defaultVideo(scenes) {
  return scenes.map((s) => ({ id: newId('v'), scene: s.id, in: 0, out: s.dur, speed: 1 }));
}

function parseCue(spec) {
  const m = spec.match(/^(\w+)(?:@([\d.]+))?(?:\*(\d+))?(?::([\d.]+))?$/);
  if (!m) return null;
  return { name: m[1], offset: parseFloat(m[2] || 0), count: parseInt(m[3] || 1, 10), length: parseFloat(m[4] || 0) };
}

const PLACEHOLDER = { id: '_kosong', dur: 3, sec: 'h', expr: 'normal', pose: 'idle', shot: 'medium', prop: '', a: 'Belum ada adegan', b: '', sub: '', sfx: [] };

export function buildTimeline(doc) {
  const project = doc.timeline;
  const src = doc.scenes.length ? doc.scenes : [PLACEHOLDER];
  const scenes = src.map((s, i) => ({ ...s, index: i, poseData: resolvePose(s.pose), isSit: s.pose === 'sit' }));
  const byId = new Map(scenes.map((s) => [s.id, s]));
  let video = project.video.filter((v) => byId.has(v.scene));
  if (!video.length) video = [{ id: '_kosong', scene: scenes[0].id, in: 0, out: scenes[0].dur, speed: 1 }];
  let acc = 0;
  const clips = video.map((v) => {
    const dur = (v.out - v.in) / v.speed;
    const c = { ...v, s: byId.get(v.scene), start: acc, dur };
    acc += dur;
    return c;
  });

  const cues = [];
  for (const c of clips) {
    for (const spec of c.s.sfx) {
      const q = parseCue(spec);
      if (!q || q.offset < c.in || q.offset >= c.out) continue;
      cues.push({ ...q, time: c.start + (q.offset - c.in) / c.speed });
    }
  }

  const audio = project.audio.map((a) => {
    const dur = (a.out - a.in) / a.speed;
    return { ...a, dur, end: a.start + dur };
  });

  return {
    ep: doc, doc, scenes, byId, clips, cues, audio, project,
    total: acc,
    sfxVolume: project.sfxVolume ?? 1,
    sfxMuted: !!project.sfxMuted
  };
}

export function findClip(tl, t) {
  const cs = tl.clips;
  for (let i = 0; i < cs.length; i++) if (t < cs[i].start + cs[i].dur) return i;
  return cs.length - 1;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

function shotAt(name, u, t, out) {
  const s = SHOTS[name] || SHOTS.medium;
  const tgt = v1.set(...s.tgt);
  const pos = v2.set(...s.pos).sub(tgt);
  pos.applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.orbit * (u - 0.5));
  pos.multiplyScalar(1 - s.push * u);
  pos.add(tgt);
  pos.x += Math.sin(t * 0.7) * 0.02;
  pos.y += Math.sin(t * 0.93) * 0.015;
  out.pos.copy(pos);
  out.tgt.copy(tgt);
  out.fov = s.fov;
  return out;
}

const camA = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 34 };
const camB = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 34 };

export function sample(tl, t) {
  t = Math.min(Math.max(0, t), tl.total);
  const i = findClip(tl, t);
  const c = tl.clips[i];
  const prev = tl.clips[Math.max(0, i - 1)];
  const next = tl.clips[i + 1];
  const s = c.s;
  const lt = t - c.start;              // waktu di dalam klip (timeline)
  const local = c.in + lt * c.speed;   // waktu di dalam adegan sumber
  // klip hasil potongan yang bersambung dari adegan yang sama: tanpa transisi
  const continuous = i > 0 && prev.scene === c.scene && Math.abs(prev.out - c.in) < 0.01;

  const kPose = i === 0 || continuous ? 1 : ease(lt / 0.55);
  const pose = blendPose(prev.s.poseData, s.poseData, kPose);

  shotAt(s.shot, local / Math.max(c.out, 0.01), t, camB);
  let cam = camB;
  if (i > 0 && !continuous) {
    shotAt(prev.s.shot, 1, t, camA);
    const k = ease(lt / 0.9);
    camA.pos.lerp(camB.pos, k);
    camA.tgt.lerp(camB.tgt, k);
    camA.fov += (camB.fov - camA.fov) * k;
    cam = camA;
  }

  const moodPrev = secOf(prev.s).mood;
  const moodCur = secOf(s).mood;
  const kMood = moodPrev === moodCur ? 1 : ease(lt / 1.4);

  let propK = s.prop ? Math.min(1, local / 0.6) : 0;
  if (s.prop && i > 0 && prev.s.prop === s.prop) propK = 1;
  if (s.prop && next && next.s.prop !== s.prop) propK *= Math.min(1, (c.dur - lt) / 0.25);

  const fadeIn = (flag, wasFlag) => {
    const was = wasFlag && i > 0;
    if (flag) return was ? 1 : Math.min(1, lt / 0.8);
    return was ? Math.max(0, 1 - lt / 0.6) : 0;
  };

  return {
    i, c, s, t, local,
    dur: c.out,
    pose, cam,
    moodPrev, moodCur, kMood,
    prop: s.prop, propK,
    magicK: fadeIn(!!s.magic, !!prev.s.magic),
    throneK: fadeIn(s.isSit, prev.s.isSit),
    talking: !!s.sub && local > 0.15 && local < c.out - 0.3,
    kicker: s.title ? tl.ep.episodeLabel : (s.kicker ?? secOf(s).kicker)
  };
}
