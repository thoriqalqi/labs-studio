// Editor kurva easing: dua titik pegangan bezier yang bisa diseret, preset cepat, dan pratinjau gerak.
// openCurveEditor({ bz, onInput }) → Promise<[x1, y1, x2, y2] | null> (null = batal).
// onInput dipanggil setiap kurva berubah, untuk pratinjau langsung di kanvas.
import { cubicBezier, DEFAULT_BZ } from '../keys.js';

const PRESETS = [
  ['Linear', [0, 0, 1, 1]],
  ['Halus', [0.42, 0, 0.58, 1]],
  ['Melambat', [0, 0, 0.2, 1]],
  ['Mempercepat', [0.6, 0, 1, 1]],
  ['Tajam', [0.8, 0, 0.2, 1]],
  ['Antisipasi', [0.4, -0.45, 0.6, 1]],
  ['Melampaui', [0.3, 1.4, 0.6, 1]]
];

// area gambar: kotak 0..1 di tengah, ruang di atas & bawah untuk kurva yang melampaui
const W = 260;
const H = 400;
const PAD = 36;
const SIZE = W - PAD * 2;
const TOP = (H - SIZE) / 2;
const Y_MIN = -(H - TOP - SIZE - 6) / SIZE;
const Y_MAX = 1 + (TOP - 6) / SIZE;
const px = (x) => PAD + x * SIZE;
const py = (y) => TOP + (1 - y) * SIZE;
const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let dlg = null;
let editing = false;

export function openCurveEditor({ bz, onInput } = {}) {
  // hanya satu editor sekaligus: yang lama ditutup sebagai "batal"
  if (dlg?.open) dlg.close();
  const me = document.createElement('dialog');
  dlg = me;
  me.className = 'curve-dialog';
  let cur = (Array.isArray(bz) && bz.length === 4 ? bz : DEFAULT_BZ).map(Number);
  me.innerHTML = `
    <form method="dialog">
      <h2>Kurva easing</h2>
      <p class="curve-sub">Seret dua titik untuk mengatur kecepatan menuju keyframe berikutnya. Kurva curam = cepat, landai = lambat.</p>
      <div class="curve-body">
        <svg class="curve-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-label="Grafik kurva easing">
          <rect class="curve-box" x="${PAD}" y="${TOP}" width="${SIZE}" height="${SIZE}"></rect>
          <line class="curve-grid" x1="${PAD}" y1="${py(0.5)}" x2="${PAD + SIZE}" y2="${py(0.5)}"></line>
          <line class="curve-grid" x1="${px(0.5)}" y1="${TOP}" x2="${px(0.5)}" y2="${TOP + SIZE}"></line>
          <text class="curve-ax" x="${PAD}" y="${TOP + SIZE + 16}">waktu</text>
          <text class="curve-ax" x="${PAD}" y="${TOP - 8}">nilai</text>
          <line class="curve-arm" data-arm="1"></line>
          <line class="curve-arm" data-arm="2"></line>
          <path class="curve-path"></path>
          <circle class="curve-end" cx="${px(0)}" cy="${py(0)}" r="4"></circle>
          <circle class="curve-end" cx="${px(1)}" cy="${py(1)}" r="4"></circle>
          <circle class="curve-h" data-h="1" r="7" tabindex="0" aria-label="Pegangan 1"></circle>
          <circle class="curve-h" data-h="2" r="7" tabindex="0" aria-label="Pegangan 2"></circle>
        </svg>
        <div class="curve-side">
          <div class="curve-presets">${PRESETS.map(([n], i) => `<button type="button" data-preset="${i}">${n}</button>`).join('')}</div>
          <div class="curve-nums">
            ${['x1', 'y1', 'x2', 'y2'].map((n, i) => `<label class="f"><span>${n}</span><input type="number" step="0.01" data-n="${i}"${i % 2 ? '' : ' min="0" max="1"'}></label>`).join('')}
          </div>
          <div class="curve-track" aria-hidden="true"><i></i></div>
        </div>
      </div>
      <div class="acts">
        <button type="button" data-v="0">Batal</button>
        <button type="submit" data-v="1" class="primary">Terapkan</button>
      </div>
    </form>`;
  document.body.appendChild(me);
  const svg = me.querySelector('svg');
  const path = me.querySelector('.curve-path');
  const arms = me.querySelectorAll('.curve-arm');
  const hs = me.querySelectorAll('.curve-h');
  const nums = me.querySelectorAll('[data-n]');
  const dot = me.querySelector('.curve-track i');

  function draw(fromInput) {
    const [x1, y1, x2, y2] = cur;
    path.setAttribute('d', `M${px(0)},${py(0)} C${px(x1)},${py(y1)} ${px(x2)},${py(y2)} ${px(1)},${py(1)}`);
    arms[0].setAttribute('x1', px(0)); arms[0].setAttribute('y1', py(0)); arms[0].setAttribute('x2', px(x1)); arms[0].setAttribute('y2', py(y1));
    arms[1].setAttribute('x1', px(1)); arms[1].setAttribute('y1', py(1)); arms[1].setAttribute('x2', px(x2)); arms[1].setAttribute('y2', py(y2));
    hs[0].setAttribute('cx', px(x1)); hs[0].setAttribute('cy', py(y1));
    hs[1].setAttribute('cx', px(x2)); hs[1].setAttribute('cy', py(y2));
    if (!fromInput) nums.forEach((n, i) => { n.value = r2(cur[i]); });
    me.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', PRESETS[b.dataset.preset][1].every((v, i) => Math.abs(v - cur[i]) < 0.005)));
  }
  const changed = (fromInput) => {
    draw(fromInput);
    onInput?.([...cur]);
  };

  // seret pegangan
  hs.forEach((h, i) => {
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const r = svg.getBoundingClientRect();
        const x = ((ev.clientX - r.left) / r.width) * W;
        const y = ((ev.clientY - r.top) / r.height) * H;
        cur[i * 2] = r2(clamp((x - PAD) / SIZE, 0, 1));
        cur[i * 2 + 1] = r2(clamp(1 - (y - TOP) / SIZE, Y_MIN, Y_MAX));
        changed();
      };
      const up = () => {
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
      };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
    });
    // panah = geser halus pegangan yang sedang fokus
    h.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (!d) return;
      e.preventDefault();
      cur[i * 2] = r2(clamp(cur[i * 2] + d[0], 0, 1));
      cur[i * 2 + 1] = r2(clamp(cur[i * 2 + 1] + d[1], Y_MIN, Y_MAX));
      changed();
    });
  });

  nums.forEach((n) => n.addEventListener('input', () => {
    const i = Number(n.dataset.n);
    const v = parseFloat(n.value);
    if (!Number.isFinite(v)) return;
    cur[i] = i % 2 ? clamp(v, Y_MIN, Y_MAX) : clamp(v, 0, 1);
    changed(true);
  }));

  me.querySelector('.curve-presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    cur = [...PRESETS[b.dataset.preset][1]];
    changed();
  });

  // pratinjau: titik bergerak bolak-balik mengikuti kurva
  let raf = 0;
  const t0 = performance.now();
  const tick = (now) => {
    const cyc = ((now - t0) / 1400) % 1.6;
    const k = cyc < 1 ? cubicBezier(...cur)(cyc) : 1;
    dot.style.left = `${k * 100}%`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  draw();
  me.showModal();
  hs[0].focus();

  return new Promise((resolve) => {
    let result = null;
    me.querySelector('[data-v="0"]').onclick = () => me.close();
    me.querySelector('form').addEventListener('submit', () => { result = [...cur]; });
    me.addEventListener('close', () => {
      cancelAnimationFrame(raf);
      me.remove();
      if (dlg === me) dlg = null;
      resolve(result);
    }, { once: true });
  });
}

