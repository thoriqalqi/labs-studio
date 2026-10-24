// Timeline layer: satu baris per layer (paling atas = paling depan), batang waktu bisa
// digeser & di-trim, titik ◆ = keyframe (klik untuk lompat). Klik penggaris = pindah waktu.
import { getLayerDef } from '../registry.js';
import { allKeyTimes } from '../keys.js';

const HEAD = 210;
const RULER_H = 26;
const ROW_H = 34;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ikon garis sederhana (stroke = warna teks tombol)
const svg = (d) => `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TOOLS = [
  ['split', 'Potong di playhead (S)', svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>')],
  ['dup', 'Duplikat (Ctrl+D)', svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>')],
  ['up', 'Bawa ke depan (Ctrl+])', svg('<path d="M12 19V5M5 12l7-7 7 7"/>')],
  ['down', 'Kirim ke belakang (Ctrl+[)', svg('<path d="M12 5v14M19 12l-7 7-7-7"/>')],
  ['delete', 'Hapus (Del)', svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>')]
];

export function createTimeline(el, { store, getTime, seek, audio, actions }) {
  let pps = 60;
  el.innerHTML = `
    <div class="ed-toolbar">
      <label>Zoom <input type="range" data-ctl="zoom" min="5" max="300" step="1" value="60"></label>
      <span class="sep"></span>
      <div class="tools" role="toolbar" aria-label="Aksi layer">
        ${TOOLS.map(([act, label, icon]) => `<button type="button" class="tool${act === 'delete' ? ' danger' : ''}" data-tool="${act}" title="${label}" aria-label="${label}">${icon}</button>`).join('')}
      </div>
    </div>
    <div class="ed-scroll"><div class="ed-content mt"></div></div>`;
  const scroll = el.querySelector('.ed-scroll');
  const content = el.querySelector('.ed-content');
  let playhead = null;
  const X = (t) => HEAD + t * pps;

  function render() {
    if (lifting) return;
    const d = store.doc;
    const total = d.comp.duration;
    const end = Math.max(total, ...d.layers.map((l) => l.start + l.dur)) + 3;
    const width = X(end);
    const height = RULER_H + d.layers.length * ROW_H + 40;
    content.style.width = `${width}px`;
    content.style.height = `${height}px`;
    const step = pps >= 120 ? 0.5 : pps >= 50 ? 1 : pps >= 20 ? 5 : 10;
    let h = `<div class="ed-ruler" style="height:${RULER_H}px;width:${width}px">`;
    for (let t = 0; t <= end; t += step) h += `<div class="tick" style="left:${X(t)}px">${step < 1 && t % 1 ? '' : fmt(t)}</div>`;
    h += `<div class="comp-end" style="left:${X(total)}px" title="Akhir komposisi"></div></div>`;
    h += `<div class="beyond" style="left:${X(total)}px;top:${RULER_H}px;height:${height - RULER_H}px;width:${width - X(total)}px"></div>`;

    d.layers.forEach((l, i) => {
      const def = getLayerDef(l.type);
      const y = RULER_H + i * ROW_H;
      const on = store.sel?.id === l.id;
      h += `<div class="row${on ? ' on' : ''}" data-layer="${l.id}" style="top:${y}px;height:${ROW_H}px;width:${width}px">
        <div class="row-head mh" style="height:${ROW_H}px;width:${HEAD}px" data-id="${l.id}">
          <button type="button" class="ico" data-eye="${l.id}" aria-label="${l.hidden ? 'Tampilkan' : 'Sembunyikan'} layer" title="Tampil/sembunyi">${l.hidden ? '◌' : '●'}</button>
          <button type="button" class="ico" data-lock="${l.id}" aria-label="${l.locked ? 'Buka kunci' : 'Kunci'} layer" title="Kunci">${l.locked ? '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' : '·'}</button>
          <span class="ty">${def?.icon || '?'}</span>
          <span class="nm">${esc(l.name)}</span>
        </div>
      </div>`;
      const w = Math.max(6, l.dur * pps);
      h += `<div class="clip mclip${on ? ' sel' : ''}${l.hidden ? ' off' : ''} t-${l.type}" data-id="${l.id}" data-layer="${l.id}" style="left:${X(l.start)}px;top:${y + 4}px;width:${w}px;height:${ROW_H - 8}px">
        ${def?.audio ? `<canvas class="wave" width="${Math.min(Math.ceil(w), 16000)}" height="${ROW_H - 8}"></canvas>` : ''}
        <div class="edge l" data-edge="l"></div><span>${esc(l.name)}</span><div class="edge r" data-edge="r"></div></div>`;
      for (const kt of allKeyTimes(l)) {
        const at = l.start + kt - (l.offset || 0);
        if (at < l.start - 1e-3 || at > l.start + l.dur + 1e-3) continue;
        h += `<button type="button" class="kd" data-layer="${l.id}" data-jump="${at}" style="left:${X(at)}px;top:${y + ROW_H / 2}px" aria-label="Keyframe di ${at.toFixed(2)} detik"></button>`;
      }
    });
    if (!d.layers.length) h += `<div class="empty" style="top:${RULER_H + 20}px;left:${HEAD + 20}px">Belum ada layer. Tambah dari panel kiri.</div>`;
    h += `<div class="ed-playhead" style="height:${height}px"></div>`;
    content.innerHTML = h;
    const idx = d.layers.findIndex((l) => l.id === store.sel?.id);
    el.querySelectorAll('[data-tool]').forEach((b) => {
      const a = b.dataset.tool;
      b.disabled = idx < 0 || (a === 'up' && idx === 0) || (a === 'down' && idx === d.layers.length - 1);
    });
    playhead = content.querySelector('.ed-playhead');

    content.querySelectorAll('.mclip.t-audio').forEach((node) => {
      const l = d.layers.find((x) => x.id === node.dataset.id);
      const peaks = l.props?.url && audio.peaks(l.props.url);
      if (!peaks) {
        if (l.props?.url && !audio.isReady(l.props.url)) audio.getBuffer(l.props.url).then(render);
        return;
      }
      const cv = node.querySelector('canvas');
      const g = cv.getContext('2d');
      g.fillStyle = 'rgba(255,255,255,0.45)';
      const speed = l.props.speed || 1;
      const from = l.props.in || 0;
      for (let x = 0; x < cv.width; x++) {
        const v = peaks[Math.floor((from + (x / pps) * speed) * 100)] || 0;
        const bh = Math.max(1, v * cv.height * 0.9);
        g.fillRect(x, (cv.height - bh) / 2, 1, bh);
      }
    });
    setTime(getTime(), false);
  }

  const timeAt = (clientX) => Math.max(0, (clientX - content.getBoundingClientRect().left - HEAD) / pps);
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

  function snap(v, exclude) {
    const cands = [0, getTime(), store.doc.comp.duration];
    for (const l of store.doc.layers) if (l.id !== exclude) cands.push(l.start, l.start + l.dur);
    for (const c of cands) if (Math.abs(c - v) * pps < 7) return c;
    return v;
  }

  content.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.ico') || e.target.closest('.kd')) return;
    const head = e.target.closest('.row-head');
    if (head) return dragRow(e, head.dataset.id);
    const clipEl = e.target.closest('.clip');
    if (!clipEl) {
      seek(timeAt(e.clientX));
      drag((ev) => seek(timeAt(ev.clientX)));
      return;
    }
    e.preventDefault();
    const id = clipEl.dataset.id;
    store.select({ kind: 'layer', id });
    const layer = store.doc.layers.find((l) => l.id === id);
    if (layer.locked) return;
    const orig = { start: layer.start, dur: layer.dur, offset: layer.offset || 0, in: layer.props?.in || 0 };
    const isAudio = layer.type === 'audio';
    const speed = layer.props?.speed || 1;
    const edge = e.target.dataset.edge;
    const before = store.snapshot();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const from = store.doc.layers.indexOf(layer);
    let to = from;
    let moved = false;
    let dyNow = 0;
    drag((ev) => {
      const dxPx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (!moved && Math.abs(dxPx) < 3 && Math.abs(dy) < 3) return;
      if (!moved && !edge) lift(id);
      moved = true;
      const dx = dxPx / pps;
      if (!edge) {
        dyNow = dy;
        to = slotFor(from, dy);
      }
      if (edge === 'l') {
        // potong awal: konten tetap di tempatnya (seperti After Effects)
        let ns = snap(clamp(orig.start + dx, 0, orig.start + orig.dur - 0.1), id);
        let d = ns - orig.start;
        if (isAudio) d = Math.max(d, -orig.in / speed);
        else d = Math.max(d, -orig.offset);
        ns = orig.start + d;
        layer.start = ns;
        layer.dur = orig.dur - d;
        if (isAudio) layer.props.in = orig.in + d * speed;
        else layer.offset = orig.offset + d;
      } else if (edge === 'r') {
        const ne = snap(orig.start + orig.dur + dx, id);
        layer.dur = Math.max(0.1, ne - orig.start);
      } else {
        let s = Math.max(0, orig.start + dx);
        const sn = snap(s, id);
        s = sn !== s ? sn : snap(s + orig.dur, id) - orig.dur;
        // geseran samping kecil saat memindah urutan tidak mengubah waktu
        layer.start = Math.abs(dxPx) < 8 ? orig.start : Math.max(0, s);
      }
      store.preview();
      if (!edge) place(id, (layer.start - orig.start) * pps, dyNow, from, to);
    }, () => {
      if (!moved) return;
      const finish = () => {
        if (to !== from) {
          const d = store.doc;
          const [l] = d.layers.splice(from, 1);
          d.layers.splice(to, 0, l);
        }
        store.commit(before);
      };
      if (edge) return finish();
      settle(id, (layer.start - orig.start) * pps, from, to, finish);
    });
  });

  // ---------- efek "diangkat" saat memindah urutan layer ----------
  // Baris yang diseret melayang mengikuti kursor (bayangan + sedikit membesar),
  // baris lain bergeser memberi tempat. Timeline tidak digambar ulang selama diangkat.
  let lifting = null;
  const layerEls = (id) => content.querySelectorAll(`[data-layer="${id}"]`);
  const slotFor = (from, dy) => clamp(Math.round(from + dy / ROW_H), 0, store.doc.layers.length - 1);

  function lift(id) {
    lifting = id;
    content.classList.add('reordering');
    layerEls(id).forEach((n) => n.classList.add('lifted'));
    document.body.style.cursor = 'grabbing';
  }

  function place(id, dxPx, dy, from, to) {
    store.doc.layers.forEach((l, i) => {
      let ty = 0;
      if (l.id === id) ty = dy;
      else if (from < to && i > from && i <= to) ty = -ROW_H;
      else if (from > to && i >= to && i < from) ty = ROW_H;
      for (const n of layerEls(l.id)) {
        const tx = l.id === id && !n.classList.contains('row') ? dxPx : 0;
        n.style.transform = `translate(${tx}px, ${ty}px)`;
      }
    });
  }

  // lepas: baris meluncur ke slot barunya, baru kemudian urutan disimpan
  function settle(id, dxPx, from, to, done) {
    for (const n of layerEls(id)) {
      n.classList.remove('lifted');
      n.classList.add('landing');
    }
    place(id, dxPx, (to - from) * ROW_H, from, to);
    setTimeout(() => {
      lifting = null;
      content.classList.remove('reordering');
      document.body.style.cursor = '';
      done();
    }, 170);
  }

  // seret nama layer naik/turun = ubah urutan (atas = paling depan)
  function dragRow(e, id) {
    e.preventDefault();
    store.select({ kind: 'layer', id });
    const from = store.doc.layers.findIndex((l) => l.id === id);
    const y0 = e.clientY;
    let to = from;
    let moving = false;
    drag((ev) => {
      const dy = ev.clientY - y0;
      if (!moving && Math.abs(dy) < 4) return;
      if (!moving) {
        moving = true;
        lift(id);
      }
      to = slotFor(from, dy);
      place(id, 0, dy, from, to);
    }, () => {
      if (!moving) return;
      settle(id, 0, from, to, () => {
        if (to === from) return render();
        store.mutate((d) => {
          const [l] = d.layers.splice(from, 1);
          d.layers.splice(to, 0, l);
        });
      });
    });
  }

  content.addEventListener('click', (e) => {
    const eye = e.target.closest('[data-eye]');
    const lock = e.target.closest('[data-lock]');
    const kd = e.target.closest('.kd');
    if (eye) store.mutate((d) => { const l = d.layers.find((x) => x.id === eye.dataset.eye); l.hidden = !l.hidden; });
    if (lock) store.mutate((d) => { const l = d.layers.find((x) => x.id === lock.dataset.lock); l.locked = !l.locked; });
    if (kd) seek(parseFloat(kd.dataset.jump));
  });

  el.querySelector('.tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (b && !b.disabled) actions[b.dataset.tool]?.();
  });

  el.querySelector('[data-ctl=zoom]').addEventListener('input', (e) => {
    const center = (scroll.scrollLeft + scroll.clientWidth / 2 - HEAD) / pps;
    pps = parseFloat(e.target.value);
    render();
    scroll.scrollLeft = center * pps + HEAD - scroll.clientWidth / 2;
  });

  function setTime(t, follow) {
    if (!playhead) return;
    const x = X(t);
    playhead.style.transform = `translateX(${x}px)`;
    if (follow && (x > scroll.scrollLeft + scroll.clientWidth - 40 || x < scroll.scrollLeft + HEAD)) scroll.scrollLeft = x - HEAD - 40;
  }

  // zoom awal: seluruh komposisi pas di layar
  function fit() {
    const w = scroll.clientWidth - HEAD - 40;
    pps = clamp(w / Math.max(1, store.doc.comp.duration), 5, 300);
    el.querySelector('[data-ctl=zoom]').value = pps;
    render();
  }

  return { render, setTime, fit };
}
