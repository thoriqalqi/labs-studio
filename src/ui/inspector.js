// Panel kanan: atur adegan, klip, audio, atau episode (bila tidak ada yang dipilih).
import { SECTIONS } from '../timeline.js';
import { EXPRS, POSES, SHOTS_LABEL, PROPS, MOODS_LABEL, SFX_LIST, parseSfx, formatSfx } from '../catalog.js';
import { sceneIdOfSel } from './scenes.js';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const fmt1 = (x) => (Math.round(x * 100) / 100).toString();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const text = (label, attr, value, ph = '') =>
  `<label class="f"><span>${label}</span><input type="text" ${attr} value="${esc(value)}" placeholder="${esc(ph)}"></label>`;
const area = (label, attr, value, rows = 3) =>
  `<label class="f"><span>${label}</span><textarea ${attr} rows="${rows}">${esc(value)}</textarea></label>`;
const num = (label, attr, value, extra = '') =>
  `<label class="f"><span>${label}</span><input type="number" ${attr} value="${fmt1(value)}" ${extra}></label>`;
const select = (label, attr, options, value) =>
  `<label class="f"><span>${label}</span><select ${attr}>${Object.entries(options).map(([k, v]) => `<option value="${k}"${k === value ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
const check = (label, attr, on) => `<label class="chk"><input type="checkbox" ${attr}${on ? ' checked' : ''}> ${label}</label>`;
const speedBtns = (attr, cur) =>
  `<div class="presets">${SPEEDS.map((s) => `<button type="button" data-speed="${s}" data-for="${attr}" class="${s === cur ? 'on' : ''}">${s}×</button>`).join('')}</div>`;

const SECTION_OPTS = Object.fromEntries(Object.entries(SECTIONS).map(([k, v]) => [k, v.name]));

export function createInspector(el, { store, getTl, timeline, ops, audio }) {
  function render() {
    // pertahankan fokus input saat panel digambar ulang
    const active = document.activeElement;
    const focusAttr = active && el.contains(active)
      ? ['data-s', 'data-c', 'data-a', 'data-e', 'data-th'].find((a) => active.hasAttribute(a))
      : null;
    const focusSel = focusAttr ? `[${focusAttr}="${active.getAttribute(focusAttr)}"]` : null;

    const tl = getTl();
    const s = store.sel;
    let html = '';
    if (s?.kind === 'audio') html = audioHtml(tl.audio.find((a) => a.id === s.id));
    else if (s?.kind === 'video' || s?.kind === 'scene') {
      const sceneId = sceneIdOfSel(store, tl);
      const scene = store.doc.scenes.find((x) => x.id === sceneId);
      const clip = s.kind === 'video' ? tl.clips.find((c) => c.id === s.id) : null;
      html = scene ? sceneHtml(scene, clip, tl) : '';
    }
    el.innerHTML = html || episodeHtml(tl);
    if (focusSel) el.querySelector(focusSel)?.focus();
  }

  function sceneHtml(scene, clip, tl) {
    const index = store.doc.scenes.indexOf(scene);
    const kind = scene.title ? 'title' : scene.end ? 'end' : 'normal';
    const clipCount = tl.clips.filter((c) => c.scene === scene.id).length;
    const sfx = (scene.sfx || []).map(parseSfx);
    return `
      <div class="insp-head">
        <div class="title">Adegan ${index + 1}</div>
        <div class="sub">${clip ? `Klip mulai ${fmt(clip.start)}` : 'Belum ada di timeline'}${clipCount > 1 ? ` · dipakai ${clipCount} klip` : ''}</div>
      </div>
      <section><h4>Teks</h4>
        ${text('Teks besar', 'data-s="a"', scene.a)}
        ${text('Teks aksen (amber)', 'data-s="b"', scene.b)}
        ${area('Subtitle', 'data-s="sub"', scene.sub)}
        ${text('Label kecil', 'data-s="kicker"', scene.kicker ?? '', `bawaan: ${SECTIONS[scene.sec]?.kicker || '(kosong)'}`)}
      </section>
      <section><h4>Gaya</h4>
        <div class="grid2">
          ${select('Bagian', 'data-s="sec"', SECTION_OPTS, scene.sec)}
          ${select('Jenis', 'data-s="kind"', { normal: 'Adegan biasa', title: 'Kartu judul', end: 'Kartu penutup' }, kind)}
          ${select('Ekspresi', 'data-s="expr"', EXPRS, scene.expr)}
          ${select('Pose', 'data-s="pose"', POSES, scene.pose)}
          ${select('Kamera', 'data-s="shot"', SHOTS_LABEL, scene.shot)}
          ${select('Properti', 'data-s="prop"', PROPS, scene.prop || '')}
        </div>
        ${check('Efek sihir (pusaran + bidak melayang)', 'data-s="magic"', !!scene.magic)}
      </section>
      <section><h4>Waktu</h4>
        ${num('Durasi adegan (dtk)', 'data-s="dur"', scene.dur, 'min="0.5" max="60" step="0.5"')}
      </section>
      <section><h4>SFX</h4>
        ${sfx.map((q, i) => `
          <div class="sfx-row">
            <select data-sfx="${i}" data-k="name" aria-label="Jenis SFX">${Object.entries(SFX_LIST).map(([k, v]) => `<option value="${k}"${k === q.name ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>
            <input type="number" data-sfx="${i}" data-k="at" value="${q.at}" min="0" step="0.1" title="Mulai (detik di adegan)" aria-label="Mulai detik">
            <input type="number" data-sfx="${i}" data-k="count" value="${q.count}" min="1" max="20" step="1" title="Ulang" aria-label="Jumlah ulang">
            <button type="button" data-sfx-del="${i}" aria-label="Hapus SFX">×</button>
          </div>`).join('') || '<div class="meta">Belum ada SFX.</div>'}
        <button type="button" data-act="sfx-add" class="small">+ SFX</button>
      </section>
      <div class="acts">
        <button type="button" data-act="scene-add">+ Adegan setelah ini</button>
        <button type="button" data-act="scene-dup">Duplikat adegan</button>
        <button type="button" data-act="scene-up" aria-label="Pindah ke atas">↑</button>
        <button type="button" data-act="scene-down" aria-label="Pindah ke bawah">↓</button>
        ${clip ? '' : '<button type="button" data-act="scene-use" class="primary">Tambahkan ke timeline</button>'}
        <button type="button" data-act="scene-del" class="danger">Hapus adegan</button>
      </div>
      ${clip ? `
      <section class="clip-sec"><h4>Klip di timeline</h4>
        ${num('Kecepatan (×)', 'data-c="speed"', clip.speed, 'min="0.25" max="4" step="0.05"')}
        ${speedBtns('c', clip.speed)}
        <div class="grid2">
          ${num('Mulai di adegan', 'data-c="in"', clip.in, 'min="0" step="0.1"')}
          ${num('Akhir di adegan', 'data-c="out"', clip.out, 'min="0" step="0.1"')}
        </div>
        <div class="meta">Durasi di video: <b>${fmt1(clip.dur)} dtk</b></div>
        <div class="acts">
          <button type="button" data-act="split">Potong (S)</button>
          <button type="button" data-act="clip-dup">Duplikat klip</button>
          <button type="button" data-act="clip-del" class="danger">Hapus klip</button>
        </div>
      </section>` : ''}`;
  }

  function audioHtml(a) {
    if (!a) return '';
    return `
      <div class="insp-head"><div class="title">${esc(a.name)}</div><div class="sub">Audio · trek ${a.track + 1}</div></div>
      <section>
        <div class="grid2">
          ${num('Mulai (dtk)', 'data-a="start"', a.start, 'min="0" step="0.1"')}
          ${num('Kecepatan (×)', 'data-a="speed"', a.speed, 'min="0.25" max="4" step="0.05"')}
        </div>
        ${speedBtns('a', a.speed)}
        <label class="f"><span>Volume ${Math.round(a.volume * 100)}%</span><input type="range" data-a="volume" min="0" max="2" step="0.05" value="${a.volume}"></label>
        <div class="grid2">
          ${num('Trim awal (dtk)', 'data-a="in"', a.in, 'min="0" step="0.1"')}
          ${num('Trim akhir (dtk)', 'data-a="out"', a.out, 'min="0" step="0.1"')}
        </div>
        <div class="meta">Durasi: <b>${fmt1(a.dur)} dtk</b> · selesai ${fmt(a.end)}</div>
        <div class="meta">Kecepatan juga mengubah nada suara.</div>
      </section>
      <div class="acts">
        <button type="button" data-act="split">Potong (S)</button>
        <button type="button" data-act="clip-dup">Duplikat</button>
        <button type="button" data-act="clip-del" class="danger">Hapus</button>
      </div>`;
  }

  function episodeHtml(tl) {
    const d = store.doc;
    const th = d.thumbnail || {};
    return `
      <div class="insp-head"><div class="title">Episode</div><div class="sub">${d.scenes.length} adegan · ${fmt(tl.total)}</div></div>
      <section>
        ${text('Judul', 'data-e="title"', d.title)}
        ${text('Label episode', 'data-e="episodeLabel"', d.episodeLabel)}
      </section>
      <section><h4>Thumbnail</h4>
        ${area('Baris teks (satu baris per baris)', 'data-th="lines"', (th.lines || []).join('\n'), 3)}
        ${num('Warna amber mulai baris ke-', 'data-th="accentFrom"', (th.accentFrom ?? 1) + 1, 'min="1" max="5" step="1"')}
        ${text('Label kecil di atas judul', 'data-th="chip"', th.chip || '', 'kosongkan bila tidak perlu')}
        <div class="grid2">
          ${select('Ekspresi', 'data-th="expr"', EXPRS, th.expr || 'sinis')}
          ${select('Pose', 'data-th="pose"', POSES, th.pose || 'point')}
          ${select('Properti', 'data-th="prop"', PROPS, th.prop || '')}
          ${select('Suasana', 'data-th="mood"', MOODS_LABEL, th.mood || 'tegas')}
        </div>
      </section>
      <div class="hint"><b>Pintasan</b><br>Spasi putar/jeda · ← → pindah klip<br>S potong · Del hapus · Ctrl+D duplikat<br>Ctrl+Z / Ctrl+Y undo / redo<br>Klik adegan di kiri untuk mengedit isinya.</div>`;
  }

  // ---------- perubahan ----------
  function sceneOf(d) {
    const id = sceneIdOfSel(store, getTl());
    return d.scenes.find((x) => x.id === id);
  }

  function setScene(field, input) {
    store.mutate((d) => {
      const s = sceneOf(d);
      if (!s) return;
      const v = input.type === 'checkbox' ? input.checked : input.value;
      if (field === 'dur') {
        const nd = clamp(parseFloat(v) || s.dur, 0.5, 60);
        // klip yang memakai seluruh adegan ikut memanjang/memendek
        for (const c of d.timeline.video) {
          if (c.scene !== s.id) continue;
          if (Math.abs(c.out - s.dur) < 0.01) c.out = nd;
          c.out = Math.max(c.in + 0.3, c.out);
        }
        s.dur = nd;
      } else if (field === 'kind') {
        delete s.title;
        delete s.end;
        if (v === 'title') s.title = true;
        if (v === 'end') s.end = true;
      } else if (field === 'magic') {
        if (v) s.magic = true;
        else delete s.magic;
      } else if (field === 'kicker') {
        if (v.trim()) s.kicker = v;
        else delete s.kicker;
      } else {
        s[field] = v;
      }
    });
  }

  function setClip(field, raw) {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return render();
    const s = store.sel;
    store.mutate((d) => {
      const audioMode = s.kind === 'audio';
      const it = (audioMode ? d.timeline.audio : d.timeline.video).find((x) => x.id === s.id);
      if (!it) return;
      if (field === 'speed') it.speed = clamp(v, 0.25, 4);
      if (field === 'volume') it.volume = clamp(v, 0, 2);
      if (field === 'start') it.start = Math.max(0, v);
      if (field === 'in') it.in = clamp(v, 0, it.out - 0.1);
      if (field === 'out') {
        const peaks = audioMode && audio.peaks(it.url);
        const max = audioMode ? (peaks ? peaks.length / 100 : it.out) : (getTl().byId.get(it.scene)?.dur ?? it.out) + 30;
        it.out = clamp(v, it.in + 0.1, max);
      }
    });
  }

  function setEpisode(field, input) {
    store.mutate((d) => {
      if (input.hasAttribute('data-e')) d[field] = input.value;
      else {
        d.thumbnail = d.thumbnail || {};
        if (field === 'lines') d.thumbnail.lines = input.value.split('\n').map((l) => l.trim()).filter(Boolean);
        else if (field === 'accentFrom') d.thumbnail.accentFrom = Math.max(0, (parseInt(input.value, 10) || 1) - 1);
        else d.thumbnail[field] = input.value;
      }
    });
  }

  function setSfx(i, key, value, removeIt = false) {
    store.mutate((d) => {
      const s = sceneOf(d);
      if (!s) return;
      const list = (s.sfx || []).map(parseSfx);
      if (removeIt) list.splice(i, 1);
      else if (key === 'name') list[i].name = value;
      else if (key === 'at') list[i].at = Math.max(0, parseFloat(value) || 0);
      else if (key === 'count') list[i].count = clamp(parseInt(value, 10) || 1, 1, 20);
      s.sfx = list.map(formatSfx);
    });
  }

  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.s) return setScene(t.dataset.s, t);
    if (t.dataset.c) return setClip(t.dataset.c, t.value);
    if (t.dataset.a) return setClip(t.dataset.a, t.value);
    if (t.dataset.e || t.dataset.th) return setEpisode(t.dataset.e || t.dataset.th, t);
    if (t.dataset.sfx) return setSfx(parseInt(t.dataset.sfx, 10), t.dataset.k, t.value);
  });

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.speed) return setClip('speed', b.dataset.speed);
    if (b.dataset.sfxDel) return setSfx(parseInt(b.dataset.sfxDel, 10), null, null, true);
    const id = sceneIdOfSel(store, getTl());
    switch (b.dataset.act) {
      case 'sfx-add':
        return store.mutate((d) => { const s = sceneOf(d); if (s) s.sfx = [...(s.sfx || []), 'pop']; });
      case 'scene-add': return ops.add(id);
      case 'scene-dup': return ops.duplicate(id);
      case 'scene-del': return ops.remove(id);
      case 'scene-up': return ops.move(id, -1);
      case 'scene-down': return ops.move(id, 1);
      case 'scene-use': return ops.use(id);
      case 'split': return timeline.split();
      case 'clip-dup': return timeline.duplicate();
      case 'clip-del': return timeline.remove();
    }
  });

  return { render };
}
