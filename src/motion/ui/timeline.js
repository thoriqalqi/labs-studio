// Timeline layer: satu baris per layer (paling atas = paling depan), batang waktu bisa
// digeser & di-trim. Klik penggaris = pindah waktu.
// Keyframe: titik ◆ di baris layer = semua properti pada waktu itu. ▸ di nama layer membuka satu baris
// per properti beranimasi. ◆ bisa diklik (pilih + lompat), Shift+klik (tambah pilihan), diseret (geser waktu),
// dan diklik dua kali (editor kurva easing). Hapus, salin, dan tempel lewat keyboard (lihat app.js).
import { getLayerDef, COMMON_SCHEMA } from '../registry.js';
import { allKeyTimes, setKey, toContent, toGlobal, tidyKeys, DEFAULT_BZ } from '../keys.js';
import { editCurves } from './curve.js';

const HEAD = 210;
const RULER_H = 26;
const ROW_H = 34;
const SUB_H = 24;
const GROUP_H = 24;
// layer dikelompokkan di timeline (hanya tampilan; urutan depan-belakang tetap urutan dokumen)
const GROUPS = [['text', 'Teks'], ['visual', 'Visual'], ['audio', 'Audio']];
const groupOf = (l) => (getLayerDef(l.type)?.audio ? 'audio' : l.type === 'text' ? 'text' : 'visual');
const FOLD_KEY = 'labs.timeline.folded';
const TLH_KEY = 'labs.timeline.height';
const NEAR = 1 / 240;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ikon garis sederhana (stroke = warna teks tombol)
const svg = (d) => `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TOOLS = [
  ['kprev', 'Keyframe sebelumnya (J)', svg('<path d="M15 6l-6 6 6 6"/>')],
  ['kadd', 'Tambah keyframe di playhead (K)', svg('<path d="M12 4l7 8-7 8-7-8z"/>')],
  ['knext', 'Keyframe berikutnya (L)', svg('<path d="M9 6l6 6-6 6"/>')],
  ['split', 'Potong di playhead (S)', svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>')],
  ['dup', 'Duplikat (Ctrl+D)', svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>')],
  ['up', 'Bawa ke depan (Ctrl+])', svg('<path d="M12 19V5M5 12l7-7 7 7"/>')],
  ['down', 'Kirim ke belakang (Ctrl+[)', svg('<path d="M12 5v14M19 12l-7 7-7-7"/>')],
  ['delete', 'Hapus (Del)', svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>')]
];

export function createTimeline(el, { store, getTime, seek, audio, actions }) {
  let pps = 60;
  const waveWait = new Set(); // url audio yang sedang/akan dimuat untuk gambar gelombang
  let folded = new Set();
  try { folded = new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); } catch { /* penyimpanan tidak tersedia */ }
  el.innerHTML = `
    <div class="tl-grip" role="separator" aria-orientation="horizontal" title="Tarik untuk mengubah tinggi timeline (klik dua kali: kembalikan)"></div>
    <div class="ed-toolbar">
      <label>Zoom <input type="range" data-ctl="zoom" min="5" max="300" step="1" value="60"></label>
      <span class="sep"></span>
      <div class="tools" role="toolbar" aria-label="Aksi layer">
        ${TOOLS.map(([act, label, icon]) => `<button type="button" class="tool${act === 'delete' ? ' danger' : ''}${act === 'knext' ? ' gap' : ''}" data-tool="${act}" title="${label}" aria-label="${label}">${icon}</button>`).join('')}
      </div>
    </div>
    <div class="ed-scroll"><div class="ed-content mt"></div></div>`;
  const scroll = el.querySelector('.ed-scroll');
  const content = el.querySelector('.ed-content');
  let playhead = null;
  const X = (t) => HEAD + t * pps;

  // ---------- keadaan keyframe (hanya di editor, tidak disimpan ke dokumen) ----------
  const open = new Set(); // id layer yang dibuka per properti
  let keySel = []; // keyframe terpilih: { id, prop, t } (t = waktu konten)
  // urutan tampil (id layer per kelompok) + posisi & tinggi baris per urutan tampil
  let vis = [];
  let tops = [];
  let heights = [];

  const findLayer = (id, d = store.doc) => d.layers.find((l) => l.id === id);
  const animProps = (l) => Object.keys(l.keys || {}).filter((p) => l.keys[p]?.length);
  function propLabel(l, prop) {
    const f = getLayerDef(l.type)?.schema?.find((x) => x.key === prop) || COMMON_SCHEMA.find((x) => x.key === prop);
    return f?.label || prop;
  }
  const isSel = (id, prop, t) => keySel.some((s) => s.id === id && (prop == null || s.prop === prop) && Math.abs(s.t - t) < NEAR);
  const toSel = (refs) => refs.map((r) => ({ id: r.layer.id, prop: r.prop, t: r.key.t }));

  // keyframe yang diwakili satu titik: prop null = semua properti layer pada waktu t
  function keysAt(l, prop, t) {
    const out = [];
    for (const p of prop ? [prop] : animProps(l)) {
      for (const k of l.keys?.[p] || []) if (Math.abs(k.t - t) < NEAR) out.push({ layer: l, prop: p, key: k });
    }
    return out;
  }
  // pilihan → objek keyframe di dokumen saat ini (yang sudah tidak ada dibuang)
  function selRefs() {
    const out = [];
    for (const s of keySel) {
      const l = findLayer(s.id);
      const k = l?.keys?.[s.prop]?.find((x) => Math.abs(x.t - s.t) < NEAR);
      if (k) out.push({ layer: l, prop: s.prop, key: k });
    }
    keySel = toSel(out);
    return out;
  }

  function kdHtml(l, prop, kt, y, extra = '') {
    const at = toGlobal(l, kt);
    if (at < l.start - 1e-3 || at > l.start + l.dur + 1e-3) return '';
    const k = prop ? l.keys[prop].find((x) => Math.abs(x.t - kt) < NEAR) : null;
    const cls = `kd${isSel(l.id, prop, kt) ? ' sel' : ''}${k?.ease === 'hold' ? ' e-hold' : ''}${k?.ease === 'custom' ? ' e-custom' : ''}${extra}`;
    const label = prop ? `${propLabel(l, prop)} · ${at.toFixed(2)} dtk` : `Keyframe di ${at.toFixed(2)} detik`;
    return `<button type="button" class="${cls}" data-layer="${l.id}" data-t="${kt}"${prop ? ` data-prop="${esc(prop)}"` : ''} style="left:${X(at)}px;top:${y}px" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
  }

  function render() {
    if (lifting) return;
    const d = store.doc;
    selRefs();
    const total = d.comp.duration;
    const end = Math.max(total, ...d.layers.map((l) => l.start + l.dur)) + 3;
    const width = X(end);
    vis = [];
    tops = [];
    heights = [];
    const groupRows = [];
    let yy = RULER_H;
    for (const [g, label] of GROUPS) {
      const members = d.layers.filter((l) => groupOf(l) === g);
      if (!members.length) continue;
      groupRows.push({ g, label, y: yy, n: members.length });
      yy += GROUP_H;
      if (folded.has(g)) continue;
      for (const l of members) {
        vis.push(l.id);
        tops.push(yy);
        const hh = ROW_H + (open.has(l.id) ? animProps(l).length * SUB_H : 0);
        heights.push(hh);
        yy += hh;
      }
    }
    const height = yy + 40;
    content.style.width = `${width}px`;
    content.style.height = `${height}px`;
    const step = pps >= 120 ? 0.5 : pps >= 50 ? 1 : pps >= 20 ? 5 : 10;
    let h = `<div class="ed-ruler" style="height:${RULER_H}px;width:${width}px">`;
    for (let t = 0; t <= end; t += step) h += `<div class="tick" style="left:${X(t)}px">${step < 1 && t % 1 ? '' : fmt(t)}</div>`;
    h += `<div class="comp-end" style="left:${X(total)}px" title="Akhir komposisi"></div></div>`;
    h += `<div class="beyond" style="left:${X(total)}px;top:${RULER_H}px;height:${height - RULER_H}px;width:${width - X(total)}px"></div>`;

    // judul kelompok (bisa dilipat)
    for (const r of groupRows) {
      const shut = folded.has(r.g);
      h += `<div class="grp" style="top:${r.y}px;height:${GROUP_H}px;width:${width}px">
        <button type="button" class="grp-head" data-fold="${r.g}" style="width:${HEAD}px;height:${GROUP_H}px" aria-expanded="${!shut}" title="Lipat/buka kelompok">
          <span class="tw${shut ? '' : ' open'}">▸</span><span>${r.label}</span><em>${r.n}</em>
        </button></div>`;
    }
    vis.forEach((lid, i) => {
      const l = findLayer(lid, d);
      const def = getLayerDef(l.type);
      const y = tops[i];
      const on = store.sel?.id === l.id;
      const props = animProps(l);
      const isOpen = open.has(l.id) && props.length > 0;
      const tw = props.length
        ? `<button type="button" class="ico tw${isOpen ? ' open' : ''}" data-tw="${l.id}" aria-expanded="${isOpen}" title="Buka/tutup properti beranimasi (U)" aria-label="Buka/tutup properti beranimasi">▸</button>`
        : '<span class="tw-gap"></span>';
      h += `<div class="row${on ? ' on' : ''}" data-layer="${l.id}" style="top:${y}px;height:${ROW_H}px;width:${width}px">
        <div class="row-head mh" style="height:${ROW_H}px;width:${HEAD}px" data-id="${l.id}">
          ${tw}
          <button type="button" class="ico" data-eye="${l.id}" aria-label="${l.hidden ? 'Tampilkan' : 'Sembunyikan'} layer" title="Tampil/sembunyi">${l.hidden ? '◌' : '●'}</button>
          <button type="button" class="ico" data-lock="${l.id}" aria-label="${l.locked ? 'Buka kunci' : 'Kunci'} layer" title="Kunci">${l.locked ? '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' : '·'}</button>
          <span class="ty">${def?.icon || '?'}</span>
          <span class="nm" translate="no">${esc(l.name)}</span>
        </div>
      </div>`;
      const w = Math.max(6, l.dur * pps);
      h += `<div class="clip mclip${on ? ' sel' : ''}${l.hidden ? ' off' : ''} t-${l.type}" data-id="${l.id}" data-layer="${l.id}" style="left:${X(l.start)}px;top:${y + 4}px;width:${w}px;height:${ROW_H - 8}px">
        ${def?.audio ? `<canvas class="wave" width="${Math.min(Math.ceil(w), 16000)}" height="${ROW_H - 8}"></canvas>` : ''}
        <div class="edge l" data-edge="l"></div><span translate="no">${esc(l.name)}</span><div class="edge r" data-edge="r"></div></div>`;
      for (const kt of allKeyTimes(l)) h += kdHtml(l, null, kt, y + ROW_H / 2);
      if (isOpen) {
        props.forEach((p, j) => {
          const py = y + ROW_H + j * SUB_H;
          h += `<div class="row prow${on ? ' on' : ''}" data-layer="${l.id}" style="top:${py}px;height:${SUB_H}px;width:${width}px">
            <div class="row-head prow-head" style="height:${SUB_H}px;width:${HEAD}px" data-id="${l.id}" data-prop-head="${esc(p)}" title="Klik untuk memilih semua keyframe properti ini">
              <span class="pl">${esc(propLabel(l, p))}</span><span class="pn">${l.keys[p].length}</span>
            </div></div>`;
          h += `<div class="pspan" data-layer="${l.id}" style="left:${X(l.start)}px;top:${py + SUB_H / 2}px;width:${w}px"></div>`;
          for (const k of l.keys[p]) h += kdHtml(l, p, k.t, py + SUB_H / 2, ' sub');
        });
      }
    });
    if (!d.layers.length) h += `<div class="empty" style="top:${RULER_H + 20}px;left:${HEAD + 20}px">Belum ada layer. Tambah dari panel kiri.</div>`;
    h += `<div class="ed-playhead" style="height:${height}px"></div>`;
    content.innerHTML = h;
    const idx = d.layers.findIndex((l) => l.id === store.sel?.id);
    el.querySelectorAll('[data-tool]').forEach((b) => {
      const a = b.dataset.tool;
      if (a === 'kprev' || a === 'knext') return; // navigasi keyframe jalan juga tanpa layer terpilih
      b.disabled = idx < 0 || (a === 'up' && idx === 0) || (a === 'down' && idx === d.layers.length - 1);
    });
    playhead = content.querySelector('.ed-playhead');

    content.querySelectorAll('.mclip.t-audio').forEach((node) => {
      const l = d.layers.find((x) => x.id === node.dataset.id);
      const peaks = l.props?.url && audio.peaks(l.props.url);
      if (!peaks) {
        // gambar ulang sekali saat file selesai dimuat; file yang gagal dibaca (null) tidak memicu render lagi
        // (dulu .then(render) tanpa syarat → render tanpa henti dan editor macet)
        if (l.props?.url && !audio.isReady(l.props.url) && !waveWait.has(l.props.url)) {
          waveWait.add(l.props.url);
          audio.getBuffer(l.props.url).then((buf) => {
            if (buf) {
              waveWait.delete(l.props.url);
              render();
            }
          });
        }
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
    if (e.target.closest('.ico') || e.target.closest('.grp-head')) return;
    const kd = e.target.closest('.kd');
    if (kd) return dragKeys(e, kd);
    const head = e.target.closest('.row-head');
    if (head?.dataset.propHead) return selectPropKeys(e, head.dataset.id, head.dataset.propHead);
    if (head) return dragRow(e, head.dataset.id);
    if (keySel.length && !e.shiftKey) keySel = [];
    const clipEl = e.target.closest('.clip');
    if (!clipEl) {
      seek(timeAt(e.clientX));
      render();
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
    const from = vis.indexOf(id);
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
        if (to !== from) reorder(store.doc, from, to);
        store.commit(before);
      };
      if (edge) return finish();
      settle(id, (layer.start - orig.start) * pps, from, to, finish);
    });
  });

  // ---------- efek "diangkat" saat memindah urutan layer ----------
  // Baris yang diseret melayang mengikuti kursor (bayangan + sedikit membesar),
  // baris lain bergeser memberi tempat. Timeline tidak digambar ulang selama diangkat.
  // Tinggi baris bisa berbeda (layer yang dibuka per properti), jadi posisi memakai tops/heights.
  let lifting = null;
  const layerEls = (id) => content.querySelectorAll(`[data-layer="${id}"]`);
  // posisi (urutan tampil) memakai vis/tops/heights. Layer hanya bisa dipindah di dalam kelompoknya.
  function groupRange(pos) {
    const g = groupOf(findLayer(vis[pos]));
    let a = pos;
    let b = pos;
    while (a > 0 && groupOf(findLayer(vis[a - 1])) === g) a--;
    while (b < vis.length - 1 && groupOf(findLayer(vis[b + 1])) === g) b++;
    return [a, b];
  }
  // slot tujuan = jumlah layer lain sekelompok yang titik tengahnya di atas titik tengah baris yang diseret
  function slotFor(from, dy) {
    if (from < 0) return from;
    const [a, b] = groupRange(from);
    const c = tops[from] + heights[from] / 2 + dy;
    let to = a;
    for (let i = a; i <= b; i++) if (i !== from && tops[i] + heights[i] / 2 < c) to++;
    return to;
  }
  // terapkan perpindahan posisi tampil ke dokumen: layer sekelompok bertukar tempat di slot dokumen
  // yang sama, jadi urutan depan-belakang kelompok lain tidak berubah
  function reorder(d, from, to) {
    const [a, b] = groupRange(from);
    const ids = vis.slice(a, b + 1);
    const [m] = ids.splice(from - a, 1);
    ids.splice(to - a, 0, m);
    const byId = new Map(d.layers.map((l) => [l.id, l]));
    const slots = [];
    d.layers.forEach((l, i) => { if (ids.includes(l.id)) slots.push(i); });
    slots.forEach((di, k) => { d.layers[di] = byId.get(ids[k]); });
  }
  // jarak geser baris yang diseret sampai ke slot barunya
  function shiftTo(from, to) {
    let s = 0;
    if (to > from) for (let i = from + 1; i <= to; i++) s += heights[i];
    else for (let i = to; i < from; i++) s -= heights[i];
    return s;
  }

  function lift(id) {
    lifting = id;
    content.classList.add('reordering');
    layerEls(id).forEach((n) => n.classList.add('lifted'));
    document.body.style.cursor = 'grabbing';
  }

  function place(id, dxPx, dy, from, to) {
    vis.forEach((lid, i) => {
      let ty = 0;
      if (lid === id) ty = dy;
      else if (from < to && i > from && i <= to) ty = -heights[from];
      else if (from > to && i >= to && i < from) ty = heights[from];
      for (const n of layerEls(lid)) {
        const tx = lid === id && !n.classList.contains('row') ? dxPx : 0;
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
    place(id, dxPx, shiftTo(from, to), from, to);
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
    const from = vis.indexOf(id);
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
        store.mutate((d) => reorder(d, from, to));
      });
    });
  }

  content.addEventListener('click', (e) => {
    const fold = e.target.closest('[data-fold]');
    if (fold) {
      const g = fold.dataset.fold;
      if (folded.has(g)) folded.delete(g);
      else folded.add(g);
      try { localStorage.setItem(FOLD_KEY, JSON.stringify([...folded])); } catch { /* abaikan */ }
      return render();
    }
    const tw = e.target.closest('[data-tw]');
    if (tw) return toggleOpen(tw.dataset.tw);
    const eye = e.target.closest('[data-eye]');
    const lock = e.target.closest('[data-lock]');
    if (eye) store.mutate((d) => { const l = d.layers.find((x) => x.id === eye.dataset.eye); l.hidden = !l.hidden; });
    if (lock) store.mutate((d) => { const l = d.layers.find((x) => x.id === lock.dataset.lock); l.locked = !l.locked; });
  });

  el.querySelector('.tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (b && !b.disabled) actions[b.dataset.tool]?.();
  });

  // ---------- keyframe: buka baris, pilih, seret ----------
  function toggleOpen(id, force) {
    const l = findLayer(id);
    if (!l) return;
    const want = force ?? !open.has(id);
    if (want && animProps(l).length) open.add(id);
    else open.delete(id);
    render();
  }

  // klik nama properti = pilih semua keyframe properti itu (Shift = tambahkan)
  function selectPropKeys(e, id, prop) {
    e.preventDefault();
    const l = findLayer(id);
    const refs = (l.keys?.[prop] || []).map((k) => ({ layer: l, prop, key: k }));
    keySel = e.shiftKey ? [...keySel, ...toSel(refs)] : toSel(refs);
    if (store.sel?.id !== id) store.select({ kind: 'layer', id });
    else render();
  }

  // tempel ke playhead / ujung layer, selain itu bulatkan ke frame
  function snapKeyTime(g, layer) {
    for (const c of [getTime(), layer.start, layer.start + layer.dur, 0]) if (Math.abs(c - g) * pps < 7) return c;
    const fps = store.doc.comp.fps || 30;
    return toGlobal(layer, Math.round(toContent(layer, g) * fps) / fps);
  }

  let lastDown = {};
  function dragKeys(e, kd) {
    e.preventDefault();
    const id = kd.dataset.layer;
    const prop = kd.dataset.prop || null;
    const kt = parseFloat(kd.dataset.t);
    const layer = findLayer(id);
    const hit = keysAt(layer, prop, kt);
    if (!hit.length) return;
    // klik dua kali ◆ = editor kurva. Dideteksi sendiri karena timeline digambar ulang di antara dua klik.
    const sig = `${id}|${prop}|${kt}`;
    const now = performance.now();
    if (!e.shiftKey && lastDown.sig === sig && now - lastDown.at < 400) {
      lastDown = {};
      return keyOps.curve();
    }
    lastDown = { sig, at: now };
    const allSel = hit.every((r) => isSel(id, r.prop, kt));
    if (e.shiftKey) {
      // Shift+klik: tambah/lepas dari pilihan tanpa menggeser
      const props = new Set(hit.map((r) => r.prop));
      keySel = allSel ? keySel.filter((s) => !(s.id === id && props.has(s.prop) && Math.abs(s.t - kt) < NEAR)) : [...keySel, ...toSel(hit)];
      return render();
    }
    if (!allSel) keySel = toSel(hit);
    if (store.sel?.id !== id) store.select({ kind: 'layer', id });
    else render();
    const refs = selRefs();
    if (!refs.length) return;
    const locked = refs.some((r) => r.layer.locked);
    const before = store.snapshot();
    const orig = refs.map((r) => r.key.t);
    const minT = Math.min(...orig);
    const anchorG = toGlobal(layer, kt);
    const x0 = e.clientX;
    let moved = false;
    drag((ev) => {
      const dxPx = ev.clientX - x0;
      if (locked || (!moved && Math.abs(dxPx) < 3)) return;
      moved = true;
      let dt = snapKeyTime(anchorG + dxPx / pps, layer) - anchorG;
      dt = Math.max(dt, -minT); // waktu konten tidak boleh negatif
      refs.forEach((r, i) => { r.key.t = orig[i] + dt; });
      for (const r of refs) r.layer.keys[r.prop].sort((a, b) => a.t - b.t);
      keySel = toSel(refs);
      store.preview();
      tip(ev, `${(anchorG + dt).toFixed(2)} dtk`);
    }, () => {
      tip(null);
      if (!moved) return seek(anchorG);
      // keyframe yang digeser menimpa keyframe lain di waktu yang sama
      const movedSet = new Set(refs.map((r) => r.key));
      const done = new Set();
      for (const r of refs) {
        const k = `${r.layer.id}|${r.prop}`;
        if (done.has(k)) continue;
        done.add(k);
        tidyKeys(r.layer, r.prop, movedSet);
      }
      keySel = toSel(refs);
      store.commit(before);
    });
  }

  // label waktu kecil yang mengikuti kursor saat menggeser keyframe
  let tipEl = null;
  function tip(ev, text) {
    if (!ev) {
      tipEl?.remove();
      tipEl = null;
      return;
    }
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'kd-tip';
      document.body.appendChild(tipEl);
    }
    tipEl.textContent = text;
    tipEl.style.left = `${ev.clientX + 12}px`;
    tipEl.style.top = `${ev.clientY - 30}px`;
  }


  // ---------- keyframe: hapus, salin, tempel (dipanggil dari pintasan keyboard) ----------
  let clip = null;
  const keyOps = {
    count: () => selRefs().length,
    clear() {
      if (!keySel.length) return false;
      keySel = [];
      render();
      return true;
    },
    delete() {
      const sel = toSel(selRefs());
      if (!sel.length) return 0;
      keySel = [];
      store.mutate((d) => {
        for (const s of sel) {
          const l = findLayer(s.id, d);
          const list = l?.keys?.[s.prop];
          if (!list || l.locked) continue;
          const i = list.findIndex((k) => Math.abs(k.t - s.t) < NEAR);
          if (i < 0) continue;
          const [k] = list.splice(i, 1);
          // keyframe terakhir properti ini dihapus: nilainya jadi nilai tetap
          if (!list.length) {
            delete l.keys[s.prop];
            l.props[s.prop] = k.v;
          }
        }
      });
      return sel.length;
    },
    copy() {
      const refs = selRefs();
      if (!refs.length) return 0;
      // jarak waktu dihitung di waktu global, jadi keyframe dari beberapa layer tetap sejajar
      const g = refs.map((r) => toGlobal(r.layer, r.key.t));
      const g0 = Math.min(...g);
      clip = refs.map((r, i) => ({ prop: r.prop, dt: g[i] - g0, v: structuredClone(r.key.v), ease: r.key.ease, bz: r.key.bz ? [...r.key.bz] : undefined }));
      return refs.length;
    },
    // tempel ke layer terpilih; keyframe paling awal jatuh di playhead
    paste() {
      const l0 = findLayer(store.sel?.id);
      if (!clip?.length) return null; // belum ada keyframe yang disalin: biarkan Ctrl+V biasa
      if (!l0) return { error: 'Pilih layer tujuan dulu' };
      if (l0.locked) return { error: 'Layer terkunci' };
      const def = getLayerDef(l0.type);
      const ok = new Set([
        ...(def.schema || []).filter((f) => f.animatable).map((f) => f.key),
        ...(def.audio || def.noTransform ? [] : COMMON_SCHEMA.filter((f) => f.animatable).map((f) => f.key))
      ]);
      const items = clip.filter((c) => ok.has(c.prop));
      if (!items.length) return { error: 'Properti yang disalin tidak ada di layer ini' };
      const base = toContent(l0, getTime());
      const out = [];
      store.mutate((d) => {
        const l = findLayer(l0.id, d);
        for (const c of items) {
          const t = Math.max(0, Math.round((base + c.dt) * 1000) / 1000);
          setKey(l, c.prop, t, structuredClone(c.v), c.ease);
          const k = l.keys[c.prop].find((x) => Math.abs(x.t - t) < NEAR);
          if (c.ease === 'custom') k.bz = [...(c.bz || DEFAULT_BZ)];
          else delete k.bz;
          out.push({ id: l.id, prop: c.prop, t: k.t });
        }
        keySel = out;
      });
      open.add(l0.id);
      render();
      return { count: items.length, skipped: clip.length - items.length };
    },
    curve() {
      const refs = selRefs();
      if (refs.length && !refs.some((r) => r.layer.locked)) editCurves(store, refs.map((r) => r.key));
    },
    toggleOpen
  };

  // ---------- tinggi timeline: tarik garis di atasnya naik/turun (diingat di browser) ----------
  const grip = el.querySelector('.tl-grip');
  const setHeight = (h) => document.body.style.setProperty('--tl-h', `${Math.round(clamp(h, 140, window.innerHeight - 240))}px`);
  try {
    const saved = parseFloat(localStorage.getItem(TLH_KEY));
    if (saved) setHeight(saved);
  } catch { /* abaikan */ }
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = el.getBoundingClientRect().height;
    document.body.classList.add('tl-resizing');
    drag((ev) => setHeight(h0 + (y0 - ev.clientY)), () => {
      document.body.classList.remove('tl-resizing');
      try { localStorage.setItem(TLH_KEY, String(el.getBoundingClientRect().height)); } catch { /* abaikan */ }
    });
  });
  grip.addEventListener('dblclick', () => {
    document.body.style.removeProperty('--tl-h');
    try { localStorage.removeItem(TLH_KEY); } catch { /* abaikan */ }
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

  return { render, setTime, fit, keys: keyOps };
}
