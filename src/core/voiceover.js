// Voice over ElevenLabs: dialog pilih suara/model/pengaturan + fungsi pembuat suara.
// API key disimpan server di settings.local.json; browser hanya tahu "sudah ada / belum".
//
//   openVoiceDialog({ mode: 'single', text })  → { url, name, settings } atau null (setelah suara dibuat & dipilih)
//   openVoiceDialog({ mode: 'bulk', info })     → { settings, sync } atau null (pembuatan dilakukan pemanggil)
//   generateVoice(settings, text, { previousText, nextText }) → { url, name }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const MODELS = {
  eleven_multilingual_v2: 'Multilingual v2 (paling stabil, dukung <break>)',
  eleven_v3: 'Eleven v3 (paling ekspresif, tag [whispers] dsb.)',
  eleven_turbo_v2_5: 'Turbo v2.5 (cepat, hemat)',
  eleven_flash_v2_5: 'Flash v2.5 (tercepat)'
};

const DEFAULTS = { voiceId: '', modelId: 'eleven_multilingual_v2', stability: 0.5, similarity: 0.75, style: 0.2, speed: 0.95, boost: true };
const STORE_KEY = 'ms-vo-settings';

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
  if (s.voiceId) {
    const recent = [s.voiceId, ...loadRecent().filter((x) => x !== s.voiceId)].slice(0, 8);
    try { localStorage.setItem('ms-vo-recent', JSON.stringify(recent)); } catch {}
  }
}
function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem('ms-vo-recent') || '[]');
  } catch {
    return [];
  }
}

async function api(path, body) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(out.error || res.statusText);
    err.needKey = out.needKey;
    err.missing = out.missing;
    throw err;
  }
  return out;
}

export async function generateVoice(settings, text, { previousText, nextText } = {}) {
  return api('/api/eleven/tts', { ...settings, text, previousText, nextText });
}

let voicesCache = null;

