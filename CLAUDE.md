# Labs Studio: panduan untuk Claude

Studio animasi lokal (semacam After Effects ringan) milik satu orang. Pemiliknya berbahasa Indonesia dan mengembangkan studio ini dengan vibe coding. **Semua teks UI, komentar kode, dan pesan ke pengguna memakai bahasa Indonesia santai-sopan.**

## Menjalankan

- `npm run dev` → http://localhost:5173 (port tetap; `strictPort`). Atau klik dua kali `Labs Studio.bat` (Windows) / `sh labs-studio.sh` (Mac/Linux).
- Proyek ini open source (MIT). README utama berbahasa Inggris (`README.md`), versi Indonesia di `README.id.md`: kalau fitur berubah, perbarui keduanya. Data pengguna (`motion/`, `episodes/`, `media/`, `posters/`, `output/`) dan `settings.local.json` tidak boleh masuk git.
- Tidak ada test otomatis. Untuk memeriksa perubahan: buka halaman terkait di browser, cek console, dan lihat hasil gambarnya.
- `ffmpeg` dipakai server untuk ekspor (sudah ada di PATH).
- Vite + Three.js 0.160, JavaScript biasa (ES module, tanpa TypeScript, tanpa framework UI). Jangan menambah dependensi kecuali benar-benar perlu.

## Halaman

| Halaman | File | Isi |
|---|---|---|
| Beranda | `index.html`, `src/home/` | Daftar proyek, buat dari template, panduan vibe coding |
| Editor motion | `motion.html`, `src/motion/` | Komposisi berbasis layer + keyframe (proyek di `motion/<id>.json`) |
| Editor episode chibi | `chibi.html`, `src/main.js`, `src/ui/` | Video naskah → adegan dengan karakter 3D (proyek di `episodes/<id>.json`) |

Server lokal ada di `vite.config.js` (simpan/muat dokumen, unggah media, poster, ekspor lewat ffmpeg). Endpoint: lihat komentar di atas file itu.

## Titik perluasan (otomatis terdaftar; tidak perlu mengubah file lain)

### 1. Jenis layer baru → `src/motion/layers/<nama>.js`

```js
export default {
  type: 'progress',            // unik, dipakai di dokumen
  name: 'Progress bar',        // label di UI
  icon: '▭',
  category: 'Dasar',           // grup di panel Tambah
  order: 30,
  fullFrame: false,            // true = memenuhi layar (tidak bisa diklik/diseret di kanvas)
  defaults: { w: 800, h: 24, value: 0, color: '#d9822b' },
  schema: [                    // field inspector
    { key: 'value', label: 'Persen', kind: 'number', min: 0, max: 100, step: 1, animatable: true },
    { key: 'color', label: 'Warna', kind: 'color', animatable: true }
    // kind: number | color | select (options: {nilai: label}) | checkbox | text | textarea | asset (accept: 'image/*')
  ],
  size: (p, env) => ({ w: p.w, h: p.h }),   // kotak pilihan, di koordinat lokal sebelum skala
  draw(ctx, p, env) {
    // ctx sudah di-translate ke posisi layer (0,0 = titik tengah), rotasi & skala sudah diterapkan.
    // p = semua properti yang sudah di-resolve pada waktu ini (termasuk keyframe).
    // env = { t, vt (detik sejak layer tampil), contentT (waktu konten untuk keyframe), comp {width,height,fps,duration},
    //         layer, reveal (animasi teks), assets.image(url), ctx }
  }
};
```

