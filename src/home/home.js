// Beranda Labs Studio: daftar proyek, buat dari template, ganti nama/duplikat/hapus, panduan vibe coding.
import { t as tr, langToggle } from '../core/i18n.js';
import { TEMPLATES } from '../templates/index.js';
import { SIZES } from '../motion/doc.js';
import { LAYER_TYPES } from '../motion/registry.js';
import { PRESETS } from '../motion/presets.js';
import { ask, tell } from '../core/dialog.js';
import '../core/bridge.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dur = (x) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`;
const KIND = { motion: 'Motion', chibi: 'Episode chibi' };

function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}

const openUrl = (p) => (p.kind === 'chibi' ? `/chibi.html?ep=${encodeURIComponent(p.id)}` : `/motion.html?p=${encodeURIComponent(p.id)}`);
let projects = [];

async function load() {
  projects = await (await fetch('/api/projects')).json();
  renderProjects();
}

function renderProjects() {
  const q = $('search').value.trim().toLowerCase();
  const list = projects.filter((p) => !q || `${p.name} ${p.label || ''}`.toLowerCase().includes(q));
  $('proj-count').textContent = String(projects.length).padStart(2, '0');
  $('projects').innerHTML = list.length ? list.map((p) => `
    <article class="card" data-key="${p.col}/${esc(p.id)}">
      <div class="poster">
        ${p.poster ? `<img src="${p.poster}" alt="" loading="lazy">` : '<span class="ph"><span class="app-tile"></span></span>'}
        <span class="len">${dur(p.duration || 0)}</span>
      </div>
      <div class="card-body">
        <a class="title" href="${openUrl(p)}" translate="no">${esc(p.name)}</a>
        <div class="card-meta"><span class="kind">${KIND[p.kind] || p.kind}</span><span>${esc(p.size)}</span><span>${ago(p.updated)}</span></div>
        <div class="card-acts">
          <button type="button" data-act="rename">Ganti nama</button>
          <button type="button" data-act="dup">Duplikat</button>
          <button type="button" data-act="del" class="danger">Hapus</button>
        </div>
      </div>
    </article>`).join('') : `<p class="empty">${q ? 'Tidak ada proyek yang cocok.' : 'Belum ada proyek. Mulai dari template di bawah.'}</p>`;
}

function renderTemplates() {
  $('templates').innerHTML = TEMPLATES.map((t, i) => `
    <button type="button" class="tpl" data-tpl="${t.id}">
      <span class="idx">${String(i + 1).padStart(2, '0')}</span>
      <b>${esc(t.name)}</b><span>${esc(t.description)}</span>
      <em>${t.kind === 'chibi' ? 'Episode chibi' : 'Motion'}</em>
    </button>`).join('');
}