export function openVoiceDialog({ mode = 'single', text = '', info = '' } = {}) {
  const s = loadSettings();
  const dlg = document.createElement('dialog');
  dlg.className = 'vo-dialog';
  dlg.innerHTML = `
    <form method="dialog">
      <div class="vo-head"><h2>Voice over</h2><span class="vo-brand">ElevenLabs</span><span class="vo-quota meta"></span></div>
      <section class="vo-key" hidden>
        <p>Masukkan API key ElevenLabs (menu <b>Profile → API Keys</b> di elevenlabs.io). Key disimpan hanya di komputer ini, di file <code>settings.local.json</code>.</p>
        <div class="vo-row"><input type="password" name="key" placeholder="sk_…" autocomplete="off" aria-label="API key ElevenLabs"><button type="button" data-act="save-key" class="primary">Simpan key</button></div>
      </section>
      <section class="vo-main">
        <div class="vo-row vo-list">
          <label class="f grow"><span>Suara</span><select name="voice"><option>Memuat suara…</option></select></label>
          <button type="button" data-act="preview-voice" title="Dengar contoh suara" aria-label="Dengar contoh suara">▶</button>
        </div>
        <div class="vo-manual" hidden>
          <label class="f"><span>Voice ID</span><input type="text" name="voiceManual" list="vo-recent" placeholder="mis. 21m00Tcm4TlvDq8ikWAM" autocomplete="off" spellcheck="false"></label>
          <datalist id="vo-recent"></datalist>
          <p class="meta wrap">Daftar suara tidak bisa dimuat karena key-mu belum punya izin <b>Voices → Read</b>. Salin Voice ID dari elevenlabs.io (menu <b>Voices</b> → pilih suara → <b>Copy voice ID</b>), atau tambahkan izin itu ke key supaya daftar suara muncul di sini.</p>
        </div>
        <label class="f"><span>Model</span><select name="model">${Object.entries(MODELS).map(([k, v]) => `<option value="${k}"${k === s.modelId ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <div class="vo-sliders">
          ${slider('stability', 'Stabilitas', s.stability, 0, 1, 0.05, 'rendah = ekspresif, tinggi = datar')}
          ${slider('similarity', 'Kemiripan suara', s.similarity, 0, 1, 0.05)}
          ${slider('style', 'Gaya / emosi', s.style, 0, 1, 0.05)}
          ${slider('speed', 'Kecepatan', s.speed, 0.7, 1.2, 0.01)}
        </div>
        <label class="chk"><input type="checkbox" name="boost"${s.boost ? ' checked' : ''}> Speaker boost (suara lebih jelas)</label>
        ${mode === 'single' ? `
          <label class="f"><span>Teks <em class="vo-count"></em></span><textarea name="text" rows="6" placeholder="Tulis kalimat voice over…">${esc(text)}</textarea></label>
          <audio class="vo-audio" controls hidden></audio>` : `
          <p class="vo-info">${esc(info)}</p>
          <label class="chk"><input type="checkbox" name="sync" checked> Samakan durasi tiap adegan dengan panjang suaranya</label>`}
        <p class="vo-msg" aria-live="polite"></p>
      </section>
      <div class="acts">
        <button type="button" data-act="change-key" class="link">Ganti API key</button>
        <span class="spacer"></span>
        <button type="button" data-act="cancel">Batal</button>
        ${mode === 'single'
          ? '<button type="button" data-act="make" class="primary">Buat suara</button><button type="button" data-act="insert" class="primary" hidden>Masukkan ke timeline</button>'
          : '<button type="button" data-act="bulk" class="primary">Buat voice over</button>'}
      </div>
    </form>`;
  document.body.appendChild(dlg);
  const f = dlg.querySelector('form');
  const $ = (q) => dlg.querySelector(q);
  const msg = (m, err = false) => { $('.vo-msg').textContent = m; $('.vo-msg').classList.toggle('err', err); };
  let result = null;
  const previewAudio = new Audio();
  // ditutup lewat tombol memanggil finish() langsung; event 'close' (Esc) hanya cadangan,
  // karena tidak semua browser memicunya dengan andal saat close() dipanggil dari kode
  let resolver = null;
  let finished = false;
  function finish(value) {
    if (finished) return;
    finished = true;
    previewAudio.pause();
    dlg.querySelector('.vo-audio')?.pause();
    if (dlg.open) dlg.close();
    dlg.remove();
    resolver?.(value);
  }

  function slider(name, label, v, min, max, step, hint = '') {
    return `<label class="f"><span>${label} <b data-out="${name}">${v}</b>${hint ? ` <em>${hint}</em>` : ''}</span><input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
  }

  let manual = false;
  const current = () => ({
    voiceId: manual ? f.elements.voiceManual.value.trim() : f.elements.voice.value,
    modelId: f.elements.model.value,
    stability: parseFloat(f.elements.stability.value),
    similarity: parseFloat(f.elements.similarity.value),
    style: parseFloat(f.elements.style.value),
    speed: parseFloat(f.elements.speed.value),
    boost: f.elements.boost.checked
  });

  f.addEventListener('input', (e) => {
    const out = dlg.querySelector(`[data-out="${e.target.name}"]`);
    if (out) out.textContent = e.target.value;
    if (e.target.name === 'text') countChars();
  });
  function countChars() {
    if (f.elements.text) $('.vo-count').textContent = `· ${f.elements.text.value.length} karakter`;
  }
  countChars();

  // kuota butuh izin "User → Read"; kalau tidak ada, cukup tidak ditampilkan
  async function loadQuota() {
    try {
      const q = await api('/api/eleven/quota');
      $('.vo-quota').textContent = q.limit ? `Sisa kuota ${(q.limit - q.used).toLocaleString('id-ID')} karakter` : '';
    } catch {}
  }

  function useManual() {
    manual = true;
    $('.vo-list').hidden = true;
    $('.vo-manual').hidden = false;
    $('.vo-key').hidden = true;
    $('.vo-main').hidden = false;
    const recent = loadRecent();
    $('#vo-recent').innerHTML = recent.map((id) => `<option value="${esc(id)}"></option>`).join('');
    f.elements.voiceManual.value = s.voiceId || recent[0] || '';
    msg('');
    loadQuota();
  }

  async function loadVoices(force = false) {
    try {
      if (!voicesCache || force) voicesCache = await api('/api/eleven/voices');
      const sel = f.elements.voice;
      sel.innerHTML = voicesCache.map((v) => `<option value="${v.id}">${esc(v.name)}${v.desc ? ` — ${esc(v.desc)}` : ''}</option>`).join('');
      if (voicesCache.some((v) => v.id === s.voiceId)) sel.value = s.voiceId;
      else {
        // belum pernah memilih: utamakan suara berbahasa Indonesia
        const indo = voicesCache.find((v) => /indonesia/i.test(`${v.name} ${v.desc}`));
        if (indo) sel.value = indo.id;
      }
      $('.vo-key').hidden = true;
      $('.vo-main').hidden = false;
      msg('');
      loadQuota();
    } catch (err) {
      if (err.missing) return useManual();
      if (err.needKey) {
        $('.vo-key').hidden = false;
        $('.vo-main').hidden = true;
        if (!/belum diisi/.test(err.message)) msg(err.message, true);
        f.elements.key.focus();
      } else msg(err.message, true);
    }
  }

  dlg.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'cancel') return finish(null);
    if (act === 'change-key') {
      $('.vo-key').hidden = false;
      return f.elements.key.focus();
    }
    if (act === 'save-key') {
      const key = f.elements.key.value.trim();
      if (!key) return;
      await api('/api/settings', { elevenKey: key });
      f.elements.key.value = '';
      msg('Key tersimpan, memuat suara…');
      return loadVoices(true);
    }
    if (act === 'preview-voice') {
      const v = voicesCache?.find((x) => x.id === f.elements.voice.value);
      if (v?.preview) {
        previewAudio.src = v.preview;
        previewAudio.play().catch(() => {});
      }
      return;
    }
    if (act === 'make') {
      const text = f.elements.text.value.trim();
      if (!text) return msg('Tulis teksnya dulu.', true);
      const st = current();
      if (!st.voiceId) return msg('Isi Voice ID dulu.', true);
      saveSettings(st);
      b.disabled = true;
      msg('Membuat suara…');
      try {
        const out = await generateVoice(st, text);
        result = { ...out, settings: st };
        const a = $('.vo-audio');
        a.src = out.url;
        a.hidden = false;
        a.play().catch(() => {});
        $('[data-act=insert]').hidden = false;
        b.textContent = 'Buat ulang';
        msg('Selesai. Dengarkan dulu, lalu masukkan ke timeline.');
        loadQuota();
      } catch (err) {
        msg(err.message, true);
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (act === 'insert' && result) return finish(result);
    if (act === 'bulk') {
      const st = current();
      if (!st.voiceId) return msg(manual ? 'Isi Voice ID dulu.' : 'Pilih suara dulu.', true);
      saveSettings(st);
      return finish({ settings: st, sync: f.elements.sync.checked });
    }
  });

  dlg.addEventListener('close', () => finish(null));
  dlg.showModal();
  loadVoices();
  return new Promise((resolve) => { resolver = resolve; });
}