- Properti umum (posisi, skala, rotasi, opacity, blur, bayangan, mode campur, crop) sudah ditangani engine. Jangan diulang di `schema`, dan **jangan memakai nama `x`, `y`, `scale`, `rotation`, `opacity`, `blur`, `shadow`, `shadowColor`, `blend`, `cropTop`, `cropBottom`, `cropLeft`, `cropRight` untuk properti sendiri**. Crop memotong kotak dari `size()`, jadi `size` harus sesuai dengan yang digambar (akan ikut dipakai sebagai transform; registry memberi peringatan di console).
- Layer `sfx` = efek suara sintetis (fungsi di `SFX` pada `src/audio.js`, label di `SFX_LIST` pada `src/catalog.js`). Suara baru: tambah fungsi di `SFX` + labelnya, otomatis muncul di editor motion dan chibi.
- Layer bawaan untuk video promo: `liquid` (latar gradien cair), `lines` (garis/bingkai tergambar), `screen3d` (layar aplikasi 3D, isi dari `src/motion/mockups.js`), `cursor`, `pill`, `logo`. Teks mendukung `*aksen*`, `[pil kata]`, dan `{logo}`.
- Layer gaya editorial (kategori "Promo", dipakai template `promo-editorial.js`): `dots` (bidang halftone/deretan/jalur titik), `orb` (bola gradien pastel), `landscape` (pemandangan alam prosedural tanpa foto), `radial` (diagram lingkar kaca), `uicard` (kartu daftar berstatus), `counter` (angka berjalan bertumpuk), `wordroll` (kata bergulir). Teks punya font Geist & Instrument Serif, `accentFont`/`accentItalic` untuk *kata aksen*, dan preset `scatter`.
- Layer dunia: `editorui` (UI editor level ala game engine) dan `worldbuild` (medan 3D WebGL di sekitar Danau Toba: mesh petak koridor + medan dasar + dasar laut, air, pohon & gedung instans, lalu bola dunia untuk orbit; satu renderer WebGL bersama). Semua tahap = front di uniform shader, jadi tetap murni dari waktu. Template contohnya `peta-indonesia.js`; garis pantai dari Natural Earth di `src/motion/data/indonesia.js`. Easing `flow` di `keys.js` = spline yang melewati keyframe tanpa berhenti (dipakai untuk kamera).
- Layer `video`: elemen `<video>` bisu per layer (`env.assets.video` / `syncVideo` di `engine.js`); saat ekspor tiap frame di-seek tepat (`assets.seekAll`). Impor video di editor motion memanggil `/api/upload?keep=1`: format yang tidak bisa diputar browser dikonversi ke mp4, suaranya jadi layer audio pendamping.
- Performa: pemutaran butuh ≤ 33 ms/frame. Blur ditangani engine di kanvas kecil (`drawBlurred`); jangan pakai `ctx.filter` blur sendiri di kanvas penuh. Gambar yang mahal tapi jarang berubah (lanskap, pendar) di-cache di kanvas lalu cukup ditempel/digeser tiap frame. `screen3d` hanya memakai WebGL saat dimiringkan (rotX/rotY ≠ 0).
- `draw` harus murni dari `p` dan `env` (tanpa state antar-frame) supaya seek dan ekspor frame-demi-frame konsisten. Kalau butuh acak, pakai seed tetap.
- Layer tanpa `draw` (seperti `audio.js`) tidak digambar.
- Contoh: `text.js`, `shape.js`, `chibi3d.js` (merender Three.js ke canvas lalu `drawImage`).

### 2. Template proyek → `src/templates/<nama>.js`

```js
import { newMotionDoc, newLayer } from '../motion/doc.js';
export default {
  id: 'countdown', name: 'Countdown', description: '…', kind: 'motion', order: 10,
  create({ id, name, size }) {               // size: landscape | portrait | square | feed
    const doc = newMotionDoc({ id, name, size, duration: 10 });
    doc.layers.push(newLayer('text', doc.comp, { props: { text: '10' } }));
    return doc;                               // doc.layers[0] = paling depan
  }
};
```
Template `kind: 'chibi'` membuat episode chibi (lihat `episode-chibi.js`).

### 3. Preset animasi masuk/keluar → tambah entri di `src/motion/presets.js`
`apply(k, m)`: `k` 0→1 (muncul), ubah `m.opacity`, `m.dx`, `m.dy`, `m.scale`, `m.rotation`, `m.blur`, atau `m.reveal` (khusus teks).

### 4. Rakitan (beberapa layer sekaligus) → tambah entri di `src/motion/snippets.js`

## Model data motion (`motion/<id>.json`)

```
{ type: 'motion', id, name, comp: { width, height, fps, duration, background },
  layers: [ { id, type, name, start, dur, offset, hidden, locked,
              props: { …nilai tetap… },
              keys: { namaProp: [ { t, v, ease } ] },   // t = waktu konten (detik)
              anim: { in: { preset, dur }, out: { preset, dur } } } ] }
```
- Waktu konten = `t - layer.start + layer.offset`. `offset` bertambah saat awal layer dipotong, jadi isi layer tidak bergeser.
- Easing tersedia di `src/motion/keys.js` (`EASINGS`).
- Layer audio: `props.in` = detik awal di file, panjang diputar = `dur × speed`.

## Ekspor After Effects

- `src/motion/ae/export.js` menerjemahkan proyek jadi `output/<id>-after-effects/` (skrip `.jsx` + `media/` + `BACA-SAYA.txt`); `src/motion/ae/runtime.js` = bagian tetap skrip yang jalan di AE. **Runtime itu ExtendScript (ES3)**: tanpa `let/const`, arrow, `forEach`, template string; teks non-ASCII ditulis `\uXXXX`.
- `classify()` memilah layer: `text/shape/image/video/background/audio` jadi layer AE asli (keyframe + easing dikonversi ke speed/influence; animasi masuk/keluar & easing bounce/flow disampel rapat); selain itu dirender sendirian per layer (`background: 'transparent'` di `renderComp`) → ProRes 4444 bila butuh alpha, H.264 bila menutupi penuh. Efek suara digabung jadi satu WAV.
- Jenis layer baru otomatis ikut sebagai layer yang dirender. Kalau ingin jadi layer AE asli, tambahkan kasusnya di `classify()` + pembangunnya di runtime.
- Endpoint server: `/api/ae/start|copy|file|seq-start|seq-frame|seq-finish` (frame dikirim sebagai RGBA mentah; encode PNG di browser terlalu lambat).

## MCP server (Claude mengendalikan studio)

