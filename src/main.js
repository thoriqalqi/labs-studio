import * as THREE from 'three';
import { createCharacter } from './character.js';
import { createWorld } from './world.js';
import { buildTimeline, sample, findClip, newId } from './timeline.js';
import { createOverlay, OUT_W, OUT_H } from './overlay.js';
import { createAudio } from './audio.js';
import { createStore } from './store.js';
import { createExporter } from './exporter.js';
import { createTimelinePanel } from './ui/timelinePanel.js';
import { createSceneOps, createScenesPanel } from './ui/scenes.js';
import { createInspector } from './ui/inspector.js';
import { createEpisodeBar, openEpisode } from './ui/episodes.js';
import { savePoster } from './core/exportVideo.js';
import { voiceAtPlayhead, voiceAllScenes } from './ui/voiceScenes.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

// ---------- mesin 3D ----------
const stage = $('stage');
const overlay = createOverlay(stage);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(OUT_W, OUT_H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, OUT_W / OUT_H, 0.1, 120);
const world = createWorld(scene);
const hero = createCharacter();
scene.add(hero.root);
const engine = { renderer, scene, camera, hero, world };

const audio = createAudio();
const store = createStore();
let tl = null;

let t = parseFloat(params.get('t') || '0');
let playing = false;
let busy = false;
let still = false; // thumbnail/banner sedang ditampilkan
let subtitles = true;

function renderAt(time) {
  const st = sample(tl, time);
  hero.setPose(st.pose);
  hero.update(time, { talking: st.talking });
  hero.updateFace(time, { expr: st.s.expr, talking: st.talking });
  world.applyMood(st.moodPrev, st.moodCur, st.kMood);
  world.update(time, { magicK: st.magicK, throneK: st.throneK });
  world.props.show(st.prop, st.propK, time);
  camera.position.copy(st.cam.pos);
  camera.fov = st.cam.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(st.cam.tgt);
  renderer.render(scene, camera);
  overlay.draw(renderer.domElement, st, { subtitles });
  return st;
}

function rebuild() {
  tl = buildTimeline(store.doc);
  audio.setTimeline(tl);
  $('seek').max = tl.total.toFixed(2);
  t = Math.min(t, tl.total);
  if (playing) audio.play(t);
}

