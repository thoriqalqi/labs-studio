// Bilah episode: pilih, buat baru (dari naskah), duplikat, hapus.
import { newEpisode } from '../scriptgen.js';
import { ask } from '../core/dialog.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const openEpisode = (id) => {
  try { localStorage.setItem('mu-last-ep', id); } catch {}
  location.href = `/chibi.html?ep=${encodeURIComponent(id)}`;
};

async function saveDoc(doc) {
  const res = await fetch(`/api/episodes/${doc.id}`, { method: 'POST', body: JSON.stringify(doc) });
  if (!res.ok) throw new Error((await res.json()).error);
}

function nextId(list) {
  const n = list.reduce((m, e) => Math.max(m, parseInt((e.id.match(/\d+/) || ['0'])[0], 10)), 0) + 1;
  return { id: `ep${String(n).padStart(2, '0')}`, n };
}

export function createEpisodeBar({ select, btnNew, btnDup, btnDel, dialog, list, getDoc, status }) {
  select.innerHTML = list.map((e) => `<option value="${esc(e.id)}">${esc(e.episodeLabel || e.id)} · ${esc(e.title)}</option>`).join('');
  select.value = getDoc().id;
  select.addEventListener('change', () => openEpisode(select.value));

  const form = dialog.querySelector('form');
  btnNew.addEventListener('click', () => {
    const { n } = nextId(list);
    form.reset();
    form.elements.label.value = `EPISODE ${n}`;
    dialog.showModal();
    form.elements.title.focus();
  });
  dialog.querySelector('[data-act=cancel]').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { id } = nextId(list);
    const doc = newEpisode({
      id,
      title: form.elements.title.value.trim(),
      label: form.elements.label.value.trim() || id.toUpperCase(),
      script: form.elements.script.value
    });
    try {
      await saveDoc(doc);
      openEpisode(id);
    } catch (err) {
      status(`Gagal membuat episode: ${err.message}`);
    }
  });

  btnDup.addEventListener('click', async () => {
    const src = getDoc();
    const { id, n } = nextId(list);
    const doc = { ...structuredClone(src), id, title: `${src.title} (salinan)`, episodeLabel: `EPISODE ${n}`, created: new Date().toISOString() };
    try {
      await saveDoc(doc);
      openEpisode(id);
    } catch (err) {
      status(`Gagal menduplikat: ${err.message}`);
    }
  });

  btnDel.addEventListener('click', async () => {
    const doc = getDoc();
    if (list.length <= 1) return status('Ini satu-satunya episode, tidak bisa dihapus');
    if (!(await ask(`Hapus episode "${doc.title}"? File-nya dipindah ke episodes/.trash (masih bisa dipulihkan manual).`, { ok: 'Hapus', danger: true }))) return;
    await fetch(`/api/episodes/${doc.id}?delete=1`, { method: 'POST' });
    openEpisode(list.find((e) => e.id !== doc.id).id);
  });
}