// ---------- proyek baru ----------
const dlg = $('new-dialog');
const form = dlg.querySelector('form');
let tplId = TEMPLATES[0]?.id;
form.elements.size.innerHTML = Object.entries(SIZES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');

function pickTemplate(id) {
  tplId = id;
  const t = TEMPLATES.find((x) => x.id === id);
  $('tpl-pick').innerHTML = TEMPLATES.map((x) => `
    <button type="button" role="radio" aria-checked="${x.id === id}" class="pick${x.id === id ? ' on' : ''}" data-pick="${x.id}">
      <b>${esc(x.name)}</b><span>${esc(x.description)}</span>
    </button>`).join('');
  form.querySelector('[data-for=motion]').hidden = t.kind !== 'motion';
  form.querySelector('[data-for=chibi]').hidden = t.kind !== 'chibi';
  form.querySelector('[data-for=script]').hidden = !t.needsScript;
}

function openNew(id = tplId) {
  form.reset();
  const chibiCount = projects.filter((p) => p.kind === 'chibi').length;
  form.elements.label.value = `EPISODE ${chibiCount + 1}`;
  pickTemplate(id);
  dlg.showModal();
  form.elements.name.focus();
}

function nextEpisodeId() {
  const n = projects.filter((p) => p.kind === 'chibi').reduce((m, p) => Math.max(m, parseInt((p.id.match(/\d+/) || ['0'])[0], 10)), 0) + 1;
  return `ep${String(n).padStart(2, '0')}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = TEMPLATES.find((x) => x.id === tplId);
  const name = form.elements.name.value.trim();
  const isChibi = t.kind === 'chibi';
  const id = isChibi ? nextEpisodeId() : `m${Date.now().toString(36)}`;
  const doc = t.create({ id, name, size: form.elements.size.value, script: form.elements.script.value, label: form.elements.label.value.trim() || id.toUpperCase() });
  const col = isChibi ? 'episodes' : 'motion';
  const res = await fetch(`/api/docs/${col}/${id}`, { method: 'POST', body: JSON.stringify(doc) });
  if (!res.ok) return tell('Gagal membuat proyek. Pastikan server studio masih menyala.');
  location.href = openUrl({ kind: t.kind, id });
});

// ---------- aksi kartu ----------
const renameDlg = $('rename-dialog');
let renaming = null;

async function getDoc(p) {
  return (await fetch(`/api/docs/${p.col}/${encodeURIComponent(p.id)}`)).json();
}
async function putDoc(col, doc) {
  await fetch(`/api/docs/${col}/${encodeURIComponent(doc.id)}`, { method: 'POST', body: JSON.stringify(doc) });
}

$('projects').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const [col, id] = b.closest('.card').dataset.key.split('/');
  const p = projects.find((x) => x.col === col && x.id === id);
  if (b.dataset.act === 'rename') {
    renaming = p;
    renameDlg.querySelector('form').elements.name.value = p.name;
    renameDlg.showModal();
  }
  if (b.dataset.act === 'dup') {
    const d = await getDoc(p);
    d.id = col === 'episodes' ? nextEpisodeId() : `m${Date.now().toString(36)}`;
    if (col === 'episodes') d.title = `${d.title} (${tr('salinan')})`;
    else d.name = `${d.name} (${tr('salinan')})`;
    await putDoc(col, d);
    load();
  }
  if (b.dataset.act === 'del' && (await ask(`Hapus "${p.name}"? File-nya dipindah ke folder .trash dan masih bisa dipulihkan manual.`, { ok: 'Hapus', danger: true }))) {
    const res = await fetch(`/api/docs/${col}/${encodeURIComponent(id)}?delete=1`, { method: 'POST' });
    if (!res.ok) return tell('Gagal menghapus proyek.');
    load();
  }
});

renameDlg.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = renameDlg.querySelector('form').elements.name.value.trim();
  const d = await getDoc(renaming);
  if (renaming.col === 'episodes') d.title = name;
  else d.name = name;
  await putDoc(renaming.col, d);
  renameDlg.close();
  load();
});

for (const d of [dlg, renameDlg]) d.querySelector('[data-act=cancel]').addEventListener('click', () => d.close());
$('tpl-pick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick]');
  if (b) pickTemplate(b.dataset.pick);
});
$('templates').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tpl]');
  if (b) openNew(b.dataset.tpl);
});
$('new-project').addEventListener('click', () => openNew());
$('search').addEventListener('input', renderProjects);

// ---------- vibe coding ----------
const PROMPTS = [
  'Buat jenis layer baru "Progress bar" yang persentasenya bisa dianimasikan dengan keyframe.',
  'Tambah template proyek "Countdown 10 detik" ukuran Shorts dengan angka besar yang berdenyut.',
  'Tambah preset animasi masuk "Glitch" yang bergetar dan berganti warna sebentar.',
  'Buat rakitan "Judul YouTube" dengan teks besar, garis tipis, dan subjudul.',
  'Tambah layer "Video" supaya aku bisa memasukkan klip mp4 ke komposisi.',
  'Buat efek partikel sebagai jenis layer baru.'
];
$('prompts').innerHTML = PROMPTS.map((p, i) => `
  <li><button type="button" class="prompt" data-text="${esc(p)}">
    <span class="n">${String(i + 1).padStart(2, '0')}</span><span>${esc(p)}</span><span class="copy">salin</span>
  </button></li>`).join('');
$('prompts').addEventListener('click', async (e) => {
  const b = e.target.closest('.prompt');
  if (!b) return;
  try {
    await navigator.clipboard.writeText(b.dataset.text);
    b.classList.add('copied');
    b.querySelector('.copy').textContent = 'tersalin';
    setTimeout(() => {
      b.classList.remove('copied');
      b.querySelector('.copy').textContent = 'salin';
    }, 1400);
  } catch {}
});
$('layer-list').innerHTML = LAYER_TYPES.map((d) => `<span class="chip">${esc(d.name)}</span>`).join('');
$('preset-list').innerHTML = Object.values(PRESETS).filter((p) => p.apply).map((p) => `<span class="chip">${esc(p.label)}</span>`).join('');
fetch('/api/info').then((r) => r.json()).then((i) => { $('folder').textContent = i.folder; }).catch(() => {});

renderTemplates();
load();

// proyek dibuat/diubah dari luar (MCP) → daftar diperbarui
import.meta.hot?.on('labs:doc-changed', () => load());

document.getElementById('lang-slot')?.replaceWith(langToggle());
