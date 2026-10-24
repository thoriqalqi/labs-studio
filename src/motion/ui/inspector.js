// Inspector motion: pengaturan komposisi, atau properti layer terpilih dengan keyframe ala After Effects.
// ◆ = ada keyframe di waktu ini (klik untuk hapus), ◇ = properti beranimasi tapi tidak di titik ini,
// ○ = belum beranimasi (klik untuk mulai keyframe). Mengubah nilai properti beranimasi otomatis membuat keyframe.
import { getLayerDef, COMMON_SCHEMA, COMMON_DEFAULTS } from '../registry.js';
import { PRESETS } from '../presets.js';
import { EASE_LABEL, keyIndex, setKey, removeKey } from '../keys.js';
import { resolveProps } from '../engine.js';
import { SIZES } from '../doc.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const r3 = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);
const options = (opts, value) => Object.entries(opts).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(value) ? ' selected' : ''}>${esc(v)}</option>`).join('');

export function createInspector(el, { store, getTime, seek, upload, actions }) {
  const selLayer = (doc = store.doc) => doc.layers.find((l) => l.id === store.sel?.id);

  let shownId = null;
  function render() {
    const active = document.activeElement;
    const layer = selLayer();
    // fokus dipulihkan hanya bila layer yang sama masih dipilih (sedang mengetik);
    // ganti pilihan = fokus lepas, supaya Delete/Spasi kembali jadi pintasan
    const same = (layer?.id ?? null) === shownId;
    const focusKey = same && active && el.contains(active) ? active.dataset.f : null;
    shownId = layer?.id ?? null;
    el.innerHTML = layer ? layerHtml(layer) : compHtml();
    if (focusKey) el.querySelector(`[data-f="${focusKey}"]`)?.focus();
  }

  function compHtml() {
    const d = store.doc;
    const c = d.comp;
    const sizeKey = Object.entries(SIZES).find(([, s]) => s.width === c.width && s.height === c.height)?.[0] || 'custom';
    return `
      <div class="insp-head"><div class="title">Komposisi</div><div class="sub">${c.width}×${c.height} · ${c.fps} fps · ${d.layers.length} layer</div></div>
      <section>
        <label class="f"><span>Nama proyek</span><input type="text" data-f="comp:name" value="${esc(d.name)}"></label>
        <label class="f"><span>Ukuran</span><select data-f="comp:size">${options({ ...Object.fromEntries(Object.entries(SIZES).map(([k, s]) => [k, s.label])), custom: 'Kustom' }, sizeKey)}</select></label>
        <div class="grid2">
          <label class="f"><span>Lebar</span><input type="number" data-f="comp:width" value="${c.width}" min="16" step="2"></label>
          <label class="f"><span>Tinggi</span><input type="number" data-f="comp:height" value="${c.height}" min="16" step="2"></label>
          <label class="f"><span>FPS</span><select data-f="comp:fps">${options({ 24: '24', 25: '25', 30: '30', 60: '60' }, c.fps)}</select></label>
          <label class="f"><span>Durasi (dtk)</span><input type="number" data-f="comp:duration" value="${c.duration}" min="0.5" step="0.5"></label>
        </div>
        <label class="f"><span>Warna dasar</span><input type="color" data-f="comp:background" value="${c.background}"></label>
      </section>
      <div class="hint"><b>Cara pakai</b><br>
        Tambah layer dari panel kiri, atau seret file gambar/audio/video ke jendela.<br>
        Klik objek di layar untuk memilih, seret untuk memindahkan.<br>
        ○ di samping properti = mulai animasi (keyframe).<br>
        Spasi putar · ← → mundur/maju 1 frame (Shift: 1 detik)<br>
        S potong layer · Del hapus · Ctrl+D duplikat · Ctrl+Z/Y</div>`;
  }

  function fieldHtml(layer, def, p, f, contentT) {
    const val = p[f.key];
    const keys = layer.keys?.[f.key];
    const ki = keyIndex(layer, f.key, contentT);
    let kbtn = '';
    if (f.animatable) {
      const mark = ki >= 0 ? '◆' : keys?.length ? '◇' : '○';
      const title = ki >= 0 ? 'Hapus keyframe di waktu ini' : keys?.length ? 'Tambah keyframe di waktu ini' : 'Mulai animasi: buat keyframe pertama';
      kbtn = `<button type="button" class="kf${ki >= 0 ? ' on' : keys?.length ? ' has' : ''}" data-key="${f.key}" title="${title}" aria-label="${title}">${mark}</button>`;
      if (keys?.length) kbtn += `<button type="button" class="kn" data-prev="${f.key}" aria-label="Keyframe sebelumnya">‹</button><button type="button" class="kn" data-next="${f.key}" aria-label="Keyframe berikutnya">›</button>`;
    }
    const attr = `data-f="p:${f.key}"`;
    let input;
    switch (f.kind) {
      case 'textarea': input = `<textarea ${attr} rows="3">${esc(val)}</textarea>`; break;
      case 'color': input = `<input type="color" ${attr} value="${esc(val)}">`; break;
      case 'select': input = `<select ${attr}>${options(f.options, val)}</select>`; break;
      case 'checkbox': return `<label class="chk"><input type="checkbox" ${attr}${val ? ' checked' : ''}> ${esc(f.label)}</label>`;
      case 'asset': input = `<div class="asset"><span>${val ? esc(decodeURIComponent(val.split('/').pop()).replace(/^[a-z0-9]+-/, '')) : 'Belum ada file'}</span><button type="button" data-asset="${f.key}" data-accept="${esc(f.accept || '*/*')}">Pilih file…</button></div>`; break;
      case 'text': input = `<input type="text" ${attr} value="${esc(val)}">`; break;
      default: input = `<input type="number" ${attr} value="${r3(val)}"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''} step="${f.step ?? 1}">`;
    }
    const ease = ki >= 0 ? `<select class="ease" data-ease="${f.key}" aria-label="Easing keyframe" title="Easing menuju keyframe berikutnya">${options(EASE_LABEL, keys[ki].ease || 'easeInOut')}</select>` : '';
    return `<div class="prop${f.kind === 'textarea' ? ' wide' : ''}"><div class="prop-label"><span class="kfs">${kbtn}</span>${esc(f.label)}</div>${input}${ease}</div>`;
  }

  function layerHtml(layer) {
    const def = getLayerDef(layer.type);
    const d = store.doc;
    const t = getTime();
    const contentT = t - layer.start + (layer.offset || 0);
    const p = resolveProps(layer, def, contentT, d.comp);
    const inLayer = t >= layer.start && t < layer.start + layer.dur;
    const groups = {};
    for (const f of COMMON_SCHEMA) (groups[f.group] = groups[f.group] || []).push(f);
    const animOpts = Object.fromEntries(Object.entries(PRESETS).filter(([, v]) => !v.textOnly || layer.type === 'text').map(([k, v]) => [k, v.label]));
    const visual = !def.audio;
    return `
      <div class="insp-head">
        <input class="name" type="text" data-f="l:name" value="${esc(layer.name)}" aria-label="Nama layer">
        <div class="sub">${esc(def.name)}${inLayer ? '' : ' · playhead di luar layer ini'}</div>
      </div>
      <section><h4>Waktu</h4>
        <div class="grid2">
          <label class="f"><span>Mulai (dtk)</span><input type="number" data-f="l:start" value="${r3(layer.start)}" min="0" step="0.1"></label>
          <label class="f"><span>Durasi (dtk)</span><input type="number" data-f="l:dur" value="${r3(layer.dur)}" min="0.1" step="0.1"></label>
        </div>
      </section>
      ${visual ? `<section><h4>Animasi masuk & keluar</h4>
        <div class="grid2">
          <label class="f"><span>Masuk</span><select data-f="a:in:preset">${options(animOpts, layer.anim?.in?.preset || 'none')}</select></label>
          <label class="f"><span>Durasi masuk</span><input type="number" data-f="a:in:dur" value="${layer.anim?.in?.dur ?? 0.6}" min="0" step="0.1"></label>
          <label class="f"><span>Keluar</span><select data-f="a:out:preset">${options(animOpts, layer.anim?.out?.preset || 'none')}</select></label>
          <label class="f"><span>Durasi keluar</span><input type="number" data-f="a:out:dur" value="${layer.anim?.out?.dur ?? 0.4}" min="0" step="0.1"></label>
        </div>
      </section>` : ''}
      ${def.schema?.length ? `<section><h4>${esc(def.name)}</h4>${def.schema.map((f) => fieldHtml(layer, def, p, f, contentT)).join('')}</section>` : ''}
      ${visual ? Object.entries(groups).map(([g, fs]) => `<section><h4>${g}</h4>${fs.map((f) => fieldHtml(layer, def, p, f, contentT)).join('')}</section>`).join('') : ''}
      <div class="acts">
        <button type="button" data-act="split">Potong (S)</button>
        <button type="button" data-act="dup">Duplikat</button>
        <button type="button" data-act="up" title="Ke depan">↑ Depan</button>
        <button type="button" data-act="down" title="Ke belakang">↓ Belakang</button>
        <button type="button" data-act="delete" class="danger">Hapus</button>
      </div>`;
  }

  // ---------- perubahan ----------
  function coerce(input, current) {
    if (input.type === 'checkbox') return input.checked;
    if (input.type === 'number') {
      const v = parseFloat(input.value);
      return Number.isFinite(v) ? v : current;
    }
    return input.value;
  }

  function onChange(input) {
    const [scope, a, b] = input.dataset.f.split(':');
    const t = getTime();
    store.mutate((d) => {
      if (scope === 'comp') {
        if (a === 'name') d.name = input.value;
        else if (a === 'size') {
          const s = SIZES[input.value];
          if (s) resizeComp(d, s.width, s.height);
        } else if (a === 'width' || a === 'height') {
          const v = Math.max(16, Math.round((parseFloat(input.value) || d.comp[a]) / 2) * 2);
          resizeComp(d, a === 'width' ? v : d.comp.width, a === 'height' ? v : d.comp.height);
        } else if (a === 'fps') d.comp.fps = parseInt(input.value, 10);
        else if (a === 'duration') d.comp.duration = Math.max(0.5, parseFloat(input.value) || d.comp.duration);
        else d.comp[a] = input.value;
        return;
      }
      const layer = selLayer(d);
      if (!layer) return;
      if (scope === 'l') {
        if (a === 'name') layer.name = input.value;
        if (a === 'start') layer.start = Math.max(0, parseFloat(input.value) || 0);
        if (a === 'dur') layer.dur = Math.max(0.1, parseFloat(input.value) || layer.dur);
      } else if (scope === 'a') {
        layer.anim = layer.anim || {};
        layer.anim[a] = layer.anim[a] || { preset: 'none', dur: 0.5 };
        layer.anim[a][b] = b === 'dur' ? Math.max(0, parseFloat(input.value) || 0) : input.value;
      } else if (scope === 'p') {
        const def = getLayerDef(layer.type);
        const current = layer.props?.[a] ?? def.defaults?.[a] ?? COMMON_DEFAULTS[a];
        const v = coerce(input, current);
        const contentT = t - layer.start + (layer.offset || 0);
        if (layer.keys?.[a]?.length) setKey(layer, a, contentT, v);
        else layer.props[a] = v;
      }
    });
  }

  // ubah ukuran komposisi: posisi layer ikut berpindah secara proporsional
  function resizeComp(d, w, h) {
    const sx = w / d.comp.width;
    const sy = h / d.comp.height;
    for (const l of d.layers) {
      if (l.props.x != null) l.props.x *= sx;
      if (l.props.y != null) l.props.y *= sy;
      for (const k of l.keys?.x || []) k.v *= sx;
      for (const k of l.keys?.y || []) k.v *= sy;
      if (l.type === 'chibi3d' && l.props.w === d.comp.width && l.props.h === d.comp.height) {
        l.props.w = w;
        l.props.h = h;
      }
    }
    d.comp.width = w;
    d.comp.height = h;
  }

  function toggleKey(prop) {
    const t = getTime();
    store.mutate((d) => {
      const layer = selLayer(d);
      const def = getLayerDef(layer.type);
      const contentT = t - layer.start + (layer.offset || 0);
      if (keyIndex(layer, prop, contentT) >= 0) {
        removeKey(layer, prop, contentT);
        // keyframe terakhir dihapus: nilai saat ini jadi nilai tetap
        if (!layer.keys?.[prop]) layer.props[prop] = resolveProps({ ...layer, keys: {} }, def, contentT, d.comp)[prop];
      } else {
        const v = resolveProps(layer, def, contentT, d.comp)[prop];
        setKey(layer, prop, contentT, v);
      }
    });
  }

  function jumpKey(prop, dir) {
    const layer = selLayer();
    const t = getTime();
    const contentT = t - layer.start + (layer.offset || 0);
    const list = layer.keys?.[prop] || [];
    const k = dir < 0 ? [...list].reverse().find((x) => x.t < contentT - 1e-3) : list.find((x) => x.t > contentT + 1e-3);
    if (k) seek(layer.start + k.t - (layer.offset || 0));
  }

  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.ease) {
      const prop = t.dataset.ease;
      const time = getTime();
      return store.mutate((d) => {
        const layer = selLayer(d);
        const i = keyIndex(layer, prop, time - layer.start + (layer.offset || 0));
        if (i >= 0) layer.keys[prop][i].ease = t.value;
      });
    }
    if (t.dataset.f) onChange(t);
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.key) return toggleKey(b.dataset.key);
    if (b.dataset.prev) return jumpKey(b.dataset.prev, -1);
    if (b.dataset.next) return jumpKey(b.dataset.next, 1);
    if (b.dataset.asset) {
      const key = b.dataset.asset;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = b.dataset.accept;
      input.onchange = async () => {
        const f = input.files[0];
        if (!f) return;
        const res = await upload(f);
        if (res?.url) store.mutate((d) => { selLayer(d).props[key] = res.url; });
      };
      input.click();
      return;
    }
    if (b.dataset.act) actions[b.dataset.act]?.();
  });

  return { render };
}