// gambar kecil kurva untuk tombol (SVG 28×20)
export function curveIcon(bz) {
  const [x1, y1, x2, y2] = Array.isArray(bz) && bz.length === 4 ? bz : DEFAULT_BZ;
  const X = (x) => 3 + x * 22;
  const Y = (y) => 16 - y * 12;
  return `<svg aria-hidden="true" width="28" height="20" viewBox="0 0 28 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M${X(0)},${Y(0)} C${X(x1)},${Y(y1)} ${X(x2)},${Y(y2)} ${X(1)},${Y(1)}"/></svg>`;
}

// buka editor kurva untuk sekumpulan keyframe (objek di store.doc). Pratinjau langsung lewat store.preview,
// Terapkan = satu langkah undo, Batal = kembali seperti semula.
export async function editCurves(store, keys) {
  if (!keys.length || editing) return false;
  editing = true;
  try {
    return await editCurvesNow(store, keys);
  } finally {
    editing = false;
  }
}

async function editCurvesNow(store, keys) {
  const before = store.snapshot();
  const orig = keys.map((k) => ({ ease: k.ease, bz: k.bz }));
  const start = keys.find((k) => k.ease === 'custom' && k.bz)?.bz || DEFAULT_BZ;
  const apply = (bz) => {
    for (const k of keys) {
      k.ease = 'custom';
      k.bz = [...bz];
    }
    store.preview();
  };
  apply(start);
  const res = await openCurveEditor({ bz: start, onInput: apply });
  if (res) {
    apply(res);
    store.commit(before);
    return true;
  }
  keys.forEach((k, i) => {
    k.ease = orig[i].ease;
    if (orig[i].bz) k.bz = orig[i].bz;
    else delete k.bz;
  });
  store.select(store.sel); // gambar ulang inspector & timeline ke keadaan semula
  return false;
}
