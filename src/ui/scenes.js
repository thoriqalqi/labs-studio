// Panel kiri: daftar adegan episode + operasi adegan (tambah, duplikat, hapus, pindah).
import { newId, secOf } from '../timeline.js';
import { EXPRS, POSES } from '../catalog.js';
import { ask } from '../core/dialog.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function sceneIdOfSel(store, tl) {
  const s = store.sel;
  if (!s) return null;
  if (s.kind === 'scene') return s.id;
  if (s.kind === 'video') return tl.clips.find((c) => c.id === s.id)?.scene ?? null;
  return null;
}

export function createSceneOps({ store, getTl, seek, status }) {
  // klip baru disisipkan setelah klip terakhir dari adegan `afterSceneId`
  function insertClipAfter(d, afterSceneId, scene) {
    const v = d.timeline.video;
    let idx = -1;
    v.forEach((c, i) => { if (c.scene === afterSceneId) idx = i; });
    if (idx < 0) {
      const endIdx = v.findIndex((c) => d.scenes.find((s) => s.id === c.scene)?.end);
      idx = endIdx >= 0 ? endIdx - 1 : v.length - 1;
    }
    const clip = { id: newId('v'), scene: scene.id, in: 0, out: scene.dur, speed: 1 };
    v.splice(idx + 1, 0, clip);
    return clip;
  }

  function add(afterId) {
    store.mutate((d) => {
      const refIdx = afterId ? d.scenes.findIndex((s) => s.id === afterId) : d.scenes.findIndex((s) => s.end) - 1;
      const ref = d.scenes[Math.max(0, refIdx)];
      const scene = {
        id: newId('s'), dur: 4, sec: ref?.title ? 'h' : ref?.sec || 'h', expr: 'normal', pose: 'explain', shot: 'medium', prop: '',
        a: 'Teks baru', b: '', sub: '', sfx: []
      };
      const at = refIdx >= 0 ? refIdx + 1 : d.scenes.length;
      d.scenes.splice(at, 0, scene);
      const clip = insertClipAfter(d, ref?.id, scene);
      store.setSel({ kind: 'video', id: clip.id });
    });
    jumpToSel();
  }

  function duplicate(id) {
    store.mutate((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      if (i < 0) return;
      const scene = { ...structuredClone(d.scenes[i]), id: newId('s') };
      delete scene.title;
      delete scene.end;
      d.scenes.splice(i + 1, 0, scene);
      const clip = insertClipAfter(d, id, scene);
      store.setSel({ kind: 'video', id: clip.id });
    });
    jumpToSel();
  }

  async function remove(id) {
    const d = store.doc;
    if (d.scenes.length <= 1) return status('Episode butuh minimal satu adegan');
    const s = d.scenes.find((x) => x.id === id);
    if (!s || !(await ask(`Hapus adegan "${s.a}"? Klipnya di timeline ikut terhapus. Bisa di-undo.`, { ok: 'Hapus', danger: true }))) return;
    store.mutate((doc) => {
      doc.scenes = doc.scenes.filter((x) => x.id !== id);
      doc.timeline.video = doc.timeline.video.filter((c) => c.scene !== id);
      store.setSel(null);
    });
  }

  function move(id, dir) {
    store.mutate((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.scenes.length) return;
      [d.scenes[i], d.scenes[j]] = [d.scenes[j], d.scenes[i]];
    });
  }

  // adegan yang belum punya klip: tambahkan ke timeline setelah adegan sebelumnya
  function use(id) {
    store.mutate((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      const scene = d.scenes[i];
      let prev = null;
      for (let k = i - 1; k >= 0 && !prev; k--) if (d.timeline.video.some((c) => c.scene === d.scenes[k].id)) prev = d.scenes[k].id;
      const clip = insertClipAfter(d, prev, scene);
      store.setSel({ kind: 'video', id: clip.id });
    });
    jumpToSel();
  }

  function select(id) {
    const clip = getTl().clips.find((c) => c.scene === id);
    if (clip) {
      store.select({ kind: 'video', id: clip.id });
      seek(clip.start + 0.01);
    } else {
      store.select({ kind: 'scene', id });
    }
  }

  function jumpToSel() {
    const s = store.sel;
    const clip = s?.kind === 'video' && getTl().clips.find((c) => c.id === s.id);
    if (clip) seek(clip.start + 0.01);
  }

  return { add, duplicate, remove, move, use, select };
}

export function createScenesPanel(el, { store, getTl, ops }) {
  el.innerHTML = `
    <div class="panel-head"><span>Adegan <em class="count"></em></span><button type="button" data-act="add" title="Tambah adegan setelah yang dipilih">+ Adegan</button></div>
    <div class="scene-list" role="listbox" aria-label="Daftar adegan"></div>`;
  const list = el.querySelector('.scene-list');
  const count = el.querySelector('.count');

  function render() {
    const tl = getTl();
    const doc = store.doc;
    const current = sceneIdOfSel(store, tl);
    const used = new Set(tl.clips.map((c) => c.scene));
    count.textContent = doc.scenes.length;
    list.innerHTML = doc.scenes.map((s, i) => {
      const tag = s.title ? 'Judul' : s.end ? 'Penutup' : '';
      return `<button type="button" class="scene-item${s.id === current ? ' on' : ''}${used.has(s.id) ? '' : ' unused'}" data-id="${s.id}" role="option" aria-selected="${s.id === current}">
        <i style="background:${secOf(s).color}"></i>
        <span class="num">${i + 1}</span>
        <span class="txt"><b>${esc(s.a)}</b>${s.b ? ` <em>${esc(s.b)}</em>` : ''}
          <small>${tag ? `${tag} · ` : ''}${esc(EXPRS[s.expr]?.split(' ')[0] || s.expr)} · ${esc(POSES[s.pose] || s.pose)} · ${s.dur} dtk${used.has(s.id) ? '' : ' · tidak dipakai'}</small></span>
      </button>`;
    }).join('');
    list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-act=add]')) return ops.add(sceneIdOfSel(store, getTl()));
    const item = e.target.closest('.scene-item');
    if (item) ops.select(item.dataset.id);
  });

  return { render };
}