- `plugins/labs-studio/mcp/labs-studio-mcp.mjs`: MCP stdio tanpa dependensi, terdaftar lewat `.mcp.json`. Mendukung protokol modern (2026-07-28: `server/discover` + `_meta` per request) dan lama (`initialize`). Jangan menulis apa pun ke stdout selain pesan JSON-RPC (log ke stderr).
- Edit dokumen dikerjakan di MCP server lalu disimpan lewat `/api/docs/motion/<id>` dengan header `x-labs-source: mcp` → server menyiarkan `labs:doc-changed` → editor yang membuka proyek itu memuat ulang lewat `store.mutate` (bisa di-undo).
- Yang butuh browser (render, ekspor, template, info jenis layer) lewat `/api/bridge` → WebSocket Vite → `src/core/bridge.js` di tab studio (dimuat di beranda & editor motion). Tambah kemampuan baru: tambah `ops.<nama>` di `bridge.js` lalu alat baru di `TOOLS` pada MCP server.
- Alat baru: deskripsi berbahasa Inggris (dibaca model, untuk pengguna open source), pesan error jelas, dan alat yang memakai kuota berbayar harus menyebutnya di deskripsi.

## Plugin Claude Code

- Repo ini juga marketplace: `.claude-plugin/marketplace.json` → plugin di `plugins/labs-studio/` (`.claude-plugin/plugin.json`, `.mcp.json`, `mcp/`, `skills/<nama>/SKILL.md`).
- Plugin yang dipasang hanya membawa isi foldernya (tanpa `package.json` repo), jadi MCP server harus `.mjs` dan tidak boleh mengimpor apa pun dari luar folder plugin.
- Folder aplikasi studio dicari dari pengaturan plugin `studio_dir`, lalu folder proyek Claude Code, lalu lokasi repo.
- Setelah mengubah plugin: jalankan `claude plugin validate --strict ./plugins/labs-studio` dan `claude plugin validate --strict ./`, lalu naikkan `version` di `plugin.json` supaya pengguna mendapat pembaruan.

## Voice over (ElevenLabs)

- API key disimpan di `settings.local.json` (lewat `/api/settings`), tidak pernah dikirim ke browser maupun ditulis ke log. File ini masuk `.gitignore`.
- Semua panggilan ke ElevenLabs lewat server (`/api/eleven/voices|quota|tts`). Hasil mp3 masuk `media/uploads/`.
- UI: `src/core/voiceover.js` (`openVoiceDialog`, `generateVoice`). Dipakai di editor motion (layer audio) dan editor chibi (`src/ui/voiceScenes.js`: VO per adegan dari subtitle + menyamakan durasi adegan).
- Membuat suara memakai kuota karakter berbayar milik pengguna: selalu tampilkan jumlah karakter dan minta konfirmasi sebelum membuat banyak sekaligus.

## Bahasa UI (Indonesia / Inggris)

- Teks UI di kode tetap ditulis dalam bahasa Indonesia. Padanan Inggrisnya ada di `src/core/i18n-en.js` (`WORDS` untuk teks persis, `buildPatterns` untuk teks berisi angka/nama). **Setiap teks UI baru wajib ditambahkan ke kamus itu.**
- `src/core/i18n.js` menerjemahkan DOM otomatis (teks + `title`/`placeholder`/`aria-label`) setiap kali UI digambar ulang, di beranda dan editor motion. Bahasa awal mengikuti browser; tombol EN/ID dari `langToggle()`.
- Isi milik pengguna (nama layer/proyek, path) diberi `translate="no"`. Kata yang artinya bergantung konteks: `<span data-en="Voice">Suara</span>`.
- Teks yang digambar ke canvas atau disimpan ke dokumen memakai `t()` (nama & teks bawaan layer baru sudah diterjemahkan di `newLayer`).
- Editor episode chibi tidak memuat i18n (tetap bahasa Indonesia).

## Konvensi

- UI memakai `src/styles.css`: token di `:root` (latar hitam-indigo + pendar violet "liquid gradient", panel & kartu kaca, garis hairline, font Geist + Geist Mono, tombol utama putih). Desain harus bersih: tanpa emoji dekoratif, tanpa teks bergradien, tanpa bayangan tebal; label kecil memakai `var(--mono)` huruf kapital. CSS khusus motion ada di `src/motion/motion.css`, beranda di `src/home/home.css`.
- Jangan pakai `confirm()`, `alert()`, atau `prompt()` bawaan browser (diblokir di panel browser aplikasi Claude dan langsung dianggap "batal"). Pakai `ask()` / `tell()` dari `src/core/dialog.js`.
- Semua perubahan dokumen lewat `store.mutate(fn)` (`src/store.js`) supaya bisa di-undo dan tersimpan otomatis. Untuk drag, ubah langsung lalu panggil `store.preview()`, dan `store.commit(snapshotSebelum)` saat selesai.
- Folder data: `motion/`, `episodes/` (dokumen), `media/uploads/` (file unggahan), `posters/` (gambar kartu beranda), `output/` (hasil ekspor). Dokumen yang dihapus pindah ke `<folder>/.trash/`. Jangan hapus data pengguna tanpa diminta.
- Editor episode chibi (`src/main.js` dkk.) adalah alat yang sudah dipakai untuk konten nyata. Jangan mengubah perilakunya tanpa diminta.
