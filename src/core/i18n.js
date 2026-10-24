// Bahasa UI (Indonesia / Inggris). Teks sumber di kode tetap bahasa Indonesia; kamus di i18n-en.js
// memetakannya ke bahasa Inggris. Penerjemah DOM otomatis menerjemahkan teks & atribut (title, placeholder,
// aria-label) setiap kali UI digambar ulang, jadi kode lain cukup memakai teks Indonesia seperti biasa.
// Isi milik pengguna (nama layer, nama proyek, isi teks) diberi atribut translate="no" supaya tidak ikut diubah.
// Teks yang digambar ke canvas atau disimpan ke dokumen memakai t() langsung.
import { EXACT, buildPatterns, norm } from './i18n-en.js';

const KEY = 'labs.lang';
export const LANGS = { id: 'Bahasa Indonesia', en: 'English' };

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved in LANGS) return saved;
  } catch {}
  // bawaan: ikut bahasa browser (Indonesia/Melayu → id, lainnya → en)
  return /^(id|in|ms)\b/i.test(navigator.language || '') ? 'id' : 'en';
}

export const lang = typeof window === 'undefined' ? 'id' : detect();

export function setLang(next) {
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  location.reload();
}

// terjemahkan satu teks; spasi di awal/akhir dipertahankan, teks yang tidak dikenal dikembalikan apa adanya
export function t(s) {
  if (lang === 'id' || typeof s !== 'string') return s;
  const core = s.trim();
  if (!core) return s;
  const out = translateCore(norm(core));
  if (out === null) return s;
  return s.slice(0, s.indexOf(core[0])) + out + s.slice(s.lastIndexOf(core[core.length - 1]) + 1);
}

const PATTERNS = buildPatterns(t);

function translateCore(core) {
  if (EXACT.has(core)) return EXACT.get(core);
  for (const [re, rep] of PATTERNS) {
    const m = core.match(re);
    if (m) return typeof rep === 'function' ? rep(...m.slice(1)) : core.replace(re, rep);
  }
  return null;
}

// ---------- penerjemah DOM ----------
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
const done = new WeakMap(); // node → teks terakhir yang kita tulis (supaya tidak berputar)

function skipped(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.getAttribute('translate') === 'no' || e.isContentEditable) return true;
  }
  return false;
}

function translateText(node) {
  const v = node.nodeValue;
  if (!v || !/[a-zA-Z]/.test(v) || done.get(node) === v || skipped(node.parentElement)) return;
  // teks yang artinya bergantung konteks: <span data-en="Voice">Suara</span>
  const ctx = node.parentElement?.dataset?.en;
  const out = ctx && node.parentElement.childNodes.length === 1 ? ctx : t(v);
  if (out !== v) node.nodeValue = out;
  done.set(node, node.nodeValue);
}

function translateAttrs(el) {
  if (skipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const out = t(v);
    if (out !== v) el.setAttribute(a, out);
  }
}

export function translateDom(root) {
  if (lang === 'id' || !root) return;
  if (root.nodeType === 3) return translateText(root);
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) translateText(n);
  const el = root.nodeType === 9 ? root.documentElement : root;
  if (el.matches?.(ATTRS.map((a) => `[${a}]`).join(','))) translateAttrs(el);
  el.querySelectorAll?.(ATTRS.map((a) => `[${a}]`).join(',')).forEach(translateAttrs);
}

if (typeof window !== 'undefined' && lang !== 'id') {
  document.documentElement.lang = lang;
  const start = () => {
    translateDom(document);
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList') r.addedNodes.forEach(translateDom);
        else if (r.type === 'characterData') translateText(r.target);
        else if (r.type === 'attributes') translateAttrs(r.target);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

// tombol kecil untuk ganti bahasa (dipasang di beranda & editor)
export function langToggle() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'lang-toggle';
  b.setAttribute('translate', 'no');
  const other = lang === 'id' ? 'en' : 'id';
  b.textContent = other.toUpperCase();
  b.title = lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia';
  b.setAttribute('aria-label', b.title);
  b.onclick = () => setLang(other);
  return b;
}
