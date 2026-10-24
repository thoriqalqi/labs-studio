// Panel timeline: klip video (adegan), penanda SFX, trek audio.
// Potong (S), hapus (Del), trim dengan menyeret tepi klip, geser & pindah trek,
// impor audio/video (tombol atau seret file).
import { findClip, newId, defaultVideo, secOf } from '../timeline.js';
import { ask } from '../core/dialog.js';

const HEAD = 92;
const RULER_H = 26;
const VIDEO_H = 56;
const SFX_H = 22;
const TRACK_H = 50;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const fmt1 = (x) => (Math.round(x * 100) / 100).toString();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createTimelinePanel(el, { store, getTl, getTime, seek, audio, status, onVoice, onVoiceScenes }) {
  let pps = 8;
  const waiting = new Set();

  el.innerHTML = `
    <div class="ed-toolbar">
      <button type="button" data-act="import" title="File audio, atau video (audionya saja yang diambil)">+ Impor audio / video</button>
      <input type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.mkv,.webm" multiple hidden>
      <button type="button" data-act="voice" title="Buat voice over ElevenLabs di posisi playhead">Voice over</button>
      <button type="button" data-act="voice-scenes" title="Buat voice over untuk semua adegan dari subtitle, lalu samakan durasinya">VO semua adegan</button>
      <button type="button" data-act="split" title="Potong di playhead (S)">Potong</button>
      <button type="button" data-act="dup" title="Duplikat klip (Ctrl+D)">Duplikat</button>
      <button type="button" data-act="delete" title="Hapus klip (Del)">Hapus</button>
      <span class="sep"></span>
      <button type="button" data-act="undo" title="Ctrl+Z">Undo</button>
      <button type="button" data-act="redo" title="Ctrl+Y">Redo</button>
      <span class="sep"></span>
      <label>Zoom <input type="range" data-ctl="zoom" min="2" max="80" step="1" value="8"></label>
      <label>SFX <input type="range" data-ctl="sfx" min="0" max="1.5" step="0.05"></label>
      <label><input type="checkbox" data-ctl="mute"> Bisukan SFX</label>
      <span class="sep"></span>
      <button type="button" data-act="reset" title="Susun ulang klip video sesuai urutan adegan">Susun ulang dari adegan</button>
    </div>
    <div class="ed-scroll"><div class="ed-content"></div></div>`;

  const $ = (q) => el.querySelector(q);
  const scroll = $('.ed-scroll');
  const content = $('.ed-content');
  const fileInput = $('input[type=file]');
  let playhead = null;

  const X = (t) => HEAD + t * pps;
  const tlData = () => store.doc.timeline;
  const sel = () => store.sel;

  function trackCount() {
    const max = tlData().audio.reduce((m, a) => Math.max(m, a.track), -1);
    return Math.max(2, max + 2);
  }

  function freeTrack(start, end) {
    const tl = getTl();
    for (let k = 0; k < 20; k++) {
      if (!tl.audio.some((a) => a.track === k && a.start < end && a.end > start)) return k;
    }
    return 0;
  }

  const bufferDuration = (url) => (audio.peaks(url) ? audio.peaks(url).length / 100 : null);

  // ---------- gambar ----------
  function render() {
    const tl = getTl();
    const p = tlData();
    const s = sel();
    const nT = trackCount();
    const end = Math.max(tl.total, ...tl.audio.map((a) => a.end), 10) + 20;
    const width = X(end);
    const height = RULER_H + VIDEO_H + SFX_H + nT * TRACK_H + 8;
    content.style.width = `${width}px`;
    content.style.height = `${height}px`;

    const step = pps >= 40 ? 1 : pps >= 16 ? 5 : pps >= 6 ? 10 : 30;
    let h = `<div class="ed-ruler" style="height:${RULER_H}px;width:${width}px">`;
    for (let t = 0; t <= end; t += step) h += `<div class="tick" style="left:${X(t)}px">${fmt(t)}</div>`;
    h += '</div>';

    const rows = [['Video', RULER_H, VIDEO_H], ['SFX', RULER_H + VIDEO_H, SFX_H]];
    for (let k = 0; k < nT; k++) rows.push([`Audio ${k + 1}`, RULER_H + VIDEO_H + SFX_H + k * TRACK_H, TRACK_H]);
    for (const [label, y, rh] of rows) {
      h += `<div class="row" style="top:${y}px;height:${rh}px;width:${width}px"><div class="row-head" style="height:${rh}px">${label}</div></div>`;
    }

    tl.clips.forEach((c, i) => {
      const on = s?.kind === 'video' && s.id === c.id;
      const label = `${c.s.index + 1}. ${c.s.a}${c.s.b ? ' ' + c.s.b : ''}`;
      h += `<div class="clip vclip${on ? ' sel' : ''}" data-kind="video" data-id="${c.id}" title="${esc(label)}"
        style="left:${X(c.start)}px;top:${RULER_H + 4}px;width:${Math.max(4, c.dur * pps - 1)}px;height:${VIDEO_H - 8}px;background:${secOf(c.s).color}">
        <div class="edge l" data-edge="l"></div><span>${esc(label)}</span>${c.speed !== 1 ? `<b class="spd">${fmt1(c.speed)}×</b>` : ''}<div class="edge r" data-edge="r"></div></div>`;
    });

    for (const q of tl.cues) {
      h += `<div class="cue" title="${esc(q.name)}" style="left:${X(q.time)}px;top:${RULER_H + VIDEO_H + 5}px"></div>`;
    }

    const y0 = RULER_H + VIDEO_H + SFX_H;
    for (const a of tl.audio) {
      const on = s?.kind === 'audio' && s.id === a.id;
      const w = Math.max(4, a.dur * pps);
      h += `<div class="clip aclip${on ? ' sel' : ''}" data-kind="audio" data-id="${a.id}" title="${esc(a.name)}"
        style="left:${X(a.start)}px;top:${y0 + a.track * TRACK_H + 4}px;width:${w}px;height:${TRACK_H - 8}px">
        <canvas class="wave" width="${Math.min(Math.ceil(w), 16000)}" height="${TRACK_H - 8}"></canvas>
        <div class="edge l" data-edge="l"></div><span>${esc(a.name)}${a.speed !== 1 ? ` · ${fmt1(a.speed)}×` : ''}${a.volume !== 1 ? ` · ${Math.round(a.volume * 100)}%` : ''}</span><div class="edge r" data-edge="r"></div></div>`;
    }
    h += `<div class="ed-playhead" style="height:${height}px"></div>`;
    content.innerHTML = h;
    playhead = content.querySelector('.ed-playhead');

    content.querySelectorAll('.aclip').forEach((node) => {
      const a = tl.audio.find((x) => x.id === node.dataset.id);
      const peaks = audio.peaks(a.url);
      if (!peaks) {
        if (!waiting.has(a.url)) {
          waiting.add(a.url);
          audio.getBuffer(a.url).then(() => render());
        }
        return;
      }
      const cv = node.querySelector('canvas');
      const g = cv.getContext('2d');
      g.fillStyle = 'rgba(255,255,255,0.45)';
      const H = cv.height;
      for (let x = 0; x < cv.width; x++) {
        const v = peaks[Math.floor((a.in + (x / pps) * a.speed) * 100)] || 0;
        const bh = Math.max(1, v * H * 0.9);
        g.fillRect(x, (H - bh) / 2, 1, bh);
      }
    });

    el.querySelector('[data-ctl=sfx]').value = p.sfxVolume ?? 1;
    el.querySelector('[data-ctl=mute]').checked = !!p.sfxMuted;
    setTime(getTime(), false);
  }

  // ---------- aksi (juga dipakai inspector) ----------
  function split() {
    const t = getTime();
    const tl = getTl();
    const s = sel();
    if (s?.kind === 'audio') {
      const a = tl.audio.find((x) => x.id === s.id);
      if (!a || t <= a.start + 0.05 || t >= a.end - 0.05) return status('Taruh playhead di dalam klip audio yang dipilih');
      return store.mutate((d) => {
        const it = d.timeline.audio.find((x) => x.id === a.id);
        const cut = it.in + (t - it.start) * it.speed;
        const b = { ...it, id: newId('a'), in: cut, start: t };
        it.out = cut;
        d.timeline.audio.splice(d.timeline.audio.indexOf(it) + 1, 0, b);
        store.setSel({ kind: 'audio', id: b.id });
      });
    }
    const c = tl.clips[findClip(tl, t)];
    const lt = t - c.start;
    if (lt < 0.05 || lt > c.dur - 0.05) return status('Playhead terlalu dekat tepi klip');
    store.mutate((d) => {
      const it = d.timeline.video.find((x) => x.id === c.id);
      if (!it) return;
      const cut = it.in + lt * it.speed;
      const b = { ...it, id: newId('v'), in: cut };
      it.out = cut;
      d.timeline.video.splice(d.timeline.video.indexOf(it) + 1, 0, b);
      store.setSel({ kind: 'video', id: b.id });
    });
  }

  function remove() {
    const s = sel();
    if (!s) return;
    store.mutate((d) => {
      const list = s.kind === 'video' ? d.timeline.video : d.timeline.audio;
      if (s.kind === 'video' && list.length <= 1) return;
      const idx = list.findIndex((x) => x.id === s.id);
      if (idx >= 0) list.splice(idx, 1);
      store.setSel(null);
    });
  }

  function duplicate() {
    const s = sel();
    if (!s) return;
    store.mutate((d) => {
      const list = s.kind === 'video' ? d.timeline.video : d.timeline.audio;
      const it = list.find((x) => x.id === s.id);
      if (!it) return;
      if (s.kind === 'video') {
        const b = { ...it, id: newId('v') };
        list.splice(list.indexOf(it) + 1, 0, b);
        store.setSel({ kind: 'video', id: b.id });
      } else {
        const b = { ...it, id: newId('a'), start: it.start + (it.out - it.in) / it.speed };
        list.push(b);
        store.setSel({ kind: 'audio', id: b.id });
      }
    });
  }

  async function importFiles(files, at) {
    for (const f of files) {
      const isVideo = /^video\//.test(f.type) || /\.(mp4|mov|mkv|avi|m4v|3gp)$/i.test(f.name);
      if (!isVideo && !/^audio\//.test(f.type) && !/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(f.name)) {
        status(`${f.name} bukan file audio atau video`);
        continue;
      }
      status(isVideo ? `Mengambil audio dari ${f.name}…` : `Mengunggah ${f.name}…`);
      try {
        const res = await fetch(`/api/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
        const { url, error } = await res.json();
        if (error) {
          status(`${f.name}: ${error}`);
          continue;
        }
        const buf = await audio.getBuffer(url);
        if (!buf) {
          status(`Gagal membaca ${f.name}`);
          continue;
        }
        store.mutate((d) => {
          const a = { id: newId('a'), url, name: isVideo ? `${f.name} (audio)` : f.name, track: freeTrack(at, at + buf.duration), start: at, in: 0, out: buf.duration, speed: 1, volume: 1 };
          d.timeline.audio.push(a);
          store.setSel({ kind: 'audio', id: a.id });
        });
        status(`${f.name} ditambahkan di ${fmt(at)}`);
      } catch (err) {
        status(`Gagal mengunggah ${f.name}: ${err.message}`);
      }
    }
  }

  // ---------- interaksi ----------
  const timeAt = (clientX) => Math.max(0, (clientX - content.getBoundingClientRect().left - HEAD) / pps);

  function snapTime(v, exclude) {
    const tl = getTl();
    const cands = [0, getTime(), ...tl.clips.map((c) => c.start), tl.total];
    for (const a of tl.audio) if (a.id !== exclude) cands.push(a.start, a.end);
    for (const c of cands) if (Math.abs(c - v) * pps < 7) return c;
    return v;
  }

  function drag(onMove, onUp) {
    const mv = (e) => onMove(e);
    const up = (e) => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      onUp?.(e);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  }

  content.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const clipEl = e.target.closest('.clip');
    if (!clipEl) {
      if (e.target.closest('.row-head')) return;
      seek(timeAt(e.clientX));
      if (store.sel) store.select(null);
      drag((ev) => seek(timeAt(ev.clientX)));
      return;
    }
    e.preventDefault();
    const kind = clipEl.dataset.kind;
    const id = clipEl.dataset.id;
    store.select({ kind, id });

    const edge = e.target.dataset.edge;
    const d = store.doc;
    const list = kind === 'video' ? d.timeline.video : d.timeline.audio;
    const item = list.find((x) => x.id === id);
    if (!item) return;
    const orig = { ...item };
    const before = store.snapshot();
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    const node = () => content.querySelector(`.clip[data-id="${id}"]`);

    drag((ev) => {
      const dxPx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (!moved && Math.abs(dxPx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      const dx = dxPx / pps;
      if (kind === 'audio') {
        const maxOut = bufferDuration(orig.url) ?? orig.out;
        if (edge === 'l') {
          let dd = clamp(dx, -orig.in / orig.speed, (orig.out - orig.in - 0.1) / orig.speed);
          dd = Math.max(dd, -orig.start);
          dd = snapTime(orig.start + dd, id) - orig.start;
          item.in = orig.in + dd * orig.speed;
          item.start = orig.start + dd;
        } else if (edge === 'r') {
          const endT = snapTime(orig.start + (orig.out - orig.in) / orig.speed + dx, id);
          item.out = clamp(orig.in + (endT - orig.start) * orig.speed, orig.in + 0.1, maxOut);
        } else {
          let st = Math.max(0, orig.start + dx);
          const len = (orig.out - orig.in) / orig.speed;
          const snapped = snapTime(st, id);
          st = snapped !== st ? snapped : snapTime(st + len, id) - len;
          item.start = Math.max(0, st);
          item.track = clamp(orig.track + Math.round(dy / TRACK_H), 0, 19);
        }
      } else {
        const sceneDur = getTl().byId.get(item.scene)?.dur ?? orig.out;
        if (edge === 'l') item.in = clamp(orig.in + dx * orig.speed, 0, orig.out - 0.3);
        else if (edge === 'r') item.out = clamp(orig.out + dx * orig.speed, orig.in + 0.3, sceneDur + 30);
        else {
          const n = node();
          if (n) {
            n.style.transform = `translateX(${dxPx}px)`;
            n.style.zIndex = 6;
            n.style.opacity = 0.85;
          }
          return;
        }
      }
      store.preview();
    }, (ev) => {
      if (!moved) return;
      if (kind === 'video' && !edge) {
        const tl = getTl();
        const c = tl.clips.find((x) => x.id === id);
        const center = c.start + c.dur / 2 + (ev.clientX - x0) / pps;
        const rest = d.timeline.video.filter((x) => x.id !== id);
        let acc = 0;
        let idx = rest.length;
        for (let k = 0; k < rest.length; k++) {
          const dd = tl.clips.find((x) => x.id === rest[k].id)?.dur ?? 0;
          if (center < acc + dd / 2) { idx = k; break; }
          acc += dd;
        }
        rest.splice(idx, 0, item);
        d.timeline.video.splice(0, d.timeline.video.length, ...rest);
      }
      store.commit(before);
    });
  });

  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'import') fileInput.click();
    if (act === 'voice') onVoice?.();
    if (act === 'voice-scenes') onVoiceScenes?.();
    if (act === 'split') split();
    if (act === 'delete') remove();
    if (act === 'dup') duplicate();
    if (act === 'undo') store.undo();
    if (act === 'redo') store.redo();
    if (act === 'reset' && (await ask('Susun ulang klip video: satu klip per adegan, sesuai urutan di panel Adegan. Potongan, trim, dan kecepatan klip video akan hilang (klip audio tetap). Bisa di-undo.', { ok: 'Susun ulang' }))) {
      store.mutate((d) => {
        d.timeline.video = defaultVideo(d.scenes);
        store.setSel(null);
      });
    }
  });

  el.querySelector('[data-ctl=zoom]').addEventListener('input', (e) => {
    const center = (scroll.scrollLeft + scroll.clientWidth / 2 - HEAD) / pps;
    pps = parseFloat(e.target.value);
    render();
    scroll.scrollLeft = center * pps + HEAD - scroll.clientWidth / 2;
  });
  el.querySelector('[data-ctl=sfx]').addEventListener('change', (e) => store.mutate((d) => { d.timeline.sfxVolume = parseFloat(e.target.value); }));
  el.querySelector('[data-ctl=mute]').addEventListener('change', (e) => store.mutate((d) => { d.timeline.sfxMuted = e.target.checked; }));

  fileInput.addEventListener('change', () => {
    importFiles([...fileInput.files], getTime());
    fileInput.value = '';
  });
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('drop');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drop');
    const at = e.target.closest('.ed-content') ? timeAt(e.clientX) : getTime();
    importFiles([...e.dataTransfer.files], at);
  });

  function setTime(t, follow) {
    if (!playhead) return;
    const x = X(t);
    playhead.style.transform = `translateX(${x}px)`;
    if (follow && (x > scroll.scrollLeft + scroll.clientWidth - 40 || x < scroll.scrollLeft + HEAD)) {
      scroll.scrollLeft = x - HEAD - 40;
    }
  }

  return { render, setTime, split, remove, duplicate, importFiles };
}