// ---------- status & simpan ----------
const status = (msg) => { $('status').textContent = msg; };
let saveTimer = null;
let posterTimer = null;
function save() {
  clearTimeout(saveTimer);
  $('save-status').textContent = 'Menyimpan…';
  const doc = store.doc;
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/episodes/${doc.id}`, { method: 'POST', body: JSON.stringify(doc) });
      if (!res.ok) throw new Error();
      $('save-status').textContent = 'Tersimpan';
    } catch {
      $('save-status').textContent = 'Gagal menyimpan';
    }
  }, 500);
  clearTimeout(posterTimer);
  posterTimer = setTimeout(posterNow, 2500);
}

// poster kartu beranda: frame adegan kedua (setelah kartu judul)
function posterNow() {
  if (busy || playing || still) return;
  const c = tl.clips[Math.min(1, tl.clips.length - 1)];
  renderAt(c.start + Math.min(2, c.dur * 0.6));
  savePoster(stage, 'episodes', store.doc.id);
}

// ---------- transport ----------
function setPlaying(p) {
  if (busy) return;
  playing = p;
  still = false;
  if (p) {
    if (t >= tl.total - 0.05) t = 0;
    audio.play(t);
  } else {
    audio.stop();
  }
}

function seekTo(x) {
  still = false;
  t = Math.min(Math.max(0, x), tl.total);
  if (playing) audio.play(t);
}

function jump(delta) {
  const i = findClip(tl, t);
  const c = tl.clips[i];
  const target = delta < 0 && t - c.start > 1 ? i : i + delta;
  seekTo(tl.clips[Math.max(0, Math.min(tl.clips.length - 1, target))].start);
}

function updateUI(st) {
  $('seek').value = t.toFixed(2);
  $('time').textContent = `${fmt(t)} / ${fmt(tl.total)}`;
  $('clip-info').textContent = `Adegan ${st.s.index + 1} · klip ${st.i + 1}/${tl.clips.length}`;
  $('play').textContent = playing ? 'Jeda' : 'Putar';
  timelinePanel.setTime(t, playing);
}

$('play').onclick = () => setPlaying(!playing);
$('prev').onclick = () => jump(-1);
$('next').onclick = () => jump(1);
$('subs').onchange = (e) => { subtitles = e.target.checked; still = false; };
$('seek').oninput = () => seekTo(parseFloat($('seek').value));

// ---------- panel ----------
const timelinePanel = createTimelinePanel($('timeline'), {
  store, getTl: () => tl, getTime: () => t, seek: seekTo, audio, status,
  onVoice: () => voiceAtPlayhead({ store, audio, getTime: () => t, status }),
  onVoiceScenes: () => voiceAllScenes({ store, audio, getTl: () => tl, status })
});
const ops = createSceneOps({ store, getTl: () => tl, seek: seekTo, status });
const scenesPanel = createScenesPanel($('scenes'), { store, getTl: () => tl, ops });
const inspector = createInspector($('inspector'), { store, getTl: () => tl, timeline: timelinePanel, ops, audio });

store.on((kind) => {
  if (kind !== 'select') rebuild();
  timelinePanel.render();
  if (kind !== 'preview') {
    scenesPanel.render();
    inspector.render();
  }
  if (kind === 'change') save();
  $('undo').disabled = !store.canUndo;
  $('redo').disabled = !store.canRedo;
});

$('undo').onclick = () => store.undo();
$('redo').onclick = () => store.redo();

window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if ((tag === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox') || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (document.querySelector('dialog[open]')) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  else if (e.code === 'ArrowRight') jump(1);
  else if (e.code === 'ArrowLeft') jump(-1);
  else if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); }
  else if (ctrl && k === 'd') { e.preventDefault(); timelinePanel.duplicate(); }
  else if (!ctrl && k === 's') timelinePanel.split();
  else if (e.key === 'Delete') timelinePanel.remove();
  else if (e.key === 'Escape') store.select(null);
});

// ---------- ekspor ----------
const exporter = createExporter({
  engine, stage, renderAt,
  getTl: () => tl,
  getDoc: () => store.doc,
  audio, status,
  setTime: (x) => { t = x; },
  busy: {
    get: () => busy,
    set: (b) => {
      if (b) setPlaying(false);
      busy = b;
      document.body.classList.toggle('exporting', b);
    }
  }
});
$('export-video').onclick = () => exporter.video(parseInt($('fps').value, 10), parseFloat(params.get('until')) || 0);
$('export-audio').onclick = () => exporter.audioOnly();
$('export-thumb').onclick = () => { still = true; exporter.thumbnail(); };
$('export-brand').onclick = () => { still = true; exporter.branding(); };

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (!busy && !still) {
    if (playing) {
      const at = audio.now();
      t = at ?? t + dt;
      if (t >= tl.total) {
        t = tl.total;
        setPlaying(false);
      }
    }
    updateUI(renderAt(t));
  }
  requestAnimationFrame(loop);
}

// ---------- mulai ----------
(async () => {
  await Promise.all([
    document.fonts.load('800 100px "Baloo 2"'),
    document.fonts.load('600 36px "Plus Jakarta Sans"'),
    document.fonts.load('700 28px "Plus Jakarta Sans"')
  ]);
  const found = await audio.load();

  const list = await (await fetch('/api/episodes')).json();
  let last = null;
  try { last = localStorage.getItem('mu-last-ep'); } catch {}
  const wanted = params.get('ep') || last;
  const id = list.some((e) => e.id === wanted) ? wanted : list[0]?.id;
  if (!id) {
    status('Belum ada episode. Klik "+ Episode baru".');
    return;
  }
  const doc = await (await fetch(`/api/episodes/${id}`)).json();
  try { localStorage.setItem('mu-last-ep', id); } catch {}

  // public/audio/vo.mp3 yang ditaruh manual: masukkan sekali ke trek Audio 1
  if (found.vo && !doc.timeline.voAdded && !doc.timeline.audio.some((a) => a.url === '/audio/vo.mp3')) {
    doc.timeline.audio.push({ id: newId('a'), url: '/audio/vo.mp3', name: 'vo.mp3', track: 0, start: 6, in: 0, out: found.vo.duration, speed: 1, volume: 1 });
    doc.timeline.voAdded = true;
  }

  document.title = `${doc.title} · Labs Studio`;
  store.load(doc);
  createEpisodeBar({
    select: $('ep-select'), btnNew: $('ep-new'), btnDup: $('ep-dup'), btnDel: $('ep-del'),
    dialog: $('new-ep'), list, getDoc: () => store.doc, status
  });
  $('save-status').textContent = 'Tersimpan';
  requestAnimationFrame(loop);
  setTimeout(posterNow, 1500);
})();

// akses dari konsol untuk debug
window.studio = { store, renderAt, audio, get tl() { return tl; }, setT: (x) => { t = x; still = false; updateUI(renderAt(t)); }, openEpisode };
